<template>
  <div class="camera">
    <div class="viewport" ref="viewport">
      <video id="video" ref="videoRef" playsinline :width="width" :height="height"></video>
      <canvas id="view" ref="viewRef"></canvas>
      <img id="background" v-show="!!currentBackground" :src="currentBackground" alt="" />
      <audio :src="shutterMp3" :loop="false" :volume="0.7" v-show="false" ref="audioShutter"></audio>
    </div>
    <div class="footer" :class="clsHideControl" ref="controlRef">
      <Control
        :photo="lastPhoto"
        @switchCamera="switchCamera"
        @shutter-click="handlePhotoClick"
        @openBackgroundDialog="handleOpenBackgroundDialog"
        @openAlbum="handleOpenAlbum"
      />
    </div>
    <BackgroundDialog
      :images="allBgImgs"
      :selected="currentBackground"
      v-model="dialogBackgroundVisible"
      @change="handleBackgroundChanged"
    />
  </div>
</template>
<script setup lang="ts">
import BackgroundDialog from './BackgroundDialog.vue';
import Control from './Contols.vue';
import Camera from '@paddlejs-mediapipe/camera';
import * as Mousetrap from 'mousetrap';
import * as humanseg from '@paddlejs-models/humanseg';
import { computed, onMounted, ref, watchEffect } from 'vue';
import { useElementBounding, useEventListener, useTimeout } from '@vueuse/core';
import shutterMp3 from '../assets/camera-shutter.mp3?asset';

const viewport = ref<HTMLDivElement>();
const viewRef = ref<HTMLCanvasElement>();
const videoRef = ref<HTMLVideoElement>();
const controlRef = ref<HTMLDivElement>();
// import { ElDialog, ElButton } from 'element-plus';
const { width, height } = useElementBounding(viewport);
const bgImgs = ref<{ default: string[]; user: string[] }>();
let camera: Camera | null;
const dialogBackgroundVisible = ref<boolean>(false);
const backgroundCanvas = document.createElement('canvas') as HTMLCanvasElement;
const audioShutter = ref<HTMLAudioElement>();
const lastPhoto = ref<string>();
const cameraStart = ref<boolean>(false);
const allBgImgs = computed(() => {
  return bgImgs.value?.default.concat(bgImgs.value.user) || [];
});
const models = ref<Array<{ key: string; path: string }>>();
window.api.onBackgroundImageUpdate((imgs) => {
  bgImgs.value = imgs;
});
const currentBackground = ref<string>();
const modelConfig = ref<string>('ppseg-398x224');
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
  models.value = (await window.api.getModleFiles()) || [];
  if (!models.value) {
    alert('加载模型错误');
    return;
  }
  const modelUrl = models.value.find((m) => m.key === modelConfig.value)?.path;
  if (!modelUrl) {
    return;
  }
  await humanseg.load(true, false, modelUrl);
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
      const view = viewRef.value!;
      if (!!currentBackground.value) {
        const { data } = await humanseg.getGrayValue(video);
        humanseg.drawHumanSeg(data, view, backgroundCanvas);
      } else {
        view.width = video.width;
        view.height = video.height;
        view.getContext('2d')?.drawImage(video, 0, 0, video.width, video.height);
      }
    },
    videoLoaded: () => {
      camera!.start();
    },
  });
});
const handlePhotoClick = () => {
  if (!camera || !cameraStart.value) {
    return;
  }
  audioShutter.value?.play();
  camera!.pause();
  const source = viewRef.value!;
  const imageUrl = source.toDataURL('image/jpeg');
  lastPhoto.value = imageUrl;
  window.api.savePhoto(imageUrl);
  setTimeout(() => {
    camera!.start();
  }, 500);
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
