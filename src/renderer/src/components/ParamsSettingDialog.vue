<template>
  <el-dialog width="60%" class="back-dialog" :model-value="modelValue" title="设置手势识别参数" @close="onClose">
    <div class="bg-settings">
      <div>
        <span>初始识别相较于中线位置</span>
        <br />
        <el-input-number v-model="initialRecognitionRatio" :precision="2" :step="0.1" :max="0.5" :min="0" />
      </div>
      <div>
        <span>滑动最小距离</span>
        <br />
        <el-input-number v-model="slidingMinimumDistanceRatio" :precision="2" :step="0.1" :max="1" :min="0.1" />
      </div>
      <div>
        <span>终点区域占比</span>
        <br />
        <el-input-number v-model="endpointRecognitionAreaRatio" :precision="2" :step="0.1" :max="1" :min="0.1" />
      </div>
      <div>
        <span>识别时间周期（毫秒）</span>
        <br />
        <el-input-number v-model="recognitionTimeCycle" :precision="0" :step="100" :max="1000" :min="100" />
      </div>
    </div>
    <template #footer>
      <div class="dialog-footer" style="justifycontent: end">
        <el-button type="primary" @click="init()"> 初始化 </el-button>
      </div>
    </template>
  </el-dialog>
</template>
<script setup lang="ts">
import { ElDialog, ElInputNumber, ElButton } from 'element-plus';
import { watch, onMounted, ref } from 'vue';

defineProps<{
  modelValue?: boolean;
}>();

const initialRecognitionRatio = ref(0.1);
const slidingMinimumDistanceRatio = ref(0.3);
const endpointRecognitionAreaRatio = ref(0.6);
const recognitionTimeCycle = ref(500);

onMounted(() => {
  if (window.initialRecognitionRatio === undefined) {
    window.initialRecognitionRatio = 0.1;
  }
  if (window.slidingMinimumDistanceRatio === undefined) {
    window.slidingMinimumDistanceRatio = 0.3;
  }
  if (window.endpointRecognitionAreaRatio === undefined) {
    window.endpointRecognitionAreaRatio = 0.6;
  }
  if (window.recognitionTimeCycle === undefined) {
    window.recognitionTimeCycle = 500;
  }
  initialRecognitionRatio.value = window.initialRecognitionRatio;
  slidingMinimumDistanceRatio.value = window.slidingMinimumDistanceRatio;
  endpointRecognitionAreaRatio.value = window.endpointRecognitionAreaRatio;
  recognitionTimeCycle.value = window.recognitionTimeCycle;
});

watch(
  () => [
    recognitionTimeCycle.value,
    initialRecognitionRatio.value,
    slidingMinimumDistanceRatio.value,
    endpointRecognitionAreaRatio.value,
  ],
  () => {
    window.initialRecognitionRatio = initialRecognitionRatio.value;
    window.slidingMinimumDistanceRatio = slidingMinimumDistanceRatio.value;
    window.endpointRecognitionAreaRatio = endpointRecognitionAreaRatio.value;
    window.recognitionTimeCycle = recognitionTimeCycle.value;
  }
);

const init = () => {
  recognitionTimeCycle.value = 0.1;
  initialRecognitionRatio.value = 0.3;
  slidingMinimumDistanceRatio.value = 0.6;
  endpointRecognitionAreaRatio.value = 500;
};

const emits = defineEmits<{
  (e: 'update:modelValue', visible: boolean): void;
}>();

// window.initialRecognitionRatio
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
  justify-content: end;
}
.bg-settings {
  padding: 24px;
  background-color: #eaeaea;
  border-radius: 4px;
  max-height: 320px;
  overflow-y: auto;
}
</style>
