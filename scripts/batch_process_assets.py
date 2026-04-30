"""Batch asset pipeline.

Processes every `.glb` in `assets/glb/`, runs each through gltfpack + gltf-validator
+ SHA-256 + Azure Blob upload, then patches `backend/app/data/catalog.json` so each
matching item's `model` field points at the CDN URL.

Filename convention: `<catalogId>.glb` — stem must match an entry in catalog.json.
Files whose stems do not match a catalog id are skipped with a warning.

Usage:
    python scripts/batch_process_assets.py
    python scripts/batch_process_assets.py --no-upload
    python scripts/batch_process_assets.py --dry-run
    python scripts/batch_process_assets.py --only sofa_3seat,loveseat

Env (required for upload):
    AZURE_STORAGE_ACCOUNT=<storage account name>
    CDN_BASE_URL=https://<frontdoor>.azurefd.net

Auth: DefaultAzureCredential (run `az login`; identity needs
"Storage Blob Data Contributor" on the storage account).

Tooling on PATH:
    gltfpack         (npm i -g gltfpack)
    gltf-validator   (npm i -g gltf-validator)
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import shutil
import subprocess
import sys
import tempfile
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent.parent
# Load environment variables from backend/.env.local if present
try:
    from dotenv import load_dotenv
    load_dotenv(ROOT / "backend" / ".env.local")
except ImportError:
    pass

RAW_DIR = ROOT / "assets" / "glb"
MANIFEST_PATH = ROOT / "assets" / "manifest.json"
DIST_DIR = ROOT / "dist" / "catalog"
CATALOG_PATH = ROOT / "backend" / "app" / "data" / "catalog.json"
CONTAINER = "catalog"
MAX_BYTES = 1_048_576  # 1 MB hard cap per asset
SOFT_TARGET = 614_400  # 600 KB warning threshold


@dataclass
class Result:
    catalog_id: str
    raw_path: Path
    packed_size: int = 0
    sha256: str = ""
    cdn_url: str = ""
    skipped: bool = False
    error: str = ""
    warnings: list[str] = field(default_factory=list)


def have_tool(name: str) -> bool:
    return shutil.which(name) is not None


def run(cmd: list[str]) -> None:
    print(f"$ {' '.join(cmd)}")
    # Use shell=True on Windows to support .cmd/.bat shims
    subprocess.run(cmd, check=True, shell=os.name == 'nt')


def gltfpack(src: Path, dst: Path) -> None:
    run(["gltfpack", "-i", str(src), "-o", str(dst), "-cc", "-tc"])


def validate(path: Path) -> None:
    with tempfile.TemporaryDirectory() as tmp:
        report_dir = Path(tmp)
        # gltf-validator binary name varies (`gltf-validator` vs `gltf_validator`).
        bin_name = "gltf-validator" if have_tool("gltf-validator") else "gltf_validator"
        run([bin_name, str(path), "-r", "-o", str(report_dir)])
        report_path = report_dir / f"{path.stem}_report.json"
        if not report_path.exists():
            print("warning: validator report not found, skipping check", file=sys.stderr)
            return
        report = json.loads(report_path.read_text())
        errors = report.get("issues", {}).get("numErrors", 0)
        if errors:
            raise RuntimeError(f"gltf-validator: {errors} errors in {path}")


def content_hash(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def upload(local_path: Path, blob_name: str) -> str:
    from azure.identity import DefaultAzureCredential
    from azure.storage.blob import BlobServiceClient, ContentSettings

    account = os.environ["AZURE_STORAGE_ACCOUNT"]
    cdn = os.environ["CDN_BASE_URL"].rstrip("/")
    cred = DefaultAzureCredential()
    svc = BlobServiceClient(f"https://{account}.blob.core.windows.net", credential=cred)
    client = svc.get_blob_client(container=CONTAINER, blob=blob_name)
    if client.exists():
        print(f"  blob already present, skipping upload: {blob_name}")
    else:
        with local_path.open("rb") as f:
            client.upload_blob(
                f,
                overwrite=False,
                content_settings=ContentSettings(
                    content_type="model/gltf-binary",
                    cache_control="public, max-age=31536000, immutable",
                ),
            )
    return f"{cdn}/{CONTAINER}/{blob_name}"


def load_catalog() -> list[dict[str, Any]]:
    return json.loads(CATALOG_PATH.read_text(encoding="utf-8"))


def write_catalog(catalog: list[dict[str, Any]]) -> None:
    CATALOG_PATH.write_text(json.dumps(catalog, indent=2) + "\n", encoding="utf-8")


def patch_catalog(results: list[Result]) -> int:
    catalog = load_catalog()
    by_id = {item["id"]: item for item in catalog}
    patched = 0
    for r in results:
        if r.skipped or r.error or not r.cdn_url:
            continue
        item = by_id.get(r.catalog_id)
        if item is None:
            continue
        if item.get("model") != r.cdn_url:
            item["model"] = r.cdn_url
            patched += 1
    if patched:
        write_catalog(catalog)
    return patched


def write_manifest(results: list[Result]) -> None:
    payload = [
        {
            "id": r.catalog_id,
            "sha256": r.sha256,
            "bytes": r.packed_size,
            "cdn_url": r.cdn_url,
            "error": r.error,
            "warnings": r.warnings,
        }
        for r in results
    ]
    MANIFEST_PATH.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")


def process_one(raw: Path, *, do_upload: bool, dry_run: bool) -> Result:
    res = Result(catalog_id=raw.stem, raw_path=raw)
    print(f"\n=== {raw.name} ===")
    if dry_run:
        print("  (dry-run) would pack, validate, hash, upload, patch")
        res.skipped = True
        return res
    DIST_DIR.mkdir(parents=True, exist_ok=True)
    try:
        with tempfile.TemporaryDirectory() as tmp:
            packed = Path(tmp) / "packed.glb"
            gltfpack(raw, packed)
            validate(packed)
            size = packed.stat().st_size
            res.packed_size = size
            if size > MAX_BYTES:
                raise RuntimeError(f"{size} bytes exceeds {MAX_BYTES} hard cap")
            if size > SOFT_TARGET:
                res.warnings.append(f"size {size} > soft target {SOFT_TARGET}")
            digest = content_hash(packed)
            res.sha256 = digest
            blob_name = f"{digest}.glb"
            local = DIST_DIR / blob_name
            local.write_bytes(packed.read_bytes())
            print(f"  hash: {digest}")
            print(f"  size: {size} bytes")
            print(f"  local: {local}")
            if do_upload:
                res.cdn_url = upload(local, blob_name)
                print(f"  cdn:  {res.cdn_url}")
            else:
                res.cdn_url = f"file://{local.as_posix()}"
                print(f"  (no-upload) local URL: {res.cdn_url}")
    except (subprocess.CalledProcessError, RuntimeError) as exc:
        res.error = str(exc)
        print(f"  ERROR: {exc}", file=sys.stderr)
    return res


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument(
        "--no-upload",
        action="store_true",
        help="Pack + validate + hash locally; skip Azure upload and catalog patching.",
    )
    ap.add_argument(
        "--dry-run",
        action="store_true",
        help="List planned actions; change nothing.",
    )
    ap.add_argument(
        "--only",
        default="",
        help="Comma-separated list of catalog ids to process (default: all in assets/glb/).",
    )
    args = ap.parse_args()

    if not RAW_DIR.exists():
        raise SystemExit(f"missing input dir: {RAW_DIR}")

    if not args.dry_run:
        for tool in ("gltfpack",):
            if not have_tool(tool):
                raise SystemExit(f"missing tool on PATH: {tool}")
        if not (have_tool("gltf-validator") or have_tool("gltf_validator")):
            raise SystemExit("missing tool on PATH: gltf-validator")

    do_upload = not args.no_upload and not args.dry_run
    if do_upload:
        for var in ("AZURE_STORAGE_ACCOUNT", "CDN_BASE_URL"):
            if not os.environ.get(var):
                raise SystemExit(f"env var required for upload: {var}")

    catalog_ids = {item["id"] for item in load_catalog()}
    only = {s.strip() for s in args.only.split(",") if s.strip()} if args.only else set()

    raws = sorted(RAW_DIR.glob("*.glb"))
    if not raws:
        raise SystemExit(f"no .glb files in {RAW_DIR}")

    results: list[Result] = []
    for raw in raws:
        cid = raw.stem
        if only and cid not in only:
            continue
        if cid not in catalog_ids:
            print(f"\n=== {raw.name} ===")
            print(f"  WARN: '{cid}' not in catalog.json — skipping")
            results.append(Result(catalog_id=cid, raw_path=raw, skipped=True,
                                  error="unknown catalog id"))
            continue
        results.append(process_one(raw, do_upload=do_upload, dry_run=args.dry_run))

    write_manifest(results)
    print(f"\nmanifest: {MANIFEST_PATH}")

    if do_upload:
        patched = patch_catalog(results)
        print(f"catalog.json: patched {patched} model field(s)")

    failed = [r for r in results if r.error]
    if failed:
        print(f"\n{len(failed)} failure(s):", file=sys.stderr)
        for r in failed:
            print(f"  {r.catalog_id}: {r.error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
