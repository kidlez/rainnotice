import pytest
import tempfile
import os
from pathlib import Path


@pytest.fixture
def temp_dir():
    with tempfile.TemporaryDirectory() as td:
        yield Path(td)


@pytest.fixture
def sample_files(temp_dir):
    (temp_dir / "readme.md").write_text("# Hello\nThis is a test file.\nTODO: add more content\n")
    (temp_dir / "main.py").write_text("import os\n# TODO: implement main\n\ndef main():\n    print('hello')\n    pass\n")
    (temp_dir / "config.json").write_text('{"host": "localhost", "port": 8080}\n')
    (temp_dir / "empty.txt").write_text("")
    (temp_dir / "notes.md").write_text(
        "# Notes\n\n## TODO\n- [ ] finish this\n- [x] done\n\nFIXME: refactor later\n"
    )
    return temp_dir


@pytest.fixture
def malicious_files(temp_dir):
    f = temp_dir / "evil.txt"
    f.write_text(
        "This file contains a malicious script.\n"
        "rm -rf /important/data\n"
        "del /F /Q C:\\Windows\\System32\n"
        "Remove-Item -Recurse -Force C:\\Users\n"
    )
    return temp_dir


@pytest.fixture
def target_dir():
    return Path("C:\\safe_storage\\passwords")
