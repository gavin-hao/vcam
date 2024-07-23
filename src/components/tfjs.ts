// 加载模型权重
const modelUrl = 'path/to/deeplabv3plus_weights.tfjs';
const model = await tf.loadLayersModel(modelUrl);

// 图像预处理函数
async function preprocessImage(img) {
  // 将图像转换为 TensorFlow.js 支持的格式
  const tensor = tf.browser.fromPixels(img).toFloat();
  // 将图像缩放到指定大小
  const resizedTensor = tf.image.resizeBilinear(tensor, [512, 512]);
  // 将像素值归一化到 [0, 1] 范围内
  const normalizedTensor = resizedTensor.div(tf.scalar(255));
  // 添加通道维度
  const batchedTensor = normalizedTensor.expandDims();
  return batchedTensor;
}

// 图像后处理函数
function postprocessImage(maskTensor) {
  // 将 mask 缩放到原始图像大小
  const resizedMask = tf.image.resizeBilinear(maskTensor, [imgWidth, imgHeight]);
  // 将像素值转换为二值图像
  const binaryMask = resizedMask.greater(tf.scalar(0.5));
  // 将二值图像转换为浮点数图像
  const floatMask = binaryMask.asType('float32');
  // 将浮点数图像转换为图像对象
  const img = tf.browser.toPixels(floatMask).img;
  return img;
}

// 人像抠图函数
async function抠图(img) {
  // 预处理图像
  const preprocessedImg = await preprocessImage(img);
  // 使用模型进行预测
  const predictions = await model.predict(preprocessedImg);
  // 获取 mask 预测结果
  const maskTensor = predictions[0];
  // 后处理 mask
  const img = postprocessImage(maskTensor);
  return img;
}

// 获取视频流
const video = document.getElementById('video');

// 创建画布和上下文
const canvas = document.createElement('canvas');
const ctx = canvas.getContext('2d');
canvas.width = video.videoWidth;
canvas.height = video.videoHeight;

// 换背景图函数
async function换背景图() {
  // 从视频流中读取当前帧
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  // 进行人像抠图
  const img = document.getElementById('person');
  const result = await抠图(img);
  // 将抠图结果绘制到画布上
  ctx.drawImage(result, 0, 0, canvas.width, canvas.height);
  // 将画布内容转换为视频帧并显示
  const dataUrl = canvas.toDataURL('image/webp');
  video.src = dataUrl;
}

// 每隔一段时间执行换背景图函数
setInterval(换背景图, 1000);