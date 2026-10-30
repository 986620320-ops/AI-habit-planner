# 评审导航

- **作品名称**：AI 习惯教练与多模态证据打卡
- **在线演示**：https://ai-habit-demo.netlify.app/
- **代码仓库**：https://github.com/986620320-ops/AI-habit-planner
- **当前版本**：v1.0.0-rc1

## 核心材料

| 材料 | 位置 |
|---|---|
| 产品介绍与复现指南 | [README.md](../README.md) |
| 技术报告 PDF | [AI_Habit_Coach_Technical_Report.pdf](AI_Habit_Coach_Technical_Report.pdf) |
| AI 协同开发记录 | [prompt-history/README.md](prompt-history/README.md) |
| 产品截图 | [assets/README.md](assets/README.md) |
| 技术报告源文件 | [technical-report/README.md](technical-report/README.md) |

## 评分维度对照

### 过程可复现性与演进链路

- 完整保留从空白骨架到当前版本的细粒度 Git 提交
- 5 条核心 AI 迭代均包含 Prompt、修改、Bug 修复、验证和对应提交
- README 提供 Mock 与真实 AI 两条复现路径

### 解题有效性与实用价值

- 连续对话、证据打卡、积分兑换形成完整闭环
- 不要求手写随机字符，不强制固定拍摄物品
- 同时支持比赛演示和低成本日常使用

### 方法创新性与意图控制

- AI 结合当前习惯、积分和最近对话持续回答
- 多模态自由证据、一次追问和手动复盘降级
- 结构化 JSON、上下文长度、输入限制和每日额度

### 工程质量与架构设计

- 单文件前端便于复现，Netlify Function 统一管理模型调用
- API Key 仅存在服务端环境变量
- API、浏览器、响应式、备份恢复和错误路径均有回归测试

### 用户体验与产品精细度

- 思考状态、逐字显示、失败重试和额度提示
- 手机与桌面响应式布局
- 候选习惯卡片和即时积分反馈

## 关键提交

| 阶段 | Commit | 价值 |
|---|---|---|
| 空白骨架 | `8fa1b60`、`8592055` | 分阶段开发的起点 |
| 习惯与日历 | `5f2b029`、`93c6ef5`、`9130a66` | 基础数据闭环 |
| 积分与商城 | `6885726`、`6eba6ef` | 反馈和奖励 |
| AI 接入 | `2f25cbc`、`704c473` | Mock/真实模式和隐私隔离 |
| Bug 修复 | `b2b492f` | 删除习惯积分漏洞和数量上限 |
| 意图控制 | `5b6835d` | 通用规划和补充信息 |
| 多模态证据 | `87ca801` | 替代手写口令失败方案 |
| 连续对话 | `269d715` | AI 习惯教练 |
| 作品简介 | `6efa050` | 产品定位说明 |
