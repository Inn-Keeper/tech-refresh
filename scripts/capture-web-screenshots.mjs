import { mkdir, readFile, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";

const baseUrl = process.argv[2] ?? "http://127.0.0.1:5174/";
const outDir = new URL("../docs/screenshots/web/", import.meta.url);
const chromePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const port = 9229;

function parseEnv(text) {
  return Object.fromEntries(
    text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const [key, ...rest] = line.split("=");
        return [key, rest.join("=").replace(/^['"]|['"]$/g, "")];
      })
  );
}

async function getJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
  return response.json();
}

async function waitForDebugTarget() {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    try {
      const tabs = await getJson(`http://127.0.0.1:${port}/json`);
      const tab = tabs.find((item) => item.type === "page");
      if (tab?.webSocketDebuggerUrl) return tab.webSocketDebuggerUrl;
    } catch {
      // Chrome is still booting.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("Chrome DevTools endpoint did not become available.");
}

function createCdp(wsUrl) {
  const ws = new WebSocket(wsUrl);
  let id = 0;
  const pending = new Map();
  ws.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      const { resolve, reject } = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) reject(new Error(message.error.message));
      else resolve(message.result);
    }
  });
  return new Promise((resolve, reject) => {
    ws.addEventListener("open", () => {
      resolve({
        send(method, params = {}) {
          const callId = ++id;
          ws.send(JSON.stringify({ id: callId, method, params }));
          return new Promise((callResolve, callReject) => pending.set(callId, { resolve: callResolve, reject: callReject }));
        },
        close: () => ws.close(),
      });
    });
    ws.addEventListener("error", reject);
  });
}

async function waitForLoad(cdp) {
  await cdp.send("Runtime.evaluate", {
    expression: "document.readyState === 'complete'",
    awaitPromise: true,
  });
  await new Promise((resolve) => setTimeout(resolve, 900));
}

async function capture(cdp, name) {
  const result = await cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  await writeFile(new URL(`${name}.png`, outDir), Buffer.from(result.data, "base64"));
}

async function clickTab(cdp, label) {
  const expression = `
    (() => {
      const button = [...document.querySelectorAll('button')]
        .find((item) => item.textContent.trim() === ${JSON.stringify(label)});
      if (!button) return false;
      button.click();
      return true;
    })()
  `;
  const result = await cdp.send("Runtime.evaluate", { expression, returnByValue: true });
  if (!result.result.value) throw new Error(`Could not find tab "${label}".`);
  await new Promise((resolve) => setTimeout(resolve, 700));
}

const env = parseEnv(await readFile(new URL("../apps/web/.env", import.meta.url), "utf8"));
const projectRef = new URL(env.VITE_SUPABASE_URL).hostname.split(".")[0];
const authKey = `sb-${projectRef}-auth-token`;
const now = new Date().toISOString();
const fakeSession = {
  access_token: "screenshot-token",
  token_type: "bearer",
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  refresh_token: "screenshot-refresh",
  user: {
    id: "00000000-0000-4000-8000-000000000001",
    aud: "authenticated",
    role: "authenticated",
    email: "demo@grip.local",
    email_confirmed_at: now,
    confirmed_at: now,
    app_metadata: { provider: "email", providers: ["email"] },
    user_metadata: { display_name: "Demo User" },
    identities: [],
    created_at: now,
    updated_at: now,
    is_anonymous: false,
  },
};

await mkdir(outDir, { recursive: true });

const profileDir = join(tmpdir(), `grip-screenshots-${Date.now()}`);
const chrome = spawn(chromePath, [
  "--headless=new",
  `--remote-debugging-port=${port}`,
  `--user-data-dir=${profileDir}`,
  "--window-size=1600,1000",
  "--hide-scrollbars",
  "about:blank",
]);

try {
  const wsUrl = await waitForDebugTarget();
  const cdp = await createCdp(wsUrl);
  await cdp.send("Page.enable");
  await cdp.send("Runtime.enable");
  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width: 1600,
    height: 1000,
    deviceScaleFactor: 1,
    mobile: false,
  });

  await cdp.send("Page.navigate", { url: baseUrl });
  await waitForLoad(cdp);
  await cdp.send("Runtime.evaluate", {
    expression: `localStorage.setItem(${JSON.stringify(authKey)}, ${JSON.stringify(JSON.stringify(fakeSession))})`,
  });
  await cdp.send("Page.reload", { ignoreCache: true });
  await waitForLoad(cdp);

  await capture(cdp, "01-prep");
  await clickTab(cdp, "Stories");
  await capture(cdp, "02-stories");
  await clickTab(cdp, "Arch Board");
  await capture(cdp, "03-arch-board");
  await clickTab(cdp, "Quest");
  await capture(cdp, "04-quest");
  await clickTab(cdp, "Profile");
  await capture(cdp, "05-profile");
  await cdp.send("Runtime.evaluate", { expression: "window.scrollTo(0, document.body.scrollHeight)" });
  await new Promise((resolve) => setTimeout(resolve, 500));
  await capture(cdp, "06-footer");
  cdp.close();
} finally {
  chrome.kill("SIGTERM");
}

console.log(`Saved screenshots to ${outDir.pathname}`);
