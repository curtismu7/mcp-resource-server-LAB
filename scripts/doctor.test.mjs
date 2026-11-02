import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import http from 'node:http';
import net from 'node:net';
import { test } from 'node:test';

// Async spawn: the helper servers that hold the port live in this process, so the event loop must stay free.
const doctor = (env) => new Promise((resolve) => {
  const p = spawn(process.execPath, ['scripts/doctor.mjs'], { env: { ...process.env, ...env }, cwd: new URL('..', import.meta.url).pathname });
  let out = '';
  p.stdout.on('data', (d) => { out += d; });
  p.on('close', (status) => resolve({ status, out }));
});
// Track every accepted socket and destroy them before close(): a socket nobody reads never sees the peer hang up,
// and server.close() would otherwise wait for it (or for an HTTP keep-alive) indefinitely.
const sockets = new WeakMap();
const listen = (server) => new Promise((r) => {
  const set = new Set();
  sockets.set(server, set);
  server.on('connection', (c) => { set.add(c); c.on('error', () => {}); c.on('close', () => set.delete(c)); });
  server.listen(0, '127.0.0.1', () => r(server.address().port));
});
const close = (server) => new Promise((r) => {
  for (const c of sockets.get(server) ?? []) c.destroy();
  server.close(r);
});

test('doctor: a free port passes', async () => {
  const s = net.createServer();
  const port = await listen(s);
  await close(s);
  const { out } = await doctor({ PORT: String(port) });
  assert.match(out, /^PASS\s+port: \d+ is free/m);
});

test('doctor: a port held by something else is a warning, not a failure', async () => {
  const s = net.createServer();
  const port = await listen(s);
  try {
    const { out } = await doctor({ PORT: String(port) });
    assert.match(out, /^WARN\s+port:.*something else/m);
  } finally { await close(s); }
});

test('doctor: a port answering demo-health/1 for this server is recognised', async () => {
  const s = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ schema: 'demo-health/1', state: 'ready', demo: { id: 'mcp-resource-server' } }));
  });
  const port = await listen(s);
  try {
    const { out } = await doctor({ PORT: String(port) });
    assert.match(out, /^PASS\s+port:.*in use by this server/m);
  } finally { await close(s); }
});

test('doctor: an unknown vertical fails with exit 1 and a non-loopback HOST warns', async () => {
  const { status, out } = await doctor({ VERTICAL: 'no-such-vertical', HOST: '0.0.0.0', PORT: '0' });
  assert.equal(status, 1);
  assert.match(out, /^FAIL\s+vertical:/m);
  assert.match(out, /^WARN\s+bind:/m);
});

test('doctor never prints a setting value', async () => {
  const { out } = await doctor({ PINGONE_ISSUER: 'https://secret-marker.invalid/as', PORT: '0' });
  assert.doesNotMatch(out, /secret-marker/);
});
