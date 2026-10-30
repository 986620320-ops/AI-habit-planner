# AI 习惯教练与多模态打卡

一个面向通用人群的习惯养成 Web 应用。用户可以和 AI 连续对话制定计划，也可以通过照片、文字或语音转文字完成每日证据打卡。应用包含连续记录、积分兑换、AI 追问、手动复盘和数据备份。

## 当前结构

```text
.
├─ index.html                  # 对话、打卡、积分商城单文件前端
├─ netlify.toml                # Netlify 构建 / 函数配置
├─ .env.example                # 环境变量模板
└─ netlify/
   └─ functions/
      └─ api.js                # AI 对话 / 证据判断接口
```

## 核心功能

### AI 连续对话

- 类似普通 AI 的连续聊天，不再是一次性生成整份规划
- 最近 30 条消息保存在本机，刷新后继续对话
- 真实 AI 每次携带最近 12 条真实模式消息作为上下文
- 支持快捷问题、新对话、输入中状态、逐字显示和失败重试
- AI 推荐习惯时显示候选卡片，支持单个或全部导入
- Mock 模式下使用本地示例，不调用模型、不产生费用
- 真实 AI 每日默认 10 轮对话

### 多模态证据打卡

- 照片、文字、语音转文字三种证据入口，不再要求手写口令
- 不限定固定物品；睡眠、学习、运动、整理等场景可自由表达
- AI 返回匹配证据、置信度、判断原因和一句反馈
- AI 不确定时最多追问一次
- AI 失败、额度用完或网络异常时，可填写 10～50 字复盘手动完成
- AI 验证和手动完成均获得 10 分，并计入连续记录
- 连续满 7 天额外奖励 5 分
- 最多支持 20 个习惯

## 本地运行

推荐使用 Netlify CLI，确保 `/.netlify/functions/api` 可用：

```bash
npx netlify-cli dev
```

然后打开 CLI 输出的本地地址。

不建议直接双击 `index.html` 测真实 AI：`file://` 下没有 Netlify 函数。

## 环境变量

| 变量 | 说明 | 默认 |
|---|---|---|
| `DEEPSEEK_API_KEY` | 对话、规划与文字证据判断 Key | 必填 |
| `VISION_API_KEY` | 照片证据判断 Key，可复用 DeepSeek Key | 必填 |
| `DEEPSEEK_MODEL` | 文本模型，通常不需要设置 | `deepseek-flash` |
| `DEEPSEEK_BASE_URL` | 文本 API 地址，通常不需要设置 | `https://api.deepseek.com` |
| `VISION_MODEL` | 视觉模型，通常不需要设置 | `deepseek-flash` |
| `VISION_BASE_URL` | 视觉 API 地址，通常不需要设置 | `https://api.deepseek.com` |
| `DEMO_PLAN_DAILY_LIMIT` | 每日真实 AI 对话轮数 | `10` |
| `DEMO_VISION_DAILY_LIMIT` | 每日证据判断额度，照片/文字/语音共用 | `5` |
| `ALLOWED_ORIGINS` | 允许的来源，逗号分隔；不填允许所有来源 | 空 |

> 为避免 Netlify 密钥扫描把公开的模型名称和 API 地址误判为密钥，通常只配置两个 API Key 和额度变量。

## 使用真实 AI

1. 配置环境变量并部署。
2. 打开页面，默认处于 `Mock 演示`。
3. 点击模式标签切换到真实 AI。
4. 在 AI 习惯教练中连续提问，或点击快捷问题。
5. AI 推荐习惯时，点击候选卡片导入。
6. 点击习惯左侧的 AI 证据按钮，提交照片、文字或语音转文字。
7. 真实对话第 11 轮会显示额度用完，可主动切换 Mock 继续。
8. 演示结束后切回 Mock，避免继续消耗额度。

## API 动作

### 健康检查

```text
GET /.netlify/functions/api?action=health
```

### AI 连续对话

```json
{
  "action": "chat",
  "messages": [
    { "role": "user", "content": "我最近总是熬夜" }
  ],
  "habits": [{ "name": "阅读", "streak": 2, "totalDays": 8 }],
  "totalPoints": 30,
  "today": "2026-10-30"
}
```

### 证据判断

```json
{
  "action": "evidence",
  "habitId": "h_xxx",
  "habitName": "阅读",
  "evidence": {
    "type": "photo|text|mixed",
    "image": "data:image/jpeg;base64,...",
    "text": "今天读了 20 页"
  },
  "followUpAnswer": "可选的一次追问回答"
}
```

## 积分规则

- AI 证据通过：+10 分
- 手动复盘完成：+10 分
- 取消打卡：-10 分
- 连续满 7 天：额外 +5 分
- 删除习惯会扣回该习惯产生的积分，最多扣到 0
- 兑换奖励会扣除积分，可重复兑换

## 数据与限制

- 习惯、打卡、积分、奖励和证据判断摘要保存在 localStorage。
- AI 对话保存在 `ai-habit-checkin:ai-chat`，最多 30 条。
- 原始照片保存在 IndexedDB；真实模式下照片会发送给模型服务。
- 原始文字、语音和音频不会额外持久化；语音只在浏览器中转换为可编辑文字。
- 每日 AI 额度使用函数实例内存计数，Netlify 冷启动或实例变化后可能重置；比赛演示足够，生产环境应使用 Netlify Blobs、Redis 或数据库。
- 当前没有账号体系，不同设备之间不会自动同步，请使用备份/恢复迁移数据。

## 部署到 Netlify

1. 推送项目到 GitHub。
2. Netlify 连接仓库，分支选择 `main`。
3. Build command 留空，Publish directory 设置为 `.`。
4. 添加环境变量。
5. 使用 `Deploy project without cache` 部署。
6. 检查健康接口：

```text
https://你的站点.netlify.app/.netlify/functions/api?action=health
```

正常返回：

```json
{
  "ok": true,
  "realAI": true,
  "vision": true,
  "quota": {
    "chat": { "limit": 10, "remaining": 10 },
    "plan": { "limit": 10, "remaining": 10 },
    "evidence": { "limit": 5, "remaining": 5 }
  }
}
```

## 验收检查

- 连续对话、刷新恢复、新对话和失败重试正常
- AI 推荐习惯可单个或全部导入
- 第 11 轮真实对话显示额度提示且不自动切换
- 照片、文字和语音转文字均可完成打卡
- 模糊证据最多追问一次
- AI 和手动完成都 +10 分
- 刷新、备份、恢复后数据正确
- 手机和桌面无横向溢出
- `index.html` 与 `netlify/functions/api.js` 语法检查通过
