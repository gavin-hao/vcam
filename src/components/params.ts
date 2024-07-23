export const VIDEO_SIZE = {
  '640 X 360': { width: 640, height: 360 },
  '1280 X 720': { width: 640, height: 360 },
  '1920 X 1080': { width: 1920, height: 1080 },
} as const;

export interface CameraConfig {
  targetFPS: number;
  sizeOption: keyof typeof VIDEO_SIZE;
  cameraSelector: string;
}
export const STATE = {
  camera: { targetFPS: 60, sizeOption: '1280 X 720', cameraSelector: '' },
  fpsDisplay: { mode: 'model' },
  // backend: '',
  // flags: {},
  // modelConfig: {},
  // visualization: {
  //   foregroundThreshold: 0.5,
  //   maskOpacity: 0.7,
  //   maskBlur: 0,
  //   pixelCellWidth: 10,
  //   backgroundBlur: 3,
  //   edgeBlur: 3,
  // },
};
