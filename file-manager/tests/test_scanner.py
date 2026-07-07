"""
文件扫描总结测试
"""
from core.scanner import get_file_summary, scan_directory, generate_report


class TestFileSummary:
    def test_summary_text_file(self, sample_files):
        summary = get_file_summary(sample_files / "readme.md")
        assert summary is not None
        assert summary["name"] == "readme.md"
        assert summary["suffix"] == ".md"
        assert summary["line_count"] == 3
        assert summary["size_bytes"] > 0

    def test_summary_python_file(self, sample_files):
        summary = get_file_summary(sample_files / "main.py")
        assert summary is not None
        assert summary["name"] == "main.py"
        assert summary["line_count"] == 6

    def test_summary_empty_file(self, sample_files):
        summary = get_file_summary(sample_files / "empty.txt")
        assert summary is not None
        assert summary["line_count"] == 0
        assert summary["preview"] == "(空文件)"

    def test_non_existent_file(self, sample_files):
        summary = get_file_summary(sample_files / "nonexistent.txt")
        assert summary is None

    def test_summary_heading(self, sample_files):
        summary = get_file_summary(sample_files / "readme.md")
        assert "Hello" in summary["heading"]


class TestScanDirectory:
    def test_scan_non_recursive(self, sample_files):
        results = scan_directory(sample_files, recursive=False)
        assert len(results) == 5  # 5 files in temp_dir

    def test_scan_with_extensions_filter(self, sample_files):
        results = scan_directory(sample_files, extensions=[".md"])
        assert len(results) == 2  # readme.md + notes.md

    def test_scan_recursive(self, sample_files):
        sub = sample_files / "sub"
        sub.mkdir()
        (sub / "deep.txt").write_text("deep file\n")
        results = scan_directory(sample_files, recursive=True)
        assert len(results) == 6  # 5 + 1 deep file

    def test_scan_empty_dir(self, temp_dir):
        results = scan_directory(temp_dir)
        assert results == []


class TestGenerateReport:
    def test_report_contains_file_names(self, sample_files):
        report = generate_report(sample_files)
        assert "readme.md" in report
        assert "main.py" in report
        assert "文件类型统计" in report

    def test_report_empty_dir(self, temp_dir):
        report = generate_report(temp_dir)
        assert "未找到文件" in report
