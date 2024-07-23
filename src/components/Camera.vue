<template>
  <div class="container">
    <div class="sidebar">
      <input type="file" id="uploadImg" @input="uploadImg">
      <div class="image-list" v-for="image in imageList" :key="image" @click="selectImage(image)">
        <div class="image-item" :class="{ 'selected-image': image === selectedImage }">
          <img width="200" height="150" :src="getUrl(image)" alt="">
        </div>
      </div>
    </div>
    <div class="main">
      <div class="camera">
        <div class="viewport" ref="viewport">
          <video id="video" ref="videoRef" width="640" height="480" style="opacity: 0;"></video>
          <canvas id="view" ref="viewRef" width="640" height="480"></canvas>
          <canvas id="back" ref="backgroundRef" width="640" height="480"></canvas>
        </div>
        <div class="controls">
          <div class="bg-switch"></div>
          <button class="camera-btn" @click="handlePhotoClick">拍照</button>
          <div class="filter-effects"></div>
        </div>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import Camera from '@paddlejs-mediapipe/camera';
import * as humanseg from '@paddlejs-models/humanseg';
import { onMounted, ref, watch } from 'vue';
import image from '../assets/bg-imgs/bg_01.jpg';
import fs from 'fs';

let camera: Camera;
const videoRef = ref<HTMLVideoElement>();
const viewRef = ref<HTMLCanvasElement>();
const backgroundRef = ref<HTMLCanvasElement>();
const viewport = ref<HTMLDivElement>();

const imageList = ref([])
const selectedImage = ref([])

const videoCanvas = document.createElement('canvas') as HTMLCanvasElement;
const videoCanvasCtx = videoCanvas.getContext('2d')!;


ipcRenderer.on('receive', (event, data) => {
  console.log(data, 88888); // 输出: 这是主进程的数据
  imageList.value = data
  selectedImage.value = data[0]
});

const getUrl = (image) => {
  return '/dist-electron/upload/' + image
}

const selectImage = (image) => {
  selectedImage.value = image
}


const arrowDown = () => {
  console.log('arrowDown')
}

const keyDown = (event) => {
  console.log(event)
  const { code, shiftKey, ctrlKey} = event
  switch (code) {
    case 'ArrowDown':
    case 'ArrowUp':
      changeImage(code)
      break;
    case 'Enter':
    case 'Space':
      handlePhotoClick()
      break;
    default:
      break;
  }
}

const changeImage = (code) => {
  let index = imageList.value.findIndex((item) => item === selectedImage.value)
  if (index > -1) {
    if (code === 'ArrowDown') {
      index = (index + 1) === imageList.value.length ? index : index + 1
    }
    if (code === 'ArrowUp') {
      index = index === 0 ? 0 : index - 1
    }
    selectedImage.value = imageList.value[index]
  } else {
    selectedImage.value = imageList.value[0]
  }
}

watch(() => [selectedImage.value], () => {
  console.log(selectedImage.value, 12321312)
  const backCanvas = document.getElementById('back') as HTMLCanvasElement;
  if (!backCanvas) return;
  const ctx = backCanvas.getContext('2d')
  backCanvas.width = 640;
  backCanvas.height = 480;
  const img = new Image();
  img.onload = () => {
    ctx.drawImage(img, 0, 0, 640, 480);
  };
  img.src = getUrl(selectedImage.value)
  console.log(img, 'img')
})

onMounted(async () => {
  document.addEventListener('keydown', function (event) {
    keyDown(event)
  })


  window.ipcRenderer.send('get-image-list')

  await humanseg.load(true, false);
  const backCanvas = document.getElementById('back') as HTMLCanvasElement;
  camera = new Camera(videoRef.value!, {
    mirror: true,
    enableOnInactiveState: true,
    onFrame: (async (video) => {
      const view = viewRef.value!;
      const { data } = await humanseg.getGrayValue(video)
      humanseg.drawHumanSeg(data, view, backCanvas);
    }),
    videoLoaded: () => {
      camera.start();
    },
  });
});


const handlePhotoClick = () => {
  const res = camera.pause()
  console.log(res, '111111')
};

const uploadImg = (event) => {
  const file = event.target.files[0];
  if (!file) return
  const reader = new FileReader();
  reader.onload = (e) => {
    // 发送文件到主进程处理
    console.log(1111, e.target.result)

    window.ipcRenderer.send('upload-file', e.target.result, file.name);
  };
  reader.readAsArrayBuffer(file);
}



</script>
<style lang="scss" scoped>
body {}

.selected-image {
  border: 1px solid blue;
}

.image-list {}

#root {
  width: 100vh;
  height: 100vh;
}

.container {
  display: flex;
}

.sidebar {
  flex: 0 0 200px;
  /* 固定宽度 */
  background: #f9f9f9;
  margin: 10px;
  /* padding: 20px 5px; */
}

.main {
  /* padding: 20px 10px; */
  flex: 1;
  /* 占据剩余空间 */
  background: #f9f9f9;
  margin: 10px;
  min-width: 0;
  /* 防止内容溢出 */
  height: 100%;
}

#video {
  min-height: calc(100% - 50px);
  /* 减去底部栏的高度 */
  background-color: black;
}

.footer {
  position: absolute;
  bottom: 0;
  width: 100%;
  height: 50px;
  /* 底部栏的高度 */
  background-color: #333;
  color: white;
}



.camera {
  display: flex;
  flex-direction: column;
  flex: 1;
  --camera-btn-color--light: rgba(252, 0, 0, 0.8);
  --camera-btn-color: rgba(252, 0, 0, 1);

  .viewport {
    flex: 1;
    background: #dedede;

    #video {
      width: 500px;
      height: 280px;
      transform: scaleX(-1);
      object-fit: contain;
    }

    #view {
      transform: scaleX(-1);
      width: 500px;
      height: 280px;
    }
  }

  .controls {
    flex: 0;
    display: flex;
    align-items: center;
    height: 60px;
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
