"""
安全拦截层 —— 高危操作检测与阻止

检测类型：
  - INJECTION: 提示词注入（"忽略所有规则"、"删除所有文件"）
  - EXEC_DELETE: 文件内容中的删除指令（rm, del, Remove-Item）
  - PRIVILEGE_ESCALATION: 提权要求忽略安全规则
  - PASSWORD_LEAK: 密码泄露（非目标目录/数据库）
  - DATA_EXFILTRATION: 数据窃取（SQL查询密码、读取配置文件、grep搜索密钥）
"""
import re
from pathlib import Path
from typing import List, Tuple, Optional

from .config import settings

ThreatType = str

# ── 检测模式 ──────────────────────────────────────────────

INJECTION_PATTERNS: List[Tuple[ThreatType, List[str]]] = [
    ("INJECTION", [
        r"忽略\s*(所有|全部)?\s*(规则|指令|限制|约束|安全)",
        r"ignore\s*(all\s*)?(rules?|instructions?|restrictions?|security|constraints?)",
        r"delete\s*(all|every)\s*(files?|data|everything|content)",
        r"删除\s*(所有|全部)?\s*(文件|数据|内容|项目)",
        r"remove\s*(all|every)\s*(files?|data|content)",
        r"format\s*(disk|drive|C:|D:)",
        r"格式化\s*(磁盘|C盘|D盘)",
        r"请?清除\s*(所有|全部)?\s*(文件|数据|记录)",
    ]),
    ("PRIVILEGE_ESCALATION", [
        r"忽略\s*(之前|前面|以上)?\s*(所有|全部)?\s*(规则|指令|限制|设定|提示)",
        r"ignore\s*(all\s*)?(previous|above|below)?\s*(rules?|instructions?|prompts?)",
        r"不需要\s*(安全|审核|检查|验证)",
        r"no\s+(need\s+for\s+)?(security|audit|check|review|verification)",
        r"override\s+(all\s+)?(rules?|security|restrictions?)",
        r"bypass\s+(all\s+)?(security|rules?|checks?)",
        r"跳过\s*(所有|全部)?\s*(安全|检查|规则|步骤)",
    ]),
    ("DATA_EXFILTRATION", [
        # 中文间接窃取（宽松匹配："查"..."密码" 中间最多30字符）
        r"(读取|查看|查|获取|显示|给我|看看).{0,30}(密码|口令|密钥|secret|password)",
        r"(获取|提取|导出|读取).{0,10}(数据库|DB).{0,10}(密码|配置|账号|口令)",
        r"(show|display|get|fetch|read|print|dump)\s+(password|passwd|secret|credential|api[._-]?key|token)",
        r"SELECT\s+\*\s+FROM\s+(users|accounts|passwords|credentials|secrets)",
        r"SELECT\s+(password|passwd|secret|token|api_key|credential)\s+FROM",
        r"SELECT.*(?:password|passwd|secret|token|credential).*FROM",
        r"cat\s+\S*\.env",
        r"(cat|type|more|less|read)\s+\S*(?:secret|credential|config|setting|database)",
        r"grep\s+-[rR].*(?:password|passwd|secret|key|token|credential)",
        r"find\s+.*(?:password|passwd|secret|credential|config)",
        r"mysqldump|pg_dump|mongodump|sqlcmd\s+-Q",
        r"(mysql|psql|sqlite3|mongo|mongosh)\s+.*(?:-u\s|--user)",
        r"connection.{0,10}string.{0,10}(?:password|pwd|secret)",
        r"(执行|运行|查一下).{0,20}(SQL|sql|查询).{0,20}(密码|口令|账号)",
        r"(提取|收集|汇总).{0,30}(密码|口令|secret|password|凭证)",
        r"(告诉我|返回|输出|打印).{0,30}(密码|口令|密钥|secret|password)",
        r"(读|写|查看|获取).{0,20}(\.env|config|database|DB配置|credential)",
        r"(连接|connection|connect).{0,20}(密码|password|口令|pwd)",
    ]),
]

EXEC_DELETE_PATTERNS: List[re.Pattern] = [
    re.compile(r'\brm\s+[-/][rfR]\s+[/\\]', re.IGNORECASE),
    re.compile(r'\brm\s+-rf\b', re.IGNORECASE),
    re.compile(r'\bdel\s+[/\\][fF]\s+[/\\][qQ]?\s', re.IGNORECASE),
    re.compile(r'\bRemove-Item\s+', re.IGNORECASE),
    re.compile(r'\brmdir\s+[/\\][sS]\s+[/\\][qQ]?\b', re.IGNORECASE),
    re.compile(r'\bdestroy\b', re.IGNORECASE),
    re.compile(r'\bshred\s+-[fuz]', re.IGNORECASE),
    re.compile(r'\bwipe\s+', re.IGNORECASE),
    re.compile(r'os\.remove\(|os\.unlink\(|shutil\.rmtree\(', re.IGNORECASE),
    re.compile(r'Path\(.*\)\.unlink\(|Path\(.*\)\.rmdir\(', re.IGNORECASE),
]

# ── 密码泄露检测 ──────────────────────────────────────────

PASSWORD_PATTERNS: List[re.Pattern] = [
    re.compile(r'password\s*[=:]\s*["\']?([^"\'\s]+)', re.IGNORECASE),
    re.compile(r'passwd\s*[=:]\s*["\']?([^"\'\s]+)', re.IGNORECASE),
    re.compile(r'pwd\s*[=:]\s*["\']?([^"\'\s]+)', re.IGNORECASE),
    re.compile(r'密码\s*[=:：]\s*["\']?([^"\'\s，。]+)'),
    re.compile(r'secret\s*[=:]\s*["\']?([^"\'\s]+)', re.IGNORECASE),
    re.compile(r'口令\s*[=:：]\s*["\']?([^"\'\s，。]+)'),
]

# ── 数据窃取检测：bash 命令级 ─────────────────────────────

BASH_EXFILTRATION_PATTERNS: List[re.Pattern] = [
    # SQL 客户端调用
    re.compile(r'\b(mysql|psql|sqlite3|mongo|mongosh|sqlcmd|sqlplus)\b', re.IGNORECASE),
    # 数据导出
    re.compile(r'\b(mysqldump|pg_dump|mongodump|sqlite3\s+.*\.dump)\b', re.IGNORECASE),
    # 读取配置文件
    re.compile(r'\b(cat|type|more|less|Get-Content)\s+\S*\.env', re.IGNORECASE),
    re.compile(r'\b(cat|type|more|less|Get-Content)\s+\S*(?:secret|credential|password|config)\S*', re.IGNORECASE),
    # grep 搜索敏感词
    re.compile(r'\bgrep\s+-[rR]\s+(?:password|passwd|secret|key|token|credential|api_key)', re.IGNORECASE),
    re.compile(r'\brg\s+(?:password|passwd|secret|key|token|credential|api_key)', re.IGNORECASE),
    # find 搜索敏感文件
    re.compile(r'\bfind\s+.*-name\s+["\']?\*?(?:password|secret|credential|config|\.env)\*?', re.IGNORECASE),
    # curl/wget 数据外传（POST 到外部 URL 且含敏感数据）
    re.compile(r'\b(curl|wget)\s+.*-d\s*["\']?\S*(?:password|secret|key|token)', re.IGNORECASE),
    # OpenSSL 私钥读取
    re.compile(r'\bopenssl\s+rsa\b', re.IGNORECASE),
    # 连接字符串暴露
    re.compile(r'(?:mysql|postgres|mongodb|sqlite)://\w+:\w+@', re.IGNORECASE),
]

# ── grep 模式级检测 ───────────────────────────────────────

GREP_DENY_PATTERNS: List[re.Pattern] = [
    re.compile(r'password', re.IGNORECASE),
    re.compile(r'passwd', re.IGNORECASE),
    re.compile(r'secret\b', re.IGNORECASE),
    re.compile(r'api[._-]?key', re.IGNORECASE),
    re.compile(r'token', re.IGNORECASE),
    re.compile(r'credential', re.IGNORECASE),
    re.compile(r'密码', re.IGNORECASE),
    re.compile(r'口令', re.IGNORECASE),
    re.compile(r'密钥', re.IGNORECASE),
    re.compile(r'private[._-]?key', re.IGNORECASE),
    re.compile(r'connection[._-]?string', re.IGNORECASE),
]

# ── 敏感文件名拦截（read 工具级） ──────────────────────────

SENSITIVE_FILENAME_PATTERNS: List[re.Pattern] = [
    re.compile(r'\.env$', re.IGNORECASE),
    re.compile(r'\.env\.(?!example\b)\w+$', re.IGNORECASE),
    re.compile(r'credentials?[.\-_]?\w*\.\w+$', re.IGNORECASE),
    re.compile(r'secret[.\-_]?\w*\.\w+$', re.IGNORECASE),
    re.compile(r'password[.\-_]?\w*\.\w+$', re.IGNORECASE),
    re.compile(r'\.pem$', re.IGNORECASE),
    re.compile(r'\.key$', re.IGNORECASE),
    re.compile(r'id_rsa$', re.IGNORECASE),
]

# ── 核心检测函数 ──────────────────────────────────────────

def check_input_injection(text: str) -> Optional[Tuple[ThreatType, str]]:
    """检测用户输入中是否包含提示词注入/删除指令/提权要求/数据窃取"""
    for threat_type, patterns in INJECTION_PATTERNS:
        for p in patterns:
            match = re.search(p, text, re.IGNORECASE)
            if match:
                return (threat_type, match.group(0))
    return None


def check_content_malicious(file_path: Path) -> List[Tuple[int, str, str]]:
    """扫描文件内容中的恶意删除脚本"""
    if not file_path.is_file():
        return []
    try:
        text = file_path.read_text(encoding="utf-8", errors="ignore")
    except Exception:
        return []

    results: List[Tuple[int, str, str]] = []
    for line_no, line in enumerate(text.splitlines(), 1):
        for pattern in EXEC_DELETE_PATTERNS:
            match = pattern.search(line)
            if match:
                results.append((line_no, match.group(0), line.strip()))
    return results


def check_password_leak(file_path: Path) -> List[Tuple[int, str, str]]:
    """检测文件中是否包含密码，仅目标目录允许"""
    if not file_path.is_file():
        return []

    target = settings.target_directory
    try:
        resolved = file_path.resolve()
    except Exception:
        resolved = file_path.absolute()

    if target and (str(target) in str(resolved) or str(resolved).startswith(str(target))):
        return []

    try:
        text = file_path.read_text(encoding="utf-8", errors="ignore")
    except Exception:
        return []

    results: List[Tuple[int, str, str]] = []
    for line_no, line in enumerate(text.splitlines(), 1):
        for pattern in PASSWORD_PATTERNS:
            match = pattern.search(line)
            if match:
                results.append((line_no, match.group(0), line.strip()))
    return results


def check_bash_exfiltration(command: str) -> Optional[Tuple[str, str]]:
    """检测 bash 命令是否包含数据窃取行为"""
    for pattern in BASH_EXFILTRATION_PATTERNS:
        match = pattern.search(command)
        if match:
            return ("DATA_EXFILTRATION", match.group(0))
    return None


def check_grep_pattern(pattern_text: str) -> Optional[str]:
    """检测 grep 搜索模式是否在搜索敏感信息"""
    for pat in GREP_DENY_PATTERNS:
        if pat.search(pattern_text):
            return pat.pattern
    return None


def check_sensitive_filename(file_path: Path) -> Optional[str]:
    """检测文件是否属于敏感文件（.env / credentials / secrets）"""
    fname = file_path.name
    for pat in SENSITIVE_FILENAME_PATTERNS:
        if pat.search(fname):
            return pat.pattern
    return None


class SecurityIntercept(Exception):
    """安全拦截异常"""
    def __init__(self, threat_type: ThreatType, detail: str):
        self.threat_type = threat_type
        self.detail = detail
        super().__init__(f"[{threat_type}] 高危操作拦截: {detail}")


def intercept_input(text: str) -> None:
    """对用户输入进行安全拦截检查"""
    result = check_input_injection(text)
    if result:
        threat_type, match = result
        raise SecurityIntercept(threat_type, f"检测到注入/提权指令: '{match}'")


def intercept_file(file_path: Path) -> None:
    """对文件内容进行安全拦截检查"""
    malicious = check_content_malicious(file_path)
    if malicious:
        details = "; ".join(f"第{l}行: {m}" for l, m, _ in malicious)
        raise SecurityIntercept("EXEC_DELETE", f"文件包含删除指令: {details}")

    leaks = check_password_leak(file_path)
    if leaks:
        details = "; ".join(f"第{l}行: {m}" for l, m, _ in leaks)
        raise SecurityIntercept("PASSWORD_LEAK", f"非目标目录包含密码信息: {details}")


def intercept_bash_command(command: str) -> None:
    """对 bash 命令进行数据窃取+删除拦截"""
    result = check_bash_exfiltration(command)
    if result:
        threat_type, match = result
        raise SecurityIntercept(threat_type, f"bash命令疑似数据窃取: '{match}'")

    for pattern in EXEC_DELETE_PATTERNS:
        match = pattern.search(command)
        if match:
            raise SecurityIntercept("EXEC_DELETE", f"bash命令含删除指令: '{match.group(0)}'")


def intercept_grep_pattern(pattern_text: str) -> None:
    """对 grep 搜索模式进行拦截"""
    result = check_grep_pattern(pattern_text)
    if result:
        raise SecurityIntercept("DATA_EXFILTRATION", f"grep模式搜索敏感信息: '{result}'")


def intercept_sensitive_file(file_path: Path) -> None:
    """拦截敏感文件读取"""
    result = check_sensitive_filename(file_path)
    if result:
        raise SecurityIntercept("PASSWORD_LEAK", f"敏感文件拒绝读取: {file_path.name}")
