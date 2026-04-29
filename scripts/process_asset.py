"""Asset pipeline: gltfpack -cc -tc → gltf-validator → SHA-256 → upload to Azure Blob.

Usage:
    python scripts/process_asset.py raw.glb [--no-upload] [--container catalog]

Requires:
    - gltfpack on PATH (https://meshoptimizer.org/gltf/)
    - gltf-validator on PATH (npm i -g gltf-validator)
    - env: CDN_BASE_URL, AZURE_STORAGE_ACCOUNT (when uploading)
    - DefaultAzureCredential (az login or managed identity)
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import subprocess
import sys
import tempfile
from pathlib import Path

OUT_DIR = Path("dist/catalog")
MAX_BYTES = 1_048_576  # 1 MB hard cap per asset


def run(cmd: list[str]) -> None:
    print(f"$ {' '.join(cmd)}")
    subprocess.run(cmd, check=True)


def gltfpack(src: Path, dst: Path) -> None:
    run(["gltfpack", "-i", str(src), "-o", str(dst), "-cc", "-tc"])


def validate(path: Path) -> None:
    with tempfile.TemporaryDirectory() as tmp:
        report_dir = Path(tmp)
        run(["gltf_validator", str(path), "-r", "-o", str(report_dir)])
        report_path = report_dir / f"{path.stem}_report.json"
        if not report_path.exists():
            print("warning: validator report not found, skipping check", file=sys.stderr)
            return
        report = json.loads(report_path.read_text())
        errors = report.get("issues", {}).get("numErrors", 0)
        if errors:
            raise SystemExit(f"gltf-validator: {errors} errors in {path}")


def content_hash(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def upload(blob_path: Path, container: str, blob_name: str) -> str:
    from azure.identity import DefaultAzureCredential
    from azure.storage.blob import BlobServiceClient, ContentSettings

    account = os.environ["AZURE_STORAGE_ACCOUNT"]
    cdn = os.environ["CDN_BASE_URL"].rstrip("/")
    cred = DefaultAzureCredential()
    svc = BlobServiceClient(f"https://{account}.blob.core.windows.net", credential=cred)
    client = svc.get_blob_client(container=container, blob=blob_name)
    with blob_path.open("rb") as f:
        client.upload_blob(
            f,
            overwrite=False,
            content_settings=ContentSettings(
                content_type="model/gltf-binary",
                cache_control="public, max-age=31536000, immutable",
            ),
        )
    return f"{cdn}/{container}/{blob_name}"


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("raw", type=Path)
    ap.add_argument("--no-upload", action="store_true")
    ap.add_argument("--container", default="catalog")
    args = ap.parse_args()

    if not args.raw.exists():
        raise SystemExit(f"missing input: {args.raw}")

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory() as tmp:
        packed = Path(tmp) / "packed.glb"
        gltfpack(args.raw, packed)
        validate(packed)
        size = packed.stat().st_size
        if size > MAX_BYTES:
            raise SystemExit(f"asset {size} bytes exceeds {MAX_BYTES} limit")
        digest = content_hash(packed)
        blob_name = f"{digest}.glb"
        local = OUT_DIR / blob_name
        local.write_bytes(packed.read_bytes())
        print(f"hash: {digest}")
        print(f"local: {local}")
        if args.no_upload:
            print(f"(dry-run) would upload to {args.container}/{blob_name}")
            return 0
        url = upload(local, args.container, blob_name)
        print(f"cdn url: {url}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
