'use strict';

/**
 * Netlify 服务端函数：AI 规划 + 打卡口令 + 口令识别校验
 *
 * 前端只发「习惯列表 / 口令 / 照片」，所有密钥都保存在 Netlify 后台环境变量里，
 * 永远不会出现在任何前端 HTML / JS 中。
 *
 * 四个动作（GET 或请求体里的 action 字段）：
 *   GET / health             ：返回真实 AI / 视觉 / 口令是否可用，以及当前 IP 的剩余额度
 *   action = 'plan'   （默认）：结合用户已录入的习惯生成个性化规划
 *   action = 'codes'          ：按「设备习惯 id + 日期」下发每日口令（HMAC 派生，客户端无法提前推算）
 *   action = 'verify'         ：把照片交给视觉模型只做 OCR，读到的字符和口令比对，返回是否通过
 *
 * 需要在 Netlify 后台 Site settings → Environment variables 配置：
 *   DEEPSEEK_API_KEY   规划动作用，必填：DeepSeek 控制台申请的 API Key
 *   DEEPSEEK_MODEL     选填：默认 deepseek-flash
 *   DEEPSEEK_BASE_URL  选填：默认 https://api.deepseek.com
 *
 *   CODES_SECRET       口令密钥，选填；不填则用 DEEPSEEK_API_KEY 派生。换掉它等于作废所有历史口令
 *   VISION_API_KEY     选填：视觉识别密钥，不填时回退到 DEEPSEEK_API_KEY
 *   VISION_MODEL       选填：默认 deepseek-flash
 *   VISION_BASE_URL    选填：默认 https://api.deepseek.com
 *
 *   演示额度（按客户端 IP + 自然日计算）：
 *   DEMO_PLAN_DAILY_LIMIT     选填：真实 AI 规划每日次数，默认 5，设为 0 可直接停用
 *   DEMO_VISION_DAILY_LIMIT   选填：视觉校验每日次数，默认 3，设为 0 可直接停用
 *   ALLOWED_ORIGINS           选填：逗号分隔的允许来源；不填时允许所有来源，便于本地演示
 *
 * 注意：额度计数保存在函数实例内存中，适合比赛演示和成本保护；正式生产请换成
 * Netlify Blobs / Redis / 数据库等持久化计数。
 *
 * 可选：在项目根目录加 netlify.toml 把同步函数超时放宽，避免生成较长规划时超时：
 *   [build]
 *     functions = "netlify/functions"
 *   [functions."api"]
 *     timeout = 26
 */

const crypto = require('crypto');

const DEFAULT_BASE_URL = 'https://api.deepseek.com';
const DEFAULT_MODEL = 'deepseek-flash';
const MAX_HABITS = 20;
const MAX_NAME_LENGTH = 30;
const MAX_SUGGESTED = 6;
const REQUEST_TIMEOUT_MS = 25000;
const MAX_IMAGE_CHARS = 8000000;

/* 口令字符集：去掉容易认错的 0 O 1 I L，共 31 个字符 */
const CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
const CODE_LENGTH = 5;
/* 手写体常见误认：比对前两边都归一化到同一个类 */
const CONFUSABLE = { O: '0', Q: '0', D: '0', I: '1', L: '1', J: '1', S: '5', Z: '2', B: '8', G: '6' };

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

/* 演示额度：按「日期 + 动作 + 客户端 IP」计数，避免真实 AI 被无限调用。
 * 这是进程内计数，Netlify 冷启动后会重置；正式项目应换成持久化存储。 */
const QUOTA_BUCKETS = new Map();
const DEFAULT_PLAN_DAILY_LIMIT = 5;
const DEFAULT_VISION_DAILY_LIMIT = 3;

const SYSTEM_PROMPT = [
  '你是一名擅长时间管理的中学生学习规划师，服务对象是课业紧张、作息不规律的中学生。',
  '你的任务是：结合用户已经录入的打卡习惯，给出一份切实可行的个性化作息与习惯规划。',
  '要求：',
  '1. 只输出一个 JSON 对象，不要输出 JSON 以外的任何解释文字。',
  '2. JSON 结构为：{"plan": "多行规划文本", "habits": [{"name": "习惯名称", "icon": "一个 emoji"}]}',
  '3. plan 用中文分点书写，包含「作息主线」「学习习惯」「运动与放松」「打卡建议」四部分，控制在 400 字以内，'
    + '给出具体时间点和时长，避免空话。',
  '4. 尊重用户已有的习惯：已有习惯保留并给出优化建议，不要劝其全部推翻重来。',
  '5. habits 给出 4 到 6 条可执行的每日习惯，名称不超过 12 个字，便于直接导入打卡列表。',
  '6. 不要给出医疗、用药或心理诊断类建议；不要承诺成绩提升。'
].join('\n');

function jsonResponse(statusCode, body) {
  return {
    statusCode,
    headers: Object.assign({
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store'
    }, CORS_HEADERS),
    body: JSON.stringify(body)
  };
}

function toSafeText(value, maxLength) {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, maxLength);
}

function toSafeNumber(value) {
  return typeof value === 'number' && isFinite(value) ? Math.max(0, Math.round(value)) : 0;
}

function envNonNegativeInt(name, fallback) {
  const rawText = String(process.env[name] == null ? '' : process.env[name]).trim();
  if (rawText === '') return fallback;
  const raw = Number(rawText);
  return Number.isFinite(raw) && raw >= 0 ? Math.floor(raw) : fallback;
}

function clientKeyFromEvent(event) {
  const headers = event && event.headers ? event.headers : {};
  const raw = headers['x-nf-client-connection-ip']
    || headers['x-forwarded-for']
    || headers['client-ip']
    || 'unknown';
  return String(raw).split(',')[0].trim() || 'unknown';
}

function pruneQuotaBuckets(dateKey) {
  if (QUOTA_BUCKETS.size < 500) return;
  QUOTA_BUCKETS.forEach(function (_value, key) {
    if (key.indexOf(dateKey + '|') !== 0) QUOTA_BUCKETS.delete(key);
  });
}

function quotaInfo(kind, event) {
  const dateKey = serverDateKey();
  pruneQuotaBuckets(dateKey);
  const limit = envNonNegativeInt(
    kind === 'vision' ? 'DEMO_VISION_DAILY_LIMIT' : 'DEMO_PLAN_DAILY_LIMIT',
    kind === 'vision' ? DEFAULT_VISION_DAILY_LIMIT : DEFAULT_PLAN_DAILY_LIMIT
  );
  const key = dateKey + '|' + kind + '|' + clientKeyFromEvent(event);
  const used = QUOTA_BUCKETS.get(key) || 0;
  return { date: dateKey, limit: limit, used: used, remaining: Math.max(0, limit - used) };
}

function consumeQuota(kind, event) {
  const info = quotaInfo(kind, event);
  if (info.remaining <= 0) return Object.assign({ ok: false }, info);
  const key = info.date + '|' + kind + '|' + clientKeyFromEvent(event);
  QUOTA_BUCKETS.set(key, info.used + 1);
  return Object.assign({ ok: true }, info, { used: info.used + 1, remaining: info.remaining - 1 });
}

function originAllowed(event) {
  const allow = String(process.env.ALLOWED_ORIGINS || '').trim();
  if (allow === '' || allow === '*') return true;
  const headers = event && event.headers ? event.headers : {};
  const origin = String(headers.origin || headers.Origin || '').trim();
  if (origin === '') return true;
  return allow.split(',').map(function (item) { return item.trim(); }).filter(Boolean).indexOf(origin) !== -1;
}

function handleHealth(event) {
  const vision = visionConfig();
  const planQuota = quotaInfo('plan', event);
  const visionQuota = quotaInfo('vision', event);
  return jsonResponse(200, {
    ok: true,
    message: 'AI 服务已就绪。',
    realAI: !!process.env.DEEPSEEK_API_KEY,
    codes: !!codeSecret(),
    vision: !!vision,
    quota: { plan: planQuota, vision: visionQuota },
    date: planQuota.date
  });
}

/* 只保留结构正确的习惯，避免把脏数据带进提示词 */
function normalizeHabits(input) {
  if (!Array.isArray(input)) return [];

  var list = [];
  for (var i = 0; i < input.length && list.length < MAX_HABITS; i++) {
    var item = input[i];
    var name = toSafeText(item && typeof item === 'object' ? item.name : item, MAX_NAME_LENGTH);
    if (name === '') continue;

    list.push({
      name: name,
      streak: toSafeNumber(item && item.streak),
      totalDays: toSafeNumber(item && item.totalDays)
    });
  }
  return list;
}

function normalizeSuggested(input) {
  if (!Array.isArray(input)) return [];

  var list = [];
  var seen = {};
  for (var i = 0; i < input.length && list.length < MAX_SUGGESTED; i++) {
    var item = input[i];
    var name = toSafeText(item && typeof item === 'object' ? item.name : item, MAX_NAME_LENGTH);
    if (name === '' || seen[name]) continue;
    seen[name] = true;

    var icon = toSafeText(item && typeof item === 'object' ? item.icon : '', 4);
    list.push({ name: name, icon: icon || '✨' });
  }
  return list;
}

function buildUserPrompt(habits, today, totalPoints) {
  var lines = ['今天是 ' + today + '。', '用户当前可用积分：' + totalPoints + ' 分。'];

  if (habits.length === 0) {
    lines.push('用户还没有录入任何习惯，请给出一套适合中学生的入门习惯方案。');
  } else {
    lines.push('用户已经录入的习惯（连续天数 / 累计打卡天数）：');
    habits.forEach(function (habit) {
      lines.push('- ' + habit.name + '（连续 ' + habit.streak + ' 天 / 累计 ' + habit.totalDays + ' 天）');
    });
    lines.push('请在此基础上优化，并补充必要的新习惯。');
  }

  return lines.join('\n');
}

/* 模型返回的 JSON 可能被 ``` 包住，这里做一次容错解析 */
function parseModelContent(content) {
  var text = String(content || '').trim();
  if (text === '') return { plan: '', habits: [] };

  var start = text.indexOf('{');
  var end = text.lastIndexOf('}');
  if (start !== -1 && end > start) {
    try {
      var data = JSON.parse(text.slice(start, end + 1));
      return {
        plan: typeof data.plan === 'string' && data.plan.trim() !== '' ? data.plan.trim() : text,
        habits: normalizeSuggested(data.habits)
      };
    } catch (error) {
      // 解析失败时退化成纯文本，前端照样能显示
    }
  }
  return { plan: text, habits: [] };
}

/* ==================== 口令下发（防提前推算） ==================== */

function codeSecret() {
  const raw = process.env.CODES_SECRET || process.env.DEEPSEEK_API_KEY || '';
  if (!raw) return null;
  return crypto.createHash('sha256').update('habit-code:' + raw).digest();
}

/* 东八区日期，并沿用"凌晨 4 点换日"的规则 */
function serverDateKey() {
  const shifted = new Date(Date.now() + 8 * 3600 * 1000 - 4 * 3600 * 1000);
  return shifted.toISOString().slice(0, 10);
}

function codeFor(habitId, dateKey) {
  const secret = codeSecret();
  if (!secret) return '';
  const digest = crypto.createHmac('sha256', secret).update(habitId + '|' + dateKey).digest();
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_ALPHABET.charAt(digest[i] % CODE_ALPHABET.length);
  }
  return code;
}

function handleCodes(payload) {
  const secret = codeSecret();
  if (!secret) {
    return jsonResponse(501, {
      ok: false,
      error: '服务端未配置 CODES_SECRET（或 DEEPSEEK_API_KEY），无法下发口令，前端会退化为本机口令'
    });
  }

  const requested = Array.isArray(payload && payload.habitIds) ? payload.habitIds : [];
  const dateKey = serverDateKey();
  const codes = {};

  requested.slice(0, MAX_HABITS).forEach(function (rawId) {
    const habitId = toSafeText(rawId, 64);
    if (habitId) codes[habitId] = codeFor(habitId, dateKey);
  });

  return jsonResponse(200, {
    ok: true,
    date: dateKey,
    codes: codes,
    source: 'server',
    note: '口令每天 04:00（东八区）更换，由服务端密钥派生，客户端无法提前推算'
  });
}

/* ==================== 视觉智能体：只做 OCR 提取 ==================== */

function visionConfig() {
  const apiKey = process.env.VISION_API_KEY || process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY || '';
  const baseUrl = (process.env.VISION_BASE_URL || process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com').replace(/\/+$/, '');
  const model = process.env.VISION_MODEL || 'deepseek-flash';
  if (!apiKey || !model) return null;
  return { apiKey: apiKey, baseUrl: baseUrl, model: model };
}

function canonText(text) {
  const upper = String(text || '').toUpperCase();
  let out = '';
  for (let i = 0; i < upper.length; i++) {
    out += CONFUSABLE[upper.charAt(i)] || upper.charAt(i);
  }
  return out.replace(/[^0-9A-Z]/g, '');
}

/* 口令命中即通过；允许 1 个字符的手写误差 */
function codeMatches(seenText, expectedCode) {
  const haystack = canonText(seenText);
  const needle = canonText(expectedCode);
  if (needle === '') return false;
  if (haystack.indexOf(needle) !== -1) return true;

  for (let i = 0; i + needle.length <= haystack.length; i++) {
    let diff = 0;
    for (let j = 0; j < needle.length; j++) {
      if (haystack.charAt(i + j) !== needle.charAt(j)) diff++;
    }
    if (diff <= 1) return true;
  }
  return false;
}

function parseSeenCodes(content) {
  const text = String(content || '').trim();
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');

  if (start !== -1 && end > start) {
    try {
      const data = JSON.parse(text.slice(start, end + 1));
      if (Array.isArray(data.codes)) {
        return {
          text: data.codes.map(function (item) { return String(item); }).join(' '),
          legible: data.legible !== false
        };
      }
    } catch (error) {
      // 落到下面的纯文本兜底
    }
  }
  return { text: text, legible: text !== '' };
}

async function callVisionOcr(vision, dataUrl) {
  const instruction = [
    '你只做一件事：把图片里出现的所有大写英文字母和数字，按画面中的顺序原样读出来。',
    '拍摄对象通常是手写在纸片、便利贴、本子角落上的短口令，也可能显示在另一台设备的屏幕上。',
    '不要判断照片内容是否与某个习惯相关，不要评价照片质量或构图，不要补充解释。',
    '不要猜测或纠正字符，看到什么就写什么；完全看不清就返回空数组。',
    '只输出 JSON：{"codes":["读到的一串字符"],"legible":true,"reason":"简短说明"}'
  ].join('\n');

  const controller = typeof AbortController === 'function' ? new AbortController() : null;
  const timer = controller ? setTimeout(function () { controller.abort(); }, REQUEST_TIMEOUT_MS) : null;

  try {
    const response = await fetch(vision.baseUrl + '/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + vision.apiKey
      },
      body: JSON.stringify({
        model: vision.model,
        messages: [
          { role: 'system', content: '你是严谨的 OCR 引擎，只负责读出字符，不做任何主观判断。' },
          {
            role: 'user',
            content: [
              { type: 'text', text: instruction },
              { type: 'image_url', image_url: { url: dataUrl } }
            ]
          }
        ],
        temperature: 0,
        max_tokens: 300
      }),
      signal: controller ? controller.signal : undefined
    });

    const raw = await response.text();
    if (!response.ok) {
      return { ok: false, error: '视觉模型返回 ' + response.status + '：' + String(raw).slice(0, 200) };
    }

    let data = null;
    try {
      data = JSON.parse(raw);
    } catch (error) {
      return { ok: false, error: '视觉模型返回内容无法解析' };
    }

    const content = data && data.choices && data.choices[0] && data.choices[0].message
      ? data.choices[0].message.content
      : '';
    const parsed = parseSeenCodes(content);
    return { ok: true, text: parsed.text, legible: parsed.legible };
  } catch (error) {
    const aborted = error && error.name === 'AbortError';
    return {
      ok: false,
      error: aborted
        ? '视觉模型响应超时'
        : '调用视觉模型失败：' + (error && error.message ? error.message : '未知错误')
    };
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function handleVerify(payload, event) {
  const habitId = toSafeText(payload && payload.habitId, 64);
  if (habitId === '') {
    return jsonResponse(400, { ok: false, error: '缺少习惯 ID' });
  }

  const expectedCode = codeFor(habitId, serverDateKey());
  if (expectedCode === '') {
    return jsonResponse(501, { ok: false, error: '服务端未配置口令密钥，无法校验' });
  }

  const image = payload && typeof payload.image === 'string' ? payload.image : '';
  if (image.indexOf('data:image/') !== 0) {
    return jsonResponse(400, { ok: false, error: '缺少图片数据（需要 dataURL）' });
  }
  if (image.length > MAX_IMAGE_CHARS) {
    return jsonResponse(413, { ok: false, error: '图片过大，请压缩后再上传' });
  }

  const vision = visionConfig();
  if (!vision) {
    return jsonResponse(501, {
      ok: false,
      needVision: true,
      error: '服务端未配置视觉模型（需要 VISION_API_KEY 与 VISION_MODEL），无法做二次识别'
    });
  }

  const quota = consumeQuota('vision', event);
  if (!quota.ok) {
    return jsonResponse(429, {
      ok: false,
      error: '今日视觉校验额度已用完，请明天再试或切换到 Mock 演示模式',
      quota: { vision: quota }
    });
  }

  const extraction = await callVisionOcr(vision, image);
  if (!extraction.ok) {
    return jsonResponse(502, { ok: false, error: extraction.error });
  }

  const matched = codeMatches(extraction.text, expectedCode);
  return jsonResponse(200, {
    ok: true,
    passed: matched,
    seen: extraction.text.slice(0, 60),
    legible: extraction.legible !== false,
    reason: matched ? '照片里读到了今日口令' : '照片里没有读到今日口令',
    engine: 'agent',
    model: vision.model,
    quota: { vision: quota }
  });
}

exports.handler = async function (event) {
  if (!originAllowed(event)) {
    return jsonResponse(403, { ok: false, error: '请求来源不在 ALLOWED_ORIGINS 允许列表中' });
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS_HEADERS, body: '' };
  }

  if (event.httpMethod === 'GET') {
    return handleHealth(event);
  }

  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, { ok: false, error: '只支持 POST 请求' });
  }

  var payload = null;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch (error) {
    return jsonResponse(400, { ok: false, error: '请求体不是合法的 JSON' });
  }
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) payload = {};

  /* 一个接口四个动作：health 配置检测 / codes 口令下发 / verify 口令识别校验 / plan 习惯规划 */
  var action = typeof payload.action === 'string' && payload.action !== '' ? payload.action : 'plan';
  if (action === 'health') return handleHealth(event);
  if (action === 'codes') return handleCodes(payload);
  if (action === 'verify') return handleVerify(payload, event);

  var apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return jsonResponse(500, {
      ok: false,
      error: '服务端未配置 DEEPSEEK_API_KEY，请在 Netlify 环境变量里添加后再试'
    });
  }

  var habits = normalizeHabits(payload && payload.habits);
  var today = /^\d{4}-\d{2}-\d{2}$/.test(payload && payload.today)
    ? payload.today
    : new Date().toISOString().slice(0, 10);
  var totalPoints = toSafeNumber(payload && payload.totalPoints);

  var planQuota = consumeQuota('plan', event);
  if (!planQuota.ok) {
    return jsonResponse(429, {
      ok: false,
      error: '今日真实 AI 规划额度已用完，请明天再试或继续使用 Mock 演示模式',
      fallback: 'mock',
      quota: { plan: planQuota }
    });
  }

  var model = process.env.DEEPSEEK_MODEL || DEFAULT_MODEL;
  var baseUrl = (process.env.DEEPSEEK_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, '');

  var controller = typeof AbortController === 'function' ? new AbortController() : null;
  var timer = controller ? setTimeout(function () { controller.abort(); }, REQUEST_TIMEOUT_MS) : null;

  try {
    var response = await fetch(baseUrl + '/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + apiKey
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: buildUserPrompt(habits, today, totalPoints) }
        ],
        temperature: 0.7,
        max_tokens: 1200,
        response_format: { type: 'json_object' }
      }),
      signal: controller ? controller.signal : undefined
    });

    var rawText = await response.text();

    if (!response.ok) {
      return jsonResponse(502, {
        ok: false,
        error: '模型接口返回 ' + response.status,
        detail: String(rawText).slice(0, 300)
      });
    }

    var data = null;
    try {
      data = JSON.parse(rawText);
    } catch (error) {
      return jsonResponse(502, { ok: false, error: '模型返回内容无法解析' });
    }

    var content = data && data.choices && data.choices[0] && data.choices[0].message
      ? data.choices[0].message.content
      : '';
    var parsed = parseModelContent(content);

    if (!parsed.plan) {
      return jsonResponse(502, { ok: false, error: '模型没有返回规划内容' });
    }

    return jsonResponse(200, {
      ok: true,
      plan: parsed.plan,
      habits: parsed.habits,
      model: model,
      usage: (data && data.usage) || null,
      quota: { plan: planQuota },
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    var aborted = error && error.name === 'AbortError';
    return jsonResponse(aborted ? 504 : 502, {
      ok: false,
      error: aborted
        ? '模型响应超时，请稍后重试（可在 netlify.toml 里把函数 timeout 调大）'
        : '调用模型失败：' + (error && error.message ? error.message : '未知错误')
    });
  } finally {
    if (timer) clearTimeout(timer);
  }
};

