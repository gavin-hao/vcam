import { onMounted, onUnmounted, ref } from 'vue';
import { Camera, type CameraOption, getVideoInputs } from '../lib/camera';
import { setupStats } from '@renderer/lib/stats';
import * as tf from '@tensorflow/tfjs-core';
import {
  createSegmenter,
  drawVirtualBackground,
  HumanSegSegmenter,
  // createHumanSegSegmentor,
  createBlazePoseSegmenter,
  createBodyPixSegmenter,
  flipCanvasHorizontal,
} from './segmenter';
import * as bodySegmentation from '@tensorflow-models/body-segmentation';
import { Segmentation } from '@tensorflow-models/body-segmentation/dist/shared/calculators/interfaces/common_interfaces';
import { Gesture } from './gesture';
import gestureModelAssetPath from '../../../../resources/gesture-models/gesture_recognizer.task?url';

/**
 * 支持的特效 虚拟背景｜背景虚化｜原始视频
 */
export type SupportedVisualization = 'virtualBackground' | 'bokehEffect' | 'none';
export const VIDEO_SIZE = {
  '480p': { width: 720, height: 480 },
  '720p': { width: 1280, height: 720 },
  '1080p': { width: 1920, height: 1080 },
} as const;
type ImageSource = ImageBitmap | ImageData | OffscreenCanvas | VideoFrame;
// const gestureRecognizerWorker = new Worker(new URL('../workers/gesture', import.meta.url), { type: 'module' });
const isDev = window.electron.process.env.NODE_ENV === 'development';
let stats;
let gestureRecognizer: Gesture;
let segmenter: Awaited<ReturnType<typeof createSegmenter>> | null;
let humansegSegmenter: HumanSegSegmenter | null;
let blazeposeSegmentor: Awaited<ReturnType<typeof createBlazePoseSegmenter>> | null;
let bodypixSegmentor: Awaited<ReturnType<typeof createBodyPixSegmenter>> | null;
let rafId: number;
const resetTime = {
  startInferenceTime: 0,
  numInferences: 0,
  inferenceTimeSum: 0,
  lastPanelUpdate: 0,
};
type StatsTime = typeof resetTime;
const modelTime = { ...resetTime };
function beginEstimateSegmentationStats(time: StatsTime) {
  time.startInferenceTime = (performance || Date).now();
}

function endEstimateSegmentationStats(time: StatsTime) {
  const endInferenceTime = (performance || Date).now();
  time.inferenceTimeSum += endInferenceTime - time.startInferenceTime;
  ++time.numInferences;

  const panelUpdateMilliseconds = 1000;
  if (isDev && endInferenceTime - time.lastPanelUpdate >= panelUpdateMilliseconds) {
    const averageInferenceTime = time.inferenceTimeSum / time.numInferences;
    time.inferenceTimeSum = 0;
    time.numInferences = 0;
    stats?.customFpsPanel.update(1000.0 / averageInferenceTime, 120 /* maxValue */);
    time.lastPanelUpdate = endInferenceTime;
  }
}

const useCamera = (options: { gestureRecognizerCallback: null | ((gesture: string) => void) }) => {
  const outputCanvas = ref<HTMLCanvasElement>();
  // let gestureCanvas: HTMLCanvasElement;

  const videoElement = ref<HTMLVideoElement>();
  const videoSize = VIDEO_SIZE['720p'];
  const bgCanvas = document.createElement('canvas');
  let bgLoaded = false;
  const visualizationMode = ref<SupportedVisualization>('none');
  const cameraOption: CameraOption = {
    width: videoSize.width,
    height: videoSize.height,
    targetFPS: 30,
    canvas: outputCanvas.value,
    deviceId: undefined,
  };
  const gestureRecognizerCallback: null | ((gesture: string) => void) = options.gestureRecognizerCallback;

  //用于存储摄像头原始图像
  const canvas: OffscreenCanvas = new OffscreenCanvas(0, 0); //document.createElement('canvas') as HTMLCanvasElement;
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
    await tf.setBackend('webgl');
    // await tf.ready();

    segmenter = await createSegmenter(models);
    // humansegSegmenter = await createHumanSegSegmentor(models, camera.video.width, camera.video.height);
    // blazeposeSegmentor = await createBlazePoseSegmenter(models);
    bodypixSegmentor = await createBodyPixSegmenter(models);
    // imageSegmenter = await createImageSegmenter();
    // worker线程初始化 手势识别模型
    const mediapipeWasm = await window.api.getMediapipeWasmPath();
    gestureRecognizer = new Gesture({
      mediapipeVisionWasmPath: mediapipeWasm,
      modelAssetPath: gestureModelAssetPath,
      renderContainer: outputCanvas.value?.parentElement!,
      showHandsKeypoints: true,
    });
    await gestureRecognizer.load();

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

  const runRAF = async (_prevTime: number = performance.now()) => {
    await checkOptionUpdate();
    //统计模型性能
    beginEstimateSegmentationStats(modelTime);
    await drawVideo(canvas, camera?.video!, false);

    await predictGesture(canvas, _prevTime);

    await renderSegmentPrediction();
    endEstimateSegmentationStats(modelTime);

    rafId = requestAnimationFrame(runRAF);
  };
  async function drawVideo(
    canvas: OffscreenCanvas | HTMLCanvasElement,
    video: HTMLVideoElement,
    flipHorizontal: boolean = false
  ) {
    const ctx = canvas.getContext('2d')! as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
    ctx.save();
    const videoWidth = video.videoWidth;
    const videoHeight = video.videoHeight;
    canvas.width = videoWidth;
    canvas.height = videoHeight;
    if (flipHorizontal) {
      flipCanvasHorizontal(ctx.canvas);
    }
    ctx.drawImage(video, 0, 0, videoWidth, videoHeight);
    // 输出原始图像
    // camera!.drawFromVideo(ctx);
    ctx.restore();
    return canvas;
  }

  async function predictGesture(videoFrame: ImageSource, _prevTime: number = performance.now()) {
    if (gestureRecognizerCallback) {
      await gestureRecognizer.recognizeForVideo(videoFrame, gestureRecognizerCallback, _prevTime);
    }
  }
  async function setGestureSignal(state: boolean) {
    gestureRecognizer.signal(state);
  }
  const modelType: 'humanseg' | 'blazepose' | 'mpSelfiSeg' | 'bodypix' = 'mpSelfiSeg';
  async function renderSegmentPrediction() {
    if (modelType === 'humanseg') {
      // 当前人像分割模型使用的是ppseg
      await renderHumanSegPrediction();
    } else if (modelType === 'blazepose') {
      await renderBlazeposePrediction();
    } else if (modelType === 'mpSelfiSeg') {
      // 使用 @tensorflow-models/body-segmentation . @mediapipe/selfie_segmentation'
      await renderBodySegmentationPrediction();
    } else if (modelType === 'bodypix') {
      await renderBodypixSegmentationPrediction();
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
        });
      } catch (error) {
        segmenter.dispose();
        segmenter = null;
        alert(error);
      }
      //@ts-ignore
      // const gl = window.exposedContext;
      // if (gl) gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));

      if (segmentation && segmentation.length) {
        const options = {
          foregroundThreshold: 0.6,
          maskOpacity: 1,
          maskBlur: 0,
          flipHorizontal: false,
          backgroundBlur: 5,
          edgeBlur: 3,
          drawContour: false,
        };
        //背景替换
        if (visualizationMode.value === 'virtualBackground' && bgLoaded) {
          await drawVirtualBackground(
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
        }
        //  else {
        //   const ctx = canvas.getContext('2d')!;
        //   ctx.save();
        //   flipCanvasHorizontal(ctx.canvas);
        //   // 输出原始图像
        //   camera!.drawFromVideo(ctx);
        //   ctx.restore();
        // }
        camera?.drawToCanvas(canvas);
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
        flipHorizontal: false,
        backgroundBlur: 5,
        edgeBlur: 3,
        drawContour: false,
      };
      // const canvas = camera?.canvas || outputCanvas.value!;
      //背景替换
      if (visualizationMode.value === 'virtualBackground' && bgLoaded) {
        await drawVirtualBackground(
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
      }
      camera?.drawToCanvas(canvas);
    }
  }
  async function renderBodypixSegmentationPrediction(isTakePhoto?: boolean) {
    let segmentation: Segmentation[] | null = null;
    // Segmenter can be null if initialization failed (for example when loading
    // from a URL that does not exist).
    if (bodypixSegmentor != null) {
      try {
        segmentation = await bodypixSegmentor.segmentPeople(camera!.video, {
          flipHorizontal: false,
          multiSegmentation: false,
          segmentBodyParts: false,
          internalResolution: 'high',
          segmentationThreshold: 0.7,
        });
      } catch (error) {
        bodypixSegmentor.dispose();
        bodypixSegmentor = null;
        alert(error);
      }
      if (segmentation && segmentation.length) {
        if (isTakePhoto) {
          console.log('run when click `takePhoto button`');
        }
        const options = {
          foregroundThreshold: 0.7,
          maskOpacity: 1,
          maskBlur: 0,
          flipHorizontal: false,
          backgroundBlur: 5,
          edgeBlur: 1,
          drawContour: false,
        };
        //背景替换
        if (visualizationMode.value === 'virtualBackground' && bgLoaded) {
          await drawVirtualBackground(
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
        }
        camera?.drawToCanvas(canvas);
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
    console.log(88888888888);
    if (!camera) {
      return;
    }
    camera.pause();
    camera.clearCtx();
    cancelAnimationFrame(rafId);
    await renderBodypixSegmentationPrediction(true);
    const img = outputCanvas.value?.toDataURL();
    setTimeout(() => {
      camera!.start();
      runRAF();
    }, 800);
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
    setGestureSignal,
  };
};
export default useCamera;
