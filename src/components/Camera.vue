<template>
  <div class="camera">
    <div class="viewport" ref="viewport">
      <video
        id="video"
        ref="videoRef"
        style="display: none"
        :style="{ width: styles?.width, height: styles?.height }"
      ></video>
      <canvas id="view" ref="viewRef" :style="{ width: styles?.width, height: styles?.height }"></canvas>
      <!-- <canvas id="back" ref="backgroundRef"></canvas> -->
      <!-- <canvas id="blur" ref="blurRef"></canvas> -->
      <!-- <canvas id="mask"></canvas> -->
    </div>
    <div class="controls">
      <div class="bg-switch"></div>
      <button class="camera-btn" @click="handlePhotoClick">拍照</button>
      <div class="previews">
        <div class="preview" v-for="item in previews">
          <img style="height: 60px; width: auto" :src="item" alt="preview" />
        </div>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import Camera from '@paddlejs-mediapipe/camera';
import * as humanseg from '@paddlejs-models/humanseg/lib/index';
import { computed, onMounted, onUnmounted, ref } from 'vue';
let camera: Camera;
const videoRef = ref<HTMLVideoElement>();
const viewRef = ref<HTMLCanvasElement>();
const backgroundRef = ref<HTMLCanvasElement>();
// const blurRef = ref<HTMLCanvasElement>();
// const maskRef = ref<HTMLCanvasElement>();
const viewport = ref<HTMLDivElement>();

const videoCanvas = document.createElement('canvas') as HTMLCanvasElement;
const videoCanvasCtx = videoCanvas.getContext('2d')!;

const styles = ref<Partial<CSSStyleDeclaration>>({});
const resizeObserver = new ResizeObserver((entrys) => {
  const { width, height } = entrys[0].contentRect;
  setSize(width, height);
});
onMounted(() => {
  resizeObserver.observe(viewport.value!);
});
onUnmounted(() => {
  resizeObserver.disconnect();
});
const setSize = (width: number, height: number) => {
  styles.value = {
    width: `${width}px`,
    height: `${height}px`,
  };
};
onMounted(async () => {
  // const back_canvas = document.getElementById('back') as HTMLCanvasElement;
  const background_canvas = document.createElement('canvas');
  background_canvas.width = viewRef.value!.clientWidth;
  background_canvas.height = viewRef.value!.clientHeight;

  const img = new Image();
  img.src = '/assets/bg-imgs/bg_01.jpg';
  img.onload = () => {
    background_canvas.getContext('2d')?.drawImage(img, 0, 0, background_canvas.width, background_canvas.height);
  };
  const canvas1 = viewRef.value!;
  const modelPath = '/ppsegv2_new/model.json';
  // await humanseg.load(true, false);
  camera = new Camera(videoRef.value!, {
    mirror: true,
    enableOnInactiveState: true,
    onFrame: async (video) => {
      // console.log(video);
      const { height = 0, width = 0 } = viewRef.value?.getBoundingClientRect() || {};
      videoCanvas.width = width;
      videoCanvas.height = height;
      videoCanvasCtx.drawImage(video, 0, 0, width, height);
      // const { data } = await humanseg.getGrayValue(videoCanvas);
      // humanseg.drawHumanSeg(data, canvas1, background_canvas);
      canvas1.getContext('2d')?.drawImage(videoCanvas, 0, 0, videoCanvas.width, videoCanvas.height);
    },
    videoLoaded: () => {
      camera.start();
    },
  });
});
const previews = ref<string[]>([]);
const handlePhotoClick = () => {
  camera.pause();
  previews.value.push(viewRef.value!.toDataURL());
  camera.start();
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
    position: relative;
    #video {
      width: 500px;
      height: 280px;
      transform: scaleX(-1);
      object-fit: contain;
    }
    #view {
      // transform: scaleX(-1);
      // width: 500px;
      // height: 280px;
      position: absolute;
      width: 100%;
      height: 100%;
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
    .previews {
      overflow-x: auto;
      overflow-y: hidden;
      display: flex;
      align-items: center;
      width: 200px;
      .preview {
        height: 60px;
        width: 96px;
        border: 1px solid #dedede;
        margin-right: 8px;
      }
    }
  }
}
</style>
