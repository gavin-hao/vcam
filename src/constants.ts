export const ipcMessage = {
  addBackgroundImage: 'api:addBackgroundImage',
  removeBackgroundImage: 'api:removeBackgroundImage',
  openPhotosDir: 'api:openPhotosDir',
  savePhoto: 'api:savePhoto',
  getBackgroundImages: 'api:getBackgroundImages',
  onBackgroundImageUpdate: 'api:onBackgroundImageUpdate',
  getModelFiles: 'api:getModelFiles',
} as const;
