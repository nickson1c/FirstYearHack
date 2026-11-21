import { addRoomBox } from './shared.js';

export const room02 = {
  id: 1,
  title: 'PHOTOGRAPHY LAB',
  detail: '02 / FIVE FILTERS',
  startZ: -5.5,
  endZ: -16.5,
  accent: '#20dfff',
  build(ctx) {
    const box = (name, x, y, z, width, height, depth, color) => addRoomBox({
      ...ctx, name, x, y, z, width, height, depth, color
    });

    // Aim the darkroom camera at the large print on the far wall.
    const cameraBody = ctx.scene.getObjectByName('photo camera');
    if (cameraBody?.parent) cameraBody.parent.rotation.y = Math.PI;

    // Keep the blackout enclosure continuous, and move its console inside its
    // clear width so it cannot intersect either side panel.
    const darkroomRight = ctx.scene.getObjectByName('darkroom right');
    if (darkroomRight) darkroomRight.position.x = -.05;
    const brightnessSwitch = ctx.scene.getObjectByName('brightness switch');
    if (brightnessSwitch) brightnessSwitch.position.set(-.85, 1.2, -8.96);
    const brightnessLamp = ctx.scene.getObjectByName('brightness switch lamp');
    if (brightnessLamp) brightnessLamp.position.set(-.85, 1.35, -8.88);
    const signalConsole = ctx.scene.getObjectByName('signal console');
    if (signalConsole) {
      signalConsole.position.x = -1.6;
      signalConsole.scale.x = .84;
    }
    const equipmentDisplay = ctx.scene.getObjectByName('equipment display');
    if (equipmentDisplay) equipmentDisplay.position.x = -1.6;

    // Keep the word lock as a typed answer field instead of revealing its
    // answer as on-screen letter buttons.
    const wordlockOverlay = document.querySelector('#wordlock-overlay');
    const wordlockInput = document.querySelector('#wordlock-input');
    document.querySelector('.wordlock-keys')?.remove();
    if (wordlockInput) {
      wordlockInput.readOnly = false;
      wordlockInput.placeholder = 'TYPE ANSWER';
      wordlockInput.addEventListener('input', () => {
        wordlockInput.value = wordlockInput.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 5);
      });
    }
    if (wordlockOverlay) document.addEventListener('keydown', event => {
      if (wordlockOverlay.hidden) return;
      event.stopImmediatePropagation();
      if (event.key === 'Enter') {
        event.preventDefault();
        document.querySelector('#wordlock-submit')?.click();
      } else if (event.key === 'Escape') {
        event.preventDefault();
        document.querySelector('#wordlock-close')?.click();
      } else if (event.target === wordlockInput && event.key.length === 1 && !/[a-z]/i.test(event.key)) {
        event.preventDefault();
      }
    });

    // Leave the numbered order chart readable while removing its answer glyphs.
    const roomCenterZ = this.startZ - 5.5;
    ctx.scene.traverse(object => {
      const image = object.material?.map?.image;
      if (!object.isMesh || image?.width !== 512 || Math.abs(object.position.x - 4.72) > .02 ||
          Math.abs(object.position.z - (roomCenterZ - 4.15)) > .02) return;
      const posterCtx = image.getContext('2d');
      posterCtx.fillStyle = '#171a20';
      posterCtx.fillRect(120, 42, 380, 350);
      object.material.map.needsUpdate = true;
    });

    if (cameraBody?.parent) {
      ctx.scene.traverse(object => {
        if (object.isSprite && object.position.distanceTo(cameraBody.parent.position) < .8) {
          cameraBody.parent.userData.room02PickupMarker = object;
        }
      });
    }

    // A low-key analog photography lab: work surfaces, film storage, and
    // equipment details fill the open side of the room without blocking paths.
    for (let i = 0; i < 5; i++) {
      box('photo lab ceiling marker', -2 + i, 4.72, -9.2, .46, .035, .035,
        i % 2 ? '#8b3e9b' : '#287d91');
    }
    box('photo lab cyan ceiling rail', 1.7, 4.45, -11.5, 5.9, .045, .055, '#1f647b');
    box('photo lab magenta ceiling rail', 1.7, 4.45, -14.3, 5.9, .045, .055, '#78366f');

    // Match Room 01's battens in size and spacing, translated to Room 02's
    // center. Later wall-mounted props sit in front of the battens naturally.
    for (const side of [-1, 1]) {
      for (let z = -15.7; z < -6; z += 1.05) {
        box('photo lab wall batten', side * 4.84, 2.5, z, .08, 4.7, .06, '#10141c');
      }
    }

    // The left wall is comparatively open; these paired neon signs give it a
    // clear darkroom identity without covering the work shelves below.
    const addNeonSign = (title, subtitle, z, accent) => {
      box('darkroom neon sign backing', -4.8, 3.45, z, .12, .92, 2.45, '#0a111b');
      const art = document.createElement('canvas');
      art.width = 768; art.height = 256;
      const signCtx = art.getContext('2d');
      signCtx.fillStyle = '#08111b'; signCtx.fillRect(0, 0, 768, 256);
      signCtx.strokeStyle = accent; signCtx.lineWidth = 7; signCtx.strokeRect(9, 9, 750, 238);
      signCtx.shadowColor = accent; signCtx.shadowBlur = 24;
      signCtx.fillStyle = accent; signCtx.font = 'bold 68px monospace'; signCtx.fillText(title, 32, 132);
      signCtx.shadowBlur = 10; signCtx.fillStyle = '#dce8ef'; signCtx.font = '25px monospace';
      signCtx.fillText(subtitle, 36, 190);
      const texture = new ctx.THREE.CanvasTexture(art);
      texture.colorSpace = ctx.THREE.SRGBColorSpace;
      const sign = new ctx.THREE.Mesh(new ctx.THREE.PlaneGeometry(2.35, .78),
        new ctx.THREE.MeshBasicMaterial({ map: texture, side: ctx.THREE.DoubleSide }));
      sign.name = 'darkroom neon sign';
      sign.rotation.y = Math.PI / 2;
      sign.position.set(-4.72, 3.45, z);
      ctx.scene.add(sign);
    };
    addNeonSign('DARKROOM', 'DEVELOP / PRINT / REPEAT', -8.8, '#20dfff');
    addNeonSign('EXPOSE', 'FILTER LAB  //  ROOM 02', -12.4, '#f05bdb');

    // Two more signs fill the partition beside the Room 02 entrance.
    const addEntranceSign = (title, subtitle, x, accent) => {
      box('entrance neon sign backing', x, 3.55, -5.58, 2.15, .86, .1, '#0a111b');
      const art = document.createElement('canvas');
      art.width = 768; art.height = 256;
      const signCtx = art.getContext('2d');
      signCtx.fillStyle = '#08111b'; signCtx.fillRect(0, 0, 768, 256);
      signCtx.strokeStyle = accent; signCtx.lineWidth = 7; signCtx.strokeRect(9, 9, 750, 238);
      signCtx.shadowColor = accent; signCtx.shadowBlur = 22;
      signCtx.fillStyle = accent; signCtx.font = 'bold 60px monospace'; signCtx.fillText(title, 32, 128);
      signCtx.shadowBlur = 8; signCtx.fillStyle = '#dce8ef'; signCtx.font = '24px monospace';
      signCtx.fillText(subtitle, 36, 188);
      const texture = new ctx.THREE.CanvasTexture(art);
      texture.colorSpace = ctx.THREE.SRGBColorSpace;
      const sign = new ctx.THREE.Mesh(new ctx.THREE.PlaneGeometry(2.02, .72),
        new ctx.THREE.MeshBasicMaterial({ map: texture, side: ctx.THREE.DoubleSide }));
      sign.name = 'entrance neon sign';
      sign.position.set(x, 3.55, -5.65);
      ctx.scene.add(sign);
    };
    addEntranceSign('PHOTO LAB', 'FILTERS 1-5', -2.8, '#20dfff');
    addEntranceSign('ROOM 02', 'DEVELOP / PRINT', -.25, '#f05bdb');

    // Film inspection counter and its sturdy legs.
    box('film inspection counter', 1.7, .96, -12.2, 2.7, .16, 1.45, '#342b31');
    for (const x of [.55, 2.85]) for (const z of [-12.78, -11.62]) {
      box('inspection counter leg', x, .46, z, .14, .92, .14, '#171d29');
    }
    box('counter cyan edge', 1.7, 1.055, -12.2, 2.72, .025, 1.47, '#20c8e8');
    box('light table', 1.65, 1.075, -12.2, 1.45, .07, 1.05, '#9ab6bf');
    box('light table glass', 1.65, 1.117, -12.2, 1.28, .018, .86, '#d4e3d9');

    // Film reels, labeled canisters, and contact sheets across the counter.
    for (let i = 0; i < 4; i++) {
      const x = .58 + i * .32;
      const canister = new ctx.THREE.Mesh(
        new ctx.THREE.CylinderGeometry(.105, .105, .32, 20),
        ctx.mat(i % 2 ? '#b57c57' : '#486a79', .42, .38)
      );
      canister.name = 'film canister';
      canister.position.set(x, 1.31, -11.9);
      ctx.scene.add(canister);
      box('film canister label', x, 1.32, -11.792, .09, .08, .012, '#e5d4b2');
    }
    for (let i = 0; i < 3; i++) {
      box('contact sheet tray', 1.55 + i * .4, 1.13, -12.36, .34, .025, .58,
        i === 1 ? '#c8b8a5' : '#757d86');
      for (let frame = 0; frame < 4; frame++) {
        box('contact sheet frame', 1.44 + i * .4 + (frame % 2) * .13, 1.147,
          -12.54 + Math.floor(frame / 2) * .2, .12, .009, .14,
          frame % 2 ? '#829ca0' : '#d2a66f');
      }
    }

    // A shaded studio lamp stands beside the opposite face of the darkroom.
    const lampX = .55, lampZ = -10.4;
    box('studio lamp stand', lampX, 1.45, lampZ, .09, 2.7, .09, '#252b36');
    for (const [x, z, turn] of [[lampX - .38, lampZ, 0], [lampX + .38, lampZ, 0], [lampX, lampZ + .38, Math.PI / 2]]) {
      const foot = box('studio lamp tripod foot', x, .08, z, .7, .07, .08, '#252b36');
      foot.rotation.y = turn;
    }
    const shade = new ctx.THREE.Mesh(new ctx.THREE.CylinderGeometry(.13, .34, .24, 24, 1, true),
      new ctx.THREE.MeshStandardMaterial({ color: '#48515a', metalness: .55, roughness: .38, side: ctx.THREE.DoubleSide }));
    shade.name = 'studio lamp reflector'; shade.position.set(lampX, 2.77, lampZ); ctx.scene.add(shade);
    const bulb = new ctx.THREE.Mesh(new ctx.THREE.SphereGeometry(.09, 16, 12),
      new ctx.THREE.MeshStandardMaterial({ color: '#fff1c5', emissive: '#ffc56a', emissiveIntensity: 2.2 }));
    bulb.name = 'studio lamp bulb'; bulb.position.set(lampX, 2.62, lampZ); ctx.scene.add(bulb);
    const lampGlow = new ctx.THREE.PointLight('#ffd493', 9, 5, 2);
    lampGlow.position.set(lampX, 2.52, lampZ); ctx.scene.add(lampGlow);
    const supportRod = (endX, endZ) => {
      const start = new ctx.THREE.Vector3(lampX, .82, lampZ);
      const end = new ctx.THREE.Vector3(endX, .12, endZ);
      const rod = new ctx.THREE.Mesh(new ctx.THREE.CylinderGeometry(.018, .026, start.distanceTo(end), 8),
        ctx.mat('#343b43', .48, .52));
      rod.name = 'studio lamp tripod brace';
      rod.position.copy(start).add(end).multiplyScalar(.5);
      rod.quaternion.setFromUnitVectors(new ctx.THREE.Vector3(0, 1, 0), end.sub(start).normalize());
      ctx.scene.add(rod);
    };
    supportRod(lampX - .38, lampZ);
    supportRod(lampX + .38, lampZ);
    supportRod(lampX, lampZ + .38);
    box('darkroom stool seat', 2.1, .72, -10.1, .78, .13, .72, '#6a4e67');
    for (const x of [1.82, 2.38]) for (const z of [-10.34, -9.86]) {
      box('darkroom stool leg', x, .35, z, .07, .66, .07, '#272b38');
    }

    // Framed sample prints and wall-mounted film canisters.
    for (let i = 0; i < 2; i++) {
      const x = 1.2 + i * .8;
      box('sample print frame', x, 3.15, -16.22, .62, .82, .06, '#80694e');
      box('sample print', x, 3.15, -16.178, .5, .68, .02,
        ['#426072', '#9b6454', '#758665', '#8a7190'][i]);
      box('sample print highlight', x, 3.18, -16.16, .34, .025, .012, '#d5bc8b');
    }
    for (let i = 0; i < 6; i++) {
      box('wall film canister', 4.79, 1.15 + i * .48, -9.3, .17, .32, .32,
        i % 2 ? '#b37c58' : '#536e7b');
    }

    // Narrow display shelves sit flush to the side walls and leave the center
    // of the lab, darkroom entrance, and poster wall clear.
    const shelf = (side, z, level) => {
      const x = side * 4.57;
      box('wall display shelf', x, level, z, .56, .09, 1.55, '#57463d');
      box('shelf front trim', x - side * .27, level + .055, z, .035, .045, 1.55, '#a87953');
      for (const offset of [-.55, .55]) {
        const bracket = box('shelf bracket', side * 4.76, level - .17, z + offset,
          .22, .34, .07, '#424958');
        bracket.rotation.z = side * -.28;
      }
    };
    shelf(-1, -8.2, 1.75);
    shelf(-1, -10.9, 2.55);
    shelf(-1, -13.55, 1.8);
    shelf(-1, -15.2, 3.25);
    shelf(1, -8.2, 2.05);
    shelf(1, -10.35, 3.15);

    // Four compact corner planters bring a little life into the lab while
    // leaving the right-hand doorway approach open.
    const planter = (x, z) => {
      const potMat = ctx.mat('#9b5948', .68, 0);
      const pot = new ctx.THREE.Mesh(new ctx.THREE.LatheGeometry([
        new ctx.THREE.Vector2(.19, 0), new ctx.THREE.Vector2(.24, .04),
        new ctx.THREE.Vector2(.3, .39), new ctx.THREE.Vector2(.34, .43),
        new ctx.THREE.Vector2(.33, .48), new ctx.THREE.Vector2(.26, .48),
        new ctx.THREE.Vector2(.25, .4), new ctx.THREE.Vector2(.2, .08),
        new ctx.THREE.Vector2(0, .08)
      ], 20), potMat);
      pot.name = 'terracotta planter';
      pot.position.set(x, .03, z);
      ctx.scene.add(pot);
      const soil = new ctx.THREE.Mesh(new ctx.THREE.CylinderGeometry(.255, .255, .035, 20),
        ctx.mat('#33291f', .98, 0));
      soil.name = 'planter soil'; soil.position.set(x, .47, z); ctx.scene.add(soil);

      const leafShape = new ctx.THREE.Shape();
      leafShape.moveTo(0, 0);
      leafShape.quadraticCurveTo(.2, .1, .23, .36);
      leafShape.quadraticCurveTo(.22, .5, .015, .68);
      leafShape.quadraticCurveTo(-.03, .42, -.16, .32);
      leafShape.quadraticCurveTo(-.19, .15, 0, 0);
      const leafGeometry = new ctx.THREE.ShapeGeometry(leafShape, 12);
      const greens = ['#3e7048', '#538451', '#668f53', '#3c6344'];
      const centralStem = new ctx.THREE.Mesh(
        new ctx.THREE.CylinderGeometry(.018, .035, 1.22, 8), ctx.mat('#567747', .86, 0)
      );
      centralStem.name = 'plant main stem';
      centralStem.position.set(x, 1.1, z);
      centralStem.rotation.z = x < 0 ? -.08 : .08;
      ctx.scene.add(centralStem);
      for (let leaf = 0; leaf < 8; leaf++) {
        const angle = leaf * Math.PI * 2 / 8 + (x < 0 ? .2 : 0);
        const height = .72 + Math.floor(leaf / 2) * .17;
        const direction = new ctx.THREE.Vector3(
          Math.cos(angle) * .82, .42 + (leaf % 3) * .08, Math.sin(angle) * .82
        ).normalize();
        const base = new ctx.THREE.Vector3(x, height, z);
        const tip = base.clone().addScaledVector(direction, .65);
        const branch = new ctx.THREE.Mesh(
          new ctx.THREE.CylinderGeometry(.009, .016, base.distanceTo(tip), 6),
          ctx.mat('#587748', .86, 0)
        );
        branch.name = 'plant leaf stem';
        branch.position.copy(base).add(tip).multiplyScalar(.5);
        branch.quaternion.setFromUnitVectors(new ctx.THREE.Vector3(0, 1, 0), direction);
        ctx.scene.add(branch);
        const blade = new ctx.THREE.Mesh(leafGeometry,
          new ctx.THREE.MeshStandardMaterial({ color: greens[leaf % greens.length], roughness: .82, side: ctx.THREE.DoubleSide }));
        blade.name = 'plant leaf';
        blade.position.copy(base);
        blade.quaternion.setFromUnitVectors(new ctx.THREE.Vector3(0, 1, 0), direction);
        blade.rotateY(angle * .18);
        const veinCurve = new ctx.THREE.CatmullRomCurve3([
          new ctx.THREE.Vector3(0, .015, .012),
          new ctx.THREE.Vector3(.025, .32, .012),
          new ctx.THREE.Vector3(.015, .65, .012)
        ]);
        const vein = new ctx.THREE.Mesh(new ctx.THREE.TubeGeometry(veinCurve, 6, .006, 5, false),
          new ctx.THREE.MeshBasicMaterial({ color: '#9bb47a' }));
        vein.name = 'leaf vein';
        blade.add(vein);
        ctx.scene.add(blade);
      }
    };
    planter(-4.35, -6.45);
    // Keep the entrance portal clear so the player can step through before
    // navigating around the furniture on the right side of the lab.
    planter(4.35, -8.1);
    planter(-4.35, -15.45);
    planter(4.55, -13.1);

  },
  interact(name, ctx) {
    const target = ({brightness:'brightness switch',photoCamera:'photo camera',wordlock:'word lock'})[name] || name;
    const s=ctx.getState(),v=ctx.visual;
    switch(target){
      case 'brightness switch':
        ctx.patchState({photoBright:!s.photoBright,...(!s.photoBright?{}:{cameraMode:false})});
        if(v.setBrightness)v.setBrightness(!s.photoBright);
        if (v.photoCameraBody?.parent?.userData.room02PickedUp) {
          const cameraGroup = v.photoCameraBody.parent;
          cameraGroup.visible = false;
          if (cameraGroup.userData.room02PickupMarker) cameraGroup.userData.room02PickupMarker.visible = false;
        }
        ctx.showToast(!s.photoBright?'Work light on. The camera is lit on the bench; aim at it and press E.':'Darkroom lights off.');break;
      case 'photo camera':
        ctx.patchState({cameraMode:true});if(v.setCameraMode)v.setCameraMode(true);
        if (v.photoCameraBody?.parent) {
          v.photoCameraBody.parent.userData.room02PickedUp = true;
          v.photoCameraBody.parent.visible = false;
          v.photoCameraBody.visible = false;
          if (v.photoCameraBody.parent.userData.room02PickupMarker) {
            v.photoCameraBody.parent.userData.room02PickupMarker.visible = false;
          }
        }
        ctx.showToast('Camera ready. Change lenses 1–5 to reveal details in the large painting. Press E to record each view.');break;
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
    ctx.setHint(s.photoFound.size===5?'All five details recorded. Enter FOCUS.':'Record all five painting details first.');
    ctx.openOverlay();
    document.querySelector('#wordlock-input')?.focus();
  },
  submitWord(ctx) {
    const s=ctx.getState();
    if(s.photoFound.size<5){ctx.setHint('Record all five painting details first.');return false;}
    if(ctx.value!=='FOCUS'){ctx.setHint('That combination does not fit.');return false;}
    ctx.patchState({photoWordUnlocked:true});ctx.unlockDoor();ctx.update();ctx.showToast('The latch releases.');ctx.restoreLook();return true;
  }
};
