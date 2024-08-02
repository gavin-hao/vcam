// import * as mpSelfieSegmentation from '@mediapipe/selfie_segmentation';
import * as tfjsWasm from '@tensorflow/tfjs-backend-wasm';
import * as tf from '@tensorflow/tfjs-core';
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

export * from './segmentationRenderUtils';

export async function createSegmenter(
  models: Array<{ key: string; path: string }>
): Promise<bodySegmentation.BodySegmenter> {
  await tf.setBackend('wasm');
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
