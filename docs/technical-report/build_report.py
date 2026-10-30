from pathlib import Path
from base64 import b64encode
import html

root = Path(__file__).resolve().parents[2]
shots = root / 'docs' / 'assets'

def b64(name):
    return 'data:image/png;base64,' + b64encode((shots / name).read_bytes()).decode()

chat_mobile = b64('chat-mobile-reply.png')
chat_desktop = b64('chat-desktop-conversation.png')
evidence_desktop = b64('evidence-desktop-modal.png')
shop_desktop = b64('evidence-desktop-shop.png')

css = r'''
@page { size: A4; margin: 0; }
* { box-sizing: border-box; }
:root { --ink:#0f172a; --muted:#64748b; --line:#e2e8f0; --indigo:#4f46e5; --mint:#059669; --amber:#d97706; --paper:#f8fafc; }
body { margin:0; background:#e5e7eb; color:var(--ink); font-family:"Microsoft YaHei","Aptos",sans-serif; font-size:10.5pt; line-height:1.6; }
.page { width:210mm; height:297mm; position:relative; padding:17mm 16mm 15mm; overflow:hidden; background:#fff; page-break-after:always; }
.page:last-child { page-break-after:auto; }
.page::before { content:""; position:absolute; top:0; left:0; right:0; height:5mm; background:linear-gradient(90deg,#4f46e5,#10b981,#f59e0b); }
.cover { color:white; background:radial-gradient(circle at 82% 14%,rgba(129,140,248,.28),transparent 36%),linear-gradient(145deg,#111827 0%,#1e1b4b 60%,#312e81 100%); padding:22mm 19mm 18mm; }
.cover::before { height:8mm; background:linear-gradient(90deg,#818cf8,#34d399,#fbbf24); }
.cover .eyebrow { color:#c7d2fe; letter-spacing:2px; font-size:9pt; font-weight:700; }
.cover h1 { font-size:32pt; line-height:1.14; margin:22mm 0 8mm; max-width:145mm; letter-spacing:-1px; }
.cover .subtitle { color:#e0e7ff; font-size:13pt; max-width:135mm; line-height:1.75; }
.cover .cover-meta { position:absolute; left:19mm; bottom:20mm; display:flex; gap:8mm; color:#c7d2fe; font-size:9pt; }
.cover .cover-orbit { position:absolute; right:17mm; bottom:30mm; width:56mm; height:56mm; border:1px solid rgba(255,255,255,.25); border-radius:50%; }
.cover .cover-orbit::before,.cover .cover-orbit::after { content:""; position:absolute; border-radius:50%; border:1px solid rgba(255,255,255,.18); inset:9mm; }
.cover .cover-orbit::after { inset:18mm; background:#34d399; border:0; box-shadow:0 0 30px rgba(52,211,153,.7); }
.page-header { display:flex; justify-content:space-between; align-items:flex-start; border-bottom:1px solid var(--line); padding-bottom:5mm; margin-bottom:7mm; }
.kicker { color:var(--indigo); font-size:8pt; font-weight:800; letter-spacing:1.5px; text-transform:uppercase; }
.page-title { font-size:21pt; line-height:1.25; margin:3mm 0 0; letter-spacing:-.4px; }
.page-num { color:#94a3b8; font-family:Aptos,sans-serif; font-size:9pt; }
.page-footer { position:absolute; left:16mm; right:16mm; bottom:8mm; display:flex; justify-content:space-between; border-top:1px solid var(--line); padding-top:3mm; color:#94a3b8; font-size:8pt; }
.lead { font-size:13pt; line-height:1.8; color:#334155; max-width:165mm; }
.small { font-size:9pt; color:var(--muted); }
.mono { font-family:Consolas,"Courier New",monospace; font-size:8.5pt; background:#f1f5f9; color:#334155; padding:1px 4px; border-radius:3px; }
.hero-callout { padding:8mm; border-radius:6mm; background:linear-gradient(135deg,#eef2ff,#ecfdf5); border:1px solid #c7d2fe; }
.hero-callout strong { color:var(--indigo); }
.grid-2 { display:grid; grid-template-columns:1fr 1fr; gap:5mm; }
.grid-3 { display:grid; grid-template-columns:repeat(3,1fr); gap:4mm; }
.grid-4 { display:grid; grid-template-columns:repeat(4,1fr); gap:3mm; }
.card { padding:5mm; border:1px solid var(--line); border-radius:4mm; background:#fff; }
.card h3 { margin:0 0 2.5mm; font-size:11pt; }
.card p { margin:0; font-size:9pt; color:#64748b; line-height:1.65; }
.card .number { display:inline-flex; width:8mm; height:8mm; align-items:center; justify-content:center; border-radius:50%; background:#eef2ff; color:var(--indigo); font-weight:900; font-size:9pt; margin-bottom:3mm; }
.flow { display:flex; align-items:center; justify-content:space-between; gap:2mm; margin:10mm 0; }
.flow .step { flex:1; min-height:22mm; padding:4mm 3mm; border-radius:4mm; background:#f8fafc; border:1px solid var(--line); text-align:center; font-size:9pt; font-weight:800; color:#334155; }
.flow .step em { display:block; color:var(--indigo); font-style:normal; font-size:8pt; margin-bottom:2mm; }
.arrow { color:#94a3b8; font-size:16pt; }
.diagram { margin:7mm 0; padding:7mm; border-radius:5mm; background:#f8fafc; border:1px solid #e2e8f0; }
.node { display:inline-flex; align-items:center; justify-content:center; min-height:14mm; padding:3mm 4mm; border-radius:3mm; background:#fff; border:1px solid #c7d2fe; color:#3730a3; font-size:9pt; font-weight:800; text-align:center; }
.node.green { border-color:#a7f3d0; color:#047857; background:#ecfdf5; }
.node.amber { border-color:#fde68a; color:#92400e; background:#fffbeb; }
.table { width:100%; border-collapse:collapse; margin-top:5mm; font-size:8.5pt; }
.table th { background:#f1f5f9; color:#475569; text-align:left; padding:2.5mm; border-bottom:1px solid #cbd5e1; }
.table td { padding:2.4mm; border-bottom:1px solid #e2e8f0; vertical-align:top; }
.check { color:#059669; font-weight:900; }
.warn { color:#d97706; font-weight:900; }
.shot { display:block; max-width:100%; max-height:92mm; margin:5mm auto 0; border-radius:4mm; border:1px solid #cbd5e1; box-shadow:0 4mm 10mm rgba(15,23,42,.13); }
.shot.tall { max-height:105mm; }
.caption { text-align:center; color:#94a3b8; font-size:8pt; margin-top:2mm; }
.code { margin-top:4mm; padding:4mm; border-radius:3mm; background:#0f172a; color:#dbeafe; font-family:Consolas,monospace; font-size:7.5pt; line-height:1.6; white-space:pre-wrap; }
.timeline { border-left:2px solid #c7d2fe; margin-left:4mm; padding-left:7mm; }
.timeline-item { position:relative; margin-bottom:6mm; }
.timeline-item::before { content:""; position:absolute; left:-9.5mm; top:1mm; width:4mm; height:4mm; border-radius:50%; background:var(--indigo); border:2px solid #eef2ff; }
.timeline-item b { display:block; }
.timeline-item span { color:#64748b; font-size:9pt; }
.tag { display:inline-block; padding:1mm 3mm; margin:1mm 1mm 0 0; border-radius:99px; background:#eef2ff; color:#4338ca; font-size:8pt; font-weight:700; }
.quote { padding:5mm; border-left:3px solid #818cf8; background:#f8faff; color:#334155; font-size:10pt; }
.final { display:flex; flex-direction:column; justify-content:center; height:230mm; }
.final h1 { font-size:26pt; line-height:1.35; margin:0 0 7mm; }
.final p { color:#64748b; font-size:12pt; max-width:150mm; }
'''

def page(num, kicker, title, body, cls=''):
    return f'''<section class="page {cls}"><div class="page-header"><div><div class="kicker">{kicker}</div><h2 class="page-title">{title}</h2></div><div class="page-num">AI HABIT COACH / {num:02d}</div></div>{body}<div class="page-footer"><span>AI 习惯教练 · 技术报告</span><span>{num:02d} / 19</span></div></section>'''

pages = []
pages.append(f'''<section class="page cover"><div class="eyebrow">COMPETITION TECHNICAL REPORT · 2026</div><h1>AI 习惯教练<br>与多模态证据打卡</h1><p class="subtitle">从连续对话到真实行为证据：一个可复现、可约束、可持续迭代的 AI 习惯产品。</p><div class="cover-meta"><span>技术报告</span><span>2026.10.31</span><span>AI Habit Coach</span></div><div class="cover-orbit"></div></section>''')
pages.append(page(2,'EXECUTIVE SUMMARY','作品摘要',f'''<p class="lead">很多习惯工具解决的是“如何生成计划”，却没有解决“计划进入真实生活后如何被理解、反馈和持续调整”。</p><div class="hero-callout" style="margin-top:9mm"><strong>核心定位：</strong>AI 不只是规划器，而是理解上下文、接受自由证据并持续对话的习惯教练。</div><div class="grid-3" style="margin-top:8mm"><div class="card"><span class="number">01</span><h3>连续对话</h3><p>最近 30 条消息保存在本机，真实请求携带最近 12 条真实模式上下文。</p></div><div class="card"><span class="number">02</span><h3>自由证据</h3><p>照片、文字或语音转文字均可；不要求用户手写随机口令或摆拍固定物品。</p></div><div class="card"><span class="number">03</span><h3>可信降级</h3><p>AI 不确定时追问一次；仍无法判断时可填写复盘手动完成，两种方式都获得积分。</p></div></div><div class="grid-4" style="margin-top:7mm"><div class="card"><h3>10 轮</h3><p>真实 AI 对话每日额度</p></div><div class="card"><h3>5 次</h3><p>真实证据判断每日额度</p></div><div class="card"><h3>30 条</h3><p>最近聊天记录上限</p></div><div class="card"><h3>完整</h3><p>分阶段 Git 提交与迭代记录</p></div></div>'''))
pages.append(page(3,'PROBLEM DEFINITION','问题与目标用户','''<p class="lead">习惯失败通常不是因为用户不知道目标，而是因为计划无法适配每天变化的场景。</p><div class="grid-3" style="margin-top:8mm"><div class="card"><span class="number">A</span><h3>计划与执行脱节</h3><p>计划生成一次后不会根据失败原因、完成量和生活场景继续调整。</p></div><div class="card"><span class="number">B</span><h3>打卡摩擦过高</h3><p>手写随机字符、摆拍指定物品和复杂表单都会增加放弃概率。</p></div><div class="card"><span class="number">C</span><h3>反馈缺少上下文</h3><p>普通打卡只留下一个勾选，无法说明用户真实做了什么、遇到了什么困难。</p></div></div><div class="diagram" style="margin-top:9mm"><div class="grid-3"><div class="node">备考学生</div><div class="node">职场效率</div><div class="node">运动与减脂</div><div class="node">生活规律</div><div class="node">自由职业</div><div class="node">通用入门</div></div></div><p class="small">产品不预设固定身份。AI 根据已有习惯、连续记录、积分和用户主动补充的信息，决定使用哪种中性或具体的建议。</p>'''))
pages.append(page(4,'PRODUCT LOOP','产品闭环','''<div class="flow"><div class="step"><em>01</em>连续对话</div><div class="arrow">→</div><div class="step"><em>02</em>导入建议</div><div class="arrow">→</div><div class="step"><em>03</em>留下证据</div><div class="arrow">→</div><div class="step"><em>04</em>理解反馈</div><div class="arrow">→</div><div class="step"><em>05</em>积分奖励</div></div><div class="grid-2" style="margin-top:7mm"><div class="card"><h3>AI 侧</h3><p>上下文记忆 → 证据判断 → 一次追问 → 温和反馈 → 下一步建议</p></div><div class="card"><h3>用户侧</h3><p>快速表达 → 可编辑语音文字 → 一键导入 → 可见积分 → 自定义奖励</p></div></div><div class="hero-callout" style="margin-top:9mm"><strong>关键设计：</strong>AI 不直接修改习惯列表。所有候选习惯先以卡片展示，由用户明确点击导入，保持用户控制权。</div><div class="grid-3" style="margin-top:7mm"><div class="card"><h3>入口低摩擦</h3><p>快捷问题、连续聊天和自由证据减少准备步骤。</p></div><div class="card"><h3>反馈可解释</h3><p>展示匹配证据、置信度、原因和一句具体反馈。</p></div><div class="card"><h3>失败可继续</h3><p>额度、网络或判断失败都能转入手动复盘，不丢失当天记录。</p></div></div>'''))
pages.append(page(5,'FUNCTIONAL SCOPE','功能范围与用户价值','''<table class="table"><tr><th>模块</th><th>能力</th><th>用户价值</th></tr><tr><td>AI 对话</td><td>多轮上下文、快捷问题、候选习惯、失败重试</td><td>像正常 AI 一样持续获得帮助</td></tr><tr><td>证据打卡</td><td>照片、文字、语音转文字、一次追问</td><td>用当前场景留下证据，不要求摆拍</td></tr><tr><td>积分系统</td><td>完成 +10、取消 -10、连续 7 天 +5</td><td>形成即时反馈和长期节奏</td></tr><tr><td>奖励兑换</td><td>自定义奖励、重复兑换、历史记录</td><td>把长期坚持连接到现实奖励</td></tr><tr><td>数据管理</td><td>localStorage、IndexedDB、备份恢复</td><td>无需账号也可留存本机数据</td></tr><tr><td>AI 双模式</td><td>Mock 演示 / 真实 AI，额度与错误提示</td><td>兼顾比赛演示成本与真实能力</td></tr></table><div class="hero-callout" style="margin-top:9mm"><strong>产品不是“AI 生成一份计划”，而是“AI 在清晰的用户授权和边界内，持续参与计划执行”。</strong></div><div class="grid-2" style="margin-top:8mm"><div class="card"><h3>比赛与日常兼顾</h3><p>Mock 模式可以离线展示完整流程；真实模式可以现场验证模型能力。</p></div><div class="card"><h3>真实性优先于炫技</h3><p>手写随机字符被移除，自由证据和手动降级更符合真实生活。</p></div></div>'''))
pages.append(page(6,'INNOVATION','创新价值与竞品差异','''<p class="lead">市面上的习惯产品通常只覆盖“生成计划”或“记录完成”中的一个环节。本作品的创新不是增加一个 AI 按钮，而是把 AI 放进真实执行闭环。</p><table class="table"><tr><th>常见产品形态</th><th>主要能力</th><th>本作品的差异</th></tr><tr><td>普通习惯追踪</td><td>点击完成、连续天数和提醒</td><td>AI 理解照片、文字或语音证据，反馈完成质量和场景</td></tr><tr><td>AI 计划生成器</td><td>一次性输出作息或学习计划</td><td>连续对话、候选习惯导入，并持续接收每日执行结果</td></tr><tr><td>游戏化打卡</td><td>积分、等级和奖励</td><td>积分不以单纯点击为依据，而与可解释的证据判断连接</td></tr><tr><td>拍照证明工具</td><td>固定拍摄要求或人工审核</td><td>自由表达、一次追问、手动复盘降级，不要求固定物品</td></tr></table><div class="hero-callout" style="margin-top:8mm"><strong>核心创新：</strong>从“AI 帮用户做计划”进一步走到“AI 理解执行证据并持续陪伴”，形成对话、证据、反馈和奖励的系统闭环。</div><div class="grid-4" style="margin-top:8mm"><div class="card"><h3>低摩擦</h3><p>不写随机字符，不摆拍固定物品</p></div><div class="card"><h3>可解释</h3><p>展示匹配证据、原因和置信度</p></div><div class="card"><h3>可继续</h3><p>AI 不确定时只追问一次，失败不阻断记录</p></div><div class="card"><h3>可约束</h3><p>结构化输出、上下文和额度均由服务端控制</p></div></div>'''))
pages.append(page(7,'EVOLUTION','核心迭代与问题驱动演进','''<div class="timeline"><div class="timeline-item"><b>迭代 1-3 · 基础习惯与本地持久化</b><span>空白 HTML → 习惯录入 → localStorage → 日历打卡。</span></div><div class="timeline-item"><b>迭代 4-6 · 拍照、积分与 AI 接入</b><span>照片打卡、积分商城、DeepSeek Mock/真实双模式。</span></div><div class="timeline-item"><b>迭代 7-9 · 混合识别与资金漏洞</b><span>口令 + OCR、服务端视觉、积分兑换和每日额度。</span></div><div class="timeline-item"><b>迭代 10-12 · 质量修复与意图控制</b><span>删除习惯积分扣回、20 个习惯上限、通用 AI 规划。</span></div><div class="timeline-item"><b>迭代 13 · 多模态自由证据与连续对话</b><span>手写识别失败后重新定义打卡，再改为连续 AI 教练。</span></div></div><p class="quote" style="margin-top:8mm">“每一次提交对应一个功能模块或一次真实问题修复，而不是把全部功能塞进一个 Initial commit。”</p><div class="grid-3" style="margin-top:7mm"><div class="card"><h3>发现问题</h3><p>用户真实使用、控制台错误、截图和失败路径。</p></div><div class="card"><h3>引导 AI</h3><p>给出复现条件、约束、验收标准和不可破坏的现有能力。</p></div><div class="card"><h3>验证落地</h3><p>语法检查、API 模拟、浏览器回归、Git 提交和状态文档。</p></div></div>'''))
pages.append(page(8,'INTENT CONTROL','意图控制策略','''<p class="lead">意图控制不是写更长的 Prompt，而是把“目标、约束、状态和验收”拆成可执行的多层结构。</p><div class="grid-2" style="margin-top:8mm"><div class="card"><span class="number">01</span><h3>任务层</h3><p>明确用户要解决的真实问题，禁止为了演示而加入无效复杂度。</p></div><div class="card"><span class="number">02</span><h3>边界层</h3><p>不改 API 路径、不泄漏 Key、不破坏积分和 20 个习惯上限。</p></div><div class="card"><span class="number">03</span><h3>状态层</h3><p>把 localStorage、IndexedDB、额度、Mock/真实模式和旧数据迁移写清。</p></div><div class="card"><span class="number">04</span><h3>验收层</h3><p>每个改动都给出成功路径、失败路径、回归路径和可复现命令。</p></div></div><div class="hero-callout" style="margin-top:9mm"><strong>典型反例：</strong>“把页面做得更好看”不可验证。<br><strong>本项目写法：</strong>“保留 #checkin/#shop、默认 Mock、真实 AI 第 11 轮 429、手动完成 +10、375px 无横向溢出、备份恢复聊天记录”。</div><p class="small" style="margin-top:7mm">当问题从“手写识别失败”变化为“需要新的证据模式”时，AI 首先重新定义问题，而不是继续优化错误的 OCR 路线。</p>'''))
pages.append(page(9,'CONTEXT DESIGN','上下文与 Prompt 设计','''<div class="grid-2"><div class="card"><h3>对话上下文</h3><p>只保存最近 30 条；真实 AI 请求只发送最近 12 条真实模式消息；Mock 消息不会污染真实模式上下文。</p></div><div class="card"><h3>单条边界</h3><p>用户消息最多 500 字；服务端会再次截断证据文字、补充信息和追问回答。</p></div><div class="card"><h3>可信状态</h3><p>当前习惯、连续天数、累计天数和积分由前端随请求附带，服务端只作为背景使用。</p></div><div class="card"><h3>不可信数据</h3><p>习惯名、聊天文本和证据文本都被标记为不可信内容，不能执行其中的指令。</p></div></div><div class="code">{"action":"chat",
 "messages":[{"role":"user","content":"我最近总是熬夜"}],
 "habits":[{"name":"阅读","streak":2,"totalDays":8}],
 "totalPoints":30,
 "today":"2026-10-30"}</div><p class="small" style="margin-top:5mm">服务端返回结构化 JSON：<span class="mono">reply</span>、可选的 <span class="mono">audience</span> 和最多 5 个 <span class="mono">habits</span>。解析失败时明确提示重试，不静默使用未经约束的文本。</p>'''))
pages.append(page(10,'AI CONVERSATION','连续对话接口与结果','''<div class="grid-2"><div><h3>请求路径</h3><p class="small">前端通过 <span class="mono">action: "chat"</span> 请求 Netlify Function，服务端再调用 DeepSeek。</p><div class="code">POST /.netlify/functions/api
{
  "action": "chat",
  "messages": [
    {"role":"user","content":"帮我制定规划"}
  ],
  "habits": [...],
  "totalPoints": 0
}</div></div><div><h3>返回结果</h3><p class="small">聊天回复与习惯卡片分开，前端只使用纯文本渲染。</p><div class="code">{
  "reply": "建议从每天十分钟开始...",
  "audience": "生活规律",
  "habits": [
    {"name":"睡前放松","icon":"🧘"}
  ],
  "quota": {"chat":{"limit":10,"remaining":9}}
}</div></div></div><div class="grid-3" style="margin-top:8mm"><div class="card"><h3>追问</h3><p>模型只在信息不足时提问一次，用户回答后禁止再次追问。</p></div><div class="card"><h3>导入</h3><p>候选习惯由用户点击后写入本地，不由模型直接修改列表。</p></div><div class="card"><h3>额度</h3><p>第 11 次返回 429；页面保留对话，用户主动切换 Mock。</p></div></div>'''))
pages.append(page(11,'MULTIMODAL EVIDENCE','多模态证据与追问机制','''<div class="grid-2"><div><h3>证据类型</h3><ul><li>照片：床铺、桌面、运动场景、完成结果</li><li>文字：完成数量、时间、当前状态</li><li>语音：浏览器转文字后可编辑</li></ul><p class="small">不指定固定物品，不要求用户为了打卡改变当前环境。</p><div class="grid-2" style="margin-top:5mm"><div class="card"><h3>passed</h3><p>证据与习惯直接相关</p></div><div class="card"><h3>followup</h3><p>再确认一个关键事实</p></div><div class="card"><h3>manual_only</h3><p>进入复盘手动完成</p></div><div class="card"><h3>+10 分</h3><p>AI 和手动完成都有效</p></div></div></div><div><img class="shot tall" src="{EVIDENCE}" alt="多模态证据弹窗"></div></div><p class="caption">真实界面：照片、文字、语音转文字和手动复盘入口。</p>'''.replace('{EVIDENCE}', evidence_desktop)))
pages.append(page(12,'ARCHITECTURE','系统架构与模块边界','''<div class="diagram"><div class="grid-3"><div class="node">index.html<br><span class="small">单文件前端</span></div><div class="node green">localStorage<br><span class="small">习惯 / 积分 / 聊天</span></div><div class="node green">IndexedDB<br><span class="small">照片 Blob</span></div></div><div style="text-align:center;font-size:18pt;color:#94a3b8;margin:4mm 0">↓</div><div class="node amber" style="display:block;margin:auto;width:58%">Netlify Function · api.js<br><span class="small">健康检查 / chat / evidence / 额度 / 来源限制</span></div><div style="text-align:center;font-size:18pt;color:#94a3b8;margin:4mm 0">↓</div><div class="node" style="display:block;margin:auto;width:48%">DeepSeek API<br><span class="small">文本模型 + 视觉模型</span></div></div><div class="grid-2" style="margin-top:7mm"><div class="card"><h3>为什么前端单文件</h3><p>比赛复现成本低、部署简单、无构建链；核心状态集中，便于检查。</p></div><div class="card"><h3>为什么服务端函数</h3><p>API Key 不进入浏览器；统一健康检查、额度、来源限制和错误处理。</p></div></div>'''))
pages.append(page(13,'DATA MODEL','数据模型与存储边界','''<table class="table"><tr><th>数据</th><th>存储位置</th><th>关键字段</th></tr><tr><td>习惯/积分/奖励</td><td>localStorage</td><td>habits, points.ledger, rewards.tiers</td></tr><tr><td>聊天记录</td><td>localStorage</td><td>role, content, mode, habits, importedHabits</td></tr><tr><td>证据摘要</td><td>localStorage</td><td>status, engine, confidence, matched, reason, feedback</td></tr><tr><td>原始照片</td><td>IndexedDB</td><td>日期::habitId → Blob</td></tr><tr><td>AI 额度</td><td>函数实例内存</td><td>日期 + 动作 + 客户端 IP</td></tr></table><div class="hero-callout" style="margin-top:9mm"><strong>隐私边界：</strong>原始文字、语音和音频不额外持久化；语音只在浏览器转文字。真实模式下照片会发送到模型服务，Mock 模式不发送。</div><p class="small" style="margin-top:7mm">备份导出包含习惯、打卡、积分、奖励、证据摘要、聊天历史和照片；恢复时不会恢复真实 API Key。</p>'''))
pages.append(page(14,'SECURITY','安全、密钥与额度控制','''<div class="grid-3"><div class="card"><h3>密钥</h3><p>仅存在 Netlify 环境变量和本地 `.env`；前端只调用同源函数。</p></div><div class="card"><h3>来源</h3><p>可选 ALLOWED_ORIGINS；健康检查关闭缓存。</p></div><div class="card"><h3>额度</h3><p>对话 10 次、证据 5 次；429 明确提示，不静默伪装。</p></div><div class="card"><h3>输入长度</h3><p>服务端限制聊天、证据、追问、图片大小和习惯数量。</p></div><div class="card"><h3>Prompt 注入</h3><p>用户文本标记为背景数据，不能执行其中的指令。</p></div><div class="card"><h3>历史扫描</h3><p>Git 历史未发现真实 `sk-` 密钥；`.env` 被忽略。</p></div></div><div class="quote" style="margin-top:9mm">额度计数目前是函数实例内存，适合比赛演示；正式生产应迁移到 Netlify Blobs、Redis 或数据库，避免冷启动重置。</div>'''))
pages.append(page(15,'BUG FIX','典型 Bug：删除习惯后的积分漏洞','''<div class="grid-2"><div><p class="lead">用户报告：删除习惯后，历史积分和流水仍然存在；重新添加同名习惯后还能再次得分。</p><div class="card" style="margin-top:7mm"><h3>根因拆解</h3><p>删除只清理打卡和连续奖励；旧流水没有稳定的 habitId 归属；重新添加同名习惯后，历史贡献仍可能被误算。</p></div><div class="card" style="margin-top:5mm"><h3>修复动作</h3><p>补写 habitId → 计算贡献 → 写入 delete 流水 → 最多扣到 0 → 前端限制 20 个习惯。</p></div></div><div class="card"><h3>验证结果</h3><p><span class="check">通过</span>：余额足够时扣回贡献；余额不足只扣到 0；重新添加同名习惯不恢复已扣积分；第 21 个习惯被拦截。</p><p style="margin-top:5mm"><span class="mono">commit b2b492f</span></p></div></div><div class="flow" style="margin-top:9mm"><div class="step"><em>用户反馈</em>具体复现路径</div><div class="arrow">→</div><div class="step"><em>AI 分析</em>状态与归属</div><div class="arrow">→</div><div class="step"><em>代码修改</em>扣回 + 上限</div><div class="arrow">→</div><div class="step"><em>回归验证</em>积分和习惯</div></div>'''))
pages.append(page(16,'REGRESSION','浏览器与接口回归','''<img class="shot tall" src="{CHAT}" alt="桌面端连续对话界面"><p class="caption">桌面端连续对话与习惯候选卡片：结果区不使用原始 HTML，所有用户和模型文本按纯文本渲染。</p><div class="grid-4" style="margin-top:7mm"><div class="card"><h3>多轮</h3><p>上下文与刷新恢复</p></div><div class="card"><h3>额度</h3><p>第 11 轮 429 提示</p></div><div class="card"><h3>证据</h3><p>照片/文字/语音</p></div><div class="card"><h3>响应式</h3><p>375 / 1440 无溢出</p></div></div><p class="small" style="margin-top:5mm">测试同时覆盖 Mock 无请求、失败重试、新对话取消旧请求、聊天历史上限、手动复盘、积分扣回和备份恢复。</p>'''.replace('{CHAT}', chat_desktop)))
pages.append(page(17,'REPRODUCIBILITY','可复现性论证','''<p class="lead">评委可以从空白骨架开始，按 README 在 10 分钟内完成 Mock 体验，再用环境变量开启真实 AI。</p><div class="grid-2" style="margin-top:8mm"><div class="card"><h3>Mock 路径</h3><p>Python 静态服务器 → #checkin → 快捷问题 → 习惯导入 → 文字证据 → 积分商城。</p><p class="small">无需 API Key 或 Netlify CLI，适合快速检查界面和交互。</p></div><div class="card"><h3>真实 AI 路径</h3><p>复制 .env.example → 填写 Key → netlify dev → health → 真实对话/证据。</p><p class="small">所有函数位于 netlify/functions/api.js，部署路径固定。</p></div></div><div class="grid-3" style="margin-top:8mm"><div class="card"><h3>依赖</h3><p>浏览器、Python 3.10+、Git；完整模式需 Node 20 LTS 与 Netlify CLI。</p></div><div class="card"><h3>验收</h3><p>健康接口、Mock/真实切换、连续对话、证据打卡、积分和备份。</p></div><div class="card"><h3>故障</h3><p>项目可见性、函数 404、密钥扫描、额度用完和本地数据清理。</p></div></div><p class="quote" style="margin-top:8mm">复现不是“能看到页面”，而是能解释每个数据、每个请求和每个失败路径。</p>'''))
pages.append(page(18,'LIMITATIONS','限制、风险与后续规划','''<div class="grid-2"><div class="card"><h3>当前限制</h3><p>无账号和跨设备同步；额度为进程内计数；积分仍在本机；没有真实流式输出；照片会发送到真实模型服务。</p></div><div class="card"><h3>架构取舍</h3><p>单文件前端优先解决比赛复现和部署成本；服务端函数集中权限与模型调用；正式产品应拆分模块和服务端账本。</p></div></div><div class="grid-3" style="margin-top:9mm"><div class="card"><h3>下一步 1</h3><p>将额度和积分迁移到 Netlify Blobs / Redis。</p></div><div class="card"><h3>下一步 2</h3><p>增加账号和加密同步，支持多设备。</p></div><div class="card"><h3>下一步 3</h3><p>实现真正的流式响应和可中断工具调用。</p></div></div><div class="hero-callout" style="margin-top:9mm"><strong>设计底线：</strong>AI 失败不能阻断用户完成当天记录；手动复盘必须可用；密钥和用户数据不能进入 Git。</div>'''))
pages.append(page(19,'APPENDIX','Git 提交与材料索引','''<table class="table"><tr><th>阶段</th><th>提交</th><th>说明</th></tr><tr><td>基础</td><td>8592055</td><td>空白 HTML 骨架</td></tr><tr><td>积分/AI</td><td>6eba6ef</td><td>积分商城、AI 双模式、视觉接口</td></tr><tr><td>修复</td><td>b2b492f</td><td>删除习惯积分漏洞与 20 个习惯上限</td></tr><tr><td>意图</td><td>5b6835d</td><td>通用 AI 规划与补充信息</td></tr><tr><td>证据</td><td>87ca801</td><td>多模态证据打卡</td></tr><tr><td>对话</td><td>269d715</td><td>连续对话式 AI 教练</td></tr></table><div class="grid-2" style="margin-top:8mm"><div class="card"><h3>提交材料</h3><p>README · Prompt 历史 · 技术报告 · 产品截图 · 评审导航</p></div><div class="card"><h3>验证材料</h3><p>API 测试、浏览器回归、响应式截图、Git 历史安全扫描。</p></div></div><p class="small" style="margin-top:12mm">本报告与仓库中的真实提交、截图和测试记录对应。所有产品能力与边界均以当前实现为准。</p><div style="margin-top:25mm;text-align:center"><div class="tag">连续对话</div><div class="tag">多模态证据</div><div class="tag">意图控制</div><div class="tag">可复现</div><p style="margin-top:10mm;color:#4f46e5;font-weight:900;font-size:16pt">AI Habit Coach · 2026</p></div>'''))

full = '<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>AI Habit Coach Technical Report</title><style>' + css + '</style></head><body>' + ''.join(pages) + '</body></html>'
out = root / 'docs' / 'technical-report' / 'report.html'
out.write_text(full, encoding='utf-8')
print(out, out.stat().st_size)


