# 比赛提交材料索引

- **作品名称**：AI 习惯教练与多模态证据打卡
- **代码仓库**：https://github.com/986620320-ops/AI-habit-planner
- **在线演示**：https://ai-habit-demo.netlify.app/
- **提交日期**：2026-10-30
- **比赛截止**：2026-11-18

## 1. 核心材料

| 材料 | 位置 | 状态 |
|---|---|---|
| 10 分钟复现指南 | [README.md](../README.md) | 已补齐 |
| 技术报告 PDF | [AI_Habit_Coach_Technical_Report.pdf](AI_Habit_Coach_Technical_Report.pdf) | 已生成，18 页 |
| 技术报告源文件 | [technical-report/report.html](technical-report/report.html) | 已保留 |
| Prompt 历史 | [prompt-history/README.md](prompt-history/README.md) | 5 条文字链已整理 |
| 视频拍摄脚本 | [video/demo-video-script.md](video/demo-video-script.md) | 已准备 |
| 视频字幕 | [video/subtitles.srt](video/subtitles.srt) | 已准备 |
| 实际 MP4 视频 | 待录制 | **需人工录制** |
| Codex 对话截图 | `prompt-history/evidence/` | **需人工截图或录屏** |

## 2. 评审快速入口

1. 阅读 [README 的 10 分钟极速复现](../README.md#10-分钟极速复现)。
2. 运行 Python Mock 模式检查产品闭环。
3. 配置 `.env` 后运行 Netlify CLI，检查真实 AI。
4. 阅读 [Prompt 历史](prompt-history/README.md) 与 [技术报告 PDF](AI_Habit_Coach_Technical_Report.pdf)。
5. 按 [视频脚本](video/demo-video-script.md) 录制真实 AI 协同过程。

## 3. Git 演进索引

| 迭代 | Commit | 价值 |
|---|---|---|
| 空白骨架 | `8fa1b60`、`8592055` | 证明不是一次性初始化全部功能 |
| 习惯与日历 | `5f2b029`、`93c6ef5`、`9130a66` | 基础数据闭环 |
| 积分与商城 | `6885726`、`6eba6ef` | 反馈和奖励 |
| AI 接入 | `2f25cbc`、`704c473`、`a7609c6` | Mock/真实模式、视觉与额度 |
| Bug 修复 | `935550b` | 删除习惯积分漏洞与数量上限 |
| 意图控制 | `10379d7` | 通用规划与 context |
| 多模态证据 | `b71b9a9` | 替代手写口令失败方案 |
| 连续对话 | `ae61c06` | AI 习惯教练 |
| 简介更新 | `b5b1778` | 作品说明 |

历史总览命令：

```bash
git log --oneline --decorate --graph --all
```

## 4. 评分要求对照

### 过程可复现性与演进链路（25%）

- 细粒度 Git 历史：已有 34+ 次提交
- Prompt 历史：5 条文字链
- 截图/录屏：待补充
- 10 分钟复现：README 已补齐
- 可复现密钥安全：`.env` 未跟踪、Git 历史已扫描

### 解题有效性与实用价值（25%）

- 连续对话、证据打卡、积分兑换形成闭环
- 不依赖手写随机字符
- 支持 Mock 与真实 AI

### 方法创新性与意图控制（20%）

- 多模态自由证据
- 证据不足最多追问一次
- 手动复盘降级
- 结构化 JSON、上下文长度与额度约束

### 工程质量与架构设计（15%）

- 前端/服务端边界明确
- Key 不进入前端
- API、浏览器、响应式和历史数据回归
- 单文件前端与内存额度的取舍已说明

### 用户体验与产品精细度（15%）

- 思考状态、打字显示、失败重试、额度提示
- 响应式布局
- 候选习惯卡片
- 手动完成不阻断用户

## 5. 提交前必须完成

- [ ] 在真实 Codex 对话中截取 5 条 Prompt 证据图
- [ ] 按脚本录制 5～8 分钟、1080p MP4
- [ ] 检查视频中至少 2 分钟 AI 协同过程
- [ ] 检查视频无 API Key、邮箱和个人隐私
- [ ] 上传视频并填写最终链接
- [ ] 从全新目录克隆仓库并严格按 README 复现
- [ ] 确认 GitHub 公开可访问
- [ ] 创建并推送 `v1.0-competition` tag
