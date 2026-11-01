#!/usr/bin/env node
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const outDir = path.join(root, 'docs', 'assets');
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const server = http.createServer((req, res) => {
  if (req.url === '/' || req.url.startsWith('/index.html')) {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(html); return;
  }
  if (req.url.startsWith('/.netlify/functions/api') && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, realAI: false, vision: false, quota: {
      chat: { date: '2026-11-01', limit: 10, used: 0, remaining: 10 },
      plan: { date: '2026-11-01', limit: 10, used: 0, remaining: 10 },
      evidence: { date: '2026-11-01', limit: 5, used: 0, remaining: 5 },
      review: { date: '2026-11-01', limit: 2, used: 0, remaining: 2 }
    }})); return;
  }
  res.writeHead(404); res.end('not found');
});

async function main() {
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  const debugPort = 11980 + Math.floor(Math.random() * 120);
  const profile = path.join(process.env.TEMP, 'rc4-product-shots-' + Date.now());
  const chrome = spawn(process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', [
    '--headless=new', '--no-sandbox', '--disable-gpu', '--hide-scrollbars', '--remote-allow-origins=*',
    '--remote-debugging-port=' + debugPort, '--user-data-dir=' + profile,
    `http://127.0.0.1:${port}/index.html#checkin`
  ], { stdio: 'ignore' });
  let targets = null;
  for (let i = 0; i < 100; i++) {
    try { const response = await fetch(`http://127.0.0.1:${debugPort}/json/list`); if (response.ok) { targets = await response.json(); break; } } catch (error) {}
    await sleep(150);
  }
  if (!targets) throw new Error('Chrome unavailable');
  const tab = targets.find((item) => item.type === 'page');
  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
  let id = 0; const pending = new Map();
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
    const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true, userGesture: true });
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
    return result.result ? result.result.value : null;
  };
  const wait = async (expression, timeout = 12000) => {
    const end = Date.now() + timeout;
    while (Date.now() < end) { if (await evaluate(expression)) return; await sleep(120); }
    throw new Error('wait: ' + expression);
  };
  const screenshot = async (name) => {
    const result = await send('Page.captureScreenshot', { format: 'png', fromSurface: true, captureBeyondViewport: false });
    fs.writeFileSync(path.join(outDir, name), Buffer.from(result.data, 'base64'));
  };
  await send('Runtime.enable'); await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await wait("document.readyState==='complete'&&!!document.getElementById('recoveryCard')");
  await evaluate(`(()=>{
    const habits=[{id:'h1',name:'睡前阅读',icon:'📖',createdAt:'2026-10-01'},{id:'h2',name:'晚饭后运动',icon:'🏃',createdAt:'2026-10-01'}];
    const days=['2026-10-26','2026-10-27','2026-10-28','2026-10-29','2026-10-30','2026-10-31','2026-11-01'];
    const checkins={h1:days.slice(0,4),h2:['2026-10-26','2026-10-28']};
    localStorage.setItem('ai-habit-checkin:habits',JSON.stringify(habits));
    localStorage.setItem('ai-habit-checkin:checkins',JSON.stringify(checkins));
    localStorage.setItem('ai-habit-checkin:points',JSON.stringify({total:60,bonus:{},ledger:[]}));
    localStorage.setItem('ai-habit-checkin:verify','{}');
    localStorage.setItem('ai-habit-checkin:recovery',JSON.stringify({plans:{},dismissed:{}}));
    localStorage.setItem('ai-habit-checkin:weekly-reviews','[]');
    localStorage.setItem('ai-habit-checkin:ai-chat','[]');
    localStorage.setItem('ai-habit-checkin:ai-mode-pref','mock');
    return true;
  })()`);
  await send('Page.reload'); await sleep(900); await wait("document.readyState==='complete'&&!document.getElementById('recoveryCard').hidden");
  await evaluate("document.querySelector('.recovery-reason').click()");
  await wait("!!document.querySelector('.recovery-accept')");
  await evaluate("document.querySelector('.recovery-accept').click()");
  await wait("document.body.innerText.includes('今日最低：')");
  await evaluate("document.getElementById('recoveryCard').scrollIntoView({block:'center'})"); await sleep(350);
  await screenshot('coach-recovery-desktop.png');

  await evaluate("document.getElementById('weeklyReviewBtn').scrollIntoView({block:'center'})"); await sleep(250);
  await evaluate("document.getElementById('weeklyReviewBtn').click()");
  await wait("!document.getElementById('weeklyReviewResult').hidden", 5000);
  await screenshot('weekly-review-desktop.png');

  await evaluate("location.hash='#checkin'"); await evaluate("document.querySelector('.evidence-tile').click()");
  await wait("!document.getElementById('evidenceOverlay').hidden");
  await evaluate(`(()=>{const t=document.getElementById('evidenceText');t.value='今天读完了 12 页，并把笔记整理好了';t.dispatchEvent(new Event('input',{bubbles:true}));document.getElementById('evidenceSubmit').click();return true})()`);
  await wait("document.getElementById('headerBalance').textContent==='70'"); await wait("!document.getElementById('evidenceNextStep').hidden"); await sleep(300);
  await screenshot('coach-feedback-desktop.png');

  await evaluate("document.getElementById('evidenceCancel').click()"); await sleep(200);
  await send('Emulation.setDeviceMetricsOverride', { width: 375, height: 812, deviceScaleFactor: 1, mobile: true }); await sleep(450);
  await evaluate("document.getElementById('weeklyReviewBtn').scrollIntoView({block:'center'})"); await sleep(300);
  await screenshot('weekly-review-mobile.png');
  console.log(JSON.stringify({ ok: true, files: ['coach-recovery-desktop.png','weekly-review-desktop.png','coach-feedback-desktop.png','weekly-review-mobile.png'] }, null, 2));
  ws.close(); chrome.kill(); server.close(); await sleep(300); fs.rmSync(profile, { recursive: true, force: true });
}
main().catch((error) => { console.error(error.stack || error); try { server.close(); } catch (_) {} process.exit(1); });

