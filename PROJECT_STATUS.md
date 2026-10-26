# 项目状态摘要 / Context Handoff

- **最后更新**：2026-10-27（Asia/Shanghai）
- **项目目录**：`D:\codex项目\codex-agent-web`
- **当前阶段**：通用 AI 规划、可选补充信息、AI 场景判断已完成并通过回归；等待真实 Key / Netlify 环境烟测与比赛材料准备
- **一句话状态**：`index.html` 是唯一前端页面，已完成积分兑换制和真实 AI 演示改造；后端已迁移到 `netlify/functions/api.js`；`shop.html` 已删除。

---

## 1. 这份文档怎么用

如果上下文被压缩，直接把这份文档发回来，并附一句：

> 先读取这份 PROJECT_STATUS.md，然后从“待办事项”继续。

优先确认：

1. 当前 `index.html` 已经是最终改造版，不是旧版合并稿。
2. 后端以 `netlify/functions/api.js` 为准；根目录当前仍有旧版 `api.js`，属于待清理的重复文件。
3. `shop.html` 已删除，前端不再依赖它。
4. 真实 AI 默认 Mock，点击模式标签切换；每日额度 5 次规划 + 3 次视觉校验。
5. 不要自动提交 Git commit，除非用户明确要求。

---

## 2. 当前文件结构

```text
D:\codex项目\codex-agent-web\
├─ .env.example
├─ .gitattributes
├─ README.md
├─ api.js                 # 旧版重复文件，部署以 netlify/functions/api.js 为准
├─ index.html
├─ netlify.toml
└─ netlify\
   └─ functions\
      └─ api.js
```

文件大小：

- `index.html`：165,829 B
- `netlify/functions/api.js`：23,510 B
- `.env.example`：493 B
- `netlify.toml`：93 B
- `README.md`：5,155 B
- `.gitattributes`：66 B
- 根目录 `api.js`：22,781 B（旧版重复，待清理）

已删除：

- `shop.html`（原版仍可从 `C:\Users\tony\Documents\ChatGPT\AI智能化习惯打卡项目\shop.html` 找回）

Git 状态（HEAD `3164206`）：

```text
 M index.html
 M README.md
 M api.js
 M netlify/functions/api.js
```

恢复记录：

- 2026-10-26 误删后已恢复 `.gitattributes`、`netlify.toml`、`.env.example`、`README.md` 和 `netlify/functions/api.js`。
- 根目录 `api.js` 当前仍存在，且比 `netlify/functions/api.js` 旧；部署只使用函数目录版本，重复文件待用户决定是否删除。
- `netlify/functions/api.js` 当前已由 Git 跟踪。
- `shop.html` 保持删除，不恢复。
- 最新 ZIP：`C:\Users\tony\Documents\ChatGPT\New project\codex-agent-web-latest-20261026.zip`

本轮逻辑修复：

- `index.html` 增加前端习惯上限 `MAX_HABITS = 20`，与服务端一致。
- 删除习惯时按该习惯产生的积分扣回，新增 `type: 'delete'` 流水；旧流水会补写 `habitId`。
- 重新添加同名习惯不会恢复已扣积分，避免重复刷分。
- 修复 `pruneByDate` 在 key 数量较少时跳过清理的问题。

本轮体验优化：

- AI 规划增加「整理习惯 → 生成方案 → 检查内容」三阶段进度。
- AI 结果使用逐字打字机效果；减少动态效果时直接显示全文。
- AI 改为通用规划器，根据习惯、积分和可选补充信息自行判断场景。
- 新增「补充信息（可选）」输入，最多 200 字，保存在 localStorage。
- AI 返回 `audience` 场景标签；Mock 模式显示「Mock 示例（通用）」，不伪装人群判断。
- 删除习惯最多扣到 0，不产生负余额。
- Tesseract 文案改为首次加载需联网，首次加载时显示提示。

---

## 3. 已实现功能

### 3.1 单文件前端

- `index.html` 同时包含「打卡」和「积分商城」两个视图。
- 底部导航通过 `#checkin` / `#shop` 切换，不跳转页面。
- 两个视图共用同一个 `HabitStore`，数据互通。
- 商城相关 ID 带 `shop-` 前缀，CSS 限定在 `#view-shop`，不会影响打卡页。

### 3.2 积分兑换制（方案 B）

- 奖励卡按钮为「兑换 -X 积分」。
- 积分足够时点击兑换，确认后扣除对应积分。
- 积分不足时按钮禁用，显示「还差 X 分」。
- 兑换可重复，不设每日限制。
- 奖励卡显示累计兑换次数。
- 兑换流水：
  `{ type: 'redeem', points: -cost, habitName, rewardId, date, ts }`
- `loadPoints` 保留 `rewardId`，备份/恢复和旧数据兼容。
- 积分明细新增「兑换奖励 · 名称」。
- 「累计扣回」已改为「累计支出」。
- `rewards.unlocked` 仅保留兼容，不再自动解锁，也不作为兑换条件。

### 3.3 真实 AI 双模式

- 默认 Mock，模式标签可点击切换真实 AI，选择保存在 localStorage。
- 健康检查：
  `GET /.netlify/functions/api?action=health`
- 健康检查返回：
  `{ ok, realAI, codes, vision, quota: { plan, vision }, date }`
- 只有 `realAI && codes` 时允许切换真实模式。
- 真实模式显示剩余额度：规划 5 次、视觉校验 3 次。
- 规划额度用完自动降级 Mock，并明确提示。
- 视觉额度用完返回 429。
- 服务端口令校验：
  - 前端只传 `habitId` 和图片。
  - 服务端用 `habitId + serverDateKey()` 重新派生 `expectedCode`。
  - 不再信任前端 `expectedCode`。
- 视觉模型：
  - `VISION_MODEL=deepseek-flash`
  - `VISION_BASE_URL=https://api.deepseek.com`
  - `VISION_API_KEY` 未配置时回退到 `DEEPSEEK_API_KEY`
  - 请求体使用 `messages.content` 数组 + `image_url`
- 演示用 `?forceVision=1`：真实模式下跳过端侧 OCR，直接调用服务端视觉模型。
- 增加可选 `ALLOWED_ORIGINS` 来源限制。
- 健康检查响应加 `Cache-Control: no-store`。
- 修复 `payload=null` 崩溃。

---

## 4. 已验证内容

恢复后的 `netlify/functions/api.js` 已通过 `node --check` 和健康检查烟测：返回 200，`realAI/codes/vision` 均为 true，额度为 5/3。

### 4.1 API 自动化测试

已通过：

- 健康检查返回 `realAI/codes/vision` 和额度。
- 视觉模型请求 `model=deepseek-flash`，且包含 `image_url`。
- 服务端按 `habitId` 派生口令，忽略前端错误 `expectedCode`。
- 视觉额度 3 次后返回 429。
- 规划额度 5 次后返回 429，并带 `fallback: 'mock'`。
- `ALLOWED_ORIGINS` 拦截来源。
- `null` 请求体不崩溃。

### 4.2 浏览器端自动化测试

已通过：

- 初始 Mock 模式。
- 打卡页和商城页数据同步。
- 70 积分兑换 30 积分奖励后剩 40，再兑换一次剩 10。
- 奖励显示「已兑换 2 次」，按钮变为「还差 20 分」并禁用。
- 积分流水出现两条 `redeem`，`rewardId` 正确。
- 点击模式标签切换到真实 AI。
- `?forceVision=1` 触发服务端视觉识别，`verify.engine='agent'`。
- 规划额度耗尽后自动降级 Mock。
- 控制台无 JS 报错。
- 删除习惯测试：70 积分 → 50，新增 `delete` 流水 -20；重新添加同名习惯后仍为 50。
- 20 个习惯上限测试：第 21 个被拦截，显示“最多只能添加 20 个习惯”。
- 商城兑换回归通过：70 → 40，`rewardId` 正确。
- AI 阶段与打字机测试通过：Mock 三阶段完成，结果逐字出现。
- 真实 AI 阶段测试通过：显示“调用 DeepSeek 生成”，额度更新为 4/5。
- 额度耗尽后阶段完成并降级 Mock。
- 扣到 0 测试通过：余额 10、贡献 20 时只扣 10，余额为 0；余额 30 时扣 20，余额为 10。
- 通用 AI 测试通过：补充信息可保存、计数、清空，真实请求包含 context。
- AI 场景标签测试通过：Mock 显示「Mock 示例（通用）」，真实模式显示「AI 判断场景：备考学生」。
- 服务端 Prompt 测试通过：不再写死“大学生/中学生”，有 context 时作为背景注入，无 context 时要求生成通用方案。
- 服务端 context 长度测试通过：前端 200 字、服务端最多保留 300 字。
- OCR 文案测试通过：页面不再出现“离线可用”，显示首次加载需联网。

### 4.3 语法检查

- `netlify/functions/api.js` 通过 `node --check`。
- `index.html` 内 3 个脚本均通过 `node --check`。
- 无重复 DOM id。

---

## 5. 待办事项

### P0：真实 Key / Netlify 烟测

在真实环境中验证：

1. 配置 `.env` 或 Netlify 环境变量。
2. 运行 `npx netlify-cli dev`。
3. 访问 `/.netlify/functions/api?action=health`，确认 `realAI/codes/vision` 均为 true。
4. 切换真实模式，生成一次真实规划。
5. 用 `?forceVision=1` 上传照片，确认真实视觉模型返回。
6. 检查额度从 5/3 正确递减。

### P0：Git 提交

当前改动尚未提交。用户确认后再执行：

```text
git add index.html netlify.toml .env.example README.md netlify/functions/api.js
git add -u
git commit -m "实现积分兑换与真实 AI 双模式"
```

不要自动 commit。

### P1：比赛材料

截止日期：**2026-11-18**。

仍需：

- 10 分钟复现 README（已有基础版，可继续完善）
- 至少 3 个核心迭代的 Prompt 历史
- 5–8 分钟演示视频，至少 2 分钟 AI 协同过程
- 不超过 30 页 PDF 技术文档
- 线上可访问的 Netlify 演示地址
- 公开仓库最终检查

### P2：后续增强

- 将内存额度换成 Netlify Blobs / Redis 持久化计数。
- 账号体系与服务端积分账本。
- 移动端/桌面端更完整的视觉回归。
- 备份恢复的端到端自动化测试。

---

## 6. 关键约束

- `index.html` 是唯一前端页面，不要重新引入 `shop.html`。
- `api.js` 只在 `netlify/functions/api.js` 维护，不要在根目录再建副本。
- 不要把真实 API Key 写进代码或 README。
- 默认 Mock，真实模式由用户手动切换；录视频后切回 Mock。
- 每日额度默认 5 次规划 + 3 次视觉校验。
- 额度计数当前是函数实例内存，冷启动会重置，比赛演示够用。
- 不自动提交 Git，除非用户明确要求。

---

## 7. 恢复上下文提示词

```text
请先读取：
C:\Users\tony\Documents\ChatGPT\New project\PROJECT_STATUS.md

当前状态：
- index.html 已实现积分兑换制和真实 AI 双模式。
- 后端在 netlify/functions/api.js，根目录没有 api.js。
- shop.html 已删除，不要再引入。
- 默认 Mock，真实模式额度 5 次规划 + 3 次视觉校验。
- 视觉模型 deepseek-flash，使用 image_url。
- forceVision=1 用于稳定演示真实视觉识别。

请从“待办事项”的 P0 开始：
先在真实 Key / Netlify 环境做烟测，然后处理 Git 提交和比赛材料。
不要自动修改 API Key，也不要自动提交 Git。
```

---

## 8. 交付格式偏好（固定）

以后每次有文件改动，按以下格式交付：

1. **改动摘要**：用几句话说明改了什么。
2. **最新文件链接**：必须给出可直接打开的具体文件绝对路径链接，不只给目录。
3. **新增 / 删除文件**：单独列出，避免遗漏或误以为文件还在。
4. **验证结果**：写清已通过哪些测试、哪些还没测。
5. **剩余待办**：列出下一步需要用户确认或配置的事项。

示例格式：

```text
已修改：
- index.html：...
- netlify/functions/api.js：...

新增：
- README.md

删除：
- shop.html

验证：
- 语法检查通过
- API 测试通过

待办：
- 配置真实 API Key
```

不要只发项目目录或一句“已经改好了”，必须附具体文件链接。








