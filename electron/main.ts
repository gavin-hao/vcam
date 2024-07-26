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
  console.log(VITE_DEV_SERVER_URL, MAIN_DIST, RENDERER_DIST, __dirname, 1111)
  win = new BrowserWindow({
    width: 1280,
    height: 720,
    icon: path.join(RENDERER_DIST, 'vcam2.ico'),
    webPreferences: {
      webSecurity: false,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  process.env.NODE_ENV !== 'development' && Menu.setApplicationMenu(null);

  // Test active push message to Renderer-process.
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('load-finish', process.env.VITE_PUBLIC);
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
});

ipcMain.on('delete-image', (event, image) => {
  fs.unlink(image, (err) => {
    if (err) {
      console.error('文件删除失败:', err);
      return;
    }
    getMessageList(event);
    console.log('文件删除成功');
  });
});

function mkdirDir(name: string) {
  let directory
  if (name === 'background') {
    directory = path.join(process.env.TEMP || __dirname, 'vcam', name);
    // directory = path.join(__dirname, 'upload');
  } else {
    directory = path.join(process.env.TEMP || __dirname, 'vcam', name);
  }
  fs.access(directory, fs.constants.F_OK, (err) => {
    if (err) {
      fs.mkdir(directory, { recursive: true }, (mkdirErr) => {
        if (mkdirErr) {
          console.error(mkdirErr);
          return;
        } else {
          fs.chmod(directory, 0o777, (error) => {
            if (error) {
              return console.error(`设置权限出错: ${error}`);
            }
            console.log('权限设置成功');
          });
        }
      });
    }
  });
}

ipcMain.on('upload-file', (event, fileData, fileName) => {
  console.log(99999999);
  const buffer = Buffer.from(fileData);
  mkdirDir('background');
  const filePath = path.join(process.env.TEMP || __dirname, 'vcam', 'background', fileName.replace(/^.+?\./, new Date().getTime() + '.'));
  // const filePath = path.join(__dirname, 'upload', fileName.replace(/^.+?\./, new Date().getTime() + '.'));
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
  // const directoryPath = path.join(__dirname, 'upload'); // 替换为你的文件夹路径
  fs.readdir(directoryPath, (err, files) => {
    if (err) {
      return console.log('读取文件夹出错:', err);
    }
    const exts = ['.jpg', '.jpeg', '.png', '.webp'];
    const imgs = files.filter((file) => {
      return !/(^|\/)\.[^\/\.]/g.test(file) && exts.includes(path.extname(file));
    }).map((img) =>  directoryPath + '/' + img);
    event.reply('receive', imgs);
  });
}

ipcMain.on('get-image-list', (event) => {
  mkdirDir('background');
  getMessageList(event);
});
