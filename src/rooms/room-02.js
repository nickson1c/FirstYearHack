import { addRoomBox } from './shared.js';

export const room02 = {
  id: 1,
  title: 'PHOTOGRAPHY LAB',
  detail: '02 / FIVE FILTERS',
  startZ: -5.5,
  endZ: -16.5,
  accent: '#20dfff',
  build(ctx) {
    for (let i = 0; i < 5; i++) addRoomBox({ ...ctx, name: 'photo lab ceiling marker', x: -2 + i, y: 4.72, z: -9.2, width: .46, height: .035, depth: .035, color: i % 2 ? '#8b3e9b' : '#287d91' });
  },
  interact(name, ctx) {
    const target = ({brightness:'brightness switch',photoCamera:'photo camera',contactSheet:'translation poster',orderPoster:'order poster',wordlock:'word lock'})[name] || name;
    const s=ctx.getState(),v=ctx.visual;
    switch(target){
      case 'brightness switch':
        ctx.patchState({photoBright:!s.photoBright,...(!s.photoBright?{}:{cameraMode:false})});
        if(v.setBrightness)v.setBrightness(!s.photoBright);
        ctx.showToast(!s.photoBright?'Work light on. The camera is lit on the bench; aim at it and press E.':'Darkroom lights off.');break;
      case 'photo camera':
        ctx.patchState({cameraMode:true});if(v.setCameraMode)v.setCameraMode(true);
        ctx.showToast('Camera ready. Change lenses 1–5 to reveal details in the large painting. Press E to record each view.');break;
      case 'translation poster':ctx.patchState({translationRead:true});ctx.showTranslation();break;
      case 'order poster':ctx.patchState({orderRead:true});ctx.showOrder();break;
      case 'word lock':ctx.openWordlock();break;
      case 'photo painting':
        if(!s.cameraMode){ctx.showToast('Pick up the camera to inspect the painting through its lenses.');break;}
        if(s.photoFound.has(s.activeFilter)){ctx.showToast('This lens print is already recorded. Try another filter.');break;}
        s.photoFound.add(s.activeFilter);ctx.updateSymbolCount(s.photoFound.size);ctx.showToast(`Painting detail recorded (${s.photoFound.size}/5).`);break;
      default:return false;
    }
    ctx.update();return true;
  },
  openWordlock(ctx) {
    const s=ctx.getState();
    ctx.setHint(s.photoFound.size===5&&s.translationRead&&s.orderRead?'The sequence is ready.':'Inspect the wall prints first.');
    ctx.openOverlay();
  },
  submitWord(ctx) {
    const s=ctx.getState();
    if(s.photoFound.size<5||!s.translationRead||!s.orderRead){ctx.setHint('The image record is incomplete.');return false;}
    if(ctx.value!=='FOCUS'){ctx.setHint('That combination does not fit.');return false;}
    ctx.patchState({photoWordUnlocked:true});ctx.unlockDoor();ctx.update();ctx.showToast('The latch releases.');ctx.restoreLook();return true;
  }
};
