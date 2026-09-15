'use strict';

/**
 * Netlify 服务端函数：DeepSeek-Flash 规划接口
 *
 * 前端只把「用户已录入的习惯」发到这里，密钥保存在 Netlify 后台环境变量里，
 * 永远不会出现在任何前端 HTML / JS 中。
 *
 * 需要在 Netlify 后台 Site settings → Environment variables 配置：
 *   DEEPSEEK_API_KEY   必填：DeepSeek 控制台申请的 API Key
 *   DEEPSEEK_MODEL    选填：默认 deepseek-chat；若账号提供 flash 系列模型，填对应名字
 *   DEEPSEEK_BASE_URL 选填：默认 https://api.deepseek.com（可换成兼容 OpenAI 协议的代理地址）
 *
 * 可选：在项目根目录加 netlify.toml 把同步函数超时放宽，避免生成较长规划时超时：
 *   [functions]
 *     timeout = 26
 */

const DEFAULT_BASE_URL = 'https://api.deepseek.com';
const DEFAULT_MODEL = 'deepseek-chat';
const MAX_HABITS = 20;
const MAX_NAME_LENGTH = 30;
const MAX_SUGGESTED = 6;
const REQUEST_TIMEOUT_MS = 25000;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

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
    headers: Object.assign({ 'Content-Type': 'application/json; charset=utf-8' }, CORS_HEADERS),
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

exports.handler = async function (event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS_HEADERS, body: '' };
  }

  if (event.httpMethod === 'GET') {
    return jsonResponse(200, { ok: true, message: 'DeepSeek 规划接口已就绪，请用 POST 调用。' });
  }

  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, { ok: false, error: '只支持 POST 请求' });
  }

  var apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return jsonResponse(500, {
      ok: false,
      error: '服务端未配置 DEEPSEEK_API_KEY，请在 Netlify 环境变量里添加后再试'
    });
  }

  var payload = null;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch (error) {
    return jsonResponse(400, { ok: false, error: '请求体不是合法的 JSON' });
  }

  var habits = normalizeHabits(payload && payload.habits);
  var today = /^\d{4}-\d{2}-\d{2}$/.test(payload && payload.today)
    ? payload.today
    : new Date().toISOString().slice(0, 10);
  var totalPoints = toSafeNumber(payload && payload.totalPoints);

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
