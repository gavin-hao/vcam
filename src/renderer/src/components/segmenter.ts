// import * as mpSelfieSegmentation from '@mediapipe/selfie_segmentation';
import * as tfjsWasm from '@tensorflow/tfjs-backend-wasm';
import '@tensorflow/tfjs-core';
// 注册webgl backend 需要引入该包
import '@tensorflow/tfjs-backend-webgl';
import * as bodySegmentation from '@tensorflow-models/body-segmentation';
import * as poseDetection from '@tensorflow-models/pose-detection';
// import * as mpPose from '@mediapipe/pose';
import wasmSimdPath from '../../../../node_modules/@tensorflow/tfjs-backend-wasm/dist/tfjs-backend-wasm-simd.wasm?url';
import wasmSimdThreadedPath from '../../../../node_modules/@tensorflow/tfjs-backend-wasm/dist/tfjs-backend-wasm-threaded-simd.wasm?url';
import wasmPath from '../../../../node_modules/@tensorflow/tfjs-backend-wasm/dist/tfjs-backend-wasm.wasm?url';
import * as humanseg from '../paddle/index_gpu';
tfjsWasm.setWasmPaths({
  'tfjs-backend-wasm.wasm': wasmPath,
  'tfjs-backend-wasm-simd.wasm': wasmSimdPath,
  'tfjs-backend-wasm-threaded-simd.wasm': wasmSimdThreadedPath,
});

export * from './renderUtils';

export async function createSegmenter(
  models: Array<{ key: string; path: string }>
): Promise<bodySegmentation.BodySegmenter> {
  const customSolutionPath = models.find((v) => v.key == 'mediapipe_selfie_segmentation')?.path;
  return bodySegmentation.createSegmenter(bodySegmentation.SupportedModels.MediaPipeSelfieSegmentation, {
    runtime: 'mediapipe',
    modelType: 'general',
    solutionPath: customSolutionPath, //`https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation@${mpSelfieSegmentation.VERSION}`,
  });
}

export async function createBlazePoseSegmenter(
  models: Array<{ key: string; path: string }>
): Promise<poseDetection.PoseDetector> {
  const customSolutionPath = models.find((v) => v.key == 'mediapipe_pose')?.path;
  return poseDetection.createDetector(poseDetection.SupportedModels.BlazePose, {
    runtime: 'mediapipe',
    modelType: 'heavy',
    solutionPath: customSolutionPath, //`https://cdn.jsdelivr.net/npm/@mediapipe/pose@${mpPose.VERSION}`,
    enableSegmentation: true,
    smoothSegmentation: true,
  });
}
// @see https://github.com/tensorflow/tfjs-models/tree/master/body-segmentation/src/body_pix
export async function createBodyPixSegmenter(models: Array<{ key: string; path: string }>) {
  const modelKey = 'bodypix';
  const customSolutionPath = models.find((v) => v.key == modelKey)?.path;
  const options: {
    architecture: 'MobileNetV1' | 'ResNet50';
    outputStride: 8 | 16;
    quantBytes: 4 | 2;
    multiplier: 1.0 | 0.75 | 0.5;
  } = {
    architecture: 'MobileNetV1', //'MobileNetV1', //ResNet50
    outputStride: 16,
    quantBytes: 2,
    multiplier: 0.75,
  };
  let modelPath = `${customSolutionPath}/${options.architecture}/quant${options.quantBytes}-stride${options.outputStride}/model.json`;
  if (options.architecture === 'MobileNetV1') {
    modelPath = `${customSolutionPath}/${options.architecture}/quant${options.quantBytes}-stride${options.outputStride}/multiplier${(options.multiplier * 100).toString().padStart(3, '0')}/model.json`;
  }
  return bodySegmentation.createSegmenter(bodySegmentation.SupportedModels.BodyPix, {
    architecture: options.architecture, //'MobileNetV1',
    outputStride: options.outputStride, //可以是8 、 16 、 32之一 值越小，输出分辨率越大，模型越精确
    multiplier: options.multiplier, //该值仅由 MobileNetV1 架构使用,值越大，层的尺寸越大，模型越精确，但代价是速度 value：0.5 ｜0.75｜ 1.0
    quantBytes: options.quantBytes, //该参数控制用于权重量化的字节 ,4 - 每个浮点数 4 个字节（无量化）获得最高精度和原始模型尺寸
    modelUrl: modelPath,
  });
}
export class HumanSegSegmenter {
  canvasWidth?: number;
  canvasHeight?: number;
  modelPath: string;
  constructor(modelPath: string, canvasWidth?: number, canvasHeight?: number) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.modelPath = modelPath;
  }
  async loadModel() {
    const { canvasHeight, canvasWidth, modelPath } = this;
    await humanseg.load(
      {
        canvasWidth,
        canvasHeight,
      },
      modelPath
    );
  }

  async drawHumanSeg(
    input: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement,
    canvas: HTMLCanvasElement,
    back?: HTMLCanvasElement
  ) {
    await humanseg.drawHumanSeg(input, canvas, back);
  }
  async blurBackground(input: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement, canvas: HTMLCanvasElement) {
    await humanseg.blurBackground(input, canvas);
  }
}

export async function createHumanSegSegmentor(
  models: Array<{ key: string; path: string }>,
  canvasWidth?: number,
  canvasHeight?: number
) {
  const ppsegv2 = models.find((m) => m.key === 'ppsegv2')?.path;
  if (ppsegv2) {
    const segmenter = new HumanSegSegmenter(ppsegv2, canvasWidth, canvasHeight);
    await segmenter.loadModel();
    return segmenter;
  }
  return null;
}
