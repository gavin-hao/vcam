<template>
  <div class="camera">
    <div ref="viewport" class="viewport">
      <video id="video" ref="videoElement" playsinline></video>
      <canvas id="view" ref="outputCanvas"></canvas>
      <!-- <canvas id="hands" ref="gestureCanvas"></canvas> -->
      <img v-show="!!currentBackground" id="background" :src="currentBackground" alt="" />
      <audio v-show="false" ref="audioShutter" :src="shutterMp3" :loop="false" :volume="0.7"></audio>
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
import * as Mousetrap from 'mousetrap';
import { computed, onMounted, onUnmounted, ref, watch, watchEffect } from 'vue';
import { useElementBounding } from '@vueuse/core';
import shutterMp3 from '../assets/camera-shutter.mp3?asset';
import useCamera from './useCamera';
import useAutoHide from './useAutoHide';
const viewport = ref<HTMLDivElement>();
const { outputCanvas, videoElement, cameras, switchCamera, setVisualizationMode, takePhoto, videoSize } = useCamera({
  gestureRecognizerCallback,
});
const { container: controlRef } = useAutoHide();
const { width, height } = useElementBounding(viewport);
const bgImgs = ref<{ default: string[]; user: string[] }>();
const dialogBackgroundVisible = ref<boolean>(false);
const audioShutter = ref<HTMLAudioElement>();
const lastPhoto = ref<string>();
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
  // always 16/9 保持宽高比不变缩放
  const aspect = videoSize.width / videoSize.height;
  let scale, xOffset, yOffset;
  if (width.value / height.value > aspect) {
    // 如果放缩后屏幕【宽】，就用屏幕高度计算放缩
    scale = height.value / videoSize.height;
    xOffset = (width.value - videoSize.width * scale) / 2 / scale;
    yOffset = (height.value - videoSize.height * scale) / 2 / scale;
    // 设置新算出来的scale
  } else {
    // 如果放缩后屏幕【窄】，就用屏幕宽度计算放缩
    // 设置新算出来的scale
    scale = width.value / videoSize.width;
    xOffset = (width.value - videoSize.width * scale) / 2 / scale;
    yOffset = (height.value - videoSize.height * scale) / 2 / scale;
  }
  outputCanvas.value!.style.transform = `scale(${scale}) translate( ${xOffset}px, ${yOffset}px )`;
});
onMounted(async () => {
  Mousetrap.bind(['up', 'down', 'pageup', 'pagedown', 'left', 'right', 'enter', 'tab', 'space'], function (_e, combo) {
    console.log(1111232131231);
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
};
const handleOpenBackgroundDialog = () => {
  dialogBackgroundVisible.value = true;
};

const resultRef = ref({ x: [] as number[], y: [] as number[], handedness: '' as string });
const dealCoordinates = (landmarks, handedness) => {
  const y = [] as number[];
  const x = [] as number[];
  if (!landmarks) return;
  landmarks.forEach((item, index) => {
    if (index >= 5 && index < 17) {
      y.push(item.y < landmarks[index + 4].y ? 1 : -1);
    }
    if (index >= 8 && index % 4 === 0) {
      x.push(item.x > landmarks[index - 3].x ? 1 : -1);
    }
  });
  resultRef.value = { x: x, y: y, handedness: handedness[0].categoryName };
};

function gestureRecognizerCallback(gesture, result) {
  // if (gesture === 'SlideLeft') {
  //   Mousetrap.trigger('down');
  // } else if (gesture === 'SlideRight') {
  //   Mousetrap.trigger('up');
  // } else if (gesture === 'Thumb_Up' || gesture === 'Open_Palm' || gesture === 'Victory') {
  //   Mousetrap.trigger('space');
  // } else {
  //   dealCoordinates(result.landmarks[0]);
  // }
  console.log(result, 'result');
  if (gesture === 'Victory') {
    Mousetrap.trigger('space');
  } else {
    dealCoordinates(result.landmarks[0], result.handedness[0]);
  }
}

const gesture = ref([] as { location: string; handedness: string }[]);

const getLocation = (value: { x: number[]; y: number[]; handedness: string }) => {
  const yTop = value.y.filter((item) => item > 0).length >= 10;
  const xTop = value.x.filter((item) => item > 0).length >= 3;
  const xBottom = value.x.filter((item) => item < 0).length >= 3;
  if (yTop && xTop) return { location: 'left', handedness: value.handedness };
  if (yTop && xBottom) return { location: 'right', handedness: value.handedness };
  return { location: '', handedness: value.handedness };
};

const setGesture = (value: { x: number[]; y: number[]; handedness: string }) => {
  const location = getLocation(value);
  if (location.location === '' || location.handedness === '') {
    console.log(123);
  } else {
    gesture.value.push(location);
    if (gesture.value.length > 2) {
      gesture.value = gesture.value.slice(-2);
    }
  }
};

watch(
  () => resultRef.value,
  (newVal) => {
    // console.log(gesture.value, 1112233);
    // if (gesture.value === '') {
    //   setGesture(newVal);
    //   return;
    // }
    // const newLocation = getLocation(newVal);
    // console.log(gesture.value, newLocation, 77777);
    // if (gesture.value !== newLocation && newLocation !== '') {
    //   Mousetrap.trigger(newLocation);
    //   gesture.value = '';
    // }
    // =========
    console.log(gesture.value, 1111);
    const newLocation = getLocation(newVal);
    if (newLocation.location === '') {
      return;
    }
    if (
      gesture.value.length < 2 ||
      gesture.value[0].location !== gesture.value[1].location ||
      gesture.value[0].handedness !== gesture.value[1].handedness
    ) {
      setGesture(newVal);
      return;
    }
    if (newLocation.location === gesture.value[0].location) {
      return;
    }
    if (newLocation.handedness !== newLocation.location) {
      Mousetrap.trigger(newLocation.location);
      gesture.value = [];
    }
  },
  { deep: true }
);

const onKeyboardShortcuts = (combo: string) => {
  console.error(combo, 'combo');
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
    currentBackground.value = 'none';
  }
  const array = [...allBgImgs.value, 'none', 'bokehEffect'];
  const cur = currentBackground.value || 'none';
  const currentIndex = array.findIndex((i) => i == cur);
  let next = currentIndex;
  console.log(forword, 'xxxxxxx');
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
  console.error(img, 111122223333);
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
      position: relative;
      z-index: 1;
    }
    // #hands {
    //   position: absolute;
    //   top: 0;
    //   left: 0;
    //   z-index: 2;
    // }
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
