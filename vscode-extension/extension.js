const vscode = require("vscode");
const http = require("http");
const https = require("https");
const { URL } = require("url");
const { exec } = require("child_process");

const STATE_KEY = "buildmylogic.session";
let statusBar;

function config() {
  const c = vscode.workspace.getConfiguration("buildmylogic");
  return {
    serverUrl: c.get("serverUrl", "http://localhost:8080"),
    eventsPath: c.get("eventsPath", "/api/sessions/{sessionId}/events"),
    contextPath: c.get("contextPath", "/api/vscode/context"),
    token: c.get("token", ""),
    testCommand: c.get("testCommand", "pytest -q"),
    testTimeoutMs: c.get("testTimeoutMs", 120000),
    maxFileBytes: c.get("maxFileBytes", 200000),
    maxOutputBytes: c.get("maxOutputBytes", 40000),
    sendDiagnostics: c.get("sendDiagnostics", true),
    enableTerminalEvidence: c.get("enableTerminalEvidence", false)
  };
}

function getSession(context) {
  return context.workspaceState.get(STATE_KEY, null);
}

async function setSession(context, session) {
  await context.workspaceState.update(STATE_KEY, session);
  updateStatus(session);
}

async function clearSession(context) {
  await context.workspaceState.update(STATE_KEY, null);
  updateStatus(null);
}

function updateStatus(session) {
  if (!statusBar) return;
  if (session?.active) {
    statusBar.text = `$(pulse) BuildMyLogic: ${session.challengeId || "Session"}`;
    statusBar.tooltip = `Active session: ${session.sessionId}`;
    statusBar.backgroundColor = new vscode.ThemeColor("statusBarItem.prominentBackground");
  } else {
    statusBar.text = "$(circle-slash) BuildMyLogic: Idle";
    statusBar.tooltip = "No BuildMyLogic learning session is active.";
    statusBar.backgroundColor = undefined;
  }
  statusBar.show();
}

function workspaceInfo() {
  const folders = vscode.workspace.workspaceFolders || [];
  return {
    name: vscode.workspace.name || folders[0]?.name || null,
    folders: folders.map(f => ({
      name: f.name,
      path: f.uri.fsPath,
      uri: f.uri.toString()
    })),
    isTrusted: vscode.workspace.isTrusted
  };
}

function activeEditorPayload() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return null;

  const doc = editor.document;
  const text = doc.getText();
  const max = config().maxFileBytes;
  const content = Buffer.byteLength(text, "utf8") <= max
    ? text
    : text.slice(0, max) + "\n/* BuildMyLogic: file content truncated */";

  return {
    uri: doc.uri.toString(),
    path: doc.uri.fsPath,
    fileName: doc.fileName,
    languageId: doc.languageId,
    version: doc.version,
    isDirty: doc.isDirty,
    lineCount: doc.lineCount,
    cursor: {
      line: editor.selection.active.line + 1,
      column: editor.selection.active.character + 1
    },
    selection: {
      startLine: editor.selection.start.line + 1,
      startColumn: editor.selection.start.character + 1,
      endLine: editor.selection.end.line + 1,
      endColumn: editor.selection.end.character + 1
    },
    content
  };
}

function diagnosticsPayload() {
  const all = [];
  for (const [uri, diagnostics] of vscode.languages.getDiagnostics()) {
    if (!diagnostics.length) continue;
    all.push({
      uri: uri.toString(),
      path: uri.fsPath,
      items: diagnostics.map(d => ({
        message: d.message,
        severity: ["Error", "Warning", "Information", "Hint"][d.severity] || "Unknown",
        source: d.source || null,
        code: typeof d.code === "object" ? d.code.value : (d.code ?? null),
        range: {
          start: { line: d.range.start.line + 1, column: d.range.start.character + 1 },
          end: { line: d.range.end.line + 1, column: d.range.end.character + 1 }
        }
      }))
    });
  }
  return all;
}

function activeWorkspacePath() {
  const folders = vscode.workspace.workspaceFolders || [];
  return folders[0]?.uri.fsPath || process.cwd();
}

function endpointFor(sessionId, template) {
  return template.replace("{sessionId}", encodeURIComponent(sessionId));
}

function postJson(target, body, token) {
  return new Promise((resolve, reject) => {
    let u;
    try {
      u = new URL(target);
    } catch (err) {
      reject(new Error(`Invalid BuildMyLogic server URL: ${err.message}`));
      return;
    }

    const payload = Buffer.from(JSON.stringify(body));
    const lib = u.protocol === "https:" ? https : http;

    const req = lib.request({
      method: "POST",
      hostname: u.hostname,
      port: u.port || (u.protocol === "https:" ? 443 : 80),
      path: u.pathname + u.search,
      headers: {
        "Content-Type": "application/json",
        "Content-Length": payload.length,
        ...(token ? { "X-BuildMyLogic-Token": token } : {})
      },
      timeout: 10000
    }, res => {
      let out = "";
      res.on("data", chunk => out += chunk);
      res.on("end", () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(out);
        } else {
          reject(new Error(`BuildMyLogic backend returned HTTP ${res.statusCode}: ${out.slice(0, 500)}`));
        }
      });
    });

    req.on("timeout", () => req.destroy(new Error("BuildMyLogic request timed out")));
    req.on("error", reject);
    req.end(payload);
  });
}

function buildEvent(session, eventType, payload = {}) {
  return {
    schemaVersion: 2,
    session_id: session.sessionId,
    challenge_id: session.challengeId || null,
    user_id: session.userId || null,
    event_type: eventType,
    timestamp: new Date().toISOString(),
    payload
  };
}

async function sendEvent(context, eventType, payload = {}) {
  const session = getSession(context);
  if (!session?.active) {
    throw new Error("No active BuildMyLogic session.");
  }

  const c = config();
  const path = endpointFor(session.sessionId, c.eventsPath);
  const body = buildEvent(session, eventType, payload);

  return postJson(joinUrl(c.serverUrl, path), body, c.token);
}

function joinUrl(base, path) {
  return `${base.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
}

async function sendContext(context, eventType = "context") {
  const session = getSession(context);
  if (!session?.active) return;

  const c = config();
  const body = buildEvent(session, eventType, {
    workspace: workspaceInfo(),
    activeEditor: activeEditorPayload(),
    diagnostics: c.sendDiagnostics ? diagnosticsPayload() : []
  });

  await postJson(joinUrl(c.serverUrl, c.contextPath), body, c.token);
}

function parseTestResult(stdout, stderr, exitCode) {
  const output = `${stdout || ""}\n${stderr || ""}`.trim();
  const passedMatch = output.match(/(\d+)\s+passed\b/i);
  const failedMatch = output.match(/(\d+)\s+failed\b/i);
  const skippedMatch = output.match(/(\d+)\s+skipped\b/i);
  const errorMatch = output.match(/(\d+)\s+error(?:s)?\b/i);

  const passed = passedMatch ? Number(passedMatch[1]) : 0;
  const failed = failedMatch ? Number(failedMatch[1]) : 0;
  const skipped = skippedMatch ? Number(skippedMatch[1]) : 0;
  const errors = errorMatch ? Number(errorMatch[1]) : 0;

  return {
    passed,
    failed,
    skipped,
    errors,
    totalKnown: passed + failed + skipped + errors,
    exitCode,
    success: exitCode === 0,
    rawOutput: output
  };
}

async function runTests(context) {
  const session = getSession(context);
  if (!session?.active) {
    vscode.window.showWarningMessage("Start a BuildMyLogic session first.");
    return;
  }

  const c = config();
  const cwd = activeWorkspacePath();
  const attempt = (session.attemptCount || 0) + 1;

  await sendEvent(context, "test_started", {
    attempt,
    command: c.testCommand,
    cwd
  });

  const started = Date.now();

  exec(c.testCommand, {
    cwd,
    timeout: c.testTimeoutMs,
    maxBuffer: Math.max(c.maxOutputBytes * 2, 100000),
    windowsHide: true
  }, async (error, stdout, stderr) => {
    const durationMs = Date.now() - started;
    const exitCode = typeof error?.code === "number" ? error.code : (error ? 1 : 0);
    const result = parseTestResult(stdout, stderr, exitCode);

    const nextSession = {
      ...session,
      attemptCount: attempt,
      lastRunAt: new Date().toISOString(),
      lastRun: {
        ...result,
        rawOutput: result.rawOutput.slice(-c.maxOutputBytes),
        durationMs
      }
    };
    await setSession(context, nextSession);

    try {
      await sendEvent(context, "test_run", {
        attempt,
        command: c.testCommand,
        cwd,
        durationMs,
        passed: result.passed,
        failed: result.failed,
        skipped: result.skipped,
        errors: result.errors,
        exitCode,
        success: result.success,
        output: result.rawOutput.slice(-c.maxOutputBytes),
        diagnostics: c.sendDiagnostics ? diagnosticsPayload() : []
      });

      if (result.success) {
        vscode.window.showInformationMessage(
          `BuildMyLogic: Tests passed${result.passed ? ` (${result.passed})` : ""}.`
        );
      } else {
        vscode.window.showWarningMessage(
          `BuildMyLogic: Tests failed. Attempt ${attempt}. Use "Ask Vibe for a Hint" if you're stuck.`
        );
      }
    } catch (e) {
      vscode.window.showErrorMessage(`BuildMyLogic could not send the test result: ${e.message}`);
    }
  });
}

async function askVibe(context) {
  const session = getSession(context);
  if (!session?.active) {
    vscode.window.showWarningMessage("Start a BuildMyLogic session first.");
    return;
  }

  const note = await vscode.window.showInputBox({
    title: "Ask Vibe",
    prompt: "What are you stuck on? Vibe should guide you without immediately giving the solution.",
    placeHolder: "e.g. I don't understand why this condition fails..."
  });

  if (note === undefined) return;

  try {
    const raw = await sendEvent(context, "stuck", {
      note,
      activeEditor: activeEditorPayload(),
      diagnostics: config().sendDiagnostics ? diagnosticsPayload() : [],
      lastRun: getSession(context)?.lastRun || null
    });
    let response = null;
    try { response = JSON.parse(raw); } catch {}
    const hint = response?.intervention?.hint;
    const nextStep = response?.intervention?.nextStep;
    if (hint) {
      const message = nextStep ? `${hint} Next: ${nextStep}` : hint;
      vscode.window.showInformationMessage(`Vibe: ${message}`);
    } else {
      vscode.window.showInformationMessage("BuildMyLogic: Vibe request sent.");
    }
  } catch (e) {
    vscode.window.showErrorMessage(`BuildMyLogic could not send the Vibe request: ${e.message}`);
  }
}

async function submitSolution(context) {
  const session = getSession(context);
  if (!session?.active) {
    vscode.window.showWarningMessage("Start a BuildMyLogic session first.");
    return;
  }

  const confirm = await vscode.window.showInformationMessage(
    "Submit this solution to BuildMyLogic?",
    { modal: true },
    "Submit"
  );
  if (confirm !== "Submit") return;

  try {
    await sendEvent(context, "submit", {
      attemptCount: session.attemptCount || 0,
      activeEditor: activeEditorPayload(),
      diagnostics: config().sendDiagnostics ? diagnosticsPayload() : [],
      lastRun: session.lastRun || null
    });
    vscode.window.showInformationMessage("BuildMyLogic: Solution submitted.");
  } catch (e) {
    vscode.window.showErrorMessage(`BuildMyLogic submission failed: ${e.message}`);
  }
}

async function startSession(context, supplied = {}) {
  const current = getSession(context);
  if (current?.active) {
    vscode.window.showInformationMessage(`BuildMyLogic session ${current.sessionId} is already active.`);
    return;
  }

  const sessionId = supplied.sessionId || await vscode.window.showInputBox({
    title: "BuildMyLogic Session",
    prompt: "Enter the session ID from BuildMyLogic.",
    placeHolder: "sess_..."
  });
  if (!sessionId) return;

  const challengeId = supplied.challengeId || await vscode.window.showInputBox({
    title: "BuildMyLogic Challenge",
    prompt: "Enter the challenge ID.",
    placeHolder: "cli_calculator"
  });
  if (!challengeId) return;

  const userId = supplied.userId || await vscode.window.showInputBox({
    title: "BuildMyLogic Learner",
    prompt: "Enter your BuildMyLogic user ID.",
    placeHolder: "user_..."
  });
  if (!userId) return;

  const session = {
    active: true,
    sessionId,
    challengeId,
    userId,
    token: supplied.token || "",
    startedAt: new Date().toISOString(),
    attemptCount: 0
  };

  await setSession(context, session);

  try {
    await sendEvent(context, "session_started", {
      workspace: workspaceInfo()
    });
    vscode.window.showInformationMessage(
      `BuildMyLogic session started: ${challengeId}`
    );
  } catch (e) {
    await clearSession(context);
    vscode.window.showErrorMessage(
      `Could not start BuildMyLogic session: ${e.message}`
    );
  }
}

async function stopSession(context) {
  const session = getSession(context);
  if (!session?.active) {
    vscode.window.showInformationMessage("No BuildMyLogic session is active.");
    return;
  }

  try {
    await sendEvent(context, "session_ended", {
      endedAt: new Date().toISOString(),
      attemptCount: session.attemptCount || 0
    });
  } catch (_) {
    // Still clear local session state if the backend is unavailable.
  }

  await clearSession(context);
  vscode.window.showInformationMessage("BuildMyLogic session stopped.");
}

async function openDashboard() {
  const c = config();
  await vscode.env.openExternal(vscode.Uri.parse(c.serverUrl));
}

async function showStatus(context) {
  const session = getSession(context);
  const ws = workspaceInfo();

  const text = session?.active
    ? [
        `Session: ${session.sessionId}`,
        `Challenge: ${session.challengeId}`,
        `Attempts: ${session.attemptCount || 0}`,
        `Workspace: ${ws.name || "none"}`,
        `Server: ${config().serverUrl}`
      ].join("\n")
    : [
        "No active BuildMyLogic session.",
        `Workspace: ${ws.name || "none"}`,
        `Server: ${config().serverUrl}`
      ].join("\n");

  vscode.window.showInformationMessage(text, { modal: true });
}

function registerUriHandler(context) {
  const handler = vscode.window.registerUriHandler({
    async handleUri(uri) {
      if (uri.authority !== "buildmylogic.buildmylogic-vscode" || uri.path !== "/session") return;

      const params = new URLSearchParams(uri.query);
      await startSession(context, {
        sessionId: params.get("sessionId") || "",
        challengeId: params.get("challengeId") || "",
        userId: params.get("userId") || "",
        token: params.get("token") || ""
      });
    }
  });
  context.subscriptions.push(handler);
}

function registerContextListeners(context) {
  const activeEditor = vscode.window.onDidChangeActiveTextEditor(() => {
    sendContext(context, "active_editor").catch(() => {});
  });

  const documentChange = vscode.workspace.onDidChangeTextDocument(e => {
    if (vscode.window.activeTextEditor?.document === e.document) {
      sendContext(context, "document_change").catch(() => {});
    }
  });

  const diagnosticsChange = vscode.languages.onDidChangeDiagnostics(() => {
    sendContext(context, "diagnostics_change").catch(() => {});
  });

  context.subscriptions.push(activeEditor, documentChange, diagnosticsChange);
}

function registerTerminalEvidence(context) {
  if (!config().enableTerminalEvidence) return;
  if (!vscode.window.onDidStartTerminalShellExecution) return;

  const start = vscode.window.onDidStartTerminalShellExecution(async event => {
    const session = getSession(context);
    if (!session?.active) return;

    try {
      await sendEvent(context, "terminal_start", {
        terminal: {
          name: event.terminal.name,
          cwd: event.terminal.shellIntegration?.cwd?.toString() || null,
          command: event.execution.commandLine?.value || null
        }
      });
    } catch (_) {}
  });

  const end = vscode.window.onDidEndTerminalShellExecution(async event => {
    const session = getSession(context);
    if (!session?.active) return;

    try {
      const execution = event.execution;
      const chunks = [];
      if (execution.read) {
        for await (const chunk of execution.read()) {
          chunks.push(String(chunk));
          if (chunks.join("").length > config().maxOutputBytes) break;
        }
      }

      await sendEvent(context, "terminal_end", {
        terminal: {
          name: event.terminal.name,
          exitCode: event.exitCode,
          command: execution.commandLine?.value || null,
          output: chunks.join("").slice(-config().maxOutputBytes)
        }
      });
    } catch (_) {}
  });

  context.subscriptions.push(start, end);
}

function activate(context) {
  statusBar = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100
  );
  statusBar.command = "buildmylogic.status";
  context.subscriptions.push(statusBar);

  context.subscriptions.push(
    vscode.commands.registerCommand("buildmylogic.startSession", () => startSession(context)),
    vscode.commands.registerCommand("buildmylogic.stopSession", () => stopSession(context)),
    vscode.commands.registerCommand("buildmylogic.runTests", () => runTests(context)),
    vscode.commands.registerCommand("buildmylogic.askVibe", () => askVibe(context)),
    vscode.commands.registerCommand("buildmylogic.submit", () => submitSolution(context)),
    vscode.commands.registerCommand("buildmylogic.sendContext", () => sendContext(context, "manual_context")),
    vscode.commands.registerCommand("buildmylogic.openDashboard", openDashboard),
    vscode.commands.registerCommand("buildmylogic.status", () => showStatus(context))
  );

  registerUriHandler(context);
  registerContextListeners(context);
  registerTerminalEvidence(context);

  updateStatus(getSession(context));
}

function deactivate() {}

module.exports = { activate, deactivate };
