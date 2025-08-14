# Project Context and Structure

This document summarizes how the project is organized so it’s easier to navigate as it grows.

## Overview
- Entry HTML: `index.html` (loads `src/main.ts`, links global CSS via `src/style.css`).
- Game loop: `src/main.ts` (Three.js scene, FPS controls, post-processing, menu lock/unlock wiring).
- Styles: `src/style.css` (aggregates modular CSS files in `src/styles/`).

## File Layout (key parts)
```
/ (repo root)
├─ index.html               # App shell + XP menu markup
├─ src/
│  ├─ main.ts              # Three.js setup, controls, effects, animation loop
│  ├─ style.css            # Aggregator that @imports modular CSS
│  └─ styles/
│     ├─ base.css          # CSS variables, base element styles (html/body/canvas)
│     ├─ xp-menu.css       # Windows XP-style overlay window, buttons, status bar, fire aura
│     └─ wordart.css       # WordArt-style heading (animated gradient + sheen)
├─ docs/
│  └─ CONTEXT.md           # This file
```

## Styling Conventions
- Keep global tokens (colors, spacing) in `base.css` under the `:root` scope.
- UI component styles for the menu live in `xp-menu.css`.
- Highly specific visual treatments (e.g., WordArt text) live in their own file (`wordart.css`).
- Import order in `src/style.css` is important: base → components → special effects.

## Adding New UI/Styles
- Create a new file under `src/styles/` (e.g., `taskbar.css`) for distinct UI areas.
- Add `@import './styles/taskbar.css';` to `src/style.css` after `base.css`.
- Prefer CSS variables from `base.css` so themes/tones stay consistent.

## Game Code Notes
- First-person movement uses `PointerLockControls` (WASD) with toggles for effects:
  - G: Glitch, B: Bloom, R: RGB Shift. Film effect is always on.
- World is procedural (no assets). Post-processing via Three.js example passes.

## Build/Run
- Dev: `npm run dev`
- Build: `npm run build`
- Preview: `npm run preview`

## Roadmap Hints (optional)
- Add `taskbar.css` for an XP taskbar overlay.
- Add `audio.css` or small JS module for a startup “boot chime”.
- Extract movement settings (speed/sensitivity) to a config module if needed.
