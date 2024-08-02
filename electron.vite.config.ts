import { resolve } from 'path';
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
    },
  };
});
