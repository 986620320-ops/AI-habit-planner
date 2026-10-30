# AI 习惯教练与多模态打卡

## 作品简介

一个面向通用人群的习惯养成 Web 应用。用户可以和 AI 连续对话制定计划，也可以通过照片、文字或语音转文字完成每日证据打卡。应用包含连续记录、积分兑换、AI 追问、手动复盘和数据备份。

## 版本与入口

- **当前版本**：v1.0.0-rc2 · 候选发布版
- **上一线上版本**：v0.13.0 · 连续对话产品版 `6efa050`
- **完整版本记录**：[CHANGELOG.md](CHANGELOG.md)
- **在线演示**：https://ai-habit-demo.netlify.app/
- **代码仓库**：https://github.com/986620320-ops/AI-habit-planner
- **Prompt 历史**：[docs/prompt-history/README.md](docs/prompt-history/README.md)
- **评审导航**：[docs/SUBMISSION_INDEX.md](docs/SUBMISSION_INDEX.md)
- **文档导航**：[docs/README.md](docs/README.md)

## 作品定位

不是一次性生成计划，也不是要求用户手写随机字符的工具，而是一个能理解上下文、持续对话并接受真实生活证据的 AI 习惯教练。

核心闭环：

```text
AI 连续对话 → 导入建议习惯 → 照片 / 文字 / 语音证据
→ AI 理解与追问 → 积分和连续奖励 → 奖励兑换
```

## 10 分钟极速复现

### 环境要求

| 工具 | 要求 | 用途 |
|---|---|---|
| Windows 10/11、macOS 或 Linux | 任意现代版本 | 运行环境 |
| Chrome/Edge | 近两年版本 | 页面与相机功能 |
| Git | 2.30+ | 克隆仓库 |
| Python | 3.10+ | Mock 模式静态服务器 |
| Node.js | 20 LTS 或更高，包含 npm | 本地运行 Netlify Function |
| Netlify CLI | 最新版 | 完整真实 AI 本地复现 |
| DeepSeek API Key | 可选 | 真实对话和证据判断 |

仓库本身没有前端运行时 npm 依赖。`index.html` 是单文件前端；后端仅使用 Netlify Function 和 Node 内置能力。

### 方案 A：2 分钟运行 Mock 模式（无需 Key）

```bash
git clone https://github.com/986620320-ops/AI-habit-planner.git
cd AI-habit-planner
python -m http.server 8080
```

打开：

```text
http://localhost:8080/#checkin
```

预期：

- 左下/顶部 AI 模式显示 “Mock 演示”。
- 三个快捷问题、AI 证据打卡和积分商城可以操作。
- 不调用真实模型，不产生 API 费用。
- 健康检查不可用时，页面会自动停留在 Mock 模式。

### 方案 B：完整真实 AI 本地复现

1. 确认 Node、npm 可用：

```bash
node -v
npm -v
```

2. 安装并运行 Netlify CLI：

```bash
npm install -g netlify-cli
netlify dev
```

也可以在项目目录直接运行：

```bash
npx netlify-cli dev
```

3. 复制环境变量模板：

```bash
copy .env.example .env
```

macOS/Linux 使用：

```bash
cp .env.example .env
```

4. 在 `.env` 中填写：

```text
# 在 .env 中设置 DEEPSEEK_API_KEY 和 VISION_API_KEY
# 此处不在文档里展示真实赋值格式
```

`VISION_API_KEY` 可以等于 `DEEPSEEK_API_KEY`。不要提交 `.env`。

5. 打开 Netlify CLI 输出的地址，通常为：

```text
http://localhost:8888/#checkin
```

6. 检查健康接口：

```text
http://localhost:8888/.netlify/functions/api?action=health
```

预期 JSON：

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

7. 点击页面模式标签切换到“真实 AI”，发送一条对话或证据。

### 10 分钟验收时间表

| 时间 | 操作 | 通过标准 |
|---|---|---|
| 0:00–2:00 | 克隆并启动 Python Mock 服务 | `#checkin` 打开，显示 Mock |
| 2:00–4:00 | 点击快捷问题、导入 AI 推荐习惯 | 对话出现，习惯进入列表 |
| 4:00–6:00 | 配置 `.env` 并运行 `netlify dev` | 健康接口三项为 true |
| 6:00–8:00 | 提交文字和照片证据，完成一次打卡 | 积分增加 10 |
| 8:00–9:00 | 取消打卡、进入积分商城 | 积分扣回，兑换按钮出现 |
| 9:00–10:00 | 备份数据、刷新恢复、检查移动端 | 数据和聊天记录保留 |

## 环境变量

| 变量 | 说明 | 默认 |
|---|---|---|
| `DEEPSEEK_API_KEY` | 对话、规划与文字证据判断 Key | 必填 |
| `VISION_API_KEY` | 照片证据判断 Key，可复用 DeepSeek Key | 必填 |
| `DEEPSEEK_MODEL` | 文本模型 | `deepseek-flash` |
| `DEEPSEEK_BASE_URL` | 文本 API 地址 | `https://api.deepseek.com` |
| `VISION_MODEL` | 视觉模型 | `deepseek-flash` |
| `VISION_BASE_URL` | 视觉 API 地址 | `https://api.deepseek.com` |
| `DEMO_PLAN_DAILY_LIMIT` | 每日真实 AI 对话轮数 | `10` |
| `DEMO_VISION_DAILY_LIMIT` | 每日证据判断额度 | `5` |
| `ALLOWED_ORIGINS` | 允许来源，逗号分隔；空值允许所有来源 | 空 |

模型名称和 API 地址已有代码默认值，通常只需要配置两个 API Key 和额度。

## 使用真实 AI

1. 打开页面，默认处于 `Mock 演示`。
2. 点击模式标签切换到真实 AI。
3. 在 AI 习惯教练中连续提问或点击快捷问题。
4. AI 推荐习惯时，点击候选卡片导入。
5. 点击习惯左侧的 AI 证据按钮，提交照片、文字或语音转文字。
6. AI 返回 `passed`、`followup` 或 `manual_only`。
7. AI 额度用完时可主动切换 Mock；手动完成需要 10～50 字复盘。

## API 动作

### 健康检查

```text
GET /.netlify/functions/api?action=health
```

### AI 连续对话

```json
{
  "action": "chat",
  "messages": [{ "role": "user", "content": "我最近总是熬夜" }],
  "habits": [{ "name": "阅读", "streak": 2, "totalDays": 8 }],
  "totalPoints": 30,
  "today": "2026-10-30"
}
```

响应：

```json
{
  "ok": true,
  "reply": "自然语言回复",
  "audience": "可选场景",
  "habits": [{ "name": "23点前放下手机", "icon": "📵" }],
  "engine": "agent",
  "model": "deepseek-flash",
  "quota": {
    "chat": { "limit": 10, "remaining": 9 },
    "plan": { "limit": 10, "remaining": 9 }
  }
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
  "followUpAnswer": "可选"
}
```

## 数据与安全

- 对话保存在 `ai-habit-checkin:ai-chat`，最多 30 条。
- 习惯、打卡、积分、奖励和证据摘要保存在 localStorage。
- 照片保存在 IndexedDB；真实模式下照片会发送给模型服务。
- 服务端密钥只放在 Netlify 环境变量中，不进入前端。
- Git 历史已检查，未发现 `sk-` 真实 Key。
- `.env` 被 `.gitignore` 排除。
- 每日额度使用函数实例内存计数，适合比赛演示；生产环境应迁移到持久化存储。
- 当前没有账号体系，不同设备不会自动同步。

## 积分规则

- AI 证据通过：+10 分
- 手动复盘完成：+10 分
- 取消打卡：-10 分
- 连续满 7 天：额外 +5 分
- 删除习惯扣回该习惯贡献积分，最多扣到 0
- 积分兑换可重复，记录保留

## 架构概览

```text
浏览器
├─ index.html：聊天、证据打卡、积分商城、备份
├─ localStorage：习惯/积分/聊天/证据摘要
└─ IndexedDB：照片 Blob
        │
        ▼
Netlify Function: netlify/functions/api.js
├─ health：能力与额度
├─ chat：多轮上下文 + DeepSeek
├─ evidence：照片/文字证据 + 追问
└─ 环境变量：API Key、额度、来源限制
```

## 常见故障排查

### 页面只有 Mock，无法切真实 AI

- 检查 `.env` 是否存在且变量名正确。
- 检查健康接口 `realAI` 是否为 true。
- 修改环境变量后重启 `netlify dev`。

### 健康接口 404

- 确认函数路径是 `netlify/functions/api.js`。
- 确认从项目根目录启动 Netlify CLI。
- 确认 `netlify.toml` 的 functions 目录正确。

### 页面要求登录 Netlify

- 当前站点被设为 Private。
- 进入 `Project configuration → General → Visitor access → Project visibility`，把 Production deploys 设为 Public。

### 构建出现密钥扫描错误

- 不要关闭安全扫描。
- 删除不需要设置的公开模型名称和 Base URL 环境变量。
- 密钥继续放在环境变量中，不写进仓库。

### AI 额度用完

- 页面会保留当前对话。
- 真实 AI 对话第 11 轮会显示提示，可切换 Mock 继续。
- 证据判断额度用完后仍可写 10～50 字复盘手动完成。

### `.env` 是否泄漏

```bash
git check-ignore .env
git ls-files .env
```

第一条应有输出，第二条不应有输出。

## 验证矩阵

| 场景 | 结果 |
|---|---|
| AI 连续对话与上下文 | 通过 |
| 聊天刷新恢复 | 通过 |
| 新对话取消旧请求 | 通过 |
| 单个/全部导入习惯 | 通过 |
| Mock 不调用模型 | 通过 |
| 第 11 轮对话额度 | 通过，保持真实模式并提示 |
| 照片/文字/语音证据 | 通过 |
| AI 追问一次 | 通过 |
| 手动复盘 +10 | 通过 |
| 取消打卡 -10 | 通过 |
| 375px / 1440px 响应式 | 通过，无横向溢出 |
| 重复 DOM ID | 无 |
| 前端脚本与 API 语法 | 通过 |

## Git 演进

当前仓库保留了从空白骨架到当前版本的细粒度提交，从空白 HTML、习惯录入、拍照打卡、积分商城、AI 接入、通用规划、Bug 修复、多模态证据到连续对话逐步演进。

关键提交：

- `8592055` 初始空白 HTML 骨架
- `6eba6ef` 积分商城、额度与视觉接口基础
- `b2b492f` 删除习惯积分漏洞与 20 个习惯上限
- `5b6835d` 通用 AI 规划与补充信息
- `87ca801` 多模态证据打卡
- `269d715` 连续对话式 AI 教练

## 评审材料

- [Prompt 历史](docs/prompt-history/README.md)
- [评审导航](docs/SUBMISSION_INDEX.md)
- [产品截图](docs/assets/README.md)

## 当前限制

- 无账号和跨设备同步。
- AI 额度计数为函数实例内存，冷启动可能重置。
- 奖励兑换和积分仍为本地数据，不是服务端账本。
- 照片会发送给真实模型服务，Mock 模式不发送。
- 真实流式输出尚未实现，采用完整响应后的逐字显示。





