# AI 习惯教练与多模态证据打卡

一个支持连续 AI 规划、自由证据打卡、断签恢复、自动周复盘和积分奖励的习惯养成 Web 应用。

- 在线演示：https://ai-habit-demo.netlify.app
- 当前版本：`v1.1.3`
- 应用提交：`888b8f3`
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

## 快速开始

### 环境要求

- Node.js 20+
- Chrome / Edge
- Git
- Python 3（仅 Mock 静态服务器需要）

### 1. 安装与构建

```powershell
npm install
npm run build
```

### 2. Mock 模式

Mock 模式不调用模型、不消耗额度，可直接检查完整界面和主流程。

```powershell
python -m http.server 8080
```

打开：

```text
http://localhost:8080/#checkin
```

### 3. 真实 AI 模式

复制环境变量模板并填写模型配置：

```powershell
Copy-Item .env.example .env
npx netlify-cli dev
```

打开 Netlify CLI 输出的地址，点击页面右上角模式按钮切换为“真实 AI”。

最小配置：

```dotenv
MAKERS_MODELS_KEY=
# 或者使用自有 OpenAI 兼容模型
DEEPSEEK_API_KEY=
DEEPSEEK_BASE_URL=https://api.deepseek.com
VISION_API_KEY=
VISION_BASE_URL=https://api.deepseek.com
VISION_MODEL=你的视觉模型名
```

完整变量见 [.env.example](.env.example)。

## 10 分钟复现

### 0:00–1:30 环境与构建

```powershell
npm install
npm run build
```

确认生成 `version.json`，并检查以下文件存在：

```text
index.html
edgeone.json
edgeone-build.mjs
cloud-functions/api/[[default]].js
```

### 1:30–3:00 Mock 主流程

```powershell
python -m http.server 8080
```

打开 `http://localhost:8080/#checkin`，依次演示：

1. 右上角问号帮助
2. 添加习惯和折叠表单
3. 连续 AI 规划与方案导入
4. 证据打卡
5. 断签恢复
6. 自动周复盘
7. 商城区块摘要展开

### 3:00–4:30 部署配置

Netlify：

- Build command：`node edgeone-build.mjs`
- Publish directory：`.`
- Functions directory：`netlify/functions`

EdgeOne：

- Install command：`npm install`
- Build command：`node edgeone-build.mjs`
- Output directory：`.`
- Node.js：`20.18.0`

### 4:30–6:30 真实 AI

切换真实 AI，完成 6 轮规划，确认 V1、V2、V3 均出现并可采用。

```text
帮我制定规划
我最近总是失眠
一般十二点睡，早上七点起，睡前会刷手机
晚上有时加班到十一点
周末也想保持
请把最终方案收敛成三步
```

### 6:30–8:00 接口检查

```text
GET /api/index?action=health
```

确认：

- `realAI: true`
- `chatModel` / `planningModel`
- `build.version` / `build.commit`
- `storageMode`
- 对话、证据和复盘额度

### 8:00–9:00 部署校验

```powershell
npm run verify:deploy -- --url https://你的站点域名
```

脚本会比对 `/version.json` 与健康接口中的版本和提交号。

### 9:00–10:00 备份与截图

- 导出 JSON 备份。
- 检查习惯、打卡、积分、方案、聊天、周复盘和推送状态。
- 截图 AI 方案、证据打卡、自动周复盘和手机端布局。

> 正式演示视频要求为 5–8 分钟，并包含至少 2 分钟的 AI 协同过程复现。完整分镜见 [视频脚本](docs/赛事演示视频脚本_5-8分钟.md)。

## 项目结构

```text
.
├─ index.html                           单文件前端
├─ netlify/functions/api.js             Netlify Function
├─ cloud-functions/api/[[default]].js   EdgeOne Cloud Function
├─ cloud-functions/api/quota-store.js   EdgeOne Blob 额度适配器
├─ netlify.toml                         Netlify 配置
├─ edgeone.json                         EdgeOne 配置
├─ edgeone-build.mjs                    EdgeOne 构建与版本生成
├─ scripts/verify-deploy.mjs            线上版本检查
├─ tests/                               回归测试
├─ docs/prompt-history/                 AI 协同 Prompt 记录与截图
├─ docs/technical-report/               技术报告生成说明
├─ .env.example                         环境变量模板
└─ package.json                         Node 依赖与脚本
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

```powershell
node tests\api_rc4.js
node tests\chat_rc4.js
node tests\quota_rc4.js
node tests\chat_browser_rc4.js
node tests\browser_rc4.js
node tests\ui_compact_rc5.js
```

另可检查后端语法：

```powershell
node --check netlify\functions\api.js
node --check cloud-functions\api\[[default]].js
```

## 数据与安全

- 习惯、打卡、积分、方案、聊天和周复盘保存在浏览器 localStorage。
- 照片保存在 IndexedDB。
- API Key 只存放在本地 `.env` 或部署平台环境变量中。
- 后端限制请求来源、内容类型、输入长度、客户端频率和每日预算。
- 真实模式只发送本次选择的证据；服务端不持久化原始聊天或证据文字。
- Netlify 使用内存额度兼容模式，EdgeOne 使用 Blob 持久化额度。
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
- 演示视频、技术报告 PDF 和产品截图作为外部提交材料，不放在本仓库。
