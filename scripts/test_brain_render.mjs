// Boots the real /brain page and checks the graph actually paints.
// A source-string check cannot see a black canvas.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const site = path.join(root, 'site');
const chrome = process.env.CHROME || '/usr/local/bin/google-chrome';
const puppeteerHref = process.env.PUPPETEER_CORE
  || '/tmp/pup/node_modules/puppeteer-core/lib/esm/puppeteer/puppeteer-core.js';
if (!fs.existsSync(chrome) || !fs.existsSync(puppeteerHref)) {
  console.error('Set CHROME and PUPPETEER_CORE so this can boot a real browser.');
  process.exit(1);
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1');
  let file = path.join(site, decodeURIComponent(url.pathname));
  if (file.endsWith(path.sep)) file = path.join(file, 'index.html');
  if (!file.startsWith(site) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404);
    res.end('missing');
    return;
  }
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };
  res.writeHead(200, { 'content-type': types[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;

const puppeteer = await import(pathToFileURL(puppeteerHref).href);
const browser = await puppeteer.launch({
  executablePath: chrome,
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']
});

async function painted(page, url, viewport) {
  const errors = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  await page.setViewport(viewport);
  await page.goto(origin + url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => {
    const host = document.getElementById('graph');
    return host.dataset.startup === 'rendered' && Number(host.dataset.lit) > 0;
  }, { timeout: 20000 });
  const state = await page.evaluate(() => {
    const host = document.getElementById('graph');
    const canvas = host.querySelector('canvas');
    const box = canvas.getBoundingClientRect();
    const [bw, bh] = (host.dataset.buffer || '0x0').split('x').map(Number);
    return {
      startup: host.dataset.startup,
      nodes: host.dataset.nodes,
      phase: host.dataset.phase,
      controls: host.dataset.controls,
      cw: Math.round(box.width),
      ch: Math.round(box.height),
      bw, bh,
      lit: Number(host.dataset.lit)
    };
  });
  assert.deepEqual(errors, [], url);
  assert.equal(state.startup, 'rendered', url);
  assert.equal(state.nodes, '5659', url);
  assert.equal(state.phase, 'idle', url);
  assert.equal(state.controls, '1', url);
  assert.ok(state.cw > 100 && state.ch > 100, url + ' ' + state.cw + 'x' + state.ch);
  assert.ok(state.bw > 100 && state.bh > 100, url + ' buffer ' + state.bw + 'x' + state.bh);
  assert.ok(state.lit > 30, url + ' lit ' + state.lit);
  return state;
}

const page = await browser.newPage();
const desktop = await painted(page, '/brain/', { width: 1280, height: 800 });
const mobile = await painted(page, '/brain/?layout=main', { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await page.screenshot({ path: '/opt/cursor/artifacts/brain-mobile-rendered.png' });
console.log('render startup ok', JSON.stringify({ desktop, mobile }));
await browser.close();
server.close();
