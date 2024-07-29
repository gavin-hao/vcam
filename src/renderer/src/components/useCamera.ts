import { onMounted, ref } from 'vue';

const useCamera = () => {
  const outputCanvas = ref<HTMLCanvasElement>();
  const videoElement = ref<HTMLVideoElement>();
  let camera;
  onMounted(() => {});
  return {
    outputCanvas,
    videoElement,
  };
};
export default useCamera;
