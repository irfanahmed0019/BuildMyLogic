# Complete Project Build

Can u build the remaining teh all file i have attached so man compelte

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://cuddly-code-completer.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/66cb64e7-c36e-4aaa-9ba4-a8acd1db1247).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Environment setup

LOOP uses the Sarvam AI API from server-side code. The API key must **not** be put in a `VITE_*` variable.

For local development:

1. Copy `.env.example` to `.env`.
2. Replace `your_sarvam_api_key_here` with your real Sarvam API key.
3. Restart the dev server after changing `.env`.

For a deployed Lovable/Cloudflare Worker, add a server secret named `SARVAM_API_KEY` in the deployment environment. The Worker entry now forwards that runtime secret to the server functions.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## Google login + cloud memory

LOOP now supports optional Google sign-in with Firebase Authentication and Firestore. The learning chat is cached inside `LoopState`, so returning to a mission restores the previous Vibe conversation immediately. When Google is connected, that same state is synced to Firestore and restored on another device/browser.

### Firebase setup

1. Create a Firebase project.
2. Enable **Authentication → Google**.
3. Add a Firebase Web App and copy its Web API key and project ID.
4. Create a Google OAuth **Web client ID** in Google Cloud Console. Add your local origin (for example `http://localhost:8080`) and your production origin to the authorized JavaScript origins.
5. Create a Firestore database.
6. Apply `firestore.rules` from this repo.
7. Put the values in `.env`:

```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_PROJECT_ID=...
VITE_GOOGLE_CLIENT_ID=...
SARVAM_API_KEY=...
```

The Firebase API key is a browser configuration value; Firestore security rules are what prevent one authenticated user from reading another user's document. The app stores one document per Firebase UID at `loopUsers/{uid}`.

## Local project picker + VS Code

When running LOOP locally, `npm run dev` also starts a small localhost bridge on `127.0.0.1:8091`. The Sessions page uses it to open the operating system's native folder picker and receive the exact absolute project path. That path is saved in browser local storage and used by the VS Code button through the `vscode://file...` URI.

This native-path feature is intentionally for local development. A normal hosted browser cannot expose a user's absolute filesystem path.


## Production hardening

- Run `npm run check` before shipping.
- Keep `SARVAM_API_KEY` server-side; never prefix it with `VITE_`.
- The local folder/VS Code bridge is intentionally localhost-only and is a development-machine integration. Do not expose port 8091 publicly.
- On Linux, install a native folder picker if needed: `sudo apt install zenity`.
- Vibe uses a deterministic beginner gate for C so an explicit “I don't know” cannot jump directly to mission-specific concepts.
- Learning chats use a new `v4::` storage key so stale advanced conversations from older builds are not silently reused.
