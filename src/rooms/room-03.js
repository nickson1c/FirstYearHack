import { addRoomBox } from './shared.js';

const paints = [
  { id: 'charcoal', name: 'MIDNIGHT INK', color: '#11141b' }
];
const hints = [
  'A WINDOW THAT HOLDS NO LANDSCAPE',
  'GIVE THE FRAME A NECK AND A FOOT',
  'LET A ROW OF KEYS REST BENEATH'
];
const galleryArt = [];

let easelEditor = null;
let finishOverlay = null;
let editorOpen = false;
let activePaint = 0;
let strokes = [];
let drawing = false;
let canvasArt = null;
let artContext = null;
let artTexture = null;
let gameCanvas = null;
let exitDoor = null;
let exitDoorGroup = null;
let exitUnlocked = false;
let gameWon = false;

function initializeCanvas() {
  if (canvasArt) return;
  canvasArt = document.createElement('canvas');
  canvasArt.width = 900;
  canvasArt.height = 620;
  artContext = canvasArt.getContext('2d');
  redrawCanvas();
}

function redrawCanvas() {
  if (!artContext) return;
  artContext.fillStyle = '#e5dfd1';
  artContext.fillRect(0, 0, canvasArt.width, canvasArt.height);
  artContext.strokeStyle = 'rgba(95,83,67,.18)';
  artContext.lineWidth = 2;
  artContext.strokeRect(12, 12, canvasArt.width - 24, canvasArt.height - 24);

  for (const stroke of strokes) {
    artContext.beginPath();
    stroke.points.forEach((point, index) => {
      const x = point.x * canvasArt.width, y = point.y * canvasArt.height;
      if (index === 0) artContext.moveTo(x, y); else artContext.lineTo(x, y);
    });
    artContext.lineCap = 'round';
    artContext.lineJoin = 'round';
    artContext.lineWidth = 14;
    artContext.strokeStyle = stroke.color;
    artContext.stroke();
  }
  if (artTexture) artTexture.needsUpdate = true;
  // The editor uses a separate DOM canvas from the in-world canvas texture.
  // Mirror every redraw so the player sees each stroke immediately.
  const previewCanvas = easelEditor?.querySelector('[data-paint-canvas]');
  if (previewCanvas) {
    const previewContext = previewCanvas.getContext('2d');
    previewContext.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
    previewContext.drawImage(canvasArt, 0, 0, previewCanvas.width, previewCanvas.height);
  }
}

function targetComputerMask(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  context.strokeStyle = '#fff';
  context.lineWidth = 4;
  context.lineCap = 'round';
  context.lineJoin = 'round';

  // Monitor screen, center stand, broad foot, and keyboard beneath it.
  context.strokeRect(55, 23, 115, 68);
  context.beginPath(); context.moveTo(112, 91); context.lineTo(112, 113); context.stroke();
  context.beginPath(); context.moveTo(82, 117); context.lineTo(142, 117); context.stroke();
  context.strokeRect(65, 130, 95, 14);
  return context.getImageData(0, 0, width, height).data;
}

function scoreComputer() {
  const width = 225, height = 155, scaleX = width / canvasArt.width, scaleY = height / canvasArt.height;
  const drawingCanvas = document.createElement('canvas');
  drawingCanvas.width = width; drawingCanvas.height = height;
  const context = drawingCanvas.getContext('2d');
  context.strokeStyle = '#fff'; context.fillStyle = '#fff'; context.lineCap = 'round'; context.lineJoin = 'round';
  for (const stroke of strokes) {
    if (!stroke.points.length) continue;
    context.lineWidth = 14 * scaleX;
    if (stroke.points.length === 1) {
      const point = stroke.points[0];
      context.beginPath(); context.arc(point.x * width, point.y * height, 3, 0, Math.PI * 2); context.fill();
      continue;
    }
    context.beginPath();
    stroke.points.forEach((point, index) => {
      const x = point.x * width, y = point.y * height;
      if (index === 0) context.moveTo(x, y); else context.lineTo(x, y);
    });
    context.stroke();
  }

  const target = targetComputerMask(width, height);
  const drawingPixels = context.getImageData(0, 0, width, height).data;
  let targetCount = 0, drawingCount = 0, targetCovered = 0, drawingOnTarget = 0;
  const radius = 9;
  const dilate = source => {
    const result = new Uint8Array(width * height);
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      if (source[(y * width + x) * 4 + 3] === 0) continue;
      for (let dy = -radius; dy <= radius; dy++) for (let dx = -radius; dx <= radius; dx++) {
        if (dx * dx + dy * dy > radius * radius) continue;
        const xx = x + dx, yy = y + dy;
        if (xx >= 0 && xx < width && yy >= 0 && yy < height) result[yy * width + xx] = 1;
      }
    }
    return result;
  };
  const drawingNear = dilate(drawingPixels), targetNear = dilate(target);
  const near = (source, x, y) => x >= 0 && x < width && y >= 0 && y < height &&
    (source === drawingPixels ? drawingNear[y * width + x] : targetNear[y * width + x]) === 1;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const at = (y * width + x) * 4;
    if (target[at + 3] > 0) { targetCount++; if (near(drawingPixels, x, y)) targetCovered++; }
    if (drawingPixels[at + 3] > 0) { drawingCount++; if (near(target, x, y)) drawingOnTarget++; }
  }
  if (!targetCount || !drawingCount) return { score: 0, recognized: false };
  const recall = targetCovered / targetCount, precision = drawingOnTarget / drawingCount;
  const score = Math.round(200 * precision * recall / (precision + recall || 1));
  const segmentCoverage = (x1, y1, x2, y2, transform) => {
    const steps = Math.ceil(Math.hypot(x2 - x1, y2 - y1) * 1.5);
    let covered = 0;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps, x = Math.round(x1 + (x2 - x1) * t), y = Math.round(y1 + (y2 - y1) * t);
      const point = transform(x, y);
      if (near(drawingPixels, Math.round(point.x), Math.round(point.y))) covered++;
    }
    return covered / (steps + 1);
  };
  const coreSegments = [
    [55,23,170,23], [170,23,170,91], [170,91,55,91], [55,91,55,23],
    [112,91,112,113], [82,117,142,117]
  ];
  const keyboardSegments = [[65,130,160,130], [160,130,160,144], [160,144,65,144], [65,144,65,130]];
  const centerX = 112.5, centerY = 83.5, keyboardY = 137;
  let bestCore = 0, bestTransform = null;
  // Allow a little variation in scale, placement, and hand-drawn perspective.
  for (const sx of [.85, 1, 1.15, 1.3]) for (const sy of [.75, .9, 1, 1.15])
    for (const dx of [-20, -10, 0, 10, 20]) for (const dy of [-25, -15, -5, 5, 15])
      for (const shear of [-.1, 0, .1]) {
        const transform = (x, y) => ({
          x: centerX + (x - centerX) * sx + dx,
          y: centerY + (y - centerY) * sy + (x - centerX) * shear + dy
        });
        const coverage = coreSegments.map(segment => segmentCoverage(...segment, transform));
        const minimum = Math.min(...coverage);
        if (minimum > bestCore) { bestCore = minimum; bestTransform = { sx, sy, dx, dy, shear }; }
      }
  let bestKeyboard = 0;
  if (bestTransform) {
    const { sx, sy, dx, dy, shear } = bestTransform;
    for (const stretch of [1.4, 1.8, 2.2, 2.6]) for (const keyOffset of [-10, 0, 10, 20]) {
      const transformKey = (x, y) => ({
        x: centerX + (x - centerX) * sx + dx,
        y: centerY + (keyboardY - centerY) * sy + (x - centerX) * shear + dy + keyOffset + (y - keyboardY) * stretch
      });
      const coverage = keyboardSegments.map(segment => segmentCoverage(...segment, transformKey));
      const minimum = Math.min(...coverage);
      bestKeyboard = Math.max(bestKeyboard, minimum);
    }
  }
  // All screen edges, the centered stand and foot, and a distinct lower key row are required.
  const recognized = bestCore >= .38 && bestKeyboard >= .3 && precision >= .15 && score >= 30;
  return { score, recognized };
}

function closeEditor() {
  if (!easelEditor) return;
  easelEditor.hidden = true;
  easelEditor.style.display = 'none';
  editorOpen = false;
  gameCanvas?.requestPointerLock?.();
}

function createFinishOverlay() {
  if (finishOverlay) return;
  finishOverlay = document.createElement('section');
  finishOverlay.hidden = true;
  Object.assign(finishOverlay.style, { position: 'fixed', inset: '0', zIndex: '60', display: 'none', placeItems: 'center', background: 'rgba(4,7,12,.88)' });
  document.body.append(finishOverlay);
}

function showRoomOverlay(title, message, buttonText, onContinue) {
  createFinishOverlay();
  finishOverlay.innerHTML = `<div style="width:min(540px,90vw);padding:34px;background:#151923;border:1px solid #d6a56c;color:#eee8dc;text-align:center;box-shadow:0 18px 80px #000c;font-family:monospace"><div style="color:#d6a56c;letter-spacing:.22em">ROOM 03 / ART STUDIO</div><h2 style="font:600 38px sans-serif;margin:12px 0">${title}</h2><p style="color:#b7c0c9">${message}</p><button data-finish style="padding:12px 20px;background:#d6a56c;color:#171923;border:0;font:700 12px monospace;cursor:pointer">${buttonText}</button></div>`;
  finishOverlay.querySelector('[data-finish]').addEventListener('click', () => {
    finishOverlay.hidden = true; finishOverlay.style.display = 'none'; onContinue?.();
  });
  finishOverlay.hidden = false; finishOverlay.style.display = 'grid';
  document.exitPointerLock?.();
}

function finishGame() {
  if (exitUnlocked) return;
  exitUnlocked = true;
  if (exitDoorGroup) exitDoorGroup.rotation.y = -Math.PI / 2;
  window.__reelRoom03ExitOpen = true;
  showRoomOverlay('PASSAGE OPEN', 'Your study has opened the final door. Reach it and interact to finish the game.', 'CONTINUE', closeEditor);
}

function winGame() {
  if (gameWon) return;
  gameWon = true;
  window.__reelRoom03Won = true;
  showRoomOverlay('GAME COMPLETE', 'The final study is complete. You made it through the studio.', 'FINISH', () => {});
}

function createEditor() {
  if (easelEditor) return;
  easelEditor = document.createElement('section');
  easelEditor.className = 'room03-editor';
  easelEditor.hidden = true;
  easelEditor.innerHTML = `<div style="position:relative;width:min(900px,94vw);max-height:96vh;overflow-y:auto;box-sizing:border-box;padding:20px;background:#151923;border:1px solid #d6a56c;box-shadow:0 16px 70px #000c;color:#eee8dc;font:12px monospace">
    <button data-close style="position:absolute;right:12px;top:10px;padding:8px 12px">CLOSE ×</button>
    <div style="color:#d6a56c;letter-spacing:.18em;margin-bottom:5px">ROOM 03 / FORM STUDY</div>
    <h2 style="font:600 28px sans-serif;margin:0 0 8px">THE THINKING WINDOW</h2>
    <p style="color:#c4cbd2;line-height:1.6;margin:0 0 12px">With midnight ink, frame a window with no view. Give it a neck and a foot; let a row of keys rest below. Loose lines are welcome, but keep each edge distinct.</p>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin:12px 0">
      <button data-paint="0">MIDNIGHT INK</button>
      <button data-reset>RESET CANVAS</button><button data-check style="background:#d6a56c!important;color:#171923!important;font-weight:bold">CHECK DRAWING</button>
    </div>
    <div style="color:#aab4c1;margin-bottom:8px">PAINT: <b data-paint-label style="color:#fff">MIDNIGHT INK</b> · DRAG TO DRAW</div>
    <canvas data-paint-canvas width="900" height="620" style="display:block;box-sizing:border-box;width:100%;height:auto;background:#e5dfd1;border:6px solid #8f7758;touch-action:none;cursor:crosshair"></canvas>
    <div data-result style="min-height:20px;margin-top:10px;color:#e8d6b8">A broad frame, a narrow support, a low row. Imperfect lines are welcome.</div>
  </div>`;
  Object.assign(easelEditor.style, { position: 'fixed', inset: '0', zIndex: '50', display: 'none', placeItems: 'center', background: 'rgba(4,7,12,.86)' });
  const paintCanvas = easelEditor.querySelector('[data-paint-canvas]');
  const canvasPoint = event => {
    const rect = paintCanvas.getBoundingClientRect();
    const x = (event.clientX - rect.left - paintCanvas.clientLeft) / paintCanvas.clientWidth;
    const y = (event.clientY - rect.top - paintCanvas.clientTop) / paintCanvas.clientHeight;
    return { x: Math.max(0, Math.min(1, x)), y: Math.max(0, Math.min(1, y)) };
  };
  for (const button of easelEditor.querySelectorAll('button')) Object.assign(button.style, { background: '#252b35', color: '#e9e2d8', border: '1px solid #596273', padding: '9px 11px', font: '10px monospace', cursor: 'pointer' });
  paintCanvas.addEventListener('pointerdown', event => {
    drawing = true; paintCanvas.setPointerCapture(event.pointerId);
    strokes.push({ paint: paints[activePaint].id, color: paints[activePaint].color, points: [canvasPoint(event)] });
    redrawCanvas();
  });
  paintCanvas.addEventListener('pointermove', event => {
    if (!drawing) return;
    const stroke = strokes[strokes.length - 1];
    stroke.points.push(canvasPoint(event));
    redrawCanvas();
  });
  const finishStroke = () => { drawing = false; };
  paintCanvas.addEventListener('pointerup', finishStroke);
  paintCanvas.addEventListener('pointercancel', finishStroke);
  easelEditor.addEventListener('click', event => {
    const paint = event.target.closest('[data-paint]');
    if (paint) { activePaint = Number(paint.dataset.paint); easelEditor.querySelector('[data-paint-label]').textContent = paints[activePaint].name; return; }
    if (event.target.closest('[data-reset]')) { strokes = []; redrawCanvas(); easelEditor.querySelector('[data-result]').textContent = 'Canvas cleared. Revisit the three fragments around the room.'; return; }
    if (event.target.closest('[data-check]')) {
      const usedPaints = new Set(strokes.map(stroke => stroke.paint));
      if (usedPaints.size < 1) { easelEditor.querySelector('[data-result]').textContent = 'Add a few lines to the canvas first.'; return; }
      const { score, recognized } = scoreComputer();
      easelEditor.querySelector('[data-result]').textContent = `FORM MATCH: ${score}% — ${recognized ? 'PASS. Exit unlocked.' : 'Not quite. Give the frame four clear edges, a centered support, a foot, and a separate low row.'}`;
      if (recognized) finishGame();
      return;
    }
    if (event.target.closest('[data-close]')) closeEditor();
  });
  document.addEventListener('keydown', event => {
    if (editorOpen && event.code === 'Escape') { event.preventDefault(); event.stopImmediatePropagation(); closeEditor(); }
  }, true);
  document.body.append(easelEditor);
  redrawCanvas();
  createFinishOverlay();
}

function makeHintPanel(THREE, scene, y, z, text) {
  const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 150;
  const context = canvas.getContext('2d');
  context.fillStyle = '#1a2028'; context.fillRect(0, 0, 512, 150);
  context.strokeStyle = '#d6a56c'; context.lineWidth = 7; context.strokeRect(8, 8, 496, 134);
  context.fillStyle = '#d6a56c'; context.font = 'bold 22px monospace'; context.fillText('FORM STUDY / NO. 03', 22, 44);
  context.fillStyle = '#eee5d5'; context.font = 'bold 25px monospace'; context.fillText(text, 22, 100);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(1.6, .5), new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide }));
  panel.rotation.y = -Math.PI / 2; panel.position.set(4.72, y, z); scene.add(panel);
}

function createGalleryCanvas(index) {
  const art = document.createElement('canvas'); art.width = 420; art.height = 520;
  const ctx = art.getContext('2d');
  const style = ((index % 5) + 5) % 5;
  if (style === 0) {
    const sky = ctx.createLinearGradient(0, 0, 0, 520); sky.addColorStop(0, '#593d68'); sky.addColorStop(.58, '#eb956d'); sky.addColorStop(1, '#f6cf8e');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, 420, 520);
    ctx.fillStyle = '#ffe3a1'; ctx.beginPath(); ctx.arc(290, 170, 68, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#5e536f'; ctx.beginPath(); ctx.moveTo(0, 335); ctx.lineTo(115, 205); ctx.lineTo(185, 300); ctx.lineTo(290, 180); ctx.lineTo(420, 345); ctx.lineTo(420, 520); ctx.lineTo(0, 520); ctx.fill();
    ctx.fillStyle = '#286d78'; ctx.fillRect(0, 350, 420, 170);
    ctx.strokeStyle = '#f4c889'; ctx.lineWidth = 7;
    for (let y = 380; y < 510; y += 24) { ctx.beginPath(); ctx.moveTo(80 + (y % 3) * 18, y); ctx.quadraticCurveTo(210, y + 8, 350, y - 3); ctx.stroke(); }
  } else if (style === 1) {
    ctx.fillStyle = '#172b2b'; ctx.fillRect(0, 0, 420, 520);
    ctx.fillStyle = '#263e38'; ctx.beginPath(); ctx.ellipse(215, 280, 145, 215, -.12, 0, Math.PI * 2); ctx.fill();
    for (let i = 0; i < 9; i++) {
      const x = 68 + i * 36, y = 465 - (i % 4) * 23;
      ctx.strokeStyle = ['#93b87d', '#648c76', '#d0aa74'][i % 3]; ctx.lineWidth = 7;
      ctx.beginPath(); ctx.moveTo(x, 520); ctx.quadraticCurveTo(x - 35, 270, 100 + i * 28, 80 + (i % 3) * 34); ctx.stroke();
      ctx.fillStyle = ['#d486a1', '#e8c47a', '#f0e0c4'][i % 3];
      for (let p = 0; p < 5; p++) { const a = p * Math.PI * 2 / 5; ctx.beginPath(); ctx.ellipse(100 + i * 28 + Math.cos(a) * 22, 84 + (i % 3) * 34 + Math.sin(a) * 22, 13, 22, a, 0, Math.PI * 2); ctx.fill(); }
    }
  } else if (style === 2) {
    ctx.fillStyle = '#d9a77d'; ctx.fillRect(0, 0, 420, 520);
    ctx.fillStyle = '#52405d'; ctx.beginPath(); ctx.moveTo(62, 520); ctx.lineTo(82, 185); ctx.quadraticCurveTo(100, 40, 245, 58); ctx.quadraticCurveTo(355, 75, 348, 245); ctx.lineTo(375, 520); ctx.fill();
    ctx.fillStyle = '#d8a17e'; ctx.beginPath(); ctx.ellipse(213, 252, 112, 150, -.06, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#372c43'; ctx.beginPath(); ctx.moveTo(100, 205); ctx.quadraticCurveTo(78, 55, 231, 54); ctx.quadraticCurveTo(342, 68, 330, 225); ctx.lineTo(275, 155); ctx.lineTo(178, 178); ctx.fill();
    ctx.fillStyle = '#4b7779'; ctx.beginPath(); ctx.moveTo(105, 520); ctx.quadraticCurveTo(125, 394, 212, 385); ctx.quadraticCurveTo(310, 394, 330, 520); ctx.fill();
    ctx.strokeStyle = '#352f3f'; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(154, 246); ctx.lineTo(188, 239); ctx.moveTo(236, 239); ctx.lineTo(270, 246); ctx.stroke();
    ctx.strokeStyle = '#a85f61'; ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(205, 300); ctx.lineTo(216, 333); ctx.lineTo(244, 328); ctx.stroke();
  } else if (style === 3) {
    const night = ctx.createLinearGradient(0, 0, 0, 520); night.addColorStop(0, '#10182e'); night.addColorStop(1, '#402855'); ctx.fillStyle = night; ctx.fillRect(0, 0, 420, 520);
    ctx.fillStyle = '#fa75c8'; ctx.beginPath(); ctx.arc(310, 120, 55, 0, Math.PI * 2); ctx.fill();
    const buildings = [[12, 230, 80, 290], [103, 165, 105, 355], [220, 255, 73, 265], [305, 195, 100, 325]];
    for (const [x, y, w, h] of buildings) {
      ctx.fillStyle = '#151c31'; ctx.fillRect(x, y, w, h);
      for (let wy = y + 24; wy < 490; wy += 39) for (let wx = x + 15; wx < x + w - 8; wx += 27) { ctx.fillStyle = (wx + wy) % 3 ? '#49d7e8' : '#efbb68'; ctx.fillRect(wx, wy, 9, 15); }
    }
    ctx.strokeStyle = '#e957cf'; ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(0, 470); ctx.lineTo(420, 438); ctx.stroke();
    ctx.strokeStyle = '#3ce2ef'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(0, 493); ctx.lineTo(420, 462); ctx.stroke();
  } else {
    ctx.fillStyle = '#e5c9a0'; ctx.fillRect(0, 0, 420, 520);
    const wall = ctx.createLinearGradient(0, 0, 420, 520); wall.addColorStop(0, '#ede2cb'); wall.addColorStop(1, '#bd9877'); ctx.fillStyle = wall; ctx.fillRect(0, 0, 420, 390);
    ctx.fillStyle = '#704c55'; ctx.fillRect(0, 390, 420, 130);
    ctx.fillStyle = '#386d67'; ctx.beginPath(); ctx.moveTo(142, 285); ctx.quadraticCurveTo(112, 365, 145, 390); ctx.lineTo(272, 390); ctx.quadraticCurveTo(307, 365, 274, 285); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#dbad70'; ctx.fillRect(188, 245, 38, 56);
    for (let i = 0; i < 7; i++) { const x = 105 + i * 36, y = 175 + Math.sin(i * 2) * 34; ctx.strokeStyle = '#54795f'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(207, 260); ctx.quadraticCurveTo(x, y + 65, x, y); ctx.stroke(); ctx.fillStyle = ['#d96975', '#e8bd68', '#9d81b0'][i % 3]; ctx.beginPath(); ctx.arc(x, y, 23, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = '#f2e6d2'; ctx.beginPath(); ctx.ellipse(210, 412, 130, 15, 0, 0, Math.PI * 2); ctx.fill();
  }
  ctx.strokeStyle = 'rgba(245,225,188,.58)'; ctx.lineWidth = 7; ctx.strokeRect(13, 13, 394, 494);
  return art;
}

function makeGalleryArtwork(THREE, scene, x, y, z, index) {
  const art = createGalleryCanvas(index);
  galleryArt[index] = art;
  const frame = new THREE.Mesh(new THREE.BoxGeometry(.14, 1.72, 1.38), new THREE.MeshStandardMaterial({ color: '#b77e4c', metalness: .55, roughness: .32 }));
  frame.position.set(x, y, z); scene.add(frame);
  const texture = new THREE.CanvasTexture(art); texture.colorSpace = THREE.SRGBColorSpace;
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(1.18, 1.52), new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide }));
  panel.rotation.y = Math.PI / 2; panel.position.set(x + .079, y, z); scene.add(panel);
  const lamp = new THREE.Mesh(new THREE.BoxGeometry(.34, .07, 1.52), new THREE.MeshStandardMaterial({ color: '#d6a56c', emissive: '#d6a56c', emissiveIntensity: .4, metalness: .5 }));
  lamp.position.set(x + .08, y + .94, z); scene.add(lamp);
}

function addPottedPlant(THREE, scene, x, z, scale = 1) {
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(.3 * scale, .22 * scale, .38 * scale, 10), new THREE.MeshStandardMaterial({ color: '#a85f50', roughness: .78 }));
  pot.position.set(x, .19 * scale, z); scene.add(pot);
  const soil = new THREE.Mesh(new THREE.CylinderGeometry(.25 * scale, .25 * scale, .035 * scale, 10), new THREE.MeshStandardMaterial({ color: '#30251f' }));
  soil.position.set(x, .39 * scale, z); scene.add(soil);
  const greens = ['#548d68', '#71aa74', '#a2bd70'].map(color => new THREE.MeshStandardMaterial({ color, roughness: .72, side: THREE.DoubleSide }));
  for (let i = 0; i < 8; i++) {
    const angle = i * Math.PI / 4, length = (.48 + (i % 3) * .12) * scale;
    const leaf = new THREE.Mesh(new THREE.SphereGeometry(1, 7, 6), greens[i % greens.length]);
    leaf.scale.set(.12 * scale, length, .075 * scale);
    leaf.position.set(x + Math.cos(angle) * .18 * scale, .5 * scale + length * .55, z + Math.sin(angle) * .18 * scale);
    leaf.rotation.z = Math.cos(angle) * -.72; leaf.rotation.x = Math.sin(angle) * .62; scene.add(leaf);
  }
}

function addLaserBeam(THREE, scene, start, end, color) {
  const from = new THREE.Vector3(...start), to = new THREE.Vector3(...end), direction = new THREE.Vector3().subVectors(to, from);
  const length = direction.length(), midpoint = new THREE.Vector3().addVectors(from, to).multiplyScalar(.5);
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(.016, .016, length, 6), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .9 }));
  beam.position.copy(midpoint); beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize()); scene.add(beam);
  const glow = new THREE.Mesh(new THREE.CylinderGeometry(.05, .05, length, 6), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .13, depthWrite: false }));
  glow.position.copy(midpoint); glow.quaternion.copy(beam.quaternion); scene.add(glow);
}

function addStudioEasel(ctx, x, z, index) {
  const { THREE, scene } = ctx;
  const wood = '#78583e', brightWood = '#b98554';
  addRoomBox({ ...ctx, name: `studio easel ${index} left rail`, x: x - .66, y: 2.12, z, width: .075, height: 1.65, depth: .11, color: wood });
  addRoomBox({ ...ctx, name: `studio easel ${index} right rail`, x: x + .66, y: 2.12, z, width: .075, height: 1.65, depth: .11, color: wood });
  addRoomBox({ ...ctx, name: `studio easel ${index} top rail`, x, y: 2.94, z, width: 1.38, height: .09, depth: .13, color: brightWood });
  addRoomBox({ ...ctx, name: `studio easel ${index} bottom rail`, x, y: 1.28, z, width: 1.38, height: .11, depth: .17, color: brightWood });
  const rearLeg = addRoomBox({ ...ctx, name: `studio easel ${index} rear leg`, x, y: 1.25, z: z - .23, width: .09, height: 2.3, depth: .1, color: wood });
  rearLeg.rotation.x = -.16;
  const art = createGalleryCanvas(index + 3); galleryArt[index + 3] = art;
  const texture = new THREE.CanvasTexture(art); texture.colorSpace = THREE.SRGBColorSpace;
  const canvas = new THREE.Mesh(new THREE.PlaneGeometry(1.16, 1.35), new THREE.MeshStandardMaterial({ map: texture, roughness: .9, side: THREE.DoubleSide }));
  canvas.position.set(x, 2.1, z + .065); scene.add(canvas);
}

function addStudioChair(ctx, x, z, color = '#a75c55') {
  const seat = addRoomBox({ ...ctx, name: 'studio chair seat', x, y: .58, z, width: .72, height: .13, depth: .68, color });
  seat.rotation.y = -.12;
  addRoomBox({ ...ctx, name: 'studio chair back', x, y: .99, z: z - .28, width: .72, height: .72, depth: .12, color: '#71483e' });
  for (const dx of [-.27, .27]) for (const dz of [-.23, .23]) addRoomBox({ ...ctx, name: 'studio chair leg', x: x + dx, y: .28, z: z + dz, width: .08, height: .55, depth: .08, color: '#584335' });
}

function addPaintCups(THREE, scene, x, z) {
  const colors = ['#f15e86', '#38c9d7', '#e9b844'];
  colors.forEach((color, index) => {
    const jar = new THREE.Mesh(new THREE.CylinderGeometry(.12, .1, .23, 10), new THREE.MeshStandardMaterial({ color, roughness: .42, metalness: .08 }));
    jar.position.set(x + index * .31, .99, z); scene.add(jar);
    const brush = new THREE.Mesh(new THREE.CylinderGeometry(.018, .018, .48, 5), new THREE.MeshStandardMaterial({ color: '#d8c5a0' }));
    brush.position.set(x + index * .31, 1.3, z); brush.rotation.z = (index - 1) * .12; scene.add(brush);
  });
  const palette = new THREE.Mesh(new THREE.CylinderGeometry(.24, .24, .055, 18), new THREE.MeshStandardMaterial({ color: '#d7c7a8', roughness: .9 }));
  palette.position.set(x + .52, .94, z + .23); scene.add(palette);
}

export const room03 = {
  id: 2,
  title: 'ART STUDIO',
  detail: '03 / THE THINKING WINDOW',
  startZ: -16.5,
  endZ: -27.5,
  accent: '#ff68d7',
  build(ctx) {
    const { THREE, scene, interactables } = ctx;
    gameCanvas = ctx.canvas || document.querySelector('#scene');
    initializeCanvas();
    artTexture = new THREE.CanvasTexture(canvasArt); artTexture.colorSpace = THREE.SRGBColorSpace;
    addRoomBox({ ...ctx, name: 'easel base', x: 1.4, y: .22, z: -21.65, width: 1.65, height: .18, depth: .78, color: '#44372f' });
    addRoomBox({ ...ctx, name: 'easel rear leg', x: 1.4, y: 1.28, z: -21.98, width: .11, height: 2.25, depth: .12, color: '#604c3a' });
    addRoomBox({ ...ctx, name: 'easel left rail', x: .2, y: 2.25, z: -21.72, width: .11, height: 2.05, depth: .13, color: '#795d40' });
    addRoomBox({ ...ctx, name: 'easel right rail', x: 2.6, y: 2.25, z: -21.72, width: .11, height: 2.05, depth: .13, color: '#795d40' });
    addRoomBox({ ...ctx, name: 'easel top rail', x: 1.4, y: 3.27, z: -21.72, width: 2.5, height: .12, depth: .14, color: '#a17b4c' });
    const painting = new THREE.Mesh(new THREE.PlaneGeometry(2.25, 1.78), new THREE.MeshStandardMaterial({ map: artTexture, roughness: .84, side: THREE.DoubleSide }));
    painting.position.set(1.4, 2.35, -21.63); painting.name = 'framed canvas'; scene.add(painting); interactables.push(painting);
    makeHintPanel(THREE, scene, 3.55, -20.3, hints[0]);
    makeHintPanel(THREE, scene, 3.55, -22.4, hints[1]);
    makeHintPanel(THREE, scene, 3.55, -24.5, hints[2]);
    for (let i = 0; i < 3; i++) makeGalleryArtwork(THREE, scene, -4.72, 2.45, -20.5 - i * 2.8, i);
    addPottedPlant(THREE, scene, 4.15, -19.2, .95);
    addPottedPlant(THREE, scene, -4.15, -25.8, 1.05);
    addLaserBeam(THREE, scene, [-4.5, 4.55, -18.7], [4.5, 4.55, -22.2], '#ff54d8');
    addLaserBeam(THREE, scene, [4.5, 4.48, -20], [-4.5, 4.48, -24.5], '#49e5ff');
    addLaserBeam(THREE, scene, [-4.5, 4.58, -25.4], [4.5, 4.58, -26.5], '#ffd37b');
    addStudioEasel(ctx, 3.15, -18.9, 0);
    addStudioEasel(ctx, -3.2, -25.25, 1);
    addRoomBox({ ...ctx, name: 'paint workstation top', x: -3.5, y: .88, z: -21.8, width: 2.05, height: .14, depth: 1.15, color: '#79573e' });
    for (const dx of [-.86, .86]) for (const dz of [-.43, .43]) addRoomBox({ ...ctx, name: 'paint workstation leg', x: -3.5 + dx, y: .44, z: -21.8 + dz, width: .11, height: .84, depth: .11, color: '#584335' });
    addPaintCups(THREE, scene, -4.22, -21.82);
    addStudioChair(ctx, -2.1, -21.55);
    addStudioChair(ctx, 3.15, -23.75, '#557b77');
    exitDoorGroup = new THREE.Group(); exitDoorGroup.position.set(-.82, 0, -27.34); scene.add(exitDoorGroup);
    exitDoor = new THREE.Mesh(new THREE.BoxGeometry(1.64, 3.12, .14), new THREE.MeshStandardMaterial({ color: '#201d2a', roughness: .42, metalness: .35, emissive: '#38233f', emissiveIntensity: .24 }));
    exitDoor.name = 'art studio exit'; exitDoor.position.set(.82, 1.56, 0); exitDoorGroup.add(exitDoor); interactables.push(exitDoor);
    const plaque = new THREE.Mesh(new THREE.BoxGeometry(.5, .34, .05), new THREE.MeshStandardMaterial({ color: '#d6a56c', metalness: .48, roughness: .35 }));
    plaque.position.set(.82, 1.65, .1); exitDoorGroup.add(plaque);
    createEditor();
  },
  buildFallback(ctx) {
    initializeCanvas(); createEditor();
    for (let i = 0; i < 3; i++) galleryArt[i] ||= createGalleryCanvas(i);
    for (let i = 0; i < 2; i++) galleryArt[i + 3] ||= createGalleryCanvas(i + 3);
    const { box, addTarget, quad } = ctx; gameCanvas = ctx.canvas || document.querySelector('#offline-scene');
    box(1.4, .22, -21.65, 1.65, .18, .78, '#44372f');
    box(1.4, 1.28, -21.98, .11, 2.25, .12, '#604c3a');
    box(.2, 2.25, -21.72, .11, 2.05, .13, '#795d40'); box(2.6, 2.25, -21.72, .11, 2.05, .13, '#795d40');
    box(1.4, 3.27, -21.72, 2.5, .12, .14, '#a17b4c');
    for (const z of [-20.3, -22.4, -24.5]) box(4.7, 3.55, z, .08, .6, 1.8, '#1a2028', '#d6a56c');
    for (const [x, z] of [[3.15, -18.9], [-3.2, -25.25]]) {
      box(x - .66, 2.12, z, .075, 1.65, .11, '#78583e'); box(x + .66, 2.12, z, .075, 1.65, .11, '#78583e');
      box(x, 2.94, z, 1.38, .09, .13, '#b98554'); box(x, 1.28, z, 1.38, .11, .17, '#b98554');
      box(x, 1.25, z - .23, .09, 2.3, .1, '#78583e');
    }
    box(-3.5, .88, -21.8, 2.05, .14, 1.15, '#79573e');
    for (const dx of [-.86, .86]) for (const dz of [-.43, .43]) box(-3.5 + dx, .44, -21.8 + dz, .11, .84, .11, '#584335');
    for (const [x, z, color] of [[-2.1, -21.55, '#a75c55'], [3.15, -23.75, '#557b77']]) {
      box(x, .58, z, .72, .13, .68, color); box(x, .99, z - .28, .72, .72, .12, '#71483e');
      for (const dx of [-.27, .27]) for (const dz of [-.23, .23]) box(x + dx, .28, z + dz, .08, .55, .08, '#584335');
    }
    quad([[-5, 0, -27.5], [-.9, 0, -27.5], [-.9, 5, -27.5], [-5, 5, -27.5]], '#343b4a');
    quad([[.9, 0, -27.5], [5, 0, -27.5], [5, 5, -27.5], [.9, 5, -27.5]], '#343b4a');
    quad([[-.9, 3.3, -27.5], [.9, 3.3, -27.5], [.9, 5, -27.5], [-.9, 5, -27.5]], '#343b4a');
    addTarget('framed canvas', 1.4, 2.35, -21.55);
    addTarget('art studio exit', 0, 1.55, -27.35);
  },
  renderFallback({ context, w, h, project, roomIndex }) {
    if (roomIndex !== 2 || !canvasArt) return;
    const drawPanel = (position, width, height, image, frame) => {
      const point = project(position, w, h); if (!point) return;
      const scale = h / (2 * Math.tan(Math.PI / 6)) / point[2], dw = width * scale, dh = height * scale;
      const left = point[0] - dw / 2, top = point[1] - dh / 2;
      context.fillStyle = frame; context.fillRect(left - 5, top - 5, dw + 10, dh + 10);
      if (image) context.drawImage(image, left, top, dw, dh);
    };
    drawPanel([1.4, 2.35, -21.55], 2.25, 1.78, canvasArt, '#a17b4c');
    drawPanel([3.15, 2.1, -18.835], 1.16, 1.35, galleryArt[3], '#b98554');
    drawPanel([-3.2, 2.1, -25.185], 1.16, 1.35, galleryArt[4], '#b98554');
    for (let i = 0; i < 3; i++) {
      const cup = project([-4.22 + i * .31, 1.04, -21.82], w, h); if (!cup) continue;
      const radius = Math.max(2, Math.min(7, 70 / cup[2]));
      context.fillStyle = ['#f15e86', '#38c9d7', '#e9b844'][i]; context.fillRect(cup[0] - radius, cup[1] - radius, radius * 2, radius * 2);
      context.strokeStyle = '#d8c5a0'; context.lineWidth = Math.max(1, radius * .3); context.beginPath(); context.moveTo(cup[0], cup[1] - radius); context.lineTo(cup[0] + radius * .4, cup[1] - radius * 3); context.stroke();
    }
    const palette = project([-3.7, .98, -21.59], w, h);
    if (palette) { const radius = Math.max(3, Math.min(9, 90 / palette[2])); context.fillStyle = '#d7c7a8'; context.beginPath(); context.ellipse(palette[0], palette[1], radius, radius * .55, -.2, 0, Math.PI * 2); context.fill(); }
    const hintData = [[-20.3, hints[0]], [-22.4, hints[1]], [-24.5, hints[2]]];
    for (const [z, text] of hintData) {
      const point = project([4.68, 3.55, z], w, h); if (!point) continue;
      const scale = Math.max(.45, Math.min(1.1, 520 / point[2]));
      context.fillStyle = '#d6a56c'; context.fillRect(point[0] - 76 * scale, point[1] - 16 * scale, 152 * scale, 32 * scale);
      context.fillStyle = '#1a2028'; context.font = `bold ${Math.max(7, 9 * scale)}px monospace`; context.textAlign = 'center'; context.fillText(text, point[0], point[1] + 3 * scale);
    }
    for (let i = 0; i < 3; i++) drawPanel([-4.72, 2.45, -20.5 - i * 2.8], 1.38, 1.72, galleryArt[i], '#b77e4c');
    const drawBeam = (start, end, color) => {
      const a = project(start, w, h), b = project(end, w, h); if (!a || !b) return;
      context.save(); context.strokeStyle = color; context.globalAlpha = .72; context.lineWidth = 3; context.shadowColor = color; context.shadowBlur = 16;
      context.beginPath(); context.moveTo(a[0], a[1]); context.lineTo(b[0], b[1]); context.stroke(); context.restore();
    };
    drawBeam([-4.5, 4.55, -18.7], [4.5, 4.55, -22.2], '#ff54d8');
    drawBeam([4.5, 4.48, -20], [-4.5, 4.48, -24.5], '#49e5ff');
    drawBeam([-4.5, 4.58, -25.4], [4.5, 4.58, -26.5], '#ffd37b');
    for (const [x, z] of [[4.15, -19.2], [-4.15, -25.8]]) {
      const plant = project([x, .7, z], w, h); if (!plant) continue;
      const scale = Math.max(.5, Math.min(2.2, 480 / plant[2]));
      context.fillStyle = '#a85f50'; context.beginPath(); context.moveTo(plant[0] - 12 * scale, plant[1] + 16 * scale); context.lineTo(plant[0] + 12 * scale, plant[1] + 16 * scale); context.lineTo(plant[0] + 8 * scale, plant[1] + 31 * scale); context.lineTo(plant[0] - 8 * scale, plant[1] + 31 * scale); context.fill();
      for (let i = 0; i < 7; i++) {
        const angle = i * Math.PI * 2 / 7, tipX = plant[0] + Math.cos(angle) * 25 * scale, tipY = plant[1] - 20 * scale - Math.sin(angle) * 20 * scale;
        context.strokeStyle = ['#548d68', '#71aa74', '#a2bd70'][i % 3]; context.lineWidth = 5 * scale; context.beginPath(); context.moveTo(plant[0], plant[1] + 14 * scale); context.quadraticCurveTo(plant[0] + Math.cos(angle) * 12 * scale, plant[1] - 13 * scale, tipX, tipY); context.stroke();
      }
    }
    const door = exitUnlocked ? project([-.45, 1.55, -27.36], w, h) : project([0, 1.55, -27.36], w, h);
    if (door) {
      const scale = h / (2 * Math.tan(Math.PI / 6)) / door[2], width = (exitUnlocked ? .14 : 1.64) * scale, height = 3.12 * scale;
      context.fillStyle = '#d6a56c'; context.fillRect(door[0] - width / 2 - 4, door[1] - height / 2 - 4, width + 8, height + 8);
      context.fillStyle = exitUnlocked ? '#352a38' : '#201d2a'; context.fillRect(door[0] - width / 2, door[1] - height / 2, width, height);
    }
  },
  interact(name, ctx) {
    if (name === 'framed canvas') { easelEditor.hidden = false; easelEditor.style.display = 'grid'; editorOpen = true; document.exitPointerLock?.(); return true; }
    if (name === 'art studio exit') {
      if (exitUnlocked) { winGame(); ctx.showToast('The final door opens. Game complete.'); }
      else ctx.showToast('Complete the form study to open the exit.');
      return true;
    }
    return false;
  }
};
