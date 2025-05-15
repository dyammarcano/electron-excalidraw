// main.js
const { app, BrowserWindow, session } = require('electron');
const path = require('path');

function createWindow () {
  // Crea la ventana del navegador.
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webviewTag: false, // Deshabilitar si no se usa
      navigateOnDragDrop: false, // Prevenir navegación por arrastrar y soltar
      // preload: path.join(__dirname, 'preload.js'), // Opcional, para comunicación segura y controlada con Node.js
    }
  });

  // Carga el index.html de tu aplicación.
  mainWindow.loadFile('index.html');

  // Opcional: Abrir DevTools para depuración.
  mainWindow.webContents.openDevTools();
}

app.whenReady().then(() => {
  // 1. Implementar Política de Seguridad de Contenido (CSP)
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
       'Content-Security-Policy': [
          // "default-src 'self' data: blob:;",
          "script-src 'self' 'unsafe-inline';", 
          "style-src 'self' 'unsafe-inline';",
          "img-src 'self' data: blob:;",
          // "font-src 'self' data: file:;", 
          "font-src *;", 
          "connect-src 'none';",
          "object-src 'none';",
          "frame-src 'none';",
          "media-src 'none';"
        ].join(' ')
      }
    });
  });

  // 2. Bloqueo de Solicitudes de Red (Permitir solo file://)
  session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
    const requestUrl = new URL(details.url);
    // Intenta obtener la URL que originó esta solicitud.
    // details.initiator puede ser null o una cadena vacía para navegaciones de nivel superior o contextos no estándar.
    const initiator = details.initiator; 
  
    let allowRequest = false;
  
    if (requestUrl.protocol === 'file:' || requestUrl.protocol === 'devtools:') {
      allowRequest = true;
    } else if (initiator && initiator.startsWith('devtools://') && requestUrl.hostname === 'chrome-devtools-frontend.appspot.com') {
      // Permite que DevTools cargue sus propios recursos desde su CDN oficial.
      allowRequest = true;
       console.log(`HARDENING: Permitida solicitud de DevTools a CDN: ${requestUrl.href}`); // Para depuración
    }
  
    if (allowRequest) {
      callback({ cancel: false }); // Permite la solicitud
    } else {
      console.log(`HARDENING: Bloqueada solicitud no local: ${requestUrl.href} (Initiator: ${initiator || 'N/A'})`);
      callback({ cancel: true }); // Bloquea la solicitud
    }
  });

  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});
