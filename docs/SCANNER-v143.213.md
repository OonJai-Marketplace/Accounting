# Scanner detector repair — v143.213

The old brightness-component detector missed colored paper, dark receipts and some background/lighting combinations. Google identifies its Android Drive scanner as using ML Kit document scanning, a native Android/Play-services flow with on-device models. This web app now uses an open-source, browser-compatible trained corner model; it does not embed or reproduce Google's proprietary model.

References checked 31 October 2026:
- https://android-developers.googleblog.com/2024/02/ml-kit-document-scanner-api.html
- https://developers.google.com/ml-kit/vision/doc-scanner/android
- https://support.google.com/drive/answer/3145835?co=GENIE.Platform%3DAndroid&hl=en

## Resulting behavior

Scan opens the camera and prepares the local model concurrently. Live outlines require two consistent predictions, clear on movement/no document, and restart after foregrounding. Capture immediately shows the frozen photo; the captured frame receives independent detection and correction. No stale live corners are used for the crop. Retake, manual corners, whole-photo, next receipt/entry and protected draft recovery remain in the existing interface.

The small fixed-size tensor goes to a dedicated worker. The roughly 3.7 MB uncompressed model/runtime download happens only for scanner use. The worker uses one WASM thread, without requiring cross-origin-isolation headers. Pinned files are served from this app and retained across app cache upgrades. Unsupported or failed model loading cannot block capture indefinitely: strong classical results remain available for captured images, otherwise the whole image is retained. Failed model loading can retry after a cooldown. A valid model rejection does not invoke a competing detector.

## Verification

- Actual browser worker: 17 upstream photographed documents, 12 lighting variants and six no-document scenes. 28 of 29 document scenes produced automatic corners; one heavily darkened colored paper retained the whole image. All six negative scenes retained the whole image.
- The original 17 images had mean polygon overlap around 0.95 with upstream annotations; 15 exceeded 0.90. These small upstream, model-seeded annotations are not an independent accuracy benchmark. The awkwardly held booklet and a narrow angled sheet remain difficult cases. A high presence score does not guarantee correct corners. Keep manual adjustment and original pixels.
- Browser flow: live outline on an angled real photograph, removal/reacquisition, fresh capture, straightened review, retake and manual crop controls.
- Regression tests: prediction rejection, motion clearing, worker load/failure, fresh capture, cancellation, background/foreground recovery, on-demand offline cache and cache-upgrade reuse. Existing camera, durable retake/retry/grouping and perspective-mapping tests pass.
- Physical Android/iPhone camera autofocus, device-specific speed, installed-app offline startup and Google authorization/upload were not exercised in this desktop browser. Do not claim perfect or Google-equivalent accuracy.

Detailed observations are in `validation/detector213-results.json`; third-party provenance and licenses are under `assets/vendor/document-detector213/`.
