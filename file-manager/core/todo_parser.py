"""
TODO / FIXME / HACK / XXX 批注解析与修复工具
"""
import re
from pathlib import Path
from typing import List, Dict, Any, Optional
from dataclasses import dataclass


@dataclass
class Annotation:
    kind: str        # TODO, FIXME, HACK, XXX, NOTE
    text: str        # 注释内容
    file_path: str   # 源文件路径
    line: int        # 行号
    line_content: str  # 完整行内容
    priority: str    # high / medium / low


# 匹配常见编程语言中的注释标记
ANNOTATION_PATTERNS = {
    "TODO": re.compile(r'#\s*TODO\b[:\s]*(.*)', re.IGNORECASE),
    "FIXME": re.compile(r'#\s*FIXME\b[:\s]*(.*)', re.IGNORECASE),
    "HACK": re.compile(r'#\s*HACK\b[:\s]*(.*)', re.IGNORECASE),
    "XXX": re.compile(r'#\s*XXX\b[:\s]*(.*)', re.IGNORECASE),
    "NOTE": re.compile(r'#\s*NOTE\b[:\s]*(.*)', re.IGNORECASE),
    "TODO_MD": re.compile(r'-\s*\[.\]\s*(.*)', re.IGNORECASE),
    "TODO_INLINE": re.compile(r'(?://|--|<!--)\s*TODO\b[:\s]*(.*)', re.IGNORECASE),
    "FIXME_INLINE": re.compile(r'(?://|--|<!--)\s*FIXME\b[:\s]*(.*)', re.IGNORECASE),
}


def scan_annotations(file_path: Path) -> List[Annotation]:
    """扫描单个文件中的 TODO/FIXME 等注释"""
    if not file_path.is_file():
        return []

    try:
        text = file_path.read_text(encoding="utf-8", errors="ignore")
    except Exception:
        return []

    results: List[Annotation] = []
    for line_no, line in enumerate(text.splitlines(), 1):
        for kind, pattern in ANNOTATION_PATTERNS.items():
            match = pattern.search(line)
            if match:
                text_content = match.group(1).strip() if match.group(1) else ""
                priority = _guess_priority(kind, text_content)
                results.append(Annotation(
                    kind=kind.replace("_MD", "").replace("_INLINE", ""),
                    text=text_content,
                    file_path=str(file_path),
                    line=line_no,
                    line_content=line.strip(),
                    priority=priority,
                ))
                break

    return results


def _guess_priority(kind: str, text: str) -> str:
    if kind in ("FIXME", "FIXME_INLINE") or "urgent" in text.lower() or "critical" in text.lower():
        return "high"
    if kind in ("HACK", "XXX") or "重要" in text:
        return "medium"
    return "low"


def scan_directory_annotations(
    directory: Path,
    recursive: bool = False,
    min_priority: str = "low",
) -> List[Annotation]:
    """扫描目录中所有文件的注释"""
    all_annotations: List[Annotation] = []

    if not directory.is_dir():
        return all_annotations

    iterator = directory.rglob("*") if recursive else directory.glob("*")
    priority_order = {"high": 0, "medium": 1, "low": 2}

    for f in sorted(iterator):
        if not f.is_file():
            continue
        try:
            annotations = scan_annotations(f)
            for ann in annotations:
                if priority_order.get(ann.priority, 2) >= priority_order.get(min_priority, 2):
                    all_annotations.append(ann)
        except Exception:
            continue

    return all_annotations


def annotate_fix(file_path: Path, annotation: Annotation, fixed_text: str) -> bool:
    """修复指定行的注释内容"""
    if not file_path.is_file():
        return False

    try:
        lines = file_path.read_text(encoding="utf-8").splitlines(keepends=True)
    except Exception:
        return False

    if annotation.line < 1 or annotation.line > len(lines):
        return False

    old_line = lines[annotation.line - 1]
    new_line = old_line.replace(annotation.line_content, fixed_text)
    if new_line == old_line:
        return False

    lines[annotation.line - 1] = new_line
    try:
        file_path.write_text("".join(lines), encoding="utf-8")
        return True
    except Exception:
        return False


def generate_annotation_report(directory: Path, recursive: bool = False) -> str:
    """生成 TODO 注释报告"""
    annotations = scan_directory_annotations(directory, recursive)
    if not annotations:
        return f"目录 '{directory}' 中未发现 TODO/FIXME 注释。"

    # 按优先级分组
    groups: Dict[str, List[Annotation]] = {"high": [], "medium": [], "low": []}
    for ann in annotations:
        groups[ann.priority].append(ann)

    lines = [f"===== TODO/FIXME 注释报告: {directory} =====", ""]
    lines.append(f"共找到 {len(annotations)} 处注释")
    lines.append("")

    for priority_name in ("high", "medium", "low"):
        items = groups[priority_name]
        if not items:
            continue
        lines.append(f"--- [{priority_name.upper()}] ({len(items)} 处) ---")
        for ann in items:
            lines.append(f"  {ann.file_path}:{ann.line}")
            lines.append(f"    [{ann.kind}] {ann.text or '(空)'}")
            lines.append(f"    原文: {ann.line_content}")
            lines.append("")

    return "\n".join(lines)
