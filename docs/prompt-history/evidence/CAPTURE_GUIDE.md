# Prompt 证据截图指南

## 建议截图顺序

1. 打开对应的 Codex 对话。
2. 截图包含用户 Prompt 和 AI 开始的回复。
3. 向下滚动，截图 AI 的修改方案、实际工具操作和测试结果。
4. 如果对话支持导出，保留 Markdown/JSON/HTML 导出文件。
5. 将文件命名为：

```text
01-codex.png
02-codex.png
03-codex.png
04-codex.png
05-codex.png
```

## 录屏要求

比赛要求至少 3 个核心 Prompt 链，建议最终演示视频额外录制 2 分钟以上真实交互：

- 输入 Prompt
- AI 读取项目
- AI 修改文件
- 运行测试
- 发现 Bug
- 根据错误继续修复
- 展示 Git commit

## 隐私遮挡

必须遮挡：

```text
.env 文件内容
sk- 开头的 Key
Authorization: Bearer ...
个人邮箱、手机号、学校外隐私
```

建议使用视频编辑器的模糊/马赛克功能，不要只裁切到屏幕外，因为观众仍可能看到旁边窗口。

## 当前状态

仓库只包含文字历史与实际代码证据；截图和录屏需要由本机 Codex 对话界面补充后再提交。
