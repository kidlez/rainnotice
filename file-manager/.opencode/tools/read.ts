/**
 * 自定义 read 工具 —— 替换内置 read，增加安全拦截
 *
 * 拦截逻辑:
 *  1. 拒绝读取敏感文件 (.env / credentials / secrets / .key / .pem / id_rsa)
 *  2. 扫描文件内容中的恶意删除脚本 (rm -rf / del /F 等)
 *  3. 扫描文件内容中的密码泄露 (非目标目录下 password=xxx)
 */
import { execSync } from "child_process"
import { readFileSync, existsSync, statSync, readdirSync } from "fs"
import { join, resolve as pathResolve } from "path"

export default {
  description: "Read a file or directory with security checks. Returns file content with line numbers.",
  args: {
    filePath: {
      type: "string",
      description: "The absolute path to the file or directory to read",
    },
    offset: {
      type: "number",
      description: "The line number to start reading from (1-indexed)",
    },
    limit: {
      type: "number",
      description: "The maximum number of lines to read",
    },
  },
  async execute(args: any, context: any) {
    const { filePath, offset, limit } = args

    // ── Security check via Python ──────────────────────────
    try {
      const pythonScript = join(context.directory, "core", "security_cli.py")
      const cmd = `python "${pythonScript}" check-file "${filePath}"`
      const stdout = execSync(cmd, { encoding: "utf-8", timeout: 15000, windowsHide: true })
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

    // ── Read operation ─────────────────────────────────────
    if (!existsSync(filePath)) {
      return `Error: Path does not exist: ${filePath}`
    }

    const stat = statSync(filePath)
    if (stat.isDirectory()) {
      const entries = readdirSync(filePath)
        .map((e: string) => {
          const full = join(filePath, e)
          try {
            const s = statSync(full)
            return `${e}${s.isDirectory() ? "/" : ""}`
          } catch {
            return e
          }
        })
        .join("\n")
      return entries
    }

    const raw = readFileSync(filePath, "utf-8")
    const lines = raw.split("\n")
    const start = Math.max(0, (offset || 1) - 1)
    const end = limit ? start + limit : lines.length

    return lines.slice(start, end)
      .map((line: string, i: number) => `${start + i + 1}: ${line}`)
      .join("\n")
  },
}
