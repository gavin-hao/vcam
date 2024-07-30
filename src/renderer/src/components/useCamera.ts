import { onMounted, ref, shallowRef, triggerRef, watchEffect } from 'vue';
import { Camera, type CameraOption, getVideoInputs } from '../lib/camera';
import { setupStats } from '@renderer/lib/stats';
import * as humanseg from '../paddle/index_gpu';

export const VIDEO_SIZE = {
  '480p': { width: 640, height: 480 },
  '720p': { width: 1280, height: 720 },
  '1080p': { width: 1920, height: 1080 },
} as const;
let stats, segmenter;
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
    camera = await Camera.setupCamera(videoElement.value!, cameraOption);
    const ppsegv2 = models.find((m) => m.key === 'ppsegv2').path;
    console.log(camera.video.videoWidth, camera.video.width);
    await humanseg.load(
      {
        canvasWidth: camera.video.videoWidth,
        canvasHeight: camera.video.videoHeight,
      },
      ppsegv2
    );
    runRAF();
  });
  const checkOptionUpdate = async () => {
    if (isCameraChanged) {
      cancelAnimationFrame(rafId);
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

  const runRAF = async () => {
    checkOptionUpdate();
    if (camera.video.readyState < 2) {
      await new Promise((resolve) => {
        camera.video.onloadeddata = () => {
          resolve('');
        };
      });
    }
    renderResult();
    rafId = requestAnimationFrame(runRAF);
  };
  async function renderResult() {
    if (isDev) {
      //统计模型性能
      beginEstimateSegmentationStats(modelTime);
    }
    // 当前人像分割模型使用的是ppseg
    await humanseg.drawHumanSeg(camera.video, outputCanvas.value!);
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
