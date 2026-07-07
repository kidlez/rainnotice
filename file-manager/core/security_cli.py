"""
安全 CLI —— 供 Custom Tools 调用的 JSON 接口

用法:
  python core/security_cli.py check-input  "<text>"
  python core/security_cli.py check-file   "<path>"
  python core/security_cli.py check-cmd    "<command>"
  python core/security_cli.py check-grep   "<pattern>"

返回 JSON: {"ok": true} 或 {"ok": false, "risk": "<type>", "detail": "<message>"}
"""
import sys
import json
from pathlib import Path

from .security import (
    check_input_injection,
    check_content_malicious,
    check_password_leak,
    check_bash_exfiltration,
    check_grep_pattern,
    check_sensitive_filename,
    EXEC_DELETE_PATTERNS,
    SecurityIntercept,
)


def main():
    if len(sys.argv) < 3:
        _ok()
        return

    action = sys.argv[1]
    payload = " ".join(sys.argv[2:])

    try:
        if action == "check-input":
            result = check_input_injection(payload)
            if result:
                _fail(result[0], f"输入注入: '{result[1]}'")
            else:
                _ok()

        elif action == "check-file":
            p = Path(payload)
            if not p.exists():
                _fail("NOT_FOUND", f"文件不存在: {payload}")
                return

            # 敏感文件名
            sensitive = check_sensitive_filename(p)
            if sensitive:
                _fail("PASSWORD_LEAK", f"敏感文件: '{sensitive}'")
                return

            # 恶意内容
            malicious = check_content_malicious(p)
            if malicious:
                details = [{"line": l, "match": m} for l, m, _ in malicious]
                _fail("EXEC_DELETE", f"文件含删除指令", details)
                return

            # 密码泄露
            leaks = check_password_leak(p)
            if leaks:
                details = [{"line": l, "match": m} for l, m, _ in leaks]
                _fail("PASSWORD_LEAK", f"非目标目录含密码", details)
                return

            _ok()

        elif action == "check-cmd":
            result = check_bash_exfiltration(payload)
            if result:
                _fail(result[0], f"危险命令: '{result[1]}'")
                return
            for pat in EXEC_DELETE_PATTERNS:
                m = pat.search(payload)
                if m:
                    _fail("EXEC_DELETE", f"命令含删除指令: '{m.group(0)}'")
                    return
            _ok()

        elif action == "check-grep":
            result = check_grep_pattern(payload)
            if result:
                _fail("DATA_EXFILTRATION", f"搜索敏感模式: '{result}'")
            else:
                _ok()

        else:
            _ok()

    except SecurityIntercept as e:
        _fail(e.threat_type, str(e))
    except Exception as e:
        _fail("ERROR", str(e))


def _ok():
    print(json.dumps({"ok": True}, ensure_ascii=False))


def _fail(risk: str, detail: str, extra=None):
    result = {"ok": False, "risk": risk, "detail": detail}
    if extra:
        result["matches"] = extra
    print(json.dumps(result, ensure_ascii=False))


if __name__ == "__main__":
    main()
