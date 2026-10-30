# 技术报告源文件

生成的 PDF 不进入 Git 仓库，作为独立提交材料保存在本机。

本目录保留可编辑源文件：

```text
build_report.py    生成带内嵌截图的 report.html
report.html        19 页 A4 技术报告源文件
```

## 重新生成 HTML

```bash
cd docs/technical-report
python build_report.py
```

`build_report.py` 从 `docs/assets/` 读取产品截图，并以内嵌 Base64 方式写入 HTML。

## 重新打印 PDF

在 Windows PowerShell 中运行：

```powershell
$chrome='C:\Program Files\Google\Chrome\Application\chrome.exe'
$html=(Resolve-Path '.\report.html').Path.Replace('\','/')
& $chrome --headless=new --no-sandbox --disable-gpu --print-to-pdf='..\..\..\提交材料\AI习惯教练_技术报告_20261031.pdf' --no-pdf-header-footer ('file:///' + $html)
```

## 验收

- 页数：19 页，小于比赛要求的 30 页
- 页面：A4 纵向
- 检查项：每页 `.page` 的 `scrollHeight` 不超过 `clientHeight`
- 截图：使用当前连续对话版真实产品界面
- PDF 中不包含 API Key 或 `.env` 内容


