import { ImageSegmenter, FilesetResolver, ImageSegmenterResult } from '@mediapipe/tasks-vision';
import modelAssetPath from '../../../../resources/models/mediapipe_selfie_segs/selfie_segmenter.tflite?url';
import path from 'path';
import {
  // unpackedPath,
  // userDataDir,
  resourcesBasePath,
  defaultBackgroundPath,
  modelBaseDir,
  backgroundPath,
  photoPath,
} from './paths';

const getMediapipeWasmPath = async () => {
  let wasmPath = path.join(resourcesBasePath, 'wasm');
  // if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
  //   wasmPath = process.env['ELECTRON_RENDERER_URL'] + path.join('/@fs/', wasmPath);
  // }
  return wasmPath;
};
// import mediapipeWasm from '../assets/wasm';
// console.log('mediapipeWasm', mediapipeWasm);
let imageSegmenter: ImageSegmenter;
export const createImageSegmenter = async () => {
  const mediapipeWasm = await getMediapipeWasmPath();

  const audio = await FilesetResolver.forVisionTasks(mediapipeWasm);
  imageSegmenter = await ImageSegmenter.createFromOptions(audio, {
    baseOptions: {
      modelAssetPath,
      delegate: 'GPU',
    },
    runningMode: 'VIDEO',
    outputCategoryMask: true,
    outputConfidenceMasks: false,
  });
  return imageSegmenter;
};
export { type ImageSegmenter } from '@mediapipe/tasks-vision';
