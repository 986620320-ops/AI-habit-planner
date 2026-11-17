#!/usr/bin/env node
'use strict';

const assert = require('assert');
const path = require('path');

process.env.MAKERS_MODELS_KEY = 'test-makers-key';
delete process.env.DEEPSEEK_API_KEY;
delete process.env.OPENAI_API_KEY;
delete process.env.DEEPSEEK_MODEL;
delete process.env.DEEPSEEK_BASE_URL;
delete process.env.AI_CHAT_MODEL;
delete process.env.AI_PLANNING_MODEL;
process.env.DEMO_PLAN_DAILY_LIMIT = '100';
process.env.DEMO_CHAT_RATE_PER_MINUTE = '100';
process.env.ALLOWED_ORIGINS = '';

const api = require(path.join(__dirname, '..', 'netlify', 'functions', 'api.js'));

function event(body) {
  return {
    httpMethod: 'POST',
    headers: {
      'x-nf-client-connection-ip': '127.0.0.1',
      'content-type': 'application/json',
      'x-ai-client': 'habit-coach-web/1'
    },
    body: JSON.stringify(body)
  };
}

function modelResponse(content, status) {
  return new Response(JSON.stringify({
    choices: [{ message: { content: content } }]
  }), {
    status: status || 200,
    headers: { 'content-type': 'application/json' }
  });
}

async function runChat(payload, mockFetch) {
  global.fetch = mockFetch;
  const response = await api.handler(event(payload));
  return {
    status: response.statusCode,
    body: JSON.parse(response.body)
  };
}

(async () => {
  const report = {};

  let requests = [];
  let result = await runChat({
    action: 'chat',
    planningContext: false,
    habits: [],
    messages: [{ role: 'user', content: '你好' }]
  }, async function (_url, options) {
    requests.push(JSON.parse(options.body));
    return modelResponse('你好，我可以帮你把目标拆成更容易执行的小习惯。');
  });
  assert.strictEqual(result.status, 200);
  assert.strictEqual(result.body.reply, '你好，我可以帮你把目标拆成更容易执行的小习惯。');
  assert.deepStrictEqual(result.body.habits, []);
  assert.strictEqual(result.body.modelRole, 'chat');
  assert.strictEqual(result.body.model, '@makers/deepseek-v4-flash');
  assert.ok(requests[0].response_format && requests[0].response_format.type === 'json_object');
  report.plainTextFallback = true;
  report.chatModel = result.body.model;

  requests = [];
  result = await runChat({
    action: 'chat',
    planningContext: true,
    habits: [],
    messages: [{ role: 'user', content: '帮我制定规划' }]
  }, async function (_url, options) {
    requests.push(JSON.parse(options.body));
    return modelResponse(JSON.stringify({
      reply: '可以。你现在最想改善的是精力作息、学习专注，还是运动与身体状态？',
      audience: '规划澄清',
      habits: [{ name: '不应在首轮出现', icon: '✨' }]
    }));
  });
  assert.strictEqual(result.status, 200);
  assert.strictEqual(result.body.modelRole, 'planning');
  assert.strictEqual(result.body.model, '@makers/deepseek-v4-pro');
  assert.deepStrictEqual(result.body.habits, []);

  requests = [];
  result = await runChat({
    action: 'chat',
    planningContext: true,
    habits: [{ name: '睡前阅读', streak: 1, totalDays: 1 }],
    messages: [
      { role: 'user', content: '帮我制定规划' },
      { role: 'assistant', content: '可以。你现在最想改善的是哪一块？' },
      { role: 'user', content: '我最近总是失眠' }
    ]
  }, async function (_url, options) {
    requests.push(JSON.parse(options.body));
    return modelResponse('```json\n' + JSON.stringify({
      reply: '针对失眠，先把目标缩小为「固定关灯时间 + 睡前 10 分钟降速」，不要求立刻早睡。你说自己会刷手机，可以把充电器移出床边。',
      audience: '睡眠调整',
      habits: [
        { name: '23点前关灯', icon: '🌙' },
        { name: '睡前手机离床', icon: '📵' },
        { name: '睡前放松10分钟', icon: '🧘' }
      ]
    }) + '\n```');
  });
  assert.strictEqual(result.status, 200);
  assert.deepStrictEqual(result.body.habits.map(function (item) { return item.name; }), ['23点前关灯', '睡前手机离床', '睡前放松10分钟']);
  assert.strictEqual(result.body.modelRole, 'planning');
  assert.strictEqual(result.body.model, '@makers/deepseek-v4-pro');
  assert.strictEqual(result.body.planning.planVersion, 1);
  assert.strictEqual(result.body.planning.deliveredPlans, 1);
  assert.strictEqual(requests[0].messages.length, 4);
  assert.strictEqual(requests[0].messages[1].content, '帮我制定规划');
  assert.strictEqual(requests[0].messages[2].role, 'assistant');
  assert.strictEqual(requests[0].messages[3].content, '我最近总是失眠');
  report.continuousPlanning = true;
  report.planningModel = result.body.model;

  result = await runChat({
    action: 'chat',
    planningContext: true,
    habits: [],
    messages: [
      { role: 'user', content: '帮我制定规划' },
      { role: 'assistant', content: '你现在最想改善什么？' },
      { role: 'user', content: '我最近总是失眠，睡前会刷手机' }
    ]
  }, async function () {
    return modelResponse('1. 固定 7 点起床，周末误差不超过 1 小时。\n2. 睡前 30 分钟把手机放到床外充电。\n3. 躺下 20 分钟没睡着就起身离床。');
  });
  assert.strictEqual(result.status, 200);
  assert.deepStrictEqual(result.body.habits.map(function (item) { return item.name; }), [
    '固定 7 点起床', '睡前 30 分钟把手机放到床外充电', '躺下 20 分钟没睡着就起身离床'
  ]);
  assert.strictEqual(result.body.planning.planVersion, 1);
  report.plainTextHabitExtraction = true;

  result = await runChat({
    action: 'chat',
    planningContext: true,
    habits: [],
    messages: [
      { role: 'user', content: '帮我制定规划' },
      { role: 'assistant', content: '你最想改善什么？' },
      { role: 'user', content: '周末也想保持' }
    ]
  }, async function () {
    return modelResponse('{"reply":"1. 固定 7 点起床。\n2. 睡前 30 分钟手机离床。\n3. 醒 20 分钟就离床。');
  });
  assert.strictEqual(result.status, 200);
  assert.ok(!result.body.reply.startsWith('{'));
  assert.ok(result.body.reply.includes('固定 7 点起床'));
  assert.strictEqual(result.body.habits.length, 3);
  report.truncatedJsonRecovery = true;

  const beforeFallbackHealth = await api.handler({
    httpMethod: 'GET',
    headers: { 'x-nf-client-connection-ip': '127.0.0.1' }
  });
  const beforeFallbackUsed = JSON.parse(beforeFallbackHealth.body).quota.chat.used;
  let localFallbackCalls = 0;
  result = await runChat({
    action: 'chat',
    planningContext: true,
    habits: [],
    messages: [
      { role: 'user', content: '帮我制定规划' },
      { role: 'assistant', content: '你最想改善什么？' },
      { role: 'user', content: '我最近总是失眠，晚上会加班，周末也想保持' }
    ]
  }, async function () {
    localFallbackCalls++;
    throw new Error('gateway unavailable');
  });
  assert.strictEqual(result.status, 200);
  assert.strictEqual(result.body.engine, 'fallback');
  assert.strictEqual(result.body.model, 'local-planning-fallback');
  assert.ok(result.body.reply.includes('不丢掉前面的对话'));
  assert.strictEqual(result.body.habits.length, 3);
  assert.strictEqual(result.body.quota.chat.used, beforeFallbackUsed);
  assert.strictEqual(localFallbackCalls, 2);
  report.localPlanningFallback = true;

  let emptyFallbackModels = [];
  result = await runChat({
    action: 'chat',
    planningContext: true,
    habits: [],
    messages: [
      { role: 'user', content: '帮我制定规划' },
      { role: 'assistant', content: '你最想改善什么？' },
      { role: 'user', content: '我最近总是失眠' }
    ]
  }, async function (_url, options) {
    const body = JSON.parse(options.body);
    emptyFallbackModels.push(body.model);
    if (body.model === '@makers/deepseek-v4-pro') return modelResponse('');
    return modelResponse(JSON.stringify({
      reply: '先把睡前 30 分钟的手机移出床边，再固定起床时间。',
      audience: '睡眠调整',
      habits: [{ name: '睡前手机离床', icon: '📵' }, { name: '固定起床时间', icon: '⏰' }]
    }));
  });
  assert.strictEqual(result.status, 200);
  assert.strictEqual(result.body.engine, 'agent');
  assert.strictEqual(result.body.model, '@makers/deepseek-v4-flash');
  assert.strictEqual(result.body.fallbackFrom, '@makers/deepseek-v4-pro');
  assert.deepStrictEqual(emptyFallbackModels, ['@makers/deepseek-v4-pro', '@makers/deepseek-v4-flash']);
  report.emptyPrimaryFallback = true;

  const beforeEmptyHealth = await api.handler({
    httpMethod: 'GET',
    headers: { 'x-nf-client-connection-ip': '127.0.0.1' }
  });
  const beforeEmptyUsed = JSON.parse(beforeEmptyHealth.body).quota.chat.used;
  let emptyCalls = 0;
  result = await runChat({
    action: 'chat',
    planningContext: true,
    habits: [],
    messages: [
      { role: 'user', content: '帮我制定规划' },
      { role: 'assistant', content: '你最想改善什么？' },
      { role: 'user', content: '我最近总是失眠，晚上会加班' }
    ]
  }, async function () {
    emptyCalls++;
    return modelResponse('');
  });
  assert.strictEqual(result.status, 200);
  assert.strictEqual(result.body.engine, 'fallback');
  assert.ok(result.body.reply.includes('不丢掉前面的对话'));
  assert.strictEqual(result.body.quota.chat.used, beforeEmptyUsed);
  assert.strictEqual(emptyCalls, 2);
  report.emptyResponseFallback = true;

  const sixMessages = [
    { role: 'user', content: '帮我制定规划' },
    { role: 'assistant', content: '你最想改善什么？' },
    { role: 'user', content: '我最近总是失眠' },
    { role: 'assistant', content: '第一版方案' },
    { role: 'user', content: '我一般十二点睡七点起' },
    { role: 'assistant', content: '第二版方案' },
    { role: 'user', content: '晚上有时加班' },
    { role: 'assistant', content: '继续调整' },
    { role: 'user', content: '周末也想保持' },
    { role: 'assistant', content: '继续调整' },
    { role: 'user', content: '请收敛成三步' }
  ];
  result = await runChat({ action: 'chat', planningContext: true, habits: [], messages: sixMessages }, async function () {
    return modelResponse(JSON.stringify({ reply: '第三版最终方案', audience: '睡眠调整', habits: [{ name: '固定起床', icon: '⏰' }, { name: '手机离床', icon: '📵' }] }));
  });
  assert.strictEqual(result.status, 200);
  assert.strictEqual(result.body.planning.planVersion, 3);
  assert.strictEqual(result.body.planning.deliveredPlans, 3);
  report.planMilestones = true;

  let modeRequests = [];
  result = await runChat({
    action: 'chat',
    planningContext: false,
    habits: [],
    messages: [{ role: 'user', content: '你好' }]
  }, async function (_url, options) {
    const body = JSON.parse(options.body);
    modeRequests.push(body);
    if (body.response_format) {
      return new Response('response_format is not supported', { status: 400 });
    }
    return modelResponse('兼容模式下的普通文本回复');
  });
  assert.strictEqual(result.status, 200);
  assert.strictEqual(result.body.reply, '兼容模式下的普通文本回复');
  assert.strictEqual(modeRequests.length, 2);
  assert.ok(modeRequests[0].response_format);
  assert.strictEqual(modeRequests[1].response_format, undefined);
  report.jsonModeFallback = true;

  let fallbackModels = [];
  result = await runChat({
    action: 'chat',
    planningContext: true,
    habits: [],
    messages: [{ role: 'user', content: '帮我安排一个睡眠计划' }]
  }, async function (_url, options) {
    const body = JSON.parse(options.body);
    fallbackModels.push(body.model);
    if (body.model === '@makers/deepseek-v4-pro') {
      return new Response('rate limited', { status: 429 });
    }
    return modelResponse(JSON.stringify({
      reply: '先用最低完成版：今晚只提前十分钟关灯。',
      audience: '睡眠调整',
      habits: [{ name: '提前十分钟关灯', icon: '🌙' }]
    }));
  });
  assert.strictEqual(result.status, 200);
  assert.deepStrictEqual(fallbackModels, ['@makers/deepseek-v4-pro', '@makers/deepseek-v4-flash']);
  assert.strictEqual(result.body.model, '@makers/deepseek-v4-flash');
  assert.strictEqual(result.body.modelRole, 'planning');
  assert.strictEqual(result.body.fallbackFrom, '@makers/deepseek-v4-pro');
  report.planningFallback = true;

  result = await runChat({
    action: 'chat',
    planningContext: false,
    habits: [],
    messages: [{ role: 'user', content: '解释一下 {这个符号}' }]
  }, async function () {
    return modelResponse('前文说明：这一段不是 JSON。\n```json\n{"reply":"花括号 {示例} 也能完整保留。","audience":"","habits":[]}\n```\n后文说明。');
  });
  assert.strictEqual(result.status, 200);
  assert.strictEqual(result.body.reply, '花括号 {示例} 也能完整保留。');
  report.balancedJsonExtraction = true;

  console.log(JSON.stringify({ ok: true, ...report }, null, 2));
})().catch(function (error) {
  console.error(error.stack || error);
  process.exit(1);
});
