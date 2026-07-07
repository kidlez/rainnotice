"""
强制安全 Hook 系统 —— 通过 audit hook + monkey-patch 实现不可绕过的安全拦截

工作原理：
  1. sys.addaudithook() → 拦截 os.remove、subprocess.Popen、os.system 等
  2. monkey-patch pathlib.Path → 拦截 read_text/write_text/unlink/rmdir
  3. monkey-patch builtins.open → 拦截所有文件打开操作
  4. 拦截到危险操作时抛出 SecurityIntercept，阻止执行

启动方式：
  python -c "from core.security_hook import install; install()"
  或设置 PYTHONSTARTUP 指向此模块
"""
import os
import sys
import re
import builtins
from pathlib import Path
from typing import List

from .security import (
    check_content_malicious,
    check_password_leak,
    SecurityIntercept,
    EXEC_DELETE_PATTERNS,
)
# 全局状态
_hooks_installed = False
_blocked_operations: List[str] = []


# 不安全命令模式（shell 命令级别）
DANGEROUS_CMDS: List[re.Pattern] = [
    re.compile(r'\brm\s+(?:-rf|-r\s+-f|-f\s+-r)\b', re.IGNORECASE),
    re.compile(r'\bdel\s+/[fF]\s+/[sSqQ]?\b', re.IGNORECASE),
    re.compile(r'\brmdir\s+/[sS]\b', re.IGNORECASE),
    re.compile(r'\bRemove-Item\b', re.IGNORECASE),
    re.compile(r'\bformat\s+(?:[cdCD]:|disk|drive)', re.IGNORECASE),
    re.compile(r'\bshred\b', re.IGNORECASE),
    re.compile(r'\bwipe\b', re.IGNORECASE),
]
