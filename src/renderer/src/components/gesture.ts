import {
  type GestureRecognizerResult,
  // DrawingUtils,
  GestureRecognizer,
  FilesetResolver,
  DrawingUtils,
} from '@mediapipe/tasks-vision';
import { getCanvasSize, getInputSize } from './renderUtils';
type ImageSource = HTMLVideoElement | HTMLCanvasElement | ImageBitmap | ImageData | OffscreenCanvas | VideoFrame;
let elapsedTime = 0;

export class Gesture {
  wasmPath: string;
  modelAssetPath: string;
  gestureRecognizer?: GestureRecognizer;
  domContainer: HTMLElement;
  showHandsKeypoints: boolean;
  private canvas?: HTMLCanvasElement = undefined;
  private canvasCtx?: CanvasRenderingContext2D;
  running: boolean = false;
  constructor(options: {
    mediapipeVisionWasmPath: string;
    modelAssetPath: string;
    renderContainer: HTMLElement;
    showHandsKeypoints: boolean;
  }) {
    this.wasmPath = options.mediapipeVisionWasmPath;
    this.modelAssetPath = options.modelAssetPath;
    this.domContainer = options.renderContainer;
    this.showHandsKeypoints = options.showHandsKeypoints || false;
    if (this.showHandsKeypoints) {
      this.createRenderCanvas();
      this.canvasCtx = this.canvas!.getContext('2d')!;
    }
  }
  async load() {
    const vision = await FilesetResolver.forVisionTasks(this.wasmPath);
    this.gestureRecognizer = await GestureRecognizer.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: this.modelAssetPath,
        // modelAssetPath:
        //   'https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task',
        delegate: 'GPU',
      },
      runningMode: 'VIDEO',
      numHands: 2,
      cannedGesturesClassifierOptions: {
        categoryAllowlist: ['Closed_Fist', 'Open_Palm', 'Pointing_Up', 'Thumb_Up', 'Victory'],
      },
      // outputCategoryMask: true,
      // outputConfidenceMasks: false,
    });
    this.running = true;
  }
  private createRenderCanvas() {
    this.canvas = document.createElement('canvas');
    this.canvas.id = 'gesture';
    this.canvas.style.position = 'absolute';
    this.canvas.style.zIndex = '100';
    this.canvas.style.pointerEvents = 'none';
    this.domContainer.appendChild(this.canvas);
  }
  async signal(run: boolean) {
    this.running = run;
  }
  async recognizeForVideo(
    videoFrame: ImageSource,
    callback: (gesture: string, originResult?: GestureRecognizerResult) => void,
    _prevTime: number = performance.now()
  ) {
    if (!this.gestureRecognizer) {
      await this.load();
    }

    let time = performance.now();
    elapsedTime += time - _prevTime;
    let ratio = 16.7; //1000 / 20;
    if (elapsedTime < ratio || !this.running) {
      // console.log(`skip detect becasuse deltaTime ${elapsedTime} < ${ratio}`, elapsedTime, time, _prevTime);
      if (!this.running && this.showHandsKeypoints && this.canvas != null) {
        this.canvasCtx?.clearRect(0, 0, this.canvas!.width, this.canvas!.height);
      }
      return;
    }
    // 绘制手部
    if (this.showHandsKeypoints) {
      this.canvas == undefined && this.createRenderCanvas();
      const [height, width] = getInputSize(videoFrame);
      this.canvas!.width = width;
      this.canvas!.height = height;
      const { width: containerWidth, height: containerHeight } = this.domContainer.getBoundingClientRect();
      const { scale, xOffset, yOffset } = getCanvasSize(containerWidth, containerHeight, width, height);
      this.canvas!.style.transformOrigin = 'top left';
      this.canvas!.style.transform = `scale(${scale}) translate( ${xOffset}px, ${yOffset}px )`;
      this.canvasCtx?.translate(width, 0);
      this.canvasCtx?.scale(-1, 1);
    }
    const result = await this.gestureRecognizer!.recognizeForVideo(videoFrame, performance.now());
    const gestureCategory = await this.processResult(result);
    callback(gestureCategory, result);
    // console.log('gestureRecognizerResult', result, elapsedTime, time, _prevTime);
    elapsedTime = 0;
  }
  // 用于暂存一些手势
  private tempGestures: string[] = [];
  // 某种手势被激活 开始持续追踪
  private gestureActivitedTime: number = 0;
  // 是否有正在激活状态的手势识别
  private mutex = false;
  /**
   *
   * @param predictResult
   * @returns
   */
  private async processResult(predictResult: GestureRecognizerResult) {
    // Sort by right to left hands.
    if (this.showHandsKeypoints) {
      this.canvasCtx!.save();
      this.canvasCtx!.clearRect(0, 0, this.canvas!.width, this.canvas!.height);
      const drawingUtils = new DrawingUtils(this.canvasCtx!);
      if (predictResult.landmarks) {
        for (const i in predictResult.landmarks) {
          let landmarks = predictResult.landmarks[i];
          let isLeftHands = predictResult.handedness[i][0].categoryName === 'Left';
          drawingUtils.drawConnectors(landmarks, GestureRecognizer.HAND_CONNECTIONS, {
            color: isLeftHands ? '#00FF0080' : '#0000FF80',
            lineWidth: 5,
          });
          drawingUtils.drawLandmarks(landmarks, {
            color: '#FF000080',
            lineWidth: 2,
          });
        }
      }
      this.canvasCtx?.restore();
    }
    if (predictResult.handedness.length > 0) {
      // console.log(`GestureRecognizer:`, predictResult);
    }
    if (predictResult.gestures.length > 0) {
      const categoryName = predictResult.gestures[0][0].categoryName;
      if (!this.mutex && this.gestureActivitedTime === 0 && ['Thumb_Up', 'Victory'].includes(categoryName)) {
        //第一次识别到 该手势
        this.gestureActivitedTime = performance.now();
        this.tempGestures.push(categoryName);
        this.mutex = true;
      } else {
        //监听的持续时间内 满足 一定的条件
        if (performance.now() - this.gestureActivitedTime < 500) {
          if (['Thumb_Up', 'Victory'].includes(categoryName)) {
            this.tempGestures.push(categoryName);
          }
          if (this.tempGestures.length > 4) {
            //本次识别成功
            let res = this.tempGestures[0];
            this.tempGestures = [];
            this.gestureActivitedTime = 0;
            this.mutex = false;
            return res;
          }
        } else {
          // 取消本次识别 ，恢复监听状态
          this.tempGestures = [];
          this.gestureActivitedTime = 0;
          this.mutex = false;
        }
      }
      const categoryScore = parseFloat((predictResult.gestures[0][0].score * 100).toString()).toFixed(2);
      const handedness = predictResult.handedness[0][0].displayName;
      console.log(`GestureRecognizer: ${categoryName}\n Confidence: ${categoryScore} %\n Handedness: ${handedness}`);
      // return categoryName;
    }
    return 'Unknown';
  }
}

/**
 * {
    "gestures": [
        [
            {
                "score": 0.6544890403747559,
                "index": -1,
                "categoryName": "Closed_Fist",
                "displayName": ""
            }
        ],
        [
            {
                "score": 0.5339264273643494,
                "index": -1,
                "categoryName": "None",
                "displayName": ""
            }
        ]
    ],
    "landmarks": [
        [
            {
                "x": 0.14579541981220245,
                "y": 1.0559313297271729,
                "z": -5.13255372425192e-7,
                "visibility": 0
            },
            {
                "x": 0.26390889286994934,
                "y": 1.0243093967437744,
                "z": -0.014113694429397583,
                "visibility": 0
            },

        ],
        [
            {
                "x": 1.0541664361953735,
                "y": 0.9165997505187988,
                "z": -9.273019259126158e-7,
                "visibility": 0
            },
            {
                "x": 0.9460828304290771,
                "y": 0.9067131876945496,
                "z": -0.016115723177790642,
                "visibility": 0
            },

        ]
    ],
    "worldLandmarks": [
        [
            {
                "x": -0.05646215379238129,
                "y": 0.0765230804681778,
                "z": 0.0184783935546875,
                "visibility": 0
            },
            {
                "x": -0.013927144929766655,
                "y": 0.06979075074195862,
                "z": 0.0163421630859375,
                "visibility": 0
            },
            ...
        ],
        [
            {
                "x": 0.052488718181848526,
                "y": 0.042068902403116226,
                "z": 0.058990478515625,
                "visibility": 0
            },
            {
                "x": 0.016139071434736252,
                "y": 0.037686556577682495,
                "z": 0.052520751953125,
                "visibility": 0
            },
            ...
        ]
    ],
    "handedness": [
        [
            {
                "score": 0.9892578125,
                "index": 0,
                "categoryName": "Right",
                "displayName": "Right"
            }
        ],
        [
            {
                "score": 0.9911651611328125,
                "index": 1,
                "categoryName": "Left",
                "displayName": "Left"
            }
        ]
    ],
    "handednesses": [
        [
            {
                "score": 0.9892578125,
                "index": 0,
                "categoryName": "Right",
                "displayName": "Right"
            }
        ],
        [
            {
                "score": 0.9911651611328125,
                "index": 1,
                "categoryName": "Left",
                "displayName": "Left"
            }
        ]
    ]
}
 */
