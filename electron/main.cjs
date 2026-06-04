const { app, BrowserWindow, shell, Menu, dialog } = require("electron");
const path = require("node:path");
const fs = require("node:fs");
const { spawn, execFile } = require("node:child_process");
const http = require("node:http");
const net = require("node:net");

const isDev = !app.isPackaged;
let PORT = Number(process.env.PORT) || (isDev ? 3500 : 3789);
let serverProc = null;
let mainWindow = null;
let appOrigin = "";

// Single-instance lock — a second launch focuses the existing window instead of
// spawning a second server that fights for the port.
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

/**
 * Per-user writable data dir (%APPDATA%/Own Wiki). The bundled app dir is read-only,
 * so vault + vectors + mcp config must live here. Seed from the bundled starter vault
 * on first run so a fresh install opens with the example pages, and every install
 * keeps its own data across upgrades.
 */
function ensureUserData() {
  const dataRoot = app.getPath("userData");
  const seededFlag = path.join(dataRoot, ".seeded");
  try {
    fs.mkdirSync(path.join(dataRoot, "data"), { recursive: true });
    if (!fs.existsSync(seededFlag)) {
      const bundledVault = path.join(process.resourcesPath, "app", ".next", "standalone", "vault");
      const destVault = path.join(dataRoot, "vault");
      if (fs.existsSync(bundledVault) && !fs.existsSync(destVault)) {
        fs.cpSync(bundledVault, destVault, { recursive: true });
      }
      fs.writeFileSync(seededFlag, new Date().toISOString());
    }
  } catch (e) {
    console.error("[seed] failed:", e);
  }
  return dataRoot;
}

function findFreePort(start) {
  return new Promise((resolve) => {
    const srv = net.createServer();
    srv.once("error", () => resolve(findFreePort(start + 1)));
    srv.once("listening", () => {
      const p = srv.address().port;
      srv.close(() => resolve(p));
    });
    srv.listen(start, "127.0.0.1");
  });
}

function waitForServer(url, timeoutMs = 45000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tick = () => {
      const req = http.get(url, (res) => {
        res.resume();
        // ANY HTTP response means the server is listening and serving pages.
        // A non-200 here (e.g. health 503 because Ollama is down) is a degraded
        // subsystem, NOT a server-readiness failure — the app is fully usable
        // via cloud providers, so load the window regardless. Gating on 200
        // would wedge the whole app shut whenever Ollama isn't running.
        return resolve();
      });
      req.on("error", () => {
        if (Date.now() - start > timeoutMs) return reject(new Error("server timeout"));
        setTimeout(tick, 400);
      });
    };
    tick();
  });
}

async function startServer() {
  if (isDev) return;
  PORT = await findFreePort(PORT);
  const dataRoot = ensureUserData();
  const standaloneDir = path.join(process.resourcesPath, "app", ".next", "standalone");
  const serverFile = path.join(standaloneDir, "server.js");
  const env = {
    ...process.env,
    ELECTRON_RUN_AS_NODE: "1",
    PORT: String(PORT),
    HOSTNAME: "127.0.0.1",
    OWN_WIKI_DATA: dataRoot, // route vault + vectors + mcp.json to per-user writable dir
  };
  serverProc = spawn(process.execPath, [serverFile], {
    cwd: standaloneDir,
    env,
    stdio: ["ignore", "inherit", "inherit"],
  });
  serverProc.on("error", (e) => console.error("[server] spawn error:", e));
  serverProc.on("exit", (code, sig) => console.error(`[server] exited code=${code} sig=${sig}`));
  await waitForServer(`http://127.0.0.1:${PORT}/api/health`, 45000);
}

function killServer() {
  if (!serverProc || serverProc.killed) return;
  const pid = serverProc.pid;
  try {
    if (process.platform === "win32") {
      execFile("taskkill", ["/pid", String(pid), "/T", "/F"], () => {});
    } else {
      serverProc.kill("SIGTERM");
      setTimeout(() => {
        try {
          serverProc.kill("SIGKILL");
        } catch {}
      }, 3000);
    }
  } catch {}
  serverProc = null;
}

async function createWindow() {
  await startServer();
  appOrigin = `http://127.0.0.1:${PORT}`;

  mainWindow = new BrowserWindow({
    width: 1500,
    height: 940,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: "#08090f",
    titleBarStyle: "default",
    icon: path.join(__dirname, "..", "build", "icon.ico"),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
    },
  });

  // External links open in the OS browser — only safe http(s) schemes.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    try {
      const u = new URL(url);
      if (u.protocol === "http:" || u.protocol === "https:") shell.openExternal(url);
    } catch {}
    return { action: "deny" };
  });

  // Block the main renderer from navigating away from the app origin.
  mainWindow.webContents.on("will-navigate", (e, url) => {
    try {
      if (new URL(url).origin !== appOrigin) {
        e.preventDefault();
        const u = new URL(url);
        if (u.protocol === "http:" || u.protocol === "https:") shell.openExternal(url);
      }
    } catch {
      e.preventDefault();
    }
  });

  await mainWindow.loadURL(appOrigin);
  if (!isDev) Menu.setApplicationMenu(null);
}

app.whenReady().then(() =>
  createWindow().catch((e) => {
    dialog.showErrorBox(
      "Own Wiki failed to start",
      `The local server did not come up.\n\n${e?.message || e}\n\nMake sure Ollama is installed and running, then relaunch.`,
    );
    killServer();
    app.quit();
  }),
);

app.on("window-all-closed", () => {
  killServer();
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow().catch(() => {});
});

app.on("before-quit", killServer);
process.on("exit", killServer);
