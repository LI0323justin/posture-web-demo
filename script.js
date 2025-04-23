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

  canvasCtx.save();
  canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
  canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);

  drawConnectors(canvasCtx, results.poseLandmarks, Pose.POSE_CONNECTIONS, {
    color: '#00FF00',
    lineWidth: Math.max(2, canvasElement.width * 0.002)
  });
  drawLandmarks(canvasCtx, results.poseLandmarks, {
    color: '#FF0000',
    radius: Math.max(2, canvasElement.width * 0.008)
  });

  const ls = results.poseLandmarks[11]; // left shoulder
  const le = results.poseLandmarks[7];  // left ear
  const lh = results.poseLandmarks[23]; // left hip

  // 判斷：肩膀與臀部Y差（身體是否前傾）
  const leanValue = ls.y - lh.y;

  // 判斷：耳朵與肩膀連線是否向前傾（頭部前伸）
  const headTilt = Math.atan2(le.y - ls.y, le.x - ls.x) * (180 / Math.PI);

  // 綜合判斷駝背（任何一項條件成立）
  const isBadPosture = (leanValue > 0.05) || (headTilt > 25);

  canvasCtx.fillStyle = isBadPosture ? 'red' : 'green';
  canvasCtx.font = `bold ${Math.round(canvasElement.width / 20)}px Arial`;
  canvasCtx.fillText(
    isBadPosture ? "駝背/前傾" : "良好坐姿", 30, 60
  );
  canvasCtx.fillText(`頭傾角: ${Math.round(headTilt)}°`, 30, 100);
  canvasCtx.fillText(`肩臀差: ${leanValue.toFixed(2)}`, 30, 140);

  canvasCtx.restore();
});

const camera = new Camera(videoElement, {
  onFrame: async () => {
    await pose.send({image: videoElement});
  },
  width: 640,
  height: 480,
  facingMode: 'environment'
});
camera.start();