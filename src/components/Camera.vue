<template>
  <div class="camera">
    <div class="viewport" ref="viewport">
      <video id="video" ref="videoRef" playsinline :width="width" :height="height"></video>
      <canvas id="view" ref="viewRef"></canvas>
      <img id="background" v-show="!!selectedImage" :src="getUrl(selectedImage)" alt="" />
    </div>
    <div class="controls">
      <div class="left">
        <button class="setting-btn" aria-label="设置背景图" title="设置背景" @click="handleBackgroundSettingClick">
          <img width="32" height="32" src="../assets/background-effect.svg" alt="" />
        </button>
        <button
          class="setting-btn"
          style="margin-left: 20px"
          aria-label="重制摄像头"
          title="重制摄像头"
          @click="switchCamera"
        >
          <img width="16" height="16" src="../assets/camera.svg" alt="" />
        </button>
      </div>
      <button class="camera-btn" @click="handlePhotoClick">拍照</button>

      <div class="right">
        <div class="photo-preview" v-show="!!lastPhoto">
          <img :src="lastPhoto" alt="" />
        </div>
        <button class="setting-btn" title="相册" @click="handleAlbumlick">
          <img width="32" height="32" src="../assets/photo-album.svg" alt="" />
        </button>
      </div>
    </div>
  </div>
  <el-dialog width="80%" height="80%" class="back-dialog" v-model="dialogBackgroundVisible" title="设置背景图片">
    <div class="upload-bg">
      <el-button @click="handleAddBackgroundClick"
        >添加背景图
        <input type="file" id="uploadImg" ref="inputFile" @input="uploadImg" style="display: none" />
      </el-button>
    </div>
    <div class="image-container">
      <div class="title">系统图片</div>
      <div class="image-list">
        <div
          class="image-item"
          v-for="image in systemImage()"
          :key="image"
          @click="selectImage(image)"
          :class="{ 'selected-image': image === selectedImage }"
        >
          <img :src="getUrl(image)" alt="" />
        </div>
      </div>
    </div>
    <div class="image-container">
      <div class="title">自定义图片</div>
      <div class="image-list image-custom">
        <div
          class="image-item"
          v-for="image in customImage()"
          :key="image"
          @click="selectImage(image)"
          :class="{ 'selected-image': image === selectedImage }"
        >
          <img :src="getUrl(image)" alt="" />
        </div>
        <div
          @click="selectImage('')"
          class="image-item"
          :class="{ 'selected-image': selectedImage === '' || imageList.length === 0 }"
        >
          无背景
        </div>
      </div>
    </div>
    <div class="footer">
      <el-button @click="deleteImage" :disabled="selectedImageIsSystem">删除</el-button>
      <el-button @click="closeDialog">关闭</el-button>
    </div>
  </el-dialog>
  <audio src="/sound/camera-shutter.mp3" :loop="false" :volume="0.7" v-show="false" ref="audioShutter"></audio>
</template>
<script setup lang="ts">
import Camera from '@paddlejs-mediapipe/camera';
import * as humanseg from '@paddlejs-models/humanseg';
import { computed, onMounted, onUnmounted, ref, watchEffect } from 'vue';
import { useElementBounding } from '@vueuse/core';
import { ElDialog, ElButton } from 'element-plus';

let camera: Camera | null;
const inputFile = ref<HTMLInputElement>();
const videoRef = ref<HTMLVideoElement>();
const viewRef = ref<HTMLCanvasElement>();
const viewport = ref<HTMLDivElement>();
const { width, height } = useElementBounding(viewport);
const imageList = ref<string[]>([]);
const selectedImage = ref<string>('');
const dialogBackgroundVisible = ref<boolean>();
const backgroundCanvas = document.createElement('canvas') as HTMLCanvasElement;
const audioShutter = ref<HTMLAudioElement>();
const lastPhoto = ref<string>();
const cameraStart = ref<boolean>(false);
window.ipcRenderer.on('receive', (event, data) => {
  console.log(event, data);
  imageList.value = systemImage().concat(data);
});

const selectedImageIsSystem = computed(() => {
  return !selectedImage.value || systemImage().includes(selectedImage.value)
})

const deleteImage = () => {
  if (selectedImage.value) {
    window.ipcRenderer.send('delete-image', selectedImage.value);
    selectedImage.value = "";
  }
}

const customImage = () => {
  return imageList.value.filter((i) => !systemImage().includes(i))
}

const systemImage = () => {
  return ['0001.jpg', '0002.jpg', '0003.jpg', '0004.jpg']
}

const getUrl = (image: string) => {
  if (systemImage().includes(image)) {
    return '../dist-electron/upload/' + image;

  }
  return image;
};

const selectImage = (image: string) => {
  selectedImage.value = image;
};

const keyDown = (event: KeyboardEvent) => {
  const { code } = event;
  switch (code) {
    case 'ArrowLeft':
    case 'ArrowRight':
    case 'ArrowUp':
    case 'ArrowDown':
      changeImage(code);
      break;
    case 'Enter':
    case 'Space':
    case 'Tab':
      handlePhotoClick();
      break;
    default:
      break;
  }
};

const changeImage = (code: string) => {
  if (imageList.value.length === 0) {
    selectedImage.value = '';
    return;
  }
  if (selectedImage.value === '') {
    if (code === 'ArrowRight' || code === 'ArrowDown') {
      selectedImage.value = imageList.value[0];
    }
    if (code === 'ArrowLeft' || code === 'ArrowUp') {
      selectedImage.value = imageList.value[imageList.value.length - 1];
    }
  } else {
    let index = imageList.value.findIndex((item) => item === selectedImage.value);
    if (index > -1) {
      if (code === 'ArrowRight' || code === 'ArrowDown') {
        if (index + 1 === imageList.value.length) {
          selectedImage.value = '';
        } else {
          selectedImage.value = imageList.value[index + 1];
        }
      }
      if (code === 'ArrowLeft' || code === 'ArrowUp') {
        if (index === 0) {
          selectedImage.value = '';
        } else {
          selectedImage.value = imageList.value[index - 1];
        }
      }
    } else {
      selectedImage.value = '';
    }
  }
};

watchEffect(() => {
  if (selectedImage.value) {
    drawBackground(selectedImage.value);
  }
});
function drawBackground(imgName: string) {
  const bgCanvas = backgroundCanvas!;
  const ctx = bgCanvas?.getContext('2d')!;
  const backgroundImg = new Image();
  backgroundImg.src = getUrl(imgName);
  backgroundImg.onload = () => {
    bgCanvas.width = backgroundImg.naturalWidth || backgroundImg.width;
    bgCanvas.height = backgroundImg.naturalHeight || backgroundImg.height;
    ctx?.drawImage(backgroundImg, 0, 0, backgroundImg.width, backgroundImg.height);
  };
}

onMounted(async () => {
  selectedImage.value = '';
  document.addEventListener('keydown', function (event) {
    keyDown(event);
  });

  window.ipcRenderer.send('get-image-list');

  await humanseg.load(true, false);
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
      if (!!selectedImage.value) {
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
onUnmounted(() => {
  camera?.pause();
  camera = null;
  cameraStart.value = false;
});
// const previewPhotoCanvas = document.createElement('canvas') as HTMLCanvasElement;
const switchCamera = () => {
  if (!cameraStart.value) {
    alert('请先开启摄像头');
  }
  camera?.switchCameras();
};
const openGallery = () => {
  window.ipcRenderer.send('open-gallery');
};

const savePhoto = () => {
  const source = viewRef.value!;
  const imageUrl = source.toDataURL('image/jpeg');
  lastPhoto.value = imageUrl;

  window.ipcRenderer.send('save-image', imageUrl, new Date().getTime() + '.jpeg');
};
const handlePhotoClick = () => {
  if (!camera || !cameraStart.value) {
    return;
  }
  audioShutter.value!.play();
  camera!.pause();
  savePhoto();
  setTimeout(() => {
    camera!.start();
  }, 500);
};

const closeDialog = () => {
  dialogBackgroundVisible.value = false;
}

const handleBackgroundSettingClick = () => {
  dialogBackgroundVisible.value = true;
};
const handleAlbumlick = () => {
  openGallery();
};
const handleAddBackgroundClick = () => {
  inputFile.value?.click();
};

const uploadImg = (event: any) => {
  const file = event.target.files[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) {
    inputFile.value.value = '';
    alert('请上传图片文件！');
  }
  const reader = new FileReader();
  reader.onload = (e) => {
    // 发送文件到主进程处理
    window.ipcRenderer.send('upload-file', e.target?.result, file.name);
  };
  reader.readAsArrayBuffer(file);
};
</script>
<style lang="scss" scoped>

.selected-image {
  border: 2px solid aquamarine;
  width: 124px !important;
  height: 68px !important;
}
.upload-bg {
  margin-bottom: 12p;
}
.image-container {
  .title {
    padding: 10px 0;  
  }
}
.image-list {
  display: flex;
  flex-direction: row;
  align-items: center;
  min-height: 100px;

  overflow: auto;
  flex-wrap: wrap;
  .image-item {
    align-items: center;
    justify-content: center;
    background-color: beige;
    border-radius: 4px;
    width: 128px;
    height: 72px;
    padding: 5px;
    display: flex;
    align-items: center;
    padding: 4px;
    margin: 4px;
    > img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      display: inline-block;
    }
  }
}

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

  .viewport {
    flex: 1;
    background: #dedede;
    height: calc(100vh - 84px);
    max-height: calc(100vh - 84px);
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
      // transform: scaleX(-1);
      position: relative;
      z-index: 1;
      // opacity: 0;
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

  .controls {
    flex: auto;
    display: flex;
    align-items: center;
    height: 84px;
    max-height: 84px;
    justify-content: space-between;
    padding: 2px 12px;
    .setting-btn {
      padding: 2px;
      outline: none;
      &:focus {
        outline: none;
      }
    }

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
    .left,
    .right {
      width: 30%;
      display: flex;
      align-items: center;
    }
    .right {
      justify-content: end;
    }
  }
  .photo-preview {
    width: 150px;
    height: 80px;
    padding: 0 4px;
    background-color: #dedede;
    img {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
  }
}
.el-dialog__body {
  height: 600px;
}
.footer {
  text-align: right;
}
</style>
