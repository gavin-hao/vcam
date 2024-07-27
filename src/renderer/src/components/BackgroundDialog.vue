<template>
  <el-dialog
    width="80%"
    height="80%"
    class="back-dialog"
    :modelValue="modelValue"
    @close="onClose"
    title="设置背景图片"
  >
    <div class="upload-bg">
      <el-button @click="handleAddBackgroundClick">添加背景图 </el-button>
    </div>
    <div class="image-list">
      <div
        class="image-item"
        v-for="image in images"
        :key="image"
        @click="selectImage(image)"
        :class="{ 'selected-image': image === selected }"
      >
        <img :src="image" alt="" />
      </div>
      <div @click="selectImage('')" class="image-item" :class="{ 'selected-image': !selected || images.length === 0 }">
        无背景
      </div>
    </div>
  </el-dialog>
</template>
<script setup lang="ts">
import { ElDialog, ElButton } from 'element-plus';
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
const onClose = () => {
  emits('update:modelValue', false);
};
</script>
<style lang="scss" scoped>
.selected-image {
  border: 2px solid rgb(25, 84, 128);
}
.upload-bg {
  margin-bottom: 12p;
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
    > img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      display: inline-block;
    }
  }
}
</style>
