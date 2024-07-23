<template>
  <div class="camera" ref="container">
    <video id="video" ref="video" playsinline :width="width" :height="height"></video>
    <canvas id="output" class="camera-preview" ref="output"></canvas>
    <!-- <canvas id="mask" ref="maskCanvas"></canvas> -->
    <canvas id="background" ref="background" :width="width" :height="height"> </canvas>
  </div>
</template>
<script setup lang="ts">
import { useDebounceFn, useElementBounding, useResizeObserver, useThrottle } from '@vueuse/core';
import { onMounted, ref } from 'vue';
import Camera from '@paddlejs-mediapipe/camera';
import * as tfconv from '@tensorflow/tfjs-converter';
// import backgroundImg from '/assets/background/1.jpg';
// import { Camera } from './camera';
import * as tfjs from '@tensorflow/tfjs';
import * as bodyPix from '@tensorflow-models/body-pix';
import { MobileNet } from '@tensorflow-models/body-pix/dist/mobilenet';
import { BodyPixInput } from '@tensorflow-models/body-pix/dist/types';
let camera: Camera;
const video = ref<HTMLVideoElement>();
const container = ref<HTMLElement>();
const output = ref<HTMLCanvasElement>();
// const maskCanvas = ref<HTMLCanvasElement>();
const background = ref<HTMLCanvasElement>();
const { width, height } = useElementBounding(container);
let net: bodyPix.BodyPix;

function containImg(box_x: number, box_y: number, box_w: number, box_h: number, source_w: number, source_h: number) {
  var dx = box_x,
    dy = box_y,
    dWidth = box_w,
    dHeight = box_h;
  if (source_w > source_h || (source_w == source_h && box_w < box_h)) {
    dHeight = (source_h * dWidth) / source_w;
    dy = box_y + (box_h - dHeight) / 2;
  } else if (source_w < source_h || (source_w == source_h && box_w > box_h)) {
    dWidth = (source_w * dHeight) / source_h;
    dx = box_x + (box_w - dWidth) / 2;
  }
  return {
    dx,
    dy,
    dWidth,
    dHeight,
  };
}
function renderImageDataToCanvas(image: ImageData, canvas: HTMLCanvasElement | OffscreenCanvas) {
  canvas.width = image.width;
  canvas.height = image.height;
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;

  ctx.putImageData(image, 0, 0);
  return canvas;
}
const modelUrl = '/bodypix-tfjs-075-stride16/model.json';
const maskCanvas = document.createElement('canvas');
onMounted(async () => {
  const background_canvas = background.value!;

  const backgroundImg = new Image();
  backgroundImg.src = '/src/assets/background/3.jpg';

  backgroundImg.onload = () => {
    // background_canvas.width = backgroundImg.width || 1920;
    // background_canvas.height = backgroundImg.height || 1080;
    background_canvas
      .getContext('2d')
      ?.drawImage(backgroundImg, 0, 0, background_canvas.width, background_canvas.height);
  };
  // background.value!.appendChild(background_canvas);
  await tfjs.ready();
  // tfjs.model.
  // const graphModel = await tfconv.loadGraphModel(
  //   'https://storage.googleapis.com/tfjs-models/savedmodel/bodypix/mobilenet/quant2/075/model-stride16.json'
  // );
  // graphModel.save('downloads://my-model');
  // const mobilenet = new MobileNet(graphModel, 16);
  // console.log('graphModel.inputs', graphModel.inputs);

  net = await bodyPix.load({
    architecture: 'MobileNetV1',
    outputStride: 16,
    quantBytes: 4,
    multiplier: 0.75,
    modelUrl,
  });

  // function getInputSize(input: BodyPixInput): [number, number] {
  //   if (
  //     (typeof HTMLCanvasElement !== 'undefined' && input instanceof HTMLCanvasElement) ||
  //     (typeof OffscreenCanvas !== 'undefined' && input instanceof OffscreenCanvas) ||
  //     (typeof HTMLImageElement !== 'undefined' && input instanceof HTMLImageElement)
  //   ) {
  //     if (input.height != null && input.width != null) {
  //       return [input.height, input.width];
  //     } else {
  //       throw new Error(`HTMLImageElement must have height and width attributes set.`);
  //     }
  //   } else if (typeof ImageData !== 'undefined' && input instanceof ImageData) {
  //     return [input.height, input.width];
  //   } else if (typeof HTMLVideoElement !== 'undefined' && input instanceof HTMLVideoElement) {
  //     if (input.hasAttribute('height') && input.hasAttribute('width')) {
  //       // Prioritizes user specified height and width.
  //       // We can't test the .height and .width properties directly,
  //       // because they evaluate to 0 if unset.
  //       return [input.height, input.width];
  //     } else {
  //       return [input.videoHeight, input.videoWidth];
  //     }
  //   } else if (input instanceof tfjs.Tensor) {
  //     return [input.shape[0], input.shape[1]];
  //   } else {
  //     throw new Error(`error: Unknown input type: ${input}.`);
  //   }
  // }
  const canvas = output.value!;
  let context = canvas.getContext('2d')!;
  // context.translate(canvas.width, 0);
  // context.scale(-1, 1);
  camera = new Camera(video.value!, {
    // targetCanvas: view.value,
    // enableOnInactiveState: true,
    onFrame: async (target) => {
      // console.log('onFrame', target.width, target.height);
      if (target.width <= 0 || target.height <= 0) {
        return;
      }
      // const [height, width] = getInputSize(target);
      // console.log('aaa', target.width, target.height);
      // canvas.width = target.width;
      // canvas.height = target.height;
      const segmentation = await net.segmentPerson(target!, {
        flipHorizontal: true,
        internalResolution: 'high',
        segmentationThreshold: 0.8,
      });

      const foregroundColor = { r: 0, g: 0, b: 0, a: 0 };
      const backgroundColor = { r: 0, g: 0, b: 0, a: 255 };

      // const mask = bodyPix.toMask(segmentation, foregroundColor, backgroundColor, false);
      // const foregroundColor = { r: 255, g: 255, b: 255, a: 255 };
      // const backgroundColor = { r: 0, g: 0, b: 0, a: 255 };
      const maskImage = bodyPix.toMask(segmentation, foregroundColor, backgroundColor, true);
      canvas.width = maskImage.width;
      canvas.height = maskImage.height;
      context.save();

      context.globalAlpha = 1;
      // bodyPix.drawMask(canvas, target, mask, 2, 0, true);
      // context.globalCompositeOperation = 'source-over';
      if (maskImage) {
        const mask = renderImageDataToCanvas(maskImage, maskCanvas);

        // const blurredMask = drawAndBlurImageOnOffScreenCanvas(mask, maskBlurAmount, CANVAS_NAMES.blurredMask);
        context.drawImage(mask, 0, 0, target.width, target.height);
      }
      context.restore();

      context.globalCompositeOperation = 'source-in'; //新图形只在新图形和目标画布重叠的地方绘制。其他的都是透明的。
      var imgRect = containImg(0, 0, canvas.width, canvas.height, background_canvas.width, background_canvas.height);
      context.drawImage(background_canvas, imgRect.dx, imgRect.dy, imgRect.dWidth, imgRect.dHeight);
      context.globalCompositeOperation = 'destination-over'; // 新图形只在不重合的区域绘制
      context.drawImage(target, 0, 0, target.width, target.height);
      context.globalCompositeOperation = 'source-over'; // 恢复

      // canvas.width = target.width;
      // canvas.height = target.height;
    },
    videoLoaded: () => {
      camera.start();
    },
  });
});
</script>
<style lang="scss" scoped>
.camera {
  display: flex;
  flex-direction: column;
  flex: 1;
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
  #video {
    position: absolute;
    top: 0;
    left: 0;
    z-index: -1;
    object-fit: fill;
    visibility: hidden;
    // width: auto;
    // height: auto;
    // transform: scaleX(-1);
  }
  #background {
    position: absolute;
    top: 0;
    left: 0;
    object-fit: fill;
    z-index: -1;
    opacity: 0.5;
  }
  #mask {
    position: absolute;
    top: 0;
    left: 0;
    z-index: 0;
    width: 100%;
    height: 100%;
  }
  .camera-preview {
    position: relative;
    z-index: 1;
  }
}
</style>
