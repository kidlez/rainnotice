/**
 * 自定义 bash 工具 —— 替换内置 bash，增加安全拦截
 *
 * 拦截逻辑:
 *  1. 数据窃取命令 (mysql, psql, sqlite3, mongo, mysqldump, pg_dump)
 *  2. 配置文件读取 (cat .env, type config.yml)
 *  3. 密码搜索命令 (grep -r password, ripgrep password)
 *  4. 数据库连接字符串 (mysql://user:pass@host)
 *  5. 文件删除命令 (rm -rf, del /F, Remove-Item)
 *  6. curl/wget 外传数据
 */
import { execSync } from "child_process"
import { join } from "path"

export default {
  description: "Execute a shell command with security checks. Blocks dangerous data exfiltration and deletion commands.",
  args: {
    command: {
      type: "string",
      description: "The shell command to execute",
    },
    timeout: {
      type: "number",
      description: "Optional timeout in milliseconds",
    },
    workdir: {
      type: "string",
      description: "Working directory for the command",
    },
  },
  async execute(args: any, context: any) {
    const { command, timeout, workdir } = args

    // ── Security check via Python ──────────────────────────
    try {
      const pythonScript = join(context.directory, "core", "security_cli.py")
      // Escape the command for safe shell passing
      const escaped = command.replace(/\\/g, "\\\\").replace(/"/g, '\\"')
      const cmd = `python "${pythonScript}" check-cmd "${escaped}"`
      const stdout = execSync(cmd, {
        encoding: "utf-8",
        timeout: 15000,
        windowsHide: true,
      })
      const result = JSON.parse(stdout.trim())
      if (result.ok === false) {
        return `\u26d4 [${result.risk}] ${result.detail}`
      }
    } catch (e: any) {
      if (e.stdout) {
        try {
          const r = JSON.parse(e.stdout.toString().trim())
          if (r.ok === false) return `\u26d4 ${r.detail}`
        } catch {}
      }
    }

    // ── Execute command ────────────────────────────────────
    try {
      const opts: any = {
        encoding: "utf-8",
        timeout: timeout || 120000,
        windowsHide: true,
        maxBuffer: 50 * 1024 * 1024,
      }
      if (workdir) opts.cwd = workdir
      const stdout = execSync(command, opts)
      return stdout
    } catch (e: any) {
      if (e.stdout) return e.stdout.toString()
      if (e.stderr) return `Error: ${e.stderr.toString()}`
      return `Error: ${e.message}`
    }
  },
}
