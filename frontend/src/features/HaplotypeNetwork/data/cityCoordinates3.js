export function generateCityCoordinates(imgW, imgH, margin = 200, step = 75) {
  const coords = [];

  // 左邊
  for (let x = -margin; x < -25 ; x += step) {
    for (let y = 50 ; y <= imgH  ; y += step) {
      coords.push({ cx: x, cy: y });
    }
  }

  // 右邊
  for (let x = imgW + 50 ; x <= imgW + margin - 75; x += step) {
    for (let y = 50; y <= imgH  ; y += step) {
      coords.push({ cx: x, cy: y });
    }
  }

  // 上方
  for (let x = -200 ; x <= imgW + margin; x += step) {
    for (let y = -25 ; y > -margin + 50 ; y += -step) {
      coords.push({ cx: x, cy: y });
    }
  }

  // 下方
  for (let x = -200 ; x <= imgW + margin ; x += step) {
    for (let y = imgH + 25 ; y <= imgH + margin; y += step) {
      coords.push({ cx: x, cy: y });
    }
  }

  return coords;
}

