import * as THREE from 'three';

const canvas = document.querySelector('#scene');
const scene = new THREE.Scene();
scene.background = new THREE.Color('#090b0d');
scene.fog = new THREE.FogExp2('#090b0d', 0.055);
const camera = new THREE.PerspectiveCamera(65, innerWidth / innerHeight, 0.08, 60);
camera.position.set(0, 1.62, 5.6);
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
renderer.outputColorSpace = THREE.SRGBColorSpace;

scene.add(new THREE.HemisphereLight('#aab4c3', '#251914', 1.35));
const lamp = new THREE.PointLight('#e7a866', 34, 12, 2);
lamp.position.set(-1.3, 3.35, -1.7); lamp.castShadow = true; scene.add(lamp);
const redLamp = new THREE.PointLight('#a74732', 10, 8, 2);
redLamp.position.set(3.2, 2.7, -2); scene.add(redLamp);

const mat = (color, roughness=0.8, metalness=0) => new THREE.MeshStandardMaterial({ color, roughness, metalness });
const wood=mat('#493426'), darkWood=mat('#241d18'), wall=mat('#38332d'), plaster=mat('#716251'), brass=mat('#ad7946',.35,.72), black=mat('#101112',.45,.24), cream=mat('#c9bba2');
function box(name, x,y,z, sx,sy,sz, material, target=false) {
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(sx,sy,sz),material); mesh.name=name; mesh.position.set(x,y,z); mesh.castShadow=true; mesh.receiveShadow=true; scene.add(mesh); if(target) interactables.push(mesh); return mesh;
}
const interactables=[];

// A compact 1970s booth: warm practical light, dark walnut, dusty concrete, and a projector beam.
box('floor',0,-.12,0,10,.24,11,mat('#38302a'));
box('back wall',0,2.5,-5.5,10,5,.25,wall); box('left wall',-5,2.5,0,.25,5,11,wall); box('right wall',5,2.5,0,.25,5,11,wall);
box('ceiling',0,5,0,10,.2,11,mat('#211e1b'));
// Floor boards and wall battens make the geometry read as a real, lived-in room.
for(let i=-4;i<=4;i++) box('floor seam',i*.95,.008,0,.012,.012,10.5,mat('#211d19'));
for(let z=-4.7;z<5;z+=1.05) box('wall batten',-4.84,2.5,z,.08,4.7,.06,darkWood);
for(let z=-4.7;z<5;z+=1.05) box('wall batten',4.84,2.5,z,.08,4.7,.06,darkWood);
// Back acoustic panels
for(let x=-4.2;x<=4.2;x+=1.4){ box('acoustic panel',x,2.3,-5.34,1.03,2.05,.09,mat('#282727')); for(let k=0;k<5;k++) box('panel groove',x-.38+k*.19,2.3,-5.275,.018,1.85,.012,mat('#47403a')); }
// Projection window and door
box('booth window',0,2.5,-5.31,2.8,1.7,.04,black);
box('projection screen glow',0,2.5,-5.275,2.5,1.42,.015,mat('#9b7a51'));
const screenGlow=new THREE.PointLight('#ddb77f',7,5,2);screenGlow.position.set(0,2.7,-4.4);scene.add(screenGlow);
box('exit door',4.1,1.45,-5.31,1.45,2.9,.14,darkWood,true);box('door inset',4.1,1.5,-5.22,1.13,2.55,.035,wood);
for(const y of [.42,2.55]) box('door panel',4.1,y,-5.18,1.0,.7,.025,darkWood);
const knob=new THREE.Mesh(new THREE.SphereGeometry(.075,16,12),brass);knob.position.set(3.64,1.45,-5.08);scene.add(knob);

// Desk, drawer, desk lamp, mixer and turntable.
box('desk top',-1.6,1.15,-2.1,3.25,.18,1.45,wood);box('desk front',-1.6,.76,-1.5,3.05,.68,.12,darkWood);
for(const x of [-3,-.2])for(const z of [-2.62,-1.58])box('desk leg',x,.53,z,.14,1.05,.14,darkWood);
const drawer=box('jammed drawer',-1.6,.92,-1.41,1.08,.37,.13,wood,true);box('drawer face',-1.6,.92,-1.325,.98,.29,.025,darkWood);box('drawer pull',-1.6,.92,-1.28,.17,.035,.055,brass);
// Mixer panel with tactile faders
box('mixing console',-2.15,1.28,-2.12,1.2,.12,.82,black,true);
for(let c=0;c<3;c++){box('channel strip',-2.55+c*.4,1.35,-2.12,.31,.025,.65,mat('#242729'));for(let n=0;n<3;n++){const knobMesh=new THREE.Mesh(new THREE.CylinderGeometry(.055,.055,.035,16),brass);knobMesh.rotation.x=Math.PI/2;knobMesh.position.set(-2.55+c*.4,1.38,-2.31+n*.17);scene.add(knobMesh)}box('fader slot',-2.55+c*.4,1.38,-1.94,.025,.014,.22,mat('#111'));box('fader cap',-2.55+c*.4,1.4,-2.0,.1,.045,.065,cream)}
// Turntable platter, record and arm
box('turntable base',-1.05,1.29,-2.13,1.25,.12,.92,mat('#262523'));
const platter=new THREE.Mesh(new THREE.CylinderGeometry(.38,.38,.055,48),mat('#77716a',.3,.5));platter.position.set(-1.05,1.38,-2.13);scene.add(platter);
const record=new THREE.Mesh(new THREE.CylinderGeometry(.34,.34,.018,64),mat('#141516',.32,.25));record.position.set(-1.05,1.42,-2.13);record.name='record player';scene.add(record);interactables.push(record);
const label=new THREE.Mesh(new THREE.CircleGeometry(.105,32),mat('#ac603c'));label.rotation.x=-Math.PI/2;label.position.set(-1.05,1.433,-2.13);scene.add(label);
const spindle=new THREE.Mesh(new THREE.CylinderGeometry(.02,.02,.06,12),brass);spindle.position.set(-1.05,1.45,-2.13);scene.add(spindle);
const arm=new THREE.Group();arm.position.set(-.55,1.4,-2.45);arm.rotation.y=-.27;scene.add(arm);const armRod=new THREE.Mesh(new THREE.CylinderGeometry(.022,.03,.65,12),brass);armRod.rotation.z=Math.PI/2;armRod.position.x=-.24;arm.add(armRod);
// Desk lamp
const lampStem=new THREE.Mesh(new THREE.CylinderGeometry(.025,.04,.55,12),brass);lampStem.position.set(-2.85,1.52,-2.25);scene.add(lampStem);
const shade=new THREE.Mesh(new THREE.ConeGeometry(.23,.24,24,1,true),mat('#88704f',.46,.35));shade.position.set(-2.85,1.85,-2.25);shade.rotation.x=Math.PI;scene.add(shade);
const deskLight=new THREE.PointLight('#f0bc7b',7,3,2);deskLight.position.set(-2.85,1.7,-2.25);scene.add(deskLight);

// Film projector on a wheeled cabinet, with visible twin reels and lens.
box('projector cabinet',1.75,.58,-4.2,1.25,1.05,1.15,darkWood);box('projector body',1.7,1.48,-4.25,1.25,.62,.8,mat('#44433e',.45,.48));
for(const x of [1.35,2.05]){const reel=new THREE.Mesh(new THREE.CylinderGeometry(.34,.34,.07,32),brass);reel.rotation.z=Math.PI/2;reel.position.set(x,2.12,-4.18);scene.add(reel);const hub=new THREE.Mesh(new THREE.CylinderGeometry(.09,.09,.08,20),black);hub.rotation.z=Math.PI/2;hub.position.set(x,2.12,-4.18);scene.add(hub);for(let a=0;a<6;a++){const spoke=new THREE.Mesh(new THREE.BoxGeometry(.012,.47,.014),black);spoke.position.set(x,2.12,-4.18);spoke.rotation.x=a*Math.PI/3;scene.add(spoke)}}
const lens=new THREE.Mesh(new THREE.CylinderGeometry(.17,.23,.32,24),mat('#24292c',.24,.68));lens.rotation.x=Math.PI/2;lens.position.set(1.7,1.5,-3.8);scene.add(lens);
const beam=new THREE.SpotLight('#e3c995',16,10,Math.PI/10,.55,1.2);beam.position.set(1.7,1.5,-3.7);beam.target.position.set(0,2.5,-5.1);scene.add(beam,beam.target);

// Reel canister and forgotten clues on a side shelf.
box('side shelf',-4.22,1.6,-3.45,.85,.12,2.1,wood);box('film canister',-4.12,1.9,-3.55,.34,.34,.34,mat('#66615a',.45,.55),true);
const canLid=new THREE.Mesh(new THREE.CylinderGeometry(.18,.18,.035,32),brass);canLid.position.set(-4.12,2.09,-3.55);scene.add(canLid);
// Framed poster hint on the right wall
box('poster frame',4.81,2.65,-1.6,.05,1.7,1.15,brass);box('poster',4.77,2.65,-1.6,.035,1.58,1.03,mat('#855342'));
box('poster art',4.745,2.65,-1.6,.018,1.17,.63,mat('#d2a56c'));
for(let i=0;i<4;i++)box('poster text',4.728,2.28-i*.09,-1.6,.012,.018,.54,mat('#483a32'));
// Dusty chair and loose canisters add scale and silhouette.
box('chair seat',.35,.75,-.7,.85,.16,.75,mat('#45413a'));box('chair back',.35,1.35,-.34,.85,1.05,.14,mat('#393630'));
for(const x of [0, .7])for(const z of [-.95,-.45])box('chair leg',x,.35,z,.07,.68,.07,darkWood);
for(let i=0;i<3;i++){const can=new THREE.Mesh(new THREE.CylinderGeometry(.12,.12,.28,20),mat(i===1?'#777061':'#544f46',.5,.36));can.position.set(3.25+i*.34,.16,-3.7);scene.add(can)}
// Dust motes
const dustGeo=new THREE.BufferGeometry(), dustCount=240, dustPos=new Float32Array(dustCount*3);
for(let i=0;i<dustCount;i++){dustPos[i*3]=(Math.random()-.5)*8;dustPos[i*3+1]=Math.random()*4;dustPos[i*3+2]=(Math.random()-.5)*9-1}
dustGeo.setAttribute('position',new THREE.BufferAttribute(dustPos,3));const dust=new THREE.Points(dustGeo,new THREE.PointsMaterial({color:'#d9bd8e',size:.018,transparent:true,opacity:.38}));scene.add(dust);

// First-person look and movement, with a soft body-size boundary around the set.
let yaw=0,pitch=0,locked=false,started=false,playing=false,drawerOpen=false,hasLens=false,hasRecord=false,doorUnlocked=false;
const keys=new Set(), raycaster=new THREE.Raycaster();
const startScreen=document.querySelector('#start-screen'), prompt=document.querySelector('#interaction'), promptLabel=document.querySelector('#interaction-label'), toast=document.querySelector('#toast');
const objective=document.querySelector('#objective-text'),progressCount=document.querySelector('#progress-count'),progressFill=document.querySelector('#progress-fill');
function showToast(message){toast.textContent=message;toast.classList.add('visible');clearTimeout(showToast.timer);showToast.timer=setTimeout(()=>toast.classList.remove('visible'),2300)}
function updateProgress(){let count=(playing?1:0)+(hasLens?1:0)+(doorUnlocked?1:0);progressCount.textContent=`${String(count).padStart(2,'0')} / 04`;progressFill.style.width=`${count*25}%`;objective.textContent=doorUnlocked?'The booth is open. Step through.':hasLens?'The lens fits the camera. Find the booth door.':playing?'The bass is shaking something loose…':'Find a way into the desk drawer'};
function begin(){started=true;startScreen.classList.add('hidden');canvas.requestPointerLock?.()}
document.querySelector('#start-button').addEventListener('click',begin);
document.addEventListener('pointerlockchange',()=>{locked=document.pointerLockElement===canvas});
document.addEventListener('mousemove',e=>{if(!locked)return;yaw-=e.movementX*.0022;pitch-=e.movementY*.0019;pitch=THREE.MathUtils.clamp(pitch,-1.1,1.1)});
document.addEventListener('keydown',e=>{keys.add(e.code);if(e.code==='Escape'&&started&&!locked)canvas.requestPointerLock?.();if(e.code==='KeyE')interact()});document.addEventListener('keyup',e=>keys.delete(e.code));
canvas.addEventListener('click',()=>{if(started&&!locked)canvas.requestPointerLock?.()});
const soundButton=document.querySelector('#sound-toggle');let soundOn=true;
soundButton.addEventListener('click',()=>{soundOn=!soundOn;document.querySelector('#sound-label').textContent=soundOn?'SOUND ON':'SOUND OFF';if(!soundOn)stopTone();else if(playing)startTone()});
let audioContext=null,oscillators=[];
function startTone(){if(!soundOn)return;try{audioContext??=new (window.AudioContext||window.webkitAudioContext)();audioContext.resume();if(oscillators.length)return;for(const [frequency,gain] of [[55,.035],[82.4,.018]]){const osc=audioContext.createOscillator(),amp=audioContext.createGain();osc.type='sawtooth';osc.frequency.value=frequency;amp.gain.value=gain;osc.connect(amp).connect(audioContext.destination);osc.start();oscillators.push(osc)}}catch{}}
function stopTone(){for(const osc of oscillators){try{osc.stop()}catch{}}oscillators=[]}
function nearest(){camera.rotation.set(pitch,yaw,0,'YXZ');raycaster.setFromCamera(new THREE.Vector2(0,0),camera);const hits=raycaster.intersectObjects(interactables,false);return hits.length&&hits[0].distance<2.5?hits[0].object:null}
function interact(){const hit=nearest();if(!hit)return;switch(hit.name){case'jammed drawer':if(!playing){showToast('The drawer is jammed. Something needs to shake it loose.');break}if(!drawerOpen){drawerOpen=true;drawer.position.z=-1.66;hasLens=true;showToast('The bass rattles the drawer open. A camera lens.')}else showToast('The drawer is already open.');break;case'record player':playing=!playing;record.material.color.set(playing?'#542c21':'#141516');recordLabel.classList.toggle('visible',playing);if(playing){startTone();showToast('Needle down. The bass fills the booth.')}else{stopTone();showToast('The record falls silent.')}break;case'film canister':if(!hasRecord){hasRecord=true;hit.material.color.set('#242424');showToast('A reel canister. The label reads: LOW FREQUENCY.')}else showToast('An empty film canister.');break;case'exit door':if(!doorUnlocked){if(hasLens){doorUnlocked=true;knob.material.color.set('#e2ba83');showToast('The lens catches the projector beam. The booth door clicks open.')}else showToast('The door is locked. Find the camera lens first.')}else showToast('The projection booth is waiting.');break;case'mixing console':showToast('Three channels. A low signal is already humming.');break;default:showToast('Dust, warm metal, and old film.');}}
function tick(){requestAnimationFrame(tick);const dt=Math.min(clock.getDelta(),.04);camera.rotation.set(pitch,yaw,0,'YXZ');const forward=new THREE.Vector3(-Math.sin(yaw),0,-Math.cos(yaw)),right=new THREE.Vector3(Math.cos(yaw),0,-Math.sin(yaw));let move=new THREE.Vector3();if(keys.has('KeyW'))move.add(forward);if(keys.has('KeyS'))move.sub(forward);if(keys.has('KeyD'))move.add(right);if(keys.has('KeyA'))move.sub(right);if(move.lengthSq()){move.normalize().multiplyScalar(dt*(keys.has('ShiftLeft')?3.6:2.3));camera.position.add(move);camera.position.x=THREE.MathUtils.clamp(camera.position.x,-4.55,4.55);camera.position.z=THREE.MathUtils.clamp(camera.position.z,-5.03,5.05)}camera.position.y=1.62;const target=nearest();prompt.classList.toggle('visible',!!target);if(target){const names={'jammed drawer':'OPEN DRAWER','record player':playing?'STOP RECORD':'PLAY RECORD','film canister':'TAKE CANISTER','exit door':doorUnlocked?'ENTER BOOTH':'CHECK DOOR','mixing console':'INSPECT MIXER'};promptLabel.textContent=names[target.name]||'INSPECT'}if(playing)record.rotation.y+=dt*1.8;dust.rotation.y+=dt*.008;renderer.render(scene,camera)}
const clock=new THREE.Clock();tick();
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,1.75))});
updateProgress();
