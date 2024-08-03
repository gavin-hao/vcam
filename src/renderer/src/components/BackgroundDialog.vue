<template>
  <el-dialog width="60%" class="back-dialog" :modelValue="modelValue" @close="onClose" title="设置背景">
    <div class="bg-settings">
      <div class="image-list">
        <div
          class="image-item"
          v-for="image in images"
          :key="image"
          @click="selectImage(image)"
          :class="{ 'selected-image': image === selected }"
        >
          <div class="delete-btn" @click="handleRemoveBg(image)">
            <el-icon><Close /></el-icon>
          </div>
          <img :src="image" alt="" />
        </div>
        <div
          @click="selectImage('none')"
          class="image-item"
          :class="{ 'selected-image': !selected || images.length === 0 || selected == 'none' }"
        >
          无背景
        </div>
        <div
          @click="selectImage('bokehEffect')"
          class="image-item bokeh"
          :class="{ 'selected-image': selected === 'bokehEffect' }"
        >
          背景虚化
        </div>
      </div>
    </div>
    <template #footer>
      <div class="dialog-footer">
        <el-button type="primary" plain @click="handleAddBackgroundClick" :icon="Plus">添加背景图 </el-button>

        <el-button type="primary" @click="onClose()"> 确定 </el-button>
      </div>
    </template>
  </el-dialog>
</template>
<script setup lang="ts">
import { ElDialog, ElButton, ElIcon } from 'element-plus';
import { Plus, Close } from '@element-plus/icons-vue';
defineProps<{
  images: string[];
  selected?: string;
  modelValue?: boolean;
}>();
const emits = defineEmits<{
  (e: 'change', url?: string): void;
  (e: 'update:modelValue', visible: boolean): void;
}>();

const handleAddBackgroundClick = async () => {
  await window.api.addBackgroundImage();
};
const selectImage = (img?: string) => {
  emits('change', img);
};
const handleRemoveBg = async (img: string) => {
  await window.api.removeBackgroundImage(img);
};
const onClose = () => {
  emits('update:modelValue', false);
};
</script>
<style lang="scss" scoped>
@media screen and (min-width: 1920px) {
  :deep(.el-dialog) {
    --el-dialog-width: 640px;
  }
}

.dialog-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.selected-image {
  border: 2px solid rgb(25, 84, 128);
}
.bg-settings {
  padding: 24px;
  background-color: #eaeaea;
  border-radius: 4px;
  max-height: 320px;
  overflow-y: auto;
}

.image-list {
  display: flex;
  flex-direction: row;
  align-items: center;
  min-height: 200px;

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
    position: relative;
    &.bokeh {
      background-image: url('../assets/bg-bokeh.jpg');
      background-repeat: no-repeat;
      background-size: cover;
    }
    > img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      display: inline-block;
    }
    .delete-btn {
      position: absolute;
      right: 0px;
      top: 0px;
      display: none;
      color: #fff;
      cursor: pointer;
      font-size: 12px;
      padding: 4px;
      line-height: 0;
      border-radius: 50%;
      background-color: rgba(#666, 0.7);
    }
    &:hover {
      .delete-btn {
        display: block;
      }
    }
  }
}
</style>
