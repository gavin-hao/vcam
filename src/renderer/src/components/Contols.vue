<template>
  <div class="controls">
    <div class="left">
      <button class="setting-btn" aria-label="设置背景图" title="设置背景" @click="handleBackgroundSettingClick">
        <!-- <img width="32" height="32" src="../assets/background-effect.svg" alt="" /> -->
        <el-icon :size="32"><Picture /></el-icon>
      </button>
      <button
        class="setting-btn"
        style="margin-left: 20px"
        aria-label="重制摄像头"
        title="重制摄像头"
        @click="switchCamera"
      >
        <el-icon :size="24"><VideoCamera /></el-icon>
        <!-- <img width="16" height="16" src="../assets/camera.svg" alt="" /> -->
      </button>
      <button
        class="setting-btn"
        style="margin-left: 20px"
        aria-label="切换模型"
        title="切换模型"
        @click="switchCamera"
      >
        <el-icon :size="24"><Switch /></el-icon>
        <!-- <img width="16" height="16" src="../assets/camera.svg" alt="" /> -->
      </button>
    </div>
    <button class="camera-btn" @click="handlePhotoClick">拍照</button>

    <div class="right">
      <div v-show="!!photo" class="photo-preview">
        <img :src="photo" alt="" />
      </div>
      <button class="setting-btn" title="相册" @click="handleAlbumlick">
        <!-- <img width="32" height="32" src="../assets/photo-album.svg" alt="" /> -->
        <el-icon :size="32"><Files /></el-icon>
      </button>
    </div>
  </div>
</template>
<script setup lang="ts">
import { VideoCamera, Switch, Picture, Files } from '@element-plus/icons-vue';
import { ElIcon } from 'element-plus';
defineProps<{
  photo?: string;
}>();

const emits = defineEmits(['switchCamera', 'shutterClick', 'openAlbum', 'openBackgroundDialog']);
const switchCamera = async () => {
  emits('switchCamera');
};
const handleAlbumlick = () => {
  emits('openAlbum');
};
const handlePhotoClick = () => {
  emits('shutterClick');
};
const handleBackgroundSettingClick = () => {
  emits('openBackgroundDialog');
};
</script>
<style lang="scss">
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
</style>
