#!/usr/bin/env node
'use strict';
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..', '..');
const htmlPath = path.join(root, 'docs', 'technical-report', 'report.html');
const pdfPath = path.join(root, 'docs', 'technical-report', 'AI习惯教练_技术报告.pdf');
const debugPort = 12200 + Math.floor(Math.random() * 120);
const profile = path.join(process.env.TEMP, 'codex-report-' + Date.now());
const chrome = spawn(process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', [
  '--headless=new', '--no-sandbox', '--disable-gpu', '--hide-scrollbars', '--remote-allow-origins=*',
  '--remote-debugging-port=' + debugPort, '--user-data-dir=' + profile, '--allow-file-access-from-files',
  'file:///' + htmlPath.replace(/\\/g, '/')
], { stdio: 'ignore' });
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
(async () => {
  let targets = null;
  for (let i = 0; i < 100; i++) {
    try { const response = await fetch(`http://127.0.0.1:${debugPort}/json/list`); if (response.ok) { targets = await response.json(); break; } } catch (error) {}
    await sleep(150);
  }
  if (!targets) throw new Error('无法连接 Chrome');
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
    const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
    return result.result ? result.result.value : null;
  };
  await send('Runtime.enable'); await send('Page.enable');
  for (let i = 0; i < 80; i++) { if (await evaluate("document.readyState==='complete'")) break; await sleep(100); }
  await sleep(700);
  const metrics = await evaluate(`(()=>{const pages=[...document.querySelectorAll('.page')];return{pages:pages.length,overflow:pages.map((el,i)=>({page:i+1,client:el.clientHeight,scroll:el.scrollHeight})).filter(x=>x.scroll>x.client+1),images:[...document.images].every(img=>img.complete&&img.naturalWidth>0)}})()`);
  if (metrics.pages < 1 || metrics.pages > 30 || metrics.overflow.length || !metrics.images) throw new Error('报告布局检查失败：' + JSON.stringify(metrics));
  const pdf = await send('Page.printToPDF', { printBackground: true, preferCSSPageSize: true, marginTop: 0, marginBottom: 0, marginLeft: 0, marginRight: 0 });
  fs.writeFileSync(pdfPath, Buffer.from(pdf.data, 'base64'));
  console.log(JSON.stringify({ ok: true, pdf: pdfPath, bytes: fs.statSync(pdfPath).size, metrics }, null, 2));
  ws.close(); chrome.kill(); await sleep(300); fs.rmSync(profile, { recursive: true, force: true });
})().catch((error) => { console.error(error.stack || error); try { chrome.kill(); } catch (_) {} process.exit(1); });
