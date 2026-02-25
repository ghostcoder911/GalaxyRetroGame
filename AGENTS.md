# AGENTS.md

## Cursor Cloud specific instructions

This is a **static HTML/CSS/JS project** (Galaxy Retro — a retro space shooter game). There are no dependencies, no build tools, no package managers, and no automated tests.

### Running the application

Serve the files with any static HTTP server from the repository root:

```
python3 -m http.server 8080
```

Then open `http://localhost:8080` in a browser. The game starts when you press **Space** (desktop) or tap the arrow buttons (mobile).

### Project structure

- `index.html` — main page with canvas and mobile controls
- `script.js` — all game logic (rendering, input, collision, scoring)
- `styles.css` — styling (partial; contains placeholder comments for base styles)
- `spaceship.svg` — player spaceship graphic

### Notes

- No linting, testing, or build commands exist — the project has no `package.json` or any dependency files.
- The `styles.css` file contains placeholder comments (`/* ... (previous styles remain unchanged) ... */`) where base body/html styles would normally be; this is intentional to the current state of the repo.
- The SVG spaceship image is loaded via a relative path, so a real HTTP server is needed (not `file://` protocol) to avoid CORS issues.
