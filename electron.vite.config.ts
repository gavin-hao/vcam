import { basename, resolve } from 'path';
import fs from 'fs';
import { defineConfig, externalizeDepsPlugin, loadEnv } from 'electron-vite';
import vue from '@vitejs/plugin-vue';
import svgLoader from 'vite-svg-loader';
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode);
  console.log(env);
  return {
    main: {
      plugins: [externalizeDepsPlugin()],
    },
    preload: {
      plugins: [externalizeDepsPlugin()],
    },
    renderer: {
      resolve: {
        alias: {
          '@renderer': resolve('src/renderer/src'),
        },
      },
      assetsInclude: ['**/*.wasm', '**/*.tflite', '**/*.binarypb'],
      // publicDir: 'resources',
      // build: {
      //   copyPublicDir: false,
      // },
      plugins: [vue(), svgLoader()],
      build: {
        rollupOptions: {
          plugins: [mediapipe_workaround()],
        },
      },
    },
  };
});
//@mediapipe/selfie_segmentation 包导出有问题 需要这样来解决
function mediapipe_workaround() {
  return {
    name: 'mediapipe_workaround',
    load(id: string) {
      if (basename(id) === 'selfie_segmentation.js') {
        let code = fs.readFileSync(id, 'utf-8');
        code += 'exports.SelfieSegmentation = SelfieSegmentation;';
        return { code };
      } else {
        return null;
      }
    },
  };
}
