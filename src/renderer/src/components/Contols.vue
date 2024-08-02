<template>
  <div class="controls">
    <div class="left">
      <button class="setting-btn" aria-label="设置背景图" title="设置背景" @click="handleBackgroundSettingClick">
        <el-icon :size="24"><Setting /></el-icon>
      </button>
      <el-dropdown v-if="cameras.length > 1" trigger="click" @command="handleSwitchCamera">
        <button
          class="setting-btn"
          style="margin-left: 20px"
          aria-label="重制摄像头"
          title="重制摄像头"
          ref="buttonRef"
        >
          <el-icon :size="24"><VideoCamera /></el-icon>
        </button>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item :command="camera.deviceId" v-for="camera in cameras"
              ><span class="camera-info">{{ camera.label }}</span></el-dropdown-item
            >
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>
    <button class="camera-btn" @click="handlePhotoClick">拍照</button>

    <div class="right">
      <div class="photo-preview" v-show="!!photo">
        <img :src="photo" alt="" />
      </div>
      <button class="setting-btn" title="相册" @click="handleAlbumlick">
        <el-icon :size="24"><Files /></el-icon>
      </button>
    </div>
  </div>
</template>
<script setup lang="ts">
import { ref } from 'vue';
import { VideoCamera, Picture, Setting, Files } from '@element-plus/icons-vue';
import { ElIcon, ElDropdown, ElDropdownMenu, ElDropdownItem } from 'element-plus';

const buttonRef = ref();

defineProps<{
  photo?: string;
  cameras: MediaDeviceInfo[];
}>();

const emits = defineEmits(['switchCamera', 'shutterClick', 'openAlbum', 'openBackgroundDialog']);
const handleSwitchCamera = async (cmd: string) => {
  emits('switchCamera', cmd);
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
.camera-info {
  display: inline-block;
  max-width: 200px;
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
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
</style>
