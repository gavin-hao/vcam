<template>
  <el-dialog width="60%" class="back-dialog" :model-value="modelValue" title="设置手势识别参数" @close="onClose">
    <div class="bg-settings">
      <div>
        <span>初始识别相较于中线位置：如0.1，指的手指距离中线超10%屏幕，开始激活识别</span>
        <br />
        <el-input-number v-model="initialRecognitionRatio" :precision="2" :step="0.1" :max="0.5" :min="0" />
      </div>
      <div>
        <span>滑动最小距离：如0.3指滑动距离需超屏幕30%宽度</span>
        <br />
        <el-input-number v-model="slidingMinimumDistanceRatio" :precision="2" :step="0.1" :max="1" :min="0.1" />
      </div>
      <div>
        <span>终点区域占比：假如右滑，0.6指滑动终点距离右边框距离要小于60%的宽度</span>
        <br />
        <el-input-number v-model="endpointRecognitionAreaRatio" :precision="2" :step="0.1" :max="1" :min="0.1" />
      </div>
      <div>
        <span>识别时间周期（毫秒）：规定时间范围内做完手势</span>
        <br />
        <el-input-number v-model="recognitionTimeCycle" :precision="0" :step="100" :max="1000" :min="100" />
      </div>
      <div>
        <span>拍照手势灵敏度</span>
        <br />
        <el-input-number v-model="threshold" :precision="0" :step="1" :max="10" :min="1" />
      </div>
    </div>
    <template #footer>
      <div class="dialog-footer">
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
const threshold = ref(5);

onMounted(() => {
  !localStorage.getItem('initialRecognitionRatio') && localStorage.setItem('initialRecognitionRatio', '0.1');
  !localStorage.getItem('slidingMinimumDistanceRatio') && localStorage.setItem('slidingMinimumDistanceRatio', '0.3');
  !localStorage.getItem('endpointRecognitionAreaRatio') && localStorage.setItem('endpointRecognitionAreaRatio', '0.6');
  !localStorage.getItem('recognitionTimeCycle') && localStorage.setItem('recognitionTimeCycle', '500');
  !localStorage.getItem('threshold') && localStorage.setItem('threshold', '5');

  initialRecognitionRatio.value = parseFloat(localStorage.getItem('initialRecognitionRatio') || '0.1');
  slidingMinimumDistanceRatio.value = parseFloat(localStorage.getItem('slidingMinimumDistanceRatio') || '0.3');
  endpointRecognitionAreaRatio.value = parseFloat(localStorage.getItem('endpointRecognitionAreaRatio') || '0.6');
  recognitionTimeCycle.value = parseInt(localStorage.getItem('recognitionTimeCycle') || '500');
  threshold.value = parseInt(localStorage.getItem('threshold') || '5');
});

watch(
  () => [
    recognitionTimeCycle.value,
    initialRecognitionRatio.value,
    slidingMinimumDistanceRatio.value,
    endpointRecognitionAreaRatio.value,
    threshold.value,
  ],
  () => {
    localStorage.setItem('initialRecognitionRatio', initialRecognitionRatio.value.toString());
    localStorage.setItem('slidingMinimumDistanceRatio', slidingMinimumDistanceRatio.value.toString());
    localStorage.setItem('endpointRecognitionAreaRatio', endpointRecognitionAreaRatio.value.toString());
    localStorage.setItem('recognitionTimeCycle', recognitionTimeCycle.value.toString());
    localStorage.setItem('threshold', threshold.value.toString());
  }
);

const init = () => {
  recognitionTimeCycle.value = 500;
  initialRecognitionRatio.value = 0.1;
  slidingMinimumDistanceRatio.value = 0.3;
  endpointRecognitionAreaRatio.value = 0.6;
  threshold.value = 5;
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
  span {
    font-size: 10px;
  }
}
</style>
