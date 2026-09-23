// The building (23 Sep 2026): the office seen from outside — one wide glass office block in a park, one storey per floor of work,
// each storey's name on its white band. Its own scene and perspective camera; main.js renders it when the lift is on ▦.
import * as THREE from 'three';

const L = 72;        // length along the street
const D = 24;        // depth
const GLASS = 4.2;   // glass height per storey
const BAND = 1.5;    // white spandrel band under each storey
const S = GLASS + BAND;

function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}
// one storey of curtain wall: a pale upper strip, deep teal vision glass, a mullion every panel
function glassTex(seed) {
  let r = seed; const rnd = () => (r = (r * 9301 + 49297) % 233280) / 233280;
  const t = canvasTex(1024, 256, (x, w, h) => {
    const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#A9CFD3'); g.addColorStop(0.3, '#8DB8BF'); g.addColorStop(0.31, '#1F3E48'); g.addColorStop(1, '#0E2029');
    x.fillStyle = g; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 18; i++) { x.fillStyle = `rgba(190,225,235,${0.05 + rnd() * 0.12})`; x.fillRect(Math.floor(rnd() * 16) * 64, h * 0.31, 64 * (1 + Math.floor(rnd() * 3)), h * 0.69); } // sky caught in some panes
    x.fillStyle = 'rgba(255,255,255,.55)'; x.fillRect(0, h * 0.3 - 2, w, 4);
    for (let px = 0; px < w; px += 64) { x.fillStyle = 'rgba(220,232,236,.8)'; x.fillRect(px, 0, 4, h); x.fillStyle = 'rgba(0,0,0,.3)'; x.fillRect(px + 4, 0, 2, h); }
  });
  t.wrapS = THREE.RepeatWrapping; t.repeat.x = L / 16;
  return t;
}
// letterspaced serif sign, the canvas cut to the text so the plane's aspect is the text's
function sign(text, ink, h) {
  const px = 96, sp = 18, c0 = document.createElement('canvas').getContext('2d');
  c0.font = `600 ${px}px Georgia, "Times New Roman", serif`;
  const tw = [...text].reduce((t, c) => t + c0.measureText(c).width + sp, -sp) + 24;
  const tex = canvasTex(Math.ceil(tw), 128, (x, w, hh) => {
    x.font = c0.font; x.fillStyle = ink; x.textBaseline = 'middle'; let cx = 12;
    for (const c of text) { x.fillText(c, cx, hh / 2 + 4); cx += x.measureText(c).width + sp; }
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(h * tw / 128, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
  m.renderOrder = 2;
  return m;
}
// the corner block's white stone cladding
const tiles = () => { const t = canvasTex(256, 256, (x, w, h) => { x.fillStyle = '#ECEAE4'; x.fillRect(0, 0, w, h); x.fillStyle = 'rgba(0,0,0,.09)'; for (let i = 0; i < w; i += 64) { x.fillRect(i, 0, 2, h); x.fillRect(0, i, w, 2); } });
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 8); return t; };
// the directory banner: the name up top, then one row per floor, level with that floor
const BW = 11; // banner width
function directory(T, H, zones) {
  const PX = 96, cw = BW * PX, ch = Math.round(H * PX), yOf = wy => ch - (wy - 0.6) * PX;
  return canvasTex(cw, ch, (x, w, h) => {
    const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#1B2327'); g.addColorStop(1, '#10161A'); x.fillStyle = g; x.fillRect(0, 0, w, h);
    x.strokeStyle = '#C9A96A'; x.lineWidth = 6; x.strokeRect(22, 22, w - 44, h - 44);
    x.fillStyle = '#F3EFE6'; x.textAlign = 'center'; x.textBaseline = 'middle';
    let px = 150; do { x.font = `600 ${px}px Georgia, "Times New Roman", serif`; px -= 6; } while (x.measureText(T.name.toUpperCase()).width > w * 0.8);
    x.fillText(T.name.toUpperCase(), w / 2, 190);
    x.fillStyle = '#C9A96A'; x.fillRect(w / 2 - 90, 290, 180, 5);
    x.font = '500 34px Helvetica, Arial, sans-serif'; x.fillStyle = 'rgba(243,239,230,.7)'; x.fillText('D I R E C T O R Y', w / 2, 350);
    T.floors.forEach((f, i) => {
      const z = zones[i], cy = yOf((z.y0 + z.y1) / 2);
      x.strokeStyle = 'rgba(201,169,106,.45)'; x.lineWidth = 2; x.beginPath(); x.moveTo(60, cy - 150); x.lineTo(w - 60, cy - 150); x.stroke();
      x.fillStyle = '#C9A96A'; x.beginPath(); x.arc(150, cy - 20, 80, 0, Math.PI * 2); x.fill();
      x.fillStyle = '#10161A'; x.font = '700 92px Georgia, serif'; x.fillText(i ? String(i) : 'G', 150, cy - 14);
      x.textAlign = 'left'; x.fillStyle = '#F3EFE6';
      let fp = 120; do { x.font = `700 ${fp}px Helvetica, Arial, sans-serif`; fp -= 4; } while (x.measureText(f.name.toUpperCase()).width > w - 340);
      x.fillText(f.name.toUpperCase(), 270, cy - 48);
      x.font = '400 44px Helvetica, Arial, sans-serif'; x.fillStyle = 'rgba(243,239,230,.7)';
      const sub = (f.sub || '').split(' · '); x.fillText(sub.slice(0, 3).join(' · '), 270, cy + 30); if (sub.length > 3) x.fillText(sub.slice(3).join(' · '), 270, cy + 84);
      x.textAlign = 'center';
    });
  });
}
const sky = () => canvasTex(1024, 512, (x, w, h) => {
  const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#3E7CC4'); g.addColorStop(0.65, '#9CC4E8'); g.addColorStop(1, '#E4EEF5');
  x.fillStyle = g; x.fillRect(0, 0, w, h);
  let r = 7; const rnd = () => (r = (r * 9301 + 49297) % 233280) / 233280;
  for (let c = 0; c < 9; c++) { // soft clouds
    const cx = rnd() * w, cy = h * (0.12 + rnd() * 0.45), s = 30 + rnd() * 50;
    for (let k = 0; k < 9; k++) {
      const px = cx + (rnd() - 0.5) * s * 3, py = cy + (rnd() - 0.5) * s * 0.7, pr = s * (0.5 + rnd() * 0.6);
      const rg = x.createRadialGradient(px, py, 0, px, py, pr); rg.addColorStop(0, 'rgba(255,255,255,.85)'); rg.addColorStop(1, 'rgba(255,255,255,0)');
      x.fillStyle = rg; x.fillRect(px - pr, py - pr, pr * 2, pr * 2);
    }
  }
});

export function initTower(renderer) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 1, 3000);
  scene.background = sky();
  const env = sky(); env.mapping = THREE.EquirectangularReflectionMapping;
  scene.environment = new THREE.PMREMGenerator(renderer).fromEquirectangular(env).texture;
  scene.fog = new THREE.Fog('#DCE8F0', 260, 700);

  scene.add(new THREE.HemisphereLight(0xe4f0ff, 0x6f7a5a, 0.75));
  const sun = new THREE.DirectionalLight(0xfff2e0, 2.0);
  sun.position.set(70, 110, 90); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -110, right: 110, top: 110, bottom: -110, far: 400 }); sun.shadow.bias = -0.0005;
  scene.add(sun);

  const M = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, ...o });
  const white = M('#EEECE6', { roughness: 0.6 }), tile = new THREE.MeshStandardMaterial({ map: tiles(), roughness: 0.55 }), plate = M('#FAFAF7', { roughness: 0.4 }), paving = M('#C9C6BE'), lawn = M('#6E9A4B'), hedgeM = M('#3F6B32'), trunk = M('#6B5040'),
    dark = M('#1C2A30', { roughness: 0.35, metalness: 0.4 }), road = M('#8C8F92'), metal = M('#D8DDE0', { metalness: 0.6, roughness: 0.35 });
  const add = (g, m, x, y, z, parent = scene) => { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; parent.add(o); return o; };
  const box = (w, h, d, m, x, y, z, p) => add(new THREE.BoxGeometry(w, h, d), m, x, y + h / 2, z, p);

  /* ---------- the park: lawn, a plaza and drive in front, hedges, trees and lamps ---------- */
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(1600, 1600), lawn); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
  box(L + 30, 0.12, D + 16, paving, 0, 0, 0);            // the building's apron
  box(L + 30, 0.1, 12, road, 0, 0, D / 2 + 16);          // the drive along the front
  box(10, 0.14, 26, paving, -L / 2 + 10, 0, D / 2 + 20); // the path to the entrance
  const hedge = new THREE.BoxGeometry(1, 1.3, 1.6);
  for (const [x, z, len] of [[-L / 2 - 6, D / 2 + 9, 16], [12, D / 2 + 9, 52], [-L / 2 - 6, D / 2 + 23, 16], [12, D / 2 + 23, 52]]) add(hedge, hedgeM, x, 0.65, z).scale.x = len;
  const crown = [new THREE.IcosahedronGeometry(3.2, 1), new THREE.IcosahedronGeometry(2.4, 1)], stem = new THREE.CylinderGeometry(0.35, 0.5, 4, 8);
  const leaves = ['#4F7F3A', '#5E8F43', '#3E6B2F', '#6C9A48'].map(c => M(c, { flatShading: true }));
  let r = 3; const rnd = () => (r = (r * 9301 + 49297) % 233280) / 233280;
  const tree = (x, z, s = 1) => { const t = add(stem, trunk, x, 2 * s, z); t.scale.setScalar(s); const c = add(crown[rnd() < 0.5 ? 0 : 1], leaves[Math.floor(rnd() * 4)], x, (5 + rnd()) * s, z); c.scale.setScalar(s * (0.9 + rnd() * 0.4)); };
  for (let x = -L / 2 - 8; x <= L / 2 + 8; x += 9) { tree(x + rnd() * 2, D / 2 + 34 + rnd() * 3, 0.55); tree(x + 4 + rnd() * 2, -D / 2 - 14 - rnd() * 6, 1.2); } // low garden trees in front, tall ones behind
  for (let z = -D / 2 - 10; z <= D / 2 + 30; z += 8) { tree(-L / 2 - 22 - rnd() * 4, z, 1.1); tree(L / 2 + 22 + rnd() * 4, z, 1.1); }
  for (let i = 0; i < 40; i++) { const a = Math.PI + (rnd() - 0.5) * Math.PI * 1.4, d = 95 + rnd() * 120; // behind and to the sides, never between the camera and the door
    tree(Math.cos(a) * d, Math.sin(a) * d, 1 + rnd() * 0.6); } // the park beyond
  const pole = new THREE.CylinderGeometry(0.12, 0.16, 5, 6), bulb = new THREE.SphereGeometry(0.45, 12, 8), glow = M('#FFFFFF', { emissive: '#FFF6DD', emissiveIntensity: 0.5 });
  for (let x = -L / 2; x <= L / 2 + 10; x += 12) { add(pole, dark, x, 2.5, D / 2 + 10); add(bulb, glow, x, 5.2, D / 2 + 10); }

  /* ---------- the building ---------- */
  const bld = new THREE.Group(); scene.add(bld);
  let hits = [], zones = [], height = 0;
  function build(T) {
    bld.clear(); hits = []; zones = [];
    const n = T.floors.length;
    box(L, 0.9, D, white, 0, 0, 0, bld); // plinth
    T.floors.forEach((f, i) => {
      const y = 0.9 + i * S, out = i * 0.9; // each storey steps a little further out over the one below, as in the photo
      const gm = new THREE.MeshStandardMaterial({ map: glassTex(11 + i), metalness: 0.6, roughness: 0.06, envMapIntensity: 0.6, emissive: '#F2D98A', emissiveIntensity: 0 });
      const glass = box(L - 1, GLASS, D - 1 + out, [gm, gm, dark, dark, gm, gm], 0, y, out / 2, bld); glass.userData.floor = i; hits.push(glass);
      const band = box(L + 0.4, BAND, D + 0.4 + out, white, 0, y + GLASS, out / 2, bld); band.userData.floor = i; hits.push(band);
      zones.push({ i, y0: y, y1: y + S, f });
    });
    const top = 0.9 + n * S, reach = n * 0.9;
    box(L + 5, 2, D + 5 + reach, white, 0, top, reach / 2, bld);                   // the roof canopy, overhanging
    box(L + 5.4, 0.25, D + 5.4 + reach, metal, 0, top + 2, reach / 2, bld);
    box(L * 0.4, 2.6, D * 0.5, white, 4, top + 2.2, -2, bld);                      // plant room on the roof
    // the corner block, forward at the front-right like the photo, carries the building's directory banner
    const CX = L / 2 + 6.5, CZ = D / 2 - 3 + reach, CH = top + 7;
    box(14, CH, 10, tile, CX, 0, CZ, bld);
    const bn = new THREE.Mesh(new THREE.PlaneGeometry(BW, CH - 2), new THREE.MeshStandardMaterial({ map: directory(T, CH - 2, zones), roughness: 0.35, metalness: 0.2 }));
    bn.position.set(CX, (CH - 2) / 2 + 0.6, CZ + 5.06); bn.castShadow = true; bld.add(bn);
    box(BW + 0.6, 0.3, 0.5, metal, CX, CH - 1.5, CZ + 5, bld); box(BW + 0.6, 0.3, 0.5, metal, CX, 0.3, CZ + 5, bld); // the banner's rails
    const nm = sign(T.name.toUpperCase(), '#1E2629', 1.5); nm.position.set(-L / 4, top + 1, D / 2 + 2.5 + reach + 0.05); bld.add(nm); // the name on the canopy
    // the entrance: a flat canopy on two posts over the drive, steps up to the doors
    box(14, 0.5, 11, white, -L / 2 + 10, 5.2, D / 2 + 5, bld);
    for (const dx of [-5, 5]) box(0.7, 5.2, 0.7, metal, -L / 2 + 10 + dx, 0, D / 2 + 10, bld);
    for (let s = 0; s < 3; s++) box(12, 0.3, 1.2, paving, -L / 2 + 10, s * 0.3, D / 2 + 1.2 + (2 - s) * 1.2, bld);
    height = top;
  }

  const view = { ang: 0.22, base: 0.22, dist: 160, idle: 0 };
  function tick(dt) {
    view.idle += dt; if (view.idle > 6) view.ang = view.base + Math.sin((view.idle - 6) * 0.05) * 0.2; // a slow sway once left alone
    camera.position.set(Math.sin(view.ang) * view.dist, 10 + view.dist * 0.14, Math.cos(view.ang) * view.dist);
    camera.lookAt(8, height * 0.5, 0);
  }
  const ray = new THREE.Raycaster();
  function pick(nx, ny) { ray.setFromCamera(new THREE.Vector2(nx, ny), camera); const h = ray.intersectObjects(hits, false)[0]; return h ? h.object.userData.floor : null; }
  function hover(i) {
    hits.forEach(b => { if (Array.isArray(b.material)) b.material[0].emissiveIntensity = b.userData.floor === i ? 0.3 : 0; });
  }
  return {
    scene, camera, build, tick, pick, hover,
    resize: (w, h, panel = 0) => { camera.aspect = w / h; camera.setViewOffset(w, h, panel / 2, 0, w, h); camera.updateProjectionMatrix(); }, // centred in what the task panel leaves
    orbit: dx => { view.base = view.ang -= dx * 0.005; view.idle = 0; },
    zoom: f => { view.dist = Math.max(70, Math.min(260, view.dist / f)); view.idle = 0; },
  };
}
