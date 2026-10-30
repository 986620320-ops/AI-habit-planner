# 项目状态摘要 / Context Handoff

- **最后更新**：2026-10-30（Asia/Shanghai）
- **项目目录**：`D:\codex项目\codex-agent-web`
- **当前阶段**：产品代码与比赛文档主体完成；等待真实 Prompt 截图、演示视频录制、最终提交
- **一句话状态**：AI 习惯教练已具备连续对话、多模态证据打卡、积分兑换和可复现部署；技术报告与 Prompt 历史已生成。

## 1. 已完成

### 产品

- AI 连续对话：30 条本地历史、12 条真实上下文、快捷问题、失败重试、候选习惯导入。
- 真实 AI 每日 10 轮；第 11 轮保留对话并提示主动切换 Mock。
- 多模态证据：照片、文字、语音转文字、一次追问、手动复盘。
- AI 和手动完成均 +10 分，取消扣回 10 分。
- 积分商城、兑换、连续奖励、备份恢复。
- Mock / 真实 AI 双模式，密钥只在服务端环境变量。

### 比赛材料

- `README.md`：10 分钟复现、依赖、环境变量、健康检查、故障排查、验收矩阵。
- `docs/prompt-history/`：5 条真实核心 Prompt 链。
- `docs/AI_Habit_Coach_Technical_Report.pdf`：18 页技术报告。
- `docs/video/demo-video-script.md`：6 分 30 秒视频脚本。
- `docs/video/subtitles.srt`：视频字幕。
- `docs/SUBMISSION_INDEX.md`：评分要求、材料、提交历史索引。

### 验证

- API 测试、浏览器测试、响应式测试、重复 ID 检查、语法检查均通过。
- Git 历史未发现真实 `sk-` API Key。
- `.env` 已被 `.gitignore` 排除。

## 2. 仍需人工完成

1. 在真实 Codex 对话界面截图 5 张 Prompt 证据图，放入：
   `docs/prompt-history/evidence/01-codex.png` 至 `05-codex.png`
2. 按 `docs/video/demo-video-script.md` 录制 5～8 分钟、1080p MP4。
3. 确保视频中 AI 协同过程不少于 2 分钟。
4. 遮挡所有 `.env`、API Key 和个人隐私。
5. 上传视频并填写最终链接。
6. 从全新目录克隆仓库，按 README 完整复现。
7. 确认 Netlify 项目为 Public，并把 `DEMO_PLAN_DAILY_LIMIT` 设置为 10。
8. 创建并推送 `v1.0-competition` tag。

## 3. 关键文件

```text
index.html
netlify/functions/api.js
README.md
.env.example
docs/AI_Habit_Coach_Technical_Report.pdf
docs/prompt-history/
docs/video/demo-video-script.md
docs/video/subtitles.srt
docs/SUBMISSION_INDEX.md
```

## 4. 关键约束

- 不重写、不压缩已有 34+ 次 Git 提交。
- 不在仓库中保存真实 API Key。
- 不恢复手写口令和 OCR。
- 不自动伪造 Prompt 截图或演示视频。
- 视频和截图必须来自真实 Codex 对话与真实操作。
