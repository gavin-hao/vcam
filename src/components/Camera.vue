<template>
  <!-- <div class="container"> -->
  <!-- <div class="sidebar">
      <input type="file" id="uploadImg" @input="uploadImg">
      <div class="image-list" v-for="image in imageList" :key="image" @click="selectImage(image)">
        <div class="image-item" :class="{ 'selected-image': image === selectedImage }">
          <img width="200" height="150" :src="getUrl(image)" alt="">
        </div>
      </div>
    </div> -->
  <div class="camera">
    <div class="viewport" ref="viewport">
      <video id="video" ref="videoRef" playsinline :width="width" :height="height"></video>
      <canvas id="view" ref="viewRef"></canvas>
      <!-- <canvas id="background" ref="background" :width="width" :height="height"> </canvas> -->
    </div>
    <div class="controls">
      <div class="bg-switch"></div>
      <button class="camera-btn" @click="handlePhotoClick">拍照</button>
      <div class="filter-effects"></div>
    </div>
  </div>
  <!-- </div> -->
</template>
<script setup lang="ts">
import Camera from '@paddlejs-mediapipe/camera';
import * as humanseg from '@paddlejs-models/humanseg';
import { onMounted, ref, watch, watchEffect } from 'vue';
// import image from '../assets/bg-imgs/bg_01.jpg';
// import fs from 'fs';
import { useElementBounding } from '@vueuse/core';

let camera: Camera;
const videoRef = ref<HTMLVideoElement>();
const viewRef = ref<HTMLCanvasElement>();
const viewport = ref<HTMLDivElement>();
const { width, height } = useElementBounding(viewport);
const imageList = ref<string[]>([]);
const selectedImage = ref<string>();
const backgroundCanvas = document.createElement('canvas') as HTMLCanvasElement;

// const videoCanvas = document.createElement('canvas') as HTMLCanvasElement;
// const videoCanvasCtx = videoCanvas.getContext('2d')!;

ipcRenderer.on('receive', (event, data) => {
  console.log(data, 88888); // 输出: 这是主进程的数据
  imageList.value = data;
  selectedImage.value = data[0];
});

const getUrl = (image) => {
  return '/dist-electron/upload/' + image;
};

const selectImage = (image) => {
  selectedImage.value = image;
};

const arrowDown = () => {
  console.log('arrowDown');
};

const keyDown = (event) => {
  console.log(event);
  const { code, shiftKey, ctrlKey } = event;
  switch (code) {
    case 'ArrowDown':
    case 'ArrowUp':
      changeImage(code);
      break;
    case 'Enter':
    case 'Space':
      handlePhotoClick();
      break;
    default:
      break;
  }
};

const changeImage = (code) => {
  let index = imageList.value.findIndex((item) => item === selectedImage.value);
  if (index > -1) {
    if (code === 'ArrowDown') {
      index = index + 1 === imageList.value.length ? index : index + 1;
    }
    if (code === 'ArrowUp') {
      index = index === 0 ? 0 : index - 1;
    }
    selectedImage.value = imageList.value[index];
  } else {
    selectedImage.value = imageList.value[0];
  }
};

// watch(
//   () => [selectedImage.value],
//   () => {
//     console.log(selectedImage.value, 12321312);
//     const backCanvas = document.getElementById('back') as HTMLCanvasElement;
//     if (!backCanvas) return;
//     const ctx = backCanvas.getContext('2d');
//     backCanvas.width = 640;
//     backCanvas.height = 480;
//     const img = new Image();
//     img.onload = () => {
//       ctx.drawImage(img, 0, 0, 640, 480);
//     };
//     img.src = getUrl(selectedImage.value);
//     console.log(img, 'img');

//   }
// );
watchEffect(() => {
  if (selectedImage.value) {
    drawBackground(selectedImage.value);
  }
});
function drawBackground(imgName: string) {
  const ctx = backgroundCanvas.getContext('2d')!;
  const backgroundImg = new Image();
  backgroundImg.src = getUrl(imgName);
  backgroundImg.onload = () => {
    const imgWidth = backgroundImg.width || 1920;
    const imgHeight = backgroundImg.height || 1080;
    // var imgRect = containImg(0, 0, width.value, height.value, imgWidth, imgHeight);

    ctx.drawImage(backgroundImg, 0, 0);
  };
}
function containImg(box_x: number, box_y: number, box_w: number, box_h: number, source_w: number, source_h: number) {
  var dx = box_x,
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
onMounted(async () => {
  document.addEventListener('keydown', function (event) {
    keyDown(event);
  });

  window.ipcRenderer.send('get-image-list');

  await humanseg.load(true, false);
  camera = new Camera(videoRef.value!, {
    mirror: true,
    enableOnInactiveState: true,
    onFrame: async (video) => {
      const view = viewRef.value!;
      view.width = video.width;
      view.height = view.height;
      const { data } = await humanseg.getGrayValue(video);
      humanseg.drawHumanSeg(data, view, backgroundCanvas);
    },
    videoLoaded: () => {
      camera.start();
    },
  });
});

const handlePhotoClick = () => {
  // const res = camera.pause();
  // console.log(res, '111111');
};

const uploadImg = (event) => {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    // 发送文件到主进程处理
    console.log(1111, e.target.result);

    window.ipcRenderer.send('upload-file', e.target.result, file.name);
  };
  reader.readAsArrayBuffer(file);
};
</script>
<style lang="scss" scoped>
.selected-image {
  border: 1px solid blue;
}

.image-list {
}

.container {
  display: flex;
  flex: 1;
}

.camera {
  display: flex;
  flex-direction: column;
  flex: 1;
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;

  --camera-btn-color--light: rgba(252, 0, 0, 0.8);
  --camera-btn-color: rgba(252, 0, 0, 1);

  .viewport {
    flex: 1;
    background: #dedede;
    height: calc(100vh - 84px);
    position: relative;
    overflow: hidden;
    #video {
      position: absolute;
      top: 0;
      left: 0;
      z-index: -1;
      object-fit: fill;
      visibility: hidden;
    }

    #view {
      transform: scaleX(-1);
      position: relative;
      z-index: 1;
    }
    // #background {
    //   position: absolute;
    //   top: 0;
    //   left: 0;
    //   object-fit: fill;
    //   z-index: -1;
    //   opacity: 0.5;
    // }
  }

  .controls {
    flex: 0;
    display: flex;
    align-items: center;
    height: 84px;
    justify-content: space-between;
    padding: 12px;

    .camera-btn {
      margin: 0;
      padding: 0;
      outline: none;
      transition: all 0.3s ease-in;
      position: relative;
      display: inline-block;
      width: 60px;
      height: 60px;
      border: 2px solid var(--camera-btn-color--light);
      background-color: transparent;
      color: white;
      font-size: 16px;
      cursor: pointer;
      border-radius: 50%;
      overflow: hidden;

      &:focus {
        outline: none;
      }

      &:active {
        &::before {
          transform: translate(-50%, -50%) scale(0.8);
        }
      }

      &:hover {
        border-color: var(--camera-btn-color);

        &::before {
          background-color: var(--camera-btn-color--light);
        }
      }

      &::before {
        content: '';
        position: absolute;
        box-sizing: border-box;
        top: 50%;
        left: 50%;
        width: 48px;
        height: 48px;
        border: transparent;
        border-radius: 50%;
        background-color: var(--camera-btn-color);
        transform: translate(-50%, -50%);
        opacity: 1;
        transition: all 0.3s ease;
      }
    }
  }
}
</style>
