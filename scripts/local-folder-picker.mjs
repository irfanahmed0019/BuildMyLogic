import { createServer } from "node:http";
import { execFile } from "node:child_process";
import { statSync } from "node:fs";
import { resolve } from "node:path";

const PORT = Number(process.env.LOOP_BRIDGE_PORT || 8091);
const ALLOWED_ORIGINS = new Set(
  (process.env.LOOP_BRIDGE_ORIGINS || "http://localhost:8080,http://127.0.0.1:8080")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean),
);

function run(command, args) {
  return new Promise((resolvePromise, reject) => {
    execFile(command, args, { encoding: "utf8", windowsHide: true }, (error, stdout) => {
      if (error) reject(error);
      else resolvePromise(stdout.trim());
    });
  });
}

async function pickFolder() {
  if (process.platform === "linux") {
    const commands = [
      ["zenity", ["--file-selection", "--directory", "--title=Select your LOOP project folder"]],
      ["kdialog", ["--getexistingdirectory", ".", "Select your LOOP project folder"]],
      ["yad", ["--file-selection", "--directory", "--title=Select your LOOP project folder"]],
      ["python3", ["-c", "import tkinter as tk; from tkinter import filedialog; root=tk.Tk(); root.withdraw(); root.attributes('-topmost', True); print(filedialog.askdirectory(title='Select your LOOP project folder')); root.destroy()"]],
    ];
    for (const [command, args] of commands) {
      try {
        const result = await run(command, args);
        if (result) return result;
      } catch {
        // Try the next desktop picker.
      }
    }
    throw new Error("No folder picker is available. Install zenity: sudo apt install zenity");
  }

  if (process.platform === "darwin") {
    return run("osascript", ["-e", 'POSIX path of (choose folder with prompt "Select your LOOP project folder")']);
  }

  if (process.platform === "win32") {
    const ps = "Add-Type -AssemblyName System.Windows.Forms; $d=New-Object System.Windows.Forms.FolderBrowserDialog; $d.Description='Select your LOOP project folder'; if($d.ShowDialog() -eq 'OK'){[Console]::Write($d.SelectedPath)}";
    return run("powershell.exe", ["-NoProfile", "-STA", "-Command", ps]);
  }

  throw new Error(`Unsupported platform: ${process.platform}`);
}

function json(res, status, body) {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
  res.end(JSON.stringify(body));
}

function originAllowed(req) {
  const origin = req.headers.origin;
  if (!origin) return true;
  if (ALLOWED_ORIGINS.has(origin)) return true;
  try {
    const url = new URL(origin);
    return (url.protocol === "http:" && (url.hostname === "localhost" || url.hostname === "127.0.0.1"));
  } catch {
    return false;
  }
}

const server = createServer(async (req, res) => {
  if (!originAllowed(req)) return json(res, 403, { ok: false, error: "Origin not allowed." });
  const origin = req.headers.origin;
  if (origin) res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return json(res, 204, {});
  if (req.method === "GET" && req.url === "/health") return json(res, 200, { ok: true, platform: process.platform });

  if (req.method === "POST" && req.url === "/pick-folder") {
    try {
      const path = (await pickFolder()).trim().replace(/[\\/]+$/, "");
      if (!path) return json(res, 400, { ok: false, error: "No folder was selected." });
      const absolute = resolve(path);
      if (!statSync(absolute).isDirectory()) throw new Error("The selected path is not a folder.");
      return json(res, 200, { ok: true, path: absolute });
    } catch (error) {
      return json(res, 500, { ok: false, error: error instanceof Error ? error.message : "Folder selection failed." });
    }
  }

  if (req.method === "POST" && req.url === "/open-vscode") {
    let body = "";
    req.on("data", (chunk) => { body += chunk; if (body.length > 10000) req.destroy(); });
    req.on("end", async () => {
      try {
        const parsed = JSON.parse(body || "{}");
        const path = typeof parsed.path === "string" ? resolve(parsed.path.trim()) : "";
        if (!path) return json(res, 400, { ok: false, error: "No project path supplied." });
        if (!statSync(path).isDirectory()) return json(res, 400, { ok: false, error: "Project path is not a folder." });
        try {
          await run("code", ["--reuse-window", path]);
        } catch {
          const uri = `vscode://file${encodeURI(path)}`;
          await run(process.platform === "darwin" ? "open" : process.platform === "win32" ? "cmd" : "xdg-open", process.platform === "darwin" ? [uri] : process.platform === "win32" ? ["/c", "start", "", uri] : [uri]);
        }
        return json(res, 200, { ok: true });
      } catch (error) {
        return json(res, 500, { ok: false, error: error instanceof Error ? error.message : "Could not open VS Code." });
      }
    });
    return;
  }

  return json(res, 404, { ok: false, error: "Not found" });
});

server.on("error", (error) => {
  console.error(`[LOOP] Desktop bridge error: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`[LOOP] Local desktop bridge ready: http://127.0.0.1:${PORT}`);
  console.log(`[LOOP] Allowed browser origins: localhost/127.0.0.1`);
});
