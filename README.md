# AI 习惯教练与多模态证据打卡

一个可直接运行的 AI 习惯养成 Web 应用。用户可以连续对话制定计划，再用照片、文字或语音转文字提交当天证据。AI 会解释判断依据并给出下一步建议；漏掉一天时提供最低完成版；每周根据真实记录复盘，只调整一个变量。

当前版本：`v1.0.0-rc4`

## 目录

```text
.
├─ index.html                         单文件前端
├─ netlify/functions/api.js           Netlify Function 后端
├─ cloud-functions/api/[[default]].js EdgeOne Cloud Function 后端
├─ netlify.toml                        Netlify 发布、函数与 /api 重写
├─ edgeone.json                        EdgeOne 构建与函数配置
├─ edgeone-build.mjs                   EdgeOne 静态构建入口
├─ .env.example                        环境变量模板
└─ README.md
```

比赛使用的截图、技术报告、Prompt 导出页和演示视频不放在此仓库，单独保存在提交材料中。

## 核心迭代索引

main 保留了从空白页面到当前版本的逐步演进。评审可以先查看以下关键提交：

| 提交 | 阶段 | 主要变化 |
|---|---|---|
| `8592055` | 基础骨架 | 创建空白 HTML 项目 |
| `5f2b029` | 习惯管理 | 新增习惯录入、本地存储和日历 |
| `9130a66` | 打卡升级 | 新增拍照打卡、连续记录和日期详情 |
| `6885726` | 积分体系 | 新增积分规则和积分商城 |
| `2f25cbc` | AI 接入 | 接入 DeepSeek 与 Mock 双模式 |
| `6eba6ef` | 后端与额度 | 增加 Netlify 接口和 AI 每日额度 |
| `b2b492f` | 问题修复 | 修复删除习惯积分漏洞与习惯数量上限 |
| `5b6835d` | 通用规划 | AI 根据上下文判断场景并规划习惯 |
| `87ca801` | 证据打卡 | 用照片、文字和语音替代手写口令 |
| `269d715` | 连续对话 | 将一键规划改为连续 AI 教练 |
| `8857c16` | 反馈闭环 | 新增打卡反馈与断签恢复 |
| `1576867` | 周期复盘 | 新增每周 AI 复盘和单变量调整 |

后续功能继续使用“迭代N-功能描述”的提交格式，README、环境变量和部署配置随对应功能一起更新。

## 功能

- 连续 AI 对话、候选习惯导入和本地聊天记录；规划会话优先使用 V4 Pro，普通聊天使用 V4 Flash
- 照片、文字、语音转文字三种证据入口
- AI 证据判断、一次追问和手动复盘降级
- 打卡后下一步建议和“和教练继续聊”草稿
- 漏签恢复、原因选择和最低完成版
- 每周 AI 复盘、单变量调整和独立额度
- 积分、连续奖励、奖励兑换和备份恢复
- 默认 Mock 模式，手动切换真实 AI

## 本地运行

### Mock 模式

无需 API Key：

```powershell
python -m http.server 8080
```

打开：

```text
http://localhost:8080/#checkin
```

Mock 模式不会调用模型，也不产生费用。

### 真实 AI 模式

1. 安装 Netlify CLI。
2. 将 `.env.example` 复制为 `.env` 并填写 Key。
3. 启动：

```powershell
npx netlify-cli dev
```

打开 Netlify CLI 输出的地址，并点击页面右上角的“Mock 演示”切换为真实 AI。

健康检查：

```text
GET /api?action=health
```

## EdgeOne Makers 部署

仓库同时保留 Netlify 和 EdgeOne 两套后端入口。前端统一请求 `/api`：Netlify 通过重写转发到 `/.netlify/functions/api`，EdgeOne 直接匹配 `cloud-functions/api/[[default]].js`。

1. 将仓库导入 EdgeOne Makers，框架选择 Other。
2. 构建命令使用 `node edgeone-build.mjs`，输出目录为 `.`。
3. 添加 `MAKERS_MODELS_KEY`；普通聊天默认 V4 Flash，规划默认 V4 Pro。
4. 照片识别单独配置 `VISION_API_KEY`、`VISION_BASE_URL` 和 `VISION_MODEL`。
5. 部署后访问 `/api?action=health`，确认 `realAI`、`chatModel` 和 `planningModel`。

## 环境变量

| 变量 | 说明 | 默认值 |
|---|---|---|
| `MAKERS_MODELS_KEY` | EdgeOne Makers 内置模型 Key；启用后聊天用 Flash、规划用 Pro | 可选 |
| `DEEPSEEK_API_KEY` | 自有 OpenAI 兼容文本模型 Key | 与 Makers Key 二选一 |
| `VISION_API_KEY` | 图片证据判断；不配置时照片降级为人工复盘 | 可选 |
| `AI_CHAT_MODEL` | 普通聊天与证据判断模型 | Makers 模式为 V4 Flash |
| `AI_PLANNING_MODEL` | 制定或修改计划模型 | Makers 模式为 V4 Pro |
| `DEEPSEEK_MODEL` | 自有模型模式的兼容模型名 | `deepseek-flash` |
| `DEEPSEEK_BASE_URL` | 文本接口地址 | `https://api.deepseek.com` |
| `VISION_MODEL` | 视觉模型 | `deepseek-flash` |
| `VISION_BASE_URL` | 视觉接口地址 | `https://api.deepseek.com` |
| `DEMO_PLAN_DAILY_LIMIT` | 真实 AI 每日对话轮数 | `10` |
| `DEMO_VISION_DAILY_LIMIT` | 每日证据判断次数 | `5` |
| `DEMO_REVIEW_DAILY_LIMIT` | 每日真实周复盘次数 | `2` |
| `ALLOWED_ORIGINS` | 允许来源，逗号分隔 | 空 |

不要提交 `.env` 或真实 API Key。

## 连续对话路由

- 首轮规划信息不足时，AI 只问一个最关键的问题；用户补充后再给出具体计划。
- 当前会话一旦进入规划模式，制定和修改计划使用 `AI_PLANNING_MODEL`，普通聊天使用 `AI_CHAT_MODEL`。
- 规划模型遇到 429、模型不可用或服务端错误时，会自动用普通聊天模型重试一次。
- 聊天接口兼容纯文本和 JSON 返回，模型忽略 JSON 模式时仍会保留有效回复。

## API

后端统一入口：

```text
/api
```

支持：

- `GET ?action=health`
- `POST { action: "chat", planningContext?, messages, habits }`
- `POST { action: "evidence" }`
- `POST { action: "review", scope: "weekly" }`
- `POST { action: "plan" }`：兼容旧版一次规划接口

## 数据与安全

- 习惯、打卡、积分、奖励、恢复计划和周复盘保存在 localStorage。
- 照片保存在 IndexedDB。
- Mock 模式不发送照片。
- 真实模式只发送本次选择和填写的证据。
- 服务端不持久化原始文字、语音或聊天记录。
- API Key 只放在本地 `.env` 或部署平台环境变量中。
- 额度和来源限制位于后端函数中，Netlify 与 EdgeOne 共用同一套解析和模型路由逻辑。

## 积分规则

- AI 验证通过：`+10`
- 手动复盘完成：`+10`
- 取消打卡：`-10`
- 连续满 7 天：额外 `+5`
- 删除习惯：最多扣到 0
- 奖励可重复兑换

## 开发检查

```powershell
node --check netlify/functions/api.js
```

前端为单文件 `index.html`，无需构建工具或 npm 运行时依赖。
