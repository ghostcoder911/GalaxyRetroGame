# Retro Arcade

A collection of free, browser-based retro arcade games. No downloads, no sign-ups — just pure classic gaming fun.

**Live Site:** Hosted on GitHub Pages (see repository settings)

## Games

| Game | Description | Controls |
|------|-------------|----------|
| **Galaxy Retro** | Space shooter — blast alien invaders | Arrow keys to move, Space to shoot |
| **Snake Classic** | Guide the snake, eat food, grow longer | Arrow keys to steer |
| **Brick Breaker** | Breakout-style brick smashing | Mouse/arrow keys to move paddle, click to launch |
| **Asteroid Dodge** | Dodge falling asteroids, collect power-ups | Arrow keys to dodge, Space to start |
| **Retro Pong** | Classic Pong vs AI | W/S or arrow keys or mouse to move paddle |

## Project Structure

```
index.html          # Arcade hub / landing page
hub.css             # Shared hub & game-page styles
hub.js              # Animated starfield background
games/
  galaxy-retro/     # Space shooter game
  snake-classic/    # Snake game
  brick-breaker/    # Breakout/Arkanoid game
  asteroid-dodge/   # Asteroid dodging game
  retro-pong/       # Pong vs AI game
```

## Running Locally

This is a static site — no dependencies or build step required.

```bash
python3 -m http.server 8080
# Open http://localhost:8080
```

## Ad Revenue Setup

The site includes Google AdSense placeholders. To enable ads:

1. Sign up at [Google AdSense](https://www.google.com/adsense)
2. Replace `ca-pub-XXXXXXXXXXXXXXXX` with your publisher ID in all HTML files
3. Replace `XXXXXXXXXX` ad slot values with your ad unit IDs
4. AdSense will review your site and start serving ads once approved

Ad placements:
- **Hub page:** Top banner, inline between game cards, bottom banner
- **Game pages:** Top and bottom banners

## Hosting

The site is configured for GitHub Pages deployment from the `main` branch root.
