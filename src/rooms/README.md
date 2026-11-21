# Room module ownership

Each `room-0X.js` file is the home for that room's title, route range, accent color, local decorations, and puzzle interaction rules. `index.js` is the ordered route registry; keep its order aligned with the room numbers in the UI. `shared.js` contains helpers used by more than one room.

## Collaborating without file conflicts

- Assign each collaborator one `room-0X.js` file and have them work on a separate Git branch.
- Room-specific decoration, metadata, and puzzle rules should stay in that room's module.
- Coordinate changes to `index.js`, `app.js`, `fallback.js`, `index.html`, and `shared.js` because those files connect all rooms or support both renderers.
- Merge each branch through a pull request. Separate room files usually merge cleanly; shared route or interaction changes still need coordination.

Room 01 and Room 02 interaction and submission rules now live in their respective modules. The renderer files still own rendering, input wiring, shared movement, and door traversal. Add new room puzzle rules to that room's module and pass renderer objects or UI callbacks through its context instead of editing another room's file.
