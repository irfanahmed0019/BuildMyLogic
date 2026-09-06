# BuildMyLogic VS Code Extension

The VS Code side of the BuildMyLogic learning architecture.

## Architecture

```text
BuildMyLogic Web App
       |
       | start session / vscode:// URI
       v
BuildMyLogic VS Code Extension
       |
       +--> active code
       +--> Problems / diagnostics
       +--> explicit test runs
       +--> error evidence
       +--> attempt count
       +--> Vibe requests
       +--> final submission
       |
       v
BuildMyLogic Backend / FastAPI
       |
       +--> session validation
       +--> event store
       +--> deterministic analyzer
       |       |
       |       +--> tests passed/failed
       |       +--> attempts
       |       +--> error frequency
       |       +--> skill evidence
       |
       +--> Sarvam Vibe
               |
               v
        hint / explanation / intervention
```

## MVP behavior

### 1. Session gating

The extension does **nothing with learner telemetry until a BuildMyLogic session is active**.

A session contains:

- `session_id`
- `challenge_id`
- `user_id`
- `started_at`
- `attempt_count`

This keeps the extension focused on learning sessions rather than acting as a general-purpose surveillance tool.

### 2. Run Tests

`BuildMyLogic: Run Tests` executes the configured test command (default: `pytest -q`) from the current workspace.

It sends:

```json
{
  "event_type": "test_run",
  "payload": {
    "attempt": 1,
    "command": "pytest -q",
    "passed": 6,
    "failed": 4,
    "skipped": 0,
    "errors": 0,
    "exitCode": 1,
    "success": false,
    "output": "..."
  }
}
```

The backend, not the LLM, should determine objective success.

### 3. Vibe

`BuildMyLogic: Ask Vibe for a Hint` sends the learner's note plus relevant code, diagnostics, and latest test result.

The backend can decide whether to call Sarvam and what intervention level to return.

The extension never contains a Sarvam API key.

### 4. Submit

`BuildMyLogic: Submit Solution` sends the current code, diagnostics, test evidence and attempt count.

The backend can validate the challenge and update skill evidence.

## Backend contract

Default event endpoint:

```text
POST /api/sessions/{sessionId}/events
```

Every event includes:

```json
{
  "schemaVersion": 2,
  "session_id": "sess_123",
  "challenge_id": "cli_calculator",
  "user_id": "user_123",
  "event_type": "test_run",
  "timestamp": "2026-09-06T00:00:00.000Z",
  "payload": {}
}
```

Recommended backend validation:

1. Session exists.
2. Session is active.
3. Session belongs to the user.
4. Challenge matches.
5. Accept and store event.

## Web -> VS Code deep link

The web app can start a session using:

```text
vscode://buildmylogic.buildmylogic-vscode/session?sessionId=sess_123&challengeId=cli_calculator&userId=user_123
```

The extension parses the query parameters and activates the session.

The integrated web app creates a short-lived pairing token and passes it through the VS Code deep link. The extension stores that token only in VS Code workspace state and uses it to authenticate event uploads. For a remote production deployment, use HTTPS and a server-side persistent session store.

## Configuration

```json
{
  "buildmylogic.serverUrl": "http://localhost:8080",
  "buildmylogic.eventsPath": "/api/sessions/{sessionId}/events",
  "buildmylogic.contextPath": "/api/vscode/context",
  "buildmylogic.testCommand": "pytest -q"
}
```

For a production deployment, use HTTPS.

## Commands

- BuildMyLogic: Start Session
- BuildMyLogic: Stop Session
- BuildMyLogic: Run Tests
- BuildMyLogic: Ask Vibe for a Hint
- BuildMyLogic: Submit Solution
- BuildMyLogic: Send Current Context
- BuildMyLogic: Open Dashboard
- BuildMyLogic: Session Status

## Security

- No Sarvam credentials in the extension.
- No automatic execution of AI-generated commands.
- No repository-wide upload by default.
- Test execution is explicit and user initiated.
- Session gating prevents background learner telemetry when no session is active.
- Use a short-lived pairing token for production.

## Development

```bash
npm install -g @vscode/vsce
vsce package
code --install-extension buildmylogic-vscode-0.2.0.vsix
```

Then open a challenge workspace and use the Command Palette.
