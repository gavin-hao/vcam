// import { ImageSegmenter, FilesetResolver, GestureRecognizer, DrawingUtils } from '@mediapipe/tasks-vision';
// const mediapipe = require('@mediapipe/tasks-vision');
// console.log('mediapipe', mediapipe);
// const path = require('path');
// let cwd = process.cwd();
// console.log('process', process);
// if (process.env.NODE_ENV !== 'development') {
//   cwd = process.resourcesPath;
// }
// let unpackedPath = path.join(cwd, './app.asar.unpacked');
// if (process.env.NODE_ENV === 'development') {
//   // 开发环境将该目录指向 项目根目录
//   unpackedPath = cwd;
//   // 开发环境 将文件存储位置指向 {项目根目录}/.vcam
// }
const mediapipeUrl = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3'; //path.join('/@fs/', unpackedPath, 'node_modules', '@mediapipe/tasks-vision/vision_bundle.cjs');
// importScripts('../../../../node_modules/@mediapipe/tasks-vision');
importScripts(mediapipeUrl);
const { ImageSegmenter, FilesetResolver, GestureRecognizer, DrawingUtils } = self;
// import modelAssetPath from '../../../../resources/gesture-models/gesture_recognizer.task?url';

// import mediapipeWasm from '../assets/wasm';
// console.log('mediapipeWasm', mediapipeWasm);
class Message {
  action: string;
  data: any;
  constructor(action: 'initilized' | 'predictResult', data?: any) {
    this.action = action;
    this.data = data;
  }
  toString() {
    return `{action:${this.action}, data:${this.data?.toString()}}`;
  }
}

let gestureRecognizer: GestureRecognizer;
// let wasmPath;
const createImageSegmenter = async (wasmPath) => {
  //const mediapipeWasm =  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm'; //await window.api.getMediapipeWasmPath();

  const vision = await FilesetResolver.forVisionTasks(wasmPath);
  gestureRecognizer = await GestureRecognizer.createFromOptions(vision, {
    baseOptions: {
      // modelAssetPath,
      modelAssetPath:
        'https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task',
      delegate: 'GPU',
    },
    runningMode: 'VIDEO',
    // outputCategoryMask: true,
    // outputConfidenceMasks: false,
  });
  // gestureRecognizer.recognizeForVideo()
  return gestureRecognizer;
};

onmessage = async (e) => {
  const { data = {}, action } = e.data || {};
  if (action === 'init') {
    console.log('wasm', data.wasm);
    await createImageSegmenter(data.wasm);
    postMessage(new Message('initilized'));
  }
  if (action === 'predict') {
    const { videoFrame, time = performance.now() } = data;
    const result = gestureRecognizer.recognizeForVideo(videoFrame, time);
    postMessage(new Message('predictResult', result));
  }
  // console.log('Message received from main script', e);
  // const workerResult = `Result: ${e}`;
  // console.log('Posting message back to main script');
  // postMessage(workerResult);
};
