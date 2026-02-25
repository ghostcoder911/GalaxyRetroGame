# AGENTS.md

## Cursor Cloud specific instructions

This is a **static HTML/CSS/JS project** — a retro arcade hub with five browser-based games. There are no dependencies, no build tools, no package managers, and no automated tests.

### Running the application

Serve the files with any static HTTP server from the repository root:

```
python3 -m http.server 8080
```

Then open `http://localhost:8080` in a browser. The hub page lists all games; clicking a game card opens it.

### Project structure

- `index.html` — arcade hub / landing page with game cards and ad placements
- `hub.css` — shared styles for hub page and game page common elements (back link, ad containers)
- `hub.js` — animated starfield background for the hub page
- `games/galaxy-retro/` — space shooter game
- `games/snake-classic/` — classic snake game
- `games/brick-breaker/` — breakout/arkanoid game
- `games/asteroid-dodge/` — asteroid dodging game
- `games/retro-pong/` — pong vs AI game
- `games/snake-classic/` — classic snake game (also listed above)
- `games/space-invaders/` — space invaders game
- `games/tetris-classic/` — tetris game
- `games/flappy-bird/` — flappy bird clone
- `games/memory-match/` — memory card matching game

Each game directory contains its own `index.html`, `script.js`, and `styles.css`. Game pages link to `../../hub.css` for shared styles.

### Notes

- No linting, testing, or build commands exist — all files are plain HTML/CSS/JS served as-is.
- Google AdSense placeholders use `ca-pub-XXXXXXXXXXXXXXXX` — replace with a real publisher ID to enable ads.
- The site is designed for GitHub Pages hosting from the repository root.
- The original root-level `script.js`, `styles.css`, and `spaceship.svg` files are kept for backwards compatibility; the canonical game is in `games/galaxy-retro/`.
