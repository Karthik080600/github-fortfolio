# Spirited Away AR poster (prototype v0.1)

**Flow:** QR on the frame → opens this site → camera → point at the poster → the world around the frame appears; move your phone up/down/left/right to look around.

## Deploy (GitHub Pages)
1. Push this whole folder to a repo → Settings → Pages → deploy from `main` / root.
2. Open `https://<you>.github.io/<repo>/qr.html`, print the QR, stick it on the frame.
3. Camera needs HTTPS — GitHub Pages provides it.

## Test without printing
`https://<you>.github.io/<repo>/?preview` — no camera, drag to orbit, pinch to zoom.

## Poster tracking
- First launch compiles `assets/poster_target.jpg` in the browser (~20s, then cached on that phone).
- To skip that: open the site once, in the browser console run `downloadMind()`, and commit the downloaded `targets.mind` next to `index.html`.
- Better tracking = better target image. Replace `assets/poster_target.jpg` with a clean straight-on scan (no glare, no frame).

## Editing the scene
Everything lives in `scene.js`: `PANELS` (2D backgrounds) and `CHARACTERS` (transparent PNG cut-outs with x/y/z, height). Drop new full-body PNGs in `assets/` and add a line.

## Known limits of v0.1
- Tracking needs the poster in view. Panels beside the poster work when you hold the phone far enough back to see part of the poster; fully off-poster viewing needs a gyro-based hand-off (next phase).
- Characters are flat cut-outs with depth layers, parallax, idle float and limited turn-toward-you — not real 360° models. A `.glb` swap is possible later.
- Artwork belongs to Studio Ghibli — fine for a class demo, get permission before publishing publicly.
