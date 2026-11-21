# REEL // SCORE — Room 01 prototype

A browser-based first-room foundation for the REEL // SCORE escape-room concept. The scene is built with Three.js and has no build step.

## Run

Serve this folder with any local static HTTP server, then open the address it prints. For example, from this directory:

```powershell
py -m http.server 8000
```

Open `http://localhost:8000`. The Three.js module is loaded from jsDelivr, so the first launch needs internet access.

## Controls

- Click **Enter the Room** to begin and capture the mouse.
- `W A S D` to move, mouse to look.
- Aim at a highlighted prop and press `E` to interact.
- `Esc` releases the mouse; click the scene to capture it again.

The current prototype includes a furnished projection booth, first-person navigation, viewfinder HUD, turntable, three-channel mixer prop, projector, desk drawer, film canister, and locked exit. Interactions establish a lightweight first puzzle beat; the shader filters and full stem-driven puzzle chain are later phases.
