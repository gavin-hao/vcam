import {
  type GestureRecognizerResult,
  // DrawingUtils,
  GestureRecognizer,
  FilesetResolver,
} from '@mediapipe/tasks-vision';
type ImageSource = HTMLVideoElement | HTMLCanvasElement | ImageBitmap | ImageData | OffscreenCanvas | VideoFrame;
let elapsedTime = 0;
export class Gesture {
  wasmPath: string;
  modelAssetPath: string;
  gestureRecognizer?: GestureRecognizer;
  constructor(options: { mediapipeVisionWasmPath: string; modelAssetPath: string }) {
    this.wasmPath = options.mediapipeVisionWasmPath;
    this.modelAssetPath = options.modelAssetPath;
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
      // outputCategoryMask: true,
      // outputConfidenceMasks: false,
    });
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
    let ratio = 1000 / 20;
    if (elapsedTime < ratio) {
      // console.log(`skip detect becasuse deltaTime ${elapsedTime} < ${ratio}`, elapsedTime, time, _prevTime);
      // return;
    }
    const result = await this.gestureRecognizer!.recognizeForVideo(videoFrame, performance.now());
    const gestureCategory = await processResult(result);
    callback(gestureCategory, result);
    // console.log('gestureRecognizerResult', result, elapsedTime, time, _prevTime);
    elapsedTime = 0;
  }
}
async function processResult(predictResult: GestureRecognizerResult) {
  if (predictResult.handedness.length > 0) {
    console.log(`GestureRecognizer:`, predictResult);
  }
  if (predictResult.gestures.length > 0) {
    const categoryName = predictResult.gestures[0][0].categoryName;
    const categoryScore = parseFloat((predictResult.gestures[0][0].score * 100).toString()).toFixed(2);
    const handedness = predictResult.handedness[0][0].displayName;
    console.log(`GestureRecognizer: ${categoryName}\n Confidence: ${categoryScore} %\n Handedness: ${handedness}`);
    return categoryName;
  }
  return 'Unknown';
}
