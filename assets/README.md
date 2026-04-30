# Asset staging

Drop raw source files here. Outputs go to Azure Blob via the asset pipeline; nothing in this folder is committed (see `.gitignore`).

## `glb/` — catalog furniture

One file per `catalogId`. Filename **must** match the id in `backend/app/data/catalog.json` exactly:

```
assets/glb/sofa_3seat.glb
assets/glb/loveseat.glb
assets/glb/armchair.glb
...
```

Process all queued files:

```bash
python scripts/batch_process_assets.py
```

The script runs `gltfpack -cc -tc` → `gltf-validator` → SHA-256 → uploads to the `catalog` blob container → patches each item's `model` field in `backend/app/data/catalog.json` with the resulting CDN URL.

Flags:

- `--no-upload` — pack + validate + hash locally, write manifest only. Skips Azure and skips catalog patching.
- `--dry-run` — show planned actions, change nothing.
- `--only sofa_3seat,loveseat` — process a subset.

A manifest of `(id → cdn_url, hash, bytes)` is written to `assets/manifest.json` after each run.

## `hdri/` — environment lighting

Drop the source HDR/EXR here. Convert + upload manually for now:

```bash
toktx --bcmp --t2 hdri.ktx2 source.hdr
sha256sum hdri.ktx2
az storage blob upload \
  --account-name $AZURE_STORAGE_ACCOUNT \
  --container-name hdri \
  --name "<hash>.ktx2" \
  --file hdri.ktx2 \
  --content-cache "public, max-age=31536000, immutable" \
  --auth-mode login
```

Then set `NEXT_PUBLIC_HDRI_URL` in `frontend/.env.local`.

## Prereqs

- `gltfpack` on PATH (`npm i -g gltfpack`)
- `gltf-validator` on PATH (`npm i -g gltf-validator`)
- `az login` with **Storage Blob Data Contributor** on the storage account
- Backend `.env` populated with `AZURE_STORAGE_ACCOUNT` + `CDN_BASE_URL`
