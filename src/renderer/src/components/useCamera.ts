import { onMounted, onUnmounted, ref, shallowRef, triggerRef, watchEffect } from 'vue';
import { Camera, type CameraOption, getVideoInputs } from '../lib/camera';
import { setupStats } from '@renderer/lib/stats';

import {
  createSegmenter,
  type ImageType,
  drawVirtualBackground,
  HumanSegSegmenter,
  createHumanSegSegmentor,
  createBlazePoseSegmenter,
  flipCanvasHorizontal,
} from './segmenter';
// import { createImageSegmenter, type ImageSegmenter } from './mediapipe';
import * as bodySegmentation from '@tensorflow-models/body-segmentation';
import { Segmentation } from '@tensorflow-models/body-segmentation/dist/shared/calculators/interfaces/common_interfaces';

/**
 * 支持的特效 虚拟背景｜背景虚化｜原始视频
 */
export type SupportedVisualization = 'virtualBackground' | 'bokehEffect' | 'none';
export const VIDEO_SIZE = {
  '480p': { width: 720, height: 480 },
  '720p': { width: 1280, height: 720 },
  '1080p': { width: 1920, height: 1080 },
} as const;
let stats;
// let imageSegmenter: ImageSegmenter;
let segmenter: bodySegmentation.BodySegmenter | null;
let humansegSegmenter: HumanSegSegmenter | null;
let blazeposeSegmentor: Awaited<ReturnType<typeof createBlazePoseSegmenter>> | null;
let rafId: number;
const resetTime = {
  startInferenceTime: 0,
  numInferences: 0,
  inferenceTimeSum: 0,
  lastPanelUpdate: 0,
};
type StatsTime = typeof resetTime;
let modelTime = { ...resetTime };
function beginEstimateSegmentationStats(time: StatsTime) {
  time.startInferenceTime = (performance || Date).now();
}

function endEstimateSegmentationStats(time: StatsTime) {
  const endInferenceTime = (performance || Date).now();
  time.inferenceTimeSum += endInferenceTime - time.startInferenceTime;
  ++time.numInferences;

  const panelUpdateMilliseconds = 1000;
  if (endInferenceTime - time.lastPanelUpdate >= panelUpdateMilliseconds) {
    const averageInferenceTime = time.inferenceTimeSum / time.numInferences;
    time.inferenceTimeSum = 0;
    time.numInferences = 0;
    stats?.customFpsPanel.update(1000.0 / averageInferenceTime, 120 /* maxValue */);
    time.lastPanelUpdate = endInferenceTime;
  }
}

const useCamera = () => {
  const outputCanvas = ref<HTMLCanvasElement>();
  const videoElement = ref<HTMLVideoElement>();
  const videoSize = VIDEO_SIZE['720p'];
  const bgCanvas = document.createElement('canvas');
  let bgLoaded = false;
  let visualizationMode = ref<SupportedVisualization>('none');
  let cameraOption: CameraOption = {
    width: videoSize.width,
    height: videoSize.height,
    targetFPS: 30,
    canvas: outputCanvas.value,
    deviceId: undefined,
  };
  let isCameraChanged = false;
  const cameras = ref<MediaDeviceInfo[]>([]);

  let camera: Camera | null;
  const resizeCamera = (size: { width: number; height: number }) => {
    cameraOption.width = size.width;
    cameraOption.height = size.height;
    isCameraChanged = true;
  };

  const switchCamera = ($deviceId: string) => {
    cameraOption.deviceId = $deviceId;
    isCameraChanged = true;
  };

  const isDev = window.electron.process.env.NODE_ENV === 'development';
  onMounted(async () => {
    cameras.value = await getVideoInputs();
    if (isDev) {
      stats = setupStats('(Model FPS)');
    }
    // 加载本地模型文件
    const models = (await window.api.getModelFiles()) || [];
    if (!models) {
      alert('加载模型错误');
      return;
    }
    cameraOption.canvas = outputCanvas.value;
    camera = await Camera.setupCamera(videoElement.value!, cameraOption);

    segmenter = await createSegmenter(models);
    humansegSegmenter = await createHumanSegSegmentor(models, camera.video.width, camera.video.height);
    blazeposeSegmentor = await createBlazePoseSegmenter(models);

    // imageSegmenter = await createImageSegmenter();

    runRAF();
  });
  const checkOptionUpdate = async () => {
    if (isCameraChanged) {
      cancelAnimationFrame(rafId);
      camera?.stop();
      camera = await Camera.setupCamera(videoElement.value!, cameraOption);
      isCameraChanged = false;
    }
    //等待视频开始播放
    if (camera!.video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      await new Promise((resolve) => {
        camera!.video.onloadeddata = () => {
          resolve(true);
        };
      });
    }
  };
  // const legendColors = [
  //   [255, 197, 0, 255], // Vivid Yellow
  //   [128, 62, 117, 255], // Strong Purple
  //   [255, 104, 0, 255], // Vivid Orange
  //   [166, 189, 215, 255], // Very Light Blue
  //   [193, 0, 32, 255], // Vivid Red
  //   [206, 162, 98, 255], // Grayish Yellow
  //   [129, 112, 102, 255], // Medium Gray
  //   [0, 125, 52, 255], // Vivid Green
  //   [246, 118, 142, 255], // Strong Purplish Pink
  //   [0, 83, 138, 255], // Strong Blue
  //   [255, 112, 92, 255], // Strong Yellowish Pink
  //   [83, 55, 112, 255], // Strong Violet
  //   [255, 142, 0, 255], // Vivid Orange Yellow
  //   [179, 40, 81, 255], // Strong Purplish Red
  //   [244, 200, 0, 255], // Vivid Greenish Yellow
  //   [127, 24, 13, 255], // Strong Reddish Brown
  //   [147, 170, 0, 255], // Vivid Yellowish Green
  //   [89, 51, 21, 255], // Deep Yellowish Brown
  //   [241, 58, 19, 255], // Vivid Reddish Orange
  //   [35, 44, 22, 255], // Dark Olive Green
  //   [0, 161, 194, 255], // Vivid Blue
  // ];
  // let elapsed = 0;
  const runRAF = async (_prevTime: number = performance.now()) => {
    // const time = performance.now();
    // elapsed += time - prevTime;
    // if (elapsed > 1000 / 60) {
    checkOptionUpdate();
    renderResult();
    // elapsed = 0;
    // }
    // let startTimeMs = performance.now();
    // imageSegmenter.segmentForVideo(camera!.video, startTimeMs, (result) => {
    //   // bodySegmentation.toBinaryMask()
    //   // result.categoryMask;
    //   let imageData = camera?.ctx!.getImageData(0, 0, camera.video.videoWidth, camera.video.videoHeight).data!;
    //   const mask = result.categoryMask?.getAsFloat32Array()!;
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
    //   const dataNew = new ImageData(uint8Array, camera!.video.videoWidth, camera!.video.videoHeight);
    //   camera?.ctx?.putImageData(dataNew, 0, 0);
    // });
    rafId = requestAnimationFrame(runRAF);
  };
  let modelType: 'humanseg' | 'blazepose' | 'mpBodyseg' = 'blazepose';
  async function renderResult() {
    if (isDev) {
      //统计模型性能
      beginEstimateSegmentationStats(modelTime);
    }
    if (modelType === 'humanseg') {
      // 当前人像分割模型使用的是ppseg
      await renderHumanSegPrediction();
    } else if (modelType === 'blazepose') {
      await renderBlazeposePrediction();
    } else if (modelType === 'mpBodyseg') {
      // 使用 @tensorflow-models/body-segmentation . @mediapipe/selfie_segmentation'
      await renderBodySegmentationPrediction();
    }
    if (isDev) {
      endEstimateSegmentationStats(modelTime);
    }
  }
  async function renderHumanSegPrediction() {
    if (humansegSegmenter != null) {
      if (visualizationMode.value === 'virtualBackground' && bgLoaded) {
        humansegSegmenter.drawHumanSeg(camera?.video!, camera?.canvas!, bgCanvas);
        // flipCanvasHorizontal(camera?.canvas!);
      } else if (visualizationMode.value === 'bokehEffect') {
        // flipCanvasHorizontal(camera?.canvas!);

        humansegSegmenter.blurBackground(camera?.video!, camera?.canvas!);
      } else {
        camera!.drawFromVideo(camera?.ctx!);
      }
    }
  }
  async function renderBodySegmentationPrediction() {
    let segmentation: Segmentation[] | null = null;
    // Segmenter can be null if initialization failed (for example when loading
    // from a URL that does not exist).
    if (segmenter != null) {
      try {
        segmentation = await segmenter.segmentPeople(camera!.video, {
          flipHorizontal: false,
          multiSegmentation: false,
          segmentBodyParts: false,
          // segmentationThreshold: STATE.visualization.foregroundThreshold,
        });
      } catch (error) {
        segmenter.dispose();
        segmenter = null;
        alert(error);
      }
      //@ts-ignore
      const gl = window.exposedContext;
      if (gl) gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));

      if (segmentation && segmentation.length) {
        const options = {
          foregroundThreshold: 0.6,
          maskOpacity: 1,
          maskBlur: 0,
          flipHorizontal: true,
          backgroundBlur: 5,
          edgeBlur: 3,
          drawContour: false,
        };

        const canvas = camera?.canvas || outputCanvas.value!;
        const ctx = canvas.getContext('2d')!;
        //背景替换
        if (visualizationMode.value === 'virtualBackground' && bgLoaded) {
          drawVirtualBackground(
            canvas,
            camera?.video!,
            segmentation,
            bgCanvas,
            options.foregroundThreshold,
            2,
            options.edgeBlur,
            options.flipHorizontal
          );
        } else if (visualizationMode.value === 'bokehEffect') {
          // 虚化背景
          await bodySegmentation.drawBokehEffect(
            canvas,
            camera!.video,
            segmentation,
            options.foregroundThreshold,
            options.backgroundBlur,
            options.edgeBlur,
            options.flipHorizontal
          );
        } else {
          // 输出原始图像
          camera!.drawFromVideo(ctx);
        }
      }
    }
  }
  async function renderBlazeposePrediction() {
    let segmentation: Segmentation | Segmentation[] | null = null;
    if (blazeposeSegmentor != null) {
      try {
        const poses = await blazeposeSegmentor.estimatePoses(camera!.video, {
          flipHorizontal: false,
        });
        segmentation = poses.map((pose) => pose.segmentation!);
      } catch (error) {
        blazeposeSegmentor.dispose();
        blazeposeSegmentor = null;
        alert(error);
      }
    }
    if (segmentation && segmentation.length) {
      const options = {
        foregroundThreshold: 0.6,
        maskOpacity: 1,
        maskBlur: 0,
        flipHorizontal: true,
        backgroundBlur: 5,
        edgeBlur: 3,
        drawContour: false,
      };
      const canvas = camera?.canvas || outputCanvas.value!;
      const ctx = canvas.getContext('2d')!;
      //背景替换
      if (visualizationMode.value === 'virtualBackground' && bgLoaded) {
        drawVirtualBackground(
          canvas,
          camera?.video!,
          segmentation,
          bgCanvas,
          options.foregroundThreshold,
          2,
          options.edgeBlur,
          options.flipHorizontal
        );
      } else if (visualizationMode.value === 'bokehEffect') {
        // 虚化背景
        await bodySegmentation.drawBokehEffect(
          canvas,
          camera!.video,
          segmentation,
          options.foregroundThreshold,
          options.backgroundBlur,
          options.edgeBlur,
          options.flipHorizontal
        );
      } else {
        // 输出原始图像
        camera!.drawFromVideo(ctx);
      }
    }
  }
  const updateBackground = async (imageUrl?: string) => {
    if (!imageUrl) {
      return;
    }
    const ctx = bgCanvas?.getContext('2d')!;
    const backgroundImg = new Image();
    backgroundImg.src = imageUrl;

    bgLoaded = await new Promise<boolean>((resolve) => {
      backgroundImg.onload = () => {
        resolve(true);
      };
      backgroundImg.onerror = () => {
        resolve(false);
      };
    });
    if (bgLoaded) {
      bgCanvas.width = backgroundImg.naturalWidth || backgroundImg.width;
      bgCanvas.height = backgroundImg.naturalHeight || backgroundImg.height;
      ctx?.drawImage(backgroundImg, 0, 0, backgroundImg.width, backgroundImg.height);
    }
  };
  const setVisualizationMode = (vis: SupportedVisualization, imageUrl?: string) => {
    visualizationMode.value = vis;
    // console.log('setVisualizationMode', vis, imageUrl);
    if (vis === 'virtualBackground') {
      updateBackground(imageUrl);
    }
  };
  const takePhoto = async () => {
    if (!camera) {
      return;
    }
    camera.pause();
    const img = outputCanvas.value?.toDataURL();
    setTimeout(() => {
      camera!.start();
    }, 500);
    return img;
  };
  onUnmounted(() => {
    cancelAnimationFrame(rafId);
    camera && camera.stop();
    camera?.clearCtx();
    camera = null;
    segmenter?.dispose();
    segmenter = null;
  });
  return {
    outputCanvas,
    videoElement,
    switchCamera,
    resizeCamera,
    takePhoto,
    setVisualizationMode,
    cameras,
    videoSize,
  };
};
export default useCamera;
