const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("lifeosDesktop", {
  notify: (title, body) => ipcRenderer.invoke("notify", { title, body }),
  getDesktopToken: () => ipcRenderer.invoke("register-desktop-token"),
  openExternal: (url) => ipcRenderer.invoke("open-external", url),
  onAuthUrl: (handler) => {
    const listener = (_event, url) => handler(url);
    ipcRenderer.on("lifeos-auth-url", listener);
    return () => ipcRenderer.removeListener("lifeos-auth-url", listener);
  },
});
