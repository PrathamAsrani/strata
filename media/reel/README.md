# Strata reel (source)

The 48-second film on the website, written as code: `film.js` paints any frame from its time alone
(`window.seek(t)`), so the site can scrub it with the scroll. The score is synthesized by `audio/score.py`
(numpy/scipy), which also writes the beat grid `beats.json`.

- Preview: serve this folder (`python3 -m http.server`) and open `index.html` (space: play/pause).
  Fonts: put Archivo instances as `fonts/display.ttf` (wdth 72, wght 800) and `fonts/display-wide.ttf`
  (wdth 125, wght 800), IBM Plex Mono as `fonts/ui.ttf` and `fonts/ui-bold.ttf`.
- The website plays the rendered film, `docs/film/strata-web.mp4` (1080p30 with motion blur, H.264 + AAC,
  faststart). After a change, render it again and re-encode it with the mix (see `docs/critique.md`).
- `docs/shotlist.md` is the approved shot list, `docs/critique.md` the review rounds.
