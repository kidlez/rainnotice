"""
配置管理 —— 目标目录、密码白名单、安全设置
"""
import json
import os
from pathlib import Path
from typing import Optional


class Settings:
    def __init__(self):
        self._target_directory: Optional[Path] = None
        self._config_file: Optional[Path] = None
        self._load()

    def _load(self):
        # 优先从环境变量读取
        env_target = os.environ.get("FM_TARGET_DIR")
        if env_target:
            self._target_directory = Path(env_target)
            return

        # 尝试从配置文件读取
        candidates = [
            Path.cwd() / ".fm-config.json",
            Path.home() / ".fm-config.json",
            Path.cwd() / "fm-config.json",
        ]
        for cf in candidates:
            if cf.exists():
                self._config_file = cf
                try:
                    data = json.loads(cf.read_text(encoding="utf-8"))
                    raw = data.get("target_directory")
                    if raw:
                        self._target_directory = Path(raw).resolve()
                except Exception:
                    pass
                break

    @property
    def target_directory(self) -> Optional[Path]:
        return self._target_directory

    def set_target_directory(self, path: str) -> Path:
        p = Path(path).resolve()
        if not p.exists():
            p.mkdir(parents=True, exist_ok=True)
        self._target_directory = p
        return p

    @property
    def allowed_dirs(self) -> list:
        """允许操作的白名单目录"""
        dirs = [Path.cwd()]
        if self._target_directory:
            dirs.append(self._target_directory)
        return dirs


settings = Settings()
