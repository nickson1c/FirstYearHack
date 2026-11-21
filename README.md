# REEL // SCORE — Room 01 prototype

A browser-based first-room foundation for the REEL // SCORE escape-room concept. The scene is built with Three.js and has no build step.

## Run

The room illustration is visible immediately, even if you open `index.html` directly. The interactive room also has a local fallback, so walking works if the Three.js CDN is unavailable. For the full Three.js scene, serve this folder with any local static HTTP server, then open the address it prints. For example, from this directory:

```powershell
py -m http.server 8000
```

Open `http://localhost:8000`. The Three.js module is loaded from jsDelivr, so the first launch needs internet access.

## Controls

- Click **Enter the Room** to begin and capture the mouse.
- `W A S D` to move, mouse to look.
- Aim at a highlighted prop or door and press `E` to interact.
- `Esc` releases the mouse; click the scene to capture it again.

Room 01 now has a complete puzzle sequence: open the desk drawer for a key, use it on the wall safe, take the vinyl, place it on the turntable, switch to reverse playback to reveal `6767`, then enter that code at the exit keypad. The keypad opens the cyan door into Room 02. The record audio is synthesized locally and its sample buffer is reversed for reverse playback.

The connected rooms have first-person navigation, readable in-world signs, and a persistent route marker. Room 02 is a photography darkroom: raise the work light, pick up the camera, and inspect one large painting through five lenses. Each lens reveals a different painted symbol. Two unlabelled wall prints provide a randomized symbol key (with decoys) and a shuffled lens sequence; combine them to solve the exit word. Press `Q` to stow the camera. Room 03 remains an archive room for later expansion.
