#!/usr/bin/env python3
"""Render sanitized evidence pages from the real Codex JSONL session log.

The raw session file is intentionally not copied into the repository. The
generated HTML keeps source line references and a SHA256 hash so the excerpts
can be checked against the local original.
"""
from __future__ import annotations

import argparse
import hashlib
import html
import json
import re
import subprocess
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT_DIR = ROOT / "docs" / "prompt-history" / "evidence"
DEFAULT_SESSION = Path.home() / ".codex" / "sessions" / "2026" / "10" / "18" / "rollout-2026-10-18T21-03-01-01a14f1b-c1d2-7e30-a4a7-c42450283b8e.jsonl"

CHAINS = [
    {
        "id": "02",
        "slug": "bug-fix-and-limits",
        "title": "删除习惯积分漏洞与 20 个习惯上限",
        "commit": "b2b492f",
        "commit_title": "迭代10-修复2个bug。一，删除习惯时清掉了打卡记录和连续奖励，但积分总额和流水还在；重新添加同名习惯后还能再次打卡得分。二，前端没有限制习惯数量，服务端最多处理 20 个",
        "range": [2364, 2429],
        "pages": [
            ("01-prompt", "原始问题", [2364]),
            ("02-ai-analysis", "AI 定位与修改方案", [2369, 2409]),
            ("03-implementation-test", "实际修改与回归测试", [2404, 2413]),
            ("04-verification-commit", "写回校验与提交记录", [2418, 2429]),
        ],
    },
    {
        "id": "04",
        "slug": "multimodal-evidence",
        "title": "手写口令失败后的多模态证据改造",
        "commit": "87ca801",
        "commit_title": "迭代13-经过用户使用根据用户反馈更换打卡识别方式",
        "range": [4404, 5189],
        "pages": [
            ("01-prompt-chain", "用户连续反馈与最终需求", [4404, 4425, 4486, 4503, 4584]),
            ("02-ai-analysis", "AI 诊断与多模态方案", [4559, 4589]),
            ("03-implementation-test", "接口改造、错误修复与测试", [4604, 4706, 4862, 4894, 4899]),
            ("04-verification-commit", "浏览器回归、写回与提交记录", [5115, 5120, 5159, 5189]),
        ],
    },
    {
        "id": "05",
        "slug": "conversational-coach",
        "title": "一键规划改为连续对话式 AI 教练",
        "commit": "269d715",
        "commit_title": "迭代13-优化了ai生成计划，改为可连续对话",
        "range": [5214, 5623],
        "pages": [
            ("01-prompt", "原始 Prompt 与需求澄清", [5214, 5234, 5252]),
            ("02-ai-plan", "AI 给出的实施计划", [5262]),
            ("03-implementation-test", "界面、接口与浏览器回归", [5267, 5296, 5333, 5376, 5447, 5458, 5477, 5495]),
            ("04-verification-commit", "最终检查、写回与提交记录", [5507, 5543, 5567, 5572, 5623]),
        ],
    },
]


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def sanitize(text: str) -> str:
    text = re.sub(r"(?i)c:\\users\\[^\\\r\n]+", r"C:\\Users\\<用户>", text)
    text = re.sub(r"(?i)c:/users/[^/\r\n]+", r"C:/Users/<用户>", text)
    text = re.sub(r"sk-[A-Za-z0-9_-]{8,}", "<API_KEY已隐藏>", text)
    text = re.sub(r"(?i)Authorization:\s*Bearer\s+[^\s,}]+", "Authorization: Bearer <已隐藏>", text)
    text = re.sub(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}", "<邮箱已隐藏>", text)
    text = re.sub(r"!\[[^\]]*\]\([^)]*\.(?:png|jpe?g|webp)\)", "[截图引用已移至本地比赛包]", text, flags=re.IGNORECASE)
    text = "\n".join(line.rstrip() for line in text.splitlines())
    return text.strip()


def extract_item(obj: dict, line_no: int) -> dict | None:
    payload = obj.get("payload") or {}
    kind = payload.get("type")
    text = ""
    role = ""
    if kind == "message":
        role = payload.get("role") or "unknown"
        text = " ".join(
            part.get("text") or part.get("input_text") or part.get("output_text") or ""
            for part in (payload.get("content") or [])
        )
    elif kind == "function_call_output":
        role = "tool_output"
        text = str(payload.get("output") or "")
    elif kind == "function_call":
        role = "tool_call"
        text = str(payload.get("arguments") or "")
    else:
        return None
    text = sanitize(text)
    if not text:
        return None
    return {
        "line": line_no,
        "kind": kind,
        "role": role,
        "timestamp": obj.get("timestamp") or "",
        "text": text[:5000] + ("\n\n[本页仅截取前 5000 字符，完整原文见源会话]" if len(text) > 5000 else ""),
    }


def role_label(role: str) -> str:
    return {
        "user": "用户 Prompt",
        "assistant": "Codex 回复",
        "tool_output": "工具执行结果",
        "tool_call": "工具调用",
    }.get(role, role or "记录")


def render_page(chain: dict, page_suffix: str, title: str, items: list[dict], source_name: str, source_hash: str) -> str:
    first_time = items[0]["timestamp"] if items else ""
    cards = []
    for item in items:
        role = html.escape(role_label(item["role"]))
        text = html.escape(item["text"])
        line = item["line"]
        ts = html.escape(item["timestamp"].replace("T", " ").replace("Z", " UTC"))
        cards.append(
            f'<article class="entry {html.escape(item["role"])}">'
            f'<div class="entry-head"><span class="role">{role}</span><span class="meta">源日志第 {line} 行 · {ts}</span></div>'
            f'<pre>{text}</pre></article>'
        )
    commit = html.escape(chain["commit"])
    commit_title = html.escape(chain["commit_title"])
    return f'''<section class="evidence-page" data-page="{html.escape(chain["id"] + "-" + page_suffix)}">
  <header>
    <div class="kicker">真实 Codex 会话导出页 · 隐私已清理</div>
    <h1>Prompt 链 {html.escape(chain["id"])}：{html.escape(chain["title"])}</h1>
    <h2>{html.escape(title)}</h2>
    <div class="source-grid">
      <span><b>源文件</b>{html.escape(source_name)}</span>
      <span><b>源文件 SHA256</b><code>{source_hash}</code></span>
      <span><b>时间</b>{html.escape(first_time)}</span>
      <span><b>当前仓库对应提交</b><code>{commit}</code> {commit_title}</span>
    </div>
  </header>
  <main>{''.join(cards)}</main>
  <footer>
    <span>生成方式：从 Codex JSONL 会话记录提取并渲染，不是人工补写。</span>
    <span>已隐藏本机用户名、邮箱和疑似密钥。</span>
  </footer>
</section>'''


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--session", type=Path, default=DEFAULT_SESSION)
    args = parser.parse_args()
    session = args.session.expanduser().resolve()
    if not session.exists():
        raise SystemExit(f"找不到 Codex 会话文件：{session}")
    source_hash = sha256_file(session)
    lines = session.read_text(encoding="utf-8").splitlines()
    manifest = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "generator": "docs/prompt-history/render_evidence.py",
        "storage_policy": "截图 PNG 仅保存在本地比赛提交包，不纳入 GitHub；文字导出页和源日志哈希继续保留。",
        "source": {
            "file": session.name,
            "sha256": source_hash,
            "note": "原始会话日志未提交；截图中的源日志行号和哈希可用于核验。",
        },
        "chains": [],
    }
    pages_html = []
    for chain in CHAINS:
        chain_manifest = {
            "id": chain["id"],
            "slug": chain["slug"],
            "title": chain["title"],
            "range": chain["range"],
            "current_commit": chain["commit"],
            "commit_title": chain["commit_title"],
            "pages": [],
        }
        commit_check = subprocess.run(
            ["git", "-C", str(ROOT), "cat-file", "-t", chain["commit"]],
            capture_output=True,
            text=True,
            encoding="utf-8",
        )
        if commit_check.returncode != 0 or commit_check.stdout.strip() != "commit":
            raise SystemExit(f"当前仓库找不到提交 {chain['commit']}")
        for suffix, title, line_numbers in chain["pages"]:
            items = []
            for line_no in line_numbers:
                if line_no < 1 or line_no > len(lines):
                    raise SystemExit(f"行号超出范围：{line_no}")
                obj = json.loads(lines[line_no - 1])
                item = extract_item(obj, line_no)
                if not item:
                    raise SystemExit(f"第 {line_no} 行不是可导出的对话记录")
                items.append(item)
            page_id = f'{chain["id"]}-{suffix}'
            pages_html.append(render_page(chain, suffix, title, items, session.name, source_hash))
            chain_manifest["pages"].append({
                "id": page_id,
                "title": title,
                "source_lines": line_numbers,
                "image": f"{page_id}.png",
            })
        manifest["chains"].append(chain_manifest)

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    html_doc = f'''<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Codex 对话历史导出 · Prompt 链</title>
<style>
*{{box-sizing:border-box}} body{{margin:0;background:#e9edf5;color:#172033;font-family:"Microsoft YaHei","PingFang SC","Segoe UI",sans-serif}}
.evidence-page{{width:1440px;min-height:900px;padding:54px 64px;background:#fff;margin:0 0 32px;position:relative}}
.kicker{{display:inline-block;padding:7px 12px;border-radius:999px;background:#eef2ff;color:#4338ca;font-size:14px;font-weight:800;letter-spacing:.4px}}
h1{{font-size:34px;line-height:1.3;margin:20px 0 8px;color:#111827}} h2{{font-size:23px;margin:0 0 20px;color:#4f46e5}}
.source-grid{{display:grid;grid-template-columns:1fr 1fr;gap:10px 18px;padding:16px 18px;border:1px solid #dbe3ef;border-radius:14px;background:#f8fafc;font-size:13px;line-height:1.6}}
.source-grid span{{min-width:0}} .source-grid b{{display:block;color:#64748b;font-size:11px;margin-bottom:2px}} code{{font-family:Consolas,monospace;word-break:break-all;color:#334155}}
main{{display:flex;flex-direction:column;gap:16px;margin-top:22px}} .entry{{border:1px solid #e2e8f0;border-left:5px solid #94a3b8;border-radius:14px;background:#fff;overflow:hidden}} .entry.user{{border-left-color:#4f46e5;background:#fbfaff}} .entry.assistant{{border-left-color:#0ea5e9}} .entry.tool_output{{border-left-color:#10b981;background:#f8fffc}}
.entry-head{{display:flex;justify-content:space-between;gap:16px;padding:11px 15px;background:#f8fafc;border-bottom:1px solid #e2e8f0}} .role{{font-size:14px;font-weight:900;color:#334155}} .meta{{font-size:11px;color:#64748b}}
pre{{margin:0;padding:16px 18px;white-space:pre-wrap;word-break:break-word;font-family:"Microsoft YaHei","PingFang SC","Segoe UI",sans-serif;font-size:14px;line-height:1.75;color:#1f2937}}
footer{{display:flex;justify-content:space-between;gap:20px;margin-top:24px;padding-top:14px;border-top:1px solid #e2e8f0;color:#94a3b8;font-size:11px}}
.next{{height:0;overflow:hidden}}
</style></head><body>{''.join(pages_html)}</body></html>'''
    html_path = OUT_DIR / "evidence-export.html"
    html_path.write_text(html_doc, encoding="utf-8")
    manifest_path = OUT_DIR / "manifest.json"
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"html": str(html_path), "manifest": str(manifest_path), "pages": 12, "source_sha256": source_hash}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
