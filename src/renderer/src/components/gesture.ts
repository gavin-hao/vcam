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
class DirectiveProcess {
  private directive: 'Victory' | 'SlideRght' | 'SlideLeft' | null = null;
  private count = 0;
  activatedTime: number = 0;
  timer: ReturnType<typeof setTimeout> | null = null;
  interval: number;

  constructor(interval: number = 500) {
    this.interval = interval;
  }
  tryActiveDirective(
    directive: 'Victory' | 'SlideRght' | 'SlideLeft',
    threshold: number = 3
  ): 'pending' | 'success' | 'canceled' {
    if (this.directive == null) {
      this.directive = directive;
      this.count++;
      this.activatedTime = performance.now();
      this.startTimer();
      console.log(`Victory pending ${this.activatedTime} , count: ${this.count}`);
      return 'pending';
    } else {
      const tick = performance.now() - this.activatedTime;
      if (this.directive === directive && tick < this.interval) {
        this.count++;
        if (this.count >= threshold) {
          return 'success';
        }
        console.log(`Victory pending ${this.activatedTime} , count: ${this.count},tick:${tick}`);
        return 'pending';
      } else {
        console.log(`Victory canceled ${this.activatedTime} , count: ${this.count},tick:${tick}`);
        return 'canceled';
      }
    }
  }
  private startTimer() {
    this.clearTimer();
    let cbFn = this.reset.bind(this);
    this.timer = setTimeout(() => {
      cbFn();
    }, this.interval);
  }
  private clearTimer() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
  reset() {
    console.log(`Directive [${this.directive}] canceled ${this.activatedTime} , count: ${this.count}`);

    this.directive = null;
    this.activatedTime = 0;
    this.count = 0;
  }
  get currentDirective() {
    return this.directive;
  }
}
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
      // cannedGesturesClassifierOptions: {
      //   categoryAllowlist: ['Closed_Fist', 'Open_Palm', 'Pointing_Up', 'Thumb_Up', 'Victory'],
      // },
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

  // 当前正在处理中的指令
  private currentProcess: DirectiveProcess = new DirectiveProcess();
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

    if (predictResult.gestures.length > 0) {
      let rightHandIndex = predictResult.handedness.findIndex((hand) => hand[0].categoryName === 'Right');
      let gestures = predictResult.gestures;
      // 如果存在右手 则只检测右手
      if (rightHandIndex > -1) {
        gestures = [predictResult.gestures[rightHandIndex]];
      }
      // 进入拍照手势判定逻辑
      for (const i in gestures) {
        const categoryName = gestures[i][0].categoryName;
        const score = gestures[i][0].score;
        const handedness = predictResult.handedness[i][0].displayName;

        console.log(`GestureRecognizer: ${categoryName}\n Confidence: ${score} %\n Handedness: ${handedness}`);
        //'Thumb_Up', 'Victory' 连续3次识别成功 score>0.4 激活拍照
        if (categoryName === 'Victory' || (categoryName === 'Thumb_Up' && score > 0.65)) {
          const directiveResult = this.currentProcess.tryActiveDirective('Victory', 4);
          if (directiveResult === 'success') {
            return 'Victory';
          } else if (directiveResult === 'canceled') {
            continue;
          } else {
            // pending 状态 则 直接跳出循环 等待下一次检测结果
            break;
          }
        }
      }
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
