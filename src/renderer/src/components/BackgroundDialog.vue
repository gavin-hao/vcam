<template>
  <el-dialog
    width="80%"
    height="80%"
    class="back-dialog"
    :model-value="modelValue"
    title="设置背景图片"
    @close="onClose"
  >
    <div class="upload-bg">
      <el-button @click="handleAddBackgroundClick">添加背景图 </el-button>
    </div>
    <div class="image-container">
      <div class="title">系统图片</div>
      <div class="image-list">
        <div
          v-for="image in images.default"
          :key="image"
          class="image-item"
          :class="{ 'selected-image': image === selected }"
          @click="selectImage(image)"
        >
          <img :src="image" alt="" />
        </div>
      </div>
    </div>
    <div class="image-container">
      <div class="title">自定义图片</div>
      <div class="image-list image-custom">
        <div
          v-for="image in images.user"
          :key="image"
          class="image-item"
          :class="{ 'selected-image': image === selected }"
          @click="selectImage(image)"
        >
          <img :src="image" alt="" />
        </div>
        <div class="image-item" :class="{ 'selected-image': selected === '' }" @click="selectImage('')">无背景</div>
      </div>
    </div>
    <div class="dialog-footer">
      <el-button :disabled="selectedImageIsSystem" @click="deleteImage">删除</el-button>
      <el-button @click="onClose">关闭</el-button>
    </div>
  </el-dialog>
</template>
<script setup lang="ts">
import { ElDialog, ElButton } from 'element-plus';
import { computed } from 'vue';

const props = defineProps<{
  images: { default: string[]; user: string[] };
  selected?: string;
  modelValue?: boolean;
}>();
const emits = defineEmits<{
  (e: 'deleteImage'): void;
  (e: 'change', url?: string): void;
  (e: 'update:modelValue', visible: boolean): void;
}>();

const selectedImageIsSystem = computed(() => {
  return !props.selected || props.images.default.includes(props.selected);
});

const deleteImage = () => {
  emits('deleteImage');
};

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
.dialog-footer {
  text-align: right;
}
</style>
