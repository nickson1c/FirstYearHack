import { addRoomBox } from './shared.js';

export const room03 = {
  id: 2,
  title: 'AFTERIMAGE ARCHIVE',
  detail: '03 / FILM STORAGE',
  startZ: -16.5,
  endZ: -27.5,
  accent: '#ff68d7',
  build(ctx) {
    for (let i = 0; i < 4; i++) addRoomBox({ ...ctx, name: 'archive index light', x: -1.8 + i * 1.2, y: 3.95, z: -20.9, width: .72, height: .045, depth: .035, color: i % 2 ? '#6d4d8a' : '#79513e' });
  }
};
