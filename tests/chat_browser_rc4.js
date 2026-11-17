#!/usr/bin/env node
'use strict';
const os = require('node:os');
const chromePath = require('./chrome-path');

const assert = require('assert');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let lastChatBody = null;

const server = http.createServer((req, res) => {
  if (req.url === '/' || req.url.startsWith('/index.html')) {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(html);
    return;
  }
  if (req.url.startsWith('/api') && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      ok: true,
      realAI: true,
      vision: true,
      chatModel: '@makers/deepseek-v4-flash',
      planningModel: '@makers/deepseek-v4-pro',
      quota: {
        chat: { limit: 10, used: 0, remaining: 10 },
        plan: { limit: 10, used: 0, remaining: 10 },
        evidence: { limit: 5, used: 0, remaining: 5 },
        review: { limit: 2, used: 0, remaining: 2 }
      }
    }));
    return;
  }
  if (req.url.startsWith('/api') && req.method === 'POST') {
    let raw = '';
    req.on('data', (chunk) => { raw += chunk; });
    req.on('end', () => {
      lastChatBody = JSON.parse(raw);
      const last = lastChatBody.messages[lastChatBody.messages.length - 1];
      const isSleepFollowUp = last && last.content.includes('失眠');
      const reply = isSleepFollowUp
        ? '针对失眠，先固定关灯时间，并把手机移出床边。今晚只做提前十分钟关灯这一件事。'
        : '可以。你现在最想改善的是精力作息、学习专注，还是运动与身体状态？';
      const habits = isSleepFollowUp
        ? [{ name: '23点前关灯', icon: '🌙' }, { name: '睡前手机离床', icon: '📵' }]
        : [];
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        ok: true,
        reply,
        audience: isSleepFollowUp ? '睡眠调整' : '规划澄清',
        habits,
        engine: 'agent',
        model: isSleepFollowUp ? '@makers/deepseek-v4-pro' : '@makers/deepseek-v4-pro',
        modelRole: 'planning',
        fallbackFrom: '',
        quota: {
          chat: { limit: 10, used: isSleepFollowUp ? 2 : 1, remaining: isSleepFollowUp ? 8 : 9 },
          plan: { limit: 10, used: isSleepFollowUp ? 2 : 1, remaining: isSleepFollowUp ? 8 : 9 }
        }
      }));
    });
    return;
  }
  res.writeHead(404);
  res.end('not found');
});

(async () => {
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  const debugPort = 12700 + Math.floor(Math.random() * 150);
  const profile = path.join(os.tmpdir(), 'chat-browser-' + Date.now());
  const chrome = spawn(chromePath, [
    '--headless=new', '--no-sandbox', '--disable-gpu', '--hide-scrollbars', '--remote-allow-origins=*',
    '--remote-debugging-port=' + debugPort, '--user-data-dir=' + profile,
    `http://127.0.0.1:${port}/index.html#checkin`
  ], { stdio: 'ignore' });

  try {
    let targets = null;
    for (let i = 0; i < 100; i++) {
      try {
        const response = await fetch(`http://127.0.0.1:${debugPort}/json/list`);
        if (response.ok) { targets = await response.json(); break; }
      } catch (error) {}
      await sleep(150);
    }
    if (!targets) throw new Error('Chrome unavailable');
    const tab = targets.find((item) => item.type === 'page');
    const ws = new WebSocket(tab.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
    let id = 0;
    const pending = new Map();
    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.id && pending.has(message.id)) {
        const item = pending.get(message.id);
        pending.delete(message.id);
        message.error ? item.reject(new Error(JSON.stringify(message.error))) : item.resolve(message.result);
      }
    };
    const send = (method, params = {}) => new Promise((resolve, reject) => {
      const current = ++id;
      pending.set(current, { resolve, reject });
      ws.send(JSON.stringify({ id: current, method, params }));
    });
    const evaluate = async (expression) => {
      const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true, userGesture: true });
      if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
      return result.result ? result.result.value : null;
    };
    const wait = async (expression, timeout = 12000) => {
      const end = Date.now() + timeout;
      while (Date.now() < end) {
        if (await evaluate(expression)) return;
        await sleep(120);
      }
      throw new Error('wait: ' + expression);
    };

    await send('Runtime.enable');
    await send('Page.enable');
    await wait("document.readyState==='complete'&&!!document.getElementById('aiComposer')");
    await evaluate(`(()=>{
      const messages=[
        {id:'seed-u',role:'user',content:'你好',ts:1,mode:'mock',audience:'',habits:[],importedHabits:[],kind:'',retryUserId:''},
        {id:'seed-a',role:'assistant',content:'你好，我可以帮你制定容易坚持的小计划。',ts:2,mode:'mock',audience:'',habits:[],importedHabits:[],kind:'',retryUserId:''}
      ];
      localStorage.setItem('ai-habit-checkin:ai-chat',JSON.stringify(messages));
      localStorage.setItem('ai-habit-checkin:ai-mode-pref','real');
      return true;
    })()`);
    await send('Page.reload');
    await sleep(800);
    await wait("document.readyState==='complete'&&document.getElementById('aiModeTag').textContent.includes('真实')");

    await evaluate(`(()=>{const input=document.getElementById('aiComposer');input.value='帮我制定规划';document.getElementById('aiSendBtn').click();return true})()`);
    await wait("document.querySelectorAll('.ai-message.assistant').length===2&&document.querySelector('.ai-message.assistant:last-of-type')");
    await wait("document.getElementById('aiSendBtn').textContent==='发送'");
    assert.ok(lastChatBody.planningContext === true);
    assert.strictEqual(lastChatBody.messages.length, 3);

    await evaluate(`(()=>{const input=document.getElementById('aiComposer');input.value='我最近总是失眠';document.getElementById('aiSendBtn').click();return true})()`);
    await wait("document.querySelectorAll('.ai-message.assistant').length===3");
    await wait("[...document.querySelectorAll('.ai-message.assistant')].slice(-1)[0].innerText.includes('失眠')", 8000);
    await wait("document.getElementById('aiSendBtn').textContent==='发送'");
    const assistantText = await evaluate("[...document.querySelectorAll('.ai-message.assistant')].slice(-1)[0].innerText");
    assert.ok(assistantText.includes('失眠'));
    assert.strictEqual(lastChatBody.planningContext, true);
    assert.strictEqual(lastChatBody.messages.length, 5);
    assert.strictEqual(lastChatBody.messages[0].content, '你好');
    assert.strictEqual(lastChatBody.messages[1].role, 'assistant');
    assert.ok(lastChatBody.messages.some((item) => item.content.includes('最想改善')));
    assert.strictEqual(await evaluate("document.getElementById('planPanel').hidden"), false);
    assert.ok((await evaluate("document.getElementById('planVersionTabs').textContent")).includes('V1'));
    assert.ok((await evaluate("document.getElementById('aiDeliveredProgress').textContent")).includes('1 版'));
    await evaluate("document.getElementById('planAdoptBtn').click()");
    await sleep(400);
    const adoptedHabits = await evaluate("JSON.parse(localStorage.getItem('ai-habit-checkin:habits')||'[]').map(x=>x.name)");
    assert.ok(adoptedHabits.includes('23点前关灯'));
    assert.strictEqual(await evaluate("!!document.querySelector('.evidence-card')"), false);
    assert.strictEqual(await evaluate("!!document.querySelector('[data-help=\"checkin\"]')"), true);
    await evaluate("document.querySelector('[data-help=\"ai\"]').click()");
    await wait("!document.getElementById('helpOverlay').hidden");
    assert.ok((await evaluate("document.getElementById('helpTitle').textContent")).includes('AI 习惯教练'));
    await evaluate("document.getElementById('helpClose').click()");
    await wait("document.getElementById('helpOverlay').hidden");
    await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
    await sleep(300);
    assert.strictEqual(await evaluate("document.documentElement.scrollWidth<=document.documentElement.clientWidth+1"), true);

    console.log(JSON.stringify({
      ok: true,
      crossModeHistory: lastChatBody.messages.length === 5,
      planningContext: lastChatBody.planningContext,
      followUpReplyRendered: assistantText.includes('失眠'),
      planPanel: true,
      adoptedHabits,
      evidenceIntegrated: true,
      planPanelMobile: true
    }, null, 2));
    ws.close();
  } finally {
    try { chrome.kill(); } catch (error) {}
    server.close();
  }
})().catch((error) => {
  console.error(error.stack || error);
  process.exit(1);
});
