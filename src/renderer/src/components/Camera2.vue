<template>
  <div class="camera">
    <div class="viewport" ref="viewport">
      <video id="video" ref="videoElement" playsinline :width="width" :height="height"></video>
      <canvas id="view" ref="outputCanvas"></canvas>
      <img id="background" v-show="!!currentBackground" :src="currentBackground" alt="" />
      <audio :src="shutterMp3" :loop="false" :volume="0.7" v-show="false" ref="audioShutter"></audio>
    </div>
    <div class="footer" ref="controlRef">
      <Control
        :photo="lastPhoto"
        :cameras="cameras"
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
import * as Mousetrap from 'mousetrap';
import * as humanseg from '../paddle/index_gpu';
import { computed, onMounted, ref, watchEffect } from 'vue';
import { useElementBounding } from '@vueuse/core';
import shutterMp3 from '../assets/camera-shutter.mp3?asset';
import useCamera from './useCamera';
import useAutoHide from './useAutoHide';
const viewport = ref<HTMLDivElement>();
const { outputCanvas, videoElement, cameras, switchCamera, updateBackground, takePhoto } = useCamera();
const { container: controlRef } = useAutoHide();
const { width, height } = useElementBounding(viewport);
const bgImgs = ref<{ default: string[]; user: string[] }>();
const dialogBackgroundVisible = ref<boolean>(false);
const audioShutter = ref<HTMLAudioElement>();
const lastPhoto = ref<string>();
const allBgImgs = computed(() => {
  return bgImgs.value?.default.concat(bgImgs.value.user) || [];
});
const models = ref<Array<{ key: string; path: string }>>();
window.api.onBackgroundImageUpdate((imgs) => {
  bgImgs.value = imgs;
});
const currentBackground = ref<string>();
const modelConfig = ref<string>('ppsegv2');

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
  const modelUrl = models.value.find((m) => m.key === modelConfig.value)?.path;
  if (!modelUrl) {
    return;
  }
  console.log(modelUrl, 'modelUrl');
  await humanseg.load({}, modelUrl);
});
const handlePhotoClick = async () => {
  audioShutter.value?.play();
  const imageUrl = await takePhoto();
  if (imageUrl) {
    lastPhoto.value = imageUrl;
    window.api.savePhoto(imageUrl);
  }
};
const handleOpenBackgroundDialog = () => {
  dialogBackgroundVisible.value = true;
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
    updateBackground(currentBackground.value);
  }
});
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
