# AI 学生习惯打卡系统

一个面向学生的习惯打卡 Web 应用：拍照 + 每日口令完成打卡，累计积分，并在积分商城中兑换奖励。当前前端是一个单文件页面，打卡和积分商城通过底部导航切换。

## 当前结构

```text
.
├─ index.html                  # 打卡 + 积分商城单文件前端
├─ netlify.toml                # Netlify 构建 / 函数配置
├─ .env.example                # 环境变量模板
└─ netlify/
   └─ functions/
      └─ api.js                # AI 规划 / 口令 / 视觉识别接口
```

> `shop.html` 已合并进 `index.html`，不再需要单独页面。

## 功能

- 习惯录入、删除、重命名
- 月历打卡统计、连续天数、最长连续
- 每日服务端口令 + 拍照打卡
- 端侧 Tesseract OCR + 真实 AI 视觉识别兜底
- 打卡积分、连续 7 天奖励
- 积分商城：积分足够即可兑换，兑换扣分，可重复兑换`n- 最多支持 20 个习惯，与服务端限制一致
- 积分明细、兑换记录、奖励自定义
- 数据备份 / 恢复（含照片）
- AI 个性化习惯规划：Mock / 真实 AI 双模式

## 本地运行

推荐使用 Netlify CLI，保证 `/.netlify/functions/api` 可用：

```bash
npx netlify-cli dev
```

然后打开 CLI 输出的本地地址。

> 不建议直接双击 `index.html` 测真实 AI：`file://` 下没有 Netlify 函数，也可能导致 localStorage 在页面间隔离。

## 环境变量

复制 `.env.example` 并在 Netlify 后台配置：

| 变量 | 说明 | 默认 |
|---|---|---|
| `DEEPSEEK_API_KEY` | DeepSeek API Key，真实规划必填 | 无 |
| `DEEPSEEK_MODEL` | 规划模型 | `deepseek-flash` |
| `DEEPSEEK_BASE_URL` | DeepSeek API 地址 | `https://api.deepseek.com` |
| `CODES_SECRET` | 服务端口令密钥，不填回退到 DeepSeek Key | 无 |
| `VISION_API_KEY` | 视觉识别 Key，不填回退到 DeepSeek Key | 无 |
| `VISION_MODEL` | 视觉模型 | `deepseek-flash` |
| `VISION_BASE_URL` | 视觉 API 地址 | `https://api.deepseek.com` |
| `DEMO_PLAN_DAILY_LIMIT` | 每日真实规划次数 | `5` |
| `DEMO_VISION_DAILY_LIMIT` | 每日视觉校验次数 | `3` |
| `ALLOWED_ORIGINS` | 允许的来源，逗号分隔；不填允许所有来源 | 空 |

视觉识别请求使用：

```json
{
  "model": "deepseek-flash",
  "messages": [
    {
      "role": "user",
      "content": [
        { "type": "text", "text": "..." },
        { "type": "image_url", "image_url": { "url": "data:image/jpeg;base64,..." } }
      ]
    }
  ]
}
```

## 使用真实 AI 演示

1. 配置好环境变量并部署。
2. 打开页面，右上角默认显示 `Mock 演示模式`。
3. 点击模式标签切换到 `真实 AI 模式`。
4. 点击「AI 生成个性化习惯规划」，展示真实模型返回和剩余额度。
5. 添加一个习惯，复制今日口令，拍照打卡。
6. 如需稳定展示真实视觉模型，在真实模式下使用 `?forceVision=1`，它会跳过端侧 OCR 直接调用服务端视觉识别。
7. 演示结束后点击模式标签切回 Mock，避免继续消耗额度。

## 积分兑换规则

- 打卡 +10 分
- 连续满 7 天额外 +5 分
- 删除照片取消当天打卡，扣回本次 10 分`n- 删除习惯会扣回该习惯产生的积分，避免删除后重新添加刷分
- 兑换奖励扣除对应积分
- 同一奖励可重复兑换，积分明细保留历史
- 积分不足时兑换按钮禁用，并显示还差多少分

## 数据与限制

- 习惯、打卡、积分、奖励、口令、校验记录保存在 localStorage。
- 照片保存在 IndexedDB。
- 当前每日 AI 额度使用函数实例内存计数，Netlify 冷启动后会重置；比赛演示足够，生产环境建议换成 Netlify Blobs / Redis / 数据库。
- 当前奖励兑换是本地数据操作，没有服务端账户体系；正式产品应把积分和兑换记录迁移到服务端。

## 部署到 Netlify

1. 把项目推送到 GitHub/Gitee。
2. Netlify 连接仓库，构建命令留空，发布目录设为 `.`。
3. 配置环境变量。
4. 部署后访问首页，检查 `/.netlify/functions/api?action=health` 是否返回正常。

## 验收检查

- 打卡页和积分商城可通过底部导航切换。
- 积分足够时兑换扣分成功，可重复兑换。
- 积分不足时按钮禁用。
- 刷新页面后积分和兑换记录保留。
- 默认 Mock；真实模式可切换。
- `?forceVision=1` 能触发服务端视觉识别。
- 规划额度 5 次、视觉额度 3 次后返回 429。
- 控制台无 JS 报错。
