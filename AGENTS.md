# AGENTS.md

## Cursor Cloud specific instructions

This is a **static HTML/CSS/JS project** — a retro arcade game hub with multiple games (Galaxy Retro, Asteroid Dodge, etc. under `games/`). There are no dependencies, no build tools, no package managers, and no automated tests.

### Running the application

Serve the files with any static HTTP server from the repository root:

```
python3 -m http.server 8080
```

Then open `http://localhost:8080` in a browser. The game starts when you press **Space** (desktop) or tap the arrow buttons (mobile).

### Project structure

- `index.html` — hub landing page
- `script.js`, `styles.css`, `spaceship.svg` — root-level Galaxy Retro game assets
- `games/<name>/` — individual game directories (each self-contained with `index.html`, `script.js`, `styles.css`)
- `games/galaxy-retro/` — Galaxy Retro (space shooter, canonical reference for game page layout)
- `games/asteroid-dodge/` — Asteroid Dodge (dodging game with power-ups)
- `games/brick-breaker/` — Brick Breaker (Breakout/Arkanoid clone with neon bricks, mouse/touch/keyboard controls)
- `games/snake-classic/` — Snake Classic
- `games/retro-pong/` — Retro Pong (player vs AI, W/S or arrow keys or mouse, first to 11 wins)

### Notes

- No linting, testing, or build commands exist — the project has no `package.json` or any dependency files.
- The `styles.css` file contains placeholder comments (`/* ... (previous styles remain unchanged) ... */`) where base body/html styles would normally be; this is intentional to the current state of the repo.
- The SVG spaceship image is loaded via a relative path, so a real HTTP server is needed (not `file://` protocol) to avoid CORS issues.
