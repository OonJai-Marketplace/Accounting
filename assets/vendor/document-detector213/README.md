# Local document detector, v143.213

Pinned Scanic DocCornerNet LEAN model and minimal ONNX Runtime Web assets.
Source: https://github.com/marquaye/scanic/tree/dec0cd018899a7e1c5d8f4880223f0e54941f616

- `doccornernet_lean.ort`, WASM and its `.mjs` loader: `scanic-ml/dist` at that commit, package version 0.2.0.
- `ort-api.js`: unmodified `dist/scanic-ort.wasm.min.js` from npm `scanic@1.7.1` (tarball SHA-1 `63d2d08ec0d3caf42c09215c9506452d5e4ffb17`). This bundles the ONNX Runtime 1.27.0 API matching the minimal WASM ABI.
- Model architecture: https://github.com/mapo80/DocCornerNet-CoordClass (MIT). Upstream model card and licenses are retained here. Training provenance is documented by the upstream model card; this project does not train on user scans.
- ONNX Runtime license and third-party notices: https://github.com/microsoft/onnxruntime/tree/v1.27.0

The app runs inference in a dedicated, single-thread worker. RGB NHWC 224×224 input uses ImageNet normalization; output is TL, TR, BR, BL normalized coordinates and a document-presence logit. App-specific geometry checks, 1.8% border expansion and temporal tracking are under `src/documents/scanner/`. Presence score is not a guarantee of corner accuracy.

All runtime assets are served from this application, downloaded only when Scan starts, and cached by the application worker for offline reuse. No images, frame tensors or predictions are uploaded to Scanic, Google, ONNX or another detection service. Existing explicit save destinations are unchanged.

This is not Google's ML Kit SDK. Google's Android SDK requires native Android / Play services; the cancelled native companion app has not been recreated.

## Asset identity

- `doccornernet_lean.ort`: SHA-256 `80a689be5933f05f7f1800f5cf952cdf3368d89cec966463112c6a84197785c4`
- `ort-wasm-simd-threaded.wasm`: SHA-256 `85b7a7445c5af07536b64bddd1367ab909699729393f136c854253bf5f1bcd0b`
- `ort-wasm-simd-threaded.mjs`: SHA-256 `a50a4c3eababb846506b6a595481adea78126de6357a4ca49ff5cc49c20b1ac9`
- `ort-api.js`: SHA-256 `6d185727fae93105c8b91a1334c9c6767464776875a5937b48b9b5c41c348e6c`
