<template>
  <div class="camera">
    <div ref="viewport" class="viewport">
      <video id="video" ref="videoRef" playsinline :width="width" :height="height"></video>
      <canvas id="view" ref="viewRef"></canvas>
      <img v-show="!!currentBackground" id="background" :src="currentBackground" alt="" />
      <audio v-show="false" ref="audioShutter" :src="shutterMp3" :loop="false" :volume="0.7"></audio>
    </div>
    <div ref="controlRef" class="footer" :class="clsHideControl">
      <Control
        :photo="lastPhoto"
        @switch-camera="switchCamera"
        @shutter-click="handlePhotoClick"
        @open-background-dialog="handleOpenBackgroundDialog"
        @open-album="handleOpenAlbum"
      />
    </div>
    <BackgroundDialog
      v-model="dialogBackgroundVisible"
      :images="bgImgs"
      :selected="currentBackground"
      @delete-image="deleteImage"
      @change="handleBackgroundChanged"
    />
  </div>
</template>
<script setup lang="ts">
import BackgroundDialog from './BackgroundDialog.vue';
import Control from './Contols.vue';
import Camera from '@paddlejs-mediapipe/camera';
import * as Mousetrap from 'mousetrap';
//import * as humanseg from '@paddlejs-models/humanseg/lib/index_gpu';
import * as humanseg from '../paddle/index_gpu';
import { computed, onMounted, ref, watchEffect } from 'vue';
import { useElementBounding, useEventListener, useTimeout } from '@vueuse/core';
import shutterMp3 from '../assets/camera-shutter.mp3?asset';
import * as tfjs from '@tensorflow/tfjs';
import * as bodyPix from '@tensorflow-models/body-pix';

const viewport = ref<HTMLDivElement>();
const viewRef = ref<HTMLCanvasElement>();
const videoRef = ref<HTMLVideoElement>();
const controlRef = ref<HTMLDivElement>();
const test = ref<boolean>(true);
// import { ElDialog, ElButton } from 'element-plus';
const { width, height } = useElementBounding(viewport);
const bgImgs = ref<{ default: string[]; user: string[] }>({ default: [], user: [] });
let camera: Camera | null;
const dialogBackgroundVisible = ref<boolean>(false);
const backgroundCanvas = document.createElement('canvas') as HTMLCanvasElement;
const maskCanvas = document.createElement('canvas');
const audioShutter = ref<HTMLAudioElement>();
const lastPhoto = ref<string>();
const cameraStart = ref<boolean>(false);
const net = ref();
const allBgImgs = computed(() => {
  return bgImgs.value?.default.concat(bgImgs.value.user) || [];
});
const models = ref<Array<{ key: string; path: string }>>();
window.api.onBackgroundImageUpdate((imgs) => {
  bgImgs.value = imgs;
});
const currentBackground = ref<string>();
const modelConfig2 = ref<string>('ppsegv2');
const modelConfig = ref<string>('tfjs-mobilenet');
const clsHideControl = ref<string>();
const { start: startTimer, stop: stopTimer } = useTimeout(5000, {
  controls: true,
  callback: () => {
    clsHideControl.value = 'hide';
  },
});
useEventListener(controlRef, 'mouseenter', (_evt) => {
  clsHideControl.value = '';
  stopTimer?.();
});
useEventListener(controlRef, 'mouseleave', (_evt) => {
  startTimer?.();
});
onMounted(async () => {
  Mousetrap.bind(['up', 'down', 'pageup', 'pagedown', 'left', 'right', 'enter', 'tab', 'space'], function (_e, combo) {
    onKeyboardShortcuts(combo);
  });
  await window.api.getBackgroundImages();
  models.value = (await window.api.getModelFiles()) || [];
  if (!models.value) {
    alert('加载模型错误');
    return;
  }
  await modelLoad();
  camera = new Camera(videoRef.value!, {
    mirror: true,
    enableOnInactiveState: true,
    onSuccess: () => {
      cameraStart.value = true;
    },
    onError: (e) => {
      alert(e.message || '开启摄像头错误');
    },
    onFrame: async (video) => {
      dealImage(video);
    },
    videoLoaded: () => {
      camera!.start();
    },
  });
});

const dealImage = async (video: HTMLVideoElement) => {
  if (video.width <= 0 || video.height <= 0) {
    return;
  }
  const view = viewRef.value!;
  const context = view.getContext('2d')!;
  if (!currentBackground.value) {
    view.width = video.width;
    view.height = video.height;
    context.drawImage(video, 0, 0, video.width, video.height);
  } else {
    if (modelConfig.value === 'ppsegv2') {
      humanseg.drawHumanSeg(video, view, backgroundCanvas);
    } else {
      console.log(99999);
      const foregroundColor = { r: 0, g: 0, b: 0, a: 0 };
      const backgroundColor = { r: 0, g: 0, b: 0, a: 255 };
      console.log(net.value, 1111);
      const segmentation = await net.value.segmentPerson(video!, {
        flipHorizontal: false,
        internalResolution: 'high',
        segmentationThreshold: 0.7,
        maxDetections: 1,
        scoreThreshold: 1,
        nmsRadius: 100,
      });
      // const maskImage = bodyPix.toMask(segmentation, foregroundColor, backgroundColor, true);
      // view.width = maskImage.width;
      // view.height = maskImage.height;
      // context.save();
      // context.globalAlpha = 1;
      // if (maskImage) {
      //   //绘制人像遮照
      //   const mask = renderImageDataToCanvas(maskImage, maskCanvas);
      //   context.drawImage(mask, 0, 0, video.width, video.height);
      // }
      // context.restore();
      // context.globalCompositeOperation = 'source-in'; //新图形只在新图形和目标画布重叠的地方绘制。其他的都是透明的。
      // const imgRect = genImageSize(0, 0, view.width, view.height, backgroundCanvas.width, backgroundCanvas.height);
      // context.drawImage(backgroundCanvas, imgRect.dx, imgRect.dy, imgRect.dWidth, imgRect.dHeight);
      // context.globalCompositeOperation = 'destination-over'; // 新图形只在不重合的区域绘制
      // context.drawImage(video, 0, 0, video.width, video.height);
      // context.globalCompositeOperation = 'source-over'; // 恢复
    }
  }
};

const modelLoad = async () => {
  const ppsegModelUrl = models.value.find((m) => m.key === 'ppsegv2')?.path;
  const tfjsModelUrl = models.value.find((m) => m.key === 'tfjs-mobilenet')?.path;
  if (ppsegModelUrl) {
    await humanseg.load({}, ppsegModelUrl);
  }
  if (tfjsModelUrl) {
    await tfjs.ready();
    net.value = await bodyPix.load({
      architecture: 'MobileNetV1',
      outputStride: 16,
      quantBytes: 4,
      multiplier: 0.75,
      modelUrl: tfjsModelUrl + '/model.json',
    });
  }
};

function renderImageDataToCanvas(image: ImageData, canvas: HTMLCanvasElement | OffscreenCanvas) {
  canvas.width = image.width;
  canvas.height = image.height;
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;

  ctx.putImageData(image, 0, 0);
  return canvas;
}

function genImageSize(box_x: number, box_y: number, box_w: number, box_h: number, source_w: number, source_h: number) {
  let dx = box_x,
    dy = box_y,
    dWidth = box_w,
    dHeight = box_h;
  if (source_w > source_h || (source_w == source_h && box_w < box_h)) {
    dHeight = (source_h * dWidth) / source_w;
    dy = box_y + (box_h - dHeight) / 2;
  } else if (source_w < source_h || (source_w == source_h && box_w > box_h)) {
    dWidth = (source_w * dHeight) / source_h;
    dx = box_x + (box_w - dWidth) / 2;
  }
  return {
    dx,
    dy,
    dWidth,
    dHeight,
  };
}

const handlePhotoClick = async () => {
  if (!camera || !cameraStart.value) {
    return;
  }
  audioShutter.value?.play();
  camera!.pause();

  // const modelUrl2 = models.value.find((m) => m.key === modelConfig2.value)?.path;
  // const maskCanvas = document.createElement('canvas');

  // await tfjs.ready();
  // const net = await bodyPix.load({
  //   architecture: 'MobileNetV1',
  //   outputStride: 16,
  //   quantBytes: 4,
  //   multiplier: 0.5,
  //   modelUrl: modelUrl2 + '/model.json',
  // });

  // const video = videoRef.value!;
  // const view = viewRef.value!;
  // const context = view.getContext('2d')!;

  // const foregroundColor = { r: 0, g: 0, b: 0, a: 0 };
  // const backgroundColor = { r: 0, g: 0, b: 0, a: 255 };
  // const segmentation = await net.segmentPerson(video!, {
  //   flipHorizontal: false,
  //   internalResolution: 'high',
  //   segmentationThreshold: 0.7,
  //   maxDetections: 1,
  //   scoreThreshold: 1,
  //   nmsRadius: 100,
  // });
  // const maskImage = bodyPix.toMask(segmentation, foregroundColor, backgroundColor, true);
  // view.width = maskImage.width;
  // view.height = maskImage.height;
  // context.save();
  // context.globalAlpha = 1;
  // if (maskImage) {
  //   //绘制人像遮照
  //   const mask = renderImageDataToCanvas(maskImage, maskCanvas);
  //   // const blurredMask = drawAndBlurImageOnOffScreenCanvas(mask, maskBlurAmount, CANVAS_NAMES.blurredMask);
  //   context.drawImage(mask, 0, 0, video.width, video.height);
  // }
  // context.restore();
  // context.globalCompositeOperation = 'source-in'; //新图形只在新图形和目标画布重叠的地方绘制。其他的都是透明的。
  // const imgRect = genImageSize(0, 0, view.width, view.height, backgroundCanvas.width, backgroundCanvas.height);
  // context.drawImage(backgroundCanvas, imgRect.dx, imgRect.dy, imgRect.dWidth, imgRect.dHeight);
  // context.globalCompositeOperation = 'destination-over'; // 新图形只在不重合的区域绘制
  // context.drawImage(video, 0, 0, video.width, video.height);
  // context.globalCompositeOperation = 'source-over'; // 恢复
  // ===============
  const source = viewRef.value!;
  const imageUrl = source.toDataURL('image/jpeg');
  lastPhoto.value = imageUrl;
  window.api.savePhoto(imageUrl);
  setTimeout(() => {
    camera!.start();
  }, 500);
};

const deleteImage = () => {
  if (currentBackground.value) {
    window.api.deleteImage(currentBackground.value);
    currentBackground.value = '';
  }
};

const handleOpenBackgroundDialog = () => {
  dialogBackgroundVisible.value = true;
};
const switchCamera = () => {
  if (!cameraStart.value) {
    alert('请先开启摄像头');
  }
  camera?.switchCameras();
};
const onKeyboardShortcuts = (combo: string) => {
  switch (combo) {
    case 'up':
    case 'left':
    case 'pageup':
      switchBackground(true);
      break;
    case 'down':
    case 'right':
    case 'pagedown':
      switchBackground(false);
      break;
    case 'enter':
    case 'tab':
      console.log(9999);
      test.value = !test.value;
      break;
    case 'space':
      handlePhotoClick();
    default:
      break;
  }
};
const switchBackground = (forword: boolean) => {
  if (!allBgImgs.value?.length) {
    currentBackground.value = undefined;
  }
  const array = [...allBgImgs.value, ''];
  const cur = currentBackground.value || '';
  const currentIndex = array.findIndex((i) => i == cur);
  let next = currentIndex;
  if (forword) {
    next = (next - 1) % array.length;
  } else {
    next = (next + 1) % array.length;
  }
  if (next < 0) {
    next = array.length + next;
  }
  handleBackgroundChanged(array[next]);
};
const handleBackgroundChanged = (img?: string) => {
  currentBackground.value = img;
};
const handleOpenAlbum = () => {
  window.api.openPhotosDir();
};
watchEffect(() => {
  if (currentBackground.value) {
    drawBackground(currentBackground.value);
  }
});
function drawBackground(imageUrl: string) {
  const bgCanvas = backgroundCanvas!;
  const ctx = bgCanvas?.getContext('2d')!;
  const backgroundImg = new Image();
  backgroundImg.src = imageUrl;
  backgroundImg.onload = () => {
    bgCanvas.width = backgroundImg.naturalWidth || backgroundImg.width;
    bgCanvas.height = backgroundImg.naturalHeight || backgroundImg.height;
    ctx?.drawImage(backgroundImg, 0, 0, backgroundImg.width, backgroundImg.height);
  };
}
</script>
<style lang="scss">
.camera {
  display: flex;
  flex-direction: column;
  flex: 1;
  width: 100vw;
  height: 100vh;
  position: relative;
  overflow: hidden;

  --camera-btn-color--light: rgba(252, 0, 0, 0.8);
  --camera-btn-color: rgba(252, 0, 0, 1);

  .footer {
    position: absolute;
    width: 100%;
    bottom: 0;
    left: 0;
    background-color: #ffffff;
    z-index: 100;
    opacity: 0.7;
    transition: opacity 0.8s ease;
    &.hide {
      opacity: 0;
    }
  }
  .viewport {
    flex: 1;
    position: relative;
    overflow: hidden;
    max-height: 100vh;
    #video {
      position: absolute;
      top: 0;
      left: 0;
      z-index: -1;
      object-fit: fill;
      visibility: hidden;
    }
    #view {
      position: relative;
      z-index: 1;
    }
    #background {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      object-fit: fill;
      z-index: 0;
      opacity: 0.9;
    }
  }
}
</style>
