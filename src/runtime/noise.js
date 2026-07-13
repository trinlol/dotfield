
  /* ------------------------------------------------------------------ */
  var Noise = (function () {
    var F2 = 0.5 * (Math.sqrt(3) - 1);
    var G2 = (3 - Math.sqrt(3)) / 6;
    var F3 = 1 / 3;
    var G3 = 1 / 6;
    var grad3 = [
      [1, 1, 0], [-1, 1, 0], [1, -1, 0], [-1, -1, 0],
      [1, 0, 1], [-1, 0, 1], [1, 0, -1], [-1, 0, -1],
      [0, 1, 1], [0, -1, 1], [0, 1, -1], [0, -1, -1],
    ];
    var p = new Uint8Array(256);
    for (var i = 0; i < 256; i++) p[i] = i;
    var seed = 1337;
    function rand() {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    }
    for (var i = 255; i > 0; i--) {
      var j = Math.floor(rand() * (i + 1));
      var t = p[i];
      p[i] = p[j];
      p[j] = t;
    }
    var perm = new Uint8Array(512);
    var permMod12 = new Uint8Array(512);
    for (var i = 0; i < 512; i++) {
      perm[i] = p[i & 255];
      permMod12[i] = perm[i] % 12;
    }
    function dot2(g, x, y) { return g[0] * x + g[1] * y; }
    function dot3(g, x, y, z) { return g[0] * x + g[1] * y + g[2] * z; }

    function noise2D(xin, yin) {
      var s = (xin + yin) * F2;
      var i = Math.floor(xin + s);
      var j = Math.floor(yin + s);
      var t = (i + j) * G2;
      var X0 = i - t, Y0 = j - t;
      var x0 = xin - X0, y0 = yin - Y0;
      var i1, j1;
      if (x0 > y0) { i1 = 1; j1 = 0; } else { i1 = 0; j1 = 1; }
      var x1 = x0 - i1 + G2, y1 = y0 - j1 + G2;
      var x2 = x0 - 1 + 2 * G2, y2 = y0 - 1 + 2 * G2;
      var ii = i & 255, jj = j & 255;
      var gi0 = permMod12[ii + perm[jj]];
      var gi1 = permMod12[ii + i1 + perm[jj + j1]];
      var gi2 = permMod12[ii + 1 + perm[jj + 1]];
      var n0 = 0, n1 = 0, n2 = 0;
      var t0 = 0.5 - x0 * x0 - y0 * y0;
      if (t0 >= 0) { t0 *= t0; n0 = t0 * t0 * dot2(grad3[gi0], x0, y0); }
      var t1 = 0.5 - x1 * x1 - y1 * y1;
      if (t1 >= 0) { t1 *= t1; n1 = t1 * t1 * dot2(grad3[gi1], x1, y1); }
      var t2 = 0.5 - x2 * x2 - y2 * y2;
      if (t2 >= 0) { t2 *= t2; n2 = t2 * t2 * dot2(grad3[gi2], x2, y2); }
      return 70 * (n0 + n1 + n2);
    }

    function noise3D(xin, yin, zin) {
      var s = (xin + yin + zin) * F3;
      var i = Math.floor(xin + s);
      var j = Math.floor(yin + s);
      var k = Math.floor(zin + s);
      var t = (i + j + k) * G3;
      var X0 = i - t, Y0 = j - t, Z0 = k - t;
      var x0 = xin - X0, y0 = yin - Y0, z0 = zin - Z0;
      var i1, j1, k1, i2, j2, k2;
      if (x0 >= y0) {
        if (y0 >= z0) { i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 1; k2 = 0; }
        else if (x0 >= z0) { i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 0; k2 = 1; }
        else { i1 = 0; j1 = 0; k1 = 1; i2 = 1; j2 = 0; k2 = 1; }
      } else {
        if (y0 < z0) { i1 = 0; j1 = 0; k1 = 1; i2 = 0; j2 = 1; k2 = 1; }
        else if (x0 < z0) { i1 = 0; j1 = 1; k1 = 0; i2 = 0; j2 = 1; k2 = 1; }
        else { i1 = 0; j1 = 1; k1 = 0; i2 = 1; j2 = 1; k2 = 0; }
      }
      var x1 = x0 - i1 + G3, y1 = y0 - j1 + G3, z1 = z0 - k1 + G3;
      var x2 = x0 - i2 + 2 * G3, y2 = y0 - j2 + 2 * G3, z2 = z0 - k2 + 2 * G3;
      var x3 = x0 - 1 + 3 * G3, y3 = y0 - 1 + 3 * G3, z3 = z0 - 1 + 3 * G3;
      var ii = i & 255, jj = j & 255, kk = k & 255;
      var gi0 = permMod12[ii + perm[jj + perm[kk]]];
      var gi1 = permMod12[ii + i1 + perm[jj + j1 + perm[kk + k1]]];
      var gi2 = permMod12[ii + i2 + perm[jj + j2 + perm[kk + k2]]];
      var gi3 = permMod12[ii + 1 + perm[jj + 1 + perm[kk + 1]]];
      var n0 = 0, n1 = 0, n2 = 0, n3 = 0;
      var t0 = 0.6 - x0 * x0 - y0 * y0 - z0 * z0;
      if (t0 >= 0) { t0 *= t0; n0 = t0 * t0 * dot3(grad3[gi0], x0, y0, z0); }
      var t1 = 0.6 - x1 * x1 - y1 * y1 - z1 * z1;
      if (t1 >= 0) { t1 *= t1; n1 = t1 * t1 * dot3(grad3[gi1], x1, y1, z1); }
      var t2 = 0.6 - x2 * x2 - y2 * y2 - z2 * z2;
      if (t2 >= 0) { t2 *= t2; n2 = t2 * t2 * dot3(grad3[gi2], x2, y2, z2); }
      var t3 = 0.6 - x3 * x3 - y3 * y3 - z3 * z3;
      if (t3 >= 0) { t3 *= t3; n3 = t3 * t3 * dot3(grad3[gi3], x3, y3, z3); }
      return 32 * (n0 + n1 + n2 + n3);
    }
    return { noise2D: noise2D, noise3D: noise3D };
  })();

  /* ------------------------------------------------------------------ */
