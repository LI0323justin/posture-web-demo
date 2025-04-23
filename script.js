const videoElement = document.getElementById('video');
const canvasElement = document.getElementById('output');
const canvasCtx = canvasElement.getContext('2d');

const pose = new Pose({
  locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
});
pose.setOptions({
  modelComplexity: 1,
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

  const ls = results.poseLandmarks[11]; // left shoulder
  const le = results.poseLandmarks[7];  // left ear
  const lh = results.poseLandmarks[23]; // left hip

  const leanValue = ls.y - lh.y;
  const headTilt = Math.atan2(le.y - ls.y, le.x - ls.x) * (180 / Math.PI);
  const isBadPosture = (leanValue > 0.05) || (headTilt > 25);

  canvasCtx.save();
  canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
  canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);

  // 畫上半身骨架（肩、手肘、手腕、頭部）
  const UPPER_LANDMARKS = [
    [11, 13], [13, 15], // 左手臂
    [12, 14], [14, 16], // 右手臂
    [11, 12],           // 肩膀連線
    [11, 23], [12, 24], // 肩膀到髖部
    [7, 8],             // 兩耳
    [7, 0], [8, 0]      // 耳朵到鼻
  ];

  for (const [start, end] of UPPER_LANDMARKS) {
    const p1 = results.poseLandmarks[start];
    const p2 = results.poseLandmarks[end];
    canvasCtx.beginPath();
    canvasCtx.moveTo(p1.x * canvasElement.width, p1.y * canvasElement.height);
    canvasCtx.lineTo(p2.x * canvasElement.width, p2.y * canvasElement.height);
    canvasCtx.strokeStyle = isBadPosture ? '#FF3333' : '#00FF00';
    canvasCtx.lineWidth = 4;
    canvasCtx.stroke();
  }

  // 畫標示點（耳、肩、臀）
  const points = [le, ls, lh];
  points.forEach(p => {
    canvasCtx.beginPath();
    canvasCtx.arc(p.x * canvasElement.width, p.y * canvasElement.height, 8, 0, 2 * Math.PI);
    canvasCtx.fillStyle = '#FF0000';
    canvasCtx.fill();
  });

  const fontColor = isBadPosture ? 'red' : 'green';
  canvasCtx.fillStyle = fontColor;
  const fontSize = Math.round(canvasElement.width / 32);
  canvasCtx.font = `bold ${fontSize}px Arial`;
  canvasCtx.fillText(isBadPosture ? "不良坐姿" : "良好坐姿", 30, 50);

  canvasCtx.font = `normal ${Math.round(fontSize * 0.8)}px Arial`;
  canvasCtx.fillStyle = fontColor;
  canvasCtx.fillText(`頭傾角: ${Math.round(headTilt)}°`, 30, 90);
  canvasCtx.fillText(`肩臀差: ${leanValue.toFixed(2)}`, 30, 125);

  canvasCtx.restore();
});

const camera = new Camera(videoElement, {
  onFrame: async () => {
    await pose.send({image: videoElement});
  },
  width: 640,
  height: 480,
  facingMode: 'user'
});
camera.start();