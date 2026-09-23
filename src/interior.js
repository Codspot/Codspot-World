// A floor of the building (23 Sep 2026): the pods sit inside a real office — a tiled floor slab, glass window walls with
// mullions on the two far sides (the near sides are cut away so the iso camera looks in), columns, plants, a lounge corner
// and the floor's name on the wall. One group per visit; main.js builds it when the lift stops at a floor.
import * as THREE from 'three';
import { rbox, mat, makePlant, makeChair } from './builders.js';

const H = 13; // floor-to-ceiling
export const ROOM_ROW = 22, ROOM_W = 20; // the row of rooms facilities fits along the back wall: its depth, and each room's width

function tex(w, h, draw, rx = 1, ry = 1) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); return t;
}
function wallSign(text, width) {
  const c = document.createElement('canvas'); c.width = 2048; c.height = 256;
  const x = c.getContext('2d'); x.fillStyle = '#2A2F31'; x.textBaseline = 'middle';
  let px = 150; do { x.font = `600 ${px}px Georgia, "Times New Roman", serif`; px -= 6; } while (x.measureText(text).width + text.length * 22 > 1900);
  let cx = 40; for (const ch of text) { x.fillText(ch, cx, 136); cx += x.measureText(ch).width + 22; }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return new THREE.Mesh(new THREE.PlaneGeometry(width, width / 8), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false }));
}

function handleSign(handle, about, width) { // the channel's handle and one line about it, painted on its backdrop
  const c = document.createElement('canvas'); c.width = 1024; c.height = 320; const x = c.getContext('2d');
  x.fillStyle = '#FFFFFF'; x.textAlign = 'center'; x.textBaseline = 'middle';
  let px = 130; do { x.font = `700 ${px}px Helvetica, Arial, sans-serif`; px -= 4; } while (x.measureText(handle).width > 960);
  x.fillText(handle, 512, 120);
  px = 44; do { x.font = `400 ${px}px Helvetica, Arial, sans-serif`; px -= 2; } while (x.measureText(about).width > 960 && px > 22);
  x.globalAlpha = 0.85; x.fillText(about, 512, 240);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return new THREE.Mesh(new THREE.PlaneGeometry(width, width * 320 / 1024), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false }));
}

export function makeInterior({ x0, x1, z0, z1 }, title, places = [], rooms = []) {
  const g = new THREE.Group(), W = x1 - x0, D = z1 - z0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  // the slab: white concrete edge, pale stone tiles on top
  const tiles = tex(256, 256, (x, w, h) => { x.fillStyle = '#E6E2D8'; x.fillRect(0, 0, w, h); x.fillStyle = 'rgba(0,0,0,.06)'; x.fillRect(0, 0, w, 3); x.fillRect(0, 0, 3, h); }, W / 6, D / 6);
  const slab = rbox(W, D, 1.4, '#F4F3EE', 0.3); slab.position.set(cx, -1.46, cz); g.add(slab);
  const top = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.4, D - 0.4), new THREE.MeshStandardMaterial({ map: tiles, roughness: 0.7 }));
  top.rotation.x = -Math.PI / 2; top.position.set(cx, -0.05, cz); top.receiveShadow = true; g.add(top);

  // the far walls: floor-to-ceiling glass between white mullions, a sill and a head
  const glass = new THREE.MeshStandardMaterial({ color: '#BCD9E4', roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.35, depthWrite: false });
  const frame = mat('#F7F7F2'), steel = mat('#DADFE2', { metal: 0.4, rough: 0.4 });
  const wall = (len, along) => { // along 'x' → the wall at z0 · 'z' → the wall at x0
    const w = new THREE.Group();
    const pane = new THREE.Mesh(new THREE.PlaneGeometry(len, H), glass); pane.position.y = H / 2; w.add(pane);
    const sill = rbox(len, 1.0, 0.9, frame, 0.1); sill.position.set(0, -0.05, 0); sill.rotation.x = 0; w.add(sill);
    const head = rbox(len, 1.0, 0.9, frame, 0.1); head.position.set(0, H - 0.9, 0); w.add(head);
    for (let u = -len / 2; u <= len / 2 + 0.01; u += 6) { const m = rbox(0.3, 0.5, H, steel, 0.05); m.position.set(u, 0, 0); w.add(m); }
    if (along === 'x') w.position.set(cx, 0, z0 + 0.3); else { w.rotation.y = Math.PI / 2; w.position.set(x0 + 0.3, 0, cz); }
    return w;
  };
  g.add(wall(W, 'x'), wall(D, 'z'));
  // structure: a column at the far corner and along both glass walls
  const col = (x, z) => { const c = rbox(1.4, 1.4, H, frame, 0.2); c.position.set(x, 0, z); g.add(c); };
  col(x0 + 1, z0 + 1);
  for (let x = x0 + 24; x < x1 - 4; x += 24) col(x, z0 + 1);
  for (let z = z0 + 24; z < z1 - 4; z += 24) col(x0 + 1, z);

  // the floor's name on the back wall, above the glass line
  const s = wallSign(title.toUpperCase(), Math.min(W * 0.6, 40)); s.position.set(cx, H + 2.4, z0 + 0.65); g.add(s);
  const band = rbox(Math.min(W * 0.6, 40) + 4, 0.6, 6.2, frame, 0.1); band.position.set(cx, H - 0.1, z0 + 0.3); g.add(band);

  // lounge in the far corner: sofa, coffee table, rug, plants
  const L = new THREE.Group(); L.position.set(x0 + 7, 0, z0 + 7); g.add(L);
  const rug = rbox(10, 8, 0.06, '#C9BFAE', 0.2); rug.position.set(0.5, -0.02, 0.5); L.add(rug);
  const seat = rbox(8, 2.6, 1.1, '#5B6770', 0.4); seat.position.set(0.5, 0, -2.2); L.add(seat);
  const back = rbox(8, 0.8, 2.2, '#4F5A63', 0.3); back.position.set(0.5, 0, -3.3); L.add(back);
  const side = rbox(2.6, 5, 1.1, '#5B6770', 0.4); side.position.set(-3.4, 0, 0.3); L.add(side);
  const table = rbox(3.2, 2.2, 0.9, '#B98C5E', 0.2); table.position.set(1.2, 0, 1.2); L.add(table);
  for (const [px, pz] of [[-4.5, -4.5], [5.5, -4.2]]) { const p = makePlant(); p.scale.setScalar(1.6); p.position.set(px, 0, pz); L.add(p); }

  // plants along the glass, a pantry counter on the other far corner
  for (let x = x0 + 16 + (rooms.length ? 4 + rooms.length * ROOM_W : 0); x < x1 - 6; x += 14) { const p = makePlant(); p.scale.setScalar(1.3); p.position.set(x, 0, z0 + 2.4); g.add(p); }
  for (let z = z0 + 18; z < z1 - 6; z += 14) { const p = makePlant(); p.scale.setScalar(1.3); p.position.set(x0 + 2.4, 0, z); g.add(p); }
  const counter = rbox(2.2, 9, 3.2, '#F7F7F2', 0.2); counter.position.set(x0 + 2.4, 0, z1 - 8); g.add(counter);
  const worktop = rbox(2.4, 9.2, 0.2, '#8C7A68', 0.1); worktop.position.set(x0 + 2.4, 3.2, z1 - 8); g.add(worktop);

  // the studio wing: one set per channel down the +x side — rug, backdrop with the handle, ring light, camera on a tripod
  places.forEach((p, i) => {
    const st = new THREE.Group(), n = places.length, span = (D - 8) / n;
    st.position.set(x1 - 12, 0, z0 + 4 + span * (i + 0.5)); g.add(st);
    const c = p.color || '#8A877E';
    const rug = rbox(18, span - 2.5, 0.08, c, 0.3); rug.position.y = -0.02; rug.material = rug.material.clone(); rug.material.transparent = true; rug.material.opacity = 0.35; st.add(rug);
    const bz = -(span / 2) + 1.4; // the backdrop on the far side of each set, facing the camera
    const wallB = rbox(16, 0.6, 7.5, '#F7F7F2', 0.1); wallB.position.set(0, 0, bz); st.add(wallB);
    const paint = rbox(15.4, 0.2, 6.9, c, 0.05); paint.position.set(0, 0.3, bz + 0.38); st.add(paint);
    const hs = handleSign('@' + p.handle, p.about || '', 14); hs.position.set(0, 4.1, bz + 0.52); st.add(hs);
    const chair = rbox(2.4, 2, 1.2, '#3C4448', 0.3); chair.position.set(0, 0, bz + 3); st.add(chair);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.14, 8, 28), new THREE.MeshStandardMaterial({ color: '#FFFFFF', emissive: '#FFF4DE', emissiveIntensity: 0.9 }));
    ring.position.set(-3.5, 5.2, bz + 6.5); st.add(ring);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 4.6, 6), mat('#2A2F31')); pole.position.set(-3.5, 2.3, bz + 6.5); st.add(pole);
    for (let k = 0; k < 3; k++) { const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 3.6, 5), mat('#2A2F31')); const a = k * 2.1; leg.position.set(2.5 + Math.cos(a) * 0.5, 1.7, bz + 7 + Math.sin(a) * 0.5); leg.rotation.set(Math.sin(a) * 0.25, 0, -Math.cos(a) * 0.25); st.add(leg); }
    const cam = rbox(0.8, 1.1, 0.8, '#1E2326', 0.1); cam.position.set(2.5, 3.5, bz + 7); st.add(cam);
    const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.6, 12), mat('#111')); lens.rotation.x = Math.PI / 2; lens.position.set(2.5, 3.9, bz + 6.4); st.add(lens);
  });

  rooms.forEach((r, i) => { const o = makeRoom(r); o.position.set(x0 + 20 + ROOM_W * (i + 0.5), 0, z0 + ROOM_ROW / 2 + 0.6); g.add(o); });

  g.traverse(o => { if (o.isMesh) { o.receiveShadow = true; if (o.material !== glass) o.castShadow = true; } });
  return g;
}

// one room facilities fitted out (facilities.mjs · rooms): glass partitions on three sides (the building's glass is the fourth),
// its name over the front, the furniture its kind calls for. Origin at the room's centre, front toward +z.
const RW = ROOM_W - 1.2, RD = ROOM_ROW - 1.2, PH = 7; // inside width, depth, partition height
function roomSign(text, width) {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 128; const x = c.getContext('2d');
  x.fillStyle = '#2A2F31'; x.fillRect(0, 0, 1024, 128); x.fillStyle = '#F3EFE6'; x.textAlign = 'center'; x.textBaseline = 'middle';
  let px = 80; do { x.font = `600 ${px}px Helvetica, Arial, sans-serif`; px -= 4; } while (x.measureText(text).width > 960);
  x.fillText(text, 512, 68);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return new THREE.Mesh(new THREE.PlaneGeometry(width, width / 8), new THREE.MeshBasicMaterial({ map: t }));
}
function makeRoom(r) {
  const g = new THREE.Group(), glass = new THREE.MeshStandardMaterial({ color: '#CFE3EA', roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.28, depthWrite: false }), frame = mat('#F7F7F2');
  const floor = rbox(RW, RD, 0.08, { meeting: '#CDBFA8', lounge: '#C9BFAE', pantry: '#D9D4CA', focus: '#BFC8C4' }[r.kind] || '#D0CCC2', 0.2); floor.position.y = -0.03; g.add(floor);
  const pane = (w, x, z, rot) => { const p = new THREE.Mesh(new THREE.PlaneGeometry(w, PH), glass); p.position.set(x, PH / 2, z); p.rotation.y = rot; g.add(p);
    const top = rbox(rot ? 0.3 : w, rot ? w : 0.3, 0.3, frame, 0.05); top.position.set(x, PH, z); g.add(top); };
  pane(RW, 0, RD / 2, 0); pane(RD, -RW / 2, 0, Math.PI / 2); pane(RD, RW / 2, 0, Math.PI / 2); // front, left, right
  for (const [x, z] of [[-RW / 2, RD / 2], [RW / 2, RD / 2], [-RW / 2, -RD / 2], [RW / 2, -RD / 2]]) { const m = rbox(0.35, 0.35, PH, frame, 0.05); m.position.set(x, 0, z); g.add(m); }
  const sign = roomSign(r.name, 9); sign.position.set(0, PH + 0.9, RD / 2 + 0.02); g.add(sign);
  const chair = (x, z, rot) => { const c = makeChair(); c.position.set(x, 0, z); c.rotation.y = rot; g.add(c); };
  const plant = (x, z, s = 1.2) => { const p = makePlant(); p.scale.setScalar(s); p.position.set(x, 0, z); g.add(p); };
  if (r.kind === 'meeting') { // a long wood table, chairs down both sides, a ring pendant over it
    const side = Math.ceil(r.seats / 2), len = Math.max(6, side * 2.2 + 1);
    const top = rbox(len, 3.4, 0.25, '#B98C5E', 0.3); top.position.y = 1.9; g.add(top);
    for (const dx of [-len / 2 + 1, len / 2 - 1]) { const leg = rbox(0.5, 2.6, 1.9, '#2A2F31', 0.1); leg.position.set(dx, 0, 0); g.add(leg); }
    for (let k = 0; k < r.seats; k++) { const s = k % 2 ? -1 : 1, n = Math.floor(k / 2), cnt = s > 0 ? side : Math.floor(r.seats / 2);
      chair(-((cnt - 1) * 2.2) / 2 + n * 2.2, s * 2.6, s > 0 ? 0 : Math.PI); }
    const ring = new THREE.Mesh(new THREE.TorusGeometry(Math.min(len / 2.4, 3.5), 0.12, 8, 40), new THREE.MeshStandardMaterial({ color: '#FFFFFF', emissive: '#FFF4DE', emissiveIntensity: 0.9 }));
    ring.rotation.x = Math.PI / 2; ring.position.y = 6.2; g.add(ring);
    const screen = rbox(7, 0.3, 4, '#1E2326', 0.1); screen.position.set(0, 2.2, -RD / 2 + 0.6); g.add(screen);
    plant(RW / 2 - 1.6, -RD / 2 + 1.6);
  } else if (r.kind === 'lounge') { // two sofas facing over a coffee table
    for (const s of [-1, 1]) { const seat = rbox(8, 2.6, 1.1, '#5B6770', 0.4); seat.position.set(0, 0, s * 4); g.add(seat);
      const back = rbox(8, 0.8, 2.2, '#4F5A63', 0.3); back.position.set(0, 0, s * 5.1); g.add(back); }
    const rug = rbox(11, 9, 0.06, '#E3D9C6', 0.2); rug.position.y = 0.02; g.add(rug);
    const table = rbox(4, 2.4, 0.9, '#B98C5E', 0.2); g.add(table);
    plant(-RW / 2 + 1.6, -RD / 2 + 1.6, 1.6); plant(RW / 2 - 1.6, -RD / 2 + 1.6, 1.6);
  } else if (r.kind === 'pantry') { // a counter along the back, a fridge, an island with stools
    const counter = rbox(RW - 6, 2.4, 3.2, '#F7F7F2', 0.15); counter.position.set(-2, 0, -RD / 2 + 1.5); g.add(counter);
    const worktop = rbox(RW - 5.8, 2.6, 0.2, '#8C7A68', 0.1); worktop.position.set(-2, 3.2, -RD / 2 + 1.5); g.add(worktop);
    const fridge = rbox(2.8, 2.6, 6, '#DADFE2', 0.2); fridge.position.set(RW / 2 - 2, 0, -RD / 2 + 1.5); g.add(fridge);
    const island = rbox(8, 3, 3, '#F7F7F2', 0.2); island.position.set(0, 0, 1); g.add(island);
    const itop = rbox(8.4, 3.4, 0.2, '#8C7A68', 0.1); itop.position.set(0, 3, 1); g.add(itop);
    for (let k = 0; k < Math.min(r.seats, 4); k++) { const st = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.5, 2.4, 12), mat('#3C4448')); st.position.set(-3 + k * 2, 1.2, 3.6); g.add(st); }
  } else if (r.kind === 'focus') { // small glass booths, one desk and chair in each
    const n = Math.min(r.seats, 3), bw = RW / n;
    for (let k = 0; k < n; k++) { const bx = -RW / 2 + bw * (k + 0.5);
      if (k) { const wall = new THREE.Mesh(new THREE.PlaneGeometry(RD, PH), glass); wall.rotation.y = Math.PI / 2; wall.position.set(-RW / 2 + bw * k, PH / 2, 0); g.add(wall); }
      const desk = rbox(bw - 2, 2.2, 2.4, '#EFEADF', 0.2); desk.position.set(bx, 0, -RD / 2 + 2); g.add(desk);
      chair(bx, -RD / 2 + 4.6, 0); }
  }
  return g;
}
