# JayBees Mind (Vite + Three.js)

Offline, single-player, WebGL first-person exploration with psychedelic visuals.

## Scripts

- `npm run dev`: start Vite dev server
- `npm run build`: production build
- `npm run preview`: preview build locally

## Controls

- WASD: move
- Mouse: look (click to lock)
- G: toggle glitch
- B: toggle bloom
- R: toggle RGB shift
- Esc: unlock pointer

## Notes

- No external assets required; everything is procedural.
- Post-processing uses Three.js example passes.
- Film grain/scanlines effect is always enabled.
- Main menu styled like Windows XP.
- If performance dips, try disabling passes (G/B/R) or lowering window size.
