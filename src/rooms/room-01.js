import { addRoomBox } from './shared.js';

const studioProps = [];
function prop(ctx, name, x,y,z, sx,sy,sz,color, materialOptions={}) {
  const mesh = new ctx.THREE.Mesh(new ctx.THREE.BoxGeometry(sx,sy,sz), new ctx.THREE.MeshStandardMaterial({color, roughness:.7, ...materialOptions}));
  mesh.name=name; mesh.position.set(x,y,z); mesh.castShadow=true; mesh.receiveShadow=true; ctx.scene.add(mesh); studioProps.push(mesh); return mesh;
}
function plant(ctx,x,z,scale=1) {
  const {THREE,scene}=ctx, ceramic=new THREE.MeshStandardMaterial({color:'#d7b7a3',roughness:.35}), leaf=new THREE.MeshStandardMaterial({color:'#56856a',roughness:.8});
  const pot=new THREE.Mesh(new THREE.CylinderGeometry(.19*scale,.14*scale,.32*scale,20),ceramic);pot.position.set(x,.17*scale,z);scene.add(pot);studioProps.push(pot);
  for(let i=0;i<7;i++){const a=i*Math.PI*2/7,blade=new THREE.Mesh(new THREE.ConeGeometry(.09*scale,.56*scale,8),leaf);blade.position.set(x+Math.cos(a)*.12*scale,.48*scale,z+Math.sin(a)*.12*scale);blade.rotation.z=Math.cos(a)*-.55;blade.rotation.x=Math.sin(a)*.55;scene.add(blade);studioProps.push(blade);}
}
export const room01 = {
  id: 0,
  title: 'THE MUSIC ROOM',
  detail: '01 / TURNTABLE + TAPE',
  startZ: 5.5,
  endZ: -5.5,
  accent: '#20dfff',
  build(ctx) {
    studioProps.length=0;
    // Warm lounge details soften the booth and give it a deliberate studio identity.
    addRoomBox({ ...ctx, name: 'music room badge', x: -4.72, y: 2.15, z: -4.05, width: .08, height: .62, depth: 1.1, color: '#22404b' });
    // Side-wall velvet panels keep the rear projection screen and doorway clear.
    prop(ctx,'velvet wall panel',-4.82,2.5,.25,.08,2.8,1.85,'#684653');
    prop(ctx,'velvet wall panel',4.82,2.5,3.25,.08,2.8,1.35,'#455766');
    for (const [x,z] of [[-4.72,.25],[4.72,3.25]]) {
      prop(ctx,'wall sconce',x,3.35,z,.1,.28,.22,'#f6c77f',{emissive:'#f1a54e',emissiveIntensity:.6});
    }
    prop(ctx,'plush rug',-.1,.035,.1,3.2,.035,2.25,'#69435a');
    // Red-herring workstation is tucked against the right wall, leaving the center aisle open.
    prop(ctx,'production desk top',3.68,.91,.15,1.72,.14,2.35,'#694638');
    for(const x of [3.05,4.27]) prop(ctx,'production desk leg',x,.45,.15,.12,.9,2.08,'#382c2e');
    // A grounded monitor and stand; screen faces into the room.
    prop(ctx,'computer monitor',4.22,1.39,.15,.12,.53,.82,'#202936');
    prop(ctx,'computer screen',4.145,1.41,.15,.025,.39,.66,'#2e5662',{emissive:'#163b47',emissiveIntensity:.65});
    prop(ctx,'monitor stand',4.16,1.055,.15,.09,.15,.22,'#30343b');
    prop(ctx,'synth keyboard',3.52,1.02,.32,.42,.075,1.25,'#202936');
    for(let i=0;i<12;i++) prop(ctx,'synth key',3.39,1.066,-.22+i*.098,.19,.025,.067,i%7===0?'#d7dce0':'#596879');
    for(const z of [-.55,.82]) {
      prop(ctx,'studio monitor',4.03,1.19,z,.34,.42,.34,'#242b35');
      const speaker=new ctx.THREE.Mesh(new ctx.THREE.CircleGeometry(.105,24),new ctx.THREE.MeshStandardMaterial({color:'#d39472',emissive:'#7c2e48',emissiveIntensity:.35}));
      speaker.rotation.y=-Math.PI/2;speaker.position.set(3.85,1.20,z);ctx.scene.add(speaker);studioProps.push(speaker);
    }
    prop(ctx,'meter glow',3.77,1.10,-.04,.025,.035,.48,'#4fe5c1',{emissive:'#4fe5c1',emissiveIntensity:1.2});
    plant(ctx,4.35,2.1,.85);
  },
  interact(name, ctx) {
    const target = ({ 'jammed drawer':'drawer', 'drawer key':'key', 'safe door':'safe', 'safe vinyl':'vinyl', 'reverse switch':'reverse', 'room keypad':'keypad', 'mixing console':'mixer' })[name] || name;
    const s = ctx.getState(), v = ctx.visual;
    switch (target) {
      case 'drawer':
        if (!s.drawerOpen) { ctx.patchState({drawerOpen:true}); if(v.drawer){v.drawerKey.visible=true;v.keyHead.visible=true;v.keyToothA.visible=true;v.keyToothB.visible=true;v.keyMarker.visible=true;v.keyGlow.intensity=4;} ctx.showToast('Drawer open — the brass key is inside. Aim at it and press E.'); }
        else ctx.showToast(s.hasKey?'The drawer is empty.':'The brass key is inside the open drawer.');
        break;
      case 'key':
        if (!s.drawerOpen) { ctx.showToast('Open the drawer first.'); break; }
        ctx.patchState({hasKey:true}); if(v.drawerKey){v.drawerKey.visible=false;v.keyHead.visible=false;v.keyToothA.visible=false;v.keyToothB.visible=false;v.keyMarker.visible=false;v.keyGlow.intensity=0;}
        ctx.showToast('Brass key collected. The cyan outline marks the safe.'); break;
      case 'safe':
        if (!s.hasKey) { ctx.showToast('The safe is locked. Look in the open desk drawer for the brass key.'); break; }
        if (!s.safeOpen) { ctx.patchState({safeOpen:true}); if(v.safeDoor){v.vinylItem.visible=true;v.vinylLabel.visible=true;v.vinylGroove.visible=true;v.vinylMarker.visible=true;v.vinylGlow.intensity=5;} ctx.showToast('Safe open — the vinyl is mounted inside. Aim at it and press E.'); }
        else ctx.showToast(s.hasVinyl?'The safe is open.':'Take the vinyl from the safe.');
        break;
      case 'vinyl':
        if (!s.safeOpen) { ctx.showToast('The safe is still locked.'); break; }
        ctx.patchState({hasVinyl:true}); if(v.vinylItem){v.vinylItem.visible=false;v.vinylLabel.visible=false;v.vinylGroove.visible=false;v.vinylMarker.visible=false;v.vinylGlow.intensity=0;}
        ctx.showToast('Vinyl collected. Place it on the turntable on the desk.'); break;
      case 'turntable':
        if (!s.vinylPlaced) {
          if (!s.hasVinyl) { ctx.showToast('The platter is empty. Find the vinyl in the safe.'); break; }
          ctx.patchState({vinylPlaced:true,hasVinyl:false}); if(v.recordGroup){v.recordGroup.visible=true;v.recordGroup.scale.setScalar(.72);} ctx.showToast('Vinyl placed. The reverse switch is beside the platter.');
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
