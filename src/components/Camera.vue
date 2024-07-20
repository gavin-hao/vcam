<template>
  <div class="camera">
    <div class="viewport" ref="viewport">
      <video id="video" ref="videoRef"></video>
      <canvas id="view" ref="viewRef"></canvas>
      <canvas id="back" ref="backgroundRef"></canvas>
      <!-- <canvas id="blur" ref="blurRef"></canvas> -->
      <!-- <canvas id="mask"></canvas> -->
    </div>
    <div class="controls">
      <div class="bg-switch"></div>
      <button class="camera-btn" @click="handlePhotoClick">拍照</button>
      <div class="filter-effects"></div>
    </div>
  </div>
</template>
<script setup lang="ts">
import Camera from '@paddlejs-mediapipe/camera';
import * as humanseg from '@paddlejs-models/humanseg/lib/index';
import { onMounted, ref } from 'vue';
let camera: Camera;
const videoRef = ref<HTMLVideoElement>();
const viewRef = ref<HTMLCanvasElement>();
const backgroundRef = ref<HTMLCanvasElement>();
// const blurRef = ref<HTMLCanvasElement>();
// const maskRef = ref<HTMLCanvasElement>();
const viewport = ref<HTMLDivElement>();

const videoCanvas = document.createElement('canvas') as HTMLCanvasElement;
const videoCanvasCtx = videoCanvas.getContext('2d')!;

onMounted(async () => {
  const back_canvas = document.getElementById('back') as HTMLCanvasElement;
  const background_canvas = document.createElement('canvas');
  background_canvas.width = back_canvas.width;
  background_canvas.height = back_canvas.height;

  const img = new Image();
  img.src = '/assets/bg-imgs/bg_01.jpg';
  img.onload = () => {
    background_canvas.getContext('2d')?.drawImage(img, 0, 0, background_canvas.width, background_canvas.height);
  };
  const canvas1 = viewRef.value!;
  const modelPath = '/ppsegv2_new/model.json';
  await humanseg.load(true, false, modelPath);
  camera = new Camera(videoRef.value!, {
    mirror: true,
    enableOnInactiveState: true,
    onFrame: async (video) => {
      videoCanvas.width = video.width;
      videoCanvas.height = video.height;
      videoCanvasCtx.drawImage(video, 0, 0, video.width, video.height);
      const { data } = await humanseg.getGrayValue(videoCanvas);
      humanseg.drawHumanSeg(data, canvas1, background_canvas);
    },
    videoLoaded: () => {
      camera.start();
    },
  });
});
const handlePhotoClick = () => {
  camera.pause();
};
</script>
<style lang="scss" scoped>
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
