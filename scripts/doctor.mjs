// Preflight for the MCP resource server. Prints pass/warn/fail lines, never the value of a setting.
// Exit 1 on any failure. Makes no outbound call: the only request is to this machine's own port.
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
try { process.loadEnvFile(path.join(root, '.env')); } catch { /* optional */ }

let failed = 0;
const report = (level, name, detail) => {
  if (level === 'fail') failed++;
  console.log(`${level.toUpperCase().padEnd(4)}  ${name}: ${detail}`);
};

const major = Number(process.versions.node.split('.')[0]);
if (major >= 26) report('pass', 'node', `Node ${process.versions.node}`);
else report('fail', 'node', `Node ${process.versions.node}; this repo needs Node 26 or newer`);

const built = fs.existsSync(path.join(root, 'dist', 'index.js'));
if (built) report('pass', 'build', 'dist/index.js exists');
else report('fail', 'build', 'dist/index.js is missing. Run: npm run build');

const vertical = process.env.VERTICAL || 'banking';
const vdir = path.join(process.env.VERTICALS_DIR || path.join(root, 'verticals'), vertical);
const files = ['vertical.json', 'schema.sql', 'seed.json'];
const missing = files.filter((f) => !fs.existsSync(path.join(vdir, f)));
if (missing.length) {
  report('fail', 'vertical', `"${vertical}" is missing ${missing.join(', ')} (VERTICAL names a folder under verticals/)`);
} else if (built) {
  try {
    const { loadVertical } = createRequire(import.meta.url)(path.join(root, 'dist', 'vertical', 'load.js'));
    const v = loadVertical(vdir);
    report('pass', 'vertical', `"${vertical}" validates: ${v.tools.length} tools, ${v.resources.length} resources, ${v.prompts.length} prompts`);
  } catch (e) {
    report('fail', 'vertical', `"${vertical}" does not validate: ${e instanceof Error ? e.message : String(e)}`);
  }
} else {
  report('pass', 'vertical', `"${vertical}" has ${files.join(', ')} (not validated: build first)`);
}

const jwks = process.env.PINGONE_JWKS_URI || process.env.PINGONE_ISSUER || process.env.PINGONE_BASE_URL;
if (jwks) report('pass', 'auth', 'a JWKS source is set: token signatures are verified against it (this needs the network)');
else if (process.env.STRICT_AUTH === 'true') report('pass', 'auth', 'no JWKS source and STRICT_AUTH=true: every token is refused');
else report('warn', 'auth', 'no JWKS source and STRICT_AUTH is not true: well-formed tokens are accepted unverified (offline mode, keep it on loopback)');

const host = process.env.HOST || '127.0.0.1';
if (host === '127.0.0.1' || host === 'localhost' || host === '::1') report('pass', 'bind', 'HOST is loopback');
else report('warn', 'bind', 'HOST is not loopback: the server is reachable from other machines');

const port = Number(process.env.PORT) || 8081;
const free = await new Promise((resolve) => {
  const s = net.createServer();
  s.once('error', (e) => resolve(e.code));
  s.listen(port, '127.0.0.1', () => s.close(() => resolve(null)));
});
if (!free) {
  report('pass', 'port', `${port} is free`);
} else {
  let ours = false;
  try {
    const r = await fetch(`http://127.0.0.1:${port}/api/health`, { signal: AbortSignal.timeout(2000) });
    const j = await r.json();
    ours = j?.schema === 'demo-health/1' && j?.demo?.id === 'mcp-resource-server';
  } catch { /* not ours */ }
  if (ours) report('pass', 'port', `${port} is in use by this server (/api/health answered demo-health/1)`);
  else report('warn', 'port', `${port} is in use by something else (${free}). Start on another port: PORT=<other> npm start`);
}

process.exit(failed ? 1 : 0);
