#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawn } = require('child_process');

const root = path.resolve(__dirname, '..', '..');
const evidenceDir = path.join(root, 'docs', 'prompt-history', 'evidence');
const htmlPath = path.join(evidenceDir, 'evidence-export.html');
const manifestPath = path.join(evidenceDir, 'manifest.json');
const chromePath = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const debugPort = 11800 + Math.floor(Math.random() * 150);
const profile = path.join(process.env.TEMP, 'codex-evidence-' + Date.now());
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  if (!fs.existsSync(htmlPath)) throw new Error('请先运行 render_evidence.py');
  const chrome = spawn(chromePath, [
    '--headless=new', '--no-sandbox', '--disable-gpu', '--hide-scrollbars',
    '--force-device-scale-factor=1', '--remote-allow-origins=*',
    '--remote-debugging-port=' + debugPort, '--user-data-dir=' + profile, '--allow-file-access-from-files',
    'file:///' + htmlPath.replace(/\\/g, '/')
  ], { stdio: 'ignore' });
  let targets = null;
  for (let i = 0; i < 100; i++) {
    try {
      const response = await fetch(`http://127.0.0.1:${debugPort}/json/list`);
      if (response.ok) { targets = await response.json(); break; }
    } catch (error) {}
    await sleep(150);
  }
  if (!targets) throw new Error('无法连接 Chrome');
  const tab = targets.find((item) => item.type === 'page');
  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
  let id = 0;
  const pending = new Map();
  ws.onmessage = (event) => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      const item = pending.get(message.id); pending.delete(message.id);
      message.error ? item.reject(new Error(JSON.stringify(message.error))) : item.resolve(message.result);
    }
  };
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const current = ++id; pending.set(current, { resolve, reject });
    ws.send(JSON.stringify({ id: current, method, params }));
  });
  const evaluate = async (expression) => {
    const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
    return result.result ? result.result.value : null;
  };
  await send('Runtime.enable'); await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  for (let i = 0; i < 80; i++) {
    if (await evaluate("document.readyState==='complete'&&document.fonts.status==='loaded'")) break;
    await sleep(100);
  }
  await sleep(300);
  const pages = await evaluate(`[...document.querySelectorAll('.evidence-page')].map(el => { const r=el.getBoundingClientRect(); return {id:el.dataset.page,x:r.x+scrollX,y:r.y+scrollY,width:r.width,height:r.height}; })`);
  if (pages.length !== 12) throw new Error('证据页数量不正确：' + pages.length);
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const byId = {};
  manifest.chains.forEach((chain) => chain.pages.forEach((page) => { byId[page.id] = page; }));
  const results = [];
  for (const page of pages) {
    const shot = await send('Page.captureScreenshot', {
      format: 'png', fromSurface: true, captureBeyondViewport: true,
      clip: { x: page.x, y: page.y, width: 1440, height: Math.ceil(page.height), scale: 1 }
    });
    const output = path.join(evidenceDir, page.id + '.png');
    const buffer = Buffer.from(shot.data, 'base64');
    fs.writeFileSync(output, buffer);
    const width = buffer.readUInt32BE(16);
    const height = buffer.readUInt32BE(20);
    const sha256 = crypto.createHash('sha256').update(buffer).digest('hex');
    if (byId[page.id]) Object.assign(byId[page.id], { width, height, sha256 });
    results.push({ file: path.basename(output), width, height, sha256 });
  }
  manifest.capture = {
    captured_at: new Date().toISOString(),
    viewport_width: 1440,
    pages: results
  };
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
  console.log(JSON.stringify({ ok: true, captured: results.length, files: results.map((item) => item.file) }, null, 2));
  ws.close(); chrome.kill();
  await sleep(300); fs.rmSync(profile, { recursive: true, force: true });
}

main().catch((error) => { console.error(error.stack || error); process.exit(1); });
