"""
File Manager CLI —— 文件总结、安全拦截、统计、TODO 批注管理
"""
import argparse
import sys
from pathlib import Path

from core.security import intercept_input, intercept_file, SecurityIntercept
from core.scanner import scan_directory, generate_report, get_file_summary
from core.stats import count_file_types, list_file_paths, get_stats_report
from core.todo_parser import (
    scan_annotations,
    scan_directory_annotations,
    annotate_fix,
    generate_annotation_report,
    Annotation,
)
from core.config import settings


def _intercept_all(text: str, file_path: Path = None):
    """统一安全拦截"""
    try:
        intercept_input(text)
    except SecurityIntercept:
        raise
    if file_path:
        intercept_file(file_path)


def cmd_summary(args):
    """文件总结"""
    path = Path(args.path)
    _intercept_all("summary " + str(path))
    if not path.exists():
        print(f"错误: 路径不存在: {path}")
        return 1

    if path.is_file():
        s = get_file_summary(path)
        if not s:
            print("无法读取文件")
            return 1
        print(f"文件: {s['name']}")
        print(f"路径: {s['path']}")
        print(f"大小: {s['size_human']} ({s['size_bytes']} 字节)")
        print(f"行数: {s['line_count']} (有效: {s['non_empty_lines']})")
        print(f"修改时间: {s['modified']}")
        if s.get("heading"):
            print(f"标题: {s['heading']}")
        print(f"预览: {s['preview']}")
    else:
        report = generate_report(path, recursive=args.recursive, extensions=args.extensions)
        print(report)
    return 0


def cmd_stats(args):
    """文件类型统计"""
    path = Path(args.path)
    _intercept_all("stats " + str(path))
    if not path.is_dir():
        print(f"错误: 目录不存在: {path}")
        return 1

    if args.paths_only:
        files = list_file_paths(path, recursive=args.recursive, pattern=args.pattern)
        print(f"共 {len(files)} 个文件:")
        for f in files:
            print(f"  {f}")
    else:
        report = get_stats_report(path, recursive=args.recursive, pattern=args.pattern)
        print(report)
    return 0


def cmd_todo(args):
    """TODO 批注管理"""
    path = Path(args.path)
    _intercept_all("todo " + str(path))

    if args.fix:
        # 修复指定注释
        line_no = args.line or 1
        if path.is_file():
            annotations = scan_annotations(path)
        else:
            annotations = scan_directory_annotations(path, recursive=args.recursive)

        target = None
        for a in annotations:
            if a.line == line_no or (args.keyword and args.keyword in a.text):
                target = a
                break
        if not target and annotations:
            target = annotations[0]

        if not target:
            print("未找到匹配的注释")
            return 1

        success = annotate_fix(path if path.is_file() else Path(target.file_path), target, args.fix)
        if success:
            print(f"已修复: {target.file_path}:{target.line}")
        else:
            print("修复失败")
        return 0

    # 查看注释
    if path.is_file():
        annotations = scan_annotations(path)
        print(f"文件: {path}")
    else:
        annotations = scan_directory_annotations(path, recursive=args.recursive)
        print(generate_annotation_report(path, recursive=args.recursive))
        return 0

    if not annotations:
        print("未发现注释")
        return 0

    for ann in annotations:
        print(f"  [{ann.priority.upper()}] {ann.file_path}:{ann.line}")
        print(f"    {ann.kind}: {ann.text}")
    return 0


def cmd_config(args):
    """配置管理"""
    if args.set_target:
        path = settings.set_target_directory(args.set_target)
        print(f"目标目录已设置为: {path}")
        print(f"提示: 该目录可安全存储和读取密码信息")
    elif args.show:
        print(f"当前工作目录: {Path.cwd()}")
        print(f"目标目录: {settings.target_directory or '未设置'}")
        print(f"允许目录: {settings.allowed_dirs}")
    return 0


def cmd_scan(args):
    """扫描目录（带安全拦截）"""
    path = Path(args.path)
    _intercept_all("scan " + str(path))
    if not path.exists():
        print(f"错误: 路径不存在: {path}")
        return 1

    if path.is_file():
        try:
            intercept_file(path)
        except SecurityIntercept as e:
            print(f"⛔ {e}")
            return 1
        summary = get_file_summary(path)
        if summary:
            print(f"文件: {summary['name']}")
            print(f"路径: {summary['path']}")
            print(f"大小: {summary['size_human']}")
            print(f"行数: {summary['line_count']}")
    else:
        files = scan_directory(path, recursive=args.recursive)
        for f in files:
            fp = Path(f["path"])
            try:
                intercept_file(fp)
            except SecurityIntercept as e:
                print(f"⛔ 已跳过 (安全拦截): {f['name']} - {e}")
        print(generate_report(path, recursive=args.recursive))
    return 0


def main():
    parser = argparse.ArgumentParser(
        description="File Manager - 文件总结、安全拦截、统计、TODO管理",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
用例:
  fm summary .                    # 总结当前目录
  fm summary main.py              # 总结单个文件
  fm stats .                      # 文件类型统计
  fm stats . --recursive          # 递归统计
  fm stats . --paths-only         # 仅列出路径
  fm todo .                       # 查看 TODO 注释
  fm todo . --fix "DONE: done"    # 修复注释
  fm scan .                       # 带安全拦截的扫描
  fm config --set-target ./safe   # 设置密码安全目录
  fm config --show                # 查看配置
        """
    )

    sub = parser.add_subparsers(dest="command")

    # summary
    p_summary = sub.add_parser("summary", help="文件总结")
    p_summary.add_argument("path", default=".", nargs="?", help="文件或目录路径")
    p_summary.add_argument("-r", "--recursive", action="store_true", help="递归子目录")
    p_summary.add_argument("-e", "--extensions", nargs="*", help="文件扩展名过滤 (如 .py .md)")
    p_summary.set_defaults(func=cmd_summary)

    # stats
    p_stats = sub.add_parser("stats", help="文件类型统计")
    p_stats.add_argument("path", default=".", nargs="?", help="目录路径")
    p_stats.add_argument("-r", "--recursive", action="store_true", help="递归子目录")
    p_stats.add_argument("--paths-only", action="store_true", help="仅输出文件路径")
    p_stats.add_argument("--pattern", help="文件名过滤")
    p_stats.set_defaults(func=cmd_stats)

    # todo
    p_todo = sub.add_parser("todo", help="TODO/FIXME 批注管理")
    p_todo.add_argument("path", default=".", nargs="?", help="文件或目录路径")
    p_todo.add_argument("-r", "--recursive", action="store_true", help="递归子目录")
    p_todo.add_argument("--fix", help="修复注释内容 (替换文本)")
    p_todo.add_argument("--line", type=int, help="指定行号")
    p_todo.add_argument("--keyword", help="关键词搜索")
    p_todo.set_defaults(func=cmd_todo)

    # config
    p_config = sub.add_parser("config", help="配置管理")
    p_config.add_argument("--set-target", help="设置密码安全目标目录")
    p_config.add_argument("--show", action="store_true", help="查看当前配置")
    p_config.set_defaults(func=cmd_config)

    # scan (with security intercept)
    p_scan = sub.add_parser("scan", help="带安全拦截的文件扫描")
    p_scan.add_argument("path", default=".", nargs="?", help="文件或目录路径")
    p_scan.add_argument("-r", "--recursive", action="store_true", help="递归子目录")
    p_scan.add_argument("--no-intercept", action="store_true", help="跳过安全拦截")
    p_scan.set_defaults(func=cmd_scan)

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        return 0

    try:
        return args.func(args)
    except SecurityIntercept as e:
        print(f"⛔ 安全拦截: {e}")
        return 1
    except Exception as e:
        print(f"错误: {e}")
        return 1


if __name__ == "__main__":
    sys.exit(main())
