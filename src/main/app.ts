import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron';
import fs from 'fs-extra';
import path from 'path';
import crypto from 'crypto';
import { ipcMessage } from '../constants';
import { is } from '@electron-toolkit/utils';

// let ExePath = process.cwd();

// if (os.platform() !== 'win32') {
//   // electron on mac execpath
//   if (process.cwd() === '/' && process.resourcesPath) {
//     ExePath = path.dirname(process.resourcesPath);
//   }
// }
let cwd = process.cwd();

if (app.isPackaged) {
  cwd = process.resourcesPath;
}
let unpackedPath = path.join(cwd, './app.asar.unpacked');
// 用于存放 用户数据 （上传的背景图，拍照保存的图片）
let userDataDir = app.getPath('userData');

//用于判断处于开发环境
if (!app.isPackaged) {
  // 开发环境将该目录指向 项目根目录
  unpackedPath = cwd;
  // 开发环境 将文件存储位置指向 {项目根目录}/.vcam
  userDataDir = path.join(cwd, '.vcam');
}
// console.log('userDataDir', userDataDir);
//存放静态资源的目录（exe,.node ,img, model.json,etc...）
//default path [应用程序根目录]/resources
const resourcesBasePath = path.join(unpackedPath, 'resources');
const defaultBackgroundPath = path.join(resourcesBasePath, 'default_bgimgs');
const modelBaseDir = path.join(resourcesBasePath, 'models');

//用户背景图 和 照片 存储位置
const backgroundPath = path.join(userDataDir, 'bgimgs');
const photoPath = path.join(userDataDir, 'photos');

const getHash = (data: crypto.BinaryLike) => {
  const md5sum = crypto.createHash('md5');
  md5sum.update(data);
  return md5sum.digest('hex');
};
const setBackgroundImage = async (mainWindow: BrowserWindow) => {
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png'] }],
    properties: ['openFile', 'multiSelections'],
  });
  if (canceled) {
    return;
  }
  fs.ensureDirSync(backgroundPath);
  for (let f of filePaths) {
    const bf = fs.readFileSync(f);
    const ext = path.extname(f);
    const filename = `${getHash(bf)}${ext}`;
    const filePath = path.join(backgroundPath, filename);
    fs.copyFileSync(f, filePath);
  }
  getBackgroundImages(mainWindow);
};
const savePhoto = (base64Data: string) => {
  fs.ensureDirSync(photoPath);
  const buffer = Buffer.from(base64Data.replace(/^data:image\/\w+;base64,/, ''), 'base64');
  const filename = `${Date.now()}.jpeg`;
  const filePath = path.join(photoPath, filename);
  fs.writeFile(filePath, buffer);
};
async function getImagesInDirectory(directoryPath: string): Promise<string[]> {
  try {
    const files = await fs.readdir(directoryPath);
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp'];
    const imageFiles = files.filter((file) => imageExtensions.includes(path.extname(file)));
    return imageFiles;
  } catch (error) {
    console.error(`Error reading directory: ${error}`);
    return [];
  }
}
const getBackgroundImages = async (mainWindow: BrowserWindow) => {
  fs.ensureDirSync(defaultBackgroundPath);
  fs.ensureDirSync(backgroundPath);
  const defaultImgs = await getImagesInDirectory(defaultBackgroundPath);
  const userImgs = await getImagesInDirectory(backgroundPath);

  let defaultImgPaths = defaultImgs.map((file) => path.resolve(defaultBackgroundPath, file));
  let userImgPaths = userImgs.map((file) => path.resolve(backgroundPath, file));
  //开发环境HMR ,此时需要 给路径添加 “@fs/”
  // @see https://cn.vitejs.dev/config/server-options.html#server-fs-allow
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    userImgPaths = userImgPaths.map((file) => path.join('/@fs/', file));
    defaultImgPaths = defaultImgPaths.map((file) => path.join('/@fs/', file));
  }

  // return absoluteImagePaths;
  const imgs = {
    default: defaultImgPaths,
    user: userImgPaths,
  };
  console.log(imgs);

  mainWindow.webContents.send(ipcMessage.onBackgroundImageUpdate, imgs);
};
const openPhotosDirectory = async () => {
  await shell.openPath(photoPath);
};
const getModels = async () => {
  const paths = await fs.readdir(modelBaseDir);

  let modelAbsolutePaths = paths.map((p) => {
    return { path: path.resolve(modelBaseDir, p), key: p };
  });
  console.log(modelAbsolutePaths, process.env['ELECTRON_RENDERER_URL'],'paths')
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    modelAbsolutePaths = modelAbsolutePaths.map((p) => {
      return { path: process.env['ELECTRON_RENDERER_URL'] + path.join('/@fs/', p.path), key: p.key };
    });
  }
  console.log(modelAbsolutePaths, 1111)
  return modelAbsolutePaths;
};
export default class Application {
  mainWindow: BrowserWindow;
  constructor(mainWindow: BrowserWindow) {
    this.mainWindow = mainWindow;
  }
  run() {
    ipcMain.handle(ipcMessage.addBackgroundImage, () => setBackgroundImage(this.mainWindow));
    ipcMain.on(ipcMessage.savePhoto, (_event, base64) => savePhoto(base64));
    ipcMain.on(ipcMessage.openPhotosDir, () => openPhotosDirectory());
    ipcMain.on(ipcMessage.getBackgroundImages, () => getBackgroundImages(this.mainWindow));
    ipcMain.handle(ipcMessage.getModelFiles, () => getModels());
  }
}
