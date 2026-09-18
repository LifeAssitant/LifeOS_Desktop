const { app, BrowserWindow, Tray, Menu, Notification, nativeImage, ipcMain } = require("electron");
const path = require("path");

const isDev = !app.isPackaged;
let mainWindow = null;
let tray = null;
let pollTimer = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 740,
    minWidth: 880,
    minHeight: 600,
    backgroundColor: "#F7F1EA",
    title: "LifeOS",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
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
  const icon = nativeImage.createEmpty();
  tray = new Tray(icon);
  tray.setToolTip("LifeOS");
  const contextMenu = Menu.buildFromTemplate([
    {
      label: "Show LifeOS",
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      },
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

app.whenReady().then(() => {
  createWindow();
  createTray();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
    else if (mainWindow) mainWindow.show();
  });
});

app.on("before-quit", () => {
  app.isQuitting = true;
  if (pollTimer) clearInterval(pollTimer);
});

app.on("window-all-closed", () => {
  // Keep tray alive on Windows/Linux
  if (process.platform === "darwin") app.quit();
});
