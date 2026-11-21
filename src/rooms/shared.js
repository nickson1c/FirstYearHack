// Shared helpers for room modules. Rooms own the props they add; this file owns
// small reusable pieces so changes to one room rarely touch another.
export function addRoomBox({ THREE, scene, mat, name, x, y, z, width, height, depth, color, target = false, interactables }) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), mat(color));
  mesh.name = name; mesh.position.set(x, y, z); scene.add(mesh);
  if (target) interactables.push(mesh);
  return mesh;
}
