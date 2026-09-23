// Codspot World — facilities (owner, 23 Sep 2026). The office can grow: the CEO asks the facilities team for more space
// and a new department — its floor and its seats — is built on top of the six shipped pods. What was built lives in
//   <brain>/Codspot World/facilities.json
//   { "departments": [{ "key": "dev", "name": "DEVELOPMENT", "floor": "Development", "workspace": true,
//                       "seats": [{ "id": "emgr", "name": "ENG MANAGER", "role": "…", "does": "…", "lead": true }, …] }],
//     "rooms": [{ "id": "boardroom", "floor": "Development", "kind": "meeting", "name": "BOARDROOM", "seats": 10 }] }
// Rooms (24 Sep 2026): the facilities team also fits out a floor — a meeting room, a lounge, a pantry, focus booths —
// drawn in a row along the floor's back wall (src/interior.js).
// Loaded at start (roster.mjs imports this file), added to live by build(), served to the page as window.FACILITIES.
// The six shipped departments keep their fixed seats; only departments built here can grow.
import fs from 'node:fs';
import path from 'node:path';
import { loadConfig } from './config.mjs';
import { AGENTS, BUILTIN_KEYS, addDepartments } from './src/data.js';

export const MAX_DEPTS = 4, MAX_SEATS = 16, MAX_ROOMS = 4; // rooms per floor
export const ROOM_KINDS = { meeting: 'meeting room: a long table and chairs behind glass', lounge: 'lounge: sofas and a coffee table', pantry: 'pantry: a kitchen counter and stools', focus: 'focus booths: small glass booths for one' };
export const file = brainPath => path.join(brainPath, 'Codspot World', 'facilities.json');
const key = s => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 12);
const title = s => String(s).toLowerCase().replace(/(^|\s)([a-z])/g, (m, p, c) => p + c.toUpperCase());

// { departments, problems } — problems are sentences, never thrown (the file is the owner's and the CEO's)
export function clean(doc) {
  const problems = [], out = [];
  const taken = new Set(AGENTS.filter(a => BUILTIN_KEYS.includes(a.dept)).map(a => a.id));
  for (const d of Array.isArray(doc?.departments) ? doc.departments : []) {
    const name = String(d?.name || '').trim().toUpperCase().slice(0, 24), k = key(d?.key || name);
    if (!k) { problems.push('a department has no name — skipped'); continue; }
    if (BUILTIN_KEYS.includes(k) || k === 'brain') { problems.push(`"${k}" is a shipped department — its seats are fixed; build a new department instead`); continue; }
    if (out.some(x => x.key === k)) { problems.push(`"${k}" appears twice — the second is skipped`); continue; }
    if (out.length >= MAX_DEPTS) { problems.push(`more than ${MAX_DEPTS} new departments — "${k}" skipped`); continue; }
    const seats = [];
    for (const s of Array.isArray(d.seats) ? d.seats : []) {
      const sn = String(s?.name || '').trim().toUpperCase().slice(0, 32); if (!sn) continue;
      if (seats.length >= MAX_SEATS) { problems.push(`${name}: more than ${MAX_SEATS} seats — the rest skipped`); break; }
      const base = key(s.id || sn) || 'seat'; let id = base, n = 2;
      while (taken.has(id)) id = base.slice(0, 10) + n++;
      taken.add(id);
      seats.push({ id, name: sn, role: String(s.role || '').trim().slice(0, 80), does: String(s.does || '').trim().slice(0, 400), lead: !!s.lead });
    }
    if (seats.length < 2) { problems.push(`${name || k}: needs at least 2 seats — skipped`); continue; }
    const lead = Math.max(0, seats.findIndex(s => s.lead)); seats.forEach((s, i) => { s.lead = i === lead; });
    out.push({ key: k, name: name || k.toUpperCase(), floor: String(d.floor || '').trim().slice(0, 24) || title(name), workspace: !!d.workspace, seats });
  }
  const rooms = [];
  for (const r of Array.isArray(doc?.rooms) ? doc.rooms : []) {
    const kind = String(r?.kind || '').toLowerCase(), floor = String(r?.floor || '').trim().slice(0, 24), name = String(r?.name || '').trim().toUpperCase().slice(0, 24) || kind.toUpperCase();
    if (!ROOM_KINDS[kind]) { problems.push(`room "${name}": kind "${kind}" is not one of ${Object.keys(ROOM_KINDS).join(', ')} — skipped`); continue; }
    if (!floor) { problems.push(`room "${name}": no floor — skipped`); continue; }
    const same = rooms.filter(x => x.floor.toLowerCase() === floor.toLowerCase());
    if (same.length >= MAX_ROOMS) { problems.push(`${floor}: more than ${MAX_ROOMS} rooms — "${name}" skipped`); continue; }
    if (same.some(x => x.name === name)) { problems.push(`${floor}: two rooms called ${name} — the second is skipped`); continue; }
    rooms.push({ id: key(r.id || floor + name) || 'room', floor, kind, name, seats: Math.max(2, Math.min(14, parseInt(r.seats, 10) || (kind === 'meeting' ? 8 : 4))) });
  }
  return { departments: out, rooms, problems };
}

let current = { departments: [], rooms: [], problems: [] };
export const departments = () => current.departments;
export const rooms = () => current.rooms;
export const problems = () => current.problems;
function read(brainPath) {
  const p = file(brainPath); if (!fs.existsSync(p)) return { departments: [] };
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) { current.problems = [`facilities.json is not valid JSON (${e.message.split('\n')[0]}) — ignored`]; return { departments: [] }; }
}
export function load(brainPath = loadConfig().brainPath) {
  current = clean(read(brainPath)); addDepartments(current.departments);
  return current;
}

// the facilities team at work: a new department, or new seats for one built earlier (matched by key or name)
export function build(brainPath, req) {
  if (!req || typeof req !== 'object') return { error: 'nothing to build' };
  const doc = clean(read(brainPath)), k = key(req.key || req.name);
  if (!k) return { error: 'the new department needs a name' };
  if (BUILTIN_KEYS.includes(k)) return { error: `${String(req.name || k).toUpperCase()} is one of the six shipped departments — its seats are fixed` };
  const seats = Array.isArray(req.seats) ? req.seats : [];
  let d = doc.departments.find(x => x.key === k || x.name === String(req.name || '').trim().toUpperCase()), added;
  if (d) { // growing: keep every seat it has, add the ones whose name is new
    const fresh = seats.filter(s => s && s.name && !d.seats.some(x => x.name === String(s.name).trim().toUpperCase())).map(s => ({ ...s, lead: false }));
    if (!fresh.length) return { error: `${d.name} already has those seats` };
    d.seats.push(...fresh); added = fresh.length;
  } else {
    d = { key: k, name: req.name, floor: req.floor, workspace: req.workspace, seats };
    doc.departments.push(d); added = seats.length;
  }
  const next = clean(doc), made = next.departments.find(x => x.key === d.key || x.key === k);
  if (!made) return { error: next.problems.join('; ') || 'the department could not be built' };
  write(brainPath, next);
  return { dept: made, added, problems: next.problems };
}
function write(brainPath, next) {
  fs.mkdirSync(path.dirname(file(brainPath)), { recursive: true });
  fs.writeFileSync(file(brainPath), JSON.stringify({ departments: next.departments, rooms: next.rooms }, null, 2) + '\n');
  current = next; addDepartments(current.departments);
}

// the facilities team fits out a floor: reviews the request against the building, then adds (or takes out) one room.
// req: { floor, kind, name, seats, remove }; floors: the tower's floor names (a room goes on a floor that exists)
export function buildRoom(brainPath, req, floors = []) {
  if (!req || typeof req !== 'object') return { error: 'nothing to build' };
  const doc = clean(read(brainPath)), fl = floors.find(f => f.toLowerCase() === String(req.floor || '').trim().toLowerCase());
  if (!fl) return { error: `there is no ${req.floor ? '"' + req.floor + '" ' : ''}floor — the floors are ${floors.join(', ')}` };
  const here = doc.rooms.filter(r => r.floor.toLowerCase() === fl.toLowerCase()), name = String(req.name || '').trim().toUpperCase();
  if (req.remove) {
    const r = here.find(x => x.name === name) || (!name && here.length === 1 ? here[0] : null);
    if (!r) return { error: `${fl} has no room called ${name || '(no name given)'}${here.length ? ' — it has ' + here.map(x => x.name).join(', ') : ''}` };
    doc.rooms = doc.rooms.filter(x => x !== r); write(brainPath, clean(doc));
    return { room: r, removed: true };
  }
  const kind = String(req.kind || '').toLowerCase();
  if (!ROOM_KINDS[kind]) return { error: `a ${req.kind || 'room of no kind'} can't be fitted yet — facilities builds ${Object.values(ROOM_KINDS).join('; ')}` };
  if (here.length >= MAX_ROOMS) return { error: `${fl} is full (${MAX_ROOMS} rooms: ${here.map(x => x.name).join(', ')}) — take one out first` };
  const nm = name || (kind === 'meeting' ? 'MEETING ROOM' : kind.toUpperCase());
  if (here.some(x => x.name === nm)) return { error: `${fl} already has a ${nm}` };
  doc.rooms.push({ floor: fl, kind, name: nm, seats: req.seats });
  const next = clean(doc), room = next.rooms.find(x => x.floor === fl && x.name === nm);
  if (!room) return { error: next.problems.join('; ') || 'the room could not be built' };
  write(brainPath, next);
  return { room };
}

// the tower with every built department on its floor (an existing floor by name, or a new storey on top)
export function towerWith(tower, name) {
  const t = tower && Array.isArray(tower.floors) ? { ...tower, floors: tower.floors.map(f => ({ ...f, depts: [...(f.depts || [])] })) }
    : { name, floors: [{ name: 'Office', depts: ['brain', ...BUILTIN_KEYS] }] };
  for (const d of current.departments) {
    if (t.floors.some(f => f.depts.includes(d.key))) continue;
    const f = t.floors.find(f => String(f.name).toLowerCase() === d.floor.toLowerCase());
    if (f) f.depts.push(d.key); else t.floors.push({ name: d.floor, depts: [d.key] });
  }
  for (const f of t.floors) { const rs = current.rooms.filter(r => r.floor.toLowerCase() === String(f.name).toLowerCase()); if (rs.length) f.rooms = rs; }
  return t;
}

load();
