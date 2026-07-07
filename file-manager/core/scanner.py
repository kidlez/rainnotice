"""
文件扫描总结模块
"""
from pathlib import Path
from typing import List, Dict, Any, Optional
from datetime import datetime
import os


def get_file_summary(file_path: Path) -> Optional[Dict[str, Any]]:
    """获取单个文件的总结信息"""
    if not file_path.is_file():
        return None

    try:
        stat = file_path.stat()
        text = file_path.read_text(encoding="utf-8", errors="ignore")
    except Exception:
        text = ""

    lines = text.splitlines()
    non_empty = [l for l in lines if l.strip()]
    line_count = len(lines)

    # 提取第一行作为标题/描述
    heading = ""
    for l in lines:
        l = l.strip()
        if l.startswith("#"):
            heading = l.lstrip("#").strip()
            break
        elif l.startswith("//") or l.startswith("--"):
            heading = l[2:].strip()
            break
        elif l.startswith("/*"):
            heading = l[2:].strip().rstrip("*/").strip()
            break

    return {
        "path": str(file_path),
        "name": file_path.name,
        "suffix": file_path.suffix,
        "size_bytes": stat.st_size,
        "size_human": _format_size(stat.st_size),
        "line_count": line_count,
        "non_empty_lines": len(non_empty),
        "modified": datetime.fromtimestamp(stat.st_mtime).isoformat(),
        "created": datetime.fromtimestamp(stat.st_ctime).isoformat(),
        "heading": heading or "",
        "preview": "\n".join(lines[:5]) if line_count > 0 else "(空文件)",
    }


def _format_size(size: int) -> str:
    for unit in ("B", "KB", "MB", "GB"):
        if size < 1024:
            return f"{size:.1f}{unit}"
        size /= 1024
    return f"{size:.1f}TB"


def scan_directory(
    directory: Path,
    recursive: bool = False,
    extensions: Optional[List[str]] = None,
) -> List[Dict[str, Any]]:
    """扫描目录，返回所有文件总结列表"""
    results: List[Dict[str, Any]] = []
    if not directory.is_dir():
        return results

    if recursive:
        iterator = directory.rglob("*")
    else:
        iterator = directory.glob("*")

    for f in sorted(iterator):
        if not f.is_file():
            continue
        if extensions and f.suffix.lower() not in extensions:
            continue
        summary = get_file_summary(f)
        if summary:
            results.append(summary)

    return results


def generate_report(directory: Path, recursive: bool = False, extensions: Optional[List[str]] = None) -> str:
    """生成目录文件的文本报告"""
    files = scan_directory(directory, recursive, extensions)
    if not files:
        return f"目录 '{directory}' 中未找到文件。"

    lines = [f"===== 文件总结报告: {directory} =====", ""]
    lines.append(f"共找到 {len(files)} 个文件")
    lines.append("")

    total_size = 0
    ext_count: Dict[str, int] = {}

    for f in files:
        total_size += f["size_bytes"]
        ext = f["suffix"] or "(无后缀)"
        ext_count[ext] = ext_count.get(ext, 0) + 1
        lines.append(f"  [{f['name']}]")
        lines.append(f"    路径: {f['path']}")
        lines.append(f"    大小: {f['size_human']}  ({f['size_bytes']} 字节)")
        lines.append(f"    行数: {f['line_count']}  (有效: {f['non_empty_lines']})")
        lines.append(f"    修改: {f['modified']}")
        if f['heading']:
            lines.append(f"    标题: {f['heading']}")
        lines.append("")

    lines.append(f"总大小: {_format_size(total_size)}")
    lines.append("文件类型统计:")
    for ext, count in sorted(ext_count.items(), key=lambda x: -x[1]):
        lines.append(f"  {ext}: {count} 个")

    return "\n".join(lines)
