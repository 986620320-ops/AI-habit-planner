# Prompt 链 01：积分兑换与真实 AI 双模式

- **时间**：2026-10-25 至 2026-10-26
- **相关提交**：`6eba6ef`、`2f25cbc`
- **核心问题**：把自动解锁积分商城改成真实兑换制，同时接入真实 AI，并控制比赛演示成本。

## 1. 用户原始 Prompt（节选完整需求）

> PLEASE IMPLEMENT THIS PLAN:
>
> # 积分兑换 + 真实 AI 演示改造计划
>
> ## Summary
>
> - 将积分商城从“达到积分自动解锁”改为真正的兑换制：积分足够时扣除积分兑换奖励，可重复兑换。
> - 恢复真实 AI 演示能力：默认 Mock，点击模式标签切换真实 AI；每日额度为规划 5 次、视觉校验 3 次。
> - 真实照片识别使用 `model="deepseek-flash"`，请求体采用 `messages.content` 数组 + `image_url` 格式。
> - 合并版继续只保留一个前端 `index.html`；删除 `shop.html`；`api.js` 迁移到 Netlify 标准函数目录。
> - 更新状态文档和 README，保证上下文压缩后仍能快速恢复。
>
> ## Key Changes
>
> ### 1. 积分商城改为兑换制
>
> - 奖励卡按钮改为“兑换 -X 积分”；积分不足时禁用并显示“还差 X 分”。
> - 兑换流程：
>   - 重新从 localStorage 读取最新积分，校验 `points.total >= reward.cost`。
>   - 扣除 `reward.cost`，写入流水：
>     `{ type: 'redeem', points: -cost, habitName: reward.name, rewardId: reward.id, date: todayKey, ts }`
>   - 保存积分和奖励数据，立即刷新商城。
> - 奖励可重复兑换，不设每日限制。
> - 奖励卡显示累计兑换次数；次数从积分流水中按 `rewardId` 统计，旧数据按 `habitName` 兜底。
> - `rewards.unlocked` 保留用于兼容，但不再自动解锁，也不作为能否兑换的依据。
> - 兑换确认弹窗按钮文案为“兑换”；删除奖励仍使用“删除”。
> - 积分明细增加“兑换奖励 · 名称”文案；“累计扣回”改为“累计支出”。
> - 更新商城说明文案：积分足够即可兑换，兑换扣分，可重复兑换，历史保留。
>
> ### 2. 真实 AI 双模式与额度
>
> - 前端模式标签改为可点击按钮：
>   - 默认 Mock，不产生费用。
>   - 点击切换到真实 AI，选择保存在 localStorage。
>   - 显示真实规划剩余次数和视觉校验剩余次数。
> - 前端加载时请求健康检查：
>   - `GET /.netlify/functions/api?action=health`
>   - 返回 `realAI`、`codes`、`vision`、`quota`。
>   - 只有 `realAI && codes` 时允许切换到真实模式；`vision` 单独显示是否可用于照片识别。
> - 服务端每日额度：
>   - `DEMO_PLAN_DAILY_LIMIT=5`
>   - `DEMO_VISION_DAILY_LIMIT=3`
>   - 按“日期 + 客户端 IP + 动作”计数；额度用完后规划自动降级 Mock 并明确提示，视觉校验返回 429。
> - 服务端口令校验改为：
>   - 前端只传 `habitId` 和图片。
>   - 服务端用 `habitId + serverDateKey()` 重新派生 `expectedCode`。
>   - 不再信任前端传来的 `expectedCode`。
> - 视觉模型配置：
>   - `VISION_MODEL=deepseek-flash`
>   - `VISION_BASE_URL=https://api.deepseek.com`
>   - `VISION_API_KEY` 可选，未配置时回退到 `DEEPSEEK_API_KEY`
>   - 请求体保持用户指定格式：
>     `messages.content` 数组中包含 `{"type":"image_url","image_url":{"url":dataUrl}}`
> - 真实模式下服务端口令不可用时，不静默使用本地口令，显示错误并建议切回 Mock。
> - 增加真实模式下的 `?forceVision=1`：跳过端侧 OCR，直接调用服务端视觉模型。
> - 增加可选 `ALLOWED_ORIGINS` 来源限制，健康检查响应加 `Cache-Control: no-store`，并修复 `payload=null` 崩溃。
>
> ### 3. 单文件与部署
>
> - 保留合并后的 `index.html`，继续使用 `#checkin` / `#shop` 切换。
> - 删除 `shop.html`；原版仍可从 `C:\Users\tony\Documents\ChatGPT\AI智能化习惯打卡项目\shop.html` 找回。
> - 将 `api.js` 迁移为 `netlify/functions/api.js`，删除根目录旧副本，避免两份后端代码漂移。
> - 新增 `netlify.toml`：
>   - `publish = "."`
>   - `functions = "netlify/functions"`
>   - `[functions."api"] timeout = 26`
> - 新增 `.env.example`，列出所有环境变量，不包含真实密钥。
> - 新增 `README.md`，写清本地启动、Netlify 部署、环境变量、真实/Mock 模式、演示步骤和已知限制。
>
> ## Public Interfaces / Data
>
> - `GET /.netlify/functions/api?action=health`
>   - 返回 `{ ok, realAI, codes, vision, quota: { plan, vision }, date }`
> - `POST { action: 'plan' }`
>   - 返回 `{ plan, habits, model, usage, quota: { plan } }`
>   - 额度耗尽返回 429，并带 `fallback: 'mock'`
> - `POST { action: 'verify', habitId, image }`
>   - 返回 `{ passed, seen, reason, engine, model, quota: { vision } }`
>   - 不再接受 `expectedCode`
> - `POST { action: 'codes', habitIds }`
>   - 保持现有服务端口令下发逻辑
> - 积分流水新增可选字段 `rewardId`；`type='redeem'` 表示兑换扣分。
> - `loadPoints` 需要保留 `rewardId`，备份/恢复和旧数据兼容。
>
> ## Test Plan
>
> - 兑换：
>   - 积分足够时扣分成功，流水出现负数兑换记录。
>   - 积分不足时按钮禁用，不扣分。
>   - 同一奖励可重复兑换，累计次数正确。
>   - 修改奖励名称/价格后，历史兑换仍按 `rewardId` 正确统计。
>   - 删除奖励不删除历史流水。
> - 数据：
>   - 刷新页面后积分、兑换次数、流水保留。
>   - 备份后恢复，`rewardId` 和兑换记录不丢失。
> - 真实 AI：
>   - 健康检查不可用时保持 Mock。
>   - 健康检查可用时模式标签可切换。
>   - 规划额度 5 次后返回 429，并降级 Mock。
>   - 视觉额度 3 次后返回 429。
>   - `deepseek-flash` 请求体包含 `image_url`，服务端按 `habitId` 派生口令并校验。
>   - `?forceVision=1` 能稳定触发真实视觉调用。
> - 页面：
>   - `#checkin` / `#shop` 切换正常，无重复 ID。
>   - 打卡页和商城页数据同步。
>   - 截图对比无视觉回归，控制台无 JS 报错。
> - 部署：
>   - `netlify dev` 下健康检查、真实规划、视觉校验均可用。
>   - `netlify.toml` 函数路径正确。
>
> ## Assumptions / Defaults
>
> - 部署平台为 Netlify。
> - `deepseek-flash` 可同时用于文本规划和视觉图片识别；`VISION_API_KEY` 可使用与 `DEEPSEEK_API_KEY` 相同的值。
> - 默认 Mock 模式；真实模式由用户手动切换，演示结束后切回 Mock。
> - 每日额度按 `5 次规划 + 3 次视觉校验`，可通过环境变量调整。
> - 兑换可重复，不设每日限制。
> - 每日额度计数保存在函数实例内存中，适合比赛演示；正式生产需换成持久化存储。
> - `shop.html` 直接删除，`index.html` 成为唯一前端页面；`api.js` 仍作为独立 Netlify 函数存在。
> - 不自动提交 Git commit，除非用户明确要求。

## 2. AI 给出的修改建议

- 先实现兑换事务，再改 AI 接口，避免前后端同时变化导致无法定位问题。
- 使用 `rewardId` 而不是奖励名称统计历史兑换，保证改价和改名后数据仍正确。
- 服务端重新派生口令，不信任前端传来的 `expectedCode`。
- 健康检查区分文本能力、口令能力和视觉能力。
- 把额度统一按 IP 与日期记录，Mock 模式不请求真实模型。
- 将 Netlify Function 放入标准目录，删除根目录重复副本。

## 3. 实际修改

- 商城卡片改为兑换制，增加重复兑换次数和 `rewardId` 流水。
- 增加 Mock / 真实 AI 标签、剩余额度和自动降级提示。
- 新增 `netlify/functions/api.js`、`netlify.toml` 和环境变量模板。
- 健康检查、规划、口令、视觉四个动作集中在一个函数中。
- `forceVision=1` 用于演示真实视觉识别。
- README 和状态文档补充部署、额度和数据说明。

## 4. 引导修复过程

后续用户发现根目录又出现旧版 `api.js`，并要求删除。AI 对比两个文件的大小和内容，确认根目录副本过期，删除并验证正式部署只使用：

```text
netlify/functions/api.js
```

同时发现 Netlify 密钥扫描把公开模型名称和 API 地址误判成密钥，最终通过删除重复的非机密环境变量解决，而不是关闭整个密钥扫描。

## 5. 验证与证据

- 前端脚本通过语法检查。
- 健康检查在 Netlify 环境返回 `realAI`、`vision` 和额度信息。
- 商城兑换、重复兑换、积分不足和备份恢复通过回归。
- 真实 AI 请求体包含 `image_url`。
- 部署成功后 Netlify 显示 Published。

## 6. 对应 Git 提交

- `6eba6ef` 迭代9-积分商城逻辑优化，设定每日AI使用次数
- `6eba6ef` api迭代2-新增 deepseek-flash 视觉识别、服务端口令派生、健康检查、每日额度
- `2f25cbc` 迭代6：接入 DeepSeek-Flash，双模式设计



