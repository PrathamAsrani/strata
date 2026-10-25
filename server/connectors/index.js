// SPDX-License-Identifier: AGPL-3.0-or-later
// Connector manager: settings (data/connectors.json, secrets never sent back to browsers), runs (by hand or
// on a schedule) and their outcome. A run never writes the map: it prepares proposals that an approver
// reviews like any other (one per IS, refreshed in place while still open).
import fs from 'node:fs';
import path from 'node:path';
import * as cyberwatch from './cyberwatch.js';
import * as paloalto from './paloalto.js';
import * as glpi from './glpi.js';
import * as phpipam from './phpipam.js';
import { ConnectorError } from './util.js';

const MODULES = { cyberwatch, glpi, phpipam, paloalto };
const MASK = '••••••••';
const COMMON = [
  { k: 'enabled', label: 'Enabled', type: 'bool', default: false },
  { k: 'everyHours', label: 'Sync automatically every … hours (0 = by hand only)', type: 'number', default: 0 },
  { k: 'tlsInsecure', label: 'Accept any TLS certificate (self-signed, trusted network only)', type: 'bool', default: false, advanced: true },
  { k: 'tlsCa', label: 'CA certificate (PEM) to trust', type: 'text', placeholder: '-----BEGIN CERTIFICATE-----', advanced: true },
  { k: 'sites', label: 'Limit to these IS (empty = all)', type: 'sites', advanced: true },
];

// A document whose only difference is the connector link (ext) is not worth a review: leave it out
const noExt = o => JSON.stringify(o, (k, v) => (k === 'ext' ? undefined : v));
function dropLinkOnly(changes, state) {
  for (const kind of ['si', 'assets']) for (const [id, doc] of Object.entries(changes[kind] || {})) {
    if (doc && state[kind][id] && noExt(doc) === noExt(state[kind][id])) delete changes[kind][id];
  }
}

export function createConnectors({ dataDir, getState, upsertProposal, log, writeJson, broadcast }) {
  const FILE = path.join(dataDir, 'connectors.json');
  let store = { connectors: {}, runs: [] };
  try { if (fs.existsSync(FILE)) { const p = JSON.parse(fs.readFileSync(FILE, 'utf8')); store = { connectors: p.connectors || {}, runs: Array.isArray(p.runs) ? p.runs : [] }; } } catch (e) { log('connectors.json unreadable, starting empty:', e.message); }
  const running = new Map();
  const save = () => writeJson(FILE, JSON.stringify(store, null, 2)).then(() => { try { fs.chmodSync(FILE, 0o600); } catch { } });
  const fieldsOf = id => [...MODULES[id].meta.fields, ...COMMON];
  const cfgOf = id => store.connectors[id] = store.connectors[id] || { settings: {}, lastRun: null };

  // Settings as a module sees them (defaults filled in, TLS options grouped)
  function effective(id, overrides = {}) {
    const c = cfgOf(id), out = {};
    for (const f of fieldsOf(id)) out[f.k] = c.settings[f.k] !== undefined && c.settings[f.k] !== '' ? c.settings[f.k] : f.default;
    Object.assign(out, overrides);
    out.tls = { insecure: !!out.tlsInsecure, ca: out.tlsCa && /BEGIN CERTIFICATE/.test(out.tlsCa) ? out.tlsCa : undefined };
    return out;
  }
  function publicView(id) {
    const c = cfgOf(id), m = MODULES[id].meta, settings = {};
    for (const f of fieldsOf(id)) { const v = c.settings[f.k]; settings[f.k] = f.secret ? (v ? MASK : '') : (v === undefined ? (f.default ?? '') : v); }
    return { id, name: m.name, what: m.what, fields: fieldsOf(id), settings, configured: isConfigured(id), lastRun: c.lastRun, running: running.has(id) ? running.get(id).info : null };
  }
  function isConfigured(id) {
    const s = cfgOf(id).settings;
    if (id === 'paloalto') return !!s.site;
    return MODULES[id].meta.fields.filter(f => f.required).every(f => s[f.k]);
  }
  function update(id, body) {
    if (!MODULES[id]) throw new ConnectorError('Unknown connector');
    const c = cfgOf(id);
    for (const f of fieldsOf(id)) {
      if (!(f.k in (body || {}))) continue;
      let v = body[f.k];
      if (f.secret) { if (v === MASK) continue; if (v === '' || v == null) { delete c.settings[f.k]; continue; } }
      if (f.type === 'bool') v = !!v;
      else if (f.type === 'number') v = Math.max(0, Math.min(100000, parseFloat(v) || 0));
      else if (f.type === 'multi' || f.type === 'sites') v = Array.isArray(v) ? v.map(String).slice(0, 200) : [];
      else v = String(v ?? '').slice(0, f.type === 'text' || f.type === 'rules' ? 20000 : 2000).trim();
      c.settings[f.k] = v;
    }
    return save();
  }
  async function test(id) {
    if (!MODULES[id]) throw new ConnectorError('Unknown connector');
    return MODULES[id].test(effective(id));
  }
  // Starts a run; resolves when it is finished. opts: {by, xml, fileName, overrides}
  async function run(id, opts = {}) {
    if (!MODULES[id]) throw new ConnectorError('Unknown connector');
    if (running.has(id)) throw new ConnectorError(`${MODULES[id].meta.name} is already running.`);
    const started = new Date().toISOString();
    const info = { startedAt: started, by: opts.by || '', file: opts.fileName || null };
    running.set(id, { info });
    broadcast('connectors', { id, running: true });
    const rec = { id, at: started, by: opts.by || '', file: opts.fileName || null, ok: false, summary: '', error: null, proposals: [], ms: 0 };
    const t0 = Date.now();
    try {
      const cfg = effective(id, opts.overrides || {});
      const state = JSON.parse(JSON.stringify(getState()));
      const res = await MODULES[id].run(cfg, { state, xml: opts.xml, fileName: opts.fileName, log });
      const sites = cfg.sites && cfg.sites.length && id !== 'paloalto' ? new Set(cfg.sites) : null;
      for (const p of res.proposals || []) {
        if (sites && !sites.has(p.siteId)) continue;
        dropLinkOnly(p.changes, state);
        const out = await upsertProposal({ connector: id, connectorName: MODULES[id].meta.name, by: opts.by, uploadedBy: opts.xml ? opts.by : null, ...p });
        if (out) rec.proposals.push({ id: out.id, title: out.title, siteId: p.siteId, refreshed: out.refreshed, unchanged: out.unchanged });
      }
      rec.ok = true;
      rec.summary = res.summary || '';
      rec.report = res.report || null;
      if (!rec.proposals.length) rec.summary += (rec.summary ? ' ' : '') + 'The map already matches: no proposal.';
      log(`Connector ${id}: ${rec.summary}`);
    } catch (e) {
      rec.error = e instanceof ConnectorError ? e.message : `Unexpected error: ${e.message}`;
      if (!(e instanceof ConnectorError)) log('ERROR connector', id, e.stack || e.message);
      else log(`Connector ${id} failed: ${e.message}`);
    } finally {
      rec.ms = Date.now() - t0;
      running.delete(id);
      cfgOf(id).lastRun = rec;
      store.runs.unshift({ ...rec, report: undefined });
      store.runs = store.runs.slice(0, 60);
      await save();
      broadcast('connectors', { id, running: false });
    }
    return rec;
  }
  // Scheduler: checks once a minute which enabled connector is due
  setInterval(() => {
    const now = Date.now();
    for (const id of Object.keys(MODULES)) {
      const c = cfgOf(id), h = +c.settings.everyHours || 0;
      if (!c.settings.enabled || !h || running.has(id) || !isConfigured(id)) continue;
      if (id === 'paloalto' && !c.settings.url) continue;
      const last = c.lastRun ? Date.parse(c.lastRun.at) : 0;
      if (now - last >= h * 3600000) run(id, { by: 'schedule' }).catch(() => { });
    }
  }, 60000).unref();

  return {
    ids: Object.keys(MODULES),
    list: () => ({ connectors: Object.keys(MODULES).map(publicView), runs: store.runs.slice(0, 30) }),
    get: id => (MODULES[id] ? publicView(id) : null),
    update, test, run,
    isRunning: id => running.has(id),
    exists: id => !!MODULES[id],
  };
}
