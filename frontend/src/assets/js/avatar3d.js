/* BAJA shared glTF avatar renderer. The two self-contained glTF assets are
 * loaded for profile, settings, navigation and the Avatar Shop. */
(function () {
  const MODEL_ROOT = '/src/assets/models/';
  const DEFAULT_CHARACTER = { gender: 'male', skin: '#f2b28d', outfit: 'basic-blue', headwear: 'none', eyewear: 'none', backItem: 'none', footwear: 'basic-shoes' };
  const cache = new Map();
  const item = (type, id) => (window.BAJA_CATALOG && window.BAJA_CATALOG[type] && window.BAJA_CATALOG[type][id]) || {};
  const makeColor = (value, fallback = '#ffffff') => new THREE.Color(value || fallback);

  function decodeDataUri(uri) {
    const encoded = String(uri || '').split(',')[1] || '';
    const binary = atob(encoded); const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes.buffer;
  }
  function readAccessor(gltf, accessorIndex, buffer) {
    const accessor = gltf.accessors[accessorIndex]; const view = gltf.bufferViews[accessor.bufferView];
    const components = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 }[accessor.type];
    const offset = (view.byteOffset || 0) + (accessor.byteOffset || 0);
    const count = accessor.count * components;
    const Typed = accessor.componentType === 5126 ? Float32Array : Uint16Array;
    return { data: new Typed(buffer, offset, count), components };
  }
  async function loadModel(gender) {
    const key = gender === 'female' ? 'female' : 'male';
    if (!cache.has(key)) cache.set(key, fetch(`${MODEL_ROOT}${key}.gltf`, { cache: 'force-cache' }).then(response => {
      if (!response.ok) throw new Error(`Avatar ${key} tidak dapat dimuat (${response.status})`);
      return response.json();
    }));
    const gltf = await cache.get(key); const buffer = decodeDataUri(gltf.buffers[0].uri);
    const materials = (gltf.materials || []).map(m => {
      const pbr = m.pbrMetallicRoughness || {}; const c = pbr.baseColorFactor || [1, 1, 1, 1];
      return new THREE.MeshStandardMaterial({ color: new THREE.Color(c[0], c[1], c[2]), roughness: pbr.roughnessFactor ?? .5, metalness: pbr.metallicFactor ?? 0, transparent: c[3] < 1, opacity: c[3] ?? 1 });
    });
    const model = new THREE.Group(); model.name = `${key}-gltf-avatar`;
    (gltf.nodes || []).forEach(node => {
      if (node.mesh === undefined) return;
      const definition = gltf.meshes[node.mesh];
      (definition.primitives || []).forEach(primitive => {
        const position = readAccessor(gltf, primitive.attributes.POSITION, buffer); const normal = readAccessor(gltf, primitive.attributes.NORMAL, buffer);
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(position.data, position.components));
        geometry.setAttribute('normal', new THREE.BufferAttribute(normal.data, normal.components));
        if (primitive.indices !== undefined) { const index = readAccessor(gltf, primitive.indices, buffer); geometry.setIndex(new THREE.BufferAttribute(index.data, 1)); }
        geometry.computeBoundingSphere();
        const mesh = new THREE.Mesh(geometry, (materials[primitive.material] || materials[0]).clone());
        mesh.name = node.name || definition.name || 'avatar-part'; mesh.castShadow = true; mesh.receiveShadow = true; model.add(mesh);
      });
    });
    model.userData.gender = key; return model;
  }
  function makeAccessory(character, model) {
    const group = new THREE.Group(); group.name = 'character-accessories';
    const material = (hex, metal = 0, rough = .38) => new THREE.MeshStandardMaterial({ color: makeColor(hex), metalness: metal, roughness: rough });
    const add = (geometry, mat, position, scale, name) => { const mesh = new THREE.Mesh(geometry, mat); mesh.position.set(...position); if (scale) mesh.scale.set(...scale); mesh.name = name; mesh.castShadow = true; mesh.receiveShadow = true; group.add(mesh); return mesh; };
    const head = item('headwear', character.headwear), eyes = item('eyewear', character.eyewear), back = item('backItem', character.backItem), footwear = item('footwear', character.footwear);
    const variant = head.variant || eyes.variant || back.variant || footwear.variant || 1;
    if (character.headwear && character.headwear !== 'none') {
      const h = material(head.color || (character.headwear === 'crown' ? '#facc15' : '#8b5cf6'), character.headwear === 'crown' ? .65 : .08, .3);
      if (character.headwear === 'cat-hood') {
        add(new THREE.SphereGeometry(.70, 24, 16), h, [0, 2.02, 0], [1, .6, .92], 'cat-hood');
        add(new THREE.ConeGeometry(.23, .34, 3), h, [-.40, 2.48, 0], null, 'cat-ear-left'); add(new THREE.ConeGeometry(.23, .34, 3), h, [.40, 2.48, 0], null, 'cat-ear-right');
      } else if (character.headwear === 'crown' || variant % 3 === 0) { const crown = add(new THREE.ConeGeometry(.43, .42, 5), h, [0, 2.42, 0], null, 'headwear'); crown.rotation.y = Math.PI / 4; }
      else add(new THREE.TorusGeometry(.48, .075, 14, 28), h, [0, 2.20, 0], [1, .7, 1], 'headwear');
    }
    if (character.eyewear && character.eyewear !== 'none') {
      const g = material(eyes.color || '#172033', .25, .22); const shape = variant % 3 === 0 ? new THREE.BoxGeometry(.32, .16, .075) : new THREE.TorusGeometry(.19, .042, 12, 24);
      add(shape, g, [-.23, 1.55, -.642], [1, .82, 1], 'eyewear-left'); add(shape.clone(), g, [.23, 1.55, -.642], [1, .82, 1], 'eyewear-right'); add(new THREE.BoxGeometry(.24, .045, .045), g, [0, 1.55, -.642], null, 'eyewear-bridge');
    }
    if (character.backItem && character.backItem !== 'none') {
      const b = material(back.color || '#ec4899', .12, .42); add(new THREE.BoxGeometry(.68 + (variant % 4) * .04, .80 + (variant % 3) * .05, .22), b, [0, .72, .55], null, 'back-item');
      add(new THREE.TorusGeometry(.26, .045, 12, 24), b, [-.28, .94, .48], null, 'back-strap-left'); add(new THREE.TorusGeometry(.26, .045, 12, 24), b, [.28, .94, .48], null, 'back-strap-right');
    }
    if (character.footwear && character.footwear !== 'basic-shoes') {
      const shoes = material(footwear.color || '#ec4899', .15, .27); model.traverse(object => { if (object.isMesh && /shoe/i.test(object.name)) object.material = shoes.clone(); });
    }
    return group;
  }
  function setOutfit(model, character) {
    const outfit = item('outfits', character.outfit); const outfitColor = makeColor(outfit.color || '#2563eb');
    model.traverse(object => { if (object.isMesh && /torso|arm|leg|skirt/i.test(object.name)) object.material.color.copy(outfitColor); });
  }
  function createRenderer(host) {
    const canvas = host.querySelector('canvas') || document.createElement('canvas'); if (!canvas.parentNode) host.appendChild(canvas); canvas.className = 'baja-avatar-3d-canvas';
    host.style.position = 'relative'; host.style.overflow = 'hidden';
    const scene = new THREE.Scene(); const camera = new THREE.PerspectiveCamera(31, 1, .1, 100); const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.shadowMap.enabled = true;
    const root = new THREE.Group(); root.position.y = -.57; scene.add(root); scene.add(new THREE.HemisphereLight(0xffffff, 0x18233b, 2.1));
    const key = new THREE.DirectionalLight(0xffffff, 3.3); key.position.set(3, 5, 4); key.castShadow = true; scene.add(key); const rim = new THREE.PointLight(0x00e5ff, 7, 8); rim.position.set(-3, 2.2, 2); scene.add(rim);
    const state = { distance: 5.8, rotY: 0, rotX: 0, down: false, x: 0, y: 0, character: { ...DEFAULT_CHARACTER }, disposed: false, model: null, accessories: null };
    const controller = {
      update(character) {
        state.character = { ...DEFAULT_CHARACTER, ...(character || {}) }; const gender = state.character.gender === 'female' ? 'female' : 'male';
        if (state.model?.userData.gender === gender) { setOutfit(state.model, state.character); state.accessories?.removeFromParent(); state.accessories = makeAccessory(state.character, state.model); root.add(state.accessories); return; }
        loadModel(gender).then(model => { if (state.disposed || (state.character.gender === 'female' ? 'female' : 'male') !== gender) return; if (state.model) { state.model.traverse(object => { if (object.geometry) object.geometry.dispose(); if (object.material) object.material.dispose(); }); root.remove(state.model); }
          state.model = model; setOutfit(model, state.character); root.add(model); state.accessories?.removeFromParent(); state.accessories = makeAccessory(state.character, model); root.add(state.accessories);
        }).catch(error => { console.warn('[BAJA Avatar] glTF gagal dimuat:', error.message); host.dataset.avatarError = 'true'; });
      },
      setZoom(delta) { state.distance = Math.max(3.25, Math.min(9.5, state.distance + delta)); camera.position.z = -state.distance; camera.lookAt(0, 1, 0); },
      resetZoom() { state.distance = 5.8; camera.position.z = -state.distance; camera.lookAt(0, 1, 0); },
      dispose() { state.disposed = true; renderer.dispose(); host.__bajaAvatar = null; }
    };
    const resize = () => { const rect = host.getBoundingClientRect(); const width = Math.max(1, rect.width), height = Math.max(1, rect.height); renderer.setSize(width, height, false); camera.aspect = width / height; camera.updateProjectionMatrix(); }; resize(); window.addEventListener('resize', resize);
    canvas.addEventListener('wheel', event => { event.preventDefault(); controller.setZoom(event.deltaY > 0 ? .45 : -.45); }, { passive: false });
    canvas.addEventListener('pointerdown', event => { state.down = true; state.x = event.clientX; state.y = event.clientY; canvas.setPointerCapture(event.pointerId); });
    canvas.addEventListener('pointermove', event => { if (!state.down) return; state.rotY += (event.clientX - state.x) * .012; state.rotX = Math.max(-.45, Math.min(.45, state.rotX + (event.clientY - state.y) * .008)); state.x = event.clientX; state.y = event.clientY; });
    canvas.addEventListener('pointerup', () => { state.down = false; }); canvas.addEventListener('pointercancel', () => { state.down = false; }); controller.setZoom(0);
    const tick = () => { if (state.disposed) return; root.rotation.y += (state.rotY - root.rotation.y) * .10; root.rotation.x += (state.rotX - root.rotation.x) * .10; renderer.render(scene, camera); requestAnimationFrame(tick); }; tick();
    return { scene, camera, renderer, root, controls: controller, update: controller.update, dispose: controller.dispose };
  }
  window.renderBajaCharacter3D = function (host, character = {}, options = {}) { if (!host || !window.THREE) return null; const renderer = host.__bajaAvatar || (host.__bajaAvatar = createRenderer(host)); renderer.update(character); return renderer; };
})();
