export interface CameraOption {
  /**
   * 摄像头帧率，在某些情况下，比如 WebRTC 上使用受限带宽传输时，低帧率可能更适宜
   */
  targetFPS?: number;
  /**
   * 摄像头分辨率 width
   */
  width?: number;
  /**
   * 摄像头分辨率 height
   */
  height?: number;
  /**
   * 视频图像绘制的canvas，不设置默认返回 vedio
   */
  canvas?: HTMLCanvasElement;
  deviceId?: string;
  videoDevices?: MediaDeviceInfo[];
  // enableOnInactiveState?: boolean;
}
// export const STATE = {
//   camera: { targetFPS: 60, sizeOption: '1280 X 720', cameraSelector: '' },
//   fpsDisplay: { mode: 'model' },
// };
async function getDeviceIdForLabel(cameras: MediaDeviceInfo[], cameraLabel: string) {
  for (let i = 0; i < cameras.length; i++) {
    const camera = cameras[i];
    if (camera.label === cameraLabel) {
      return camera.deviceId;
    }
  }

  return undefined;
}
export async function getVideoInputs() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
    console.log('enumerateDevices() not supported.');
    return [];
  }

  const devices = await navigator.mediaDevices.enumerateDevices();

  const videoDevices = devices.filter((device) => device.kind === 'videoinput');

  return videoDevices;
}
export class Camera {
  video: HTMLVideoElement;
  canvas?: HTMLCanvasElement;
  ctx?: CanvasRenderingContext2D | null;
  // videoDevices?: MediaDeviceInfo[];
  deviceId?: string;
  private stream?: MediaStream;
  constructor(video: HTMLVideoElement, targetCanvas?: HTMLCanvasElement) {
    this.video = video;
    this.canvas = targetCanvas;
    this.ctx = this.canvas?.getContext('2d');
  }

  /**
   * Initiate a Camera instance and wait for the camera stream to be ready.
   * @param option CameraOption
   */
  static async setupCamera(video: HTMLVideoElement, option?: CameraOption) {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('Browser API navigator.mediaDevices.getUserMedia not available');
    }
    const { targetFPS, width, height, deviceId, canvas } = option || {};

    const $size = { width, height };
    let $deviceId = deviceId;
    // const deviceId = await getDeviceIdForLabel(cameras, cameraSelector);
    if (!$deviceId) {
      const cameras = await getVideoInputs();
      $deviceId = cameras[0]?.deviceId;
    }
    const constraints: MediaStreamConstraints = {
      audio: false,
      video: {
        deviceId: { ideal: $deviceId },
        // Only setting the video to a specified size for large screen, on
        // mobile devices accept the default size.
        width: $size.width,
        height: $size.height,
        // facingMode: 'user',
        frameRate: {
          ideal: targetFPS,
        },
      },
    };

    const stream = await navigator.mediaDevices.getUserMedia(constraints);

    const camera = new Camera(video, canvas);
    camera.video.srcObject = stream;
    camera.stream = stream;
    await new Promise((resolve) => {
      camera.video.onloadedmetadata = () => {
        resolve(true);
      };
    });
    camera.deviceId = $deviceId;
    camera.video.play();

    const videoWidth = camera.video.videoWidth;
    const videoHeight = camera.video.videoHeight;
    // Must set below two lines, otherwise video element doesn't show.
    camera.video.width = videoWidth;
    camera.video.height = videoHeight;
    if (camera.canvas) {
      camera.canvas.width = videoWidth;
      camera.canvas.height = videoHeight;
    }
    // Because the image from camera is mirrored, need to flip horizontally.
    camera.ctx?.translate(camera.video.videoWidth, 0);
    camera.ctx?.scale(-1, 1);

    return camera;
  }

  drawToCanvas(canvas: HTMLCanvasElement) {
    this.ctx?.drawImage(canvas, 0, 0, this.video.videoWidth, this.video.videoHeight);
  }

  drawFromVideo(ctx: CanvasRenderingContext2D) {
    ctx.drawImage(this.video, 0, 0, this.video.videoWidth, this.video.videoHeight);
  }

  clearCtx() {
    this.ctx?.clearRect(0, 0, this.video.videoWidth, this.video.videoHeight);
  }
  start() {
    this.video && this.video.play();
  }
  stop() {
    this.stream?.getTracks().forEach((track) => {
      track.stop();
    });
  }
  pause() {
    this.video?.pause();
  }
}
