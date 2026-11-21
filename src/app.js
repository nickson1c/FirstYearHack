import * as THREE from 'three';
import { ROOMS } from './rooms/index.js?v=room03-fix-v11';

const canvas = document.querySelector('#scene');
const scene = new THREE.Scene();
scene.background = new THREE.Color('#080c15');
scene.fog = new THREE.FogExp2('#080c15', 0.028);
const camera = new THREE.PerspectiveCamera(65, innerWidth / innerHeight, 0.08, 60);
camera.position.set(0, 1.62, 5.6);
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = false;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.28;
renderer.outputColorSpace = THREE.SRGBColorSpace;
// Keep the local renderer active unless WebGL actually initializes.
document.querySelector('#room-preview').style.display = 'none';
document.querySelector('#offline-scene').style.display = 'none';
window.__reelThreeReady = true;

scene.add(new THREE.HemisphereLight('#b4d6ff', '#111725', 2.15));
const entryFill = new THREE.PointLight('#28cfff', 20, 16, 2);entryFill.position.set(0,3.6,3.5);scene.add(entryFill);
const lamp = new THREE.PointLight('#22d9ff', 34, 13, 2);
lamp.position.set(-1.3, 3.35, -1.7); scene.add(lamp);
const redLamp = new THREE.PointLight('#d72aff', 18, 10, 2);
redLamp.position.set(3.2, 2.7, -2); scene.add(redLamp);

const mat = (color, roughness=0.8, metalness=0) => new THREE.MeshStandardMaterial({ color, roughness, metalness });
const wood=mat('#202630',.52,.35), darkWood=mat('#10141c',.58,.42), wall=mat('#242a36'), plaster=mat('#30394a'), brass=mat('#b77749',.35,.72), black=mat('#10141b',.45,.24), cream=mat('#c9d5de');
const cyan=new THREE.MeshStandardMaterial({color:'#20d9ff',emissive:'#00a8cb',emissiveIntensity:2.1,metalness:.25,roughness:.28});
const magenta=new THREE.MeshStandardMaterial({color:'#f235ff',emissive:'#b000d0',emissiveIntensity:1.8,metalness:.2,roughness:.32});
function box(name, x,y,z, sx,sy,sz, material, target=false) {
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(sx,sy,sz),material); mesh.name=name; mesh.position.set(x,y,z); mesh.castShadow=true; mesh.receiveShadow=true; scene.add(mesh); if(target) interactables.push(mesh); return mesh;
}
const interactables=[];
const roomDoorObjects=[];
let photoLight=null,photoFillLight=null,photoCamera=null,photoCameraBody=null;
let photoCameraMarker=null;
let photoPaintingMaterial=null,photoBaseTexture=null,photoPaintingTextures=[];
let photoBright=false,cameraMode=false,activeFilter=0,translationRead=false,orderRead=false,photoWordUnlocked=false;
const photoFound=new Set();
const photoGlyphCodes=[0x25b3,0x25c9,0x2301,0x2723,0x25c7].sort(()=>Math.random()-.5);
const photoFilterOrder=[1,2,3,4,5].sort(()=>Math.random()-.5);
const photoFilterGlyphs=[];photoFilterOrder.forEach((filter,i)=>photoFilterGlyphs[filter-1]=photoGlyphCodes[i]);
const photoTranslationEntries=[...photoGlyphCodes.map((glyph,i)=>({glyph,letter:'FOCUS'[i]})),{glyph:0x2297,letter:'A'},{glyph:0x2302,letter:'E'},{glyph:0x203b,letter:'R'}].sort(()=>Math.random()-.5);
function buildDoorway(z,boundaryIndex){
  const openingX=4.02,openingWidth=1.6,leftEdge=openingX-openingWidth/2,rightEdge=openingX+openingWidth/2;
  const material=mat(boundaryIndex===0?'#252d3a':'#252239',.65,.3);
  box('partition left',(-5+leftEdge)/2,2.5,z,leftEdge+5,5,.25,material);
  box('partition right',(5+rightEdge)/2,2.5,z,5-rightEdge,5,.25,material);
  box('partition lintel',openingX,4,z,openingWidth,2,.25,material);
  const pivot=new THREE.Group();pivot.position.set(leftEdge,0,z);scene.add(pivot);
  const door=new THREE.Mesh(new THREE.BoxGeometry(1.45,3,.12),darkWood);door.name=boundaryIndex===0?'exit door':`room door ${boundaryIndex}`;door.position.set(openingWidth/2,1.5,0);door.castShadow=true;door.receiveShadow=true;pivot.add(door);interactables.push(door);
  const handle=new THREE.Mesh(new THREE.BoxGeometry(.055,.2,.09),brass);handle.name='door handle';handle.position.set(.48,-.02,.09);door.add(handle);
  box('cyan door frame',openingX,3.02,z+.16,1.62,.05,.08,cyan);
  box('magenta door frame',openingX,3.02,z-.16,1.62,.05,.08,magenta);
  if(boundaryIndex===0){box('room keypad',3.02,1.48,z+.22,.24,.82,.1,black,true);box('keypad display',3.02,1.75,z+.16,.16,.12,.025,cyan);for(let row=0;row<3;row++)for(let col=0;col<3;col++)box('keypad button',2.97+col*.05,1.55-row*.11,z+.14,.025,.025,.02,cream);}
  if(boundaryIndex===1){box('word lock',3.02,1.48,z+.22,.24,.82,.1,black,true);box('word lock display',3.02,1.75,z+.16,.16,.12,.025,magenta);for(let n=0;n<5;n++)box('word lock key',2.94+n*.04,1.48,z+.14,.025,.08,.02,cream);}
  roomDoorObjects.push({mesh:door,pivot,boundary:z,from:boundaryIndex,to:boundaryIndex+1,openingX,openingHalfWidth:openingWidth/2,isOpen:false,targetAngle:0});
}
function addRoomSign(title,subtitle,accent,x,y,z){
  const art=document.createElement('canvas');art.width=768;art.height=256;const ctx=art.getContext('2d');
  ctx.fillStyle='#08121f';ctx.fillRect(0,0,768,256);ctx.strokeStyle=accent;ctx.lineWidth=7;ctx.strokeRect(8,8,752,240);
  ctx.fillStyle=accent;ctx.font='bold 27px monospace';ctx.fillText('REEL // SCORE    •    ACCESS NODE',30,55);
  ctx.fillStyle='#eef6ff';ctx.font='bold 52px sans-serif';ctx.fillText(title,30,132);
  ctx.fillStyle='#a9bbcc';ctx.font='25px monospace';ctx.fillText(subtitle,32,190);
  const texture=new THREE.CanvasTexture(art);texture.colorSpace=THREE.SRGBColorSpace;
  const sign=new THREE.Mesh(new THREE.PlaneGeometry(2.45,.82),new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide}));
  sign.position.set(x,y,z);scene.add(sign);
}
function makePickupMarker(text,color){
  const art=document.createElement('canvas');art.width=320;art.height=92;const ctx=art.getContext('2d');
  ctx.fillStyle='rgba(6,14,24,.94)';ctx.fillRect(3,3,314,86);ctx.strokeStyle=color;ctx.lineWidth=5;ctx.strokeRect(3,3,314,86);
  ctx.fillStyle=color;ctx.font='bold 30px monospace';ctx.fillText(text,20,59);
  const texture=new THREE.CanvasTexture(art);texture.colorSpace=THREE.SRGBColorSpace;
  const marker=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,transparent:true,depthTest:true}));marker.scale.set(1.25,.36,1);scene.add(marker);marker.visible=false;return marker;
}
function makeGlyphSprite(glyph,color){const art=document.createElement('canvas');art.width=256;art.height=256;const ctx=art.getContext('2d');ctx.clearRect(0,0,256,256);ctx.shadowColor=color;ctx.shadowBlur=28;ctx.fillStyle=color;ctx.font='bold 174px serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(glyph,128,132);const texture=new THREE.CanvasTexture(art);texture.colorSpace=THREE.SRGBColorSpace;const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,transparent:true,depthTest:true}));sprite.scale.set(.78,.78,1);sprite.visible=false;scene.add(sprite);return sprite;}

// A compact listening studio with warm practical lights and walnut furniture.
box('floor',0,-.12,0,10,.24,11,mat('#1b2635',.48,.34));
box('left wall',-5,2.5,0,.25,5,11,wall); box('right wall',5,2.5,0,.25,5,11,wall);
box('ceiling',0,5,0,10,.2,11,mat('#151c29'));
// Floor boards and wall battens make the geometry read as a real, lived-in room.
for(let i=-4;i<=4;i++) box('floor seam',i*.95,.008,0,.012,.012,10.5,mat('#111a27'));
for(let z=-4.7;z<5;z+=1.05) box('wall batten',-4.84,2.5,z,.08,4.7,.06,darkWood);
for(let z=-4.7;z<5;z+=1.05) box('wall batten',4.84,2.5,z,.08,4.7,.06,darkWood);
// Back acoustic panels
for(let x=-4.2;x<=2.8;x+=1.4){ box('acoustic panel',x,2.3,-5.34,1.03,2.05,.09,mat('#202734')); for(let k=0;k<5;k++) box('panel groove',x-.38+k*.19,2.3,-5.275,.018,1.85,.012,mat('#364153')); }
box('cyan wall strip',0,4.18,-5.28,8.1,.035,.045,cyan);box('magenta wall strip',-4.82,3.72,0,.04,.035,9.2,magenta);
box('cyan floor marker',0,.015,-4.95,8,.018,.06,cyan);
box('room sign backing',-3.35,3.45,-5.3,2.75,1.02,.08,black);addRoomSign('MUSIC ROOM','01 / TURNTABLE + TAPE','#20dfff',-3.35,3.45,-5.24);
buildDoorway(-5.5,0);
// A compact record rack replaces the old film projection setup.
box('record rack top',2.15,.54,-4.72,2.35,.12,.68,wood);box('record rack base',2.15,.11,-4.72,2.35,.12,.68,darkWood);
for(const x of [.99,3.31])box('record rack side',x,.33,-4.72,.09,.38,.62,darkWood);
const sleeveColors=['#9b6048','#345f68','#956a96','#c18a54','#50775f','#7c5361'];
for(let i=0;i<sleeveColors.length;i++){box('album sleeve',1.22+i*.34,.91,-4.77,.29,.65,.035,mat(sleeveColors[i],.72));box('album sleeve label',1.22+i*.34,.92,-4.748,.17,.24,.012,mat(i%2?'#e1c99b':'#d7d8cd'));}

// Desk, drawer, desk lamp, mixer and turntable.
box('desk top',-1.6,1.15,-2.1,4.1,.18,1.45,wood);box('desk front',-1.6,.76,-1.5,3.8,.68,.12,darkWood);
for(const x of [-3,-.2,.3])for(const z of [-2.62,-1.58])box('desk leg',x,.53,z,.14,1.05,.14,darkWood);
const drawer=box('drawer base',-1.6,.735,-1.73,1.02,.055,.78,mat('#171b24'),true);const drawerFace=box('jammed drawer',-1.6,.92,-1.325,.98,.29,.025,darkWood,true);const drawerPull=box('drawer pull',-1.6,.92,-1.28,.17,.035,.055,brass);
const drawerSideA=box('drawer side',-2.09,.83,-1.73,.045,.22,.78,wood),drawerSideB=box('drawer side',-1.11,.83,-1.73,.045,.22,.78,wood);
const drawerKey=box('drawer key',-1.6,.79,-2.00,.38,.035,.045,mat('#f0bd62',.25,.72),true);drawerKey.visible=false;const keyHead=new THREE.Mesh(new THREE.TorusGeometry(.105,.026,10,24),mat('#ffe18a',.22,.7));keyHead.position.set(-1.78,.79,-2.00);keyHead.visible=false;scene.add(keyHead);
const keyToothA=box('key teeth',-1.43,.79,-2.00,.045,.12,.045,mat('#e7ad4d',.25,.72));const keyToothB=box('key teeth two',-1.36,.79,-2.00,.045,.09,.045,mat('#e7ad4d',.25,.72));keyToothA.visible=false;keyToothB.visible=false;
const keyMarker=makePickupMarker('TAKE KEY','#ffd36d');keyMarker.position.set(-1.6,1.16,-1.92);const keyGlow=new THREE.PointLight('#ffc64e',0,1.8,2);keyGlow.position.set(-1.6,1.02,-1.95);scene.add(keyGlow);
// Mixer panel with tactile faders
box('mixing console',-2.15,1.28,-2.12,1.2,.12,.82,black,true);
for(let c=0;c<3;c++){box('channel strip',-2.55+c*.4,1.35,-2.12,.31,.025,.65,mat('#242729'));for(let n=0;n<3;n++){const knobMesh=new THREE.Mesh(new THREE.CylinderGeometry(.055,.055,.035,16),brass);knobMesh.rotation.x=Math.PI/2;knobMesh.position.set(-2.55+c*.4,1.38,-2.31+n*.17);scene.add(knobMesh)}box('fader slot',-2.55+c*.4,1.38,-1.94,.025,.014,.22,mat('#111'));box('fader cap',-2.55+c*.4,1.4,-2.0,.1,.045,.065,cream)}
// Turntable platter, record and arm
const turntable=box('turntable',-.55,1.29,-2.13,2,.12,1.45,mat('#262523'),true);
const platter=new THREE.Mesh(new THREE.CylinderGeometry(.48,.48,.055,48),mat('#77716a',.3,.5));platter.position.set(-.55,1.38,-2.13);scene.add(platter);
const recordGroup=new THREE.Group();recordGroup.position.set(-.55,0,-2.13);recordGroup.visible=false;scene.add(recordGroup);
const record=new THREE.Mesh(new THREE.CylinderGeometry(.42,.42,.018,48),mat('#11151d',.32,.25));record.position.set(0,1.42,0);recordGroup.add(record);
const labelArt=document.createElement('canvas');labelArt.width=labelArt.height=256;const labelCtx=labelArt.getContext('2d');labelCtx.fillStyle='#1de1ff';labelCtx.beginPath();labelCtx.arc(128,128,122,0,Math.PI*2);labelCtx.fill();labelCtx.fillStyle='#f235ff';labelCtx.beginPath();labelCtx.moveTo(128,18);labelCtx.lineTo(164,82);labelCtx.lineTo(128,74);labelCtx.fill();labelCtx.fillStyle='#08121f';labelCtx.font='bold 92px monospace';labelCtx.textAlign='center';labelCtx.textBaseline='middle';labelCtx.fillText('A',128,146);const labelTexture=new THREE.CanvasTexture(labelArt);labelTexture.colorSpace=THREE.SRGBColorSpace;
const label=new THREE.Mesh(new THREE.CircleGeometry(.105,24),new THREE.MeshStandardMaterial({map:labelTexture,roughness:.5}));label.rotation.x=-Math.PI/2;label.position.set(0,1.433,0);recordGroup.add(label);
const reverseSwitch=new THREE.Mesh(new THREE.CylinderGeometry(.065,.075,.09,20),magenta);reverseSwitch.name='reverse switch';reverseSwitch.position.set(.02,1.39,-1.92);scene.add(reverseSwitch);interactables.push(reverseSwitch);
const reverseLamp=new THREE.Mesh(new THREE.SphereGeometry(.045,16,12),cyan);reverseLamp.name='reverse lamp';reverseLamp.position.set(.3,1.39,-1.92);scene.add(reverseLamp);
// Keyed wall safe. Its vinyl is only exposed once the door swings open.
box('safe interior back',4.31,1.55,-2.8,.1,1.48,1.2,mat('#101a28',.55,.58));
box('safe shell top',3.88,2.29,-2.8,.9,.1,1.2,mat('#34475b',.32,.62));box('safe shell bottom',3.88,.81,-2.8,.9,.1,1.2,mat('#34475b',.32,.62));
box('safe shell side one',3.88,1.55,-3.37,.9,1.38,.08,mat('#34475b',.32,.62));box('safe shell side two',3.88,1.55,-2.23,.9,1.38,.08,mat('#34475b',.32,.62));
const safePivot=new THREE.Group();safePivot.position.set(3.39,0,-3.315);scene.add(safePivot);
const safeDoor=new THREE.Mesh(new THREE.BoxGeometry(.09,1.27,1.03),mat('#182433',.25,.72));safeDoor.name='safe door';safeDoor.position.set(0,1.55,.515);safeDoor.castShadow=true;safeDoor.receiveShadow=true;safePivot.add(safeDoor);interactables.push(safeDoor);
box('safe frame upper',3.31,2.25,-2.8,.055,.07,1.17,cyan);box('safe frame lower',3.31,.85,-2.8,.055,.07,1.17,cyan);box('safe frame left',3.31,1.55,-3.35,.055,1.45,.07,cyan);box('safe frame right',3.31,1.55,-2.25,.055,1.45,.07,cyan);
const safeDial=new THREE.Mesh(new THREE.TorusGeometry(.17,.025,10,28),brass);safeDial.rotation.y=-Math.PI/2;safeDial.position.set(-.07,0,0);safeDoor.add(safeDial);
const safeHandle=new THREE.Mesh(new THREE.CylinderGeometry(.035,.035,.32,12),brass);safeHandle.rotation.z=Math.PI/2;safeHandle.position.set(-.09,0,.32);safeDoor.add(safeHandle);
const vinylItem=new THREE.Mesh(new THREE.CylinderGeometry(.4,.4,.035,64),mat('#141923',.2,.42));vinylItem.rotation.z=Math.PI/2;vinylItem.position.set(3.73,1.56,-2.8);vinylItem.visible=false;vinylItem.name='safe vinyl';interactables.push(vinylItem);
const vinylLabel=new THREE.Mesh(new THREE.CircleGeometry(.13,32),mat('#ff66da',.24,.35));vinylLabel.rotation.y=-Math.PI/2;vinylLabel.position.set(3.695,1.56,-2.8);vinylLabel.visible=false;scene.add(vinylLabel);
const vinylGroove=new THREE.Mesh(new THREE.TorusGeometry(.27,.008,6,48),cyan);vinylGroove.rotation.y=-Math.PI/2;vinylGroove.position.set(3.69,1.56,-2.8);vinylGroove.visible=false;scene.add(vinylGroove);
const vinylMarker=makePickupMarker('TAKE VINYL','#ff68d7');vinylMarker.position.set(3.72,2.18,-2.8);const vinylGlow=new THREE.PointLight('#ec54ff',0,2.2,2);vinylGlow.position.set(3.5,1.8,-2.8);scene.add(vinylGlow);
const spindle=new THREE.Mesh(new THREE.CylinderGeometry(.02,.02,.06,12),brass);spindle.position.set(-.55,1.45,-2.13);scene.add(spindle);
const armBase=new THREE.Mesh(new THREE.CylinderGeometry(.075,.09,.1,20),brass);armBase.position.set(-.05,1.42,-2.45);scene.add(armBase);
const arm=new THREE.Group();arm.position.set(-.05,1.61,-2.45);arm.rotation.y=-.27;scene.add(arm);const armRod=new THREE.Mesh(new THREE.CylinderGeometry(.022,.03,.65,12),brass);armRod.rotation.z=Math.PI/2;armRod.position.x=-.24;arm.add(armRod);
// Desk lamp
const lampStem=new THREE.Mesh(new THREE.CylinderGeometry(.025,.04,.55,12),brass);lampStem.position.set(-2.85,1.52,-2.25);scene.add(lampStem);
const shade=new THREE.Mesh(new THREE.ConeGeometry(.23,.24,24,1,true),mat('#88704f',.46,.35));shade.position.set(-2.85,1.85,-2.25);shade.rotation.x=Math.PI;scene.add(shade);
const deskLight=new THREE.PointLight('#f0bc7b',7,3,2);deskLight.position.set(-2.85,1.7,-2.25);scene.add(deskLight);

// Low lounge seat keeps the center aisle open.
box('studio lounge seat',-3.65,.48,.15,1.1,.2,.76,mat('#39434b'));box('studio lounge back',-3.65,.94,-.19,1.1,.78,.16,mat('#303b45'));
for(const x of [-4.1,-3.2])for(const z of [-.12,.42])box('lounge leg',x,.2,z,.055,.4,.055,darkWood);

// Room shell and puzzle scenery are shared; each room module supplies local accents.
function buildConnectedRoom(index){
  const centerZ=ROOMS[index].startZ-5.5, backZ=centerZ-5.5, room=ROOMS[index];
  box('room floor',0,-.12,centerZ,10,.24,11,mat(room.accent==='#ff9d45'?'#32232a':index===1?'#132432':index===2?'#211a2c':'#172832',.64,.32));
  box('room ceiling',0,5,centerZ,10,.2,11,mat('#111722'));
  box('room left wall',-5,2.5,centerZ,.25,5,11,mat(index===1?'#1c3546':index===2?'#33263d':'#382d32'));
  box('room right wall',5,2.5,centerZ,.25,5,11,mat(index===1?'#263449':index===2?'#3a2942':'#3b3032'));
  for(let x=-4.6;x<=4.6;x+=.9)box('neon floor seam',x,.012,centerZ,.012,.012,10.7,mat('#27364a'));
  box('room cyan sign',-1.8,3.85,backZ+.16,2.7,.09,.08,cyan);
  box('room magenta sign',1.6,3.62,backZ+.16,2.2,.08,.08,magenta);
  box('room cyan side strip',-4.82,3.9,centerZ,.04,.04,9.5,cyan);
  box('room pink side strip',4.82,2.8,centerZ,.04,.04,9.5,magenta);
  const glow=new THREE.PointLight(room.accent,42,15,2);glow.position.set(0,3.6,centerZ);scene.add(glow);
  const fill=new THREE.PointLight(index===1?'#399dff':index===3?'#ffb84d':'#ff9c53',22,12,2);fill.position.set(index===1?3:-3,2.7,centerZ-2);scene.add(fill);
  box('room sign backing',-3.35,3.45,backZ+.16,2.75,1.02,.08,black);
  addRoomSign(room.title,room.detail,room.accent,-3.35,3.45,backZ+.21);
  // A raised equipment plinth gives each room a distinct silhouette and purpose.
  box(index===1?'signal console':index===2?'easel work plinth':'room plinth',-1.15,.55,centerZ-1.1,3.1,1.05,1.35,mat(index===1?'#182735':index===2?'#33272d':'#261a31',.38,.58));
  box('plinth cyan edge',-1.15,1.1,centerZ-1.1,3.15,.035,1.4,cyan);
  box('equipment display',-1.15,1.35,centerZ-1.5,2.3,.38,.08,mat('#172431',.22,.45));
  for(let i=0;i<5;i++)box('status light',-2+i*.42,1.38,centerZ-1.44,.12,.035,.02,i%2?magenta:cyan);
  if(index===1){
    // A blackout development booth hides a camera until its work light is raised.
    const blackout=new THREE.MeshBasicMaterial({color:'#010207'});
    box('darkroom left',-3.15,1.95,centerZ-1.15,.18,3.9,6.1,blackout);
    box('darkroom right',-.05,1.95,centerZ-1.15,.18,3.9,6.1,blackout);
    box('darkroom ceiling',-1.6,3.92,centerZ-1.15,3.25,.14,6.1,blackout);
    box('darkroom curtain left',-2.65,1.95,centerZ+1.9,1,3.9,.12,mat('#080b13'));box('darkroom curtain right',-.55,1.95,centerZ+1.9,1,3.9,.12,mat('#080b13'));
    box('darkroom threshold',-1.6,.035,centerZ+1.65,3.05,.06,.14,magenta);
    const switchMesh=box('brightness switch',1.05,1.2,centerZ+1.6,.38,.62,.18,mat('#202837',.3,.55),true);
    box('brightness switch lamp',1.05,1.35,centerZ+1.48,.12,.12,.04,magenta);
    photoLight=new THREE.PointLight('#f6dbb0',0,8,1.5);photoLight.position.set(-1.6,3.5,centerZ-1.2);scene.add(photoLight);
    photoFillLight=new THREE.PointLight('#3adfff',0,6,2);photoFillLight.position.set(-1.6,1.1,centerZ-1.3);scene.add(photoFillLight);
    photoCamera= new THREE.Group();photoCamera.position.set(-1.6,1.45,centerZ-.1);photoCamera.visible=false;scene.add(photoCamera);
    const body=new THREE.Mesh(new THREE.BoxGeometry(.85,.54,.43),mat('#b56d3e',.3,.62));body.name='photo camera';body.visible=false;photoCameraBody=body;photoCamera.add(body);interactables.push(body);
    const cameraLens=new THREE.Mesh(new THREE.CylinderGeometry(.2,.24,.36,24),mat('#171b20',.16,.62));cameraLens.rotation.x=Math.PI/2;cameraLens.position.set(0,0,.34);photoCamera.add(cameraLens);
    const lensGlass=new THREE.Mesh(new THREE.CircleGeometry(.15,24),new THREE.MeshStandardMaterial({color:'#20dfff',emissive:'#1297bd',emissiveIntensity:1.8}));lensGlass.position.set(0,0,.53);photoCamera.add(lensGlass);
    box('camera stand',-1.6,.97,centerZ-.1,.12,.62,.12,brass);
    box('camera workbench',-1.6,.64,centerZ-.1,1.8,.16,1.05,wood);
    photoCameraMarker=makePickupMarker('TAKE CAMERA','#ffd36d');photoCameraMarker.position.set(-1.6,2.05,centerZ-.1);
    const drawPoster=(targetName,rows,y,z,interactable=false)=>{box(targetName,4.76,y,z,.06,1.85,1.7,mat('#171827'),interactable);const art=document.createElement('canvas');art.width=512;art.height=640;const ctx=art.getContext('2d');ctx.fillStyle='#171a20';ctx.fillRect(0,0,512,640);ctx.strokeStyle=targetName==='order poster'?'#7b9b9c':'#806b7f';ctx.lineWidth=5;ctx.strokeRect(9,9,494,622);ctx.fillStyle='#c9c4ba';ctx.font='34px monospace';rows.forEach((row,i)=>ctx.fillText(row,34,72+i*68));const tex=new THREE.CanvasTexture(art);tex.colorSpace=THREE.SRGBColorSpace;const panel=new THREE.Mesh(new THREE.PlaneGeometry(1.58,1.78),new THREE.MeshBasicMaterial({map:tex,side:THREE.DoubleSide}));panel.rotation.y=-Math.PI/2;panel.position.set(4.72,y,z);scene.add(panel);};
    const code=cp=>String.fromCharCode(cp);
    drawPoster('translation poster',photoTranslationEntries.map(entry=>`${code(entry.glyph)}   ${entry.letter}`),2.9,centerZ-2.05,false);
    drawPoster('order poster',photoFilterOrder.map((filter,i)=>`${filter}    ${code(photoGlyphCodes[i])}`),2.9,centerZ-4.15,false);
    const makePainting=(symbol,version)=>{const art=document.createElement('canvas');art.width=900;art.height=640;const ctx=art.getContext('2d');const palettes=[['#182b3d','#c87958','#f0b86f'],['#202137','#8378a8','#d3a96b'],['#18343a','#51a8a3','#d98e62'],['#36243c','#dc75a4','#deb774'],['#253448','#71a6be','#e6cb91']];const [sky,accent,light]=palettes[version];const g=ctx.createLinearGradient(0,0,0,640);g.addColorStop(0,sky);g.addColorStop(1,'#211f27');ctx.fillStyle=g;ctx.fillRect(0,0,900,640);ctx.fillStyle=light;ctx.globalAlpha=.8;ctx.beginPath();ctx.arc(690-version*31,145+version*13,65,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
      ctx.fillStyle='#171d25';for(let i=0;i<10;i++){const x=i*96-20,h=100+(i*71+version*53)%220;ctx.fillRect(x,340-h,72,h);ctx.fillStyle=accent;for(let row=0;row<4;row++)ctx.fillRect(x+12+(row%2)*24,355-h+row*28,8,12);ctx.fillStyle='#171d25';}
      ctx.strokeStyle=accent;ctx.lineWidth=23;ctx.beginPath();ctx.moveTo(118,480);ctx.lineTo(118,230);ctx.quadraticCurveTo(118,96,285,96);ctx.quadraticCurveTo(450,96,450,230);ctx.lineTo(450,480);ctx.stroke();ctx.fillStyle='rgba(10,16,24,.68)';ctx.fillRect(145,245,280,235);
      ctx.strokeStyle=light;ctx.lineWidth=5;for(let k=0;k<12;k++){ctx.beginPath();ctx.moveTo(0,500+k*10);ctx.lineTo(900,480+k*11);ctx.stroke();}
      ctx.fillStyle=accent;ctx.beginPath();ctx.ellipse(505,535,245,48,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#11151c';ctx.fillRect(275,522,470,100);
      ctx.fillStyle=light;ctx.beginPath();ctx.arc(505,500,54,Math.PI,0);ctx.lineTo(559,535);ctx.lineTo(451,535);ctx.closePath();ctx.fill();ctx.fillStyle=sky;ctx.fillRect(495,485,20,50);
      for(let n=0;n<90;n++){const x=(n*137+version*43)%900,y=(n*83+version*29)%640;ctx.fillStyle=n%3?`${accent}55`:`${light}66`;ctx.fillRect(x,y,2+(n%4),2);}
      if(symbol){ctx.font='bold 80px Georgia';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=['#d7c9a8','#d5c5dc','#b6d2c3','#e7c2ca','#c0d0da'][version];const spots=[[265,350],[575,300],[490,445],[700,350],[205,245]];ctx.fillText(String.fromCharCode(symbol),spots[version][0],spots[version][1]);}
      const tex=new THREE.CanvasTexture(art);tex.colorSpace=THREE.SRGBColorSpace;return tex;};
    photoBaseTexture=makePainting(null,0);photoPaintingTextures=photoFilterGlyphs.map((glyph,i)=>makePainting(glyph,i));
    box('large painting frame',-1.6,2.35,backZ+.14,4.55,3.25,.16,brass);
    photoPaintingMaterial=new THREE.MeshBasicMaterial({map:photoBaseTexture,side:THREE.DoubleSide});
    const painting=new THREE.Mesh(new THREE.PlaneGeometry(4.35,3.05),photoPaintingMaterial);painting.position.set(-1.6,2.35,backZ+.235);painting.name='photo painting';scene.add(painting);interactables.push(painting);
  } else if(index===2) {
    // Room 03's art zone is built by src/rooms/room-03.js.
  }
}
buildConnectedRoom(1);buildConnectedRoom(2);
ROOMS.forEach(room=>room.build({THREE,scene,mat,interactables,canvas}));
buildDoorway(-16.5,1);
box('art studio back wall left',-2.95,2.5,-27.5,4.1,5,.25,wall);box('art studio back wall right',2.95,2.5,-27.5,4.1,5,.25,wall);box('art studio back wall lintel',0,4.15,-27.5,1.8,1.7,.25,wall);
const solidBounds=[];
scene.updateMatrixWorld(true);
scene.traverse(object=>{
  if(!object.isMesh||!object.geometry||/door|exit/.test(object.name.toLowerCase()))return;
  for(let parent=object;parent;parent=parent.parent)if(!parent.visible)return;
  object.geometry.computeBoundingBox();
  const bounds=object.geometry.boundingBox.clone().applyMatrix4(object.matrixWorld);
  const width=bounds.max.x-bounds.min.x,depth=bounds.max.z-bounds.min.z,height=bounds.max.y-bounds.min.y;
  if(bounds.min.y>1.72||bounds.max.y<.22||width<.12||depth<.12||height<.16)return;
  // Skip paper thin overlays, effects, and other surfaces that should never stop the player.
  if((width<.055&&depth<.055)||(height<.045&&width>1))return;
  solidBounds.push({minX:bounds.min.x,maxX:bounds.max.x,minZ:bounds.min.z,maxZ:bounds.max.z});
});
// Dust motes
const dustGeo=new THREE.BufferGeometry(), dustCount=240, dustPos=new Float32Array(dustCount*3);
for(let i=0;i<dustCount;i++){dustPos[i*3]=(Math.random()-.5)*8;dustPos[i*3+1]=Math.random()*4;dustPos[i*3+2]=(Math.random()-.5)*9-1}
dustGeo.setAttribute('position',new THREE.BufferAttribute(dustPos,3));const dust=new THREE.Points(dustGeo,new THREE.PointsMaterial({color:'#d9bd8e',size:.018,transparent:true,opacity:.38}));scene.add(dust);

// First-person look and movement, with a soft body-size boundary around the set.
let yaw=0,pitch=0,locked=false,started=false,playing=false,drawerOpen=false,hasKey=false,safeOpen=false,hasVinyl=false,vinylPlaced=false,reversePlayback=false,codeRevealed=false,doorPuzzleUnlocked=false,roomIndex=0,recordSpinSpeed=0;
const keys=new Set(), raycaster=new THREE.Raycaster();
const startScreen=document.querySelector('#start-screen'), prompt=document.querySelector('#interaction'), promptLabel=document.querySelector('#interaction-label'), toast=document.querySelector('#toast');
const objective=document.querySelector('#objective-text'),progressCount=document.querySelector('#progress-count'),progressFill=document.querySelector('#progress-fill'),recordLabel=document.querySelector('#record-label');
function showToast(message){toast.textContent=message;toast.classList.add('visible');clearTimeout(showToast.timer);showToast.timer=setTimeout(()=>toast.classList.remove('visible'),2300)}
const roomTitles=ROOMS.map(room=>room.title);
function setRoomLabel(){const number=`ROOM ${String(roomIndex+1).padStart(2,'0')}`;document.querySelector('#room-number').textContent=number;document.querySelector('#room-title').textContent=roomTitles[roomIndex]||'UNMAPPED ROOM';document.querySelector('#room-marker-name').textContent=roomTitles[roomIndex];document.querySelector('#room-marker-detail').textContent=ROOMS[roomIndex].detail;for(let i=0;i<ROOMS.length;i++){const node=document.querySelector(`#route-node-${i}`);node.classList.toggle('active',i===roomIndex);node.classList.toggle('visited',i<roomIndex);}}
function updateProgress(){progressCount.textContent=`${String(roomIndex+1).padStart(2,'0')} / 03`;progressFill.style.width=`${((roomIndex+1)/3)*100}%`;if(roomIndex===2){objective.textContent='Reconcile the three fragments on the canvas to open the exit.';return}if(roomIndex===1){objective.textContent=!photoBright?'Raise the darkroom brightness switch.':!cameraMode?'Pick up the revealed camera.':photoFound.size<5?`Use filters to find paintings (${photoFound.size}/5).`:!photoWordUnlocked?'Enter the five-letter word at the exit lock.':'Walk through the unlocked door to Room 03.';return}objective.textContent=!drawerOpen?'Open the desk drawer and look inside.':!hasKey?'Take the brass key from the drawer.':!safeOpen?'Use the key on the wall safe.':!(hasVinyl||vinylPlaced)?'Collect the vinyl from the safe.':!vinylPlaced?'Place the vinyl on the turntable.':!codeRevealed?'Play the track in reverse to reveal the code.':!doorPuzzleUnlocked?'Enter 6767 on the door keypad.':'Walk through the unlocked cyan door.';}
function openDoor(door){if(door.boundary===-5.5&&!doorPuzzleUnlocked){showToast('The exit is locked. Find the vinyl code and enter it at the keypad.');return}if(door.boundary===-16.5&&!photoWordUnlocked){showToast('Record all five painting details, then enter FOCUS at the lock.');return}if(!door.isOpen){door.isOpen=true;door.targetAngle=-Math.PI/2;showToast('Door swung open. Walk through it.');}else showToast('Door is open. Walk through.');}
function syncRoomIndex(){const next=camera.position.z>-5.5?0:camera.position.z>-16.5?1:2;if(next!==roomIndex){roomIndex=next;setRoomLabel();updateProgress();showToast(`Entered ${roomTitles[roomIndex]}.`);}}
function begin(){started=true;startScreen.classList.add('hidden');startAmbient();canvas.requestPointerLock?.()}
document.querySelector('#start-button').addEventListener('click',begin);
document.addEventListener('pointerlockchange',()=>{locked=document.pointerLockElement===canvas});
document.addEventListener('mousemove',e=>{if(!locked)return;yaw-=e.movementX*.0022;pitch-=e.movementY*.0019;pitch=THREE.MathUtils.clamp(pitch,-1.1,1.1)});
const keypadOverlay=document.querySelector('#keypad-overlay'),keypadInput=document.querySelector('#keypad-input'),keypadHint=document.querySelector('#keypad-hint');
function openKeypad(){keypadInput.value='';keypadHint.textContent=codeRevealed?'The reversed groove reads 6767. Enter the signal.':'The display is blank. The record player may reveal the signal.';keypadOverlay.hidden=false;document.exitPointerLock?.();}
function closeKeypad(){keypadOverlay.hidden=true;if(started)canvas.requestPointerLock?.();}
function submitKeypad(){ROOMS[0].submitCode({getState:()=>({codeRevealed}),value:keypadInput.value,setHint:text=>{keypadHint.textContent=text},unlockDoor:()=>{doorPuzzleUnlocked=true;keypadOverlay.hidden=true;openDoor(roomDoorObjects[0]);canvas.requestPointerLock?.()},update:updateProgress,showToast});}
keypadOverlay.addEventListener('click',e=>{const key=e.target.closest('[data-key]');if(!key)return;if(key.dataset.key==='clear')keypadInput.value='';else if(key.dataset.key==='back')keypadInput.value=keypadInput.value.slice(0,-1);else if(keypadInput.value.length<4)keypadInput.value+=key.dataset.key;});
document.querySelector('#keypad-submit').addEventListener('click',submitKeypad);document.querySelector('#keypad-close').addEventListener('click',closeKeypad);
const photoHud=document.querySelector('#photo-hud'),translationOverlay=document.querySelector('#translation-overlay'),translationGrid=document.querySelector('#translation-grid'),orderOverlay=document.querySelector('#order-overlay'),orderSequence=document.querySelector('#order-sequence'),wordlockOverlay=document.querySelector('#wordlock-overlay'),wordlockInput=document.querySelector('#wordlock-input'),wordlockHint=document.querySelector('#wordlock-hint');
const setFilter=n=>{activeFilter=n;const names=['INFRARED','NEGATIVE','ULTRAVIOLET','CYANOGRAPH','AMBER'];document.querySelector('#photo-filter-name').textContent=names[n];photoHud.querySelectorAll('[data-filter]').forEach(b=>b.classList.toggle('active',Number(b.dataset.filter)===n));const game=document.querySelector('#game');game.classList.remove('filter-infrared','filter-negative','filter-uv','filter-cyan','filter-amber');game.classList.add(['filter-infrared','filter-negative','filter-uv','filter-cyan','filter-amber'][n]);if(photoPaintingMaterial){photoPaintingMaterial.map=cameraMode?photoPaintingTextures[n]:photoBaseTexture;photoPaintingMaterial.needsUpdate=true;}};
const restoreLook=()=>{if(started)canvas.requestPointerLock?.()};
const closeOverlay=o=>{o.hidden=true;restoreLook()};
document.querySelector('#translation-close').addEventListener('click',()=>closeOverlay(translationOverlay));document.querySelector('#order-close').addEventListener('click',()=>closeOverlay(orderOverlay));document.querySelector('#wordlock-close').addEventListener('click',()=>closeOverlay(wordlockOverlay));
document.addEventListener('keydown',e=>{if(!translationOverlay.hidden||!orderOverlay.hidden){if(e.code==='Escape'){translationOverlay.hidden=true;orderOverlay.hidden=true;restoreLook()}e.preventDefault();e.stopImmediatePropagation();}});
photoHud.addEventListener('click',e=>{const b=e.target.closest('[data-filter]');if(b)setFilter(Number(b.dataset.filter));});
const submitWord=()=>ROOMS[1].submitWord({getState:()=>({photoFound,translationRead,orderRead}),value:wordlockInput.value,setHint:text=>{wordlockHint.textContent=text},patchState:patch=>{if('photoWordUnlocked'in patch)photoWordUnlocked=patch.photoWordUnlocked},unlockDoor:()=>{wordlockOverlay.hidden=true;const d=roomDoorObjects.find(x=>x.boundary===-16.5);openDoor(d)},update:updateProgress,showToast,restoreLook});
wordlockOverlay.addEventListener('click',e=>{const b=e.target.closest('[data-letter]');if(!b)return;const v=b.dataset.letter;if(v==='clear')wordlockInput.value='';else if(v==='back')wordlockInput.value=wordlockInput.value.slice(0,-1);else if(wordlockInput.value.length<5)wordlockInput.value+=v;});document.querySelector('#wordlock-submit').addEventListener('click',submitWord);
document.addEventListener('keydown',e=>{if(!wordlockOverlay.hidden){if(/^(KeyF|KeyO|KeyC|KeyU|KeyS)$/.test(e.code)&&wordlockInput.value.length<5)wordlockInput.value+=e.key.toUpperCase();else if(e.code==='Backspace')wordlockInput.value=wordlockInput.value.slice(0,-1);else if(e.code==='Enter')submitWord();else if(e.code==='Escape')closeOverlay(wordlockOverlay);e.preventDefault();return}if(!keypadOverlay.hidden){if(/^Digit[0-9]$/.test(e.code)&&keypadInput.value.length<4)keypadInput.value+=e.key;else if(e.code==='Backspace')keypadInput.value=keypadInput.value.slice(0,-1);else if(e.code==='Enter')submitKeypad();else if(e.code==='Escape')closeKeypad();e.preventDefault();return}if(cameraMode&&/^Digit[1-5]$/.test(e.code))setFilter(Number(e.code.slice(-1))-1);if(e.code==='KeyQ'&&cameraMode){cameraMode=false;photoHud.hidden=true;document.querySelector('#game').classList.remove('photo-lens-mode','filter-infrared','filter-negative','filter-uv','filter-cyan','filter-amber');setFilter(activeFilter);showToast('Camera stowed.')}keys.add(e.code);if(e.code==='Escape'&&started&&!locked)canvas.requestPointerLock?.();if(e.code==='KeyE')interact()});document.addEventListener('keyup',e=>keys.delete(e.code));
canvas.addEventListener('click',()=>{if(started&&!locked)canvas.requestPointerLock?.()});
const soundButton=document.querySelector('#sound-toggle');let soundOn=true;
soundButton.addEventListener('click',()=>{soundOn=!soundOn;document.querySelector('#sound-label').textContent=soundOn?'SOUND ON':'SOUND OFF';if(!soundOn){stopTone();stopAmbient()}else{startAmbient();if(playing)startTone()}});
let audioContext=null,audioSource=null,audioGain=null,ambientSource=null;
function startAmbient(){if(!soundOn||ambientSource)return;try{audioContext??=new(window.AudioContext||window.webkitAudioContext)();audioContext.resume();const rate=audioContext.sampleRate,bpm=72,beat=60/bpm,length=Math.round(rate*beat*16),buffer=audioContext.createBuffer(1,length,rate),samples=buffer.getChannelData(0),chords=[[220,261.63,329.63,392],[196,246.94,293.66,369.99],[174.61,220,261.63,349.23],[196,246.94,293.66,349.23]],roots=[55,49,43.65,49];let seed=23;const noise=()=>{seed=(seed*16807)%2147483647;return seed/2147483647*2-1};for(let i=0;i<length;i++){const t=i/rate,beatAt=t/beat,bar=Math.floor(beatAt/4)%4,beatPhase=beatAt%1,eighthPhase=(beatAt*2)%1,chord=chords[bar];let value=0;const pluck=Math.exp(-eighthPhase*8)*(eighthPhase<.45?1:0);for(let n=0;n<chord.length;n++){const f=chord[n],phase=(t+(n%2)*.007)%4;value+=pluck*(Math.sin(2*Math.PI*f*phase)+.19*Math.sin(4*Math.PI*f*phase)+.045*Math.sin(6*Math.PI*f*phase))*(n===0?.075:.039)}const bassEnv=Math.min(1,beatPhase*18)*Math.exp(-beatPhase*2.2);value+=Math.sin(2*Math.PI*roots[bar]*t)*bassEnv*.1;const kickPhase=beatAt%1;if(kickPhase<.22){const e=Math.exp(-kickPhase*22);value+=Math.sin(2*Math.PI*(48+48*Math.exp(-kickPhase*18))*t)*e*.19}const beatInBar=Math.floor(beatAt)%4,snarePhase=(beatInBar===1||beatInBar===3)?beatPhase:1;if(snarePhase<.16){const e=Math.exp(-snarePhase*28);value+=noise()*e*.04+noise()*e*.018}const hatPhase=(beatAt*2)%1;if(hatPhase<.045)value+=noise()*.018*Math.exp(-hatPhase*65);value+=noise()*.002;const edge=Math.min(1,t/.025,(length/rate-t)/.025);samples[i]=value*Math.max(0,edge)}ambientSource=audioContext.createBufferSource();ambientSource.buffer=buffer;ambientSource.loop=true;const gain=audioContext.createGain();gain.gain.value=.5;const filter=audioContext.createBiquadFilter();filter.type='lowpass';filter.frequency.value=5200;ambientSource.connect(filter).connect(gain).connect(audioContext.destination);ambientSource.start()}catch{}}
function stopAmbient(){if(ambientSource){try{ambientSource.stop()}catch{}ambientSource.disconnect();ambientSource=null}}
function makeTrackBuffer(reverse){const rate=audioContext.sampleRate,length=rate*3,buffer=audioContext.createBuffer(1,length,rate),samples=buffer.getChannelData(0),notes=[55,65.4,73.4,82.4,73.4,65.4,55,82.4],step=3/notes.length;let peak=0;for(let i=0;i<length;i++){const time=i/rate,index=Math.floor(time/step),local=time%step,env=Math.min(1,local*16)*Math.min(1,(step-local)*9),f=notes[index];samples[i]=(.24*Math.sin(2*Math.PI*f*local)+.08*Math.sin(2*Math.PI*f*2*local)+.035*Math.sin(2*Math.PI*f*3*local))*env;peak=Math.max(peak,Math.abs(samples[i]));}const scale=.88/Math.max(peak,.001);for(let i=0;i<length;i++)samples[i]*=scale;if(reverse)samples.reverse();return buffer;}
function startTone(){if(!soundOn)return;try{audioContext??=new(window.AudioContext||window.webkitAudioContext)();audioContext.resume();stopTone();audioGain??=audioContext.createGain();audioGain.gain.value=.9;audioGain.connect(audioContext.destination);audioSource=audioContext.createBufferSource();audioSource.buffer=makeTrackBuffer(reversePlayback);audioSource.loop=true;audioSource.connect(audioGain);audioSource.start();}catch{}}
function stopTone(){if(audioSource){try{audioSource.stop()}catch{}audioSource.disconnect();audioSource=null;}}
function updateRecordLabel(){recordLabel.classList.toggle('visible',playing||codeRevealed);recordLabel.querySelector('span').textContent=codeRevealed?'REVERSE SIGNAL DECODED':reversePlayback?'REVERSE PLAYBACK':'FORWARD PLAYBACK';recordLabel.querySelector('strong').textContent=codeRevealed?'6767':reversePlayback?'REWIND':'—';}
function nearest(){camera.rotation.set(pitch,yaw,0,'YXZ');raycaster.setFromCamera(new THREE.Vector2(0,0),camera);if(safeOpen&&!hasVinyl){const toVinyl=vinylItem.position.clone().sub(camera.position),distance=toVinyl.length();if(distance<2.8&&raycaster.ray.direction.dot(toVinyl.normalize())>.72)return vinylItem;}const hits=raycaster.intersectObjects(interactables,false).filter(hit=>hit.object.visible&&!(safeOpen&&hit.object.name==='safe door'));return hits.length&&hits[0].distance<2.5?hits[0].object:null}
function interact(){
  const hit=nearest();if(!hit)return;
  const passage=roomDoorObjects.find(door=>door.mesh===hit);if(passage){openDoor(passage);return;}
  const getState=()=>({drawerOpen,hasKey,safeOpen,hasVinyl,vinylPlaced,playing,reversePlayback,codeRevealed,photoBright,cameraMode,activeFilter,photoFound,translationRead,orderRead,photoWordUnlocked});
  const patchState=patch=>{for(const[key,value]of Object.entries(patch))switch(key){case'drawerOpen':drawerOpen=value;break;case'hasKey':hasKey=value;break;case'safeOpen':safeOpen=value;break;case'hasVinyl':hasVinyl=value;break;case'vinylPlaced':vinylPlaced=value;break;case'playing':playing=value;break;case'reversePlayback':reversePlayback=value;break;case'codeRevealed':codeRevealed=value;break;case'doorPuzzleUnlocked':doorPuzzleUnlocked=value;break;case'photoBright':photoBright=value;break;case'cameraMode':cameraMode=value;break;case'translationRead':translationRead=value;break;case'orderRead':orderRead=value;break;case'photoWordUnlocked':photoWordUnlocked=value;break;}};
  const handled=ROOMS[roomIndex].interact?.(hit.name,{
    getState,patchState,showToast,update:updateProgress,openKeypad,startAudio:startTone,stopAudio:stopTone,updateRecordLabel,
    visual:{drawer,drawerFace,drawerKey,keyHead,keyToothA,keyToothB,keyMarker,keyGlow,safeDoor,safePivot,safeDial,vinylItem,vinylLabel,vinylGroove,vinylMarker,vinylGlow,record,recordGroup,label,reverseLamp,magenta,cyan,
      setBrightness:on=>{photoLight.intensity=on?18:0;photoFillLight.intensity=on?7:0;photoCamera.visible=on;photoCameraBody.visible=on;photoCameraMarker.visible=on;if(!on){photoHud.hidden=true;document.querySelector('#game').classList.remove('photo-lens-mode');setFilter(activeFilter)}},
      setCameraMode:on=>{photoHud.hidden=!on;document.querySelector('#game').classList.toggle('photo-lens-mode',on);if(on)setFilter(activeFilter)}},
    showTranslation:()=>{translationGrid.replaceChildren(...photoTranslationEntries.flatMap(({glyph,letter})=>{const symbol=document.createElement('span'),value=document.createElement('b');symbol.textContent=String.fromCharCode(glyph);value.textContent=letter;return [symbol,value]}));translationOverlay.hidden=false;document.exitPointerLock?.()},
    showOrder:()=>{orderSequence.textContent=photoFilterOrder.map((filter,i)=>`${filter}  ${String.fromCharCode(photoGlyphCodes[i])}`).join('     ');orderOverlay.hidden=false;document.exitPointerLock?.()},
    openWordlock:()=>ROOMS[1].openWordlock({getState,openOverlay:()=>{wordlockInput.value='';wordlockOverlay.hidden=false;document.exitPointerLock?.()},setHint:text=>{wordlockHint.textContent=text}}),
    updateSymbolCount:n=>{document.querySelector('#symbol-count').textContent=`${n} / 5 SYMBOLS`;}
  });
  if(handled){updateProgress();return;}
  if(!handled)showToast('A piece of the room.');
}
function tick(){
  requestAnimationFrame(tick);
  const dt=Math.min(clock.getDelta(),.04),previousZ=camera.position.z;
  camera.rotation.set(pitch,yaw,0,'YXZ');
  const forward=new THREE.Vector3(-Math.sin(yaw),0,-Math.cos(yaw)),right=new THREE.Vector3(Math.cos(yaw),0,-Math.sin(yaw));
  const move=new THREE.Vector3();
  if(keys.has('KeyW'))move.add(forward);if(keys.has('KeyS'))move.sub(forward);if(keys.has('KeyD'))move.add(right);if(keys.has('KeyA'))move.sub(right);
  if(move.lengthSq()){
    move.normalize().multiplyScalar(dt*(keys.has('ShiftLeft')?3.6:2.3));
    const blockedBySafe=(x,z)=>x>3.1&&x<4.7&&z>-3.68&&z<-1.92;
    const insideOpenDoorway=(x,z)=>roomDoorObjects.some(door=>door.isOpen&&Math.abs(x-door.openingX)<door.openingHalfWidth-.24&&Math.abs(z-door.boundary)<.4);
    const blockedByObject=(x,z)=>!insideOpenDoorway(x,z)&&solidBounds.some(bounds=>x>bounds.minX-.25&&x<bounds.maxX+.25&&z>bounds.minZ-.25&&z<bounds.maxZ+.25);
    const nextX=THREE.MathUtils.clamp(camera.position.x+move.x,-4.55,4.55);
    if(!blockedBySafe(nextX,camera.position.z)&&!blockedByObject(nextX,camera.position.z))camera.position.x=nextX;
    const nextZ=THREE.MathUtils.clamp(camera.position.z+move.z,-29,5.05);
    if(!blockedBySafe(camera.position.x,nextZ)&&!blockedByObject(camera.position.x,nextZ))camera.position.z=nextZ;
    for(const door of roomDoorObjects){
      const crossed=(previousZ>door.boundary&&camera.position.z<=door.boundary)||(previousZ<door.boundary&&camera.position.z>=door.boundary);
      if(crossed&&(!door.isOpen||Math.abs(camera.position.x-door.openingX)>door.openingHalfWidth-.24))camera.position.z=previousZ>door.boundary?door.boundary+.35:door.boundary-.35;
    }
    if(previousZ>=-27.5&&camera.position.z< -27.5){if(Math.abs(camera.position.x)>.68||!window.__reelRoom03ExitOpen){camera.position.z=-27.05;}else ROOMS[2].walkThroughExit?.();}
  }
  camera.position.y=1.62;syncRoomIndex();
  const target=nearest();prompt.classList.toggle('visible',!!target);
  if(target){const door=roomDoorObjects.find(item=>item.mesh===target);const names={'jammed drawer':drawerOpen?'TAKE KEY':'OPEN DRAWER','drawer key':'TAKE BRASS KEY','safe door':safeOpen?'SAFE OPEN':hasKey?'UNLOCK SAFE':'SAFE — KEY REQUIRED','safe vinyl':'TAKE VINYL','turntable':vinylPlaced?(playing?'STOP RECORD':'PLAY RECORD'):hasVinyl?'PLACE VINYL':'TURNTABLE — NO RECORD','reverse switch':`REVERSE: ${reversePlayback?'ON':'OFF'}`,'room keypad':'ENTER ACCESS CODE','mixing console':'INSPECT MIXER','brightness switch':photoBright?'SWITCH OFF WORK LIGHT':'RAISE WORK LIGHT','photo camera':'PICK UP CAMERA','word lock':'ENTER WORD','photo painting':'INSPECT PAINTING','framed canvas':'INSPECT STUDY','art studio exit':'CHECK EXIT'};promptLabel.textContent=door?(door.isOpen?'WALK THROUGH DOOR':camera.position.z>door.boundary?'E OPEN CYAN DOOR':'E OPEN MAGENTA RETURN'):(names[target.name]||'INSPECT');}
  const drawerPrev=drawer.position.z,drawerTarget=drawerOpen?-1.04:-1.73;drawer.position.z+=(drawerTarget-drawer.position.z)*(1-Math.exp(-dt*8));const drawerDelta=drawer.position.z-drawerPrev;
  drawerFace.position.z=drawer.position.z+.405;drawerPull.position.z=drawer.position.z+.45;drawerSideA.position.z=drawer.position.z;drawerSideB.position.z=drawer.position.z;
  for(const part of [drawerKey,keyHead,keyToothA,keyToothB,keyMarker,keyGlow])part.position.z+=drawerDelta;
  const animBlend=1-Math.exp(-dt*6);safePivot.rotation.y+=((safeOpen?-Math.PI/2:0)-safePivot.rotation.y)*animBlend;
  for(const door of roomDoorObjects)door.pivot.rotation.y+=(door.targetAngle-door.pivot.rotation.y)*animBlend;
  const wantedSpin=playing?3.49:0;recordSpinSpeed+=(wantedSpin-recordSpinSpeed)*animBlend;recordGroup.rotation.y+=dt*recordSpinSpeed;recordGroup.scale.lerp(new THREE.Vector3(1,1,1),animBlend);
  arm.position.y+=( (playing?1.48:1.61)-arm.position.y)*animBlend;
  if(keyMarker.visible)keyMarker.position.y=1.16+Math.sin(clock.elapsedTime*2.4)*.025;if(vinylMarker.visible)vinylMarker.position.y=2.18+Math.sin(clock.elapsedTime*2.1)*.045;dust.rotation.y+=dt*.008;renderer.render(scene,camera);
}
const clock=new THREE.Clock();tick();
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,1.75))});
updateProgress();
setRoomLabel();
