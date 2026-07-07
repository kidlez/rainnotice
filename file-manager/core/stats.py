"""
文件类型统计模块
"""
from pathlib import Path
from typing import Dict, List, Tuple, Optional
from collections import Counter


def count_file_types(
    directory: Path,
    recursive: bool = False,
) -> Dict[str, int]:
    """统计目录中各文件类型的数量"""
    counter: Counter = Counter()

    if not directory.is_dir():
        return {}

    if recursive:
        iterator = directory.rglob("*")
    else:
        iterator = directory.glob("*")

    for f in iterator:
        if not f.is_file():
            continue
        ext = f.suffix.lower() if f.suffix else "(无后缀)"
        counter[ext] += 1

    return dict(counter.most_common())


def list_file_paths(
    directory: Path,
    recursive: bool = False,
    pattern: Optional[str] = None,
) -> List[Path]:
    """列出目录中所有文件的路径"""
    if not directory.is_dir():
        return []

    if recursive:
        iterator = directory.rglob("*")
    else:
        iterator = directory.glob("*")

    files = sorted(f for f in iterator if f.is_file())

    if pattern:
        files = [f for f in files if pattern.lower() in f.name.lower() or pattern.lower() in str(f).lower()]

    return files


def get_stats_report(
    directory: Path,
    recursive: bool = False,
    pattern: Optional[str] = None,
) -> str:
    """生成文件统计报告"""
    files = list_file_paths(directory, recursive, pattern)
    if not files:
        return f"目录 '{directory}' 中未找到文件。"

    type_counts = count_file_types(directory, recursive)

    lines = [f"===== 文件统计: {directory} =====", ""]
    lines.append(f"文件总数: {len(files)}")
    lines.append("")

    lines.append("文件类型分布:")
    for ext, count in type_counts.items():
        pct = count / len(files) * 100
        bar = "█" * int(pct / 5) + "░" * (20 - int(pct / 5))
        lines.append(f"  {ext:>12}: {count:>4} 个 ({pct:5.1f}%)  {bar}")
    lines.append("")

    lines.append("文件路径列表:")
    for f in files:
        rel = f.relative_to(directory) if f.is_relative_to(directory) else f
        size = f.stat().st_size if f.is_file() else 0
        lines.append(f"  {rel}  ({_format_size(size)})")

    return "\n".join(lines)


def _format_size(size: int) -> str:
    for unit in ("B", "KB", "MB", "GB"):
        if size < 1024:
            return f"{size:.1f}{unit}"
        size /= 1024
    return f"{size:.1f}TB"
