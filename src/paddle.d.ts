declare module '@paddlejs-mediapipe/camera' {
  export interface CameraOption {
    /**
     * 视频流宽度
     */
    width?: number;
    /**
     * 视频流高度
     */
    height?: number;
    /**
     * 是否镜像
     */
    mirror?: boolean;
    /**
     * 当页面处于非激活态时，是否继续捕获 video frame，默认为 false
     */
    enableOnInactiveState?: boolean;
    /**
     * 目标canvas DOM对象
     */
    targetCanvas?: HTMLCanvasElement;
    /**
     * 视频流渲染成功
     * @returns
     */
    onSuccess?: () => void;
    /**
     * 视频流渲染失败
     */
    onError?: NavigatorUserMediaErrorCallback;
    /**
     * 浏览器不支持getUserMedia API
     * @returns
     */
    onNotSupported?: () => void;
    /**
     * 获取视频流每一帧
     * @param canvas
     * @returns
     */
    onFrame?: (target: HTMLCanvasElement | HTMLVideoElement) => void;
    /**
     * 切换摄像头失败
     * @returns
     */
    switchError?: () => void;
    /**
     * 视频加载结束
     * @returns
     */
    videoLoaded?: () => void;
  }
  export default class Camera {
    constructor(videoElement: HTMLVideoElement, opt: Partial<CameraOption> = {});
    start(): void;
    pause(): void;
    switchCameras(): void;
  }
}
declare module '@paddlejs-models/humanseg/lib/index' {
  // export async function load(
  //   options: LoadOptions = {
  //     needPreheat: true,
  //     enableLightModel: false,
  //     canvasWidth: 500,
  //     canvasHeight: 280,
  //   }
  // ): void;
  export async function load(needPreheat?: boolean, enableLightModel?: boolean, customModel?: string): void;
  export async function preheat(): void;
  export async function getGrayValue(input: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement): {
    width: number;
    height: number;
    data: any;
  };
  /**
   * draw human seg
   * @param {Array} seg_values seg values of the input image
   * @param {HTMLCanvasElement} canvas the dest canvas draws the pixels
   * @param {HTMLCanvasElement} backgroundCanvas the background canvas draws the pixels
   */
  export function drawHumanSeg(
    seg_values: number[],
    canvas: HTMLCanvasElement,
    backgroundCanvas?: HTMLCanvasElement | HTMLImageElement
  ): void;
  /**
   * draw human seg
   * @param {HTMLCanvasElement} canvas the dest canvas draws the pixels
   * @param {Array} seg_values seg_values of the input image
   */
  export function blurBackground(seg_values: number[], dest_canvas): void;

  /**
   * draw human mask
   * @param {HTMLImageElement | HTMLVideoElement | HTMLCanvasElement} input the input image
   * @param {HTMLCanvasElement} canvas the dest canvas draws the pixels
   * @param {HTMLCanvasElement} back background canvas
   */
  export async function drawMask(
    input: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement,
    canvas: HTMLCanvasElement,
    back: HTMLCanvasElement
  ): void;
}
