# Spirited Away WebAR poster

## Before it works
1. **Poster target**: open https://hiukim.github.io/mind-ar-js-doc/tools/compile , upload a clean photo/scan of the poster, download `targets.mind`, put it in `assets/`.
2. **Characters**: transparent PNGs in `assets/characters/`: yubaba, boh, chihiro, lin, haku_human, noface, kamaji, haku_dragon (.png). Missing ones show a dashed PLACEHOLDER card. Edit `CHARS` in `js/app.js` to move/resize/add.
3. **Audio**: add mp3s to `assets/audio/`: front_bathhouse, left_spirits, right_characters, down_train_water, up_sky_wind, train_movement, water_ambience, wind_ambience. Missing files fall back to a synthesized PLACEHOLDER hum (not finished audio). Use seamless loops, ~1-2 min.
4. Set `POSTER_H` and `VZ` in `app.js` if the layout feels too close or far.

## Test
- `?demo` skips poster tracking (scene appears in front of you, gyro-locked) to test layout and audio.
- Needs HTTPS (GitHub Pages is). Local: `npx serve` + a tunnel.

## Deploy
Push the folder to a GitHub repo, Settings > Pages > Deploy from branch (main, root). URL: `https://<user>.github.io/<repo>/`. Make the QR from that URL **after** it loads.

## How direction works
Poster pose gives the scene anchor. When the poster leaves view, the gyroscope keeps the scene locked in place (rotation only: it drifts if you walk around). The view direction is computed in poster space: up/down by tilt, left/right beyond about 30 degrees to the side, otherwise front. A zone must hold 300 ms before the audio crossfades.
