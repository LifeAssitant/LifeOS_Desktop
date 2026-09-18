const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("lifeosDesktop", {
  notify: (title, body) => ipcRenderer.invoke("notify", { title, body }),
  getDesktopToken: () => ipcRenderer.invoke("register-desktop-token"),
});
