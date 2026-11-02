import assert from 'node:assert/strict';
import fs from 'node:fs';
import { test } from 'node:test';

// Every published port must be bound to loopback on the host. A small line parser (no YAML dependency):
// the list items under each `ports:` key.
export function publishedPorts(text) {
  const out = [];
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const m = /^(\s*)ports:\s*$/.exec(lines[i]);
    if (!m) continue;
    for (let j = i + 1; j < lines.length; j++) {
      const item = /^\s*-\s*["']?([^"'\s#]+)["']?/.exec(lines[j]);
      if (!item || lines[j].search(/\S/) <= m[1].length) break;
      out.push(item[1]);
    }
  }
  return out;
}

const strip = (t) => t.split('\n').filter((l) => !/^\s*#/.test(l)).join('\n');
const compose = fs.readFileSync(new URL('../docker-compose.yml', import.meta.url), 'utf8');
const df = strip(fs.readFileSync(new URL('../Dockerfile', import.meta.url), 'utf8'));

test('docker-compose.yml publishes only on 127.0.0.1', () => {
  const ports = publishedPorts(compose);
  assert.ok(ports.length > 0, 'the parser found the published port');
  for (const p of ports) assert.match(p, /^127\.0\.0\.1:/, `${p} must start with 127.0.0.1:`);
});

test('the parser flags an unbound or wildcard publish', () => {
  for (const bad of ['- "8081:8081"', '- "0.0.0.0:8081:8081"', '- 8081', '- "[::]:8081:8081"']) {
    const ports = publishedPorts(`services:\n  a:\n    ports:\n      ${bad}\n`);
    assert.equal(ports.length, 1);
    assert.doesNotMatch(ports[0], /^127\.0\.0\.1:/);
  }
});

test('compose gives the container no host network, docker socket or privilege', () => {
  const code = strip(compose);
  assert.doesNotMatch(code, /network_mode:\s*host|docker\.sock|privileged:\s*true/);
});

test('every Dockerfile base image is Node 26', () => {
  const froms = df.split('\n').filter((l) => /^FROM\s/.test(l));
  assert.ok(froms.length >= 2);
  for (const l of froms) assert.match(l, /^FROM node:26-/, l);
});
