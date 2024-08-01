import { onMounted, ref, shallowRef, triggerRef, watchEffect } from 'vue';
import { Camera, type CameraOption, getVideoInputs } from '../lib/camera';
import { setupStats } from '@renderer/lib/stats';
import * as humanseg from '../paddle/index_gpu';
import createSegmenter from './segmenter';
import * as bodySegmentation from '@tensorflow-models/body-segmentation';
import { Segmentation } from '@tensorflow-models/body-segmentation/dist/shared/calculators/interfaces/common_interfaces';
export const VIDEO_SIZE = {
  '480p': { width: 720, height: 480 },
  '720p': { width: 1280, height: 720 },
  '1080p': { width: 1920, height: 1080 },
} as const;
let stats;
let segmenter: bodySegmentation.BodySegmenter | null;
let rafId: number;
const resetTime = {
  startInferenceTime: 0,
  numInferences: 0,
  inferenceTimeSum: 0,
  lastPanelUpdate: 0,
};
let modelTime = { ...resetTime };
const useCamera = () => {
  const outputCanvas = ref<HTMLCanvasElement>();
  const videoElement = ref<HTMLVideoElement>();
  const videoSize = VIDEO_SIZE['720p'];

  let cameraOption: CameraOption = {
    width: videoSize.width,
    height: videoSize.height,
    targetFPS: 30,
    canvas: outputCanvas.value,
    deviceId: undefined,
  };
  let isCameraChanged = false;
  const cameras = ref<MediaDeviceInfo[]>([]);

  let camera: Camera;
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
    // const ppsegv2 = models.find((m) => m.key === 'ppsegv2').path;

    // await humanseg.load(
    //   {
    //     canvasWidth: camera.video.videoWidth,
    //     canvasHeight: camera.video.videoHeight,
    //   },
    //   ppsegv2
    // );
    segmenter = await createSegmenter(models);
    runRAF();
  });
  const checkOptionUpdate = async () => {
    if (isCameraChanged) {
      cancelAnimationFrame(rafId);
      camera?.stop();
      camera = await Camera.setupCamera(videoElement.value!, cameraOption);
      isCameraChanged = false;
    }
  };
  function beginEstimateSegmentationStats(time: typeof resetTime) {
    time.startInferenceTime = (performance || Date).now();
  }

  function endEstimateSegmentationStats(time: typeof resetTime) {
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
  // let elapsed = 0;
  const runRAF = async (_prevTime: number = performance.now()) => {
    // const time = performance.now();
    // elapsed += time - prevTime;
    // if (elapsed > 1000 / 60) {
    checkOptionUpdate();
    if (camera.video.readyState < 2) {
      await new Promise((resolve) => {
        camera.video.onloadeddata = () => {
          resolve('');
        };
      });
    }

    renderResult();
    // elapsed = 0;
    // }
    rafId = requestAnimationFrame(runRAF);
  };

  async function renderResult() {
    if (isDev) {
      //统计模型性能
      beginEstimateSegmentationStats(modelTime);
    }
    // 当前人像分割模型使用的是ppseg
    // await humanseg.drawHumanSeg(camera.video, outputCanvas.value!, bgCanvas);
    let segmentation: Segmentation[] | null = null;
    // Segmenter can be null if initialization failed (for example when loading
    // from a URL that does not exist).
    if (segmenter != null) {
      try {
        segmentation = await segmenter.segmentPeople(camera.video, {
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
          foregroundThreshold: 0.5,
          maskOpacity: 1,
          maskBlur: 0,
          pixelCellWidth: 10,
          backgroundBlur: 3,
          edgeBlur: 3,
        };
        const data = await bodySegmentation.toBinaryMask(
          segmentation,
          { r: 0, g: 0, b: 0, a: 0 },
          { r: 0, g: 0, b: 0, a: 255 },
          false,
          options.foregroundThreshold
        );
        const canvas = camera.canvas || outputCanvas.value!;
        await bodySegmentation.drawMask(canvas, camera.video, data, options.maskOpacity, options.maskBlur);
        // const context = outputCanvas.value?.getContext('2d')!;
        // context.globalCompositeOperation = 'destination-over'; // 新图形只在不重合的区域绘制
        // context.drawImage(bgCanvas, 0, 0, context.canvas.width, context.canvas.height);
        const ctx = camera.ctx;

        camera.drawToCanvas(canvas);
        // camera.drawFromVideo();
      }
    }
    if (isDev) {
      endEstimateSegmentationStats(modelTime);
    }
  }

  const bgCanvas = document.createElement('canvas');

  const updateBackground = async (imageUrl: string) => {
    const ctx = bgCanvas?.getContext('2d')!;
    const backgroundImg = new Image();
    backgroundImg.src = imageUrl;
    await new Promise((resolve) => {
      backgroundImg.onload = () => {
        resolve(true);
      };
    });
    bgCanvas.width = backgroundImg.naturalWidth || backgroundImg.width;
    bgCanvas.height = backgroundImg.naturalHeight || backgroundImg.height;
    ctx?.drawImage(backgroundImg, 0, 0, backgroundImg.width, backgroundImg.height);
  };

  const takePhoto = async () => {
    if (!camera) {
      return;
    }
    camera.pause();
    const img = outputCanvas.value?.toDataURL();
    setTimeout(() => {
      camera.start();
    }, 500);
    return img;
  };
  return {
    outputCanvas,
    videoElement,
    switchCamera,
    resizeCamera,
    takePhoto,
    updateBackground,
    cameras,
    videoSize,
  };
};
export default useCamera;
