<template>
  <div class="camera">
    <div ref="viewport" class="viewport">
      <video id="video" ref="videoElement" playsinline></video>
      <canvas id="view" ref="outputCanvas"></canvas>
      <!-- <canvas id="hands" ref="gestureCanvas"></canvas> -->
      <img v-show="!!currentBackground" id="background" :src="currentBackground" alt="" />
      <audio v-show="false" ref="audioShutter" :src="shutterMp3" :loop="false" :volume="0.7"></audio>
      <div v-show="countdown >= 0" id="countdown" class="countdown">
        <span>{{ countdown }}</span>
      </div>
      <!-- <div v-show="palmCue && countdown < 0" id="palm-cue" class="palm-cue">
        <span
          ><el-icon :size="100"><Pointer /></el-icon
        ></span>
      </div> -->
    </div>
    <div ref="controlRef" class="footer">
      <Control
        :photo="lastPhoto"
        :cameras="cameras"
        @switch-camera="switchCamera"
        @shutter-click="handlePhotoClick"
        @open-background-dialog="handleOpenBackgroundDialog"
        @open-album="handleOpenAlbum"
      />
    </div>
    <BackgroundDialog
      v-model="dialogBackgroundVisible"
      :images="allBgImgs"
      :selected="currentBackground"
      @change="handleBackgroundChanged"
    />
  </div>
</template>
<script setup lang="ts">
import BackgroundDialog from './BackgroundDialog.vue';
import Control from './Contols.vue';
//import { Pointer } from '@element-plus/icons-vue';
import * as Mousetrap from 'mousetrap';
import { computed, onMounted, onUnmounted, ref, watchEffect } from 'vue';
import { useElementBounding, useIntervalFn } from '@vueuse/core';
import shutterMp3 from '../assets/camera-shutter.mp3?asset';
import useCamera from './useCamera';
import useAutoHide from './useAutoHide';
import { getCanvasSize } from './renderUtils';
const viewport = ref<HTMLDivElement>();
const {
  outputCanvas,
  videoElement,
  cameras,
  switchCamera,
  setVisualizationMode,
  takePhoto,
  setGestureSignal,
  videoSize,
} = useCamera({
  gestureRecognizerCallback,
});
const { container: controlRef } = useAutoHide();
const { width, height } = useElementBounding(viewport);
const bgImgs = ref<{ default: string[]; user: string[] }>();
const dialogBackgroundVisible = ref<boolean>(false);
const audioShutter = ref<HTMLAudioElement>();
const lastPhoto = ref<string>();
const countdown = ref<number>(-1);
//const palmCue = ref<boolean>(false);
const allBgImgs = computed(() => {
  return bgImgs.value?.default.concat(bgImgs.value.user) || [];
});
window.api.onBackgroundImageUpdate((imgs) => {
  bgImgs.value = imgs;
});
const currentBackground = ref<string>();
watchEffect(() => {
  if (!outputCanvas.value) {
    return;
  }
  outputCanvas.value!.style.transformOrigin = 'left top';
  const { scale, xOffset, yOffset } = getCanvasSize(width.value, height.value, videoSize.width, videoSize.height);

  outputCanvas.value!.style.transform = `scale(${scale}) translate( ${xOffset}px, ${yOffset}px )`;
});
const { pause, resume } = useIntervalFn(
  () => {
    countdown.value = countdown.value - 1;
    if (countdown.value < 0) {
      pause();
      Mousetrap.trigger('space');
    }
  },
  1000,
  { immediate: false }
);
const startCountdown = () => {
  countdown.value = 3;
  resume();
};
onMounted(async () => {
  Mousetrap.bind(['up', 'down', 'pageup', 'pagedown', 'left', 'right', 'enter', 'tab', 'space'], function (_e, combo) {
    onKeyboardShortcuts(combo);
  });
  await window.api.getBackgroundImages();
});
const handlePhotoClick = async () => {
  audioShutter.value?.play();
  const imageUrl = await takePhoto();
  if (imageUrl) {
    lastPhoto.value = imageUrl;
    window.api.savePhoto(imageUrl);
  }
  //恢复手势识别
  setGestureSignal(true);
};
const handleOpenBackgroundDialog = () => {
  dialogBackgroundVisible.value = true;
};

function gestureRecognizerCallback(gesture) {
  if (gesture === 'SlideLeft') {
    //暂停识别手势
    setGestureSignal(false);
    Mousetrap.trigger('down');
    //等待500ms后再开始识别手势
    setTimeout(() => {
      setGestureSignal(true);
    }, 500);
  } else if (gesture === 'SlideRight') {
    setGestureSignal(false);
    Mousetrap.trigger('up');
    setTimeout(() => {
      setGestureSignal(true);
    }, 500);
  } else if (gesture === 'Thumb_Up' || gesture === 'Victory') {
    //暂停识别手势，等待拍照玩完成
    setGestureSignal(false);
    startCountdown();
  }
  // else if (gesture === 'Open_Palm') {
  //   palmCue.value = true;
  //   //  //暂停识别手势
  //   //  setGestureSignal(false);
  //   // Mousetrap.trigger('down');
  //   // //等待500ms后再开始识别手势
  //   // setTimeout(() => {
  //   //   setGestureSignal(true);
  //   // }, 500);
  // }
}

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
      break;
    default:
      break;
  }
};
const switchBackground = (forword: boolean) => {
  if (!allBgImgs.value?.length) {
    currentBackground.value = 'none';
  }
  const array = [...allBgImgs.value, 'none', 'bokehEffect'];
  const cur = currentBackground.value || 'none';
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
  if (currentBackground.value === 'none' || currentBackground.value === 'bokehEffect') {
    setVisualizationMode(currentBackground.value);
  } else if (currentBackground.value != null) {
    setVisualizationMode('virtualBackground', currentBackground.value);
  }
});
onUnmounted(() => {
  Mousetrap.rest?.();
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
    height: 84px;
    &.hide {
      opacity: 0;
    }
  }
  .viewport {
    flex: 1;
    position: relative;
    overflow: hidden;
    max-height: 100vh; //calc(100vh - 84px);
    #video {
      position: absolute;
      top: 0;
      left: 0;
      z-index: -1;
      object-fit: fill;
      visibility: hidden;
    }
    #view {
      position: absolute;
      z-index: 1;
    }
    #countdown {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 150px;
      height: 150px;
      line-height: 100px;
      font-size: 100px;
      font-weight: 500;
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      color: #ffffff;
      border: 5px solid rgba(252, 0, 0, 0.8);
      // color: #00ff00b3;
    }
    #palm-cue {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 150px;
      height: 150px;
      line-height: 100px;
      font-size: 100px;
      font-weight: 500;
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      color: #ffffff;
      border: 5px solid rgba(252, 0, 0, 0.8);
      // color: #00ff00b3;
    }
    #background {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      object-fit: fill;
      z-index: 0;
      opacity: 0;
    }
  }
}
</style>
