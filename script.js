const videoElement = document.getElementById('video');
const canvasElement = document.getElementById('output');
const canvasCtx = canvasElement.getContext('2d');

const pose = new Pose({
  locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
});
pose.setOptions({
  modelComplexity: 0, // 簡化模型提升效能
  smoothLandmarks: true,
  enableSegmentation: false,
  minDetectionConfidence: 0.5,
  minTrackingConfidence: 0.5
});

function resizeCanvas() {
  canvasElement.width = videoElement.videoWidth;
  canvasElement.height = videoElement.videoHeight;
}

pose.onResults(results => {
  if (!results.poseLandmarks) return;
  resizeCanvas();

  const ls = results.poseLandmarks[11]; // shoulder
  const le = results.poseLandmarks[7];  // ear
  const lh = results.poseLandmarks[23]; // hip

  const leanValue = ls.y - lh.y;
  const headTilt = Math.atan2(le.y - ls.y, le.x - ls.x) * (180 / Math.PI);
  const isBadPosture = (leanValue > 0.05) || (headTilt > 25);

  canvasCtx.save();
  canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
  canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);

  // 畫耳朵、肩膀、臀部三點
  const points = [le, ls, lh];
  points.forEach(p => {
    canvasCtx.beginPath();
    canvasCtx.arc(p.x * canvasElement.width, p.y * canvasElement.height, 6, 0, 2 * Math.PI);
    canvasCtx.fillStyle = '#FF0000';
    canvasCtx.fill();
  });

  canvasCtx.fillStyle = isBadPosture ? 'red' : 'green';
  const fontSize = Math.round(canvasElement.width / 25);
  canvasCtx.font = `bold ${fontSize}px Arial`;
  canvasCtx.fillText(isBadPosture ? "駝背/前傾" : "良好坐姿", 30, 50);

  canvasCtx.font = `normal ${Math.round(fontSize * 0.8)}px Arial`;
  canvasCtx.fillText(`頭傾角: ${Math.round(headTilt)}°`, 30, 90);
  canvasCtx.fillText(`肩臀差: ${leanValue.toFixed(2)}`, 30, 130);

  canvasCtx.restore();
});

const camera = new Camera(videoElement, {
  onFrame: async () => {
    await pose.send({image: videoElement});
  },
  width: 320,  // 降低解析度提升效能
  height: 240,
  facingMode: 'environment'
});
camera.start();