# 技术报告源文件

技术报告 PDF、产品截图和生成版 `report.html` 不纳入 GitHub，统一保存在独立比赛提交包。

本目录保留生成脚本：

```text
build_report.py    生成带本地截图的 report.html
render_pdf.js      将 report.html 打印为 PDF
```

## 重新生成

先在本地准备 `docs/assets/` 产品截图，再运行：

```powershell
python -X utf8 docs\technical-report\build_report.py
node docs\technical-report\render_pdf.js
```

生成文件：

- `docs/technical-report/report.html`：本地预览，已被 `.gitignore` 排除。
- `docs/technical-report/AI习惯教练_技术报告.pdf`：独立提交材料，不提交 GitHub。

## 验收

- 页数：26 页，小于比赛要求的 30 页
- 页面：A4 纵向
- 检查项：每页 `.page` 的 `scrollHeight` 不超过 `clientHeight`
- 截图：连续对话、打卡反馈、断签恢复与每周复盘
- PDF 中不包含 API Key 或 `.env` 内容
