import { useEventListener, useTimeout } from '@vueuse/core';
import { ref } from 'vue';
/**
 *
 * @param delay 鼠标离开后多少毫秒隐藏
 * @returns
 */
const useAutoHide = (delay: number = 5000) => {
  const container = ref<HTMLElement>();
  const { start: startTimer, stop: stopTimer } = useTimeout(delay, {
    controls: true,
    callback: () => {
      container.value?.classList.add('hide');
    },
  });
  useEventListener(container, 'mouseenter', (_evt) => {
    container.value?.classList.remove('hide');
    stopTimer?.();
  });
  useEventListener(container, 'mouseleave', (_evt) => {
    startTimer?.();
  });
  return {
    container,
  };
};

export default useAutoHide;
