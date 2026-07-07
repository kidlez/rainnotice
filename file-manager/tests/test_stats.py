"""
文件类型统计测试
"""
from core.stats import count_file_types, list_file_paths, get_stats_report


class TestCountFileTypes:
    def test_count_types(self, sample_files):
        counts = count_file_types(sample_files)
        assert counts.get(".md", 0) == 2
        assert counts.get(".py", 0) == 1
        assert counts.get(".json", 0) == 1

    def test_empty_dir(self, temp_dir):
        counts = count_file_types(temp_dir)
        assert counts == {}

    def test_count_recursive(self, sample_files):
        sub = sample_files / "sub"
        sub.mkdir()
        (sub / "extra.py").write_text("x=1\n")
        counts = count_file_types(sample_files, recursive=True)
        assert counts.get(".py", 0) == 2  # main.py + extra.py


class TestListFilePaths:
    def test_list_all(self, sample_files):
        paths = list_file_paths(sample_files)
        assert len(paths) == 5

    def test_list_with_pattern(self, sample_files):
        paths = list_file_paths(sample_files, pattern="main")
        assert len(paths) == 1
        assert "main.py" in str(paths[0])

    def test_list_recursive(self, sample_files):
        sub = sample_files / "sub"
        sub.mkdir()
        (sub / "sub.txt").write_text("test\n")
        paths = list_file_paths(sample_files, recursive=True)
        assert len(paths) == 6

    def test_empty_dir(self, temp_dir):
        paths = list_file_paths(temp_dir)
        assert paths == []


class TestStatsReport:
    def test_report_contains_stats(self, sample_files):
        report = get_stats_report(sample_files)
        assert "文件总数" in report
        assert "文件类型分布" in report
        assert "文件路径列表" in report
        assert ".md" in report
        assert ".py" in report

    def test_report_empty(self, temp_dir):
        report = get_stats_report(temp_dir)
        assert "未找到文件" in report
