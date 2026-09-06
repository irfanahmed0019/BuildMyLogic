import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const bridgePort = Number(process.env.LOOP_BRIDGE_PORT || 8091);

async function bridgeAlreadyRunning() {
  try {
    const response = await fetch(`http://127.0.0.1:${bridgePort}/health`, { signal: AbortSignal.timeout(700) });
    return response.ok;
  } catch {
    return false;
  }
}

const reuseBridge = await bridgeAlreadyRunning();
const bridge = reuseBridge
  ? null
  : spawn(process.execPath, [fileURLToPath(new URL("./local-folder-picker.mjs", import.meta.url))], { stdio: "inherit" });

if (reuseBridge) console.log(`[LOOP] Reusing existing desktop bridge on 127.0.0.1:${bridgePort}`);

const vite = spawn(npm, ["exec", "vite", "--", ...process.argv.slice(2)], { stdio: "inherit", shell: false });
let shuttingDown = false;

function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  if (bridge && !bridge.killed) bridge.kill("SIGTERM");
  if (!vite.killed) vite.kill("SIGTERM");
  setTimeout(() => process.exit(code), 50);
}

bridge?.on("error", (error) => console.error("[LOOP] Desktop bridge failed to start:", error));
vite.on("error", (error) => console.error("[LOOP] Vite failed to start:", error));
process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));
vite.on("exit", (code, signal) => shutdown(code ?? (signal ? 1 : 0)));
