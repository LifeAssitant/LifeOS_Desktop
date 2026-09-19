const {
  app,
  BrowserWindow,
  Tray,
  Menu,
  Notification,
  nativeImage,
  ipcMain,
  screen,
  shell,
} = require("electron");
const fs = require("fs");
const path = require("path");

const isDev = !app.isPackaged;
let mainWindow = null;
let miniWindow = null;
let tray = null;
let pollTimer = null;
let snapTimer = null;

const PROTOCOL = "lifeos";

/* ---------- Mini widget ---------- */

const MINI_WIDTH = 308;
const MINI_HEIGHT = 162;
const MINI_MARGIN = 18;

function stateFile() {
  return path.join(app.getPath("userData"), "window-state.json");
}

function readState() {
  try {
    return JSON.parse(fs.readFileSync(stateFile(), "utf8"));
  } catch {
    return {};
  }
}

function writeState(patch) {
  try {
    fs.writeFileSync(stateFile(), JSON.stringify({ ...readState(), ...patch }), "utf8");
  } catch {
    /* a missing state file just means default placement */
  }
}

function loadRoute(win, hash) {
  if (isDev) win.loadURL(`http://localhost:5173/#/${hash}`);
  else win.loadFile(path.join(__dirname, "../dist/index.html"), { hash });
}

/** Nearest corner of the work area the widget currently sits closest to. */
function cornerFor(bounds) {
  const display = screen.getDisplayMatching(bounds);
  const area = display.workArea;
  const centerX = bounds.x + bounds.width / 2;
  const centerY = bounds.y + bounds.height / 2;
  const right = centerX > area.x + area.width / 2;
  const bottom = centerY > area.y + area.height / 2;
  return {
    x: right ? area.x + area.width - bounds.width - MINI_MARGIN : area.x + MINI_MARGIN,
    y: bottom ? area.y + area.height - bounds.height - MINI_MARGIN : area.y + MINI_MARGIN,
  };
}

function snapMiniToCorner() {
  if (!miniWindow || miniWindow.isDestroyed()) return;
  const bounds = miniWindow.getBounds();
  const corner = cornerFor(bounds);
  if (corner.x !== bounds.x || corner.y !== bounds.y) {
    miniWindow.setBounds({ ...corner, width: bounds.width, height: bounds.height }, true);
  }
  writeState({ miniPosition: corner });
}

function createMiniWindow() {
  if (miniWindow && !miniWindow.isDestroyed()) {
    miniWindow.show();
    miniWindow.focus();
    return;
  }

  const saved = readState().miniPosition;
  const start = cornerFor({
    x: saved?.x ?? 1e6,
    y: saved?.y ?? 1e6,
    width: MINI_WIDTH,
    height: MINI_HEIGHT,
  });

  miniWindow = new BrowserWindow({
    width: MINI_WIDTH,
    height: MINI_HEIGHT,
    x: start.x,
    y: start.y,
    frame: false,
    transparent: true,
    backgroundColor: "#00000000",
    resizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  miniWindow.setAlwaysOnTop(true, "floating");
  miniWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  loadRoute(miniWindow, "mini");

  miniWindow.once("ready-to-show", () => miniWindow.show());

  miniWindow.on("moved", () => {
    if (snapTimer) clearTimeout(snapTimer);
    snapTimer = setTimeout(snapMiniToCorner, 400);
  });

  miniWindow.on("closed", () => {
    miniWindow = null;
  });
}

function enterMiniMode() {
  createMiniWindow();
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.hide();
}

function exitMiniMode({ maximize } = {}) {
  if (miniWindow && !miniWindow.isDestroyed()) {
    miniWindow.close();
    miniWindow = null;
  }
  if (!mainWindow || mainWindow.isDestroyed()) createWindow();
  if (!mainWindow) return;
  if (maximize) mainWindow.maximize();
  else if (mainWindow.isMaximized()) mainWindow.unmaximize();
  mainWindow.show();
  mainWindow.focus();
}

function sendAuthUrl(url) {
  if (!mainWindow) return;
  mainWindow.webContents.send("lifeos-auth-url", url);
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
}

function extractProtocolUrl(argv) {
  return (argv || []).find((arg) => typeof arg === "string" && arg.startsWith(`${PROTOCOL}://`));
}

if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient(PROTOCOL, process.execPath, [
      path.resolve(process.argv[1]),
    ]);
  }
} else {
  app.setAsDefaultProtocolClient(PROTOCOL);
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", (_event, argv) => {
    const url = extractProtocolUrl(argv);
    if (url) sendAuthUrl(url);
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1180,
    height: 760,
    minWidth: 960,
    minHeight: 640,
    backgroundColor: "#EDE8E2",
    title: "LifeOS",
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.setMenu(null);
  mainWindow.setMenuBarVisibility(false);

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
    const bootUrl = extractProtocolUrl(process.argv);
    if (bootUrl) sendAuthUrl(bootUrl);
  });

  if (isDev) {
    mainWindow.loadURL("http://localhost:5173");
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }

  mainWindow.on("close", (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });
}

function createTray() {
  const iconPath = path.join(__dirname, "icon.png");
  let icon = nativeImage.createFromPath(iconPath);
  if (icon.isEmpty()) {
    icon = nativeImage.createEmpty();
  }
  tray = new Tray(icon);
  tray.setToolTip("LifeOS");
  const contextMenu = Menu.buildFromTemplate([
    {
      label: "Show LifeOS",
      click: () => exitMiniMode(),
    },
    {
      label: "Mini widget",
      click: () => enterMiniMode(),
    },
    {
      label: "Quit",
      click: () => {
        app.isQuitting = true;
        app.quit();
      },
    },
  ]);
  tray.setContextMenu(contextMenu);
  tray.on("double-click", () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

function showNativeNotification(title, body) {
  if (!Notification.isSupported()) return;
  const notification = new Notification({ title, body, silent: false });
  notification.show();
  notification.on("click", () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

ipcMain.handle("notify", (_event, payload) => {
  showNativeNotification(payload.title || "LifeOS", payload.body || "");
  return true;
});

ipcMain.handle("register-desktop-token", () => {
  return `desktop-${app.getVersion()}-${process.pid}`;
});

ipcMain.handle("enter-mini", () => {
  enterMiniMode();
  return true;
});

ipcMain.handle("exit-mini", (_event, payload) => {
  exitMiniMode({ maximize: Boolean(payload?.maximize) });
  return true;
});

ipcMain.handle("open-external", async (_event, url) => {
  if (typeof url === "string" && (url.startsWith("https://") || url.startsWith("http://"))) {
    await shell.openExternal(url);
    return true;
  }
  return false;
});

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  createWindow();
  createTray();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
    else if (mainWindow) mainWindow.show();
  });
});

app.on("open-url", (event, url) => {
  event.preventDefault();
  if (url && url.startsWith(`${PROTOCOL}://`)) sendAuthUrl(url);
});

app.on("before-quit", () => {
  app.isQuitting = true;
  if (pollTimer) clearInterval(pollTimer);
  if (snapTimer) clearTimeout(snapTimer);
  if (miniWindow && !miniWindow.isDestroyed()) miniWindow.destroy();
});

app.on("window-all-closed", () => {
  if (process.platform === "darwin") app.quit();
});
