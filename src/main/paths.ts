import { app } from 'electron';
import path from 'path';

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

export { unpackedPath, userDataDir, resourcesBasePath, defaultBackgroundPath, modelBaseDir, backgroundPath, photoPath };
