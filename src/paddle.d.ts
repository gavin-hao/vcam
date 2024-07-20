declare module '@paddlejs-mediapipe/camera' {
  export interface cameraOption {
    width?: number;
    height?: number;
    mirror?: boolean;
    enableOnInactiveState?: boolean;
    targetCanvas?: HTMLCanvasElement;
    onSuccess?: () => void;
    onError?: () => void;
    onNotSupported?: () => void;
    onFrame?: (target: HTMLCanvasElement | HTMLVideoElement) => void;
    switchError?: () => void;
    videoLoaded?: () => void;
  }
  export default class Camera {
    constructor(videoElement: HTMLVideoElement, opt: Partial<cameraOption> = {});
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
