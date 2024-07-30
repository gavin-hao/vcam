import * as mpSelfieSegmentation from '@mediapipe/selfie_segmentation';
import * as tfjsWasm from '@tensorflow/tfjs-backend-wasm';
import * as tf from '@tensorflow/tfjs-core';
tfjsWasm.setWasmPaths(`https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-backend-wasm@${tfjsWasm.version_wasm}/dist/`);
import * as bodySegmentation from '@tensorflow-models/body-segmentation';
import * as poseDetection from '@tensorflow-models/pose-detection';

async function createSegmenter(models: Array<{ key: string; path: string }>): Promise<bodySegmentation.BodySegmenter> {
  const customSolutionPath = models.find((v) => v.key == 'mediapipe_selfie_segmentation')?.path;
  return bodySegmentation.createSegmenter(bodySegmentation.SupportedModels.MediaPipeSelfieSegmentation, {
    runtime: 'mediapipe',
    modelType: 'general',
    solutionPath: customSolutionPath, //`https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation@${mpSelfieSegmentation.VERSION}`,
  });
}

export default createSegmenter;
