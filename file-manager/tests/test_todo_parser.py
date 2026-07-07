"""
TODO 批注解析测试
"""
from core.todo_parser import (
    scan_annotations,
    scan_directory_annotations,
    annotate_fix,
    generate_annotation_report,
    Annotation,
)


class TestScanAnnotations:
    def test_scan_todo_python(self, sample_files):
        f = sample_files / "main.py"
        annotations = scan_annotations(f)
        assert len(annotations) >= 1
        assert any(a.kind == "TODO" for a in annotations)

    def test_scan_todo_markdown(self, sample_files):
        f = sample_files / "notes.md"
        annotations = scan_annotations(f)
        kinds = [a.kind for a in annotations]
        assert "TODO" in kinds

    def test_scan_empty_file(self, sample_files):
        f = sample_files / "empty.txt"
        annotations = scan_annotations(f)
        assert annotations == []

    def test_scan_nonexistent_file(self, temp_dir):
        annotations = scan_annotations(temp_dir / "nope.txt")
        assert annotations == []

    def test_scan_has_line_numbers(self, sample_files):
        f = sample_files / "readme.md"
        annotations = scan_annotations(f)
        if annotations:
            assert annotations[0].line > 0
            assert annotations[0].file_path == str(f)

    def test_priority_high_for_fixme(self, sample_files):
        f = sample_files / "notes.md"
        annotations = scan_annotations(f)
        fixmes = [a for a in annotations if a.kind == "FIXME"]
        if fixmes:
            assert fixmes[0].priority == "high"


class TestScanDirectoryAnnotations:
    def test_scan_all_files(self, sample_files):
        annotations = scan_directory_annotations(sample_files)
        assert len(annotations) >= 4  # TODO in main.py, readme.md, notes.md

    def test_scan_recursive(self, sample_files):
        sub = sample_files / "sub"
        sub.mkdir()
        (sub / "sub.py").write_text("# TODO: sub task\n")
        annotations = scan_directory_annotations(sample_files, recursive=True)
        assert any("sub.py" in a.file_path for a in annotations)


class TestAnnotateFix:
    def test_fix_annotation(self, sample_files):
        f = sample_files / "notes.md"
        annotations = scan_annotations(f)
        if not annotations:
            pytest.skip("no annotations found")
        target = annotations[0]
        old_text = target.line_content
        new_text = old_text.replace("TODO", "DONE")
        result = annotate_fix(f, target, new_text)
        assert result is True

        # 验证修改
        content = f.read_text()
        assert new_text in content


class TestGenerateReport:
    def test_report_contains_findings(self, sample_files):
        report = generate_annotation_report(sample_files)
        assert "TODO" in report or "FIXME" in report or "注释" in report

    def test_report_no_findings(self, temp_dir):
        report = generate_annotation_report(temp_dir)
        assert "未发现" in report
