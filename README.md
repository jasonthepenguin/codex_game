# JayBees Mind (Vite + Three.js)

Offline, single-player, WebGL first-person exploration with psychedelic visuals.

## Scripts

- `npm run dev`: start Vite dev server
- `npm run build`: production build
- `npm run preview`: preview build locally

## Controls

- WASD: move
- Mouse: look (click to lock)
- Esc: unlock pointer

## Notes

- No external assets required; everything is procedural.
- Post-processing uses Three.js example passes.
- Effects: Film + bloom always on; RGB shift subtle; glitch pulses briefly every 15 seconds.
- Main menu styled like Windows XP with WordArt heading.
- If performance dips, ask to reduce effect intensities or window size.
