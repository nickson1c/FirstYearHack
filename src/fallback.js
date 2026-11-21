// Small dependency-free software 3D renderer, used when the Three.js CDN cannot load.
import { ROOMS } from './rooms/index.js';
(() => {
  const canvas = document.querySelector('#offline-scene');
  const context = canvas.getContext('2d');
  const preview = document.querySelector('#room-preview');
  const startScreen = document.querySelector('#start-screen');
  const startButton = document.querySelector('#start-button');
  if (!context) return;

  let active = false;
  let locked = false;
  let yaw = 0;
  let pitch = 0;
  const camera = { x: 0, y: 1.62, z: 5.05 };
  const keys = new Set();
  const faces = [];
  const doors = [];
  const targets = [];
  const puzzle = {drawerOpen:false,hasKey:false,safeOpen:false,hasVinyl:false,vinylPlaced:false,reverse:false,playing:false,codeRevealed:false,doorUnlocked:false,photoBright:false,cameraMode:false,activeFilter:0,photoFound:new Set(),translationRead:false,orderRead:false,photoWordUnlocked:false};
  const shuffle=items=>{for(let i=items.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[items[i],items[j]]=[items[j],items[i]];}return items;};
  const photoGlyphCodes=shuffle([0x25b3,0x25c9,0x2301,0x2723,0x25c7]),photoFilterOrder=shuffle([1,2,3,4,5]);
  const photoFilterGlyphs=[];photoFilterOrder.forEach((filter,i)=>photoFilterGlyphs[filter-1]=photoGlyphCodes[i]);
  const photoTranslationEntries=shuffle([...photoGlyphCodes.map((glyph,i)=>({glyph,letter:'FOCUS'[i]})),{glyph:0x2297,letter:'A'},{glyph:0x2302,letter:'E'},{glyph:0x203b,letter:'R'}]);
  const wordKeys=document.querySelector('.wordlock-keys'),letterKeys=[...wordKeys.querySelectorAll('[data-letter]:not(.keypad-alt)')];
  shuffle(letterKeys).forEach(button=>wordKeys.insertBefore(button,wordKeys.querySelector('.keypad-alt')));
  let currentDoorFace = null;
  let currentFaceCondition = null;
  const roomSigns = ROOMS.map(room=>({x:-3.25,y:3.45,z:room.endZ+.45,title:room.title,detail:room.detail,accent:room.accent}));
  const fov = Math.PI / 3;
  let roomIndex = 0;

  const quad = (points, color) => faces.push({ points, color, door: currentDoorFace, condition: currentFaceCondition });
  const box = (x, y, z, w, h, d, color, accent) => {
    const x0=x-w/2,x1=x+w/2,y0=y-h/2,y1=y+h/2,z0=z-d/2,z1=z+d/2;
    const v=[[x0,y0,z0],[x1,y0,z0],[x1,y1,z0],[x0,y1,z0],[x0,y0,z1],[x1,y0,z1],[x1,y1,z1],[x0,y1,z1]];
    const shades=[color,shade(color,.84),shade(color,.68),shade(color,1.2),shade(color,.78),shade(color,.92)];
    [[0,1,2,3],[5,4,7,6],[4,0,3,7],[1,5,6,2],[3,2,6,7],[4,5,1,0]].forEach((f,i)=>quad(f.map(n=>v[n]),accent&&i===4?accent:shades[i]));
  };
  const shade = (hex, factor) => {
    const n=parseInt(hex.slice(1),16),r=Math.min(255,Math.round((n>>16)*factor)),g=Math.min(255,Math.round(((n>>8)&255)*factor)),b=Math.min(255,Math.round((n&255)*factor));
    return `rgb(${r},${g},${b})`;
  };
  const addTarget=(name,x,y,z,active=()=>true)=>targets.push({name,x,y,z,active});
  const buildPartition = (z,index) => {
    const x=4.02,width=1.6,left=x-width/2,right=x+width/2,wallColor=index===0?'#293544':index===1?'#263849':'#382b43';
    box(((-5+left)/2),2.5,z,left+5,5,.25,wallColor);box((5+right)/2,2.5,z,5-right,5,.25,wallColor);box(x,4,z,width,2,.25,wallColor);
    const door={x,y:1.5,z,from:index,to:index+1,boundary:z,isOpen:false};
    currentDoorFace=door;box(x,1.5,z,1.45,3,.12,'#111a25','#1d8da6');currentDoorFace=null;
    box(x,3.02,z+.16,1.62,.05,.08,'#20dfff');box(x,3.02,z-.16,1.62,.05,.08,'#ed39ff');
    if(index===0){box(3.02,1.48,z+.22,.24,.82,.1,'#111a25','#167b95');box(3.02,1.75,z+.16,.16,.12,.025,'#20dfff');addTarget('keypad',3.02,1.48,z+.15);}
    if(index===1){box(3.02,1.48,z+.22,.24,.82,.1,'#111a25','#6b2e83');addTarget('wordlock',3.02,1.48,z+.15);}doors.push(door);
  };

  // Room shell and perspective floor seams.
  quad([[-5,0,5.5],[5,0,5.5],[5,0,-5.5],[-5,0,-5.5]],'#1b2635');
  quad([[-5,5,5.5],[5,5,5.5],[5,5,-5.5],[-5,5,-5.5]],'#18202c');
  quad([[-5,0,5.5],[-5,5,5.5],[-5,5,-5.5],[-5,0,-5.5]],'#242e3b');
  quad([[5,0,5.5],[5,0,-5.5],[5,5,-5.5],[5,5,5.5]],'#302a3b');
  buildPartition(-5.5,0);
  for(let x=-4.7;x<=4.8;x+=.75) box(x,.012,0,.012,.012,10.7,'#171615');
  // Acoustic treatment, screen, booth door, and wall framing.
  for(let x=-4.25;x<=4.3;x+=1.35){box(x,2.65,-5.27,1.05,2.2,.09,'#292827');for(let k=0;k<5;k++)box(x-.38+k*.19,2.65,-5.21,.022,1.9,.018,'#49423a');}
  box(-3.25,3.45,-5.35,2.8,1.05,.08,'#07121f','#16849b');
  box(-.15,2.52,-5.18,2.55,1.56,.08,'#181a1b');box(-.15,2.52,-5.12,2.28,1.29,.025,'#a68c68','#9c835f');
  for(let z=-4.7;z<5;z+=1.1){box(-4.85,2.5,z,.08,4.8,.07,'#201b17');box(4.85,2.5,z,.08,4.8,.07,'#201b17');}
  // Desk, drawer, turntable, and mixer.
  box(-1.65,1.15,-2.15,3.3,.18,1.5,'#4b3b32');box(-1.65,.78,-1.46,3.08,.68,.13,'#292832');currentFaceCondition=()=>!puzzle.drawerOpen;box(-1.65,.93,-1.37,1.04,.36,.09,'#392d2b','#6c4b32');currentFaceCondition=()=>puzzle.drawerOpen;box(-1.65,.93,-1.06,1.04,.36,.09,'#171c27','#27647b');currentFaceCondition=null;box(-1.65,.93,-1.31,.16,.045,.04,'#c09058');addTarget('drawer',-1.6,.92,-1.41);
  currentFaceCondition=()=>puzzle.drawerOpen&&!puzzle.hasKey;box(-1.6,1.03,-.91,.38,.055,.06,'#f4c55d');box(-1.78,1.03,-.91,.16,.16,.045,'#ffe18a');box(-1.4,1.03,-.91,.045,.12,.065,'#e7ad4d');box(-1.34,1.03,-.91,.045,.09,.065,'#e7ad4d');currentFaceCondition=null;addTarget('key',-1.6,1.03,-.91,()=>puzzle.drawerOpen&&!puzzle.hasKey);
  for(const x of [-3,-.25])for(const z of [-2.7,-1.6])box(x,.52,z,.14,1.04,.14,'#241c16');
  box(-1.05,1.3,-2.17,1.22,.13,.9,'#252626');
  // Platter, record and label as shallow 3D discs.
  const disc=(x,y,z,r,color)=>{const steps=32;for(let i=0;i<steps;i++){const a=i/steps*Math.PI*2,b=(i+1)/steps*Math.PI*2;quad([[x,y,z],[x+Math.cos(a)*r,y,z+Math.sin(a)*r],[x+Math.cos(b)*r,y,z+Math.sin(b)*r]],i%2?shade(color,.83):color);}};
  const verticalDisc=(x,y,z,r,color)=>{const steps=36;for(let i=0;i<steps;i++){const a=i/steps*Math.PI*2,b=(i+1)/steps*Math.PI*2;quad([[x,y,z],[x,y+Math.cos(a)*r,z+Math.sin(a)*r],[x,y+Math.cos(b)*r,z+Math.sin(b)*r]],i%2?shade(color,.83):color);}};
  disc(-1.05,1.39,-2.17,.39,'#586575');currentFaceCondition=()=>puzzle.vinylPlaced;disc(-1.05,1.405,-2.17,.34,'#111314');disc(-1.05,1.417,-2.17,.10,'#20dfff');currentFaceCondition=null;addTarget('turntable',-1.05,1.41,-2.17);box(-.48,1.42,-1.92,.14,.09,.14,'#ed39ff');box(-.2,1.42,-1.92,.08,.07,.08,'#20dfff');addTarget('reverse',-.48,1.42,-1.92);
  // Locked safe on the side wall; the inner vinyl only appears when it is opened.
  box(4.31,1.55,-2.8,.1,1.48,1.2,'#101a28','#39708a');box(3.88,2.29,-2.8,.9,.1,1.2,'#34475b');box(3.88,.81,-2.8,.9,.1,1.2,'#34475b');box(3.88,1.55,-3.37,.9,1.38,.08,'#34475b');box(3.88,1.55,-2.23,.9,1.38,.08,'#34475b');
  box(3.31,2.25,-2.8,.055,.07,1.17,'#20dfff');box(3.31,.85,-2.8,.055,.07,1.17,'#20dfff');box(3.31,1.55,-3.35,.055,1.45,.07,'#20dfff');box(3.31,1.55,-2.25,.055,1.45,.07,'#20dfff');
  const safeFace={isOpen:false};currentDoorFace=safeFace;box(3.39,1.55,-2.8,.09,1.27,1.03,'#172739','#3199bd');box(3.31,1.55,-2.8,.1,.26,.26,'#d0a667');currentDoorFace=null;addTarget('safe',3.39,1.55,-2.8,()=>!puzzle.safeOpen);
  currentFaceCondition=()=>puzzle.safeOpen&&!puzzle.hasVinyl;verticalDisc(3.73,1.56,-2.8,.4,'#111722');verticalDisc(3.705,1.56,-2.8,.13,'#ed39ff');currentFaceCondition=null;addTarget('vinyl',3.73,1.56,-2.8,()=>puzzle.safeOpen&&!puzzle.hasVinyl);
  box(-2.15,1.3,-2.16,1.12,.12,.82,'#202425');
  for(let c=0;c<3;c++){box(-2.52+c*.36,1.39,-2.16,.27,.035,.58,'#30302d');for(let k=0;k<2;k++)box(-2.52+c*.36,1.43,-2.3+k*.16,.09,.06,.08,'#ba925e');box(-2.52+c*.36,1.43,-1.97,.035,.03,.18,'#d2c4a8');}
  // Projector cabinet, reels, lens and cone of warm light.
  box(1.75,.59,-4.2,1.3,1.08,1.18,'#292723');box(1.75,1.5,-4.15,1.3,.62,.85,'#46443e');
  for(const x of [1.37,2.12]){disc(x,2.15,-4.12,.34,'#9e794c');disc(x,2.16,-4.12,.09,'#282725');}
  box(1.75,1.5,-3.68,.32,.32,.35,'#68605a','#b99d73');
  quad([[1.92,1.4,-3.55],[1.58,1.4,-5.07],[.15,2.47,-5.04],[1.75,1.66,-3.55]],'rgba(226,190,130,.11)');
  // Lamp, shelf, poster, chair, and canisters.
  box(-2.95,1.48,-2.25,.07,.56,.07,'#997346');box(-2.95,1.83,-2.25,.45,.22,.4,'#8f7049');
  box(-4.28,1.6,-3.45,.85,.12,2.1,'#5a402b');box(-4.12,1.91,-3.55,.35,.35,.35,'#615e58','#a9804b');
  box(4.76,2.62,-1.6,.08,1.8,1.2,'#a17b4c');box(4.69,2.62,-1.6,.05,1.61,1.03,'#9a6044');box(4.65,2.65,-1.6,.04,1.12,.62,'#d2a56c');
  box(.3,.76,-.75,.9,.17,.78,'#45413a');box(.3,1.33,-.38,.9,1.05,.16,'#393630');
  for(let i=0;i<3;i++)box(3.25+i*.34,.18,-3.7,.24,.32,.24,'#625c50');

  // The next two rooms share the same dimensions and doorway positions as the WebGL scene.
  for(let index=1;index<=3;index++){
    const center=-11*index,back=center-5.5,front=center+5.5;
    const palette=index===1?['#101b27','#132a38','#16c8e8','#295e80']:index===2?['#1b1424','#30203b','#f033ff','#5b3178']:['#241b23','#382b32','#ff9d45','#9c5648'];
    quad([[-5,0,front],[5,0,front],[5,0,back],[-5,0,back]],palette[0]);
    quad([[-5,5,front],[5,5,front],[5,5,back],[-5,5,back]],'#10141c');
    quad([[-5,0,front],[-5,5,front],[-5,5,back],[-5,0,back]],'#17212d');
    quad([[5,0,front],[5,0,back],[5,5,back],[5,5,front]],'#201a2b');
    for(let x=-4.5;x<4.7;x+=.9)box(x,.015,center,.018,.018,10.5,'#314158');
    for(let x=-4.4;x<=4.4;x+=1.1)box(x,2.6,back+.2,.08,2.5,.08,'#263b50');
    box(-1.7,3.9,back+.2,2.8,.065,.09,palette[2]);
    box(1.7,3.65,back+.2,2.1,.06,.09,index===1?'#ec3bff':'#36dcff');
    box(-4.82,3.8,center,.06,.06,9.2,palette[2]);
    box(4.82,2.7,center,.06,.06,9.2,index===1?'#ed39ff':'#29dfff');
    box(-1.15,.55,center-1.1,3.1,1.05,1.35,index===1?'#172a3a':'#261a35');
    box(-1.15,1.1,center-1.1,3.18,.035,1.42,palette[2]);
    box(-3.25,3.45,back+.12,2.8,1.05,.08,'#07121f',palette[2]);
    if(index===1){
      for(const x of [-3.7,3.35]){box(x,1.65,center-1.05,.95,3.1,1.05,'#162a3a','#1c5e7c');for(let row=0;row<7;row++)box(x-.22,0.5+row*.37,center-.44,.07,.055,.025,row%2?'#ed35ff':'#20dfff');}
      for(let z=center+1.5;z>center-4;z-=1.2)box(0,4.55,z,7.8,.06,.22,'#456078');
    } else if(index===2) {
      for(const y of [1.05,2.05,3.05]){box(-3.55,y,center-1.25,1.65,.09,5.8,'#69516e');for(let n=0;n<6;n++)box(-4.05+(n%3)*.45,y+.23,center-3.3+Math.floor(n/3)*.9,.25,.36,.25,n%2?'#ae7c52':'#806b9b');}
      box(2.8,.9,center-1.8,2.2,1.5,2.5,'#382544','#b64a9c');box(2.8,1.68,center-1.8,.09,.04,1.85,'#ff68d7');
    } else {
      const calibration=['#ff4e7a','#ffb84d','#d6e65a','#42dfbd','#4ca6ff','#b66dff'];
      calibration.forEach((color,i)=>box(-2.5+i,2.72,center-2.8,.76,.54,.045,color));
      box(1.6,1.12,center+.3,2.9,1.35,1.6,'#35273b','#ff9d45');
      for(let i=0;i<5;i++)box(.55+i*.45,1.82,center+.3,.18,.035,.78,i%2?'#a254b6':'#3ec8d0');
    }
    box(-1.15,1.35,center-1.5,2.3,.38,.08,'#142535');
    for(let n=0;n<5;n++)box(-2+n*.42,1.38,center-1.44,.12,.035,.02,n%2?'#ee31ff':'#20dfff');
  }
  // Darkroom enclosure, work light, hidden camera, poster and filter gated symbols.
  const photoZ=-11;box(-3.15,1.95,photoZ-1.15,.16,3.9,6.1,'#03040a');box(-.05,1.95,photoZ-1.15,.16,3.9,6.1,'#03040a');box(-1.6,3.9,photoZ-1.15,3.25,.14,6.1,'#03040a');box(-2.65,1.95,photoZ+1.9,1,3.9,.12,'#080b13');box(-.55,1.95,photoZ+1.9,1,3.9,.12,'#080b13');
  box(1.05,1.2,photoZ+1.6,.38,.62,.18,'#202837','#e43cff');addTarget('brightness',1.05,1.2,photoZ+1.6);
  box(-1.6,.64,photoZ-.1,1.8,.16,1.05,'#402f29','#b07a50');
  currentFaceCondition=()=>puzzle.photoBright;box(-1.6,1.45,photoZ-.1,.85,.54,.43,'#b56d3e','#ffd36d');box(-1.6,1.45,photoZ-.38,.36,.26,.12,'#171b20','#20dfff');currentFaceCondition=null;box(-1.6,.97,photoZ-.1,.12,.62,.12,'#b98b55');addTarget('photoCamera',-1.6,1.45,photoZ-.1,()=>puzzle.photoBright&&!puzzle.cameraMode);
  box(4.7,2.75,photoZ-2.05,.08,1.85,1.7,'#171827','#806b7f');addTarget('contactSheet',4.7,2.75,photoZ-2.05);
  box(4.7,2.75,photoZ-4.15,.08,1.85,1.7,'#111a27','#7b9b9c');addTarget('orderPoster',4.7,2.75,photoZ-4.15);
  currentFaceCondition=()=>puzzle.photoBright;box(-1.6,2.35,-16.28,4.55,3.25,.16,'#9b704a');box(-1.6,2.35,-16.18,4.3,3.05,.025,'#1b2935');currentFaceCondition=null;
  addTarget('photoPainting',-1.6,2.35,-16.16,()=>puzzle.photoBright&&puzzle.cameraMode);
  buildPartition(-16.5,1);buildPartition(-27.5,2);
  quad([[-5,0,-38.5],[5,0,-38.5],[5,5,-38.5],[-5,5,-38.5]],'#382b43');

  const project = (p,w,h) => {
    const dx=p[0]-camera.x,dy=p[1]-camera.y,dz=p[2]-camera.z;
    const fx=-Math.sin(yaw),fz=-Math.cos(yaw),rx=Math.cos(yaw),rz=-Math.sin(yaw);
    const forward=dx*fx+dz*fz;
    const depth=forward*Math.cos(pitch)+dy*Math.sin(pitch);
    const vertical=dy*Math.cos(pitch)-forward*Math.sin(pitch);
    if(depth<.08)return null;
    const focal=h/(2*Math.tan(fov/2));
    return [w/2+(dx*rx+dz*rz)*focal/depth,h/2-vertical*focal/depth,depth];
  };
  const nearestDoor = (w,h) => doors.map(door=>({door,screen:project([door.x,door.y,door.z],w,h),distance:Math.hypot(door.x-camera.x,door.y-camera.y,door.z-camera.z)}))
    .filter(item=>(item.door.from===roomIndex||item.door.to===roomIndex)&&item.screen&&item.distance<3)
    .sort((a,b)=>a.distance-b.distance)
    .find(item=>Math.hypot(item.screen[0]-w/2,item.screen[1]-h/2)<Math.min(76,w*.09))?.door;
  const nearestTarget=(w,h)=>{const vinyl=targets.find(target=>target.name==='vinyl');if(puzzle.safeOpen&&!puzzle.hasVinyl&&Math.hypot(vinyl.x-camera.x,vinyl.y-camera.y,vinyl.z-camera.z)<2.2)return vinyl;return targets.map(target=>({target,screen:project([target.x,target.y,target.z],w,h),distance:Math.hypot(target.x-camera.x,target.y-camera.y,target.z-camera.z)}))
    .filter(item=>item.target.active()&&item.screen&&item.distance<2.7)
    .sort((a,b)=>Math.hypot(a.screen[0]-w/2,a.screen[1]-h/2)-Math.hypot(b.screen[0]-w/2,b.screen[1]-h/2))
    .find(item=>Math.hypot(item.screen[0]-w/2,item.screen[1]-h/2)<Math.min(item.target.name==='vinyl'?150:item.target.name==='key'?115:item.target.name==='photoPainting'?300:78,w*(item.target.name==='photoPainting'?.32:.16)))?.target;};
  const setRoomUI = () => {
    document.querySelector('#room-number').textContent=`ROOM ${String(roomIndex+1).padStart(2,'0')}`;
    document.querySelector('#room-title').textContent=ROOMS[roomIndex].title;
    document.querySelector('#room-marker-name').textContent=ROOMS[roomIndex].title;
    document.querySelector('#room-marker-detail').textContent=ROOMS[roomIndex].detail;
    for(let i=0;i<ROOMS.length;i++){const node=document.querySelector(`#route-node-${i}`);node.classList.toggle('active',i===roomIndex);node.classList.toggle('visited',i<roomIndex);}
    document.querySelector('#objective-text').textContent=roomIndex===1?(!puzzle.photoBright?'Raise the darkroom brightness switch.':!puzzle.cameraMode?'Pick up the revealed camera.':puzzle.photoFound.size<5?'Use filters to find paintings ('+puzzle.photoFound.size+'/5).':!puzzle.translationRead||!puzzle.orderRead?'Examine the two wall prints.':!puzzle.photoWordUnlocked?'Enter the ordered five-letter word at the exit lock.':'Walk into the archive.'):roomIndex===2?'Continue through the archive into the color suite.':roomIndex===3?'The four-room route is complete.':!puzzle.drawerOpen?'Open the desk drawer and look inside.':!puzzle.hasKey?'Take the brass key from the drawer.':!puzzle.safeOpen?'Use the key on the wall safe.':!(puzzle.hasVinyl||puzzle.vinylPlaced)?'Collect the vinyl from the safe.':!puzzle.vinylPlaced?'Place the vinyl on the turntable.':!puzzle.codeRevealed?'Play the track in reverse to reveal the code.':!puzzle.doorUnlocked?'Enter 6767 on the door keypad.':'Walk through the unlocked cyan door.';
    document.querySelector('#progress-count').textContent=`${String(roomIndex+1).padStart(2,'0')} / 04`;
    document.querySelector('#progress-fill').style.width=`${((roomIndex+1)/4)*100}%`;
  };
  setRoomUI();
  const showToast = message => {const toast=document.querySelector('#toast');toast.textContent=message;toast.classList.add('visible');setTimeout(()=>toast.classList.remove('visible'),2200);};
  let audioContext=null,audioSource=null,soundOn=true;
  const makeTrack=reverse=>{const rate=audioContext.sampleRate,length=rate*3,buffer=audioContext.createBuffer(1,length,rate),samples=buffer.getChannelData(0),notes=[55,65.4,73.4,82.4,73.4,65.4,55,82.4],step=3/notes.length;for(let i=0;i<length;i++){const time=i/rate,local=time%step,env=Math.min(1,local*16)*Math.min(1,(step-local)*9),f=notes[Math.floor(time/step)];samples[i]=(.24*Math.sin(2*Math.PI*f*local)+.08*Math.sin(2*Math.PI*f*2*local))*env;}if(reverse)samples.reverse();return buffer;};
  const stopTrack=()=>{if(audioSource){try{audioSource.stop()}catch{}audioSource.disconnect();audioSource=null;}};
  const playTrack=()=>{stopTrack();if(!soundOn)return;try{audioContext??=new(window.AudioContext||window.webkitAudioContext)();audioContext.resume();audioSource=audioContext.createBufferSource();audioSource.buffer=makeTrack(puzzle.reverse);audioSource.loop=true;const gain=audioContext.createGain();gain.gain.value=.34;audioSource.connect(gain).connect(audioContext.destination);audioSource.start();}catch{}};
  const updatePuzzleUI=()=>{document.querySelector('#objective-text').textContent=roomIndex===1?(!puzzle.photoBright?'Raise the darkroom brightness switch.':!puzzle.cameraMode?'Pick up the revealed camera.':puzzle.photoFound.size<5?'Use filters to find paintings ('+puzzle.photoFound.size+'/5).':!puzzle.translationRead||!puzzle.orderRead?'Examine the two wall prints.':!puzzle.photoWordUnlocked?'Enter the ordered five-letter word at the exit lock.':'Walk into the archive.'):roomIndex===2?'Continue through the archive into the color suite.':roomIndex===3?'The four-room route is complete.':!puzzle.drawerOpen?'Open the desk drawer and look inside.':!puzzle.hasKey?'Take the brass key from the drawer.':!puzzle.safeOpen?'Use the key on the wall safe.':!(puzzle.hasVinyl||puzzle.vinylPlaced)?'Collect the vinyl from the safe.':!puzzle.vinylPlaced?'Place the vinyl on the turntable.':!puzzle.codeRevealed?'Play the track in reverse to reveal the code.':!puzzle.doorUnlocked?'Enter 6767 on the door keypad.':'Walk through the unlocked cyan door.';};
  const updateRecordLabel=()=>{const display=document.querySelector('#record-label');display.classList.toggle('visible',puzzle.playing||puzzle.codeRevealed);display.querySelector('span').textContent=puzzle.codeRevealed?'REVERSE SIGNAL DECODED':puzzle.reverse?'REVERSE PLAYBACK':'FORWARD PLAYBACK';display.querySelector('strong').textContent=puzzle.codeRevealed?'6767':puzzle.reverse?'REWIND':'—';};
  const keypadOverlay=document.querySelector('#keypad-overlay'),keypadInput=document.querySelector('#keypad-input'),keypadHint=document.querySelector('#keypad-hint');
  const translationOverlay=document.querySelector('#translation-overlay'),translationGrid=document.querySelector('#translation-grid'),orderOverlay=document.querySelector('#order-overlay'),orderSequence=document.querySelector('#order-sequence'),wordlockOverlay=document.querySelector('#wordlock-overlay'),wordlockInput=document.querySelector('#wordlock-input'),wordlockHint=document.querySelector('#wordlock-hint'),photoHud=document.querySelector('#photo-hud');
  const openKeypad=()=>{keypadInput.value='';keypadHint.textContent=puzzle.codeRevealed?'The reversed groove reads 6767. Enter the signal.':'The display is blank. Reverse the record to reveal the signal.';keypadOverlay.hidden=false;document.exitPointerLock?.();};
  const closeKeypad=()=>{if(!active)return;keypadOverlay.hidden=true;canvas.requestPointerLock?.();};
  const submitCode=()=>ROOMS[0].submitCode({getState:()=>({codeRevealed:puzzle.codeRevealed}),value:keypadInput.value,setHint:text=>{keypadHint.textContent=text},unlockDoor:()=>{puzzle.doorUnlocked=true;keypadOverlay.hidden=true;const gate=doors.find(item=>item.boundary===-5.5);gate.isOpen=true;canvas.requestPointerLock?.()},update:updatePuzzleUI,showToast});
  keypadOverlay.addEventListener('click',e=>{if(!active)return;const key=e.target.closest('[data-key]');if(!key)return;if(key.dataset.key==='clear')keypadInput.value='';else if(key.dataset.key==='back')keypadInput.value=keypadInput.value.slice(0,-1);else if(keypadInput.value.length<4)keypadInput.value+=key.dataset.key;});
  document.querySelector('#keypad-submit').addEventListener('click',submitCode);document.querySelector('#keypad-close').addEventListener('click',closeKeypad);
  const restoreLook=()=>{if(active)canvas.requestPointerLock?.()};
  const submitWord=()=>ROOMS[1].submitWord({getState:()=>({...puzzle}),value:wordlockInput.value,setHint:text=>{wordlockHint.textContent=text},patchState:patch=>Object.assign(puzzle,patch),unlockDoor:()=>{wordlockOverlay.hidden=true;const gate=doors.find(d=>d.boundary===-16.5);gate.isOpen=true},update:updatePuzzleUI,showToast,restoreLook});
  wordlockOverlay.addEventListener('click',e=>{const b=e.target.closest('[data-letter]');if(!b)return;const v=b.dataset.letter;if(v==='clear')wordlockInput.value='';else if(v==='back')wordlockInput.value=wordlockInput.value.slice(0,-1);else if(wordlockInput.value.length<5)wordlockInput.value+=v;});document.querySelector('#wordlock-submit').addEventListener('click',submitWord);document.querySelector('#wordlock-close').addEventListener('click',()=>{wordlockOverlay.hidden=true;restoreLook()});
  translationOverlay.addEventListener('click',e=>{if(e.target.closest('#translation-close')){translationOverlay.hidden=true;restoreLook()}});orderOverlay.addEventListener('click',e=>{if(e.target.closest('#order-close')){orderOverlay.hidden=true;restoreLook()}});
  photoHud.addEventListener('click',e=>{const b=e.target.closest('[data-filter]');if(!b)return;puzzle.activeFilter=Number(b.dataset.filter);photoHud.querySelectorAll('[data-filter]').forEach(el=>el.classList.toggle('active',el===b));document.querySelector('#game').classList.remove('filter-infrared','filter-negative','filter-uv','filter-cyan','filter-amber');document.querySelector('#game').classList.add(['filter-infrared','filter-negative','filter-uv','filter-cyan','filter-amber'][puzzle.activeFilter]);document.querySelector('#photo-filter-name').textContent=['INFRARED','NEGATIVE','ULTRAVIOLET','CYANOGRAPH','AMBER'][puzzle.activeFilter];document.querySelector('#game').classList.remove('filter-infrared','filter-negative','filter-uv','filter-cyan','filter-amber');document.querySelector('#game').classList.add(['filter-infrared','filter-negative','filter-uv','filter-cyan','filter-amber'][puzzle.activeFilter]);});
  document.addEventListener('keydown',e=>{if(!active)return;if(!wordlockOverlay.hidden){if(/^(KeyF|KeyO|KeyC|KeyU|KeyS)$/.test(e.code)&&wordlockInput.value.length<5)wordlockInput.value+=e.key.toUpperCase();else if(e.code==='Backspace')wordlockInput.value=wordlockInput.value.slice(0,-1);else if(e.code==='Enter')submitWord();else if(e.code==='Escape'){wordlockOverlay.hidden=true;restoreLook()}e.preventDefault();e.stopImmediatePropagation();return}if(!translationOverlay.hidden||!orderOverlay.hidden){if(e.code==='Escape'){translationOverlay.hidden=true;orderOverlay.hidden=true;restoreLook()}e.preventDefault();e.stopImmediatePropagation();return}if(puzzle.cameraMode&&/^Digit[1-5]$/.test(e.code)){puzzle.activeFilter=Number(e.code.slice(-1))-1;document.querySelector('#game').classList.remove('filter-infrared','filter-negative','filter-uv','filter-cyan','filter-amber');document.querySelector('#game').classList.add(['filter-infrared','filter-negative','filter-uv','filter-cyan','filter-amber'][puzzle.activeFilter]);photoHud.querySelectorAll('[data-filter]').forEach((b,i)=>b.classList.toggle('active',i===puzzle.activeFilter));document.querySelector('#photo-filter-name').textContent=['INFRARED','NEGATIVE','ULTRAVIOLET','CYANOGRAPH','AMBER'][puzzle.activeFilter];document.querySelector('#game').classList.remove('filter-infrared','filter-negative','filter-uv','filter-cyan','filter-amber');document.querySelector('#game').classList.add(['filter-infrared','filter-negative','filter-uv','filter-cyan','filter-amber'][puzzle.activeFilter]);e.preventDefault()}if(e.code==='KeyQ'&&puzzle.cameraMode){puzzle.cameraMode=false;photoHud.hidden=true;document.querySelector('#game').classList.remove('photo-lens-mode','filter-infrared','filter-negative','filter-uv','filter-cyan','filter-amber');showToast('Camera stowed.')}});
  const activateTarget=target=>{
    const handled=ROOMS[roomIndex].interact?.(target.name,{
      getState:()=>({...puzzle}),patchState:patch=>Object.assign(puzzle,patch),showToast,update:updatePuzzleUI,openKeypad:()=>openKeypad(),
      startAudio:playTrack,stopAudio:stopTrack,updateRecordLabel,
      visual:{setBrightness:on=>{if(!on){photoHud.hidden=true;document.querySelector('#game').classList.remove('photo-lens-mode','filter-infrared','filter-negative','filter-uv','filter-cyan','filter-amber')}},setCameraMode:on=>{photoHud.hidden=!on;if(on){const game=document.querySelector('#game');game.classList.add('photo-lens-mode',['filter-infrared','filter-negative','filter-uv','filter-cyan','filter-amber'][puzzle.activeFilter]);}}},
      showTranslation:()=>{translationGrid.replaceChildren(...photoTranslationEntries.flatMap(({glyph,letter})=>{const symbol=document.createElement('span'),value=document.createElement('b');symbol.textContent=String.fromCharCode(glyph);value.textContent=letter;return [symbol,value]}));translationOverlay.hidden=false;document.exitPointerLock?.()},
      showOrder:()=>{orderSequence.textContent=photoFilterOrder.map((filter,i)=>`${filter}  ${String.fromCharCode(photoGlyphCodes[i])}`).join('     ');orderOverlay.hidden=false;document.exitPointerLock?.()},
      openWordlock:()=>ROOMS[1].openWordlock({getState:()=>({...puzzle}),openOverlay:()=>{wordlockInput.value='';wordlockOverlay.hidden=false;document.exitPointerLock?.()},setHint:text=>{wordlockHint.textContent=text}}),updateSymbolCount:n=>{document.querySelector('#symbol-count').textContent=`${n} / 5 SYMBOLS`;}
    });
    if(handled){updatePuzzleUI();return;}
    if(!handled)showToast('A piece of the room.');
  };
  const resize=()=>{const r=canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,1.75);canvas.width=Math.floor(r.width*dpr);canvas.height=Math.floor(r.height*dpr);context.setTransform(dpr,0,0,dpr,0,0);};
  let last=0;
  const render=(time)=>{
    if(!active)return;
    const w=canvas.clientWidth,h=canvas.clientHeight,dt=Math.min((time-last)/1000||0,.04);last=time;
    const forwardX=-Math.sin(yaw),forwardZ=-Math.cos(yaw),rightX=Math.cos(yaw),rightZ=-Math.sin(yaw);
    let mx=0,mz=0;if(keys.has('KeyW')){mx+=forwardX;mz+=forwardZ}if(keys.has('KeyS')){mx-=forwardX;mz-=forwardZ}if(keys.has('KeyD')){mx+=rightX;mz+=rightZ}if(keys.has('KeyA')){mx-=rightX;mz-=rightZ}
    const previousZ=camera.z,length=Math.hypot(mx,mz);if(length){const speed=(keys.has('ShiftLeft')?3.6:2.4)*dt,nextX=Math.max(-4.55,Math.min(4.55,camera.x+mx/length*speed)),nextZ=Math.max(-38.03,Math.min(5.05,camera.z+mz/length*speed));const blockedBySafe=(x,z)=>x>3.1&&x<4.7&&z>-3.68&&z<-1.92;if(!blockedBySafe(nextX,camera.z))camera.x=nextX;if(!blockedBySafe(camera.x,nextZ))camera.z=nextZ;for(const door of doors){const crossed=(previousZ>door.boundary&&camera.z<=door.boundary)||(previousZ<door.boundary&&camera.z>=door.boundary);if(crossed&&(!door.isOpen||Math.abs(camera.x-4.02)>.95))camera.z=previousZ>door.boundary?door.boundary+.45:door.boundary-.45;}const next=camera.z>-5.5?0:camera.z>-16.5?1:camera.z>-27.5?2:3;if(next!==roomIndex){roomIndex=next;setRoomUI();showToast(`Entered room ${String(roomIndex+1).padStart(2,'0')}.`);}}
    context.clearRect(0,0,w,h);
    const sky=context.createLinearGradient(0,0,0,h);sky.addColorStop(0,'#172538');sky.addColorStop(.48,'#263344');sky.addColorStop(1,'#1b202b');context.fillStyle=sky;context.fillRect(0,0,w,h);
    const sorted=[];
    for(const face of faces){const pts=face.points.map(p=>project(p,w,h));if(pts.some(p=>!p))continue;sorted.push({pts,color:face.color,depth:pts.reduce((s,p)=>s+p[2],0)/pts.length});}
    sorted.sort((a,b)=>b.depth-a.depth);
    for(const face of sorted){if(face.door?.isOpen||(face.condition&&!face.condition()))continue;context.beginPath();context.moveTo(face.pts[0][0],face.pts[0][1]);for(let i=1;i<face.pts.length;i++)context.lineTo(face.pts[i][0],face.pts[i][1]);context.closePath();context.fillStyle=face.color;context.fill();context.strokeStyle='rgba(8,8,8,.15)';context.lineWidth=1;context.stroke();}
    const sign=roomSigns[roomIndex],signPoint=project([sign.x,sign.y,sign.z],w,h);
    if(signPoint){const scale=Math.min(1.4,Math.max(.55,620/signPoint[2])),sw=250*scale,sh=76*scale,sx=signPoint[0]-sw/2,sy=signPoint[1]-sh/2;context.fillStyle='rgba(5,12,22,.92)';context.fillRect(sx,sy,sw,sh);context.strokeStyle=sign.accent;context.lineWidth=2*scale;context.strokeRect(sx,sy,sw,sh);context.fillStyle=sign.accent;context.font=`bold ${Math.max(9,12*scale)}px monospace`;context.fillText('REEL // SCORE   ACCESS NODE',sx+9*scale,sy+18*scale);context.fillStyle='#f1f5fa';context.font=`bold ${Math.max(11,18*scale)}px sans-serif`;context.fillText(sign.title,sx+9*scale,sy+43*scale);context.fillStyle='#a9bbcc';context.font=`${Math.max(8,10*scale)}px monospace`;context.fillText(sign.detail,sx+9*scale,sy+63*scale);}
    const pickup=!puzzle.hasKey&&puzzle.drawerOpen?{x:-1.6,y:1.3,z:-.91,title:'BRASS KEY',accent:'#ffd36d'}:puzzle.safeOpen&&!puzzle.hasVinyl?{x:3.73,y:2.15,z:-2.8,title:'VINYL — TAKE IT',accent:'#ff68d7'}:null;
    if(roomIndex===1){
      const switchPoint=project([1.05,1.2,-9.4],w,h);
      if(switchPoint){context.fillStyle='#e948ff';context.shadowColor='#e948ff';context.shadowBlur=18;context.fillRect(switchPoint[0]-9,switchPoint[1]-15,18,30);context.shadowBlur=0;context.fillStyle='#fff';context.font='bold 10px monospace';context.textAlign='center';context.fillText('LIGHT',switchPoint[0],switchPoint[1]+30);}
      if(puzzle.photoBright){const cam=project([-1.6,1,-11.1],w,h);if(cam){context.fillStyle='#b56d3e';context.fillRect(cam[0]-22,cam[1]-13,44,26);context.strokeStyle='#d5b184';context.strokeRect(cam[0]-22,cam[1]-13,44,26);context.fillStyle='#20dfff';context.fillRect(cam[0]+5,cam[1]-7,12,14);context.fillStyle='#e9faff';context.font='bold 10px monospace';context.textAlign='center';context.fillText(puzzle.cameraMode?'CAMERA LIVE':'CAMERA ? E',cam[0],cam[1]-21);}}
      if(puzzle.photoBright){const p=project([-1.6,2.35,-16.15],w,h);if(p){const unit=h/(2*Math.tan(fov/2))/p[2],pw=4.3*unit,ph=3.05*unit,left=p[0]-pw/2,top=p[1]-ph/2,version=puzzle.cameraMode?puzzle.activeFilter:-1,palettes=[['#1c2a38','#bd7654','#e4ad6c'],['#22243a','#756c9b','#e0b65e'],['#18333a','#4e9d92','#d99a6c'],['#382538','#bd6b93','#e0b879'],['#233243','#6095aa','#e0c989']],colors=palettes[Math.max(0,version)];context.save();context.fillStyle='#b99a69';context.fillRect(left-7,top-7,pw+14,ph+14);const grad=context.createLinearGradient(left,top,left,top+ph);grad.addColorStop(0,colors[0]);grad.addColorStop(1,'#25202a');context.fillStyle=grad;context.fillRect(left,top,pw,ph);context.save();context.translate(left,top);context.scale(unit,unit);context.fillStyle=colors[2];context.globalAlpha=.82;context.beginPath();context.arc(3.15+version*.08,.62,.34,0,Math.PI*2);context.fill();context.globalAlpha=1;context.fillStyle='#141b23';for(let i=0;i<9;i++){const bw=.32,bh=.55+((i*17+Math.max(0,version)*13)%100)/100;context.fillRect(i*.48-.1,1.95-bh,bw,bh);context.fillStyle=colors[1];for(let r=0;r<3;r++)context.fillRect(i*.48-.02,1.52-bh+r*.22,.055,.09);context.fillStyle='#141b23';}context.strokeStyle=colors[1];context.lineWidth=.1;context.beginPath();context.moveTo(.48,2.7);context.lineTo(.48,1.15);context.quadraticCurveTo(.48,.32,1.55,.32);context.quadraticCurveTo(2.62,.32,2.62,1.15);context.lineTo(2.62,2.7);context.stroke();context.fillStyle='rgba(10,14,22,.68)';context.fillRect(.62,1.28,1.86,1.38);context.fillStyle=colors[1];context.beginPath();context.ellipse(2.45,2.72,1.22,.23,0,0,Math.PI*2);context.fill();context.fillStyle=colors[2];context.beginPath();context.arc(2.45,2.39,.28,Math.PI,0);context.lineTo(2.73,2.62);context.lineTo(2.17,2.62);context.closePath();context.fill();context.strokeStyle='rgba(220,210,190,.18)';context.lineWidth=.025;for(let i=0;i<40;i++){const x=((i*37)%430)/100,y=((i*61)%295)/100;context.beginPath();context.moveTo(x,y);context.lineTo(x+.12,y+.03);context.stroke();}if(puzzle.cameraMode){const spots=[[1.18,1.62],[3.12,1.14],[2.35,2.28],[3.48,1.54],[.72,.9]];context.fillStyle=['#c6b89c','#c7b8d0','#b7cbbb','#d5b5c0','#b5c7d2'][version];context.font='bold .53px Georgia';context.textAlign='center';context.textBaseline='middle';context.fillText(String.fromCharCode(photoFilterGlyphs[version]),spots[version][0],spots[version][1]);}context.restore();context.strokeStyle='#d9c8a5';context.lineWidth=1;context.strokeRect(left,top,pw,ph);context.restore();}}
    }
    if(pickup){const p=project([pickup.x,pickup.y,pickup.z],w,h);if(p){const scale=Math.min(1.2,Math.max(.6,560/p[2])),pw=176*scale,ph=32*scale,px=p[0]-pw/2,py=p[1]-ph;context.save();context.shadowColor=pickup.accent;context.shadowBlur=16*scale;context.fillStyle='rgba(5,10,18,.94)';context.fillRect(px,py,pw,ph);context.strokeStyle=pickup.accent;context.lineWidth=2*scale;context.strokeRect(px,py,pw,ph);context.fillStyle=pickup.accent;context.font=`bold ${Math.max(10,14*scale)}px monospace`;context.textAlign='center';context.fillText(pickup.title,p[0],py+21*scale);context.restore();}}
    const door=nearestDoor(w,h),target=nearestTarget(w,h),hint=document.querySelector('#interaction');
    hint.classList.toggle('visible',!!door||!!target);
    const labels={drawer:puzzle.drawerOpen?'TAKE BRASS KEY':'OPEN DRAWER',key:'TAKE BRASS KEY',safe:puzzle.hasKey?'UNLOCK SAFE':'SAFE — KEY REQUIRED',vinyl:'TAKE VINYL',turntable:puzzle.vinylPlaced?(puzzle.playing?'STOP RECORD':'PLAY RECORD'):puzzle.hasVinyl?'PLACE VINYL':'EMPTY TURNTABLE',reverse:`REVERSE ${puzzle.reverse?'ON':'OFF'}`,keypad:'ENTER ACCESS CODE',brightness:'RAISE DARKROOM LIGHTS',photoCamera:'PICK UP CAMERA',contactSheet:'INSPECT PRINT A',orderPoster:'INSPECT PRINT B',photoPainting:'INSPECT PAINTING',wordlock:'ENTER FIVE-LETTER WORD'};
    document.querySelector('#interaction-label').textContent=target?labels[target.name]:door?(door.isOpen?'WALK THROUGH DOOR':puzzle.doorUnlocked?'E OPEN DOOR':camera.z>door.boundary?'E OPEN LOCKED DOOR':'E OPEN RETURN DOOR'):'';
    // Gentle vignette preserves the original film-booth mood.
    const vignette=context.createRadialGradient(w/2,h*.52,h*.12,w/2,h*.52,h*.76);vignette.addColorStop(0,'rgba(0,0,0,0)');vignette.addColorStop(1,'rgba(0,0,0,.28)');context.fillStyle=vignette;context.fillRect(0,0,w,h);
    requestAnimationFrame(render);
  };
  const enter=()=>{
    if(window.__reelThreeReady||active)return;
    active=true;preview.style.display='none';canvas.style.display='block';startScreen.classList.add('hidden');resize();canvas.requestPointerLock?.();requestAnimationFrame(render);
  };
  startButton.addEventListener('click',enter);
  canvas.addEventListener('click',()=>{if(active&&!locked)canvas.requestPointerLock?.()});
  document.addEventListener('pointerlockchange',()=>{locked=document.pointerLockElement===canvas});
  document.addEventListener('mousemove',e=>{if(!active||!locked)return;yaw-=e.movementX*.0022;pitch-=e.movementY*.0018;pitch=Math.max(-.7,Math.min(.7,pitch));});
  document.addEventListener('keydown',e=>{if(!active)return;if(!keypadOverlay.hidden){if(/^Digit[0-9]$/.test(e.code)&&keypadInput.value.length<4)keypadInput.value+=e.key;else if(e.code==='Backspace')keypadInput.value=keypadInput.value.slice(0,-1);else if(e.code==='Enter')submitCode();else if(e.code==='Escape')closeKeypad();e.preventDefault();return;}if(e.code==='KeyE'&&!e.repeat){const target=nearestTarget(canvas.clientWidth,canvas.clientHeight);if(target){activateTarget(target);return;}const door=nearestDoor(canvas.clientWidth,canvas.clientHeight);if(door){if(door.boundary===-5.5&&!puzzle.doorUnlocked){showToast('The cyan exit is locked. Enter the reverse-playback code on its keypad.');return}if(door.boundary===-16.5&&!puzzle.photoWordUnlocked){showToast('Inspect the painting through all five lenses, then study the wall prints.');return}if(!door.isOpen){door.isOpen=true;showToast('Door swung open. Walk through it.');}else showToast('Door is open. Walk through.');return;}}keys.add(e.code)});
  document.addEventListener('keyup',e=>keys.delete(e.code));
  document.querySelector('#sound-toggle').addEventListener('click',()=>{if(!active)return;soundOn=!soundOn;document.querySelector('#sound-label').textContent=soundOn?'SOUND ON':'SOUND OFF';if(!soundOn)stopTrack();else if(puzzle.playing)playTrack();});
  window.addEventListener('resize',()=>{if(active)resize()});
})();
