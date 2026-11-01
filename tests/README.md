# RC4 回归测试

```powershell
node tests\api_rc4.js
node tests\browser_rc4.js
node tests\capture_product.js
```

- `api_rc4.js`：验证周复盘独立额度、结构化输出和第 3 次 429。
- `browser_rc4.js`：验证断签恢复、打卡反馈、Mock 周复盘、真实错误路径、额度提示、存储和响应式布局。
- `capture_product.js`：在本地 `docs/assets` 生成闭环产品截图；图片已被 `.gitignore` 排除，不上传 GitHub。
