const { app, BrowserWindow, shell, Menu } = require("electron");
const path = require("node:path");
const { spawn } = require("node:child_process");
const http = require("node:http");

const isDev = !app.isPackaged;
const PORT = process.env.PORT || (isDev ? 3500 : 3789);
let serverProc = null;
let mainWindow = null;

async function waitForServer(url, timeoutMs = 30000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tick = () => {
      const req = http.get(url, (res) => {
        res.resume();
        if (res.statusCode && res.statusCode < 500) return resolve();
        if (Date.now() - start > timeoutMs) return reject(new Error("server timeout"));
        setTimeout(tick, 400);
      });
      req.on("error", () => {
        if (Date.now() - start > timeoutMs) return reject(new Error("server timeout"));
        setTimeout(tick, 400);
      });
    };
    tick();
  });
}

function startServer() {
  if (isDev) return Promise.resolve();
  const standaloneDir = path.join(process.resourcesPath, "app", ".next", "standalone");
  const serverFile = path.join(standaloneDir, "server.js");
  process.env.PORT = String(PORT);
  process.env.HOSTNAME = "127.0.0.1";
  const nodeBin = process.execPath;
  serverProc = spawn(nodeBin, [serverFile], {
    cwd: standaloneDir,
    env: { ...process.env, ELECTRON_RUN_AS_NODE: "1" },
    stdio: ["ignore", "inherit", "inherit"],
  });
  return waitForServer(`http://127.0.0.1:${PORT}/api/health`, 45000);
}

async function createWindow() {
  await startServer();

  mainWindow = new BrowserWindow({
    width: 1500,
    height: 940,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: "#050608",
    titleBarStyle: "default",
    icon: path.join(__dirname, "..", "public", "logo.svg"),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.loadURL(`http://127.0.0.1:${PORT}`);

  if (!isDev) {
    Menu.setApplicationMenu(null);
  }
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (serverProc) serverProc.kill();
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

app.on("before-quit", () => {
  if (serverProc) serverProc.kill();
});
