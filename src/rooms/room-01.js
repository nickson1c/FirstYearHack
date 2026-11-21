import { addRoomBox } from './shared.js';

export const room01 = {
  id: 0,
  title: 'THE MUSIC ROOM',
  detail: '01 / TURNTABLE + TAPE',
  startZ: 5.5,
  endZ: -5.5,
  accent: '#20dfff',
  build(ctx) {
    // A room-owned cabinet badge gives this area a clear visual identity.
    addRoomBox({ ...ctx, name: 'music room badge', x: -4.72, y: 2.15, z: -4.05, width: .08, height: .62, depth: 1.1, color: '#22404b' });
  },
  interact(name, ctx) {
    const target = ({ 'jammed drawer':'drawer', 'drawer key':'key', 'safe door':'safe', 'safe vinyl':'vinyl', 'reverse switch':'reverse', 'room keypad':'keypad', 'mixing console':'mixer' })[name] || name;
    const s = ctx.getState(), v = ctx.visual;
    switch (target) {
      case 'drawer':
        if (!s.drawerOpen) { ctx.patchState({drawerOpen:true}); if(v.drawer){v.drawer.position.z=-1.15;v.drawerFace.position.z=-1.06;v.drawerKey.visible=true;v.keyHead.visible=true;v.keyToothA.visible=true;v.keyToothB.visible=true;v.keyMarker.visible=true;v.keyGlow.intensity=4;} ctx.showToast('Drawer open — the brass key is inside. Aim at it and press E.'); }
        else ctx.showToast(s.hasKey?'The drawer is empty.':'The brass key is inside the open drawer.');
        break;
      case 'key':
        if (!s.drawerOpen) { ctx.showToast('Open the drawer first.'); break; }
        ctx.patchState({hasKey:true}); if(v.drawerKey){v.drawerKey.visible=false;v.keyHead.visible=false;v.keyToothA.visible=false;v.keyToothB.visible=false;v.keyMarker.visible=false;v.keyGlow.intensity=0;}
        ctx.showToast('Brass key collected. The cyan outline marks the safe.'); break;
      case 'safe':
        if (!s.hasKey) { ctx.showToast('The safe is locked. Look in the open desk drawer for the brass key.'); break; }
        if (!s.safeOpen) { ctx.patchState({safeOpen:true}); if(v.safeDoor){v.safeDoor.visible=false;v.safeDial.visible=false;v.vinylItem.visible=true;v.vinylLabel.visible=true;v.vinylGroove.visible=true;v.vinylMarker.visible=true;v.vinylGlow.intensity=5;} ctx.showToast('Safe open — the vinyl is mounted inside. Aim at it and press E.'); }
        else ctx.showToast(s.hasVinyl?'The safe is open.':'Take the vinyl from the safe.');
        break;
      case 'vinyl':
        if (!s.safeOpen) { ctx.showToast('The safe is still locked.'); break; }
        ctx.patchState({hasVinyl:true}); if(v.vinylItem){v.vinylItem.visible=false;v.vinylLabel.visible=false;v.vinylGroove.visible=false;v.vinylMarker.visible=false;v.vinylGlow.intensity=0;}
        ctx.showToast('Vinyl collected. Place it on the turntable on the desk.'); break;
      case 'turntable':
        if (!s.vinylPlaced) {
          if (!s.hasVinyl) { ctx.showToast('The platter is empty. Find the vinyl in the safe.'); break; }
          ctx.patchState({vinylPlaced:true,hasVinyl:false}); if(v.record){v.record.visible=true;v.label.visible=true;} ctx.showToast('Vinyl placed. The reverse switch is beside the platter.');
        } else {
          const playing=!s.playing;ctx.patchState({playing});
          if(playing){ctx.startAudio();if(s.reversePlayback){ctx.patchState({codeRevealed:true});ctx.showToast('The reversed groove resolves into 6767.');}else ctx.showToast('Needle down. The forward track is distorted.');}
          else {ctx.stopAudio();ctx.showToast('Playback paused.');}
          ctx.updateRecordLabel();
        }
        break;
      case 'reverse':
        if (!s.vinylPlaced) { ctx.showToast('Place the vinyl on the turntable first.'); break; }
        ctx.patchState({reversePlayback:!s.reversePlayback});
        if(v.reverseLamp)v.reverseLamp.material=!s.reversePlayback?v.magenta:v.cyan;
        if(s.playing){ctx.startAudio();if(!s.reversePlayback){ctx.patchState({codeRevealed:true});ctx.showToast('Reverse playback reveals 6767.');}else ctx.showToast('Forward playback restored.');}
        else ctx.showToast(!s.reversePlayback?'Playback direction set to reverse.':'Playback direction set to forward.');
        ctx.updateRecordLabel();break;
      case 'keypad': ctx.openKeypad(); break;
      case 'mixer': ctx.showToast('Three channels. The bass stem is isolated.'); break;
      default: return false;
    }
    ctx.update(); return true;
  },
  submitCode(ctx) {
    if(!ctx.getState().codeRevealed){ctx.setHint('Play the vinyl in reverse to reveal the four digits.');return false;}
    if(ctx.value!=='6767'){ctx.setHint('Incorrect sequence. Listen to the reversed track again.');return false;}
    ctx.unlockDoor();ctx.update();ctx.showToast('6767 accepted. The exit bolts retract.');return true;
  }
};
