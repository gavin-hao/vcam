import { app, BrowserWindow, ipcMain, Menu, shell } from 'electron';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.mjs
// │
process.env.APP_ROOT = path.join(__dirname, '..');

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL'];
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron');
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist');

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST;

let win: BrowserWindow | null;

function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 720,
    icon: path.join(process.env.VITE_PUBLIC, 'vcam.svg'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
    },
  });

  console.log(process.env, 111111)
  process.env.NODE_ENV !== 'development' && Menu.setApplicationMenu(null);

  // Test active push message to Renderer-process.
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', new Date().toLocaleString());
  });

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    // win.loadFile('dist/index.html')
    win.loadFile(path.join(RENDERER_DIST, 'index.html'));
  }
}

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
    win = null;
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.whenReady().then(() => {
  mkdirDir('photo')
  mkdirDir('background')
  createWindow()
});


// 处理渲染进程发送的事件
ipcMain.on('open-gallery', () => {
  mkdirDir('photo')
  shell.openPath(path.join(process.env.TEMP || __dirname, 'vcam', 'photo'))
  // win && dialog.showOpenDialogSync(win, {
  //   properties: ['openDirectory'],
  //   defaultPath: path.join(process.env.TEMP || __dirname, 'vcam', 'photo'),
  //   filters: [
  //     { name: 'Images', extensions: ['jpg', 'png', 'gif'] }
  //   ]
  // })
});

function mkdirDir(name: string) {
  const directory = path.join(process.env.TEMP || __dirname, 'vcam', name);
  fs.access(directory, fs.constants.F_OK, (err) => {
    if (err) {
      fs.mkdir(directory, { recursive: true }, (mkdirErr) => {
        if (mkdirErr) {
          console.error(mkdirErr);
          return;
        }
      });
    }
  });
}

ipcMain.on('upload-file', (event, fileData, fileName) => {
  console.log(99999999);
  const buffer = Buffer.from(fileData);
  mkdirDir('background');
  const filePath = path.join(process.env.TEMP || __dirname, 'vcam', 'background', fileName);
  console.log(filePath, 'fi');
  fs.writeFile(filePath, buffer, (err) => {
    if (err) {
      console.error(err, 22222);
    } else {
      getMessageList(event);
    }
  });
});

ipcMain.on('save-image', (event, imageData, fileName) => {
  console.log(event, imageData)
  const buffer = Buffer.from(imageData.replace("data:image/jpeg;base64,", ""), 'base64');
  mkdirDir('photo');
  const filePath = path.join(process.env.TEMP || __dirname, 'vcam', 'photo', fileName);
  fs.writeFile(filePath, buffer, { encoding: 'base64' }, (err) => {
    if (err) {
      console.error(err, 22222);
    } else {
      getMessageList(event);
    }
  });
});

function getMessageList(event: any) {
  const directoryPath = path.join(process.env.TEMP || __dirname, 'vcam', 'background');
  fs.readdir(directoryPath, (err, files) => {
    if (err) {
      return console.log('读取文件夹出错:', err);
    }
    const exts = ['.jpg', '.jpeg', '.png', '.webp'];
    const imgs = files.filter((file) => {
      return !/(^|\/)\.[^\/\.]/g.test(file) && exts.includes(path.extname(file));
    });
    event.reply('receive', imgs);

    // event.reply('receive', files.map((item) => path.join(__dirname, 'upload', item)))
    console.log(imgs, 111111111111111);
    // ipcMain.emit('imageList', files)
  });
}

ipcMain.on('get-image-list', (event) => {
  mkdirDir('background');
  getMessageList(event);
});
