const { app, BrowserWindow } = require("electron/main");
const path = require("path");

app.whenReady().then(() => {
  const window = new BrowserWindow({
    height: 720,
    width: 1280,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  window.menuBarVisible = false;
  window.webContents.openDevTools();

  window.loadFile(path.join(__dirname, "/dist/index.html"));
});
