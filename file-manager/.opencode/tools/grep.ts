/**
 * 自定义 grep 工具 —— 替换内置 grep，拦截敏感信息搜索
 *
 * 拦截逻辑:
 *  1. 拒绝搜索密码相关模式 (password, passwd, secret, key, token, credential)
 *  2. 拒绝搜索连接字符串模式
 *  3. 拒绝搜索中文密码/口令/密钥
 */
import { execSync } from "child_process"
import { join } from "path"

export default {
  description: "Search file contents with security checks. Blocks attempts to search for passwords and secrets.",
  args: {
    pattern: {
      type: "string",
      description: "The regex pattern to search for in file contents",
    },
    path: {
      type: "string",
      description: "The directory to search in. Defaults to current working directory.",
    },
    include: {
      type: "string",
      description: 'File pattern to include (e.g. "*.js", "*.{ts,tsx}")',
    },
  },
  async execute(args: any, context: any) {
    const { pattern, path: searchPath, include } = args

    // ── Security check via Python ──────────────────────────
    try {
      const pythonScript = join(context.directory, "core", "security_cli.py")
      const escaped = pattern.replace(/\\/g, "\\\\").replace(/"/g, '\\"')
      const cmd = `python "${pythonScript}" check-grep "${escaped}"`
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

    // ── Perform grep using ripgrep or Select-String ────────
    const dir = searchPath || "."
    try {
      // Try ripgrep first (faster)
      const rgArgs = ["--no-heading", "--line-number", "-n"]
      if (include) rgArgs.push("--glob", include)
      rgArgs.push(pattern, dir)
      const rgCmd = `rg ${rgArgs.join(" ")}`
      const stdout = execSync(rgCmd, {
        encoding: "utf-8",
        timeout: 30000,
        windowsHide: true,
      })
      return stdout || "(no matches)"
    } catch (e: any) {
      if (e.status === 1) return "(no matches)"
      return `Grep error: ${e.stderr || e.message}`
    }
  },
}
