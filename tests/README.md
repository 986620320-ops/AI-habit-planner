# 回归测试

完整复现：

```powershell
npm ci
npm run reproduce
```

分别执行：

```powershell
npm run check
npm run test:core
npm run test:browser
```

- `api_rc4.js`：验证周复盘独立额度、结构化输出和第 3 次 429。
- `chat_rc4.js`：验证连续规划上下文、Flash/Pro 混合路由、JSON 模式降级、纯文本兼容和 Pro→Flash 故障降级。
- `quota_rc4.js`：验证持久化额度适配器、第 11 次限流、全站预算、分钟限频和内存降级。
- `chat_browser_rc4.js`：验证跨模式历史、方案面板、V1 采用导入、10 轮进度、证据说明合并和手机端布局。
- `browser_rc4.js`：验证断签恢复、打卡反馈、Mock 周复盘、真实错误路径、额度提示、存储和响应式布局。
- `ui_compact_rc5.js`：验证帮助弹窗、折叠交互、自动周复盘和移动端溢出。

浏览器回归使用 `ws@8.23.0` 连接 Chrome DevTools Protocol，因此 Node.js 20.18.0 无需依赖实验性的全局 WebSocket。
- `capture_product.js`：在本地 `docs/assets` 生成闭环产品截图；图片已被 `.gitignore` 排除，不上传 GitHub。

浏览器测试默认自动查找 Chrome 或 Edge。如未找到，请设置 `CHROME_PATH`：

```powershell
$env:CHROME_PATH = 'C:\Program Files\Google\Chrome\Application\chrome.exe'
npm run test:browser
```

macOS / Linux：

```bash
CHROME_PATH=/usr/bin/google-chrome npm run test:browser
```
