// SPDX-License-Identifier: AGPL-3.0-or-later
// Strata: 48 s product reel (hero film of the website). The product's own low-poly scene (cutting mat,
// VLAN plates on steel standoffs, racks, pins, threads, 2D diagram cards, mode bar, connectors panel,
// theme switch) redrawn in orthographic isometric from the app's Lyon demo data and both palettes.
// Pure function of u (beats). 120 bpm, 96 beats.
import * as M from './lib/motion.js';
const { W, H, springU, springKeys, SPRING, E, prog, bump, clamp, lerp, mix, font, text, layout,
  rrect, wobble, ring, shake, hash01 } = M;

// ------------------------------------------------------------------ palettes (the app's CSS tokens)
const VC_DAY = ['#d2a198', '#9db9a3', '#d5b671', '#97acc3', '#aea8c9', '#b8c39e', '#c6a9b9', '#a9c4c0', '#d8b49a', '#b3b8a6'];
const VC_NIGHT = ['#a3746b', '#6c8a74', '#a68a49', '#687d97', '#827c9d', '#7f886a', '#8e7585', '#6f8e8a', '#a38369', '#7e8475'];
const DAY = {
  night: false, panel: '#f7f7f3', line: '#c2c6c0', fg: '#1b2125', muted: '#5b646a', accent: '#2b5884', ink: '#1b2125',
  mat: '#5e7d6c', matline: '134,162,145', table: '#cdd0cb', card: '#f0eee8', detail: '#3a4148', thread: '#4b5a68',
  crit: '#c4313d', high: '#cc6a22', med: '#b38d14', low: '#3a8763', none: '#89939a',
  xnet: '#8a3fbf', xinter: '#2a7fa6', xintra: '#7c8790', steel: '#b9bec2', cream: '#f0eee8', capsub: '#e4ebe4',
  edge: 'rgba(27,33,37,0.30)', shadow: '20,30,25', dev: '#2b3238', devText: '#f0eee8', vc: VC_DAY, cloud: ['#ffffff', '#eef0ec', '#e2e5e0', '#f6f7f4', '#d9ddd8'],
};
const NIGHT = {
  night: true, panel: '#1e2427', line: '#353d43', fg: '#e2e5e7', muted: '#97a0a6', accent: '#8fb5da', ink: '#05080a',
  mat: '#2a3a32', matline: '65,89,76', table: '#191e21', card: '#c6cacc', detail: '#262c31', thread: '#a3b1be',
  crit: '#ef5a66', high: '#ef9049', med: '#dfbb43', low: '#5bbd91', none: '#9aa3aa',
  xnet: '#bb8de8', xinter: '#6cb8d8', xintra: '#9aa6ae', steel: '#8d959b', cream: '#e8ebe6', capsub: '#c2cbc4',
  edge: 'rgba(0,0,0,0.42)', shadow: '0,0,0', dev: '#e2e5e7', devText: '#1b2125', vc: VC_NIGHT, cloud: ['#c9ced2', '#b9bfc4', '#aab1b7', '#d2d6d9', '#9ea6ac'],
};
let C = DAY;
const DISP = 'Display', WIDE = 'DisplayWide', UI = 'UI';
const D2R = Math.PI / 180;
const MATZ = -1.7, G = 3.2, PT = 0.3;            // mat height, plate spacing, plate thickness
const PW = 11, PD = 5;                            // plate size

// ------------------------------------------------------------------ the demo IS (Lyon), curated
const PLATES = [
  { name: 'INDUSTRIAL', z: 0, land: 8, vl: [{ num: 50, name: 'OT production', ci: 0, x0: -5.5, x1: 0.6 }, { num: 55, name: 'Physical security', ci: 4, x0: 0.6, x1: 5.5 }] },
  { name: 'OFFICE', z: G, land: 9.5, vl: [{ num: 30, name: 'User workstations', ci: 2, x0: -5.5, x1: 1.5 }, { num: 35, name: 'Printing', ci: 5, x0: 1.5, x1: 5.5 }] },
  { name: 'CORE IT', z: 2 * G, land: 11, vl: [{ num: 20, name: 'Servers', ci: 6, x0: -5.5, x1: 0.6 }, { num: 40, name: 'Administration', ci: 7, x0: 0.6, x1: 5.5 }] },
  { name: 'EXPOSED', z: 3 * G, land: 12.5, vl: [{ num: 10, name: 'DMZ', ci: 9, x0: -5.5, x1: 5.5 }] },
];
// [name, plate, vlan, x, y, model, severity, pop eighth]
const ASSETS = [
  ['plc-l1', 0, 50, -4.3, -0.7, 'plc', 'crit', 0],
  ['hmi-01', 0, 50, -2.5, 0.9, 'workstation', 'crit', 0],
  ['historian', 0, 50, -0.6, -0.8, 'server', 'high', 1],
  ['cam-04', 0, 55, 3.2, 0.1, 'camera', 'med', 1],
  ['pc-acct-01', 1, 30, -4.2, -0.7, 'workstation', 'crit', 1],
  ['pc-hr-02', 1, 30, -2.5, 1.0, 'workstation', 'none', 2],
  ['pc-dev-07', 1, 30, -1.0, -1.0, 'workstation', 'high', 2],
  ['pc-exec-01', 1, 30, 0.5, 0.9, 'workstation', 'none', 2],
  ['printer-02', 1, 35, 3.5, 0.0, 'printer', 'crit', 3],
  ['dc-01', 2, 20, -4.5, -1.0, 'dc', 'crit', 3],
  ['file-01', 2, 20, -4.2, 1.1, 'server', 'high', 4],
  ['app-erp', 2, 20, -2.2, 0.1, 'server', 'crit', 4],
  ['db-erp', 2, 20, -0.6, -0.9, 'db', 'high', 4],
  ['core-sw', 2, 40, 1.9, 1.0, 'switch', 'crit', 5],
  ['bastion', 2, 40, 2.9, -1.0, 'server', 'high', 5],
  ['jump-win', 2, 40, 4.4, 0.6, 'server', 'crit', 5],
  ['fw-edge', 3, 10, -4.0, 0.5, 'firewall', 'crit', 6],
  ['vpn-gw', 3, 10, -2.2, -1.1, 'gateway', 'crit', 6],
  ['rproxy', 3, 10, -0.5, 0.7, 'server', 'none', 6],
  ['web-01', 3, 10, 1.3, -1.0, 'server', 'high', 7],
  ['web-02', 3, 10, 2.8, -1.0, 'server', 'none', 7],
  ['mail-relay', 3, 10, 4.0, 0.8, 'server', 'med', 7],
  // arrives from GLPI in shot 9
  ['srv-print-01', 2, 20, -0.7, 1.15, 'server', 'none', 99],
].map(([name, plate, vlan, x, y, model, sev, pop], i) => ({ name, plate, vlan, x, y, model, sev, pop, i }));
const A = Object.fromEntries(ASSETS.map((a) => [a.name, a]));
const MODEL_H = { server: 1.05, dc: 1.6, db: 1.0, firewall: 0.75, gateway: 0.95, switch: 0.24, workstation: 0.82, printer: 0.5, plc: 0.62, camera: 0.8 };
const PIN_H = { crit: 1.45, high: 1.1, med: 0.85, low: 0.7 };
// pins rise bottom to top on sixteenths, from beat 34.5
ASSETS.filter((a) => a.sev !== 'none' && a.pop < 99).forEach((a, k) => { a.pinU = 34.5 + k * 0.16; });
const vlanOf = (a) => PLATES[a.plate].vl.find((v) => v.num === a.vlan);

// web-02 is dragged in the 2D diagram (shot 7): it keeps its new place afterwards
const DRAG = { from: 50.6, to: 52.3, dx: 1.5, dy: -0.05 };
function posOf(a, u) {
  if (a.name !== 'web-02') return [a.x, a.y];
  const k = E.inOutCubic(prog(u, DRAG.from, DRAG.to));
  return [a.x + DRAG.dx * k, a.y + DRAG.dy * k];
}

// flows: [src, dst, port, risky]
const FLOWS = [
  ['internet', 'fw-edge', 'tcp/443'], ['internet', 'vpn-gw', 'tcp/443'], ['internet', 'mail-relay', 'tcp/25'],
  ['internet', 'jump-win', 'tcp/3389', 1],
  ['fw-edge', 'rproxy', 'tcp/443'], ['rproxy', 'web-01', 'tcp/8443'], ['rproxy', 'web-02', 'tcp/8443'],
  ['web-01', 'app-erp', 'tcp/8080'], ['web-02', 'app-erp', 'tcp/8080'], ['app-erp', 'db-erp', 'tcp/5432'],
  ['vpn-gw', 'dc-01', 'tcp/389'], ['vpn-gw', 'bastion', 'tcp/22'], ['bastion', 'core-sw', 'tcp/22'],
  ['bastion', 'db-erp', 'tcp/5432'], ['jump-win', 'dc-01', 'tcp/3389'], ['jump-win', 'file-01', 'tcp/445'],
  ['pc-acct-01', 'file-01', 'tcp/445'], ['pc-acct-01', 'app-erp', 'tcp/443'], ['pc-acct-01', 'dc-01', 'tcp/88'],
  ['pc-hr-02', 'file-01', 'tcp/445'], ['pc-acct-01', 'printer-02', 'tcp/9100'],
  ['pc-hr-02', 'pc-acct-01', 'tcp/445', 1], ['pc-dev-07', 'db-erp', 'tcp/5432', 1],
  ['hmi-01', 'plc-l1', 'tcp/102'], ['historian', 'plc-l1', 'tcp/502'], ['historian', 'file-01', 'tcp/445'],
  ['jump-win', 'hmi-01', 'tcp/3389', 1], ['cam-04', 'file-01', 'tcp/554'],
].map(([src, dst, port, risk], i) => mkFlow(src, dst, port, risk, i));
function mkFlow(src, dst, port, risk, i, extra = {}) {
  const net = (x) => x === 'internet' || x.startsWith('svc:');
  const expo = net(src) || net(dst) ? 'net' : A[src].vlan === A[dst].vlan ? 'intra' : 'inter';
  const layer = net(src) || net(dst) ? 4 : Math.max(A[src].plate, A[dst].plate);
  return { src, dst, port, risk: !!risk, expo, layer, i, ...extra };
}
// flows that join later: Internet services (shot 6), the proposal (shot 8), Palo Alto (shot 9)
const LATE = [
  mkFlow('pc-acct-01', 'svc:eset', 'tcp/443', 0, 40, { t0: 45.7 }),
  mkFlow('pc-hr-02', 'svc:eset', 'tcp/443', 0, 41, { t0: 46.0 }),
  mkFlow('web-01', 'svc:ubuntu', 'tcp/443', 0, 42, { t0: 57.0, prop: true }),
  mkFlow('web-02', 'svc:ubuntu', 'tcp/443', 0, 43, { t0: 57.5, prop: true }),
  mkFlow('internet', 'web-02', 'tcp/443', 0, 44, { t0: 68.1, pan: true }),
];
const ALL_FLOWS = [...FLOWS, ...LATE];
const PATH = ['internet', 'fw-edge', 'rproxy', 'web-01', 'app-erp'];
const PATH_FLOWS = new Set(PATH.slice(1).map((d, k) => `${PATH[k]}>${d}`));
const TAGS = [['fw-edge', 'IN 443', 33], ['jump-win', 'IN 3389', 33.5], ['mail-relay', 'IN 25', 34]];
const HOPS = [40, 41.5, 43, 44.5];

// ------------------------------------------------------------------ camera + projection (orthographic)
let CAM = null;
function setCam(c) { c.cy = Math.cos(c.yaw); c.sy = Math.sin(c.yaw); c.se = Math.sin(c.el); c.ce = Math.cos(c.el); CAM = c; }
function P(x, y, z) {
  const dx = x - CAM.tx, dy = y - CAM.ty, dz = z - CAM.tz;
  return [CAM.ox + CAM.s * (dx * CAM.cy - dy * CAM.sy), CAM.oy + CAM.s * ((dx * CAM.sy + dy * CAM.cy) * CAM.se - dz * CAM.ce)];
}
const depth = (x, y) => x * CAM.sy + y * CAM.cy;   // larger = nearer the viewer

// 2D diagram: the plates spread apart on screen and flatten (shot 7)
const flatK = (u) => springU(u, 48, { stiffness: 80, damping: 17 }) - springU(u, 53.6, { stiffness: 80, damping: 17 });
// in 2D the four plates sit in a 2x2 grid (free placement, as in the app's diagram): Exposed and Core IT on top
const FLAT_POS = [[6.0, 3.0], [-6.0, 3.0], [6.0, -3.0], [-6.0, -3.0]];
const plateDX = (i, u) => FLAT_POS[i][0] * flatK(u);
const plateDY = (i, u) => FLAT_POS[i][1] * flatK(u);

function stackCam(u) {
  const [tx, ty, tz, ls, dx, dy] = springKeys(u, [
    [0, [0, 0, 5.0, Math.log(62), 200, 20]],
    [16, [-0.4, 0, 5.4, Math.log(64), 260, 10]],
    [24, [-0.6, 0, 5.8, Math.log(63), 250, 20]],
    [32, [0.3, -0.2, 9.6, Math.log(84), 170, 60]],
    [36.3, [0, 0, 5.2, Math.log(56), 220, 20]],
    [40, [-2.2, 0, 7.8, Math.log(62), 260, 60]],
    [56, [0.9, -0.4, 9.6, Math.log(76), 120, 150]],
    [63.6, [0, 0, 5.4, Math.log(55), 330, 50]],
    [72, [0, 0, 5.4, Math.log(58), 130, 40]],
    [76, [0, 0, 5.4, Math.log(54), 40, 30]],
  ], { stiffness: 70, damping: 16 });
  return { tx, ty, tz, s: Math.exp(ls), yaw: 0.5 + 0.004 * (u - 8), el: 33 * D2R, ox: W / 2 + dx, oy: H / 2 + dy };
}
const HOOK_CAM = { tx: 0, ty: 6.35, tz: MATZ, s: 92, yaw: 0, el: 68 * D2R, ox: W / 2, oy: H / 2 + 10 };
const FLAT_CAM = { tx: 0, ty: 0, tz: 0, s: 58, yaw: 0, el: 89.5 * D2R, ox: W / 2 + 130, oy: H / 2 - 10 };
const END_CAM = (u) => ({ tx: 0, ty: 0.6, tz: MATZ, s: 84 * Math.exp(0.005 * Math.max(0, u - 82)), yaw: 0, el: 72 * D2R, ox: W / 2, oy: H / 2 });
function blendCam(a, b, k) {
  return { tx: lerp(a.tx, b.tx, k), ty: lerp(a.ty, b.ty, k), tz: lerp(a.tz, b.tz, k), s: a.s * (b.s / a.s) ** k,
    yaw: lerp(a.yaw, b.yaw, k), el: lerp(a.el, b.el, k), ox: lerp(a.ox, b.ox, k), oy: lerp(a.oy, b.oy, k) };
}
function camera(u) {
  if (u < 7) return HOOK_CAM;
  let c = blendCam(HOOK_CAM, stackCam(u), springU(u, 7, { stiffness: 70, damping: 16 }));
  const fk = flatK(u);
  if (fk > 0.0005) c = blendCam(c, FLAT_CAM, clamp(fk));
  if (u >= 79.1) c = blendCam(c, END_CAM(u), springU(u, 79.2, { stiffness: 55, damping: 14 }));
  return c;
}

// ------------------------------------------------------------------ primitives
let DIMV = 0;                                     // 0..1: fades a model toward the table
const tint = (c) => (DIMV > 0 ? mix(c, C.table, DIMV * 0.75) : c);
const SH = { px: 0.30, nx: 0.18, py: 0.10, ny: 0.34 };
const shade = (c, f) => mix(c, C.ink, f);
const lw = () => Math.max(0.8, CAM.s / 70);

function poly(ctx, pts, col, edge = true) {
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath(); ctx.fillStyle = col; ctx.fill();
  if (edge) { ctx.strokeStyle = C.edge; ctx.lineWidth = lw(); ctx.lineJoin = 'round'; ctx.stroke(); }
}
function box(ctx, x, y, z, w, d, h, col, edge = true) {
  const x0 = x - w / 2, x1 = x + w / 2, y0 = y - d / 2, y1 = y + d / 2, z1 = z + h;
  const faces = {};
  const side = (ax, ay, bx, by, f, name) => {
    poly(ctx, [P(ax, ay, z), P(bx, by, z), P(bx, by, z1), P(ax, ay, z1)], tint(shade(col, f)), edge);
    faces[name] = { a: [ax, ay], b: [bx, by], z, z1 };
  };
  if (CAM.ce > 0.02) {
    if (CAM.sy > 0) side(x1, y1, x1, y0, SH.px, 'px'); else side(x0, y0, x0, y1, SH.nx, 'nx');
    if (CAM.cy > 0) side(x0, y1, x1, y1, SH.py, 'py'); else side(x1, y0, x0, y0, SH.ny, 'ny');
  }
  poly(ctx, [P(x0, y0, z1), P(x1, y0, z1), P(x1, y1, z1), P(x0, y1, z1)], tint(col), edge);
  return faces;
}
function onFace(ctx, f, fn) {
  if (!f) return;
  const o = P(f.a[0], f.a[1], f.z), pa = P(f.b[0], f.b[1], f.z), pb = P(f.a[0], f.a[1], f.z1);
  ctx.save(); ctx.transform(pa[0] - o[0], pa[1] - o[1], pb[0] - o[0], pb[1] - o[1], o[0], o[1]); fn(); ctx.restore();
}
function onPlane(ctx, o, uv, vv, fn) {
  const p0 = P(...o), pu = P(o[0] + uv[0], o[1] + uv[1], o[2] + uv[2]), pv = P(o[0] + vv[0], o[1] + vv[1], o[2] + vv[2]);
  ctx.save();
  ctx.transform((pu[0] - p0[0]) / 100, (pu[1] - p0[1]) / 100, (pv[0] - p0[0]) / 100, (pv[1] - p0[1]) / 100, p0[0], p0[1]);
  fn(); ctx.restore();
}
const flat = (ctx, x, y, z, fn) => onPlane(ctx, [x, y, z], [1, 0, 0], [0, 1, 0], fn);
function cyl(ctx, x, y, z, r, h, col) {
  const b = P(x, y, z), t = P(x, y, z + h), rx = r * CAM.s, ry = r * CAM.s * CAM.se;
  ctx.beginPath();
  ctx.ellipse(b[0], b[1], rx, ry, 0, 0, Math.PI); ctx.lineTo(t[0] - rx, t[1]);
  ctx.ellipse(t[0], t[1], rx, ry, 0, Math.PI, 0, true); ctx.closePath();
  ctx.fillStyle = tint(shade(col, 0.2)); ctx.fill(); ctx.strokeStyle = C.edge; ctx.lineWidth = lw(); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(t[0], t[1], rx, ry, 0, 0, Math.PI * 2);
  ctx.fillStyle = tint(col); ctx.fill(); ctx.stroke();
}
function line3(ctx, a, b, col, w) {
  const p = P(...a), q = P(...b);
  ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]);
  ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.stroke();
}

// ------------------------------------------------------------------ low-poly models (the app's set)
function model(ctx, a, X, Y, Z, k, sq) {
  if (k <= 0.001) return {};
  const kx = k * (1 + 0.16 * sq), kz = k * (1 - 0.28 * sq);
  const card = C.card, dark = C.detail;
  box(ctx, X, Y, Z, 1.0 * kx, 0.95 * kx, 0.05 * kz, shade(C.vc[vlanOf(a).ci], 0.18), false);
  const z = Z + 0.05 * kz;
  switch (a.model) {
    case 'server': {
      const f = box(ctx, X, Y, z, 0.62 * kx, 0.62 * kx, 1.0 * kz, card);
      onFace(ctx, f.py || f.ny, () => { ctx.fillStyle = tint(dark); for (let i = 0; i < 4; i++) ctx.fillRect(0.14, 0.18 + i * 0.18, 0.72, 0.05); ctx.fillStyle = tint(C.low); ctx.fillRect(0.72, 0.86, 0.1, 0.05); });
      break;
    }
    case 'dc': {
      const h = 1.25 * kz, f = box(ctx, X, Y, z, 0.66 * kx, 0.66 * kx, h, card);
      onFace(ctx, f.py || f.ny, () => { ctx.fillStyle = tint(dark); for (let i = 0; i < 5; i++) ctx.fillRect(0.14, 0.14 + i * 0.15, 0.72, 0.045); });
      const r = 0.33 * kx, zt = z + h, apex = P(X, Y, zt + 0.32 * kz);
      const corners = [[X - r, Y - r], [X + r, Y - r], [X + r, Y + r], [X - r, Y + r]];
      [[0, 1, 0, -1], [1, 2, 1, 0], [2, 3, 0, 1], [3, 0, -1, 0]].filter(([, , nx, ny]) => nx * CAM.sy + ny * CAM.cy > 0)
        .forEach(([i, j, nx, ny]) => poly(ctx, [P(...corners[i], zt), P(...corners[j], zt), apex], tint(shade(C.steel, nx > 0 ? 0.28 : ny > 0 ? 0.08 : 0.2))));
      break;
    }
    case 'db': { for (let i = 0; i < 3; i++) cyl(ctx, X, Y, z + i * 0.33 * kz, 0.36 * kx, 0.29 * kz, card); break; }
    case 'firewall': {
      const brick = mix(card, C.high, 0.42);
      const f = box(ctx, X, Y, z, 1.3 * kx, 0.34 * kx, 0.75 * kz, brick);
      onFace(ctx, f.py || f.ny, () => {
        ctx.fillStyle = tint(shade(brick, 0.45));
        for (let r = 1; r < 4; r++) ctx.fillRect(0, r / 4 - 0.015, 1, 0.03);
        for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) ctx.fillRect(((c + (r % 2) * 0.5) / 4) % 1, r / 4, 0.012, 0.25);
      });
      break;
    }
    case 'gateway': {
      const f = box(ctx, X, Y, z, 0.8 * kx, 0.56 * kx, 0.42 * kz, card);
      onFace(ctx, f.py || f.ny, () => { ctx.fillStyle = tint(C.low); for (let i = 0; i < 4; i++) ctx.fillRect(0.15 + i * 0.12, 0.4, 0.06, 0.2); });
      for (const s of [-1, 1]) line3(ctx, [X + s * 0.28 * kx, Y - 0.12 * kx, z + 0.42 * kz], [X + s * 0.34 * kx, Y - 0.12 * kx, z + 0.95 * kz], tint(dark), Math.max(1.2, CAM.s * 0.03));
      break;
    }
    case 'switch': {
      const f = box(ctx, X, Y, z, 1.15 * kx, 0.55 * kx, 0.22 * kz, mix(card, C.steel, 0.5));
      onFace(ctx, f.py || f.ny, () => { ctx.fillStyle = tint(dark); for (let i = 0; i < 8; i++) ctx.fillRect(0.08 + i * 0.105, 0.3, 0.06, 0.38); });
      break;
    }
    case 'workstation': {
      box(ctx, X, Y + 0.24 * kx, z, 0.7 * kx, 0.26 * kx, 0.05 * kz, card);
      box(ctx, X, Y - 0.12 * kx, z, 0.1 * kx, 0.1 * kx, 0.3 * kz, C.steel);
      const f = box(ctx, X, Y - 0.12 * kx, z + 0.3 * kz, 0.84 * kx, 0.08 * kx, 0.52 * kz, card);
      onFace(ctx, f.py, () => { ctx.fillStyle = tint(C.thread); ctx.fillRect(0.06, 0.1, 0.88, 0.82); });
      break;
    }
    case 'printer': {
      const f = box(ctx, X, Y, z, 0.82 * kx, 0.62 * kx, 0.42 * kz, card);
      onFace(ctx, f.py || f.ny, () => { ctx.fillStyle = tint(dark); ctx.fillRect(0.15, 0.55, 0.7, 0.07); });
      box(ctx, X, Y - 0.05 * kx, z + 0.42 * kz, 0.56 * kx, 0.4 * kx, 0.06 * kz, '#ffffff');
      break;
    }
    case 'plc': {
      const f = box(ctx, X, Y, z, 0.86 * kx, 0.4 * kx, 0.57 * kz, mix(card, C.steel, 0.35));
      onFace(ctx, f.py || f.ny, () => {
        ctx.fillStyle = tint(dark); for (let i = 0; i < 5; i++) ctx.fillRect(0.08 + i * 0.18, 0.12, 0.12, 0.6);
        ctx.fillStyle = tint(C.low); ctx.fillRect(0.1, 0.8, 0.08, 0.08); ctx.fillStyle = tint(C.high); ctx.fillRect(0.24, 0.8, 0.08, 0.08);
      });
      break;
    }
    case 'camera': {
      box(ctx, X, Y, z, 0.1 * kx, 0.1 * kx, 0.42 * kz, C.steel);
      const f = box(ctx, X, Y - 0.05 * kx, z + 0.42 * kz, 0.38 * kx, 0.62 * kx, 0.3 * kz, card);
      onFace(ctx, f.py || f.ny, () => { ctx.beginPath(); ctx.arc(0.5, 0.5, 0.3, 0, Math.PI * 2); ctx.fillStyle = tint(dark); ctx.fill(); });
      break;
    }
  }
  return { top: Z + MODEL_H[a.model] * kz };
}
function drawPin(ctx, x, y, z, h, col, flagK = 0, lean = 0, scale = 1) {
  if (h <= 0.01) return;
  const b = P(x, y, z), t = P(x + lean * h, y, z + h);
  ctx.beginPath(); ctx.moveTo(b[0], b[1]); ctx.lineTo(t[0], t[1]);
  ctx.strokeStyle = tint(shade(C.steel, 0.15)); ctx.lineWidth = Math.max(1.4, CAM.s * 0.034 * scale); ctx.lineCap = 'round'; ctx.stroke();
  const r = CAM.s * 0.16 * scale;
  if (flagK > 0.01) {
    const fy = t[1] + r * 0.9, fw = CAM.s * 0.5 * flagK * scale, fh = CAM.s * 0.26 * scale;
    poly(ctx, [[t[0], fy], [t[0] + fw, fy + fh * 0.45], [t[0], fy + fh]], tint(col));
  }
  ctx.beginPath(); ctx.arc(t[0], t[1], r, 0, Math.PI * 2); ctx.fillStyle = tint(col); ctx.fill();
  ctx.strokeStyle = C.edge; ctx.lineWidth = lw(); ctx.stroke();
  ctx.beginPath(); ctx.arc(t[0] - r * 0.32, t[1] - r * 0.32, r * 0.38, 0, Math.PI * 2);
  ctx.fillStyle = tint(mix(col, '#ffffff', 0.35)); ctx.fill();
}
// violet octahedron: an Internet service (ESET updates, Ubuntu repositories…)
function octa(ctx, x, y, z, r, col, spin) {
  const pts = [0, 1, 2, 3].map((k) => [x + r * Math.cos(spin + k * Math.PI / 2), y + r * Math.sin(spin + k * Math.PI / 2)]);
  const top = P(x, y, z + r * 1.25), bot = P(x, y, z - r * 1.25);
  const faces = [];
  for (let k = 0; k < 4; k++) {
    const a = pts[k], b = pts[(k + 1) % 4], mx = (a[0] + b[0]) / 2 - x, my = (a[1] + b[1]) / 2 - y;
    const d = mx * CAM.sy + my * CAM.cy;
    faces.push({ a, b, d, f: 0.08 + 0.22 * (1 - (mx * 0.7 - my * 0.7 + r) / (2 * r)) });
  }
  faces.filter((f) => f.d > -0.05).sort((p, q) => p.d - q.d).forEach((f) => {
    poly(ctx, [P(...f.a, z), P(...f.b, z), bot], shade(col, f.f + 0.18));
    poly(ctx, [P(...f.a, z), P(...f.b, z), top], shade(col, f.f));
  });
}

// ------------------------------------------------------------------ mat
function drawMat(ctx) {
  ctx.fillStyle = C.table; ctx.fillRect(-60, -60, W + 120, H + 120);
  poly(ctx, [P(-300, -300, MATZ), P(300, -300, MATZ), P(300, 300, MATZ), P(-300, 300, MATZ)], C.mat, false);
  const X0 = -60, X1 = 60, Y0 = -45, Y1 = 45;
  const minor = clamp((CAM.s - 22) / 50) * 0.32;
  ctx.lineCap = 'butt';
  for (let x = X0 + 1; x < X1; x++) {
    const major = x % 5 === 0, a = major ? 0.55 : minor;
    if (a > 0.01) line3(ctx, [x, Y0, MATZ], [x, Y1, MATZ], `rgba(${C.matline},${a})`, major ? 1.6 : 1);
  }
  for (let y = Y0 + 1; y < Y1; y++) {
    const major = y % 5 === 0, a = major ? 0.55 : minor;
    if (a > 0.01) line3(ctx, [X0, y, MATZ], [X1, y, MATZ], `rgba(${C.matline},${a})`, major ? 1.6 : 1);
  }
}

// ------------------------------------------------------------------ shot 1: hook type on the mat
const HOOK_F = font(236, 800, DISP);
const HOOK = [
  { y: 5.05, words: [['Every', 0], ['network', 1]] },
  { y: 7.75, words: [['has', 4], ['layers', 5]], period: true },
];
function hookLayout(ctx) {
  return HOOK.map((ln) => {
    const sp = layout(ctx, ' ', HOOK_F).width;
    const ws = ln.words.map(([w, b]) => ({ w, b, wd: layout(ctx, w, HOOK_F).width }));
    const total = ws.reduce((s, x) => s + x.wd, 0) + sp * (ws.length - 1) + (ln.period ? 90 : 0);
    let x = -total / 2;
    ws.forEach((o) => { o.x = x; x += o.wd + sp; });
    return { ...ln, ws, end: x - sp };
  });
}
function stampWord(ctx, str, xpx, ypx, ub, u, col, F = HOOK_F) {
  if (u < ub - 0.3) return;
  const lift = ub > 0 ? 1 - E.inQuad(prog(u, ub - 0.3, ub)) : 0;
  const w = u >= ub ? wobble(u - ub, 2.6, 6) : 0;
  const sx = 1 + lift * 0.25 + 0.1 * w, sy = 1 + lift * 0.25 - 0.22 * w;
  ctx.save(); ctx.translate(xpx + 8 + lift * 40, ypx + 8 + lift * 30); ctx.scale(sx, sy);
  text(ctx, str, 0, 0, F, `rgba(${C.shadow},${0.28 * (1 - lift * 0.5)})`); ctx.restore();
  ctx.save(); ctx.translate(xpx - lift * 20, ypx - lift * 160); ctx.scale(sx, sy);
  text(ctx, str, 0, 0, F, col); ctx.restore();
}
function drawHook(ctx, u) {
  const L = hookLayout(ctx);
  flat(ctx, 0, 0, MATZ, () => { for (const ln of L) for (const o of ln.ws) stampWord(ctx, o.w, o.x, ln.y * 100, o.b, u, C.cream); });
  // the full stop is a tiny stack of three plates, landing one by one from beat 5.6
  const ln = L[1], px = (ln.end + 58) / 100, py = ln.y - 0.1;
  [0, 1, 2].forEach((k) => {
    const ub = 5.75 + k * 0.125;
    if (u < ub - 0.4) return;
    const drop = 6 * (1 - E.inQuad(prog(u, ub - 0.4, ub)));
    const sq = u >= ub ? wobble(u - ub, 2.6, 6) : 0;
    const z = MATZ + k * 0.3 + drop;
    const sp = P(px + 0.1, py + 0.08, MATZ), sr = CAM.s * (0.34 + drop * 0.05);
    if (k === 0) { ctx.beginPath(); ctx.ellipse(sp[0], sp[1], sr, sr * 0.45, 0, 0, Math.PI * 2); ctx.fillStyle = `rgba(${C.shadow},${0.3 - drop * 0.03})`; ctx.fill(); }
    box(ctx, px, py, z, 0.82 * (1 + 0.12 * sq), 0.82 * (1 + 0.12 * sq), 0.16, C.vc[[6, 2, 9][k]]);
  });
}

// ------------------------------------------------------------------ the stack (shots 2-10)
function plateZ(p, u) {
  if (u < p.land - 0.6) return null;
  if (u < p.land) return p.z + 9 * (1 - E.inQuad(prog(u, p.land - 0.6, p.land)));
  return p.z - 0.14 * ring(u - p.land, 2.0, 4.5);
}
const STANDOFFS = [[-5.1, -2.1], [0, -2.1], [5.1, -2.1], [-5.1, 2.1], [0, 2.1], [5.1, 2.1]];
function drawStandoffs(ctx, p, i, u, zTop, filterFront) {
  const k = E.outCubic(prog(u, p.land - 0.9, p.land - 0.35)) * (1 - flatK(u));
  if (k <= 0.01) return;
  const base = i === 0 ? MATZ : (plateZ(PLATES[i - 1], u) ?? PLATES[i - 1].z) + PT;
  const top = base + (zTop - base) * k;
  for (const [x, y] of STANDOFFS) {
    if ((depth(x, y) > 0) !== filterFront) continue;
    line3(ctx, [x, y, base], [x, y, top], shade(C.steel, 0.12), Math.max(2, CAM.s * 0.14));
    line3(ctx, [x - 0.03, y, base], [x - 0.03, y, top], mix(C.steel, '#ffffff', 0.3), Math.max(0.8, CAM.s * 0.04));
  }
}
function assetState(a, u) {
  const p = PLATES[a.plate], pz = plateZ(p, u);
  const pu = a.pop < 99 ? 16 + a.pop * 0.5 : 67;
  const [x, y] = posOf(a, u);
  return { k: pz == null ? 0 : springU(u, pu, SPRING.bouncy), sq: 0.9 * wobble(u - pu, 2.4, 5), X: x + plateDX(a.plate, u), Y: y + plateDY(a.plate, u), Z: (pz ?? p.z) + PT };
}
function assetDim(a, u) {
  const onPath = PATH.includes(a.name);
  const d6 = onPath ? 0 : prog(u, 39.8, 40.6) * (1 - prog(u, 46.6, 47.4));
  const inProp = a.name === 'web-01' || a.name === 'web-02';
  const d8 = inProp ? 0 : 0.55 * prog(u, 56.6, 57.4) * (1 - prog(u, 62.2, 63));
  return Math.max(d6, d8);
}
function flowState(f, u) {
  const t0 = f.t0 ?? 24 + (f.src === 'internet' ? 0 : 0.4 + f.i * 0.06);
  const p = E.outCubic(prog(u, t0, t0 + 1.4));
  let a = 1;
  a = lerp(a, 0.45, bump(u, 37, 2.6));                                          // pins and counter take focus
  const key = `${f.src}>${f.dst}`;
  if (!PATH_FLOWS.has(key)) a = lerp(a, 0.12, prog(u, 39.6, 40.2) * (1 - prog(u, 46.6, 47.4)));
  if (!f.prop) a = lerp(a, 0.25, prog(u, 56.6, 57.4) * (1 - prog(u, 62.2, 63)));
  let col = mix(C.thread, ({ net: C.xnet, inter: C.xinter, intra: C.xintra })[f.expo], f.t0 ? 1 : prog(u, 32 + f.layer * -0.08 + 0.24, 32.5 + f.layer * -0.08 + 0.24));
  // a proposal's new flows are green until it is published
  if (f.prop) col = mix(C.low, col, prog(u, 61.6, 62.4));
  return { p, a, col, dash: f.prop && u < 61.6 };
}
const CLOUD = [-8.6, 1.0, 12.6];
function cloudZ(u) {
  if (u < 23.4) return null;
  return CLOUD[2] + (u < 24 ? 8 * (1 - E.inQuad(prog(u, 23.4, 24))) : -0.25 * ring(u - 24, 1.8, 4));
}
const SVC = { 'svc:eset': { name: 'ESET updates', x: -6.6, y: -3.4, dz: -0.9, land: 45.5 }, 'svc:ubuntu': { name: 'Ubuntu mirrors', x: -4.4, y: -4.9, dz: -1.5, land: 46 } };
function endpoint(name, u) {
  if (name === 'internet') return [CLOUD[0] + 0.6, CLOUD[1] + 0.4, (cloudZ(u) ?? CLOUD[2]) - 0.7];
  if (SVC[name]) { const s = SVC[name]; return [s.x, s.y, (cloudZ(u) ?? CLOUD[2]) + s.dz]; }
  const a = A[name], s = assetState(a, u);
  return [s.X, s.Y, s.Z + MODEL_H[a.model] * 0.85 * (1 - flatK(u))];
}
function bez(a, b, t) {
  const mz = Math.max(a[2], b[2]) + 0.7 + 0.12 * Math.hypot(a[0] - b[0], a[1] - b[1]);
  const c = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, mz];
  const m = 1 - t;
  return [0, 1, 2].map((k) => m * m * a[k] + 2 * m * t * c[k] + t * t * b[k]);
}
function drawFlow(ctx, f, u, st) {
  if (st.p <= 0 || st.a <= 0.01) return;
  const a = endpoint(f.src, u), b = endpoint(f.dst, u);
  const N = 28, pts = [];
  for (let i = 0; i <= N; i++) pts.push(P(...bez(a, b, (i / N) * st.p)));
  ctx.save(); ctx.globalAlpha = st.a;
  ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.strokeStyle = st.col; ctx.lineWidth = Math.max(1.6, CAM.s * (f.prop && u < 62 ? 0.07 : 0.042)); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if ((f.risk && u >= 32) || st.dash) ctx.setLineDash([CAM.s * 0.16, CAM.s * 0.1]);
  ctx.stroke(); ctx.setLineDash([]);
  if (st.p >= 1) {
    const t = (u * 0.45 + hash01(f.i, 7)) % 1, q = P(...bez(a, b, t));
    ctx.beginPath(); ctx.arc(q[0], q[1], Math.max(2.5, CAM.s * 0.075), 0, Math.PI * 2);
    ctx.fillStyle = mix(st.col, '#ffffff', 0.45); ctx.fill();
    ctx.strokeStyle = st.col; ctx.lineWidth = 1.5; ctx.stroke();
  }
  ctx.restore();
}
// shot 6: the path from the Internet, hop by hop
function drawPath(ctx, u) {
  if (u < 39.2 || u > 47.5) return;
  const out = 1 - prog(u, 46.6, 47.4);
  for (let k = 0; k < 4; k++) {
    const ub = HOPS[k] - 0.8, p = E.inOutCubic(prog(u, ub, ub + 0.8));
    if (p <= 0) continue;
    const a = endpoint(PATH[k], u), b = endpoint(PATH[k + 1], u), pts = [];
    for (let i = 0; i <= 30; i++) pts.push(P(...bez(a, b, (i / 30) * p)));
    ctx.save(); ctx.globalAlpha = out;
    ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.strokeStyle = C.ink; ctx.lineWidth = Math.max(3, CAM.s * 0.1); ctx.lineCap = 'round'; ctx.stroke();
    ctx.strokeStyle = C.xnet; ctx.lineWidth = Math.max(1.5, CAM.s * 0.045); ctx.stroke();
    if (p < 1) { const q = pts[pts.length - 1]; ctx.beginPath(); ctx.arc(q[0], q[1], CAM.s * 0.13, 0, Math.PI * 2); ctx.fillStyle = C.cream; ctx.fill(); ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5; ctx.stroke(); }
    ctx.restore();
  }
}
function drawCloud(ctx, u) {
  const cz = cloudZ(u);
  if (cz == null) return;
  const c = P(CLOUD[0], CLOUD[1], cz), s = CAM.s * 0.95;
  const pts = [[-1.6, 0.35], [-1.35, -0.2], [-0.8, -0.35], [-0.55, -0.85], [0.05, -1.0], [0.55, -0.7], [0.85, -0.3], [1.4, -0.25], [1.7, 0.2], [1.4, 0.5], [-1.3, 0.5]];
  ctx.save(); ctx.translate(c[0], c[1]); ctx.scale(s, s);
  ctx.lineWidth = 1 / s * 1.2; ctx.strokeStyle = C.edge;
  for (let i = 0; i < pts.length; i++) {
    const p0 = pts[i], p1 = pts[(i + 1) % pts.length];
    ctx.beginPath(); ctx.moveTo(0.05, -0.1); ctx.lineTo(...p0); ctx.lineTo(...p1); ctx.closePath();
    ctx.fillStyle = tint(C.cloud[i % C.cloud.length]); ctx.fill(); ctx.stroke();
  }
  ctx.restore();
  chip(ctx, c[0] + CAM.s * 0.05, c[1] + CAM.s * 0.95, 'Internet', { size: Math.max(14, CAM.s * 0.3), bg: C.night ? C.panel : C.fg, fg: C.cream });
}
function drawServices(ctx, u) {
  for (const [id, s] of Object.entries(SVC)) {
    if (u < s.land - 0.5) continue;
    const e = endpoint(id, u);
    const k = springU(u, s.land, SPRING.bouncy);
    const fall = u < s.land ? 4 * (1 - E.inQuad(prog(u, s.land - 0.5, s.land))) : 0;
    octa(ctx, e[0], e[1], e[2] + fall, 0.42 * Math.max(0.01, k), C.xnet, 0.4 + u * 0.12);
    const q = P(e[0], e[1], e[2] + 0.75);
    chip(ctx, q[0], q[1], s.name, { size: Math.max(13, Math.min(20, CAM.s * 0.26)), bg: C.xnet, fg: '#ffffff', scale: springU(u, s.land + 0.3, SPRING.snappy) });
  }
}

function drawPlate(ctx, p, i, z, u) {
  const dy = plateDY(i, u), dx = plateDX(i, u);
  box(ctx, dx, dy, z, PW, PD, PT, C.card);
  const zt = z + PT;
  for (const v of p.vl) {
    const m = 0.14;
    poly(ctx, [P(dx + v.x0 + m, dy - PD / 2 + m, zt), P(dx + v.x1 - m, dy - PD / 2 + m, zt), P(dx + v.x1 - m, dy + PD / 2 - m, zt), P(dx + v.x0 + m, dy + PD / 2 - m, zt)], C.vc[v.ci], false);
  }
  const wipe = E.outCubic(prog(u, 22 + i * 0.15, 23 + i * 0.15));
  if (wipe > 0) {
    flat(ctx, dx - PW / 2 + 0.3, dy + PD / 2 - 0.32, zt, () => {
      ctx.save(); ctx.beginPath(); ctx.rect(-10, -80, 1100 * wipe, 100); ctx.clip();
      text(ctx, p.name, 0, 0, font(56, 800, DISP), shade(C.vc[p.vl[0].ci], 0.62), 'left', 3);
      ctx.restore();
    });
    for (const v of p.vl) {
      flat(ctx, dx + v.x0 + 0.32, dy - PD / 2 + 0.62, zt, () => {
        ctx.save(); ctx.beginPath(); ctx.rect(-10, -40, 700 * wipe, 60); ctx.clip();
        text(ctx, `VLAN ${v.num} · ${v.name.toUpperCase()}`, 0, 0, font(28, 700, UI), shade(C.vc[v.ci], 0.6), 'left', 1);
        ctx.restore();
      });
    }
  }
}
// 2D diagram card for an asset (the app's dark device cards)
function card2d(ctx, a, s, k) {
  const q = P(s.X, s.Y, s.Z + 0.02), w = CAM.s * 1.55, h = CAM.s * 0.62;
  ctx.save(); ctx.translate(q[0], q[1]); ctx.scale(k, k);
  rrect(ctx, -w / 2, -h / 2, w, h, 4); ctx.fillStyle = C.dev; ctx.fill();
  ctx.fillStyle = a.sev === 'none' ? C.none : C[a.sev]; ctx.fillRect(-w / 2 + 3, h / 2 - 4, w - 6, 2.5);
  text(ctx, a.name, -w / 2 + 8, 1, font(Math.max(10, CAM.s * 0.27), 700, UI), C.devText);
  text(ctx, ipOf(a), -w / 2 + 8, h / 2 - 8, font(Math.max(8, CAM.s * 0.17), 400, UI), mix(C.devText, C.dev, 0.35));
  ctx.restore();
}
const ipOf = (a) => ({ 50: '10.50.0.', 55: '10.55.0.', 30: '10.30.0.', 35: '10.35.0.', 20: '10.20.0.', 40: '10.40.0.', 10: '10.10.10.' })[a.vlan] + (10 + a.i * 3);

function drawStack(ctx, u) {
  const sinkK = E.inCubic(prog(u, 78.6, 79.8));
  if (sinkK >= 0.999) return;
  ctx.save();
  if (sinkK > 0) { const c0 = P(0, 0, MATZ); ctx.translate(c0[0], c0[1]); ctx.scale(1 - sinkK, 1 - sinkK); ctx.translate(-c0[0], -c0[1]); ctx.globalAlpha = 1 - sinkK * 0.6; }
  const sorted = (list) => list.slice().sort((a, b) => depth(a.x, a.y) - depth(b.x, b.y));
  const flowSt = new Map(ALL_FLOWS.map((f) => [f, flowState(f, u)]));
  const fk = flatK(u), tops = {};
  for (let i = 0; i < PLATES.length; i++) {
    const p = PLATES[i], z = plateZ(p, u);
    if (i === 0) { drawStandoffs(ctx, p, 0, u, z ?? p.z, false); drawStandoffs(ctx, p, 0, u, z ?? p.z, true); }
    if (z == null) continue;
    drawPlate(ctx, p, i, z, u);
    const next = PLATES[i + 1], nz = next ? plateZ(next, u) : null;
    if (next) drawStandoffs(ctx, next, i + 1, u, nz ?? next.z, false);
    drawRings(ctx, u, i);
    for (const a of sorted(ASSETS.filter((x) => x.plate === i))) {
      const s = assetState(a, u);
      DIMV = assetDim(a, u);
      if (fk < 0.75) {
        const r = model(ctx, a, s.X, s.Y, s.Z, s.k * (1 - clamp((fk - 0.45) / 0.3)), s.sq);
        tops[a.name] = r.top ?? s.Z;
      } else tops[a.name] = s.Z;
      if (fk > 0.45 && s.k > 0.5) card2d(ctx, a, s, clamp((fk - 0.45) / 0.3));
      const pin = pinOf(a, u);
      if (pin && fk < 0.5) drawPin(ctx, s.X + 0.12, s.Y + 0.1, tops[a.name], pin.h * (1 - fk * 2), C[pin.sev], pin.flag, pin.lean, 1.35);
      DIMV = 0;
    }
    if (next) drawStandoffs(ctx, next, i + 1, u, nz ?? next.z, true);
    ALL_FLOWS.forEach((f) => { if (f.layer === i) drawFlow(ctx, f, u, flowSt.get(f)); });
  }
  const netA = 1 - clamp(fk * 2.5);
  if (netA > 0.01) {
    ctx.save(); ctx.globalAlpha *= netA;
    drawCloud(ctx, u);
    drawServices(ctx, u);
    ALL_FLOWS.forEach((f) => { if (f.layer === 4) drawFlow(ctx, f, u, flowSt.get(f)); });
    ctx.restore();
  }
  drawPath(ctx, u);
  drawStackLabels(ctx, u, tops);
  ctx.restore();
}
function pinOf(a, u) {
  if (a.name === 'web-02' && u >= 66.3) {
    return { sev: 'crit', h: PIN_H.crit * springU(u, 66.5, SPRING.bouncy), flag: springU(u, 66.8, SPRING.bouncy), lean: 0.05 * ring(u - 66.5, 2, 4) };
  }
  if (a.pinU == null || u < a.pinU) return null;
  return { sev: a.sev, h: PIN_H[a.sev] * springU(u, a.pinU, SPRING.bouncy), flag: a.sev === 'crit' ? springU(u, 37, SPRING.bouncy) : 0, lean: 0.05 * ring(u - a.pinU, 2, 4) };
}
// selection ring on app-erp (shot 6) and the proposal's highlights (shot 8)
function drawRings(ctx, u, i) {
  const ringAt = (a, col, k, alpha) => {
    const s = assetState(a, u), c = P(s.X, s.Y, s.Z + 0.01), r = 0.8 * lerp(2.0, 1, k);
    ctx.save(); ctx.globalAlpha = alpha;
    ctx.beginPath(); ctx.ellipse(c[0], c[1], r * CAM.s, r * CAM.s * CAM.se, 0, 0, Math.PI * 2);
    ctx.strokeStyle = col; ctx.lineWidth = Math.max(3, CAM.s * 0.07); ctx.stroke();
    ctx.restore();
  };
  if (i === 2 && u > 44.8 && u < 47.4) ringAt(A['app-erp'], C.accent, springU(u, 45, SPRING.bouncy), clamp(springU(u, 45, SPRING.bouncy) * 3) * (1 - prog(u, 46.8, 47.4)));
  if (i === 3 && u > 56.8 && u < 62.6) {
    const al = (1 - prog(u, 61.8, 62.5));
    ringAt(A['web-02'], C.med, springU(u, 57, SPRING.bouncy), al);
    ringAt(A['web-01'], C.low, springU(u, 57.3, SPRING.bouncy), al);
  }
}
function drawStackLabels(ctx, u, tops) {
  const size = Math.max(13, Math.min(22, CAM.s * 0.27));
  if (u > 20.3 && u < 25) {
    for (const a of ASSETS) {
      if (a.pop >= 99) continue;
      const s = assetState(a, u); if (s.k < 0.5) continue;
      const k = springU(u, 20.5 + a.plate * 0.2 + a.pop * 0.04, SPRING.snappy) * (1 - prog(u, 24.2, 24.7));
      if (k <= 0) continue;
      const q = P(s.X, s.Y, tops[a.name] + 0.28);
      chip(ctx, q[0], q[1] - (1 - k) * 12, a.name, { size, scale: k });
    }
  }
  for (const [n, label, ub] of TAGS) {
    if (u < ub || u > 39.6) continue;
    const a = A[n], s = assetState(a, u), k = springU(u, ub, SPRING.bouncy) * (1 - prog(u, 39, 39.6));
    const q = P(s.X, s.Y, tops[n] + 0.25 + (u >= 34.5 && a.pinU ? PIN_H[a.sev] + 0.25 : 0));
    chip(ctx, q[0], q[1], label, { size: size * 1.25, bg: C.xnet, fg: '#ffffff', scale: k, bold: true });
  }
  for (let k = 1; k <= 4; k++) {
    const ub = HOPS[k - 1];
    if (u < ub || u > 47.4) continue;
    const n = PATH[k], a = A[n], s = assetState(a, u);
    const sk = springU(u, ub, SPRING.bouncy) * (1 - prog(u, 46.6, 47.2));
    const q = P(s.X, s.Y, tops[n] + (a.pinU ? PIN_H[a.sev] + 0.45 : 0.35));
    chip(ctx, q[0], q[1] - CAM.s * 0.1, `${k} hop${k > 1 ? 's' : ''} · ${n}`, { size: size * 1.1, bg: k === 4 ? C.crit : C.ink, fg: '#ffffff', scale: sk, bold: k === 4 });
  }
  // 2D: the level labels at the left of each plate
  const fk = flatK(u);
  if (fk > 0.6) PLATES.forEach((p, i) => {
    const q = P(plateDX(i, u) - PW / 2, plateDY(i, u) - PD / 2 - 0.3, p.z + PT);
    ctx.save(); ctx.globalAlpha = clamp((fk - 0.6) / 0.3);
    text(ctx, `LEVEL ${i} · ${p.name}`, q[0], q[1], font(17, 700, UI), C.cream, 'left', 2);
    ctx.restore();
  });
  // phpIPAM: the subnet arrives on the Servers VLAN (shot 9)
  if (u >= 67.3 && u < 78.8) {
    const k = springU(u, 67.5, SPRING.bouncy);
    const q = P(-5.2, -PD / 2 + 1.25, PLATES[2].z + PT);
    chip(ctx, q[0] + CAM.s * 1.4, q[1], '10.20.0.0/24 · phpIPAM', { size: size * 1.05, bg: C.xinter, fg: '#ffffff', scale: k, bold: true });
  }
}

// ------------------------------------------------------------------ shot 11: end card on the mat
const WORD = 'STRATA', WORD_F = font(300, 800, WIDE);
function drawEnd(ctx, u) {
  if (u < 80.2) return;
  const L = layout(ctx, WORD, WORD_F, 10);
  const x0 = -L.width / 2;
  flat(ctx, 0, 0.1, MATZ, () => {
    // each letter lands as four strata: three plate colours, then the cream face
    L.glyphs.forEach((g, i) => {
      const ub = 80.5 + i * 0.25;
      const layers = [C.vc[0], C.vc[2], C.vc[6]];
      layers.forEach((col, l) => {
        const off = (3 - l) * 11;
        stampWord(ctx, g.ch, x0 + g.x + off, off, ub - 0.06 * (3 - l), u, col, WORD_F);
      });
      stampWord(ctx, g.ch, x0 + g.x, 0, ub, u, C.cream, WORD_F);
    });
    const tl = 'The 3D map of your information systems.';
    const f = font(54, 400, UI), tw = layout(ctx, tl, f).width;
    const k = springU(u, 83.5, SPRING.gentle);
    ctx.save(); ctx.beginPath(); ctx.rect(-tw / 2 - 20, 70, tw + 40, 90); ctx.clip();
    text(ctx, tl, 0, 130 + (1 - k) * 80, f, C.capsub, 'center');
    ctx.restore();
    // the one command it takes
    if (u >= 85) {
      const kc = springU(u, 85, SPRING.bouncy), cmd = '$ docker compose up -d', cf = font(44, 700, UI), cw = layout(ctx, cmd, cf).width + 70;
      ctx.save(); ctx.translate(0, 250); ctx.scale(kc, kc);
      rrect(ctx, -cw / 2, -44, cw, 76, 8); ctx.fillStyle = C.night ? '#0d1012' : C.ink; ctx.fill();
      text(ctx, cmd, 0, 8, cf, '#e8ebe6', 'center');
      ctx.restore();
    }
    if (u >= 86.5) {
      const kv = springU(u, 86.5, SPRING.bouncy), cx = L.width / 2 + 150;
      ctx.save(); ctx.translate(cx, -120); ctx.scale(kv, kv);
      rrect(ctx, -86, -44, 172, 72, 8); ctx.fillStyle = C.crit; ctx.fill();
      text(ctx, 'v0.5', 0, 12, font(50, 700, UI), '#ffffff', 'center');
      ctx.restore();
    }
    if (u >= 88) {
      const kk = springU(u, 88, SPRING.gentle), s = 'Self-hosted · AGPL-3.0 · github.com/SolidGeeks/strata';
      ctx.save(); ctx.globalAlpha = clamp(kk); text(ctx, s, 0, 370 + (1 - kk) * 30, font(30, 400, UI), C.capsub, 'center', 1); ctx.restore();
    }
  });
}

// ------------------------------------------------------------------ screen UI
function chip(ctx, x, y, str, { size = 16, bg = C.panel, fg = C.fg, scale = 1, bold = false } = {}) {
  if (scale <= 0.01) return;
  const f = font(size, bold ? 700 : 400, UI), w = layout(ctx, str, f).width + size * 1.1, h = size * 1.75;
  ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale);
  rrect(ctx, -w / 2, -h, w, h, 3); ctx.fillStyle = bg; ctx.fill();
  if (bg === C.panel) { ctx.strokeStyle = C.line; ctx.lineWidth = 1; ctx.stroke(); }
  ctx.beginPath(); ctx.moveTo(-5, 0); ctx.lineTo(0, 6); ctx.lineTo(5, 0); ctx.fillStyle = bg; ctx.fill();
  text(ctx, str, 0, -h / 2 + size * 0.36, f, fg, 'center');
  ctx.restore();
}
const CAP_X = 96, CAP_Y = 990;
function caption(ctx, u, u0, u1, kicker, line, size = 92) {
  if (u < u0 - 0.01 || u > u1 + 1) return;
  const f = font(size, 800, DISP), words = line.split(' ');
  const sp = layout(ctx, ' ', f).width;
  let x = CAP_X;
  const out = E.inCubic(prog(u, u1, u1 + 0.6));
  ctx.save(); ctx.beginPath(); ctx.rect(CAP_X - 20, CAP_Y - size * 0.95, W, size * 1.25); ctx.clip();
  ctx.shadowColor = `rgba(${C.shadow},0.55)`; ctx.shadowBlur = 18; ctx.shadowOffsetY = 3;
  words.forEach((w, i) => {
    const k = springU(u, u0 + i * 0.12, SPRING.snappy);
    text(ctx, w, x, CAP_Y + (1 - k) * size * 1.1 - out * size * 1.2, f, C.cream);
    x += layout(ctx, w, f).width + sp;
  });
  ctx.restore();
  const kf2 = font(27, 700, UI), kk = springU(u, u0 + 0.2, SPRING.snappy);
  let kx = CAP_X;
  ctx.save(); ctx.beginPath(); ctx.rect(CAP_X - 20, CAP_Y - size - 52, W, 40); ctx.clip();
  for (const [t, col] of kicker) {
    const ky = CAP_Y - size - 22 + (1 - kk) * 34 - out * 40;
    if (col) { ctx.beginPath(); ctx.arc(kx + 8, ky - 8, 8, 0, Math.PI * 2); ctx.fillStyle = col; ctx.fill(); kx += 24; }
    text(ctx, t, kx, ky, kf2, C.capsub, 'left', 2);
    kx += layout(ctx, t, kf2, 2).width + 30;
  }
  ctx.restore();
}
// a segmented control as in the app: [labels], selected index, press pulse, position
function seg(ctx, x, y, labels, sel, press, bw = 200, bh = 64) {
  rrect(ctx, x, y, bw * labels.length, bh, 4); ctx.fillStyle = C.panel; ctx.fill(); ctx.strokeStyle = C.line; ctx.lineWidth = 1.5; ctx.stroke();
  labels.forEach((t, i) => {
    const on = i === sel, bx = x + i * bw;
    if (on) {
      ctx.save(); ctx.translate(bx + bw / 2, y + bh / 2); ctx.scale(1 - 0.05 * press, 1 - 0.05 * press);
      rrect(ctx, -bw / 2, -bh / 2, bw, bh, 3); ctx.fillStyle = C.fg; ctx.fill(); ctx.restore();
    }
    if (i) { ctx.fillStyle = C.line; ctx.fillRect(bx, y + 1, 1.5, bh - 2); }
    text(ctx, t, bx + bw / 2, y + bh / 2 + 9, font(25, on ? 700 : 400, UI), on ? C.panel : C.muted, 'center');
  });
}
function viewSwitch(ctx, u) {
  if (u < 47.2 || u > 56.4) return;
  const k = springU(u, 47.4, SPRING.snappy) - springU(u, 55.6, SPRING.snappy);
  const bw = 230, x = W / 2 - bw, y = 48 - (1 - k) * 160;
  seg(ctx, x, y, ['3D model', '2D diagram'], u >= 48 && u < 53.6 ? 1 : 0, Math.max(bump(u, 48.05, 0.15), bump(u, 53.65, 0.15)), bw);
}
// the 2D editor's cursor drags web-02 along its plate
function cursor(ctx, u) {
  if (u < 49.8 || u > 53.2) return;
  const a = A['web-02'], s = assetState(a, u), q = P(s.X, s.Y, s.Z);
  const enter = 1 - E.outCubic(prog(u, 49.8, 50.5)), leave = E.inCubic(prog(u, 52.5, 53.2));
  const x = q[0] + 18 + enter * 260 + leave * 220, y = q[1] + 6 + enter * 140 - leave * 60;
  const down = u >= DRAG.from && u < DRAG.to + 0.1;
  ctx.save(); ctx.translate(x, y); ctx.scale(down ? 0.92 : 1, down ? 0.92 : 1);
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 34); ctx.lineTo(9, 26); ctx.lineTo(16, 41); ctx.lineTo(22, 38); ctx.lineTo(15, 23); ctx.lineTo(27, 23); ctx.closePath();
  ctx.fillStyle = '#ffffff'; ctx.fill(); ctx.strokeStyle = '#111'; ctx.lineWidth = 2; ctx.stroke();
  ctx.restore();
}
// shot 8: the app's mode bar, Draft then Review
function modeBar(ctx, u) {
  if (u < 56 || u > 63.6) return;
  const k = springU(u, 56.2, SPRING.snappy) - springU(u, 62.9, SPRING.snappy);
  const bw = 1240, bh = 92, x = W - bw - 70, y = 40 - (1 - k) * 200;
  const review = u >= 59;
  ctx.save();
  ctx.fillStyle = `rgba(${C.shadow},0.25)`; rrect(ctx, x + 6, y + 10, bw, bh, 6); ctx.fill();
  rrect(ctx, x, y, bw, bh, 6); ctx.fillStyle = C.panel; ctx.fill(); ctx.strokeStyle = C.accent; ctx.lineWidth = 3; ctx.stroke();
  rrect(ctx, x, y, 170, bh, 6); ctx.fillStyle = C.accent; ctx.fill(); ctx.fillRect(x + 160, y, 10, bh);
  text(ctx, review ? 'REVIEW' : 'DRAFT', x + 85, y + bh / 2 + 10, font(28, 800, DISP), C.night ? '#0d1012' : '#ffffff', 'center', 3);
  text(ctx, 'Allow Ubuntu updates for the DMZ', x + 200, y + 42, font(28, 700, UI), C.fg);
  const n = u < 57 ? 1 : u < 57.5 ? 2 : 3;
  text(ctx, review ? `by alice · ${n} changes · to review` : `${n} change${n > 1 ? 's' : ''} · not on the map until approved`, x + 200, y + 74, font(20, 400, UI), C.muted);
  // button: Submit for review, then Approve and publish (pressed on 61)
  const label = review ? 'Approve and publish' : 'Submit for review';
  const press = bump(u, 58.55, 0.15) + bump(u, 61.05, 0.15);
  const done = u >= 61.05;
  const bf = font(24, 700, UI), btw = layout(ctx, label, bf).width + 48, bx = x + bw - btw - 22, by = y + 18;
  ctx.save(); ctx.translate(bx + btw / 2, by + 28); ctx.scale(1 - 0.06 * press, 1 - 0.06 * press);
  rrect(ctx, -btw / 2, -28, btw, 56, 4); ctx.fillStyle = done ? C.low : C.fg; ctx.fill();
  text(ctx, done ? 'Published' : label, 0, 8, bf, C.panel, 'center');
  ctx.restore();
  ctx.restore();
  // toast
  if (u >= 61.3 && u < 63.4) {
    const tk = springU(u, 61.3, SPRING.bouncy) * (1 - prog(u, 62.9, 63.3));
    ctx.save(); ctx.translate(W - 70 - 620, 210); ctx.scale(tk, tk);
    const tt = 'Approved and published · version 42', f = font(22, 700, UI), w = layout(ctx, tt, f).width + 56;
    rrect(ctx, -w / 2, -28, w, 54, 4); ctx.fillStyle = C.night ? C.panel : C.fg; ctx.fill();
    text(ctx, tt, 0, 7, f, C.night ? C.fg : C.panel, 'center');
    ctx.restore();
  }
}
// shot 9: the connectors panel, one card per tool; each sends its data into the map
const TOOLS = [
  ['CVE', 'Cyberwatch', 'Vulnerabilities', 64, 'web-02', 66.5],
  ['INV', 'GLPI', 'Inventory, software, contacts', 64.5, 'srv-print-01', 67],
  ['IP', 'phpIPAM', 'Subnets and VLANs', 65, 'subnet', 67.5],
  ['FW', 'Palo Alto', 'Firewall rules', 65.5, 'web-02', 68],
];
function connectors(ctx, u) {
  if (u < 63.6 || u > 72.6) return;
  const out = E.inCubic(prog(u, 71.6, 72.4));
  const x0 = 72, cw = 520, ch = 104;
  TOOLS.forEach(([ico, name, what, ub, target, arrive], i) => {
    const k = springU(u, ub, SPRING.snappy);
    if (k <= 0.01) return;
    const x = x0 - (1 - k) * 700 - out * 760, y = 96 + i * (ch + 18);
    ctx.save();
    ctx.fillStyle = `rgba(${C.shadow},0.22)`; rrect(ctx, x + 6, y + 8, cw, ch, 5); ctx.fill();
    rrect(ctx, x, y, cw, ch, 5); ctx.fillStyle = C.panel; ctx.fill(); ctx.strokeStyle = C.line; ctx.lineWidth = 1.5; ctx.stroke();
    rrect(ctx, x + 20, y + 22, 60, 60, 4); ctx.strokeStyle = C.line; ctx.lineWidth = 1.5; ctx.stroke();
    text(ctx, ico, x + 50, y + 59, font(18, 700, UI), C.accent, 'center', 1);
    text(ctx, name, x + 100, y + 50, font(30, 800, DISP), C.fg);
    text(ctx, what, x + 100, y + 80, font(19, 400, UI), C.muted);
    // status: syncing, then the proposal is ready
    const sync = u >= arrive - 1.4, ready = u >= arrive;
    const st = ready ? 'PROPOSAL' : sync ? 'SYNCING' : 'BY HAND';
    const sc = ready ? C.low : sync ? C.med : C.muted;
    const sf = font(16, 700, UI), sw = layout(ctx, st, sf, 1.5).width + 20;
    rrect(ctx, x + cw - sw - 18, y + 20, sw, 30, 3); ctx.strokeStyle = sc; ctx.lineWidth = 1.5; ctx.stroke();
    text(ctx, st, x + cw - sw / 2 - 18, y + 41, sf, sc, 'center', 1.5);
    ctx.restore();
    // the data travels from the card to its place on the map
    const p = prog(u, arrive - 1.2, arrive);
    if (p > 0 && p < 1) {
      let tq;
      if (target === 'subnet') tq = P(-5.2 + 1.4, -PD / 2 + 1.25, PLATES[2].z + PT);
      else { const a = A[target], s = assetState(a, u); tq = P(s.X, s.Y, s.Z + 1.2); }
      const sx = x + cw, sy = y + ch / 2, e = E.inOutCubic(p);
      const mxp = (sx + tq[0]) / 2, myp = Math.min(sy, tq[1]) - 120;
      const bx = (1 - e) * (1 - e) * sx + 2 * (1 - e) * e * mxp + e * e * tq[0], by = (1 - e) * (1 - e) * sy + 2 * (1 - e) * e * myp + e * e * tq[1];
      ctx.beginPath(); ctx.arc(bx, by, 9, 0, Math.PI * 2); ctx.fillStyle = C.accent; ctx.fill();
      ctx.strokeStyle = C.panel; ctx.lineWidth = 3; ctx.stroke();
    }
  });
  if (u >= 69.4) {
    const k = springU(u, 69.5, SPRING.bouncy) * (1 - out);
    ctx.save(); ctx.translate(x0 + cw / 2, 96 + 4 * (ch + 18) + 34); ctx.scale(k, k);
    const tt = '4 proposals to review', f = font(24, 700, UI), w = layout(ctx, tt, f).width + 60;
    rrect(ctx, -w / 2, -30, w, 58, 4); ctx.fillStyle = C.accent; ctx.fill();
    text(ctx, tt, 0, 8, f, C.night ? '#0d1012' : '#ffffff', 'center');
    ctx.restore();
  }
}
function themeSwitch(ctx, u) {
  if (u < 70.8 || u > 79.6) return;
  const k = springU(u, 71, SPRING.snappy) - springU(u, 78.8, SPRING.snappy);
  const bw = 150, x = W - 72 - bw * 3 + (1 - k) * 700, y = 72;
  text(ctx, 'DISPLAY › THEME', x, y - 18, font(22, 700, UI), C.capsub, 'left', 2);
  seg(ctx, x, y, ['Auto', 'Day', 'Night'], u >= 72 ? 2 : 1, bump(u, 72.05, 0.15), bw);
}
function counter(ctx, u) {
  if (u < 36.6 || u > 40.2) return;
  const k = springU(u, 36.7, SPRING.snappy), out = E.inCubic(prog(u, 39.4, 40));
  const v = Math.round(12 * E.outCubic(prog(u, 37, 38.6)));
  const land = u >= 38.6 ? 1 + 0.12 * wobble(u - 38.6, 2.5, 6) : 1;
  ctx.save(); ctx.beginPath(); ctx.rect(CAP_X - 20, CAP_Y - 260, 1100, 300); ctx.clip();
  const dy = (1 - k) * 260 + out * -300;
  ctx.save(); ctx.translate(CAP_X, CAP_Y + dy); ctx.scale(land, land);
  text(ctx, String(v), 0, 0, font(250, 800, DISP), '#ffffff');
  ctx.restore();
  const nw = layout(ctx, '12', font(250, 800, DISP)).width;
  text(ctx, 'critical', CAP_X + nw + 30, CAP_Y + dy, font(92, 800, DISP), C.cream);
  text(ctx, 'VULNERABILITIES · IS LYON', CAP_X + nw + 34, CAP_Y + dy - 112, font(24, 700, UI), C.capsub, 'left', 2);
  ctx.restore();
}
// shot 2: the IS name printed on the mat in front of the stack
function matPrint(ctx, u) {
  if (u < 12.6 || u > 24) return;
  const wipe = E.outCubic(prog(u, 13, 14.2)) * (1 - prog(u, 17, 18));
  if (wipe <= 0) return;
  flat(ctx, -PW / 2, PD / 2 + 1.0, MATZ, () => {
    ctx.save(); ctx.beginPath(); ctx.rect(-10, -10, 1500 * wipe, 200); ctx.clip();
    text(ctx, 'IS LYON', 0, 110, font(120, 800, WIDE), `rgba(255,255,255,0.82)`, 'left', 4);
    text(ctx, 'HQ & PLANT · 4 ZONES · 7 VLANS', 6, 160, font(30, 700, UI), `rgba(255,255,255,0.72)`, 'left', 2);
    ctx.restore();
  });
}

// ------------------------------------------------------------------ frame
const SHAKES = [[0, 10], [6, 14], [8, 5], [9.5, 5], [11, 5], [12.5, 5], [32, 12], [45, 8], [72, 10], [80.5, 10]];
function scene(ctx, u) {
  setCam(camera(u));
  ctx.save();
  for (const [b, a] of SHAKES) if (u >= b && u < b + 1) shake(ctx, u, b, a);
  drawMat(ctx);
  if (u < 10) drawHook(ctx, u);
  matPrint(ctx, u);
  if (u >= 7 && u < 79.9) drawStack(ctx, u);
  if (u >= 79.8) drawEnd(ctx, u);
  ctx.restore();
  caption(ctx, u, 18.6, 23.6, [['22 ASSETS · 7 VLANS · 4 ZONES', null]], 'Every asset, on its VLAN.');
  caption(ctx, u, 24.4, 31.4, [['28 FLOWS · IS LYON', null]], 'Every flow, hop by hop.');
  caption(ctx, u, 32.3, 36.2, [['INTERNET', C.xnet], ['INTER-VLAN', C.xinter], ['INTRA-VLAN', C.xintra]], 'See what’s exposed.');
  counter(ctx, u);
  caption(ctx, u, 40.3, 47.2, [['PATH · INTERNET → APP-ERP', null], ['INTERNET SERVICES', C.xnet]], 'See what the Internet reaches.');
  caption(ctx, u, 48.4, 55.4, [['2D DIAGRAM ⇄ 3D MODEL', null]], 'Draw in 2D. It’s the same model.');
  viewSwitch(ctx, u);
  cursor(ctx, u);
  caption(ctx, u, 56.5, 63.2, [['ADDED', C.low], ['MODIFIED', C.med], ['VERSION HISTORY', null]], 'Propose. Review. Publish.');
  modeBar(ctx, u);
  caption(ctx, u, 64.4, 71.4, [['ARRIVES AS PROPOSALS TO REVIEW', null]], 'Fed by the tools you already run.');
  connectors(ctx, u);
  caption(ctx, u, 73.4, 78.6, [['AUTO · DAY · NIGHT', null]], 'Day shift, night shift.');
  themeSwitch(ctx, u);
}
// shot 10: the theme flips with one diagonal wipe from the switch (top right) across the frame
function draw(ctx, u) {
  const p = E.inOutCubic(prog(u, 72.05, 73.1));
  if (u < 72.05) { C = DAY; scene(ctx, u); return; }
  if (p >= 1) { C = NIGHT; scene(ctx, u); return; }
  C = DAY; scene(ctx, u);
  const span = W + H * 0.6, edge = W + H * 0.3 - p * span;
  ctx.save();
  ctx.beginPath(); ctx.moveTo(edge, 0); ctx.lineTo(W + 10, 0); ctx.lineTo(W + 10, H); ctx.lineTo(edge - H * 0.6, H); ctx.closePath(); ctx.clip();
  C = NIGHT; scene(ctx, u);
  ctx.restore();
  // the wipe's leading edge: a bright seam, the film's only flash
  ctx.save();
  ctx.beginPath(); ctx.moveTo(edge, 0); ctx.lineTo(edge - H * 0.6, H);
  ctx.strokeStyle = `rgba(255,248,225,${0.9 * (1 - p * 0.5)})`; ctx.lineWidth = 26 * (1 - p) + 4; ctx.stroke();
  ctx.restore();
  C = NIGHT;
}

const HITS = [
  [0, 'Every', 'impact'], [1, 'network', 'pop', { pitch: 620 }],
  [4, 'has', 'thud'], [5, 'layers', 'pop', { pitch: 830 }],
  [5.75, 'stop plate 1', 'tick'], [5.875, 'stop plate 2', 'tick'], [6, 'stop plate 3 (full stop)', 'impact'],
  [7.6, 'camera tilts down', 'whoosh', { len: 0.7 }],
  [8, 'Industrial lands', 'thud'], [9.5, 'Office lands', 'thud'], [11, 'Core IT lands', 'thud'], [12.5, 'Exposed lands', 'thud'],
  [13, 'IS LYON prints', 'tick'],
  ...[587, 659, 698, 784, 880, 1047, 1175, 1397].map((hz, i) => [16 + i * 0.5, `assets pop ${i + 1}`, 'pop', { pitch: hz }]),
  [22, 'VLAN labels print', 'tick'],
  [24, 'Internet cloud + threads', 'whoosh'],
  [26, 'riser into the drop', 'riser', { len: 3 }],
  [32, 'exposure recolour (drop)', 'impact'], [33, 'IN 443', 'pop', { pitch: 700 }], [33.5, 'IN 3389', 'pop', { pitch: 790 }], [34, 'IN 25', 'pop', { pitch: 880 }],
  ...[0, 1, 2, 3, 4, 5, 6, 7].map((i) => [34.5 + i * 0.32, `pins rise ${i + 1}`, 'blip', { pitch: [880, 988, 1047, 1175, 1319, 1397, 1568, 1760][i] }]),
  [37, 'critical flags open', 'thud'], [38.6, 'counter lands: 12', 'pop', { pitch: 520 }],
  [40, 'hop 1 fw-edge', 'tick'], [41.5, 'hop 2 rproxy', 'tick'], [43, 'hop 3 web-01', 'tick'], [44.5, 'hop 4 app-erp', 'tick'],
  [45, 'selection ring on app-erp', 'impact'], [45.5, 'ESET service', 'pop', { pitch: 990 }], [46, 'Ubuntu service', 'pop', { pitch: 1180 }],
  [47.4, 'view switch', 'click'], [48, '2D diagram', 'whoosh'], [50.6, 'grab web-02', 'click'], [52.3, 'drop web-02', 'thud', { gain: 0.4 }],
  [53.6, 'back to 3D', 'whoosh'],
  [56.2, 'mode bar: Draft', 'whoosh'], [57, 'web-02 modified', 'pop', { pitch: 660 }], [57.3, 'new flow', 'pop', { pitch: 880 }], [57.5, 'new flow', 'pop', { pitch: 990 }],
  [58.55, 'Submit for review', 'click'], [59, 'Review', 'tick'], [61.05, 'Approve and publish', 'click'], [61.3, 'Published', 'bell'],
  [64, 'Cyberwatch card', 'tick'], [64.5, 'GLPI card', 'tick'], [65, 'phpIPAM card', 'tick'], [65.5, 'Palo Alto card', 'tick'],
  [66.5, 'CVE pin on web-02', 'pop', { pitch: 784 }], [67, 'srv-print-01 arrives', 'pop', { pitch: 880 }], [67.5, 'subnet arrives', 'pop', { pitch: 988 }], [68, 'rule arrives', 'pop', { pitch: 1175 }],
  [68, 'riser into night', 'riser', { len: 2 }], [69.5, '4 proposals', 'bell'],
  [71, 'theme switch', 'whoosh', { len: 0.5 }], [72.05, 'Night', 'click'], [72.1, 'night wipe', 'impact'],
  [78.6, 'to the end card', 'whoosh'],
  ...[0, 1, 2, 3, 4, 5].map((i) => [80.5 + i * 0.25, `letter ${'STRATA'[i]}`, i === 0 ? 'impact' : 'pop', { pitch: [0, 660, 740, 830, 880, 988][i] }]),
  [82.5, 'wordmark complete', 'bell'], [83.5, 'tagline', 'tick'], [85, 'docker compose up -d', 'pop', { pitch: 700 }], [86.5, 'v0.5', 'pop', { pitch: 880 }],
];

M.film({
  fonts: [font(40, 800, DISP), font(40, 800, WIDE), font(20, 400, UI), font(20, 700, UI)],
  draw, hits: HITS, samples: 10,
});
