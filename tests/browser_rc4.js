#!/usr/bin/env node
'use strict';
const assert = require('assert');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const restoreFixturePath = path.join(process.env.TEMP, 'rc4-restore-' + Date.now() + '.json');
fs.writeFileSync(restoreFixturePath, JSON.stringify({
  habits: [{ id: 'restored', name: '恢复后的阅读', icon: '📖', createdAt: '2026-01-01' }],
  checkins: { restored: ['2026-10-31'] }, points: { total: 20, bonus: {}, ledger: [] },
  rewards: { tiers: [], unlocked: [] }, evidence: {},
  recovery: { plans: { '2026-11-01::restored': { reason: '太忙了', suggestion: '恢复计划', timing: '今天', acceptedAt: 1 } }, dismissed: { '2026-11-01': true } },
  weeklyReviews: [{ weekStart: '2026-10-26', weekEnd: '2026-11-01', review: { headline: '恢复的周复盘', summary: '已恢复', highlight: '阅读', bottleneck: '暂无', adjustment: { habitName: '阅读', change: '保持', reason: '已恢复' }, experiment: '继续记录' }, engine: 'mock', model: '', createdAt: 1 }],
  aiChat: [], photos: {}
}), 'utf8');
let reviewCalls = 0;
let failNextReview = false;
let lastReviewBody = null;
const server = http.createServer((req, res) => {
  if (req.url === '/' || req.url.startsWith('/index.html')) {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(html); return;
  }
  if (req.url.startsWith('/.netlify/functions/api') && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, realAI: true, vision: true, quota: {
      chat: { limit: 10, used: 0, remaining: 10 }, plan: { limit: 10, used: 0, remaining: 10 },
      evidence: { limit: 5, used: 0, remaining: 5 },
      review: { limit: 2, used: reviewCalls, remaining: Math.max(0, 2 - reviewCalls) }
    }})); return;
  }
  if (req.url.startsWith('/.netlify/functions/api') && req.method === 'POST') {
    let raw = ''; req.on('data', (chunk) => { raw += chunk; });
    req.on('end', () => {
      let body = {}; try { body = JSON.parse(raw); } catch (error) {}
      if (body.action !== 'review') {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: 'unexpected action' })); return;
      }
      lastReviewBody = body;
      reviewCalls++;
      const quota = { date: '2026-11-01', limit: 2, used: reviewCalls, remaining: Math.max(0, 2 - reviewCalls) };
      if (reviewCalls > 2) {
        res.writeHead(429, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: '今日真实周复盘额度已用完', quota: { review: quota } })); return;
      }
      if (failNextReview) {
        failNextReview = false;
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: '模拟网络失败', quota: { review: quota } })); return;
      }
      const review = {
        headline: '本周先保住阅读节奏', summary: '本周完成 5/7 次，完成率 71%。',
        highlight: '睡前阅读最稳定。', bottleneck: '运动习惯在忙碌日容易中断。',
        adjustment: { habitName: '运动', change: '下周每次只做 10 分钟。', reason: '先恢复连续完成。' },
        experiment: '只观察晚饭后是否能完成一次。'
      };
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, review, engine: 'agent', model: 'mock-model', quota: { review: quota }, date: '2026-11-01' }));
    }); return;
  }
  res.writeHead(404); res.end('not found');
});

(async () => {
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  const debugPort = 12500 + Math.floor(Math.random() * 150);
  const profile = path.join(process.env.TEMP, 'rc4-browser-' + Date.now());
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
  let id = 0; const pending = new Map(); const consoleErrors = [];
  ws.onmessage = (event) => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      const item = pending.get(message.id); pending.delete(message.id);
      message.error ? item.reject(new Error(JSON.stringify(message.error))) : item.resolve(message.result); return;
    }
    if (message.method === 'Runtime.exceptionThrown') consoleErrors.push(message.params.exceptionDetails.text || 'exception');
  };
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const current = ++id; pending.set(current, { resolve, reject }); ws.send(JSON.stringify({ id: current, method, params }));
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
  await send('Runtime.enable'); await send('Page.enable');
  await wait("document.readyState==='complete'&&!!document.getElementById('recoveryCard')");
  await evaluate(`(()=>{
    const d=new Date(); const p=n=>String(n).padStart(2,'0'); const key=x=>x.getFullYear()+'-'+p(x.getMonth()+1)+'-'+p(x.getDate());
    const created=new Date(d.getFullYear(),d.getMonth(),d.getDate()-20); const yesterday=new Date(d.getFullYear(),d.getMonth(),d.getDate()-1);
    const habits=[{id:'h1',name:'睡前阅读',icon:'📖',createdAt:key(created)},{id:'h2',name:'晚饭后运动',icon:'🏃',createdAt:key(created)}];
    const checkins={h1:[],h2:[]}; const monday=new Date(d); const offset=(monday.getDay()+6)%7; monday.setDate(monday.getDate()-offset);
    for(let cur=new Date(monday);cur<d;cur.setDate(cur.getDate()+1)){const k=key(cur);if(k!==key(yesterday))checkins.h1.push(k);if(k===key(monday))checkins.h2.push(k);}
    localStorage.setItem('ai-habit-checkin:habits',JSON.stringify(habits)); localStorage.setItem('ai-habit-checkin:checkins',JSON.stringify(checkins));
    localStorage.setItem('ai-habit-checkin:points',JSON.stringify({total:60,bonus:{},ledger:[]})); localStorage.setItem('ai-habit-checkin:verify','{}');
    localStorage.setItem('ai-habit-checkin:recovery',JSON.stringify({plans:{},dismissed:{}})); localStorage.setItem('ai-habit-checkin:weekly-reviews','[]');
    localStorage.setItem('ai-habit-checkin:ai-chat','[]'); localStorage.setItem('ai-habit-checkin:ai-mode-pref','mock'); return true;
  })()`);
  await send('Page.reload'); await sleep(900); await wait("document.readyState==='complete'&&!document.getElementById('recoveryCard').hidden");
  await evaluate("[...document.querySelectorAll('.recovery-reason')].find(button=>button.textContent==='太忙了').click()");
  await wait("!!document.querySelector('.recovery-accept')"); await evaluate("document.querySelector('.recovery-accept').click()");
  await wait("document.body.innerText.includes('今日最低：')");
  const report = { recoveryVisible: true };
  report.recoveryStored = await evaluate("Object.keys(HabitStore.loadRecovery().plans).length===1");
  await evaluate("document.querySelector('.evidence-tile').click()"); await wait("!document.getElementById('evidenceOverlay').hidden");
  await evaluate(`(()=>{const t=document.getElementById('evidenceText');t.value='今天读了 12 页并整理了笔记';t.dispatchEvent(new Event('input',{bubbles:true}));document.getElementById('evidenceSubmit').click();return true})()`);
  await wait("document.getElementById('headerBalance').textContent==='70'"); await wait("!document.getElementById('evidenceNextStep').hidden");
  report.nextStep = await evaluate("document.getElementById('evidenceNextStepText').textContent");
  report.engine = await evaluate("document.getElementById('evidenceEngine').textContent");
  const chatBefore = await evaluate("document.querySelectorAll('.ai-message').length");
  await evaluate("document.getElementById('evidenceTalkBtn').click()"); await sleep(250);
  report.draftOnly = (await evaluate("document.querySelectorAll('.ai-message').length")) === chatBefore && (await evaluate("document.getElementById('aiComposer').value.includes('睡前阅读')"));
  await evaluate("document.querySelectorAll('.evidence-tile')[1].click()"); await wait("!document.getElementById('evidenceOverlay').hidden");
  await evaluate("document.getElementById('evidenceManualToggle').click()");
  await evaluate(`(()=>{const t=document.getElementById('evidenceManualText');t.value='今天下班太晚，先完成十分钟拉伸并记录';document.getElementById('evidenceManualBtn').click();return true})()`);
  await wait("document.getElementById('headerBalance').textContent==='80'"); await wait("!document.getElementById('evidenceNextStep').hidden");
  report.manualEngine = await evaluate("document.getElementById('evidenceEngine').textContent");
  report.manualNextStep = await evaluate("document.getElementById('evidenceNextStepText').textContent");
  await evaluate("document.getElementById('evidenceCancel').click()");
  await evaluate("document.getElementById('weeklyReviewBtn').click()"); await wait("!document.getElementById('weeklyReviewResult').hidden", 5000);
  report.mockReview = await evaluate("document.getElementById('weeklyReviewHeadline').textContent");
  report.mockCalls = reviewCalls;
  await evaluate("document.getElementById('aiModeTag').click()"); await wait("document.getElementById('aiModeTag').textContent.includes('真实')");
  failNextReview = true; await evaluate("document.getElementById('weeklyReviewBtn').click()"); await wait("document.getElementById('weeklyReviewStatus').classList.contains('error')");
  report.realError = await evaluate("document.getElementById('weeklyReviewStatus').textContent");
  await evaluate("document.getElementById('weeklyReviewBtn').click()"); await wait("document.getElementById('weeklyReviewHeadline').textContent.includes('阅读')"); await wait("!document.getElementById('weeklyReviewBtn').disabled");
  report.realRequest = { action: lastReviewBody.action, scope: lastReviewBody.scope, names: lastReviewBody.habits.map((item) => item.name) };
  await evaluate("document.getElementById('weeklyReviewBtn').click()"); await wait("document.getElementById('weeklyReviewStatus').textContent.includes('额度已用完')");
  report.quota429 = await evaluate("document.getElementById('weeklyReviewStatus').textContent");
  report.storage = await evaluate("({recovery:!!localStorage.getItem('ai-habit-checkin:recovery'),reviews:HabitStore.loadWeeklyReviews().length})");
  report.duplicateIds = await evaluate("[...document.querySelectorAll('[id]')].map(el=>el.id).filter((x,i,a)=>a.indexOf(x)!==i)");
  await send('Emulation.setDeviceMetricsOverride', { width: 375, height: 812, deviceScaleFactor: 1, mobile: true }); await sleep(300);
  report.mobileOverflow = await evaluate("document.documentElement.scrollWidth>document.documentElement.clientWidth+1");
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false }); await sleep(300);
  report.desktopOverflow = await evaluate("document.documentElement.scrollWidth>document.documentElement.clientWidth+1");
  await evaluate(`(()=>{const list=[];for(let i=1;i<=20;i++)list.push({id:'limit'+i,name:'习惯'+i,icon:'💧',createdAt:'2026-01-01'});localStorage.setItem('ai-habit-checkin:habits',JSON.stringify(list));return true})()`);
  await send('Page.reload'); await sleep(800); await wait("document.getElementById('totalCount').textContent==='20'");
  await evaluate("document.getElementById('newHabitName').value='第21个习惯'; document.getElementById('addForm').requestSubmit()"); await sleep(250);
  report.habitLimit = (await evaluate("JSON.parse(localStorage.getItem('ai-habit-checkin:habits')).length")) === 20;
  await send('DOM.enable'); const documentNode = await send('DOM.getDocument', { depth: -1 }); const restoreNode = await send('DOM.querySelector', { nodeId: documentNode.root.nodeId, selector: '#shop-restoreInput' });
  await send('DOM.setFileInputFiles', { nodeId: restoreNode.nodeId, files: [restoreFixturePath] }); await sleep(700);
  report.restore = await evaluate("({plans:Object.keys(HabitStore.loadRecovery().plans).length,reviews:HabitStore.loadWeeklyReviews().length,total:HabitStore.loadPoints().total})");
  report.errors = consoleErrors;
  assert.strictEqual(report.recoveryStored, true); assert.ok(report.nextStep); assert.strictEqual(report.engine, 'Mock 演示');
  assert.strictEqual(report.draftOnly, true); assert.strictEqual(report.manualEngine, '手动记录'); assert.ok(report.manualNextStep); assert.strictEqual(report.mockCalls, 0); assert.ok(report.realError.includes('模拟网络失败'));
  assert.strictEqual(report.realRequest.action, 'review'); assert.deepStrictEqual(report.realRequest.names.sort(), ['晚饭后运动','睡前阅读'].sort());
  assert.ok(report.quota429.includes('额度已用完')); assert.strictEqual(report.storage.recovery, true); assert.ok(report.storage.reviews >= 1);
  assert.deepStrictEqual(report.duplicateIds, []); assert.strictEqual(report.habitLimit, true); assert.deepStrictEqual(report.restore, { plans: 1, reviews: 1, total: 20 }); assert.strictEqual(report.mobileOverflow, false); assert.strictEqual(report.desktopOverflow, false); assert.deepStrictEqual(report.errors, []);
  console.log(JSON.stringify(report, null, 2));
  ws.close(); chrome.kill(); server.close(); await sleep(300); fs.rmSync(profile, { recursive: true, force: true }); try { fs.rmSync(restoreFixturePath, { force: true }); } catch (_) {}
})().catch((error) => { console.error(error.stack || error); try { server.close(); } catch (_) {} process.exit(1); });

