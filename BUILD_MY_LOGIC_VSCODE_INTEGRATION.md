# BuildMyLogic + VS Code integration

## Flow

1. BuildMyLogic web app creates a session at `/api/vscode/sessions`.
2. The server returns a session id + short-lived pairing token.
3. Sessions page selects the real local project folder through the desktop bridge.
4. Web launches the folder in VS Code and opens a `vscode://` deep link.
5. BuildMyLogic extension receives the session and stores it in VS Code workspace state.
6. The extension sends explicit test results, diagnostics, editor context and submissions to `/api/sessions/{sessionId}/events`.
7. The backend validates the pairing token and session identity before accepting events.
8. `Ask Vibe for a Hint` can call Sarvam server-side and returns a short intervention to VS Code.

## Local development

Web: `npm run dev` (the existing dev script starts the desktop bridge too).

Extension:

```bash
cd vscode-extension
npm install -g @vscode/vsce
vsce package
code --install-extension buildmylogic-vscode-0.1.0.vsix
```

Do not put `SARVAM_API_KEY` in the extension. Keep it in the web/backend environment.
