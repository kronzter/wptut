/** Equirectangular canvas globe — no Ion, no network tiles. */

function lonLatToXy(lon, lat, w, h) {
  return [(lon + 180) / 360 * w, (90 - lat) / 180 * h];
}

function fillLand(ctx, w, h, rings, fill) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  rings.forEach((ring, i) => {
    ring.forEach(([lon, lat], j) => {
      const [x, y] = lonLatToXy(lon, lat, w, h);
      if (j === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
  });
  ctx.fill();
}

export function paintEarthTexture(width = 2048, height = 1024) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");

  const ocean = ctx.createLinearGradient(0, 0, 0, height);
  ocean.addColorStop(0, "#8ecae6");
  ocean.addColorStop(0.18, "#1d4e89");
  ocean.addColorStop(0.5, "#123a63");
  ocean.addColorStop(0.82, "#1d4e89");
  ocean.addColorStop(1, "#8ecae6");
  ctx.fillStyle = ocean;
  ctx.fillRect(0, 0, width, height);

  const land = "#3d7a4a";
  const desert = "#c2a36b";
  const ice = "#e8f4ff";

  fillLand(ctx, width, height, [[
    [-168, 71], [-141, 69], [-140, 60], [-130, 55], [-125, 49], [-124, 40],
    [-117, 32], [-105, 31], [-97, 26], [-90, 29], [-84, 25], [-81, 25],
    [-80, 27], [-82, 31], [-76, 35], [-76, 39], [-70, 42], [-67, 44],
    [-66, 45], [-60, 47], [-56, 51], [-62, 58], [-78, 62], [-84, 65],
    [-88, 74], [-120, 74], [-141, 70],
  ]], land);

  fillLand(ctx, width, height, [[
    [-117, 32], [-110, 24], [-105, 22], [-97, 16], [-90, 14], [-87, 13],
    [-83, 8], [-78, 8], [-77, 18], [-87, 21], [-97, 26], [-105, 31],
  ]], land);

  fillLand(ctx, width, height, [[
    [-81, 12], [-77, 8], [-73, -4], [-70, -18], [-71, -30], [-75, -47],
    [-68, -55], [-64, -55], [-66, -48], [-58, -38], [-52, -32], [-43, -22],
    [-35, -7], [-44, -1], [-51, 2], [-60, 5], [-70, 12], [-78, 11],
  ]], land);

  fillLand(ctx, width, height, [[
    [-10, 36], [-5, 36], [-5, 43], [-1, 43], [-2, 47], [-5, 48], [-8, 43],
  ]], land);

  fillLand(ctx, width, height, [[
    [-9, 36], [0, 36], [4, 39], [10, 42], [12, 38], [16, 41], [20, 40],
    [28, 41], [29, 45], [24, 45], [29, 47], [30, 60], [28, 71], [12, 66],
    [8, 63], [5, 61], [12, 59], [18, 69], [25, 71], [44, 68], [60, 70],
    [66, 72], [44, 66], [40, 60], [48, 50], [40, 47], [40, 41], [36, 36],
    [32, 31], [34, 36], [26, 31], [32, 22], [44, 13], [51, 12], [60, 25],
    [66, 25], [75, 20], [77, 8], [80, 6], [73, 8], [70, 20], [60, 7],
    [48, 13], [43, 11], [39, 15], [32, 10], [43, 2], [51, 12], [44, 13],
    [32, 22], [15, 12], [10, 4], [-5, 5], [-17, 12], [-17, 16], [-9, 32],
  ]], land);

  fillLand(ctx, width, height, [[
    [32, 31], [36, 31], [43, 11], [32, 10], [15, 12], [32, 22],
  ]], desert);

  fillLand(ctx, width, height, [[
    [68, 8], [72, 8], [77, 8], [80, 15], [88, 22], [92, 22], [88, 26],
    [80, 28], [74, 27], [70, 23], [68, 16],
  ]], land);

  fillLand(ctx, width, height, [[
    [73, 25], [78, 30], [85, 28], [92, 27], [97, 28], [100, 22], [109, 20],
    [109, 14], [104, 10], [98, 8], [94, 16], [88, 22],
  ]], land);

  fillLand(ctx, width, height, [[
    [100, 22], [109, 30], [122, 32], [129, 43], [140, 50], [160, 60],
    [170, 70], [140, 72], [125, 53], [115, 45], [105, 40], [100, 28],
  ]], land);

  fillLand(ctx, width, height, [[
    [113, 22], [122, 18], [127, 7], [123, 0], [118, 5], [109, 14],
  ]], land);

  fillLand(ctx, width, height, [[
    [113, -11], [129, -11], [154, -27], [153, -38], [146, -43], [136, -35],
    [114, -35], [113, -22],
  ]], land);

  fillLand(ctx, width, height, [[
    [-51, 60], [-44, 60], [-37, 65], [-22, 70], [-20, 80], [-45, 83],
    [-60, 76], [-73, 76], [-60, 70],
  ]], ice);

  fillLand(ctx, width, height, [[
    [-180, -62], [180, -62], [180, -90], [-180, -90],
  ]], ice);
  fillLand(ctx, width, height, [[
    [-180, 90], [180, 90], [180, 78], [-180, 78],
  ]], ice);

  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.lineWidth = 1;
  for (let lat = -60; lat <= 60; lat += 30) {
    const [, y] = lonLatToXy(0, lat, width, height);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
  for (let lon = -150; lon <= 150; lon += 30) {
    const [x] = lonLatToXy(lon, 0, width, height);
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }

  return canvas;
}
