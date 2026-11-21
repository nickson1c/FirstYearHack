import { addRoomBox } from './shared.js';

export const room04 = {
  id: 3,
  title: 'COLOR SUITE',
  detail: '04 / FINAL GRADE',
  startZ: -27.5,
  endZ: -38.5,
  accent: '#ff9d45',
  build(ctx) {
    // Color swatches, calibration bars, and a central grading console.
    const swatches = ['#ff4e7a', '#ffb84d', '#d6e65a', '#42dfbd', '#4ca6ff', '#b66dff'];
    swatches.forEach((color, i) => addRoomBox({ ...ctx, name: 'grade reference tile', x: -2.5 + i, y: 2.72, z: -35.8, width: .76, height: .54, depth: .045, color }));
    addRoomBox({ ...ctx, name: 'color grading console', x: 1.6, y: 1.12, z: -32.7, width: 2.9, height: 1.35, depth: 1.6, color: '#35273b' });
    for (let i = 0; i < 5; i++) addRoomBox({ ...ctx, name: 'grading console channel', x: .55 + i * .45, y: 1.82, z: -32.7, width: .18, height: .035, depth: .78, color: i % 2 ? '#a254b6' : '#3ec8d0' });
  }
};
