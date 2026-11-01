#!/usr/bin/env node
'use strict';
const assert = require('assert');
const path = require('path');
process.env.DEEPSEEK_API_KEY = 'test-key';
process.env.VISION_API_KEY = 'test-key';
process.env.DEMO_REVIEW_DAILY_LIMIT = '2';
const api = require(path.join(__dirname, '..', 'netlify', 'functions', 'api.js'));
let lastModelRequest = null;
global.fetch = async (_url, options) => {
  lastModelRequest = JSON.parse(options.body);
  const prompt = JSON.stringify(lastModelRequest.messages || []);
  const content = prompt.includes('目标习惯')
    ? JSON.stringify({
        verdict: 'passed', confidence: 0.91, matched: ['文字说明', '完成数量'],
        reason: '文字证据与习惯直接相关。', question: '', feedback: '今天完成得很具体。',
        nextStep: '明天保持同样时间，只增加 5 页。'
      })
    : JSON.stringify({
        headline: '本周先保住阅读节奏',
        summary: '本周完成 5/7 次，完成率 71%。',
        highlight: '睡前阅读最稳定。',
        bottleneck: '运动习惯在忙碌日容易中断。',
        adjustment: { habitName: '运动', change: '下周每次只做 10 分钟。', reason: '先恢复连续完成。' },
        experiment: '只观察晚饭后是否能完成一次。'
      });
  return { ok: true, status: 200, text: async () => JSON.stringify({ choices: [{ message: { content } }] }) };
};
const baseEvent = (body, method = 'POST') => ({
  httpMethod: method,
  headers: { 'x-nf-client-connection-ip': '127.0.0.1', 'content-type': 'application/json' },
  body: body == null ? '' : JSON.stringify(body)
});
(async () => {
  let response = await api.handler(baseEvent(null, 'GET'));
  let data = JSON.parse(response.body);
  assert.strictEqual(response.statusCode, 200);
  assert.strictEqual(data.quota.review.limit, 2);

  response = await api.handler(baseEvent({
    action: 'evidence', habitId: 'h1', habitName: '阅读',
    evidence: { type: 'text', text: '今天读了 12 页并整理了笔记' }
  }));
  data = JSON.parse(response.body);
  assert.strictEqual(response.statusCode, 200);
  assert.strictEqual(data.nextStep, '明天保持同样时间，只增加 5 页。');

  const reviewPayload = {
    action: 'review', scope: 'weekly', weekStart: '2026-10-26', weekEnd: '2026-11-01',
    habits: [{ name: '阅读', completed: 5, possible: 7, misses: 2, streak: 3 }],
    summary: { completed: 5, possible: 7, rate: 71, recoveryReasons: [{ reason: '太忙了', count: 1 }] }
  };
  response = await api.handler(baseEvent(reviewPayload));
  data = JSON.parse(response.body);
  assert.strictEqual(response.statusCode, 200);
  assert.strictEqual(data.review.headline, '本周先保住阅读节奏');
  assert.ok(lastModelRequest.messages.some((item) => String(item.content).includes('阅读')));
  assert.strictEqual(data.quota.review.remaining, 1);

  response = await api.handler(baseEvent(reviewPayload));
  assert.strictEqual(response.statusCode, 200);
  response = await api.handler(baseEvent(reviewPayload));
  data = JSON.parse(response.body);
  assert.strictEqual(response.statusCode, 429);
  assert.strictEqual(data.quota.review.remaining, 0);
  console.log(JSON.stringify({ ok: true, reviewQuota: data.quota.review, modelPromptVerified: true }, null, 2));
})().catch((error) => { console.error(error.stack || error); process.exit(1); });
