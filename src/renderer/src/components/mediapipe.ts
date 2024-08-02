import { ImageSegmenter, FilesetResolver, ImageSegmenterResult } from '@mediapipe/tasks-vision';
import modelAssetPath from '../../../../resources/models/mediapipe_selfie_segs/selfie_segmenter.tflite?url';
// import mediapipeWasm from '../assets/wasm';
// console.log('mediapipeWasm', mediapipeWasm);
let imageSegmenter: ImageSegmenter;
export const createImageSegmenter = async () => {
  const mediapipeWasm = await window.api.getMediapipeWasmPath();

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
// let segmentations = [];
// const segmentPerson = (video: HTMLVideoElement) => {
//   imageSegmenter.segmentForVideo();
// };
// function onResult(result: ImageSegmenterResult) {
//   let imageData = canvasCtx.getImageData(0, 0, video.videoWidth, video.videoHeight).data;
//   const mask: Number[] = result.categoryMask.getAsFloat32Array();
//   let j = 0;
//   for (let i = 0; i < mask.length; ++i) {
//     const maskVal = Math.round(mask[i] * 255.0);
//     const legendColor = legendColors[maskVal % legendColors.length];
//     imageData[j] = (legendColor[0] + imageData[j]) / 2;
//     imageData[j + 1] = (legendColor[1] + imageData[j + 1]) / 2;
//     imageData[j + 2] = (legendColor[2] + imageData[j + 2]) / 2;
//     imageData[j + 3] = (legendColor[3] + imageData[j + 3]) / 2;
//     j += 4;
//   }
//   const uint8Array = new Uint8ClampedArray(imageData.buffer);
//   const dataNew = new ImageData(uint8Array, video.videoWidth, video.videoHeight);
//   canvasCtx.putImageData(dataNew, 0, 0);
//   if (webcamRunning === true) {
//     window.requestAnimationFrame(predictWebcam);
//   }
// }
