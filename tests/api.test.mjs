// SPDX-License-Identifier: AGPL-3.0-or-later
// API tests: start a real server on a temporary data folder and talk to it over HTTP. Run with: npm test
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { request } from 'node:http';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = mkdtempSync(join(tmpdir(), 'strata-api-'));
const port = 8200 + Math.floor(Math.random() * 500);
const base = `http://127.0.0.1:${port}`;
const PASS = { admin: 'admin-pass-123', alice: 'alice-pass-123', bob: 'bob-pass-1234', carol: 'carol-pass-123', vic: 'vic-pass-1234' };
let server;

before(async () => {
  server = spawn(process.execPath, [join(root, 'server/server.js')], {
    env: { ...process.env, PORT: String(port), HOST: '127.0.0.1', DATA_DIR: dataDir, EDIT_USER: 'admin', EDIT_PASS: PASS.admin, CONNECTORS: 'false', MAX_IMPORT_MB: '1' },
    stdio: ['ignore', 'pipe', 'inherit'],
  });
  await new Promise((res, rej) => { server.stdout.on('data', d => { if (String(d).includes('listening')) res(); }); server.on('exit', c => rej(new Error('exit ' + c))); });
  // one account per role; admin comes from EDIT_USER / EDIT_PASS
  for (const [name, role] of [['alice', 'contributor'], ['bob', 'approver'], ['carol', 'approver'], ['vic', 'viewer']]) {
    const r = await as('admin').put(`/api/users/${name}`, { role, password: PASS[name] });
    assert.equal(r.status, 200, JSON.stringify(r.data));
  }
});
after(async () => {
  if (server && server.exitCode === null) await new Promise(res => { server.once('exit', res); server.kill(); });
  rmSync(dataDir, { recursive: true, force: true, maxRetries: 5 });
});

class Client {
  constructor(user, password = PASS[user]) { this.auth = user ? 'Basic ' + Buffer.from(`${user}:${password}`).toString('base64') : ''; }
  // headers: extra headers; a null value removes a default one (used by the CSRF test)
  async req(method, path, body, headers = {}) {
    const h = { ...(body !== undefined ? { 'Content-Type': 'application/json', 'X-Requested-With': 'strata' } : {}), ...(this.auth ? { Authorization: this.auth } : {}), ...headers };
    for (const k of Object.keys(h)) if (h[k] === null) delete h[k];
    const res = await fetch(base + path, {
      method,
      headers: h,
      body: body !== undefined ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined,
    });
    const ct = res.headers.get('content-type') || '';
    return { status: res.status, data: ct.includes('json') ? await res.json() : await res.text(), headers: res.headers };
  }
  get(p) { return this.req('GET', p); }
  post(p, b = {}) { return this.req('POST', p, b); }
  put(p, b) { return this.req('PUT', p, b); }
  del(p) { return this.req('DELETE', p, {}); }
}
const as = user => new Client(user);
const rev = async () => (await as('admin').get('/api/state')).data.rev;

test('health check needs no account, and responses carry the security headers', async () => {
  const r = await new Client().get('/healthz');
  assert.equal(r.status, 200);
  assert.equal(r.data, 'ok');
  assert.match(r.headers.get('content-security-policy'), /default-src 'self'/);
  assert.equal(r.headers.get('x-frame-options'), 'DENY');
});

test('auth: no credentials, wrong password and unknown user are refused', async () => {
  const none = await new Client().get('/api/state');
  assert.equal(none.status, 401);
  assert.match(none.headers.get('www-authenticate'), /^Basic /);
  assert.equal((await new Client('admin', 'wrong-password').get('/api/state')).status, 401);
  assert.equal((await new Client('nobody', 'whatever-123').get('/api/state')).status, 401);
  const me = await as('alice').get('/api/me');
  assert.equal(me.data.role, 'contributor');
  assert.equal(me.data.canPropose, true);
  assert.equal(me.data.canWrite, false);
});

test('CSRF: a write without the JSON content type or X-Requested-With is refused', async () => {
  const admin = as('admin');
  // what a cross-site HTML form could send: no custom header, form encoding
  const form = await admin.req('PUT', '/api/si/csrf', 'name=x', { 'Content-Type': 'application/x-www-form-urlencoded', 'X-Requested-With': null });
  assert.equal(form.status, 400);
  const noHeader = await admin.req('PUT', '/api/si/csrf', '{"name":"x"}', { 'X-Requested-With': null });
  assert.equal(noHeader.status, 400);
  const wrongHeader = await admin.req('PUT', '/api/si/csrf', '{"name":"x"}', { 'X-Requested-With': 'XMLHttpRequest' });
  assert.equal(wrongHeader.status, 400);
  const legacy = await admin.req('PUT', '/api/si/csrf-legacy', '{"name":"x"}', { 'X-Requested-With': 'is-map' });
  assert.equal(legacy.status, 200, 'scripts written for IS Map keep working');
  assert.equal((await admin.get('/api/si/csrf')).status, 404, 'nothing was written');
});

test('roles: only approvers and admins write to the live map', async () => {
  assert.equal((await as('vic').put('/api/si/lyon', { name: 'Lyon' })).status, 403);
  assert.equal((await as('alice').put('/api/si/lyon', { name: 'Lyon' })).status, 403);
  const before = await rev();
  const r = await as('bob').put('/api/si/lyon', { name: 'Lyon' });
  assert.equal(r.status, 200, JSON.stringify(r.data));
  assert.equal(r.data.rev, before + 1);
  assert.equal((await as('vic').get('/api/si/lyon')).data.name, 'Lyon', 'viewers can read');
  assert.equal((await as('bob').put('/api/si/bad id!', { name: 'x' })).status, 400, 'ids are validated');
});

test('accounts: only admins manage them, with the documented safeguards', async () => {
  assert.equal((await as('bob').get('/api/users')).status, 403);
  const list = await as('admin').get('/api/users');
  assert.deepEqual(list.data.users.map(u => u.name), ['admin', 'alice', 'bob', 'carol', 'vic']);
  assert.ok(list.data.users.every(u => !('hash' in u) && !('salt' in u)), 'password hashes never leave the server');
  assert.equal((await as('admin').put('/api/users/dave', { role: 'viewer', password: 'short' })).status, 400);
  assert.equal((await as('admin').put('/api/users/dave', { role: 'boss', password: 'long-enough-1' })).status, 400);
  assert.equal((await as('admin').put('/api/users/admin', { role: 'viewer' })).status, 400, 'admin cannot demote themselves');
  assert.equal((await as('admin').del('/api/users/admin')).status, 400, 'admin cannot delete themselves');
});

test('proposals: a contributor proposes, an approver publishes, the map changes once', async () => {
  const alice = as('alice'), bob = as('bob');
  const created = await alice.post('/api/proposals', {
    title: 'Add the ERP server', siteId: 'lyon',
    changes: { assets: { 'srv-erp-01': { site: 'lyon', name: 'srv-erp-01', type: 'server', ip: '10.20.0.20' } } },
  });
  assert.equal(created.status, 200, JSON.stringify(created.data));
  const id = created.data.proposal.id;
  assert.equal(created.data.proposal.status, 'draft');
  assert.equal((await bob.get('/api/assets/srv-erp-01')).status, 404, 'a draft does not touch the map');

  assert.equal((await bob.post(`/api/proposals/${id}/approve`)).status, 409, 'a draft cannot be approved');
  assert.equal((await bob.post(`/api/proposals/${id}/submit`)).status, 403, 'only the author submits');
  assert.equal((await alice.post(`/api/proposals/${id}/submit`)).data.proposal.status, 'submitted');
  assert.equal((await alice.post(`/api/proposals/${id}/approve`)).status, 403, 'contributors cannot approve');

  const approved = await bob.post(`/api/proposals/${id}/approve`);
  assert.equal(approved.status, 200, JSON.stringify(approved.data));
  assert.equal((await bob.get('/api/assets/srv-erp-01')).data.ip, '10.20.0.20');
  const h = await bob.get('/api/history?limit=5');
  assert.match(h.data.entries[0].label, /Add the ERP server.*approved by bob/);
});

test('proposals: nobody approves their own (four-eyes rule)', async () => {
  const bob = as('bob');
  const { data } = await bob.post('/api/proposals', { title: 'Mine', changes: { si: { paris: { name: 'Paris' } } } });
  await bob.post(`/api/proposals/${data.proposal.id}/submit`);
  const self = await bob.post(`/api/proposals/${data.proposal.id}/approve`);
  assert.equal(self.status, 403);
  assert.match(self.data.error, /Someone else/);
  assert.equal((await as('carol').post(`/api/proposals/${data.proposal.id}/approve`)).status, 200, 'another approver can');
});

test('proposals: approving over a conflicting edit needs force', async () => {
  const alice = as('alice'), bob = as('bob');
  const { data } = await alice.post('/api/proposals', { title: 'Rename Lyon', changes: { si: { lyon: { name: 'Lyon HQ' } } } });
  await alice.post(`/api/proposals/${data.proposal.id}/submit`);
  await bob.put('/api/si/lyon', { name: 'Lyon (edited meanwhile)' });
  const r = await bob.post(`/api/proposals/${data.proposal.id}/approve`);
  assert.equal(r.status, 409);
  assert.ok(r.data.conflicts.length > 0);
  assert.equal((await bob.post(`/api/proposals/${data.proposal.id}/approve`, { force: true })).status, 200);
  assert.equal((await bob.get('/api/si/lyon')).data.name, 'Lyon HQ');
});

test('history: view an old version, roll back to it, and the rollback is itself undoable', async () => {
  const bob = as('bob');
  await bob.put('/api/si/nantes', { name: 'Nantes' });
  const good = await rev();
  await bob.del('/api/si/nantes');
  assert.equal((await bob.get('/api/si/nantes')).status, 404);
  assert.equal((await bob.get(`/api/state?at=${good}`)).data.si.nantes.name, 'Nantes', 'past versions are readable');

  assert.equal((await as('alice').post('/api/rollback', { rev: good })).status, 403);
  assert.equal((await bob.post('/api/rollback', { rev: 999999 })).status, 400);
  const rb = await bob.post('/api/rollback', { rev: good });
  assert.equal(rb.status, 200, JSON.stringify(rb.data));
  assert.equal((await bob.get('/api/si/nantes')).data.name, 'Nantes');
  assert.equal((await bob.get('/api/history?limit=1')).data.entries[0].label, `Restored version ${good}`);
});

test('import: replaces the map, validates ids, and enforces MAX_IMPORT_MB', async () => {
  const bob = as('bob');
  assert.equal((await bob.post('/api/import', { si: { 'bad id!': {} }, assets: {} })).status, 400);
  const big = { si: { x: { name: 'x'.repeat(1.2 * 1024 * 1024) } }, assets: {} };
  const tooBig = await bob.post('/api/import', big);
  assert.equal(tooBig.status, 413);
  assert.deepEqual(tooBig.data, { error: 'Payload too large' });
  const before = await rev();
  const r = await bob.post('/api/import', { si: { lille: { name: 'Lille' } }, assets: {} });
  assert.equal(r.status, 200, JSON.stringify(r.data));
  const s = (await bob.get('/api/state')).data;
  assert.deepEqual(Object.keys(s.si), ['lille']);
  assert.equal(s.rev, before + 1);
  const exp = await bob.get('/api/export');
  assert.equal(exp.data.format, 'strata');
  assert.match(exp.headers.get('content-disposition'), /strata-\d{4}-\d{2}-\d{2}\.json/);
});

test('request bodies: oversized ones get a 413 whether announced or streamed, and the server keeps serving', async () => {
  const bob = as('bob');
  const rawPost = (path, { body = '', headers = {}, end = true }) => new Promise((res, rej) => {
    const req = request({
      host: '127.0.0.1', port, path, method: 'POST',
      headers: { Authorization: bob.auth, 'Content-Type': 'application/json', 'X-Requested-With': 'strata', ...headers },
    }, r => { let b = ''; r.on('data', c => (b += c)); r.on('end', () => { req.destroy(); res({ status: r.statusCode, connection: r.headers.connection, data: JSON.parse(b) }); }); });
    req.on('error', rej);
    req.write(body);
    if (end) req.end();
  });

  const announced = await rawPost('/api/import', { headers: { 'Content-Length': 2 * 1024 * 1024 }, body: '{', end: false });
  assert.equal(announced.status, 413, 'rejected from the Content-Length header without waiting for the body');
  assert.equal(announced.connection, 'close');
  assert.deepEqual(announced.data, { error: 'Payload too large' });

  const streamed = await rawPost('/api/import', { body: JSON.stringify({ si: { x: { name: 'x'.repeat(1.2 * 1024 * 1024) } } }) });
  assert.equal(streamed.status, 413, 'chunked bodies without a Content-Length are counted too');
  assert.deepEqual(streamed.data, { error: 'Payload too large' });

  assert.equal((await bob.put('/api/me/password', { password: 'x'.repeat(8 * 1024) })).status, 413, 'small per-route limits apply');
  assert.deepEqual((await rawPost('/api/import', { body: '{"si":' })).data, { error: 'Invalid JSON' });
  assert.equal((await bob.get('/api/state')).status, 200);
});

test('static files: path traversal cannot reach the server code', async () => {
  const raw = p => new Promise((res, rej) => {
    request({ host: '127.0.0.1', port, path: p, headers: { Authorization: as('vic').auth } }, r => { let b = ''; r.on('data', c => (b += c)); r.on('end', () => res({ status: r.statusCode, body: b })); }).on('error', rej).end();
  });
  for (const p of ['/../server/server.js', '/%2e%2e/server/server.js', '/..%2fserver%2fserver.js', '/%2e%2e%2f%2e%2e%2fpackage.json']) {
    const r = await raw(p);
    assert.ok(r.status === 403 || r.status === 404, `${p} -> ${r.status}`);
    assert.doesNotMatch(r.body, /createServer|"dependencies"/, `${p} leaked a file`);
  }
  assert.equal((await raw('/')).status, 200, 'the app itself is served');
});
