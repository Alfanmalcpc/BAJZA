/* BAJA shared WebGL avatar renderer. The same mesh/material pipeline is used by profile, settings and shop. */
window.renderBajaCharacter3D = function(host, character = {}, options = {}) {
  if (!host || !window.THREE) return null;
  host.innerHTML = '';
  const canvas = document.createElement('canvas');
  canvas.className = 'baja-avatar-3d-canvas';
  host.appendChild(canvas);
  host.style.position = 'relative'; host.style.overflow = 'hidden';
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, .1, 100); camera.position.set(0,1.5,5.6);
  const renderer = new THREE.WebGLRenderer({canvas, antialias:true, alpha:true});
  renderer.setPixelRatio(Math.min(devicePixelRatio,2)); renderer.outputColorSpace=THREE.SRGBColorSpace;
  const root = new THREE.Group(); root.position.y=-.62; scene.add(root);
  scene.add(new THREE.HemisphereLight(0xffffff,0x202040,2.2));
  const key=new THREE.DirectionalLight(0xffffff,3); key.position.set(3,5,4); scene.add(key);
  const rim=new THREE.PointLight(0x00e5ff,7,8); rim.position.set(-3,2,2); scene.add(rim);
  const material=(color,metal=0,rough=.42)=>new THREE.MeshStandardMaterial({color,metalness:metal,roughness:rough});
  const skin=material(0xf2b28d), hair=material(0x172033,.1,.28), shoes=material(0x334155,.2), blue=material(0x2563eb), gold=material(0xfacc15,.65,.2);
  const mk=(geometry,mat,pos,scale,parent=root)=>{const m=new THREE.Mesh(geometry,mat);m.position.set(...pos);if(scale)m.scale.set(...scale);m.castShadow=true;parent.add(m);return m;};
  mk(new THREE.SphereGeometry(.66,32,24),skin,[0,1.5,0],[1,.98,.9]);
  mk(new THREE.SphereGeometry(.7,32,20,0,Math.PI*2,0,Math.PI*.55),hair,[0,1.88,0],[1.03,.75,.95]);
  mk(new THREE.SphereGeometry(.12,16,12),hair,[-.23,1.5,-.59],[1,.75,.5]); mk(new THREE.SphereGeometry(.12,16,12),hair,[.23,1.5,-.59],[1,.75,.5]);
  const outfitColor=character.outfit==='sunset-pink'?0xec4899:character.outfit==='mint-hoodie'?0x10b981:0x2563eb;
  const body=mk(new THREE.SphereGeometry(.58,28,18),material(outfitColor),[0,.56,0],[1.05,.92,.72]);
  mk(new THREE.CapsuleGeometry(.14,.62,10,16),skin,[-.68,.55,0]); mk(new THREE.CapsuleGeometry(.14,.62,10,16),skin,[.68,.55,0]);
  mk(new THREE.CapsuleGeometry(.18,.65,10,16),body.material,[-.25,-.07,0]); mk(new THREE.CapsuleGeometry(.18,.65,10,16),body.material,[.25,-.07,0]);
  const footA=mk(new THREE.SphereGeometry(.25,20,14),shoes,[-.28,-.47,-.08],[1.35,.6,1.5]); const footB=mk(new THREE.SphereGeometry(.25,20,14),shoes,[.28,-.47,-.08],[1.35,.6,1.5]);
  const decor=new THREE.Group(); root.add(decor); const color=(v)=>material(v||0x94a3b8,.2,.35);
  if(character.headwear && character.headwear!=='none') mk(new THREE.ConeGeometry(.4,.45,6),color(character.headwear==='crown'?0xfacc15:0x60a5fa),[0,2.3,0],null,decor);
  if(character.eyewear && character.eyewear!=='none'){const g=new THREE.Group();decor.add(g);const m=color(0x172033);mk(new THREE.TorusGeometry(.18,.04,12,20),m,[-.23,1.5,-.62],[1,.8,1],g);mk(new THREE.TorusGeometry(.18,.04,12,20),m,[.23,1.5,-.62],[1,.8,1],g);mk(new THREE.BoxGeometry(.24,.04,.04),m,[0,1.5,-.62],null,g);}
  if(character.backItem && character.backItem!=='none') mk(new THREE.BoxGeometry(.7,.82,.22),color(0xec4899),[0,.68,.58],null,decor);
  if(character.footwear && character.footwear!=='basic-shoes'){const m=color(0xec4899);footA.material=m;footB.material=m;}
  const resize=()=>{const r=host.getBoundingClientRect();const w=Math.max(1,r.width),h=Math.max(1,r.height);renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}; resize(); window.addEventListener('resize',resize);
  let down=false,lastX=0,rotY=0; canvas.addEventListener('pointerdown',e=>{down=true;lastX=e.clientX;canvas.setPointerCapture(e.pointerId)}); canvas.addEventListener('pointermove',e=>{if(down){rotY+=(e.clientX-lastX)*.012;lastX=e.clientX}}); canvas.addEventListener('pointerup',()=>down=false);
  const tick=()=>{root.rotation.y+=(rotY-root.rotation.y)*.1;renderer.render(scene,camera);requestAnimationFrame(tick)};tick();
  return {scene,renderer,root,dispose(){renderer.dispose();host.innerHTML='';}};
};