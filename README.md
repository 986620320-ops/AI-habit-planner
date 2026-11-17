# AI 习惯教练与多模态证据打卡

一个支持连续 AI 规划、自由证据打卡、断签恢复、自动周复盘和积分奖励的习惯养成 Web 应用。

- 在线演示：https://ai-habit-demo.netlify.app
- 当前版本：`v1.1.3`
- 发布标签：`v1.1.3`
- 版本与提交核验：以构建产物 `version.json` 和健康接口 `build` 字段为准
- 代码仓库：https://github.com/986620320-ops/AI-habit-planner
- 演示视频脚本：[5–8 分钟分镜与旁白](docs/赛事演示视频脚本_5-8分钟.md)
- 评审材料：[参赛提交材料对照清单](docs/参赛提交材料对照清单.md)

## 功能概览

- **连续 AI 规划**：保留对话上下文，第 2、4、6 轮逐步交付 V1、V2、V3 方案。
- **模型混合路由**：普通聊天使用 V4 Flash，规划优先 V4 Pro；失败时自动降级。
- **多模态证据**：支持照片、文字和语音转文字，AI 最多追问一次。
- **手动降级**：AI 无法判断或额度不足时，可填写复盘手动完成。
- **断签恢复**：根据中断原因给出当天最低完成版。
- **自动周复盘**：新一周首次打开时推送上一完整周复盘。
- **积分与奖励**：打卡、连续奖励、自定义奖励、兑换记录和数据备份。
- **精简界面**：功能介绍集中在问号弹窗，商城区块和添加表单按需展开。
- **双平台部署**：支持 Netlify Functions 与 EdgeOne Cloud Functions。

## 2. 复现性声明与重现指南

### 2.1 复现性声明

- 本仓库包含可运行源码、构建脚本、依赖锁文件、环境变量模板、回归测试和 CI 配置。
- Mock 模式完全在浏览器本地运行，不调用模型、不需要 API Key，也不会产生外部费用。
- 真实 AI 模式通过服务端函数调用外部模型；请求协议和降级逻辑固定，但具体文本内容受模型供应商影响。
- 项目数据保存在当前浏览器的 localStorage 和 IndexedDB，不依赖预置数据库或私有账号。
- 测试使用本地 Mock 服务，不需要真实 Key；浏览器测试只在本地回环地址访问页面。
- 构建时从 Git 或 CI 环境读取提交号，写入 `version.json`，可通过线上健康接口核对部署版本。
- 评委可按 2.4 节的步骤，在 10 分钟内完成 Mock 模式复现；真实 AI 模式只需额外填写一个模型 Key。

### 2.2 环境要求与依赖清单

| 项目 | 要求 | 用途 |
|---|---|---|
| Node.js | `20.18.0`（CI 固定版本） | 构建、测试和本地静态服务器 |
| npm | `10.8.0+` | 安装锁定依赖 |
| Git | `2.40+` | 获取版本和构建提交号 |
| Chrome 或 Edge | 最新稳定版 | 浏览器回归测试 |
| Python | `3.8+`，可选 | 仅用于历史上传兼容；新版可直接使用 `npm run dev` |
| 操作系统 | Windows 10/11 已验证；Linux CI 同步验证 | 本地运行和自动化复现 |

npm 依赖只有一项，版本已经锁定：

| 依赖 | 版本 | 类型 | 说明 |
|---|---|---|---|
| `@edgeone/pages-blob` | `0.0.19` | 生产依赖 | EdgeOne Blob 持久化额度适配器 |
| `package-lock.json` | lockfile v3 | 锁文件 | 固定安装结果，评委应使用 `npm ci` |
| Node 内置模块 | Node 20.18.0 自带 | 运行时 | HTTP、Crypto、File System 等，无额外框架 |

前端为原生 HTML/CSS/JavaScript，不需要 React、Vue、Webpack 或 Vite。浏览器测试和 API 测试使用 Node 内置模块，不依赖 Puppeteer 或 Playwright。

### 2.3 环境变量模板

Mock 模式不需要任何环境变量。真实 AI 模式先将模板复制为本地 `.env`：

```powershell
Copy-Item .env.example .env
```

macOS / Linux：

```bash
cp .env.example .env
```

主要变量如下，完整模板见 [`.env.example`](.env.example)：

| 变量 | 必填 | 默认值 | 说明 |
|---|---|---|---|
| `MAKERS_MODELS_KEY` | 三选一 | 空 | EdgeOne Makers 内置模型密钥 |
| `DEEPSEEK_API_KEY` | 三选一 | 空 | DeepSeek 或兼容服务密钥 |
| `OPENAI_API_KEY` | 三选一 | 空 | OpenAI 或兼容服务密钥；前两者都未设置时启用 |
| `DEEPSEEK_BASE_URL` | 否 | `https://api.deepseek.com` | DeepSeek/兼容服务地址 |
| `OPENAI_BASE_URL` | 否 | `https://api.openai.com/v1` | OpenAI/兼容服务地址 |
| `DEEPSEEK_MODEL` | 否 | `deepseek-flash` | 文本模型基础值 |
| `AI_CHAT_MODEL` | 否 | 空 | 普通聊天模型覆盖值 |
| `AI_PLANNING_MODEL` | 否 | 空 | 规划模型覆盖值 |
| `VISION_API_KEY` | 否 | 回退到文本 Key | 图片证据模型密钥 |
| `VISION_MODEL` | 否 | `deepseek-flash` | 图片证据模型名 |
| `VISION_BASE_URL` | 否 | 回退到文本服务地址 | 图片证据模型地址 |
| `DEMO_PLAN_DAILY_LIMIT` | 否 | `10` | 每客户端每日真实对话/规划轮数 |
| `DEMO_VISION_DAILY_LIMIT` | 否 | `10` | 每客户端每日证据判断次数 |
| `DEMO_REVIEW_DAILY_LIMIT` | 否 | `2` | 每客户端每日真实周复盘次数 |
| `DEMO_GLOBAL_DAILY_LIMIT` | 否 | `100` | 全站每日预算上限 |
| `DEMO_CHAT_RATE_PER_MINUTE` | 否 | `6` | 每客户端每分钟聊天请求上限 |
| `ALLOWED_ORIGINS` | 生产必填 | 空 | 允许来源，逗号分隔；空值仅适合本地演示 |
| `QUOTA_HASH_SALT` | 生产必填 | 空 | 匿名额度标识哈希盐 |
| `APP_VERSION` | 否 | `1.1.3` | 无构建产物时的版本回退值 |
| `BUILD_COMMIT` | 否 | `unknown` | 无构建产物时的提交号回退值 |

构建阶段还支持 `GITHUB_SHA`、`COMMIT_SHA`、`EDGEONE_COMMIT_SHA`、`EDGEONE_ENV` 和 `NODE_ENV`。实际部署时请不要提交 `.env`。

最小真实 AI 配置：

```dotenv
# EdgeOne 内置模型
MAKERS_MODELS_KEY=你的Key

# 或使用 DeepSeek
# DEEPSEEK_API_KEY=你的Key
# DEEPSEEK_BASE_URL=https://api.deepseek.com
# DEEPSEEK_MODEL=deepseek-flash
```

### 2.4 10 分钟极速复现

#### 0:00–1:00 获取代码与安装锁定依赖

```powershell
git clone https://github.com/986620320-ops/AI-habit-planner.git
cd AI-habit-planner
node --version
npm ci
```

预期：

- Node 输出 `v20.18.0`
- `npm ci` 只安装 `@edgeone/pages-blob@0.0.19`
- 不出现 `package-lock.json` 不一致错误

#### 1:00–2:00 构建与一键回归

```powershell
npm run reproduce
```

预期输出：

- 生成 `version.json`
- 生成 `cloud-functions/api/[[default]].js`
- API、连续对话、额度、浏览器和紧凑界面测试全部返回 `ok: true`
- 最后一条测试命令退出码为 `0`

如只想快速验证核心逻辑：

```powershell
npm run check
npm run test:core
```

#### 2:00–4:00 Mock 主流程

```powershell
npm run dev
```

打开：

```text
http://127.0.0.1:8080/#checkin
```

依次检查：

1. 右上角问号帮助和顶部新手指南
2. 添加习惯及按需展开的表单
3. 连续 AI 规划与候选方案导入
4. 照片、文字或语音转文字证据打卡
5. 断签恢复与最低完成版
6. 上一完整周自动复盘
7. 商城区块摘要、奖励兑换和 JSON 备份

Mock 模式不发送任何网络请求到模型服务。

#### 4:00–7:00 真实 AI 模式

```powershell
Copy-Item .env.example .env
# 编辑 .env，填入 MAKERS_MODELS_KEY 或 DEEPSEEK_API_KEY
npx netlify-cli@17.38.2 dev
```

打开 Netlify CLI 输出的地址，点击右上角模式按钮切换为“真实 AI”，发送以下测试对话：

```text
帮我制定规划
我最近总是失眠
一般十二点睡，早上七点起，睡前会刷手机
晚上有时加班到十一点
周末也想保持
请把最终方案收敛成三步
```

验收点：

- 第 2、4、6 轮出现 V1、V2、V3 方案
- 模型请求失败时显示可理解的降级提示
- 真实 AI 不可用时，Mock 和手动打卡仍可完成

#### 7:00–8:30 健康检查与部署校验

本地或线上访问：

```text
GET /api/index?action=health
```

确认返回：

```json
{
  "ok": true,
  "realAI": true,
  "vision": true,
  "chatModel": "...",
  "planningModel": "...",
  "storageMode": "persistent",
  "build": {
    "version": "1.1.3",
    "commit": "..."
  }
}
```

`vision` 只有在配置了可用的视觉 Key 时才应为 `true`；仅配置文本模型时，文本证据和手动打卡仍可正常使用。

线上全部校验：

```powershell
npm run verify:deploy -- --url https://你的站点域名
```

Netlify 的函数额度存储为内存兼容模式时，验证命令会返回失败；这是平台限制。EdgeOne 使用 Blob 持久化存储，应返回 `storageMode: "persistent"`。

#### 8:30–10:00 数据、截图与录屏

- 导出 JSON 备份
- 检查习惯、打卡、积分、方案、聊天、周复盘和推送状态
- 截图 AI 方案、证据打卡、断签恢复、自动周复盘和手机端布局
- 正式演示视频需 5–8 分钟，并含至少 2 分钟 AI 协同过程复现

完整分镜见 [视频脚本](docs/赛事演示视频脚本_5-8分钟.md)。

### 2.5 成功标准与故障排查

复现成功至少满足：

- `npm ci` 成功
- `npm run reproduce` 退出码为 `0`
- Mock 页面可加载且控制台无未处理异常
- 375px 与 1440px 无横向溢出
- 健康接口返回正确的版本、模型、额度和存储状态
- 备份恢复后计划与最近周复盘仍存在

常见问题：

| 现象 | 处理方式 |
|---|---|
| `npm` 不存在 | 安装 Node.js 20.18.0，并确认 `node -v`、`npm -v` 均可执行 |
| `package-lock.json` 不一致 | 删除 `node_modules` 后重新执行 `npm ci` |
| 找不到 Chrome | 设置 `CHROME_PATH` 指向 Chrome 或 Edge 的可执行文件 |
| `realAI: false` | 检查 `.env` 是否填写 Key，重启 `netlify dev` |
| `vision: false` | 设置 `VISION_API_KEY`，或复用文本模型 Key |
| 端口 8080 被占用 | PowerShell 设置 `$env:PORT=8081; npm run dev` |
| 线上版本与本地不一致 | 重新构建、部署，再执行 `npm run verify:deploy` |

## 项目结构

```text
.
├─ index.html                           单文件前端
├─ netlify/functions/api.js             Netlify Function
├─ cloud-functions/api/[[default]].js   EdgeOne Cloud Function（构建生成，不入库）
├─ cloud-functions/api/quota-store.js   EdgeOne Blob 额度适配器
├─ netlify.toml                         Netlify 配置
├─ edgeone.json                         EdgeOne 配置
├─ edgeone-build.mjs                    EdgeOne 构建与版本生成
├─ scripts/serve.mjs                    零依赖本地服务器
├─ scripts/verify-deploy.mjs            线上版本检查
├─ tests/                               回归测试与跨平台浏览器定位
├─ docs/prompt-history/                 AI 协同 Prompt 记录与截图
├─ docs/technical-report/               技术报告生成说明
├─ .github/workflows/reproduce.yml      GitHub Actions 复现检查
├─ .env.example                         完整环境变量模板
├─ package-lock.json                    锁定依赖版本
└─ package.json                         Node 依赖与复现脚本
```

## API

统一入口：`/api/index`

| 方法 | Action | 说明 |
|---|---|---|
| GET | `health` | 模型、版本、额度和存储状态 |
| POST | `chat` | 连续 AI 对话 |
| POST | `evidence` | 照片/文字证据判断 |
| POST | `review` | 每周 AI 复盘 |
| POST | `plan` | 兼容旧版单次规划 |

POST 请求需要：

```http
Content-Type: application/json
X-AI-Client: habit-coach-web/1
```

## 测试

完整复现命令：

```powershell
npm ci
npm run reproduce
```

也可以分别执行：

```powershell
npm run check
npm run test:core
npm run test:browser
```

- `api_rc4.js`：周复盘额度、结构化输出和第 3 次 429
- `chat_rc4.js`：连续规划上下文、Flash/Pro 路由和故障降级
- `quota_rc4.js`：持久化额度、全站预算、分钟限频和内存降级
- `chat_browser_rc4.js`：连续对话、方案导入、证据说明和手机端布局
- `browser_rc4.js`：断签恢复、打卡反馈、周复盘、错误路径和备份恢复
- `ui_compact_rc5.js`：帮助弹窗、折叠交互、自动周复盘和移动端溢出

GitHub Actions 会在 Node.js 20.18.0 上执行同一套安装、构建和回归流程。

## 数据与安全

- 习惯、打卡、积分、方案、聊天和周复盘保存在浏览器 localStorage。
- 照片保存在 IndexedDB。
- API Key 只存放在本地 `.env` 或部署平台环境变量中。
- 后端限制请求来源、内容类型、输入长度、客户端频率和每日预算。
- 真实模式只发送本次选择的证据；服务端不持久化原始聊天或证据文字。
- Netlify 使用内存额度兼容模式，EdgeOne 使用 Blob 持久化额度。
- 生产环境必须设置 `ALLOWED_ORIGINS` 和 `QUOTA_HASH_SALT`。
- 长期使用前建议在积分商城导出 JSON 备份。

## AI 协同与评审材料

- [Prompt 历史](docs/prompt-history/README.md)
- [Prompt 对话导出页](docs/prompt-history/evidence/evidence-export.html)
- [Prompt 清单与日志哈希](docs/prompt-history/evidence/manifest.json)
- [技术报告生成说明](docs/technical-report/README.md)
- [完整提交材料清单](docs/参赛提交材料对照清单.md)
- [5–8 分钟演示视频脚本](docs/赛事演示视频脚本_5-8分钟.md)

## 已知限制

- 数据默认只保存在当前浏览器，不支持跨设备同步。
- Netlify 额度为函数实例内存计数；持久化额度需使用 EdgeOne Blob。
- 真实 AI 文本具有供应商侧非确定性，但接口契约、额度、降级和验收标准固定。
- 演示视频、技术报告 PDF 和产品截图作为外部提交材料，不放在本仓库。
