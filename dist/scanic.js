const $ = {
  // Contour detection params
  MIN_CONTOUR_AREA: 1e3,
  MIN_CONTOUR_POINTS: 10
}, kA = 0, NA = 1, V = 2, Z = [
  { dx: 0, dy: -1 },
  // 0: Top
  { dx: 1, dy: -1 },
  // 1: Top-right
  { dx: 1, dy: 0 },
  // 2: Right
  { dx: 1, dy: 1 },
  // 3: Bottom-right
  { dx: 0, dy: 1 },
  // 4: Bottom
  { dx: -1, dy: 1 },
  // 5: Bottom-left
  { dx: -1, dy: 0 },
  // 6: Left
  { dx: -1, dy: -1 }
  // 7: Top-left
];
function BA(I, A = {}) {
  const Q = A.width || Math.sqrt(I.length), B = A.height || I.length / Q, i = A.mode !== void 0 ? A.mode : NA, g = A.method !== void 0 ? A.method : V, C = A.minArea || $.MIN_CONTOUR_AREA, D = Q + 2, o = B + 2, E = new Int32Array(D * o);
  for (let G = 0; G < B; G++)
    for (let w = 0; w < Q; w++)
      I[G * Q + w] > 0 && (E[(G + 1) * D + (w + 1)] = 1);
  const h = [];
  let a = 2;
  for (let G = 1; G <= B; G++)
    for (let w = 1; w <= Q; w++) {
      const N = E[G * D + w], F = E[G * D + (w - 1)];
      let J = null, c = !1, y = -1;
      if (N === 1 && F === 0 ? (c = !0, J = { x: w, y: G }, y = 2) : N === 0 && F >= 1 && F !== -1 && F === 1 && (c = !1, J = { x: w - 1, y: G }, y = 6), J) {
        if (i === kA && !c) {
          E[J.y * D + J.x] = -1;
          continue;
        }
        const t = a++, e = wA(E, D, o, J, y, t);
        if (e && e.length > 0) {
          let L = e;
          g === V && (L = JA(e));
          const n = L.map((U) => ({ x: U.x - 1, y: U.y - 1 }));
          if (n.length >= (g === V ? 4 : $.MIN_CONTOUR_POINTS)) {
            const U = {
              id: t,
              points: n,
              isOuter: c
              // Calculate area and bounding box later if needed for filtering/sorting
            };
            h.push(U);
          }
        } else
          E[J.y * D + J.x] === 1 && (E[J.y * D + J.x] = t);
      }
    }
  h.forEach((G) => {
    G.area = FA(G.points), G.boundingBox = cA(G.points);
  });
  const s = h.filter((G) => G.area >= C);
  return s.sort((G, w) => w.area - G.area), A.debug && (A.debug.labels = E, A.debug.rawContours = h, A.debug.finalContours = s), s;
}
function wA(I, A, Q, B, i, g) {
  const C = [], D = /* @__PURE__ */ new Set();
  let o = { ...B }, E = -1;
  I[B.y * A + B.x] = g;
  let h = 0;
  const a = A * Q;
  for (; h++ < a; ) {
    let s;
    if (E === -1) {
      let N = !1;
      for (let F = 0; F < 8; F++) {
        s = (i + F) % 8;
        const J = o.x + Z[s].dx, c = o.y + Z[s].dy;
        if (J >= 0 && J < A && c >= 0 && c < Q && I[c * A + J] > 0) {
          N = !0;
          break;
        }
      }
      if (!N) return null;
    } else
      s = (E + 2) % 8;
    let G = null;
    for (let N = 0; N < 8; N++) {
      const F = (s + N) % 8, J = o.x + Z[F].dx, c = o.y + Z[F].dy;
      if (J >= 0 && J < A && c >= 0 && c < Q && I[c * A + J] > 0) {
        G = { x: J, y: c }, E = (F + 4) % 8;
        break;
      }
    }
    if (!G) {
      C.length === 0 && C.push({ ...o }), console.warn(`Contour tracing stopped unexpectedly at (${o.x - 1}, ${o.y - 1}) for contour ${g}`);
      break;
    }
    const w = `${o.x},${o.y}`;
    if (D.has(w))
      return C;
    if (C.push({ ...o }), D.add(w), I[G.y * A + G.x] === 1 && (I[G.y * A + G.x] = g), o = G, o.x === B.x && o.y === B.y)
      break;
  }
  return h >= a ? (console.warn(`Contour tracing exceeded max steps for contour ${g}`), null) : C;
}
function JA(I) {
  if (I.length <= 2)
    return I;
  const A = [], Q = I.length;
  for (let B = 0; B < Q; B++) {
    const i = I[(B + Q - 1) % Q], g = I[B], C = I[(B + 1) % Q], D = g.x - i.x, o = g.y - i.y, E = C.x - g.x, h = C.y - g.y;
    D * h !== o * E && A.push(g);
  }
  if (A.length === 0 && Q > 0) {
    if (Q === 1) return [I[0]];
    if (Q === 2) return I;
    let B = 0, i = 1;
    const g = I[0];
    for (let C = 1; C < Q; C++) {
      const D = I[C], o = (D.x - g.x) ** 2 + (D.y - g.y) ** 2;
      o > B && (B = o, i = C);
    }
    return [I[0], I[i]];
  }
  return A;
}
function FA(I) {
  let A = 0;
  const Q = I.length;
  if (Q < 3) return 0;
  for (let B = 0; B < Q; B++) {
    const i = (B + 1) % Q;
    A += I[B].x * I[i].y, A -= I[i].x * I[B].y;
  }
  return Math.abs(A) / 2;
}
function cA(I) {
  if (I.length === 0)
    return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  let A = I[0].x, Q = I[0].y, B = I[0].x, i = I[0].y;
  for (let g = 1; g < I.length; g++) {
    const C = I[g];
    A = Math.min(A, C.x), Q = Math.min(Q, C.y), B = Math.max(B, C.x), i = Math.max(i, C.y);
  }
  return { minX: A, minY: Q, maxX: B, maxY: i };
}
function W(I, A = 1) {
  if (I.length <= 2)
    return I;
  let Q = 0, B = 0;
  const i = I[0], g = I[I.length - 1];
  for (let C = 1; C < I.length - 1; C++) {
    const D = yA(I[C], i, g);
    D > Q && (Q = D, B = C);
  }
  if (Q > A) {
    const C = W(I.slice(0, B + 1), A), D = W(I.slice(B), A);
    return C.slice(0, -1).concat(D);
  } else
    return [i, g];
}
function yA(I, A, Q) {
  const B = Q.x - A.x, i = Q.y - A.y, g = B * B + i * i;
  if (g === 0)
    return Math.sqrt(
      Math.pow(I.x - A.x, 2) + Math.pow(I.y - A.y, 2)
    );
  const C = ((I.x - A.x) * B + (I.y - A.y) * i) / g;
  let D, o;
  C < 0 ? (D = A.x, o = A.y) : C > 1 ? (D = Q.x, o = Q.y) : (D = A.x + C * B, o = A.y + C * i);
  const E = I.x - D, h = I.y - o;
  return Math.sqrt(E * E + h * h);
}
function EA(I, A = 0.02) {
  const Q = SA(I), B = A * Q;
  return W(I, B);
}
function SA(I) {
  let A = 0;
  const Q = I.length;
  if (Q < 2) return 0;
  for (let B = 0; B < Q; B++) {
    const i = (B + 1) % Q, g = I[B].x - I[i].x, C = I[B].y - I[i].y;
    A += Math.sqrt(g * g + C * C);
  }
  return A;
}
const AA = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  approximatePolygon: EA,
  detectDocumentContour: BA,
  simplifyContour: W
}, Symbol.toStringTag, { value: "Module" }));
function RA(I) {
  let A = 0, Q = 0;
  for (const B of I)
    A += B.x, Q += B.y;
  return {
    x: A / I.length,
    y: Q / I.length
  };
}
function iA(I, A = {}) {
  if (!I || !I.points || I.points.length < 4)
    return console.warn("Contour does not have enough points for corner detection"), null;
  const Q = A.epsilon || 0.02, B = EA(I, Q);
  let i;
  return B && B.length === 4 ? i = MA(B) : i = tA(I.points), !i || !i.topLeft || !i.topRight || !i.bottomRight || !i.bottomLeft ? (console.warn("Failed to find all four corners.", i), null) : (console.log("Corner points:", i), i);
}
function tA(I) {
  if (!I || I.length === 0) return null;
  let A = I[0], Q = I[0], B = I[0], i = I[0], g = A.x + A.y, C = Q.x - Q.y, D = B.x + B.y, o = i.x - i.y;
  for (let E = 1; E < I.length; E++) {
    const h = I[E], a = h.x + h.y, s = h.x - h.y;
    a < g && (g = a, A = h), a > D && (D = a, B = h), s > C && (C = s, Q = h), s < o && (o = s, i = h);
  }
  return {
    topLeft: A,
    topRight: Q,
    bottomRight: B,
    bottomLeft: i
  };
}
function MA(I) {
  if (I.length !== 4)
    return console.warn(`Expected 4 points, got ${I.length}`), null;
  const A = RA(I), Q = [...I].sort((C, D) => {
    const o = Math.atan2(C.y - A.y, C.x - A.x), E = Math.atan2(D.y - A.y, D.x - A.x);
    return o - E;
  });
  let B = 1 / 0, i = 0;
  for (let C = 0; C < 4; C++) {
    const D = Q[C].x + Q[C].y;
    D < B && (B = D, i = C);
  }
  const g = [
    Q[i],
    Q[(i + 1) % 4],
    Q[(i + 2) % 4],
    Q[(i + 3) % 4]
  ];
  return {
    topLeft: g[0],
    topRight: g[1],
    bottomRight: g[2],
    bottomLeft: g[3]
  };
}
const IA = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  findCornerPoints: iA
}, Symbol.toStringTag, { value: "Module" }));
let k, r = null;
function DA() {
  return (r === null || r.byteLength === 0) && (r = new Float32Array(k.memory.buffer)), r;
}
let S = 0;
function Y(I, A) {
  const Q = A(I.length * 4, 4) >>> 0;
  return DA().set(I, Q / 4), S = I.length, Q;
}
function b(I, A) {
  return I = I >>> 0, DA().subarray(I / 4, I / 4 + A);
}
function eA(I, A, Q, B, i) {
  const g = Y(I, k.__wbindgen_malloc), C = S, D = k.find_document_quadrilateral(g, C, A, Q, B, i);
  var o = b(D[0], D[1]).slice();
  return k.__wbindgen_free(D[0], D[1] * 4, 4), o;
}
let H = null;
function oA() {
  return (H === null || H.byteLength === 0) && (H = new Uint8Array(k.memory.buffer)), H;
}
function q(I, A) {
  const Q = A(I.length * 1, 1) >>> 0;
  return oA().set(I, Q / 1), S = I.length, Q;
}
function UA(I, A, Q, B, i, g, C) {
  const D = q(I, k.__wbindgen_malloc), o = S, E = k.hough_lines(D, o, A, Q, B, i, g, C);
  var h = b(E[0], E[1]).slice();
  return k.__wbindgen_free(E[0], E[1] * 4, 4), h;
}
function d(I, A) {
  return I = I >>> 0, oA().subarray(I / 1, I / 1 + A);
}
function nA(I, A, Q, B) {
  const i = q(I, k.__wbindgen_malloc), g = S, C = k.close_edge_gaps(i, g, A, Q, B);
  var D = d(C[0], C[1]).slice();
  return k.__wbindgen_free(C[0], C[1] * 1, 1), D;
}
function LA(I, A, Q, B) {
  const i = q(I, k.__wbindgen_malloc), g = S, C = k.remove_small_components(i, g, A, Q, B);
  var D = d(C[0], C[1]).slice();
  return k.__wbindgen_free(C[0], C[1] * 1, 1), D;
}
function qA(I, A, Q) {
  const B = q(I, k.__wbindgen_malloc), i = S, g = k.thin_edges(B, i, A, Q);
  var C = d(g[0], g[1]).slice();
  return k.__wbindgen_free(g[0], g[1] * 1, 1), C;
}
function lA(I, A, Q, B, i) {
  const g = Y(I, k.__wbindgen_malloc), C = S, D = k.compute_adaptive_canny_thresholds(g, C, A, Q, B, i);
  var o = b(D[0], D[1]).slice();
  return k.__wbindgen_free(D[0], D[1] * 4, 4), o;
}
function YA(I, A, Q) {
  const B = q(I, k.__wbindgen_malloc), i = S;
  return k.otsu_threshold(B, i, A, Q);
}
function dA(I, A, Q, B, i, g) {
  const C = q(I, k.__wbindgen_malloc), D = S, o = k.clahe(C, D, A, Q, B, i, g);
  var E = d(o[0], o[1]).slice();
  return k.__wbindgen_free(o[0], o[1] * 1, 1), E;
}
function bA(I, A, Q) {
  const B = q(I, k.__wbindgen_malloc), i = S, g = k.contrast_stretch(B, i, A, Q);
  var C = d(g[0], g[1]).slice();
  return k.__wbindgen_free(g[0], g[1] * 1, 1), C;
}
function KA(I, A, Q, B) {
  const i = q(I, k.__wbindgen_malloc), g = S, C = k.illumination_normalize(i, g, A, Q, B);
  var D = d(C[0], C[1]).slice();
  return k.__wbindgen_free(C[0], C[1] * 1, 1), D;
}
function hA(I, A, Q, B, i) {
  const g = q(I, k.__wbindgen_malloc), C = S, D = k.blur(g, C, A, Q, B, i);
  var o = d(D[0], D[1]).slice();
  return k.__wbindgen_free(D[0], D[1] * 1, 1), o;
}
let p = null;
function rA() {
  return (p === null || p.byteLength === 0) && (p = new Uint16Array(k.memory.buffer)), p;
}
function m(I, A) {
  const Q = A(I.length * 2, 2) >>> 0;
  return rA().set(I, Q / 2), S = I.length, Q;
}
function HA(I, A, Q, B, i) {
  const g = m(I, k.__wbindgen_malloc), C = S, D = Y(B, k.__wbindgen_malloc), o = S, E = k.refine_corners_subpixel(g, C, A, Q, D, o, i);
  var h = b(E[0], E[1]).slice();
  return k.__wbindgen_free(E[0], E[1] * 4, 4), h;
}
function u(I, A, Q, B, i, g) {
  const C = Y(I, k.__wbindgen_malloc), D = S;
  return k.calculate_size_score(C, D, A, Q, B, i, g);
}
function z(I) {
  const A = Y(I, k.__wbindgen_malloc), Q = S, B = k.validate_quadrilateral(A, Q);
  var i = b(B[0], B[1]).slice();
  return k.__wbindgen_free(B[0], B[1] * 4, 4), i;
}
function P(I, A, Q, B) {
  return k.calculate_detection_confidence(I, A, Q, B);
}
function gA(I, A, Q, B, i) {
  const g = m(I, k.__wbindgen_malloc), C = S, D = Y(B, k.__wbindgen_malloc), o = S;
  return k.calculate_edge_strength(g, C, A, Q, D, o, i);
}
let f = null;
function pA() {
  return (f === null || f.byteLength === 0) && (f = new Int16Array(k.memory.buffer)), f;
}
function O(I, A) {
  return I = I >>> 0, pA().subarray(I / 2, I / 2 + A);
}
function fA(I, A, Q, B, i) {
  const g = m(I, k.__wbindgen_malloc), C = S, D = m(A, k.__wbindgen_malloc), o = S, E = k.non_maximum_suppression(g, C, D, o, Q, B, i);
  var h = b(E[0], E[1]).slice();
  return k.__wbindgen_free(E[0], E[1] * 4, 4), h;
}
function mA(I, A, Q, B) {
  const i = q(I, k.__wbindgen_malloc), g = S, C = k.dilate(i, g, A, Q, B);
  var D = d(C[0], C[1]).slice();
  return k.__wbindgen_free(C[0], C[1] * 1, 1), D;
}
function XA(I, A, Q, B) {
  const i = Y(I, k.__wbindgen_malloc), g = S, C = Y(A, k.__wbindgen_malloc), D = S, o = k.nms_precise(i, g, C, D, Q, B);
  var E = b(o[0], o[1]).slice();
  return k.__wbindgen_free(o[0], o[1] * 4, 4), E;
}
function ZA(I, A, Q) {
  const B = q(I, k.__wbindgen_malloc), i = S, g = k.sobel_gradients_3x3(B, i, A, Q);
  var C = O(g[0], g[1]).slice();
  return k.__wbindgen_free(g[0], g[1] * 2, 2), C;
}
function xA(I, A, Q) {
  const B = q(I, k.__wbindgen_malloc), i = S, g = k.sobel_gradients_3x3_simd(B, i, A, Q);
  var C = O(g[0], g[1]).slice();
  return k.__wbindgen_free(g[0], g[1] * 2, 2), C;
}
function WA(I, A, Q) {
  const B = q(I, k.__wbindgen_malloc), i = S, g = k.sobel_gradients_5x5(B, i, A, Q);
  var C = O(g[0], g[1]).slice();
  return k.__wbindgen_free(g[0], g[1] * 2, 2), C;
}
function OA(I, A, Q, B) {
  const i = m(I, k.__wbindgen_malloc), g = S, C = k.gradient_magnitude_direction(i, g, A, Q, B);
  var D = b(C[0], C[1]).slice();
  return k.__wbindgen_free(C[0], C[1] * 4, 4), D;
}
function TA(I, A, Q) {
  const B = q(I, k.__wbindgen_malloc), i = S, g = k.scharr_gradients_3x3(B, i, A, Q);
  var C = O(g[0], g[1]).slice();
  return k.__wbindgen_free(g[0], g[1] * 2, 2), C;
}
function jA(I, A, Q, B, i) {
  const g = Y(I, k.__wbindgen_malloc), C = S, D = k.hysteresis_thresholding(g, C, A, Q, B, i);
  var o = d(D[0], D[1]).slice();
  return k.__wbindgen_free(D[0], D[1] * 1, 1), o;
}
async function VA(I, A) {
  if (typeof Response == "function" && I instanceof Response) {
    if (typeof WebAssembly.instantiateStreaming == "function")
      try {
        return await WebAssembly.instantiateStreaming(I, A);
      } catch (B) {
        if (I.headers.get("Content-Type") != "application/wasm")
          console.warn("`WebAssembly.instantiateStreaming` failed because your server does not serve Wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n", B);
        else
          throw B;
      }
    const Q = await I.arrayBuffer();
    return await WebAssembly.instantiate(Q, A);
  } else {
    const Q = await WebAssembly.instantiate(I, A);
    return Q instanceof WebAssembly.Instance ? { instance: Q, module: I } : Q;
  }
}
function uA() {
  const I = {};
  return I.wbg = {}, I.wbg.__wbindgen_init_externref_table = function() {
    const A = k.__wbindgen_export_0, Q = A.grow(4);
    A.set(0, void 0), A.set(Q + 0, void 0), A.set(Q + 1, null), A.set(Q + 2, !0), A.set(Q + 3, !1);
  }, I;
}
function zA(I, A) {
  return k = I.exports, _.__wbindgen_wasm_module = A, r = null, f = null, p = null, H = null, k.__wbindgen_start(), k;
}
async function _(I) {
  if (k !== void 0) return k;
  typeof I < "u" && (Object.getPrototypeOf(I) === Object.prototype ? { module_or_path: I } = I : console.warn("using deprecated parameters for the initialization function; pass a single object instead")), typeof I > "u" && (I = new URL("data:application/wasm;base64,AGFzbQEAAAAB6QM0YAAAYAABf2ABfwBgAX8Bf2ACf38AYAJ/fwF/YAJ/fwJ/f2ADf39/AGADf39/AX9gBH9/f38AYAR/f39/AX9gBH9/f38Cf39gBX9/f39/AGAFf39/f38Bf2AFf39/f38Cf39gBn9/f39/fwBgBn9/f39/fwF/YAZ/f39/f38Cf39gB39/f39/f38AYAd/f39/f39/An9/YAd/f39/f39/AX1gCH9/f39/f39/AGAJf39/f39/f39/AGAJf39/f39/f39/An9/YAp/f39/f39/f39/AGAIf39/f39/f30AYAd/f39/f399AGAHf39/f39/fQJ/f2AIf39/f39/fX0AYAZ/f39/f30AYAZ/f39/f30Cf39gB39/f39/fX8AYAd/f39/f319AGAHf39/f399fQJ/f2AJf39/f399fX9/AGAMf39/f399fX99f39/AGALf39/f399fX99fX8AYAV/f39/fQBgBX9/f399An9/YAZ/f39/fX8Cf39gBn9/f399fQJ/f2AIf39/f319f38Cf39gC39/f399fX99f39/An9/YAp/f39/fX1/fX1/An9/YAd/f39/fX19AX1gBH9/f30Cf39gAn99AGABfQF9YAJ9fwF9YAJ9fQF9YAR9fX19AX1gAnx8AXwCJwEDd2JnH19fd2JpbmRnZW5faW5pdF9leHRlcm5yZWZfdGFibGUAAAP/Af0BFQMgECQVIBISGRISEiAMIg8SDwcMDCMJDw8xDA8PDxwVDBolBwcaDBIPFA8VLy8WFgcgGgUMDwoPBx0MGgwMDBAMAgwSBwoMCA8gGC8ELgUELwkdEgwvEhIEBR0HDDEFDAQfDQkJLAQSEgkSEgQEBBUEDAcHCQQEBwcHDAQNDQ0MDDAZEhIgGg0dAgUPCQkJBAcHBwcHBwUvCAUDBAkHMioNKxcCAgApAyEbExMoERERERERER4eHignKB4RKCgFJg4ODg4mJg4OAgQLCwsLLQsLCwsLCwYGAgUEAgcxMzEEBAQFAgcICgUEBwQFBQQEBAIEMTEBBS8vLy8AAAQJAnABExNvAIABBQMBABEGCQF/AUGAgMAACweBCjkGbWVtb3J5AgAbZmluZF9kb2N1bWVudF9xdWFkcmlsYXRlcmFsAK4BF2ZpbmRfbGluZV9pbnRlcnNlY3Rpb25zAMEBC2hvdWdoX2xpbmVzAKgBDWhvdWdoX2xpbmVzX3AAowEJYmxhY2tfaGF0ALMBD2Nsb3NlX2VkZ2VfZ2FwcwDCAQ9kaWxhdGVfZW5oYW5jZWQAtQEFZXJvZGUAtAELaGl0X29yX21pc3MApAETbW9ycGhvbG9naWNhbF9jbG9zZQCxARZtb3JwaG9sb2dpY2FsX2dyYWRpZW50ALIBEm1vcnBob2xvZ2ljYWxfb3BlbgCvARdyZW1vdmVfc21hbGxfY29tcG9uZW50cwDDAQtza2VsZXRvbml6ZQDEAQp0aGluX2VkZ2VzAMwBB3RvcF9oYXQAsAEbYWRhcHRpdmVfdGhyZXNob2xkX2dhdXNzaWFuALcBF2FkYXB0aXZlX3RocmVzaG9sZF9tZWFuALgBGmFkYXB0aXZlX3RocmVzaG9sZF9uaWJsYWNrALYBGmFkYXB0aXZlX3RocmVzaG9sZF9zYXV2b2xhAKoBIWNvbXB1dGVfYWRhcHRpdmVfY2FubnlfdGhyZXNob2xkcwC5ARZjb21wdXRlX2ludGVncmFsX2ltYWdlAM0BFG11bHRpX290c3VfdGhyZXNob2xkAMUBDm90c3VfdGhyZXNob2xkAEcFY2xhaGUAqwEQY29udHJhc3Rfc3RyZXRjaADOARBnYW1tYV9jb3JyZWN0aW9uAMYBFmhpc3RvZ3JhbV9lcXVhbGl6YXRpb24AzwEWaWxsdW1pbmF0aW9uX25vcm1hbGl6ZQDHARtwZXJjZW50aWxlX2NvbnRyYXN0X3N0cmV0Y2gAuwETcHJlcHJvY2Vzc19kb2N1bWVudAC6AQRibHVyALwBHmNhbGN1bGF0ZV9kZXRlY3Rpb25fY29uZmlkZW5jZQCgARdjYWxjdWxhdGVfZWRnZV9zdHJlbmd0aAArFGNhbGN1bGF0ZV9zaXplX3Njb3JlAGcYcmFua19kb2N1bWVudF9jYW5kaWRhdGVzANABF3JlZmluZV9jb3JuZXJzX3N1YnBpeGVsAKwBFnZhbGlkYXRlX3F1YWRyaWxhdGVyYWwA1wETY2FsY3VsYXRlX2dyYWRpZW50cwDRAQZkaWxhdGUAyAEXbm9uX21heGltdW1fc3VwcHJlc3Npb24ArQESZWRnZV9kaXJlY3Rpb25fbWFwANQBHGdyYWRpZW50X21hZ25pdHVkZV9kaXJlY3Rpb24AyQELbm1zX3ByZWNpc2UAvQEUc2NoYXJyX2dyYWRpZW50c18zeDMA1gETc29iZWxfZ3JhZGllbnRzXzN4MwDSARhzb2JlbF9ncmFkaWVudHNfM3gzX3NpbWQA0wETc29iZWxfZ3JhZGllbnRzXzV4NQDVARJlZGdlX21hcF90b19iaW5hcnkA2AEXaHlzdGVyZXNpc190aHJlc2hvbGRpbmcAvgEeaHlzdGVyZXNpc190aHJlc2hvbGRpbmdfYmluYXJ5AL8BGGNhbm55X2VkZ2VfZGV0ZWN0b3JfZnVsbAChARNfX3diaW5kZ2VuX2V4cG9ydF8wAQERX193YmluZGdlbl9tYWxsb2MAwAEPX193YmluZGdlbl9mcmVlAOYBEF9fd2JpbmRnZW5fc3RhcnQAAAkrAgBBAQsS5QGRAVvcAZoBYJgB6QGdAeoB8AHZAYwBYn3zAeIB4wEEQRMLAArphwj9AdggAzl/BX4IewJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQCAHQQNGDQAgBUUNEkEAIARBfGoiCCAIIARLGyEJQQAgB0EBdmshCiAFQX9qIQtBACEMDAELAkAgBCADSw0AIAY1AgghQSAGNQIEIUIgBjUCACFDIARFDQMgQiBDfCFEQQAhDUEAIAEgBGsiDiAOIAFLGyIOIARBf2oiCyAOIAtJG0EBaiIOQQRNDQIgBEECdCEPIEH9EiFGIET9EiFHIAIhCyAOIA5BA3EiDUEEIA0bayINIRAgACEOA0AgCyBGIA4gD2r9AAIAIkj9yQH91QEgRyAO/QACACJJ/ckB/dUB/c4BQRj9zQEiSv0M/wAAAAAAAAD/AAAAAAAAACJLQn9CACBK/R0AQv8BVBv9EkJ/QgAgSv0dAUL/AVQb/R4B/VIgRiBI/coB/dUBIEcgSf3KAf3VAf3OAUEY/c0BIkogS0J/QgAgSv0dAEL/AVQb/RJCf0IAIEr9HQFC/wFUG/0eAf1S/Q0ACBAYAAAAAAAAAAAAAAAA/VoAAAAgC0EEaiELIA5BEGohDiAQQXxqIhANAAwDCwtBACAEIANBgKXAABCeAQALA0AgDCAEbCERAkACQAJAAkACQCAMQQFqIgwgBGwiDiARSQ0AIA4gA0sNACACIBFqIRJBACEOQQAhEwJAAkADQCAOIRQCQAJAIAcNAP0MAAAAAAAAAAAAAAAAAAAAACJGIUoMAQsgC0EASA0CIAAgE0ECdGohFSAKIQ4gByEQIAYhDf0MAAAAAAAAAAAAAAAAAAAAACJKIUYDQCANNQIA/RIiRyAVQQAgDiALIA4gC0kbIA5BAEgbIARsQQJ0aiIP/QYCCP3VASBG/c4BIUYgRyAP/QYCAP3VASBK/c4BIUogDkEBaiEOIA1BBGohDSAQQX9qIhANAAsLIBMgBE8NBCASIBNqIEr9HQBCGIgiRUL/ASBFQv8BVBs8AAAgE0EBciIOIARPDQUgEiAOaiBK/R0BQhiIIkVC/wEgRUL/AVQbPAAAIBNBAnIiDiAETw0GIBIgDmogRv0dAEIYiCJFQv8BIEVC/wFUGzwAACATQQNyIg4gBE8NAiASIA5qIEb9HQFCGIgiRUL/ASBFQv8BVBs8AAAgFEEBaiEOIBNBBGoiEyAJSw0HDAALC0G0o8AAQRxB0KPAABCfAQALIA4gBEGwpMAAEJIBAAsgESAOIANB4KPAABCeAQALIBMgBEGApMAAEJIBAAsgDiAEQZCkwAAQkgEACyAOIARBoKTAABCSAQALAkAgEyAETw0AAkAgBw0AIAggFEECdCIOayINRQ0BIAIgDmogEWpBBGpBACAN/AsADAELAkACQCALQQBIDQADQCATQQFqIQ9BACEOQgAhRSAGIQ0DQEEAIAogDmoiECALIBAgC0kbIBBBAEgbIARsIBNqIhAgAU8NAyANNQIAIAAgEEECdGo1AgB+IEV8IUUgDUEEaiENIAcgDkEBaiIORw0ACyASIBNqIEVCGIgiRUL/ASBFQv8BVBs8AAAgDyETIA8gBEYNAwwACwtBtKPAAEEcQdCjwAAQnwEACyAQIAFB8KPAABCSAQALIApBAWohCiAMIAVGDREMAAsLQQAgBGshFSAAIA1BAnRqIQsgBCABIAQgAUkbIA1qIQcgACANIARqQQJ0aiEQIAQhEyABIQ4gAiEPA0AgDSAORg0CAkAgByAORw0AIA0gFWsgAUHQpsAAEJIBAAsgDyANaiAQNQIAIEF+IEQgCzUCAH58QhiIIkVC/wEgRUL/AVQbPAAAIA5Bf2ohDiAQQQRqIRAgFUF/aiEVIA9BAWohDyALQQRqIQsgDSATQX9qIhNHDQALC0EAIAVBf2oiDiAOIAVLGyIWQQJJDQ0CQAJAIARBBEkNACBB/RIhSiBC/RIhRiBD/RIhRyAAQRBqIhcgBEECdCIYaiEZIBcgBEEDdGohGiACIARqIRtBfCAEayEcIARBe2ohHSACIARBBGoiHmohH0F8IARBAXQiIGshIUEAISIgBCEjICAhJEF8ISVBBCEmICBBBGoiJyEoIB4hKUEAISpBASErDAELIARFDQ4gBEEDdCEKIARBAXQhByACIARqIRIgBEECdCEUQQAhDyAAIQtBASEQA0AgCyEOIAcgD2oiDSAEIA9qIhVJDQ0gDSADSw0NIA8gAU8NDCAVIAFPDQkgDSABTw0DIBIgD2oiFSAOIBRqIgs1AgAgQn4gDjUCACBDfnwgDiAKaiITNQIAIEF+fEIYiCJFQv8BIEVC/wFUGzwAAAJAIARBAUYNACAPQQFqIAFPDQwgBCAPaiIJQQFqIAFPDQkgDUEBaiABTw0GIBVBAWogC0EEajUCACBCfiAOQQRqNQIAIEN+fCATQQRqNQIAIEF+fEIYiCJFQv8BIEVC/wFUGzwAACAEQQJGDQAgD0ECaiABTw0LIAlBAmogAU8NCCANQQJqIAFPDQUgFUECaiALQQhqNQIAIEJ+IA5BCGo1AgAgQ358IBNBCGo1AgAgQX58QhiIIkVC/wEgRUL/AVQbPAAACyAEIA9qIQ8gEEEBaiIQIBZJDQAMDwsLA0AgKyIQQQFqIisgBGwiDiAQIARsIg1JDQ0gDiADSw0NIAQgKmwiLEEEaiEtICAgLGohLiAnICxqIS8gBCAsaiEwIB4gLGohMSACIA1qIQsgACAOQQJ0aiEyIAAgDUECdGohMyAAIBBBf2ogBGxBAnRqITRBBCEQQQAhCiAfIRIgFyEUIBkhCSAaIQYgJSEMICYhESAhIQggKCE1IBwhNiApITcgHSE4QQAhDgJAAkACQAJAAkACQANAIBAhDSAKITkgOCE6IDchOyA2ITwgNSE9IAghPiARIT8gDCFAIAYhDyAJIRUgFCETIBIhByAOIARPDQEgCyAOaiBGIDMgDkECdCIQav0AAgAiSf3JAf3VASBHIDQgEGr9AAIAIkv9yQH91QH9zgEgSiAyIBBq/QACACJM/ckB/dUB/c4BIkj9HQBCGIgiRUL/ASBFQv8BVBs8AAAgDkEBciIQIARPDQIgCyAQaiBI/R0BQhiIIkVC/wEgRUL/AVQbPAAAIA5BAnIiECAETw0DIAsgEGogRiBJ/coB/dUBIEcgS/3KAf3VAf3OASBKIEz9ygH91QH9zgEiSP0dAEIYiCJFQv8BIEVC/wFUGzwAACAOQQNyIg4gBE8NBCALIA5qIEj9HQFCGIgiRUL/ASBFQv8BVBs8AAAgB0EEaiESIBNBEGohFCAVQRBqIQkgD0EQaiEGIEBBfGohDCA/QQRqIREgPkF8aiEIID1BBGohNSA8QXxqITYgO0EEaiE3IDpBfGohOCA5QQFqIQogDSEOIA1BBGoiECAETQ0ACyANIARPDQUgHSA5QQJ0Ig5rIhBBACAOayILIDBrIAEgDiAxaiIKIAEgCksbakF8aiIKIBAgCkkbIhAgCyAuayABIA4gL2oiCiABIApLG2pBfGoiCiAQIApJGyIQIAsgLGsgASAOIC1qIg4gASAOSxtqQXxqIg4gECAOSRtBAWoiC0EETQ0EIDogASA7IAEgO0sbIDxqIg4gOiAOSRsiDiABID0gASA9SxsgPmoiECAOIBBJGyIOIAEgPyABID9LGyBAaiIQIA4gEEkbQX9zIAtBA3EiDkEEIA4bIhBqIQ4gDSALIBBraiENA0AgByBGIBX9AAIAIkn9yQH91QEgRyAT/QACACJL/ckB/dUB/c4BIEogD/0AAgAiTP3JAf3VAf3OAUEY/c0BIkj9DP8AAAAAAAAA/wAAAAAAAAAiTUJ/QgAgSP0dAEL/AVQb/RJCf0IAIEj9HQFC/wFUG/0eAf1SIEYgSf3KAf3VASBHIEv9ygH91QH9zgEgSiBM/coB/dUB/c4BQRj9zQEiSCBNQn9CACBI/R0AQv8BVBv9EkJ/QgAgSP0dAUL/AVQb/R4B/VL9DQAIEBgAAAAAAAAAAAAAAAD9WgAAACAHQQRqIQcgE0EQaiETIBVBEGohFSAPQRBqIQ8gDkEEaiIODQAMBQsLIA4gBEGApsAAEJIBAAsgECAEQZCmwAAQkgEACyAQIARBoKbAABCSAQALIA4gBEGwpsAAEJIBAAsgACANICJqQQJ0aiEOIAAgDSAjakECdGohCyAAIA0gJGpBAnRqIRADQCAiIA1qIg8gAU8NDSAjIA1qIhUgAU8NCiAkIA1qIg8gAU8NByAbIA1qIAs1AgAgQn4gDjUCACBDfnwgEDUCACBBfnxCGIgiRUL/ASBFQv8BVBs8AAAgDkEEaiEOIAtBBGohCyAQQQRqIRAgDUEBaiIPIQ0gBCAPRw0ACwsgIiAEaiEiICMgBGohIyAkIARqISQgGyAEaiEbIB8gBGohHyAXIBhqIRcgGSAYaiEZIBogGGohGiAlIARrISUgJiAEaiEmICEgBGshISAoIARqISggHCAEayEcICkgBGohKSAqQQFqISogKyAWTw0ODAALCyABIAFBwKbAABCSAQALIARBAXQgD2ohDwwCCyAEQQF0IA9qQQJqIQ8MAQsgBEEBdCAPakEBaiEPCyAPIAFB8KXAABCSAQALIAlBAmohFQwBCyAJQQFqIRULIBUgAUHgpcAAEJIBAAsgD0ECaiEPDAELIA9BAWohDwsgDyABQdClwAAQkgEACyAEIA9qIQ0gBEEBdCAPaiEOCyANIA4gA0HApcAAEJ4BAAsgBUECSQ0AIAVBf2ogBGwhFQJAAkAgBSAEbCIOIANLDQAgDiAVTw0BCyAVIA4gA0GQpcAAEJ4BAAsgBEUNAEEAIRMgQSBCfCFBAkBBACABIBVrIg4gDiABSxsiDkEAIAEgBUF+aiAEbCIHayINIA0gAUsbIg0gDiANSRsiDiAEQX9qIg0gDiANSRsiDUEBaiIPQQVJDQAgAiAVaiEOIA1Bf3MgD0EDcSINQQQgDRsiE2ohECAAIBVBAnRqIQ0gACAHQQJ0aiELIA8gE2shEyBD/RIhRiBB/RIhRwNAIA4gRyAN/QACACJI/ckB/dUBIEYgC/0AAgAiSf3JAf3VAf3OAUEY/c0BIkr9DP8AAAAAAAAA/wAAAAAAAAAiS0J/QgAgSv0dAEL/AVQb/RJCf0IAIEr9HQFC/wFUG/0eAf1SIEcgSP3KAf3VASBGIEn9ygH91QH9zgFBGP3NASJKIEtCf0IAIEr9HQBC/wFUG/0SQn9CACBK/R0BQv8BVBv9HgH9Uv0NAAgQGAAAAAAAAAAAAAAAAP1aAAAAIA5BBGohDiALQRBqIQsgDUEQaiENIBBBBGoiEA0ACwsgACAHQQJ0IBNBAnQiDmpqIQsgACAVQQJ0IA5qaiEQIAQgE2shDyATIAdqIQ0gEyAVaiEOA0AgDSABTw0DIA4gAU8NAiACIA5qIEEgEDUCAH4gCzUCACBDfnxCGIgiRUL/ASBFQv8BVBs8AAAgC0EEaiELIA1BAWohDSAQQQRqIRAgDkEBaiEOIA9Bf2oiDw0ACwsPCyAOIAFBsKXAABCSAQALIA0gAUGgpcAAEJIBAAvPJAIJfwF+IwBBEGsiASQAAkACQAJAAkACQAJAIABB9QFJDQACQCAAQcz/e00NAEEAIQAMBgsgAEELaiICQXhxIQNBACgC6MxAIgRFDQRBHyEFAkAgAEH0//8HSw0AIANBJiACQQh2ZyIAa3ZBAXEgAEEBdGtBPmohBQtBACADayECAkAgBUECdEHMycAAaigCACIGDQBBACEAQQAhBwwCC0EAIQAgA0EAQRkgBUEBdmsgBUEfRht0IQhBACEHA0ACQCAGIgYoAgRBeHEiCSADSQ0AIAkgA2siCSACTw0AIAkhAiAGIQcgCQ0AQQAhAiAGIQcgBiEADAQLIAYoAhQiCSAAIAkgBiAIQR12QQRxaigCECIGRxsgACAJGyEAIAhBAXQhCCAGRQ0CDAALCwJAAkACQAJAAkACQEEAKALkzEAiBkEQIABBC2pB+ANxIABBC0kbIgNBA3YiAnYiAEEDcUUNACAAQX9zQQFxIAJqIghBA3QiA0HcysAAaiIAIANB5MrAAGooAgAiAigCCCIHRg0BIAcgADYCDCAAIAc2AggMAgsgA0EAKALszEBNDQggAA0CQQAoAujMQCIARQ0IIABoQQJ0QczJwABqKAIAIgcoAgRBeHEgA2shAiAHIQYDQAJAIAcoAhAiAA0AIAcoAhQiAA0AIAYoAhghBQJAAkACQCAGKAIMIgAgBkcNACAGQRRBECAGKAIUIgAbaigCACIHDQFBACEADAILIAYoAggiByAANgIMIAAgBzYCCAwBCyAGQRRqIAZBEGogABshCANAIAghCSAHIgBBFGogAEEQaiAAKAIUIgcbIQggAEEUQRAgBxtqKAIAIgcNAAsgCUEANgIACyAFRQ0GAkACQCAGIAYoAhxBAnRBzMnAAGoiBygCAEYNAAJAIAUoAhAgBkYNACAFIAA2AhQgAA0CDAkLIAUgADYCECAADQEMCAsgByAANgIAIABFDQYLIAAgBTYCGAJAIAYoAhAiB0UNACAAIAc2AhAgByAANgIYCyAGKAIUIgdFDQYgACAHNgIUIAcgADYCGAwGCyAAKAIEQXhxIANrIgcgAiAHIAJJIgcbIQIgACAGIAcbIQYgACEHDAALC0EAIAZBfiAId3E2AuTMQAsgAkEIaiEAIAIgA0EDcjYCBCACIANqIgMgAygCBEEBcjYCBAwHCwJAAkAgACACdEECIAJ0IgBBACAAa3JxaCIJQQN0IgJB3MrAAGoiByACQeTKwABqKAIAIgAoAggiCEYNACAIIAc2AgwgByAINgIIDAELQQAgBkF+IAl3cTYC5MxACyAAIANBA3I2AgQgACADaiIGIAIgA2siB0EBcjYCBCAAIAJqIAc2AgACQEEAKALszEAiAkUNAEEAKAL0zEAhAwJAAkBBACgC5MxAIghBASACQQN2dCIJcQ0AQQAgCCAJcjYC5MxAIAJBeHFB3MrAAGoiAiEIDAELIAJBeHEiCEHcysAAaiECIAhB5MrAAGooAgAhCAsgAiADNgIIIAggAzYCDCADIAI2AgwgAyAINgIICyAAQQhqIQBBACAGNgL0zEBBACAHNgLszEAMBgtBAEEAKALozEBBfiAGKAIcd3E2AujMQAsCQAJAAkAgAkEQSQ0AIAYgA0EDcjYCBCAGIANqIgcgAkEBcjYCBCAHIAJqIAI2AgBBACgC7MxAIghFDQFBACgC9MxAIQACQAJAQQAoAuTMQCIJQQEgCEEDdnQiBXENAEEAIAkgBXI2AuTMQCAIQXhxQdzKwABqIgghCQwBCyAIQXhxIglB3MrAAGohCCAJQeTKwABqKAIAIQkLIAggADYCCCAJIAA2AgwgACAINgIMIAAgCTYCCAwBCyAGIAIgA2oiAEEDcjYCBCAGIABqIgAgACgCBEEBcjYCBAwBC0EAIAc2AvTMQEEAIAI2AuzMQAsgBkEIaiIARQ0DDAQLAkAgACAHcg0AQQAhB0ECIAV0IgBBACAAa3IgBHEiAEUNAyAAaEECdEHMycAAaigCACEACyAARQ0BCwNAIAAgByAAKAIEQXhxIgYgA2siCSACSSIFGyEEIAYgA0khCCAJIAIgBRshCQJAIAAoAhAiBg0AIAAoAhQhBgsgByAEIAgbIQcgAiAJIAgbIQIgBiEAIAYNAAsLIAdFDQACQEEAKALszEAiACADSQ0AIAIgACADa08NAQsgBygCGCEFAkACQAJAIAcoAgwiACAHRw0AIAdBFEEQIAcoAhQiABtqKAIAIgYNAUEAIQAMAgsgBygCCCIGIAA2AgwgACAGNgIIDAELIAdBFGogB0EQaiAAGyEIA0AgCCEJIAYiAEEUaiAAQRBqIAAoAhQiBhshCCAAQRRBECAGG2ooAgAiBg0ACyAJQQA2AgALAkAgBUUNAAJAAkACQCAHIAcoAhxBAnRBzMnAAGoiBigCAEYNAAJAIAUoAhAgB0YNACAFIAA2AhQgAA0CDAQLIAUgADYCECAADQEMAwsgBiAANgIAIABFDQELIAAgBTYCGAJAIAcoAhAiBkUNACAAIAY2AhAgBiAANgIYCyAHKAIUIgZFDQEgACAGNgIUIAYgADYCGAwBC0EAQQAoAujMQEF+IAcoAhx3cTYC6MxACwJAAkAgAkEQSQ0AIAcgA0EDcjYCBCAHIANqIgAgAkEBcjYCBCAAIAJqIAI2AgACQCACQYACSQ0AIAAgAhBaDAILAkACQEEAKALkzEAiBkEBIAJBA3Z0IghxDQBBACAGIAhyNgLkzEAgAkH4AXFB3MrAAGoiAiEGDAELIAJB+AFxIgZB3MrAAGohAiAGQeTKwABqKAIAIQYLIAIgADYCCCAGIAA2AgwgACACNgIMIAAgBjYCCAwBCyAHIAIgA2oiAEEDcjYCBCAHIABqIgAgACgCBEEBcjYCBAsgB0EIaiIADQELAkACQAJAAkACQAJAQQAoAuzMQCIAIANPDQACQEEAKALwzEAiACADSw0AIAFBBGpBkM3AACADQa+ABGpBgIB8cRCWAQJAIAEoAgQiBg0AQQAhAAwICyABKAIMIQVBAEEAKAL8zEAgASgCCCIJaiIANgL8zEBBACAAQQAoAoDNQCICIAAgAksbNgKAzUACQAJAAkBBACgC+MxAIgJFDQBBzMrAACEAA0AgBiAAKAIAIgcgACgCBCIIakYNAiAAKAIIIgANAAwDCwsCQAJAQQAoAojNQCIARQ0AIAYgAE8NAQtBACAGNgKIzUALQQBB/x82AozNQEEAIAU2AtjKQEEAIAk2AtDKQEEAIAY2AszKQEEAQdzKwAA2AujKQEEAQeTKwAA2AvDKQEEAQdzKwAA2AuTKQEEAQezKwAA2AvjKQEEAQeTKwAA2AuzKQEEAQfTKwAA2AoDLQEEAQezKwAA2AvTKQEEAQfzKwAA2AojLQEEAQfTKwAA2AvzKQEEAQYTLwAA2ApDLQEEAQfzKwAA2AoTLQEEAQYzLwAA2ApjLQEEAQYTLwAA2AozLQEEAQZTLwAA2AqDLQEEAQYzLwAA2ApTLQEEAQZzLwAA2AqjLQEEAQZTLwAA2ApzLQEEAQZzLwAA2AqTLQEEAQaTLwAA2ArDLQEEAQaTLwAA2AqzLQEEAQazLwAA2ArjLQEEAQazLwAA2ArTLQEEAQbTLwAA2AsDLQEEAQbTLwAA2ArzLQEEAQbzLwAA2AsjLQEEAQbzLwAA2AsTLQEEAQcTLwAA2AtDLQEEAQcTLwAA2AszLQEEAQczLwAA2AtjLQEEAQczLwAA2AtTLQEEAQdTLwAA2AuDLQEEAQdTLwAA2AtzLQEEAQdzLwAA2AujLQEEAQeTLwAA2AvDLQEEAQdzLwAA2AuTLQEEAQezLwAA2AvjLQEEAQeTLwAA2AuzLQEEAQfTLwAA2AoDMQEEAQezLwAA2AvTLQEEAQfzLwAA2AojMQEEAQfTLwAA2AvzLQEEAQYTMwAA2ApDMQEEAQfzLwAA2AoTMQEEAQYzMwAA2ApjMQEEAQYTMwAA2AozMQEEAQZTMwAA2AqDMQEEAQYzMwAA2ApTMQEEAQZzMwAA2AqjMQEEAQZTMwAA2ApzMQEEAQaTMwAA2ArDMQEEAQZzMwAA2AqTMQEEAQazMwAA2ArjMQEEAQaTMwAA2AqzMQEEAQbTMwAA2AsDMQEEAQazMwAA2ArTMQEEAQbzMwAA2AsjMQEEAQbTMwAA2ArzMQEEAQcTMwAA2AtDMQEEAQbzMwAA2AsTMQEEAQczMwAA2AtjMQEEAQcTMwAA2AszMQEEAQdTMwAA2AuDMQEEAQczMwAA2AtTMQEEAIAZBD2pBeHEiAEF4aiICNgL4zEBBAEHUzMAANgLczEBBACAGIABrIAlBWGoiAGpBCGoiBzYC8MxAIAIgB0EBcjYCBCAGIABqQSg2AgRBAEGAgIABNgKEzUAMCAsgAiAGTw0AIAcgAksNACAAKAIMIgdBAXENACAHQQF2IAVGDQMLQQBBACgCiM1AIgAgBiAAIAZJGzYCiM1AIAYgCWohB0HMysAAIQACQAJAAkADQCAAKAIAIgggB0YNASAAKAIIIgANAAwCCwsgACgCDCIHQQFxDQAgB0EBdiAFRg0BC0HMysAAIQACQANAAkAgACgCACIHIAJLDQAgAiAHIAAoAgRqIgdJDQILIAAoAgghAAwACwtBACAGQQ9qQXhxIgBBeGoiCDYC+MxAQQAgBiAAayAJQVhqIgBqQQhqIgQ2AvDMQCAIIARBAXI2AgQgBiAAakEoNgIEQQBBgICAATYChM1AIAIgB0FgakF4cUF4aiIAIAAgAkEQakkbIghBGzYCBEEAKQLMykAhCiAIQRBqQQApAtTKQDcCACAIQQhqIgAgCjcCAEEAIAU2AtjKQEEAIAk2AtDKQEEAIAY2AszKQEEAIAA2AtTKQCAIQRxqIQADQCAAQQc2AgAgAEEEaiIAIAdJDQALIAggAkYNByAIIAgoAgRBfnE2AgQgAiAIIAJrIgBBAXI2AgQgCCAANgIAAkAgAEGAAkkNACACIAAQWgwICwJAAkBBACgC5MxAIgdBASAAQQN2dCIGcQ0AQQAgByAGcjYC5MxAIABB+AFxQdzKwABqIgAhBwwBCyAAQfgBcSIHQdzKwABqIQAgB0HkysAAaigCACEHCyAAIAI2AgggByACNgIMIAIgADYCDCACIAc2AggMBwsgACAGNgIAIAAgACgCBCAJajYCBCAGQQ9qQXhxQXhqIgcgA0EDcjYCBCAIQQ9qQXhxQXhqIgIgByADaiIAayEDIAJBACgC+MxARg0DIAJBACgC9MxARg0EAkAgAigCBCIGQQNxQQFHDQAgAiAGQXhxIgYQUSAGIANqIQMgAiAGaiICKAIEIQYLIAIgBkF+cTYCBCAAIANBAXI2AgQgACADaiADNgIAAkAgA0GAAkkNACAAIAMQWgwGCwJAAkBBACgC5MxAIgJBASADQQN2dCIGcQ0AQQAgAiAGcjYC5MxAIANB+AFxQdzKwABqIgMhAgwBCyADQfgBcSICQdzKwABqIQMgAkHkysAAaigCACECCyADIAA2AgggAiAANgIMIAAgAzYCDCAAIAI2AggMBQtBACAAIANrIgI2AvDMQEEAQQAoAvjMQCIAIANqIgc2AvjMQCAHIAJBAXI2AgQgACADQQNyNgIEIABBCGohAAwGC0EAKAL0zEAhAgJAAkAgACADayIHQQ9LDQBBAEEANgL0zEBBAEEANgLszEAgAiAAQQNyNgIEIAIgAGoiACAAKAIEQQFyNgIEDAELQQAgBzYC7MxAQQAgAiADaiIGNgL0zEAgBiAHQQFyNgIEIAIgAGogBzYCACACIANBA3I2AgQLIAJBCGohAAwFCyAAIAggCWo2AgRBAEEAKAL4zEAiAEEPakF4cSICQXhqIgc2AvjMQEEAIAAgAmtBACgC8MxAIAlqIgJqQQhqIgY2AvDMQCAHIAZBAXI2AgQgACACakEoNgIEQQBBgICAATYChM1ADAMLQQAgADYC+MxAQQBBACgC8MxAIANqIgM2AvDMQCAAIANBAXI2AgQMAQtBACAANgL0zEBBAEEAKALszEAgA2oiAzYC7MxAIAAgA0EBcjYCBCAAIANqIAM2AgALIAdBCGohAAwBC0EAIQBBACgC8MxAIgIgA00NAEEAIAIgA2siAjYC8MxAQQBBACgC+MxAIgAgA2oiBzYC+MxAIAcgAkEBcjYCBCAAIANBA3I2AgQgAEEIaiEACyABQRBqJAAgAAuIIAMdfwJ+MX0jAEHgAGsiByQAIAJBA24hCAJAAkACQAJAIAJBDE8NAEEEIQlBACEKQQAhCwwBC0EAIQsgB0EANgIUIAdCgICAgMAANwIMIAdBADYCICAHQoCAgIDAADcCGCABQQRqIQlBASEKA0ACQAJAAkAgCiACTw0AIAkqAgBD2w/Jv5KLQ9sPST9dDQECQCAHKAIgIgwgBygCGEcNACAHQRhqQayPwAAQcAsgBygCHCAMQQJ0aiALNgIAIAcgDEEBajYCIAwCCyAKIAJBnI/AABCSAQALAkAgBygCFCIMIAcoAgxHDQAgB0EMakG8j8AAEHALIAcoAhAgDEECdGogCzYCACAHIAxBAWo2AhQLIAlBDGohCSAKQQNqIQogCCALQQFqIgtHDQALAkACQCAHKAIUIg1BAkkNACAHKAIgQQJJDQAgBLNDAABIQpIhJiADs0MAAEhCkiEnIAYgBCADbLMiKJQhKSAFICiUISogB0EkakEwaiEOQQAhD0EBIRBBACERA0AgESESIBAiEUEBaiEQAkAgESAHKAIUIhNPDQAgECEKIBEhFCAHKAIgRQ0AA0AgFCEVIAohFAJAIAcoAiAiFkUNAEEAIRdBASEYIBJBAnQhGQNAIBchGiAYIhdBAWohGAJAIBcgBygCICIbTw0AIBghCSAXIQsDQCALIQogCSELAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAIBIgBygCFCIJTw0AIBUgCU8NASAaIAcoAiAiCU8NAiAKIAlPDQsgBygCECIJIBlqKAIAQQNsIgwgAk8NAyAMQQFqIgQgAk8NBCAHKAIcIhwgGkECdGooAgBBA2wiCCACTw0FIAhBAWoiAyACTw0GIAkgFUECdGooAgAhHSAcIApBAnRqKAIAIQkgASAMQQJ0aioCACErIAEgBEECdGoqAgAhKCABIAhBAnRqKgIAISwgASADQQJ0aioCACItEPsBIQUgKBD6ASEGQQAhCgJAIC0Q+gEiLiAoEPsBIi2UIAYgBZSTIiiLQ703hjVdIh4NACAtICyUICsgBZSTICiVIS8gKyAulCAGICyUkyAolSEwQQEhCgsgCUEDbCIEIAJPDQcgBEEBaiIJIAJPDQggASAEQQJ0aioCACExIAEgCUECdGoqAgAiMhD7ASEoQQAhCQJAIC0gMhD6ASIylCAGICiUkyIzi0O9N4Y1XSIfDQAgLSAxlCArICiUkyAzlSE0ICsgMpQgBiAxlJMgM5UhNUEBIQkLIB1BA2wiAyACTw0JIANBAWoiHCACTw0KIAEgA0ECdGoqAgAhKyABIBxBAnRqKgIAIi0Q+gEhBkEAIRxBACEdAkAgLiAtEPsBIi2UIAUgBpSTIjOLQ703hjVdIiANACAsIC2UIAUgK5STIDOVITYgLiArlCAsIAaUkyAzlSE3QQEhHQsCQCAyIC2UICggBpSTIgWLQ703hjVdIiENACAxIC2UICggK5STIAWVITggMiArlCAxIAaUkyAFlSE5QQEhHAsgByA4OAJQIAcgOTgCTCAHIBw2AkggByA2OAJEIAcgNzgCQCAHIB02AjwgByA0OAI4IAcgNTgCNCAHIAk2AjAgByAvOAIsIAcgMDgCKCAHIAo2AiQCQAJAICENACAeDQAgHw0AICANACAHQdQAaiAHQSRqIA5BvIzAABBTIAcoAlghCQJAIAcoAlxBBEcNACAJQRxqIiEqAgAhBiAJQRRqIh8qAgAhBSAJQQxqIh4qAgAhKCAJQQRqIhwqAgAhKyAJKgIYIS0gCSoCECEsIAkqAgghLiAJKgIAITEQ/AECQAJAAkBBMEEEEO0BIgpFDQAgCkEIaiIdIBwqAgAiMiArICiSIAWSIAaSQwAAgD6UIgaTIAkqAgAiKCAxIC6SICySIC2SQwAAgD6UIgWTEPUBOAIAIAogMjgCBCAKICg4AgAgCkEUaiIcIB4qAgAiKCAGkyAJKgIIIisgBZMQ9QE4AgAgCiAoOAIQIAogKzgCDCAKQSBqIh4gHyoCACIoIAaTIAkqAhAiKyAFkxD1ATgCACAKICg4AhwgCiArOAIYIApBLGoiIiAhKgIAIiggBpMgCSoCGCIrIAWTEPUBIgY4AgAgCiAoOAIoIAogKzgCJCAKQQxqIR8gHCoCACIFIB0qAgAiKF0NASAFISsMAgtBBEEwQbyMwAAQ3QEACyAKKQIMISQgH0EIaiAdKAIANgIAIAopAgAhJSAKICQ3AgAgHyAlNwIAIB0gBTgCACAcKgIAISsgBSEoCyAKQRhqISECQCAeKgIAIgUgK11FDQAgCikCGCEkICEgCikCDDcCACAhQQhqIBwoAgA2AgAgCkEMaiEgQRghIwJAIAUgKF1FDQAgICAKKQIANwIAICBBCGogHSgCADYCAEEMISMgCiEgCyAgICQ3AgAgCiAjakF8aiAFOAIAIB4qAgAhBSAiKgIAIQYLAkAgBiAFXUUNACAKKQIkISQgCkEkaiIgIAopAhg3AgAgIEEIaiAeKAIANgIAAkAgBiAcKgIAXUUNACAhIAopAgw3AgAgIUEIaiAcKAIANgIAAkAgBiAdKgIAXQ0AICEhICAfISEMAQsgHyAKKQIANwIAIB9BCGogHSgCADYCACAfISAgCiEhCyAhICQ3AgAgIEF8aiAGOAIACyAKQQNBAiAKKgIMIAoqAhCSIgYgCioCACAKKgIEkiIFQ///f38gBUP//39/XRsiBV0iHCAKKgIYIAoqAhySIiggBiAFIBwbIgZdIhwbIAoqAiQgCioCKJIgKCAGIBwbXRsiHEEMbGoiHSoCBCEoIAogHEECc0EMbGoiISoCACEtICEqAgQhLCAKIBxBf2pBA3FBDGxqIiEqAgAhLiAKIBxBAWpBA3FBDGxqIhwqAgQhKyAcKgIAIQUgIUEEaioCACExIB0qAgAhBiAKQTBBBBDrASAGQwAASMJgRQ0AIAVDAABIwmBFDQAgKCAmXUUNACAGICddRQ0AIChDAABIwmBFDQAgKyAmXUUNACAFICddRQ0AICtDAABIwmBFDQAgLUMAAEjCYEUNACAuQwAASMJgRQ0AICwgJl1FDQAgLEMAAEjCYEUNACAtICddRQ0AIDEgJl1FDQAgLiAnXUUNACAxQwAASMJgRQ0AICggLpQgBSAslCAGICuUQwAAAACSICggBZSTkiArIC2UkyAtIDGUkiAsIC6Uk5IgBiAxlJOLQwAAAD+UIjIgKl0NACAyICleRQ0CCyAHKAJUIgpFDQAgCSAKQQN0QQQQ6wELIAtBAWohCSALIBtPDRQMEwsgDEECaiIKIAJPDQwgA0ECaiIMIAJPDQ0gCEECaiIIIAJPDQ4gBEECaiIEIAJPDRAgASAMQQJ0aiEMIAEgCkECdGohCiABIAhBAnRqIQggASAEQQJ0aiEEAkACQCAsICuTIjogOpQgLSAFkyI7IDuUkiI8kSI9IC4gBpMiPiA+lCAxICiTIj8gP5SSIkCRIkGSQwAAAD+UIjIgBSAGkyJCIEKUICsgKJMiQyBDlJIiRJEiRSAtIC6TIkYgRpQgLCAxkyJHIEeUkiJIkSJJkkMAAAA/lCIzXg0AIDIgM5UhMwwBCyAzIDKVITMLIAwqAgAhSiAKKgIAIUsgCCoCACFMIAQqAgAhTUMAAAAAITIgREMAAAAAXkUNESBAQwAAAABeDQ8MEQsgEiAJQZyOwAAQkgEACyAVIAlBrI7AABCSAQALIBogCUG8jsAAEJIBAAsgDCACQcyMwAAQkgEACyAEIAJB3IzAABCSAQALIAggAkHsjMAAEJIBAAsgAyACQfyMwAAQkgEACyAEIAJB7IzAABCSAQALIAkgAkH8jMAAEJIBAAsgAyACQcyMwAAQkgEACyAcIAJB3IzAABCSAQALIAogCUHMjsAAEJIBAAsgCiACQdyOwAAQkgEACyAMIAJB7I7AABCSAQALIAggAkH8jsAAEJIBAAtDAACAP0MAAIC/IEIgPpQgQyA/lJIgRSBBlJUiMiAyQwAAgL9dGyIyIDJDAACAP14bEPkBQ9sPyb+SiyEyDAELIAQgAkGMj8AAEJIBAAsgSyBKkiFCIDNDAAAAQF0hCgJAIAYgBZMiPiA+lCAoICuTIj8gP5SSIkNDAAAAAF5FDQAgPEMAAAAAXkUNACAyQwAAgD9DAACAvyA/IDqUID4gO5SSIEORID2UlSI6IDpDAACAv10bIjogOkMAAIA/XhsQ+QFD2w/Jv5KLkiEyCyBCIEySITtDAACAP0MAAAA/IAobIT4gM0MAAAA/XiEKAkAgKyAskyIzIDOUIAUgLZMiOiA6lJIiQ0MAAAAAXkUNACAuIC2TIj8gP5QgMSAskyJCIEKUkiJEQwAAAABeRQ0AIDJDAACAP0MAAIC/IDogP5QgMyBClJIgQ5EgRJGUlSIzIDNDAACAv10bIjMgM0MAAIA/XhsQ+QFD2w/Jv5KLkiEyCyA7IE2SITMgPkMAAAA/IAobIToCQCBIQwAAAABeRQ0AIAYgLpMiOyA7lCAoIDGTIj4gPpSSIj9DAAAAAF5FDQAgMkMAAIA/QwAAgL8gRiA7lCBHID6UkiBJID+RlJUiOyA7QwAAgL9dGyI7IDtDAACAP14bEPkBQ9sPyb+Si5IhMgsgM0MAAHpElSA6lCAyQwAAgL6UQ9sPST+VQwAAgD+SQwAAAAAQ4AGUITICQAJAIA9BAUcNACAyIE5eRQ0BCyAGIU8gKCFQIAUhUSArIVIgLSFTICwhVCAuIVUgMSFWIDIhTgsCQCAHKAJUIgpFDQAgCSAKQQN0QQQQ6wELIAsgG0kiCiALaiEJQQEhDyAKDQALCyAXIBZHDQALCyAUIBQgE0lqIQogFCATSQ0ACwsgESANRw0ACwJAIA9BAXENAEEEIQlBACEKQQAhCwwCCxD8AQJAQSBBBBDtASIKRQ0AIAogVjgCHCAKIFU4AhggCiBUOAIUIAogUzgCECAKIFI4AgwgCiBROAIIIAogUDgCBCAKIE84AgAgB0EINgIsIAcgCjYCKCAHQQg2AiQgB0EkakGMjsAAEG8gBygCKCIJIE44AiAgBygCJCELQQkhCgwCC0EEQSBB7IfAABDdAQALAkAgBygCGCIKRQ0AIAcoAhwgCkECdEEEEOsBCwJAIAcoAgwiCkUNACAHKAIQIApBAnRBBBDrAQtBBCEJQQAhCkEAIQsMAgsCQCAHKAIYIgxFDQAgBygCHCAMQQJ0QQQQ6wELIAcoAgwiDEUNACAHKAIQIAxBAnRBBBDrAQsgAkUNAQsgASACQQJ0QQQQ6wELAkACQAJAIAsgCksNACAJIQIMAQsgC0ECdCEBAkAgCg0AQQQhAiAJIAFBBBDrAQwBCyAJIAFBBCAKQQJ0IgsQ6AEiAkUNAQsgACAKNgIEIAAgAjYCACAHQeAAaiQADwtBBCALQYyQwAAQ3QEAC40fAht/BHwjAEGwBGsiBiQAIAZCADcDmAEgBkIANwOQASAGQgA3A4gBIAZCADcDgAEgBkIANwN4IAZCADcDcCAGQgA3A2ggBkIANwNgIAZCADcDWCAGQgA3A1AgBkIANwNIIAZCADcDQCAGQgA3AzggBkIANwMwIAZCADcDKCAGQgA3AyAgBkIANwMYIAZCADcDECAGQgA3AwggBkIANwMAIAZCADcDuAIgBkIANwOwAiAGQgA3A6gCIAZCADcDoAIgBkIANwOYAiAGQgA3A5ACIAZCADcDiAIgBkIANwOAAiAGQgA3A/gBIAZCADcD8AEgBkIANwPoASAGQgA3A+ABIAZCADcD2AEgBkIANwPQASAGQgA3A8gBIAZCADcDwAEgBkIANwO4ASAGQgA3A7ABIAZCADcDqAEgBkIANwOgASAGQgA3A9gDIAZCADcD0AMgBkIANwPIAyAGQgA3A8ADIAZCADcDuAMgBkIANwOwAyAGQgA3A6gDIAZCADcDoAMgBkIANwOYAyAGQgA3A5ADIAZCADcDiAMgBkIANwOAAyAGQgA3A/gCIAZCADcD8AIgBkIANwPoAiAGQgA3A+ACIAZCADcD2AIgBkIANwPQAiAGQgA3A8gCIAZCADcDwAICQEHQAEUNACAGQeADakEAQdAA/AsACyAFQQJ0KAL4xUAiByABQX9qIghqIQkgBEF9akEYbSIKQQAgCkEAShsiCyAIayEKIAtBAnQgAUECdGtBjMbAAGohDEEAIQEDQAJAAkAgCkEATg0ARAAAAAAAAAAAISEMAQsgDCgCALchIQsgBiABQQN0aiAhOQMAAkAgASAJTw0AIAxBBGohDCAKQQFqIQogASABIAlJaiIBIAlNDQELC0EAIQoDQCAKIAhqIQlEAAAAAAAAAAAhIUEAIQECQANAICEgACABQQN0aisDACAGIAkgAWtBA3RqKwMAoqAhISABIAhPDQEgASABIAhJaiIBIAhNDQALCyAGQcACaiAKQQN0aiAhOQMAAkAgCiAHTw0AIAogCiAHSWoiCiAHTQ0BCwtEAAAAAAAA8H9EAAAAAAAA4H8gBCALQWhsaiINQWhqIg5B/g9LIg8bRAAAAAAAAAAARAAAAAAAAGADIA5BuXBJIhAbRAAAAAAAAPA/IA5BgnhIIhEbIA5B/wdKIhIbIA5B/RcgDkH9F0kbQYJwaiANQel3aiAPGyITIA5B8GggDkHwaEsbQZIPaiANQbEHaiAQGyIUIA4gERsgEhtB/wdqrUI0hr+iISIgBkHgA2pBfGoiFSAHQQJ0aiEWQS8gDWtBH3EhF0EwIA1rQR9xIRggBkG4AmohBCAOQQBKIRkgDkF/aiEaIAchCgJAA0AgBkHAAmogCiIbQQN0aisDACEhAkAgG0UNACAGQeADaiEJIBshAQNAIAkgISAhRAAAAAAAAHA+ovwCtyIjRAAAAAAAAHDBoqD8AjYCACAEIAFBA3RqKwMAICOgISEgAUEBRiIKDQEgCUEEaiEJQQEgAUF/aiAKGyIBDQALCwJAAkACQCASDQAgEQ0BIA4hAQwCCyAhRAAAAAAAAOB/oiIhRAAAAAAAAOB/oiAhIA8bISEgEyEBDAELICFEAAAAAAAAYAOiIiFEAAAAAAAAYAOiICEgEBshISAUIQELICEgAUH/B2qtQjSGv6IiISAhRAAAAAAAAMA/opxEAAAAAAAAIMCioCIhICH8AiIct6EhIQJAAkACQAJAAkACQCAZDQACQCAODQAgFSAbQQJ0aigCAEEXdSEdDAILQQIhHUEAIR4gIUQAAAAAAADgP2ZFDQUMAgsgFSAbQQJ0aiIBIAEoAgAiASABIBh1IgEgGHRrIgk2AgAgCSAXdSEdIAEgHGohHAsgHUEBSA0BC0EBIQkCQCAbRQ0AQQEhCSAbQQFxIR9BACEKAkAgG0EBRg0AIBtBHnEhIEEAIQwgBkHgA2ohAUEAIQoDQCABKAIAIQkCQAJAAkACQCAMRQ0AQf///wchDAwBCyAJRQ0BQYCAgAghDAsgASAMIAlrNgIAQQAhDAwBC0EBIQwLIAFBBGoiHigCACEJAkACQAJAAkAgDA0AQf///wchDAwBCyAJRQ0BQYCAgAghDAsgHiAMIAlrNgIAQQEhDEEAIQkMAQtBACEMQQEhCQsgAUEIaiEBICAgCkECaiIKRw0ACwsgH0UNACAGQeADaiAKQQJ0aiIKKAIAIQECQAJAAkAgCQ0AQf///wchCQwBCyABRQ0BQYCAgAghCQsgCiAJIAFrNgIAQQAhCQwBC0EBIQkLAkAgDkEBSA0AQf///wMhAQJAAkAgGg4CAQACC0H///8BIQELIBUgG0ECdGoiCiAKKAIAIAFxNgIACyAcQQFqIRwgHUECRg0BCyAdIR4MAQtEAAAAAAAA8D8gIaEiISAhICKhIAlBAXEbISFBAiEeCwJAICFEAAAAAAAAAABiDQAgFiEBIBshCgJAIAcgG0F/aiIJSw0AQQAhDAJAA0AgBkHgA2ogCUECdGooAgAgDHIhDCAHIAlPDQEgByAJIAcgCUlrIglNDQALCyAWIQEgGyEKIAxFDQAgBkHgA2ogG0ECdGpBfGohAQNAIBtBf2ohGyAOQWhqIQ4gASgCACEIIAFBfGohASAIRQ0ADAQLCwNAIApBAWohCiABKAIAIQkgAUF8aiEBIAlFDQALIBsgCk8NASAbQQFqIQwDQCAGIAwgCGoiCUEDdGogDCALakECdCgCiMZAtzkDAEEAIQFEAAAAAAAAAAAhIQJAA0AgISAAIAFBA3RqKwMAIAYgCSABa0EDdGorAwCioCEhIAEgCE8NASABIAEgCElqIgEgCE0NAAsLIAZBwAJqIAxBA3RqICE5AwAgDCAMIApJaiEBIAwgCk8NAiABIQwgASAKTQ0ADAILCwsCQAJAAkACQEEAIA5rIgFB/wdKDQAgAUGCeE4NAyAhRAAAAAAAAGADoiEhIAFBuHBNDQFByQcgDmshAQwDCyAhRAAAAAAAAOB/oiEhIAFB/g9LDQFBgXggDmshAQwCCyAhRAAAAAAAAGADoiEhIAFB8GggAUHwaEsbQZIPaiEBDAELICFEAAAAAAAA4H+iISEgAUH9FyABQf0XSRtBgnBqIQELAkACQCAhIAFB/wdqrUI0hr+iIiFEAAAAAAAAcEFmDQAgISEjDAELIAZB4ANqIBtBAnRqICEgIUQAAAAAAABwPqL8ArciI0QAAAAAAABwwaKg/AI2AgAgG0EBaiEbIA0hDgsgBkHgA2ogG0ECdGogI/wCNgIACwJAAkACQAJAIA5B/wdKDQAgDkGCeEgNAUQAAAAAAADwPyEhDAMLIA5B/g9LDQEgDkGBeGohDkQAAAAAAADgfyEhDAILAkAgDkG4cE0NACAOQckHaiEORAAAAAAAAGADISEMAgsgDkHwaCAOQfBoSxtBkg9qIQ5EAAAAAAAAAAAhIQwBCyAOQf0XIA5B/RdJG0GCcGohDkQAAAAAAADwfyEhCyAhIA5B/wdqrUI0hr+iISECQAJAIBtBAXFFDQAgGyEADAELIAZBwAJqIBtBA3RqICEgBkHgA2ogG0ECdGooAgC3ojkDACAhRAAAAAAAAHA+oiEhIBtBf2ohAAsCQCAbRQ0AIABBA3QgBkHAAmpqQXhqIQEgAEECdCAGQeADampBfGohCANAIAEgIUQAAAAAAABwPqIiIyAIKAIAt6I5AwAgAUEIaiAhIAhBBGooAgC3ojkDACABQXBqIQEgCEF4aiEIICNEAAAAAAAAcD6iISEgAEEBRyEJIABBfmohACAJDQALCyAbQQFqISAgBkHAAmogG0EDdGohCSAbIQEDQAJAAkAgByAbIAEiDGsiBCAHIARJGyILDQBBACEIRAAAAAAAAAAAISEMAQsgC0EBakF+cSEKRAAAAAAAAAAAISFBACEBQQAhCANAICEgAUGQyMAAaisDACAJIAFqIgArAwCioCABQZjIwABqKwMAIABBCGorAwCioCEhIAFBEGohASAKIAhBAmoiCEcNAAsLAkAgC0EBcQ0AICEgCEEDdCsDkMhAIAZBwAJqIAggDGpBA3RqKwMAoqAhIQsgBkGgAWogBEEDdGogITkDACAJQXhqIQkgDEF/aiEBIAwNAAsCQAJAAkACQCAFDgQBAAACAQsCQAJAICBBA3EiAA0ARAAAAAAAAAAAISEgGyEIDAELIAZBoAFqIBtBA3RqIQFEAAAAAAAAAAAhISAbIQgDQCAIQX9qIQggISABKwMAoCEhIAFBeGohASAAQX9qIgANAAsLAkAgG0EDSQ0AIAhBA3QgBkGgAWpqQWhqIQEDQCAhIAFBGGorAwCgIAFBEGorAwCgIAFBCGorAwCgIAErAwCgISEgAUFgaiEBIAhBA0chACAIQXxqIQggAA0ACwsgAiAhmiAhIB4bOQMAIAYrA6ABICGhISECQCAbRQ0AQQEhAQNAICEgBkGgAWogAUEDdGorAwCgISEgASAbTw0BIAEgASAbSWoiASAbTQ0ACwsgAiAhmiAhIB4bOQMIDAILAkACQCAgQQNxIgANAEQAAAAAAAAAACEhIBshCAwBCyAGQaABaiAbQQN0aiEBRAAAAAAAAAAAISEgGyEIA0AgCEF/aiEIICEgASsDAKAhISABQXhqIQEgAEF/aiIADQALCwJAIBtBA0kNACAIQQN0IAZBoAFqakFoaiEBA0AgISABQRhqKwMAoCABQRBqKwMAoCABQQhqKwMAoCABKwMAoCEhIAFBYGohASAIQQNHIQAgCEF8aiEIIAANAAsLIAIgIZogISAeGzkDAAwBC0QAAAAAAAAAACEkAkAgG0UNACAGQZgBaiEJIBshAQJAA0AgCSABQQN0IghqIgAgACsDACIhIAZBoAFqIAhqIggrAwAiI6AiIjkDACAIICMgISAioaA5AwAgAUEBRiIIDQFBASABQX9qIAgbIgENAAsLIBtBAUYNACAbIQECQANAIAkgAUEDdCIIaiIAIAArAwAiISAGQaABaiAIaiIIKwMAIiOgIiI5AwAgCCAjICEgIqGgOQMAIAFBAkYiCA0BQQIgAUF/aiAIGyIBQQFLDQALC0QAAAAAAAAAACEkA0AgJCAGQaABaiAbQQN0aisDAKAhJCAbQQJGIgENAUECIBtBf2ogARsiG0EBSw0ACwsgBisDoAEhIQJAIB4NACACICE5AwAgAiAkOQMQIAIgBisDqAE5AwgMAQsgAiAhmjkDACACICSaOQMQIAIgBisDqAGaOQMICyAGQbAEaiQAIBxBB3EL1xoCFH8HfSMAQfAAayILJAAgC0EIaiAGQzX6jjyUIh8QTyALKAIkIgwgBCAEbCADIANsarORIiAgIJIgBZX8AUEBaiINbCIOQQJ0IQ9BACEQAkACQAJAIA5B/////wNLDQAgD0H8////B0sNAEEAIRECQAJAIA8NAEEEIRJBACETDAELEPwBQQQhECAPQQQQ7gEiEkUNASAOIRMLIAtBADYCMCALQoCAgIDAADcCKAJAIANFDQAgBEUNAEEAIRRBACERQQEhD0EAIRUDQCAPIRYgASAUaiEXQQAhDwNAIBQgD2oiECACTw0EAkAgFyAPai0AAEUNAAJAIBEgCygCKEcNACALQShqQayMwAAQbgsgCygCLCARQQN0aiIQIBU2AgQgECAPNgIAIAsgEUEBaiIRNgIwCyADIA9BAWoiD0cNAAsgFCADaiEUIBYgFiAESSIQaiEPIBYhFSAQDQALC0EAIQ8CQCAEIANsIhhBAEgNAAJAAkAgGA0AQQEhGQwBCxD8AUEBIQ8gGEEBEO4BIhlFDQEgCygCMCERCyALQQA2AjwgC0KAgICAwAA3AjQgEUUNAyALKAIsIhogEUEDdGohGyAaQQhqIREgCygCGCEcIAsoAgwhHSALKAIQIRYgCygCHCEVIAwhHgNAIBohDyARIRogHiEXAkACQAJAIA8oAgQiESADbCAPKAIAIhBqIg8gGE8NACAZIA9qLQAAQQFHDQEgFyEeDAILIA8gGEHci8AAEJIBAAsCQCAXDQBBACEeDAELIBGzIQYgELMhIUEAIQ8gHSERIBwhECAXIR4DQAJAAkACQCAVIA9GDQAgFiAPRg0BICAgECoCACAhlCARKgIAIAaUkpIgBZX8ASIUIA1PDQICQCAPIBQgDGxqIhQgDk8NACASIBRBAnRqIhQgFCgCAEEBajYCACAMIR4MAwsgFCAOQYyMwAAQkgEACyAVIBVB7IvAABCSAQALIBYgFkH8i8AAEJIBAAsgEUEEaiERIBBBBGohECAXIA9BAWoiD0cNAAsLIBpBAEEIIBogG0YiDxtqIREgD0UNAAwECwsgDyAYQayJwAAQ3QEACyAQIA9BnInAABDdAQALIBAgAkGcjMAAEJIBAAsgC0EANgJIIAtCgICAgMAANwJAAkAgDUUNACAMRQ0AIAxBAnQhHEEAIRUgEiEbQQAhECAMIRZBASEPQQAhGgNAIBohHiAPIRoCQAJAIBYNAEEAIRYMAQtBACEPIBshEQNAAkACQCAVIA9qIhQgDk8NACARKAIAIhQgB0kNAQJAIBAgCygCQEcNACALQcAAakHMi8AAEHcLIAsoAkQgEEEMbGoiFyAUNgIIIBcgDzYCBCAXIB42AgAgCyAQQQFqIhA2AkgMAQsgFCAOQbyLwAAQkgEACyARQQRqIREgFiAPQQFqIg9HDQALIAwhFgsgGyAcaiEbIBUgDGohFSAaIBogDUlqIQ8gGiANSQ0ACyALKAJEIQ8gCyALQe8AajYCXCAQQQJJDQACQCAQQRVJDQAgDyAQIAtB3ABqEHQMAQsgDyAQQQEgC0HcAGoQZQsCQCAKQQF0Ig1FDQAgCygCSCIPRQ0AIAsoAkQiDiAPQQxsaiEMIA5BDGohDyAFIAWSISIDQCAPIRYgDigCBCEQIA4oAgAhFCALQQA2AmQgC0KAgICAwAA3AlwgCygCMCERIAsoAiwhDyAfIBCzlCIhEPoBIQYgIRD7ASEhAkAgEUUNACARQQN0IREgBSAUs5QgIJMhI0EAIRcCQAJAAkADQAJAICEgDygCACIQsyIklCAGIA9BBGooAgAiFLMiJZSSICOTiyAiX0UNACAUIANsIBBqIhAgGE8NAiAZIBBqLQAADQACQCAXIAsoAlxHDQAgC0HcAGpBrIvAABBuCyALKAJgIBdBA3RqIhAgJTgCBCAQICQ4AgAgCyAXQQFqIhc2AmQLIA9BCGohDyARQXhqIhENAAsCQCAXQQFLDQAgCygCXCIPRQ0EIAsoAmAgD0EDdEEEEOsBDAQLIAsgBow4AkwgCyAhOAJQIAsoAmAhECALIAtB0ABqNgJYIAsgC0HMAGo2AlQgCyALQdQAajYCaAJAAkAgF0EVSQ0AIBAgFyALQegAahB7DAELIBBBCGohFCAQIBdBA3RqIRVBACEXA0ACQCAhIBRBBGoqAgAiJZQgBiAUKgIAIiOUkyIkICEgFEF8aioCAJQgBiAUQXhqKgIAlJNdRQ0AIBchDwJAA0AgECAPaiIRQQhqIBEpAgA3AgACQCAPDQAgECEPDAILIA9BeGohDyAkICEgEUF8aioCAJQgBiARQXhqKgIAlJNdDQALIBAgD2pBCGohDwsgDyAlOAIEIA8gIzgCAAsgF0EIaiEXIBRBCGoiFCAVRw0ACwtBACEUIAsoAmQiFUECSQ0CQQAhFEEBIRADQCAUIQ8CQCAQIAsoAmQiFEkNACAQIBRBzIrAABCSAQALAkACQCALKAJgIhcgEEEDdGoiESoCACARQXhqKgIAIiGTIgYgBpQgESoCBCARQXxqKgIAIiSTIgYgBpSSkSAJXg0AIA8hFAwBCwJAIA8gFE8NACAQIRQgISAXIA9BA3QiEWoiFyoCACIlkyIGIAaUICQgFyoCBCIjkyIGIAaUkpEgCGBFDQEgDigCCCEHAkAgCygCPCIXIAsoAjRHDQAgC0E0akHsisAAEHgLIAsoAjggF0EUbGoiFCAHNgIQIBQgJDgCDCAUICE4AgggFCAjOAIEIBQgJTgCACALIBdBAWo2AjwgECEUIA8gEE8NAQNAAkACQCAPIAsoAmQiFE8NACALKAJgIBFqIhQqAgAQmQEhBiAUQQRqKgIAEJkBISEgBvwBIhQgA08NASAh/AEiFyAETw0BAkAgFyADbCAUaiIUIBhPDQAgGSAUakEBOgAADAILIBQgGEGMi8AAEJIBAAsgDyAUQfyKwAAQkgEACyARQQhqIREgECAPQQFqIg9HDQALIBAhFAwBCyAPIBRB3IrAABCSAQALIBBBAWoiECAVRg0CDAALCyAQIBhBnIvAABCSAQALIAsoAmQhFQsgFUF/aiERAkACQAJAIBVFDQAgFCAVTw0BIAsoAjwhDyALKAJgIhAgEUEDdGoiESoCACIhIBAgFEEDdGoiECoCACIkkyIGIAaUIBEqAgQiJSAQKgIEIiOTIgYgBpSSkSAIYEUNAiAOKAIIIRACQCAPIAsoAjRHDQAgC0E0akHcicAAEHgLIAsoAjggD0EUbGoiESAQNgIQIBEgJTgCDCARICE4AgggESAjOAIEIBEgJDgCACALIA9BAWoiDzYCPAwCCyARQQBBvInAABCSAQALIBQgFUHMicAAEJIBAAsCQCALKAJcIhFFDQAgCygCYCARQQN0QQQQ6wELIA8gCk8NAgsgFkEAQQwgDUF/aiINRSAWIAxGciIRG2ohDyAWIQ4gEUUNAAsLQQAhDwJAAkACQAJAIAsoAjwiEQ0AQQQhA0EAIRFBACEQDAELEPwBIBFBFGwiEEEEEO0BIgNFDQEgEUEFbCEQIAsoAjwhEQsgC0EANgJkIAsgAzYCYCALIBA2AlwgCygCOCEXIAsoAjQhDgJAIBFFDQAgFyARQRRsaiEVQQAhD0EAIQMDQCAXIA9qIhEqAgAhBiARQRBqKAIAIRQgEUEMaioCACEhIBFBCGoqAgAhJCARQQRqKgIAISUCQCADIhAgCygCXEcNACALQdwAakH8icAAEG8LIAsoAmAgD2ogBjgCACALIBBBAWoiAzYCZAJAIAMgCygCXEcNACALQdwAakGMisAAEG8LIAsoAmAgD2pBBGogJTgCACALIANBAWoiAzYCZAJAIAMgCygCXEcNACALQdwAakGcisAAEG8LIAsoAmAgD2pBCGogJDgCACALIANBAWoiAzYCZAJAIAMgCygCXEcNACALQdwAakGsisAAEG8LIAsoAmAgD2pBDGogITgCACALIANBAWoiAzYCZCAUsyEGAkAgAyALKAJcRw0AIAtB3ABqQbyKwAAQbwsgCygCYCAPakEQaiAGOAIAIAsgA0EBaiIDNgJkIA9BFGohDyARQRRqIBVHDQALIBBBBWohDwsCQCAORQ0AIBcgDkEUbEEEEOsBIAsoAmQhDwsgCygCYCEDIAsoAlwhEQJAIAsoAkAiEEUNACALKAJEIBBBDGxBBBDrAQsCQCAYRQ0AIBkgGEEBEOsBCwJAIAsoAigiEEUNACALKAIsIBBBA3RBBBDrAQsCQCATRQ0AIBIgE0ECdEEEEOsBCwJAIAsoAggiEEUNACALKAIMIBBBAnRBBBDrAQsCQCALKAIUIhBFDQAgCygCGCAQQQJ0QQQQ6wELAkAgAkUNACABIAJBARDrAQsCQAJAIBEgD0sNACADIREMAQsgEUECdCEQAkAgDw0AQQQhESADIBBBBBDrAQwBCyADIBBBBCAPQQJ0IhQQ6AEiEUUNAgsgACAPNgIEIAAgETYCACALQfAAaiQADwtBBCAQQeyJwAAQ3QEAC0EEIBRBjJDAABDdAQALvRoDFH8Ifgl7AkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAIAdBfWoOAwEACQALIAVFDQlBACAEQXxqIgggCCAESxshCQJAIAcNACAEQQJ0IQpBACELA0ACQCALIARsIgwgBGoiDSAMTw0AIA0hBAwHCwJAIA0gAU0NACANIQQMBwsgDSADSw0IIAtBAWohC0EAIQwgAiEIIAohDQNAIAj9DAAAAAAAAAAAAAAAAAAAAAD9CwIAIAhBEGohCCANQXBqIQ0gDEEEaiIMIAlNDQALAkAgDCAETw0AIA1FDQAgCEEAIA38CwALIAIgCmohAiALIAVHDQAMCwsLIARBf2oiCEEASA0DQQQgB0EBdiIMayEOQQAgDGshD0EAIRADQAJAIBAgBGwiDCAEaiINIAxPDQAgDSEEDAYLAkAgDSABTQ0AIA0hBAwGCyANIANLDQcgEEEBaiEQIAAgDGohDSACIAxBAnRqIRFBACESIA4hDCAPIRMDQCAMIRT9DAAAAAAAAAAAAAAAAAAAAAAhJCAGIRVBACEKA0BBACATIApqIgwgCCAMIAhJGyILIAxBAEgbIhYgBE8NBEEAIAxBAWoiFyAIIBcgCEkbIgsgF0EASBsiGCAETw0EQQAgDEECaiIXIAggFyAISRsiCyAXQQBIGyIXIARPDQRBACAMQQNqIgwgCCAMIAhJGyILIAxBAEgbIgwgBE8NBCANIBZqLQAA/REgDSAYai0AAP0cASANIBdqLQAA/RwCIA0gDGotAAD9HAMgFf0JAgD9tQEgJP2uASEkIBVBBGohFSAHIApBAWoiCkcNAAsgESASQQJ0aiAkQQj9rQH9CwIAIBRBBGohDCATQQRqIRMgEkEEaiISIAlNDQALAkAgEiAETw0AA0AgEkEBaiEXQgAhHCAUIQwgByEKIAYhCwNAQQAgDCAIIAwgCEkbIAxBAEgbIhUgBE8NBiAMQQFqIQwgCzUCACANIBVqMQAAfiAcfCEcIAtBBGohCyAKQX9qIgoNAAsgESASQQJ0aiAcQgiIPgIAIBRBAWohFCAXIRIgFyAERw0ACwsgECAFRw0ADAoLCyAFRQ0IQQAhCAJAAkACQCAEDgIAAQILQQBBAEGAp8AAEJIBAAsCQCABDQBBASEMDA4LAkAgAw0AQQEhDEEAIQgMDQtBAUEBQZCnwAAQkgEACyAGKAIIIg/9ESElIAYoAgQiCP0RISYgBigCACIM/REhJ0EAIARBe2oiDSANIARLGyEHIARBf2ohFSAIIAxqIRkgD60iHSAIrSIefCEfQQEgBGshEiAAQX9qIREgBEECdCEQIAJBBGohCSAEQX5qIRogHf0SISQgHv0SISggDK0iHP0SISkgBEEGSSEbIAIhBiAAIRdBACEUAkACQANAIBQgBGwiCCAEaiIMIAhJDQ8gDCABSw0PIAwgA0sNDiACIAhBAnRqIg4gDyAAIAhqIhMtAAFsIBkgEy0AACIMbGo2AgBBASEKAkACQAJAAkACQAJAAkACQCAbDQBBAiEIIAkhDQNAIAhBf2ogBE8NAyAIIARPDQQgCEEBaiAETw0FIAhBAmogBE8NAiAMQf8BcSEWIA0gFyAIaiIMQX9qLQAAIhj9ESAMLQAAIgv9HAEgDEEBai0AACIK/RwCIAxBAmotAAAiDP0cAyAm/bUBIBb9ESAY/RwBIAv9HAIgCv0cAyAn/bUB/a4BIAv9ESAK/RwBIAz9HAIgEyAVIAhBA2oiCyAVIAtJG2otAAD9HAMgJf21Af2uAUEI/a0B/QsCACANQRBqIQ0gCEEEaiEIIAsgB00NAAsgCEF/aiEKCyAKIBVPDQUgBCAKQQFqIgggBCAISxsgCkF/c2oiCCAaIAprIgwgCCAMSRsiCCAEIApBf2oiDCAEIAxLGyAKa0EBaiIMIAggDEkbIgggCiAEIAogBEsbIhYgCmsiDCAIIAxJG0EBaiINQQRNDQQgESAKaiEIIAYgCkECdGohDCAKIA0gDUEDcSILQQQgCxtrIg1qIQoDQCAMICggCEEBav1cAAAiKv2JAf2pAf3JAf3VASApIAj9XAAAIiv9iQH9qQH9yQH91QH9zgEgJCAIQQJq/VwAACIs/YkB/akB/ckB/dUB/c4BQQj9zQEgKCAqICT9DQIDAAAAAAAAAAAAAAAAAAD9iQH9qQH9yQH91QEgKSArICT9DQIDAAAAAAAAAAAAAAAAAAD9iQH9qQH9yQH91QH9zgEgJCAsICT9DQIDAAAAAAAAAAAAAAAAAAD9iQH9qQH9yQH91QH9zgFBCP3NAf0NAAECAwgJCgsQERITGBkaG/0LAgAgCEEEaiEIIAxBEGohDCANQXxqIg0NAAwFCwsgCEECaiAEQYCowAAQkgEACyAIQX9qIARB0KfAABCSAQALIAggBEHgp8AAEJIBAAsgCEEBaiAEQfCnwAAQkgEACyAKQX9qIQhBACAWayELIAYgCkECdGohDANAIAggBE8NAiALIAhqQX9GDQQgCEECaiAETw0FIAwgFyAIaiINQQFqMQAAIB5+IA0xAAAgHH58IA1BAmoxAAAgHX58QgiIPgIAIAxBBGohDCASIAhBAWoiCGpBf0cNAAsLIA4gFUECdGogHyATIBVqMQAAfiATIARqQX5qMQAAIBx+fEIIiD4CACARIARqIREgBiAQaiEGIAkgEGohCSAXIARqIRcgFEEBaiIUIAVHDQEMDAsLIAggBEGgp8AAEJIBAAsgFiAEQbCnwAAQkgEACyAIQQJqIARBwKfAABCSAQALIAsgBEHwpMAAEJIBAAsgFSAEQeCkwAAQkgEACyAEIAFNDQFBACEMCyAMIAQgAUHApMAAEJ4BAAsgBCADTQ0BQQAhDCAEIQ0LIAwgDSADQdCkwAAQngEAC0G0o8AAQRxB0KPAABCfAQALIAVFDQAgBEUNAEEAIQwCQAJAIARBf2oiCEEASA0AQQAhDAJAIAQgCEEARyISSw0AAkAgBCABTQ0AQQEhCgwGC0EBIQogBCADTQ0CQQAhDAwECyAIQQIgCEECSRshFAJAIARBAUYNACAIQQMgCEEDSRshESAEQQJ0IRAgAkEIaiEJQQAhBwNAIAcgBGwiDCAEaiIKIAxJDQYgCiABSw0GIAogA0sNBSACIAxBAnRqIgsgBjUCACIfIAY1AgQiIHwgACAMaiINMQAAIh5+IiEgDSASajEAACIiIAY1AgwiHH58IB4gBjUCCCIdfnwgBjUCECIeIA0gFGoxAAAiI358QgiIPgIAIAsgISAdICJ+fCAjIBx+fCAeIA0gEWoxAAB+fEIIiD4CBAJAIARBAkYNAEEEIQwgCSEVA0AgDEF9aiILIAggCyAISRsiCkEAIAxBfmoiC0EAShsiFyAETw0FQQAgDEF/aiIKIAggCiAISRsiCiALQQFqIhZBAEgbIhggBE8NBUEAIAwgCCAMIAhJGyIKIBZBAWoiFkEASBsiEyAETw0FIBUgDSALIAggCyAISRtqMQAAIB1+IA0gGGoxAAAgHH58IA0gF2oxAAAgIH58IA0gDEF8aiILIAggCyAISRtqMQAAIB9+fCANIBNqMQAAIB5+fEIIiD4CACAMQQFqIQwgFUEEaiEVIBZBf2ogBEcNAAsLIAkgEGohCSAHQQFqIgcgBUcNAAwECwtBACEMAkAgAyABIAMgAUkbIgggBUF/aiIEIAggBEkbQQFqIg1BBUkNACAGNQIAIAY1AgR8/RIhJCAGNQIQ/RIhKCAGNQII/RIhKSAGNQIM/RIhJSAAIQggAiEEIA0gDUEDcSIMQQQgDBtrIgwhDQNAIAQgJCAI/VwAACIm/YkB/akB/ckBIif91QEgCCASav1cAAAiKv2JAf2pAf3JASAl/dUB/c4BICcgKf3VAf3OASAoIAggFGr9XAAAIif9iQH9qQH9yQH91QH9zgFBCP3NASAkICYgJP0NAgMAAAAAAAAAAAAAAAAAAP2JAf2pAf3JASIm/dUBICogJP0NAgMAAAAAAAAAAAAAAAAAAP2JAf2pAf3JASAl/dUB/c4BICYgKf3VAf3OASAoICcgJP0NAgMAAAAAAAAAAAAAAAAAAP2JAf2pAf3JAf3VAf3OAUEI/c0B/Q0AAQIDCAkKCxAREhMYGRob/QsCACAIQQRqIQggBEEQaiEEIA1BfGoiDQ0ACwsDQCAMQQFqIQogDCABTw0FIAogA0sNBCACIAxBAnRqIAY1AgAgBjUCBHwgACAMaiIIMQAAIhx+IAggEmoxAAAgBjUCDH58IBwgBjUCCH58IAY1AhAgCCAUajEAAH58QgiIPgIAIAohDCAKIAVGDQMMAAsLAkAgBCABTQ0AIAQhCgwECwJAIAQgA00NAEEAIQwgBCEKDAMLQbSjwABBHEHQo8AAEJ8BAAsgCiAEQbCowAAQkgEACw8LIAwgCiADQaCowAAQngEACyAMIAogAUGQqMAAEJ4BAAsgCCAMIANB8KbAABCeAQALIAggDCABQeCmwAAQngEAC5AXAhR/AX0jAEEQayIHJABBACEIAkACQAJAAkACQAJAAkACQAJAAkACQCAEIANsIglBAEgNAEEBIQoCQCAJRQ0AEPwBQQEhCCAJQQEQ7QEiCkUNAQsCQCAJRQ0AIApBASAJ/AsACxD8AQJAQYDAAEEEEO0BIghFDQAgB0EANgIMIAcgCDYCCCAHQYAINgIEIARBf2oiC0ECSQ0LIANBf2ohDCADQX5qIg1BAnYhDiANQXxxIg9BAXIhEAJAIA1BBEkNACAOQQR0IANBAnQiEWogAWpBBGohEiAKIANqIRMgASARaiEUQQIhBEEBIRUDQCAEIRYgFSADbCIIIAxqIgQgCEEBaiIISQ0LIAQgAksNCyAEIAlLDQlBACEEQQEhFyAUIQgDQCAXIRggDSAETQ0IQQAgDSAEayIXIBcgDUsbQQFqIRcCQAJAIAhBBGoqAgAiGyAGYEUNACATIARqQQFqQQI6AAACQCAHKAIMIhkgBygCBEcNACAHQQRqQci6wAAQbgsgBygCCCAZQQN0aiIaIBU2AgQgGiAEQQFqNgIAIAcgGUEBajYCDAwBCyAbIAVgRQ0AIBMgBGpBAWpBADoAAAsgF0ECRg0HAkACQCAIQQhqKgIAIhsgBmBFDQAgEyAEakECakECOgAAAkAgBygCDCIZIAcoAgRHDQAgB0EEakHIusAAEG4LIAcoAgggGUEDdGoiGiAVNgIEIBogBEECajYCACAHIBlBAWo2AgwMAQsgGyAFYEUNACATIARqQQJqQQA6AAALIBdBA0YNBQJAAkAgCEEMaioCACIbIAZgRQ0AIBMgBGpBA2pBAjoAAAJAIAcoAgwiGSAHKAIERw0AIAdBBGpByLrAABBuCyAHKAIIIBlBA3RqIhogFTYCBCAaIARBA2o2AgAgByAZQQFqNgIMDAELIBsgBWBFDQAgEyAEakEDakEAOgAACyAXQQRGDQYCQAJAIAhBEGoiCCoCACIbIAZgRQ0AIBMgBGpBBGpBAjoAAAJAIAcoAgwiFyAHKAIERw0AIAdBBGpByLrAABBuCyAHKAIIIBdBA3RqIhkgFTYCBCAZIARBBGo2AgAgByAXQQFqNgIMDAELIBsgBWBFDQAgEyAEakEEakEAOgAACyAYQQFqIRcgBEEEaiEEIBggDkkNAAsgEiEIIBAhFwJAIA8gDUYNAANAIBchBAJAAkAgCCoCACIbIAZgRQ0AIBMgBGpBAjoAAAJAIAcoAgwiFyAHKAIERw0AIAdBBGpBqLrAABBuCyAHKAIIIBdBA3RqIhggFTYCBCAYIAQ2AgAgByAXQQFqNgIMDAELIBsgBWBFDQAgEyAEakEAOgAACyAIQQRqIQggBEEBaiEXIAQgDUkNAAsLIBIgEWohEiATIANqIRMgFCARaiEUIBYgFiALSSIIaiEEIBYhFSAIDQAMDAsLAkACQCAPIA1GDQAgDkEEdCADQQJ0IhpqIAFqQQRqIQ4gCiADaiEYQQIhBEEBIRUMAQsgA0EBaiEXIANBAXRBf2ohE0EAIQRBAiEIA0AgEyAEaiINIBcgBGpJDQogDSACSw0KIA0gCUsNCCAEIANqIQQgCCALSSENIAhBAWohCCANDQAMDAsLA0AgBCEZIBUgA2wiCCAMaiIEIAhBAWoiCEkNCiAEIAJLDQogBCAJSw0IIA4hCCAQIRcDQCAXIQQCQAJAIAgqAgAiGyAGYA0AIBsgBWBFDQEgGCAEakEAOgAADAELIBggBGpBAjoAAAJAIAcoAgwiFyAHKAIERw0AIAdBBGpBqLrAABBuCyAHKAIIIBdBA3RqIhMgFTYCBCATIAQ2AgAgByAXQQFqNgIMCyAIQQRqIQggBEEBaiEXIAQgDUkNAAsgDiAaaiEOIBggA2ohGCAZIBkgC0lqIQQgGSEVIBkgC08NCwwACwtBBEGAwABB6LnAABDdAQALIAggCUHYucAAEN0BAAsgBEECaiEEDAILIARBA2ohBAwBCyAEQQFqIQQLIAQgDUG4usAAEJIBAAsgAyAEakEBaiEIIANBAXQgBGpBf2ohBAsgCCAEIAlBmLrAABCeAQALIAMgBGpBAWohCCADQQF0IARqQX9qIQQLIAggBCACQdi6wAAQngEACyAHKAIMIghFDQAgA0EBaiEVQQEgA2shGCADQX9zIRMCQCADRQ0AA0AgByAIQX9qIgg2AgwCQCAHKAIIIAhBA3RqIgQoAgQgA2wgBCgCAGoiBCATaiINIAlPDQAgCiANaiIXLQAADQAgF0ECOgAAIA0gDSADbiIXIANsayENAkAgBygCDCIIIAcoAgRHDQAgB0EEakGIusAAEG4LIAcoAgggCEEDdGoiGSAXNgIEIBkgDTYCACAHIAhBAWoiCDYCDAsCQCAEIANrIg0gCU8NACAKIA1qIhctAAANACAXQQI6AAAgDSANIANuIhcgA2xrIQ0CQCAHKAIMIgggBygCBEcNACAHQQRqQYi6wAAQbgsgBygCCCAIQQN0aiIZIBc2AgQgGSANNgIAIAcgCEEBaiIINgIMCwJAIAQgGGoiDSAJTw0AIAogDWoiFy0AAA0AIBdBAjoAACANIA0gA24iFyADbGshDQJAIAcoAgwiCCAHKAIERw0AIAdBBGpBiLrAABBuCyAHKAIIIAhBA3RqIhkgFzYCBCAZIA02AgAgByAIQQFqIgg2AgwLAkAgBEF/aiINIAlPDQAgCiANaiIXLQAADQAgF0ECOgAAIA0gDSADbiIXIANsayENAkAgBygCDCIIIAcoAgRHDQAgB0EEakGIusAAEG4LIAcoAgggCEEDdGoiGSAXNgIEIBkgDTYCACAHIAhBAWoiCDYCDAsCQCAEQQFqIg0gCU8NACAKIA1qIhctAAANACAXQQI6AAAgDSANIANuIhcgA2xrIQ0CQCAHKAIMIgggBygCBEcNACAHQQRqQYi6wAAQbgsgBygCCCAIQQN0aiIZIBc2AgQgGSANNgIAIAcgCEEBaiIINgIMCwJAIAQgDGoiDSAJTw0AIAogDWoiFy0AAA0AIBdBAjoAACANIA0gA24iFyADbGshDQJAIAcoAgwiCCAHKAIERw0AIAdBBGpBiLrAABBuCyAHKAIIIAhBA3RqIhkgFzYCBCAZIA02AgAgByAIQQFqIgg2AgwLAkAgBCADaiINIAlPDQAgCiANaiIXLQAADQAgF0ECOgAAIA0gDSADbiIXIANsayENAkAgBygCDCIIIAcoAgRHDQAgB0EEakGIusAAEG4LIAcoAgggCEEDdGoiGSAXNgIEIBkgDTYCACAHIAhBAWoiCDYCDAsCQCAEIBVqIgQgCU8NACAKIARqIg0tAAANACANQQI6AAAgBCAEIANuIgggA2xrIQ0CQCAHKAIMIgQgBygCBEcNACAHQQRqQYi6wAAQbgsgBygCCCAEQQN0aiIXIAg2AgQgFyANNgIAIAcgBEEBaiIINgIMCyAIDQAMAgsLIAhBA3QgBygCCGpBeGohFwJAA0AgByAIQX9qIgg2AgwCQCAXKAIAIgQgE2oiDSAJTw0AIAogDWoiDS0AAEUNAgsCQCAEIAlPIhkNACAKIARqIg0tAABFDQILAkAgBCAYaiINIAlPDQAgCiANaiINLQAARQ0CCwJAIARBf2oiDSAJTw0AIAogDWoiDS0AAEUNAgsCQCAEQQFqIg0gCU8NACAKIA1qIg0tAABFDQILAkAgBCAMaiINIAlPDQAgCiANaiINLQAARQ0CCwJAIBkNACAKIARqIg0tAABFDQILAkAgBCAVaiIEIAlPDQAgCiAEaiINLQAARQ0CCyAXQXhqIRcgCEUNAgwACwsgDUECOgAAQfi5wAAQpgEACwJAIAcoAgQiBEUNACAHKAIIIARBA3RBBBDrAQsCQCACRQ0AIAEgAkECdEEEEOsBCyAAIAk2AgQgACAKNgIAIAdBEGokAAuJEwIlfwF7QQAhBwJAAkACQCADIAJsIghBAEgNAEEBIQkCQCAIRQ0AEPwBQQEhByAIQQEQ7gEiCUUNAQsgBEEBdiEKAkACQAJAAkAgA0UNACACRQ0FIAJBf2ohCwJAIAQNAEEAIQFBACEMIAkhAEEAIQ0DQEEAIQ4CQEEAIAggAiANbGsiByAHIAhLGyIHIAsgByALSRtBAWoiB0ERSQ0AIAcgB0EPcSIOQRAgDhsiD2shDiAMIAggDCAISxsgAWoiByALIAcgC0kbIA9rQQFqIQ8gACEHA0AgB/0MAAAAAAAAAAAAAAAAAAAAAP0LAAAgB0EQaiEHIA9BcGoiDw0ACwsgDUEBaiENIAkgDGohDwNAIAwgDmoiByAITw0FIA8gDmpBADoAACACIA5BAWoiDkcNAAsgASACayEBIAwgAmohDCAAIAJqIQAgDSADRw0ADAILCyALQQBIDQFBACAKayEQQQAhEQNAIBEgAmwhDSARQQFqIRFBACESIBAhEwNAIBJBAWohFCATIQcgBCEMQQAhDgNAQQAgByALIAcgC0kbIAdBAEgbIA1qIg8gAU8NBiAAIA9qLQAAIg8gDkH/AXEiDiAPIA5LGyEOIAdBAWohByAMQX9qIgwNAAsgEiANaiIHIAhPDQQgCSAHaiAOOgAAIBNBAWohEyAUIRIgFCACRw0ACyARIANHDQALC0EAIAMgCmsiByAHIANLGyEVIAJBBHYhFiAEQQJJDQUCQCACDQBBACEWDAYLAkACQAJAIANBf2oiC0EASA0AQQAgCmshAEEAIRMDQCATIAJsIRIgE0EBaiETQQAhDQNAIA1BAWohASAAIQcgBCEMQQAhDgNAQQAgByALIAcgC0kbIAdBAEgbIAJsIA1qIg8gCE8NBCAJIA9qLQAAIg8gDkH/AXEiDiAPIA5LGyEOIAdBAWohByAMQX9qIgwNAAsgDSASaiIHIAZPDQQgBSAHaiAOOgAAIAEhDSABIAJHDQALIABBAWohACATIApHDQAMCQsLQZyswABBHEG4rMAAEJ8BAAsgDyAIQZixwAAQkgEACyAHIAZBiLHAABCSAQALQZyswABBHEG4rMAAEJ8BAAsgByAIQaixwAAQkgEACyAPIAFBuLHAABCSAQALIAcgCEG4sMAAEN0BAAtBACEWQQAgAyAKayIHIAcgA0sbIRULAkAgFSAKTQ0AQQAgAiAKbCIXIAJBcHEiGGoiGWshGiAFIBlqIRsgGEF/cyACIBhBAXIiByACIAdLG2ohHCAJIAJqIR0gFSAKayEeIAUgF2ohHyAJIAJBAXRqISAgCSACQQNsaiEhIAkgAkECdCIBaiEiIARBf2oiB0F8cSEAIAdBA3EhESACQRBJISMgBEF+akEDSSEkQQAhJSAZISYgGCEnQQAhKCAKISkDQCACIChsISoCQCAjDQACQCAEQQJJDQAgBSApIAJsaiEQIAkgKSAKayACbGohK0EAIRIgCSETIB0hDCAgIQsgISEPICIhDQNAICsgEkEEdCIUav0AAAAhLEEBIQcCQCAkDQBBACEHQQAhDgNAICwgDCAHav0AAAD9eSALIAdq/QAAAP15IA8gB2r9AAAA/XkgDSAHav0AAAD9eSEsIAcgAWohByAAIA5BBGoiDkcNAAsgDkEBaiEHCwJAIBFFDQAgEyACICggB2psaiEHIBEhDgNAICwgB/0AAAD9eSEsIAcgAmohByAOQX9qIg4NAAsLIBAgFGogLP0LAAAgE0EQaiETIAxBEGohDCALQRBqIQsgD0EQaiEPIA1BEGohDSASQQFqIhIgFkYNAgwACwsgGEUNACAFICggCmogAmxqIAkgKmogGPwKAAALAkAgGCACRg0AAkACQAJAAkAgBEUNACApIAJsIRQgJyEPIBghEgwBCyAYIQ4gHCAGIBkgKmoiByAGIAdLGyAHayIHIBwgB0kbQQFqIgdBEE0NASAcIAYgJiAGICZLGyAaaiIOIBwgDkkbQX9zIAdBD3EiDkEQIA4bIg5qIQwgGCAHIA5raiEOIBshBwNAIAf9DAAAAAAAAAAAAAAAAAAAAAD9CwAAIAdBEGohByAMQRBqIgwNAAwCCwsDQCAJIA9qIQ0gEkEBaiETQQAhByAEIQxBACEOAkADQCAPIAdqIgsgCE8NASANIAdqLQAAIgsgDkH/AXEiDiALIA5LGyEOIAcgAmohByAMQX9qIgwNAAsgEiAUaiIHIAZPDQMgBSAHaiAOOgAAIA9BAWohDyATIRIgEyACTw0EDAELCyALIAhB+LDAABCSAQALIB8gJWohCyAXICVqIQwDQCAMIA5qIgcgBk8NASALIA5qQQA6AAAgDkEBaiIOIAJPDQIMAAsLIAcgBkHosMAAEJIBAAsgKUEBaiEpICUgAmohJSAaIAJrIRogJiACaiEmIBsgAmohGyAnIAJqIScgHSACaiEdICAgAmohICAhIAJqISEgIiACaiEiIChBAWoiKCAeRw0ACwsCQAJAAkACQAJAAkACQCAVIANPDQAgAkUNASAEDQIgAkF/aiENQQAgFSACbCILayEEIAUgC2ohD0EAIQAgFSEBA0BBACEMAkBBACAGIBUgAGogAmxrIgcgByAGSxsiByANIAcgDUkbQQFqIgdBEUkNACAGIAsgBiALSxsgBGoiDiANIA4gDUkbQX9zIAdBD3EiDkEQIA4bIgxqIQ4gByAMayEMIA8hBwNAIAf9DAAAAAAAAAAAAAAAAAAAAAD9CwAAIAdBEGohByAOQRBqIg4NAAsLIAFBAWohASAPIAxqIQ4gDCALaiEHIAIgDGshDANAIAcgBk8NCCAOQQA6AAAgDkEBaiEOIAdBAWohByAMQX9qIgwNAAsgBCACayEEIAsgAmohCyAPIAJqIQ8gAEEBaiEAIAEgA0cNAAsLIAgNAgsPCyADQX9qIgtBAEgNASAVIAprIQADQCAVIAJsIRIgFUEBaiEVQQAhDQNAIA1BAWohASAAIQcgBCEMQQAhDgNAQQAgByALIAcgC0kbIAdBAEgbIAJsIA1qIg8gCE8NBSAJIA9qLQAAIg8gDkH/AXEiDiAPIA5LGyEOIAdBAWohByAMQX9qIgwNAAsgDSASaiIHIAZPDQUgBSAHaiAOOgAAIAEhDSABIAJHDQALIABBAWohACAVIANHDQALCyAJIAhBARDrAQ8LQZyswABBHEG4rMAAEJ8BAAsgDyAIQdiwwAAQkgEACyAHIAZByLDAABCSAQAL8xACD38EfSMAQSBrIgckAAJAAkAgAUEhTw0AIAAgASACIAMgBhAPDAELIAJBeGohCAJAAkACQANAAkAgBA0AIAAgASACIANBASAGEBMMBQsgACABQQN2IglBOGxqIQogACAJQQV0aiELAkACQCABQcAASQ0AIAAgCyAKIAkgBhBkIQwgBigCACENDAELIAAgCiALIAAqAgAgBigCACINKAIAKgIAIhaUIABBBGoqAgAgDUEEaigCACoCACIXlJIiGCALKgIAIBaUIAtBBGoqAgAgF5SSIhldIgkgGSAWIAoqAgCUIBcgCkEEaioCAJSSIhZdcxsgCSAYIBZdcxshDAsgBEF/aiEEIAcgDCoCBCIWOAIEIAcgDCoCACIXOAIAIAwgAGtBA3YhDgJAAkACQCAFRQ0AIAUqAgAgDSgCACoCACIYlCAFQQRqKgIAIA1BBGooAgAqAgAiGZSSIBcgGJQgFiAZlJJdRQ0BCyADIAFJDQNBACEJIAAhCiACIAFBA3QiD2oiECELIA4hEQNAAkAgCiAAQQAgEUF9aiISIBIgEUsbQQN0aiITTw0AIAwqAgAgDSgCACoCACIWlCAMKgIEIA1BBGooAgAqAgAiF5SSIRgDQCACIAtBeGogFiAKKgIAlCAXIApBBGoqAgCUkiAYXSISGyAJQQN0aiAKKQIANwIAIAIgC0FwaiAWIApBCGoiFCoCAJQgFyAKQQxqKgIAlJIgGF0iFRsgCSASaiIJQQN0aiAUKQIANwIAIAIgC0FoaiAWIApBEGoiEioCAJQgFyAKQRRqKgIAlJIgGF0iFBsgCSAVaiIJQQN0aiASKQIANwIAIAIgC0FgaiILIBYgCkEYaiISKgIAlCAXIApBHGoqAgCUkiAYXSIVGyAJIBRqIglBA3RqIBIpAgA3AgAgCSAVaiEJIApBIGoiCiATSQ0ACwsCQCAKIAAgEUEDdGoiFE8NACAMKgIAIA0oAgAqAgAiFpQgDCoCBCANQQRqKAIAKgIAIheUkiEYA0AgAiALQXhqIgsgFiAKKgIAlCAXIApBBGoqAgCUkiAYXSISGyAJQQN0aiAKKQIANwIAIAkgEmohCSAKQQhqIgogFEkNAAsLAkAgESABRg0AIAtBeGoiCyAJQQN0aiAKKQIANwIAIApBCGohCiABIREMAQsLAkAgCUEDdCITRQ0AIAAgAiAT/AoAAAsgASAJayERAkAgASAJRg0AIBFBA3EhFEEAIQsCQCAJIAFrQXxLDQAgACATaiEKIBFBfHEhFSAIIA9qIRJBACELA0AgCiASKQIANwIAIApBCGogECALQf7///8Bc0EDdGopAgA3AgAgCkEQaiAQIAtB/f///wFzQQN0aikCADcCACAKQRhqIBAgC0H8////AXNBA3RqKQIANwIAIBJBYGohEiAKQSBqIQogFSALQQRqIgtHDQALCyAURQ0AIAggDyALQQN0IgtraiEKIAAgC2ogE2ohCwNAIAsgCikCADcCACAKQXhqIQogC0EIaiELIBRBf2oiFA0ACwsgCUUNACAJIAFNDQEgB0EANgIYIAdBATYCDCAHQcSHwAA2AgggB0IENwIQIAdBCGpBzIfAABDLAQALIAMgAUkNAiAGKAIAIRFBACEJIAAhCiACIAFBA3QiEGoiDSELA0ACQCAKIABBACAOQX1qIhIgEiAOSxtBA3RqIhNPDQAgDCoCACARKAIAKgIAIhaUIAwqAgQgEUEEaigCACoCACIXlJIhGANAIAtBeGogAiAYIBYgCioCAJQgFyAKQQRqKgIAlJJdIhIbIAlBA3RqIAopAgA3AgAgC0FwaiACIBggFiAKQQhqIhQqAgCUIBcgCkEMaioCAJSSXSIVGyAJIBJBAXNqIglBA3RqIBQpAgA3AgAgC0FoaiACIBggFiAKQRBqIhIqAgCUIBcgCkEUaioCAJSSXSIUGyAJIBVBAXNqIglBA3RqIBIpAgA3AgAgC0FgaiILIAIgGCAWIApBGGoiEioCAJQgFyAKQRxqKgIAlJJdIhUbIAkgFEEBc2oiCUEDdGogEikCADcCACAJIBVBAXNqIQkgCkEgaiIKIBNJDQALCwJAIAogACAOQQN0aiIUTw0AIAwqAgAgESgCACoCACIWlCAMKgIEIBFBBGooAgAqAgAiF5SSIRgDQCALQXhqIgsgAiAYIBYgCioCAJQgFyAKQQRqKgIAlJJdIhIbIAlBA3RqIAopAgA3AgAgCSASQQFzaiEJIApBCGoiCiAUSQ0ACwsCQCAOIAFGDQAgAiAJQQN0aiAKKQIANwIAIApBCGohCiAJQQFqIQkgC0F4aiELIAEhDgwBCwsCQCAJQQN0IhFFDQAgACACIBH8CgAACyABIAlGDQMgASAJayITQQNxIRQgACARaiEMQQAhCwJAIAkgAWtBfEsNACATQXxxIRUgCCAQaiESQQAhCyAMIQoDQCAKIBIpAgA3AgAgCkEIaiANIAtB/v///wFzQQN0aikCADcCACAKQRBqIA0gC0H9////AXNBA3RqKQIANwIAIApBGGogDSALQfz///8Bc0EDdGopAgA3AgAgEkFgaiESIApBIGohCiAVIAtBBGoiC0cNAAsLAkAgFEUNACAIIAtBA3QiC2sgEGohCiAAIAtqIBFqIQsDQCALIAopAgA3AgAgCkF4aiEKIAtBCGohCyAUQX9qIhQNAAsLIAkgAUsNBEEAIQUgDCEAIBMhASATQSFPDQEgDCATIAIgAyAGEA8MBQsgACATaiARIAIgAyAEIAcgBhAJIAkhASAJQSFPDQALIAAgCSACIAMgBhAPDAMLAAsgACABQQN0akEAIAIgAyAGEA8MAQsgCSABIAFB3IfAABCeAQALIAdBIGokAAuWEQIcfwd9IwBBgBRrIggkAAJAIAVFDQAgAyAFbiEJAkAgBkUNACAEIAZuIgogCWwhC0F/IQwCQCAHQwAAAABeRQ0AIAcgC7OUQwAAgDuUQwAAgD8Q4AH8ASEMCyAGIAVsIg1BCHQhDkEAIQ8CQCANQf///wdLDQBBACEQIA5BAEgNAAJAAkAgDg0AQQEhEQwBCxD8AUEBIQ8gDkEBEO0BIhFFDQEgDSEQCwJAAkACQAJAAkAgDUECSQ0AIA1Bf2oiDkEHcSESIA1BfmpBB08NASARIQ4MAgsgESEOIA0NAgwDCyAOQXhxIRMgESEOA0ACQEGAAkUiDw0AIA5BAEGAAvwLAAsCQCAPDQAgDkGAAmpBAEGAAvwLAAsCQCAPDQAgDkGABGpBAEGAAvwLAAsCQCAPDQAgDkGABmpBAEGAAvwLAAsCQCAPDQAgDkGACGpBAEGAAvwLAAsCQCAPDQAgDkGACmpBAEGAAvwLAAsCQCAPDQAgDkGADGpBAEGAAvwLAAsCQCAPDQAgDkGADmpBAEGAAvwLAAsgDkGAEGohDiATQXhqIhMNAAsLIBJFDQADQAJAQYACRQ0AIA5BAEGAAvwLAAsgDkGAAmohDiASQX9qIhINAAsLQYACRQ0AIA5BAEGAAvwLAAsgBCADbCEUIAVBf2ohFSAGQX9qIRYgCEGACmpBBGohF0EBIQ9BACEYA0AgGCEOIA8hGCAEIA4gCmwiGSAKaiAOIBZGGyIaIBlrIRsgGSAaIBlLaiEcIA4gBWwhHUEBIQ5BACEeAkACQANAIA4hHwJAQYAIRQ0AIAhBAEGACPwLAAsgAyAeIAlsIiAgCWogHiAVRhshEwJAIBogGU0NACATICBNDQAgHCEOIBkhDwNAIA4hISAPIANsIRIgICEOA0AgDiASaiIPIAJPDQQgCCABIA9qLQAAQQJ0aiIPIA8oAgBBAWo2AgAgDkEBaiIOIBNJDQALICEgISAaSSISaiEOICEhDyASDQALCwJAAkAgDCALTw0AQQAhDkEAIRIDQEEAIAggEmoiD0EMaigCACIhIAxrIiIgIiAhSxtBACAPQQhqKAIAIiEgDGsiIiAiICFLG0EAIA9BBGooAgAiISAMayIiICIgIUsbQQAgDygCACIPIAxrIiEgISAPSxsgDmpqamohDiASQRBqIhJBgAhHDQALIAwgDkEIdiIiayEjQQAhDwNAAkACQCAIIA9qIhIoAgAiISAMSw0AAkAgISAjSw0AICEgImohISAOICJrIQ4MAgsgDiAMayAhaiEOCyAMISELIBIgITYCAAJAAkAgEkEEaiISKAIAIiEgDEsNAAJAICEgI0sNACAhICJqISEgDiAiayEODAILIA4gDGsgIWohDgsgDCEhCyASICE2AgAgD0EIaiIPQYAIRw0ACyAIKAIAIg8gDkEARyAPIAxJcWohIQwBCyAIKAIAISELQQAhDgJAQfwHRQ0AIBdBAEH8B/wLAAsgHiAdaiEiIAggITYCgAoDQCAIQYAKaiAOaiIPQQRqIAggDmoiEkEEaigCACAhaiIhNgIAIA9BCGogEkEIaigCACAhaiIhNgIAIA9BDGogEkEMaigCACAhaiIhNgIAIA5BDGoiDkH8B0cNAAtBACEPAkBBgAJFIiENACAIQYASakEAQYAC/AsAC0MAAH9DIBMgIGsgG2yzlSEHIAhBgApqIQ4DQCAIQYASaiAPaiISIAcgDigCALOUEJkB/AEiE0H/ASATQf8BSRs6AAAgEkEBaiAHIA5BBGooAgCzlBCZAfwBIhJB/wEgEkH/AUkbOgAAIA5BCGohDiAPQQJqIg9BgAJHDQALAkAgIQ0AIAhBgAhqIAhBgBJqQYAC/AoAAAsCQCAiIA1PDQACQCAhDQAgESAiQQh0aiAIQYAIakGAAvwKAAALIB8gHyAFSSIPaiEOIB8hHiAPRQ0DDAELCyAiIA1BhKPAABCSAQALIA8gAkGUo8AAEJIBAAsgGCAYIAZJaiEPIBggBkkNAAtBACEOAkAgFEEASA0AAkACQCAUDQBBASEZDAELEPwBQQEhDiAUQQEQ7gEiGUUNAQsgACAUNgIIIAAgGTYCBCAAIBQ2AgACQAJAAkACQAJAAkACQCAERQ0AIANFDQAgFrMhJCAKsyElIBWzISYgCbMhJ0EAISNBASEOQQAhDwNAIA4hCUMAAIA/IA+zICWVICQQ3gEiByAHjvwBIg6zkyIokyEpIBYgDkEBaiIPIBYgD0kbIAVsIRMgASAjaiEeIBkgI2ohHyAOIAVsIRJBACEOA0AgIyAOaiIMIAJPDQMgDrMgJ5UgJhDeASIHjvwBIg8gEmoiIiANTw0EIBUgD0EBaiIhIBUgIUkbIiEgEmoiICANTw0FIA8gE2oiGiANTw0GICEgE2oiISANTw0HIAwgFE8NCCAfIA5qQf8BQwAAf0NDAAAAACApQwAAgD8gByAPs5MiB5MiKiARICJBCHRqIB4gDmotAAAiD2otAACzlCAHIBEgIEEIdGogD2otAACzlJKUICggKiARIBpBCHRqIA9qLQAAs5QgByARICFBCHRqIA9qLQAAs5SSlJIQmQEiByAHQwAAAABdGyIHIAdDAAB/Q14bIgf8AUEAIAdDAAAAAGAbIAdDAAB/Q14bOgAAIAMgDkEBaiIORw0ACyAjIANqISMgCSAJIARJIhJqIQ4gCSEPIBINAAsLAkAgEEUNACARIBBBCHRBARDrAQsgCEGAFGokAA8LIAwgAkGkosAAEJIBAAsgIiANQbSiwAAQkgEACyAgIA1BxKLAABCSAQALIBogDUHUosAAEJIBAAsgISANQeSiwAAQkgEACyAMIBRB9KLAABCSAQALIA4gFEGUosAAEN0BAAsgDyAOQYSiwAAQ3QEAC0H0ocAAEKYBAAtB5KHAABCmAQAL0w8BEn8jAEEwayIHJAACQAJAIAFBIU8NACAAIAEgAiADIAYQFQwBCyACQXRqIQgDQAJAIAQNACAAIAEgAiADQQEgBhAeDAILIAAgAUEDdiIJQdQAbGohCiAAIAlBMGxqIQsCQAJAIAFBwABJDQAgACALIAogCSAGEIABIQkMAQsgACAKIAsgC0EIaigCACIJIABBCGooAgAiDEkiDSAKQQhqKAIAIg4gCUlzGyANIA4gDElzGyEJCyAEQX9qIQQgB0EIakEIaiAJQQhqIgooAgA2AgAgByAJKQIANwMIIAkgAGtBDG4hDwJAAkACQAJAAkAgBUUNACAKKAIAIAVBCGooAgBPDQELIAMgAUkNASAAIA9BDGxqQQhqIQtBACEKIAAhECACIAFBDGwiEWoiEiENIA8hEwNAAkACQCAQIABBACATQX1qIgkgCSATSxtBDGxqIhRJDQAgECEJDAELQQAhFUEAIQ4DQCACIA0gFWoiDEF0aiALKAIAIBAgDmoiCUEIaigCACIWSSIXGyAKQQxsaiIYIAkpAgA3AgAgGEEIaiAWNgIAIAIgDEFoaiALKAIAIAlBFGooAgAiFkkiGBsgCiAXaiIKQQxsaiIXIAlBDGopAgA3AgAgF0EIaiAWNgIAIAIgDEFcaiALKAIAIAlBIGooAgAiFkkiFxsgCiAYaiIKQQxsaiIYIAlBGGopAgA3AgAgGEEIaiAWNgIAIAIgDEFQaiALKAIAIAlBLGooAgAiDEkiFhsgCiAXaiIKQQxsaiIXIAlBJGopAgA3AgAgF0EIaiAMNgIAIAogFmohCiAVQVBqIRUgECAOQTBqIg5qIgkgFEkNAAsgDSAOayENCwJAIAkgACATQQxsaiIQTw0AA0AgAiANQXRqIg0gCygCACAJQQhqKAIAIgxJIg4bIApBDGxqIhUgCSkCADcCACAVQQhqIAw2AgAgCiAOaiEKIAlBDGoiCSAQSQ0ACwsCQCATIAFGDQAgDUF0aiINIApBDGxqIgwgCSkCADcCACAMQQhqIAlBCGooAgA2AgAgCUEMaiEQIAEhEwwBCwsCQCAKQQxsIhVFDQAgACACIBX8CgAACyABIAprIRACQCABIApGDQAgEEEBcSEWIAAgFWohF0EAIQwCQCABIApBAWpGDQAgEEF+cSEOIAggEWohC0EAIQwgFyEJA0AgCSALKQIANwIAIAlBCGogC0EIaigCADYCACAJQQxqIBIgDEH+////A3NBDGxqIg0pAgA3AgAgCUEUaiANQQhqKAIANgIAIAtBaGohCyAJQRhqIQkgDiAMQQJqIgxHDQALCyAWRQ0AIBcgDEEMbGoiCSASIAxBf3NBDGxqIgspAgA3AgAgCUEIaiALQQhqKAIANgIACyAKRQ0AIAEgCk8NAiAHQQA2AiggB0EBNgIcIAdBxIfAADYCGCAHQgQ3AiAgB0EYakHMh8AAEMsBAAsgAyABSQ0AIAAgD0EMbGpBCGohCkEAIQsgACEQIAIgAUEMbCISaiITIQ0DQAJAAkAgECAAQQAgD0F9aiIJIAkgD0sbQQxsaiIUSQ0AIBAhCQwBC0EAIRVBACEOA0AgAiANIBVqIgxBdGogECAOaiIJQQhqKAIAIhYgCigCAE8iFxsgC0EMbGoiGCAJKQIANwIAIBhBCGogFjYCACACIAxBaGogCUEUaigCACIWIAooAgBPIhgbIAsgF2oiC0EMbGoiFyAJQQxqKQIANwIAIBdBCGogFjYCACACIAxBXGogCUEgaigCACIWIAooAgBPIhcbIAsgGGoiC0EMbGoiGCAJQRhqKQIANwIAIBhBCGogFjYCACACIAxBUGogCUEsaigCACIMIAooAgBPIhYbIAsgF2oiC0EMbGoiFyAJQSRqKQIANwIAIBdBCGogDDYCACALIBZqIQsgFUFQaiEVIBAgDkEwaiIOaiIJIBRJDQALIA0gDmshDQsCQCAJIAAgD0EMbGoiEE8NAANAIAIgDUF0aiINIAlBCGooAgAiDCAKKAIATyIOGyALQQxsaiIVIAkpAgA3AgAgFUEIaiAMNgIAIAsgDmohCyAJQQxqIgkgEEkNAAsLAkAgDyABRg0AIAIgC0EMbGoiDCAJKQIANwIAIAxBCGogCUEIaigCADYCACAJQQxqIRAgC0EBaiELIA1BdGohDSABIQ8MAQsLAkAgC0EMbCIJRQ0AIAAgAiAJ/AoAAAsCQAJAIAEgC0YNACABIAtrIgpBAXEhECAAIAlqIQBBACENAkAgASALQQFqRg0AIApBfnEhFSAIIBJqIQxBACENIAAhCQNAIAkgDCkCADcCACAJQQhqIAxBCGooAgA2AgAgCUEMaiATIA1B/v///wNzQQxsaiIOKQIANwIAIAlBFGogDkEIaigCADYCACAMQWhqIQwgCUEYaiEJIBUgDUECaiINRw0ACwsCQCAQRQ0AIAAgDUEMbGoiCSATIA1Bf3NBDGxqIgwpAgA3AgAgCUEIaiAMQQhqKAIANgIACyABIAtJDQFBACEFIAohASAKQSFPDQUMBAsgACABQQxsakEAIAIgAyAGEBUMBQsgCyABIAFB3IfAABCeAQALAAsgACAVaiAQIAIgAyAEIAdBCGogBhALIAohASAKQSFPDQELCyAAIAogAiADIAYQFQsgB0EwaiQAC9IPARJ/IwBBMGsiByQAAkACQCABQSFPDQAgACABIAIgAyAGEBYMAQsgAkF0aiEIA0ACQCAEDQAgACABIAIgA0EBIAYQHwwCCyAAIAFBA3YiCUHUAGxqIQogACAJQTBsaiELAkACQCABQcAASQ0AIAAgCyAKIAkgBhB/IQkMAQsgACAKIAsgC0EIaigCACIJIABBCGooAgAiDEkiDSAKQQhqKAIAIg4gCUlzGyANIA4gDElzGyEJCyAEQX9qIQQgB0EIakEIaiAJQQhqIgooAgA2AgAgByAJKQIANwMIIAkgAGtBDG4hDwJAAkACQAJAAkAgBUUNACAKKAIAIAVBCGooAgBPDQELIAMgAUkNASAAIA9BDGxqQQhqIQtBACEKIAAhECACIAFBDGwiEWoiEiENIA8hEwNAAkACQCAQIABBACATQX1qIgkgCSATSxtBDGxqIhRJDQAgECEJDAELQQAhFUEAIQ4DQCACIA0gFWoiDEF0aiALKAIAIBAgDmoiCUEIaigCACIWSSIXGyAKQQxsaiIYIAkpAgA3AgAgGEEIaiAWNgIAIAIgDEFoaiALKAIAIAlBFGooAgAiFkkiGBsgCiAXaiIKQQxsaiIXIAlBDGopAgA3AgAgF0EIaiAWNgIAIAIgDEFcaiALKAIAIAlBIGooAgAiFkkiFxsgCiAYaiIKQQxsaiIYIAlBGGopAgA3AgAgGEEIaiAWNgIAIAIgDEFQaiALKAIAIAlBLGooAgAiDEkiFhsgCiAXaiIKQQxsaiIXIAlBJGopAgA3AgAgF0EIaiAMNgIAIAogFmohCiAVQVBqIRUgECAOQTBqIg5qIgkgFEkNAAsgDSAOayENCwJAIAkgACATQQxsaiIQTw0AA0AgAiANQXRqIg0gCygCACAJQQhqKAIAIgxJIg4bIApBDGxqIhUgCSkCADcCACAVQQhqIAw2AgAgCiAOaiEKIAlBDGoiCSAQSQ0ACwsCQCATIAFGDQAgDUF0aiINIApBDGxqIgwgCSkCADcCACAMQQhqIAlBCGooAgA2AgAgCUEMaiEQIAEhEwwBCwsCQCAKQQxsIhVFDQAgACACIBX8CgAACyABIAprIRACQCABIApGDQAgEEEBcSEWIAAgFWohF0EAIQwCQCABIApBAWpGDQAgEEF+cSEOIAggEWohC0EAIQwgFyEJA0AgCSALKQIANwIAIAlBCGogC0EIaigCADYCACAJQQxqIBIgDEH+////A3NBDGxqIg0pAgA3AgAgCUEUaiANQQhqKAIANgIAIAtBaGohCyAJQRhqIQkgDiAMQQJqIgxHDQALCyAWRQ0AIBcgDEEMbGoiCSASIAxBf3NBDGxqIgspAgA3AgAgCUEIaiALQQhqKAIANgIACyAKRQ0AIAEgCk8NAiAHQQA2AiggB0EBNgIcIAdBxIfAADYCGCAHQgQ3AiAgB0EYakHMh8AAEMsBAAsgAyABSQ0AIAAgD0EMbGpBCGohCkEAIQsgACEQIAIgAUEMbCISaiITIQ0DQAJAAkAgECAAQQAgD0F9aiIJIAkgD0sbQQxsaiIUSQ0AIBAhCQwBC0EAIRVBACEOA0AgAiANIBVqIgxBdGogECAOaiIJQQhqKAIAIhYgCigCAE8iFxsgC0EMbGoiGCAJKQIANwIAIBhBCGogFjYCACACIAxBaGogCUEUaigCACIWIAooAgBPIhgbIAsgF2oiC0EMbGoiFyAJQQxqKQIANwIAIBdBCGogFjYCACACIAxBXGogCUEgaigCACIWIAooAgBPIhcbIAsgGGoiC0EMbGoiGCAJQRhqKQIANwIAIBhBCGogFjYCACACIAxBUGogCUEsaigCACIMIAooAgBPIhYbIAsgF2oiC0EMbGoiFyAJQSRqKQIANwIAIBdBCGogDDYCACALIBZqIQsgFUFQaiEVIBAgDkEwaiIOaiIJIBRJDQALIA0gDmshDQsCQCAJIAAgD0EMbGoiEE8NAANAIAIgDUF0aiINIAlBCGooAgAiDCAKKAIATyIOGyALQQxsaiIVIAkpAgA3AgAgFUEIaiAMNgIAIAsgDmohCyAJQQxqIgkgEEkNAAsLAkAgDyABRg0AIAIgC0EMbGoiDCAJKQIANwIAIAxBCGogCUEIaigCADYCACAJQQxqIRAgC0EBaiELIA1BdGohDSABIQ8MAQsLAkAgC0EMbCIJRQ0AIAAgAiAJ/AoAAAsCQAJAIAEgC0YNACABIAtrIgpBAXEhECAAIAlqIQBBACENAkAgASALQQFqRg0AIApBfnEhFSAIIBJqIQxBACENIAAhCQNAIAkgDCkCADcCACAJQQhqIAxBCGooAgA2AgAgCUEMaiATIA1B/v///wNzQQxsaiIOKQIANwIAIAlBFGogDkEIaigCADYCACAMQWhqIQwgCUEYaiEJIBUgDUECaiINRw0ACwsCQCAQRQ0AIAAgDUEMbGoiCSATIA1Bf3NBDGxqIgwpAgA3AgAgCUEIaiAMQQhqKAIANgIACyABIAtJDQFBACEFIAohASAKQSFPDQUMBAsgACABQQxsakEAIAIgAyAGEBYMBQsgCyABIAFB3IfAABCeAQALAAsgACAVaiAQIAIgAyAEIAdBCGogBhAMIAohASAKQSFPDQELCyAAIAogAiADIAYQFgsgB0EwaiQAC/EOAhF/A30jAEEgayIHJAACQAJAIAFBIU8NACAAIAEgAiADIAYQIgwBCyACQXhqIQgCQAJAAkADQAJAIAQNACAAIAEgAiADQQEgBhAaDAULIAAgAUEDdiIJQThsaiEKIAAgCUEFdGohCwJAAkAgAUHAAEkNACAAIAsgCiAJIAYQfiEJDAELIAAgCiALIAtBBGoqAgAiGCAAQQRqKgIAIhldIgkgCkEEaioCACIaIBhdcxsgCSAaIBldcxshCQsgBEF/aiEEIAcgCSoCBCIYOAIEIAcgCSgCADYCACAJIABrQQN2IQwCQAJAAkAgBUUNACAYIAVBBGoqAgBdRQ0BCyADIAFJDQMgACAMQQN0akEEaiENQQAhCiAAIQ4gAiABQQN0Ig9qIhAhESAMIRIDQAJAAkAgDiAAQQAgEkF9aiIJIAkgEksbQQN0aiITSQ0AIA4hCQwBCyANKgIAIRhBACEUQQAhFQNAIAIgESAUaiILQXhqIBggDiAVaiIJQQRqKgIAXSIWGyAKQQN0aiAJKQIANwIAIAIgC0FwaiAYIAlBDGoqAgBdIhcbIAogFmoiCkEDdGogCUEIaikCADcCACACIAtBaGogGCAJQRRqKgIAXSIWGyAKIBdqIgpBA3RqIAlBEGopAgA3AgAgAiALQWBqIBggCUEcaioCAF0iCxsgCiAWaiIKQQN0aiAJQRhqKQIANwIAIAogC2ohCiAUQWBqIRQgDiAVQSBqIhVqIgkgE0kNAAsgESAVayERCwJAIAkgACASQQN0aiIVTw0AIA0qAgAhGANAIAIgEUF4aiIRIBggCUEEaioCAF0iCxsgCkEDdGogCSkCADcCACAKIAtqIQogCUEIaiIJIBVJDQALCwJAIBIgAUYNACARQXhqIhEgCkEDdGogCSkCADcCACAJQQhqIQ4gASESDAELCwJAIApBA3QiDkUNACAAIAIgDvwKAAALIAEgCmshFgJAIAEgCkYNACAWQQNxIRVBACELAkAgCiABa0F8Sw0AIAAgDmohCSAWQXxxIRQgCCAPaiERQQAhCwNAIAkgESkCADcCACAJQQhqIBAgC0H+////AXNBA3RqKQIANwIAIAlBEGogECALQf3///8Bc0EDdGopAgA3AgAgCUEYaiAQIAtB/P///wFzQQN0aikCADcCACARQWBqIREgCUEgaiEJIBQgC0EEaiILRw0ACwsgFUUNACAIIA8gC0EDdCILa2ohCSAAIAtqIA5qIQsDQCALIAkpAgA3AgAgCUF4aiEJIAtBCGohCyAVQX9qIhUNAAsLIApFDQAgCiABTQ0BIAdBADYCGCAHQQE2AgwgB0HEh8AANgIIIAdCBDcCECAHQQhqQcyHwAAQywEACyADIAFJDQIgACAMQQN0akEEaiENQQAhCiAAIQ4gAiABQQN0IhBqIhIhEQNAAkACQCAOIABBACAMQX1qIgkgCSAMSxtBA3RqIhNJDQAgDiEJDAELIA0qAgAhGEEAIRRBACEVA0AgESAUaiILQXhqIAIgDiAVaiIJQQRqKgIAIBhdIhYbIApBA3RqIAkpAgA3AgAgC0FwaiACIAlBDGoqAgAgGF0iFxsgCiAWQQFzaiIKQQN0aiAJQQhqKQIANwIAIAtBaGogAiAJQRRqKgIAIBhdIhYbIAogF0EBc2oiCkEDdGogCUEQaikCADcCACALQWBqIAIgCUEcaioCACAYXSILGyAKIBZBAXNqIgpBA3RqIAlBGGopAgA3AgAgCiALQQFzaiEKIBRBYGohFCAOIBVBIGoiFWoiCSATSQ0ACyARIBVrIRELAkAgCSAAIAxBA3RqIhVPDQAgDSoCACEYA0AgEUF4aiIRIAIgCUEEaioCACAYXSILGyAKQQN0aiAJKQIANwIAIAogC0EBc2ohCiAJQQhqIgkgFUkNAAsLAkAgDCABRg0AIAIgCkEDdGogCSkCADcCACAJQQhqIQ4gCkEBaiEKIBFBeGohESABIQwMAQsLAkAgCkEDdCIWRQ0AIAAgAiAW/AoAAAsgASAKRg0DIAEgCmsiDkEDcSEVIAAgFmohF0EAIQsCQCAKIAFrQXxLDQAgDkF8cSEUIAggEGohEUEAIQsgFyEJA0AgCSARKQIANwIAIAlBCGogEiALQf7///8Bc0EDdGopAgA3AgAgCUEQaiASIAtB/f///wFzQQN0aikCADcCACAJQRhqIBIgC0H8////AXNBA3RqKQIANwIAIBFBYGohESAJQSBqIQkgFCALQQRqIgtHDQALCwJAIBVFDQAgCCALQQN0IgtrIBBqIQkgACALaiAWaiELA0AgCyAJKQIANwIAIAlBeGohCSALQQhqIQsgFUF/aiIVDQALCyAKIAFLDQRBACEFIBchACAOIQEgDkEhTw0BIBcgDiACIAMgBhAiDAULIAAgDmogFiACIAMgBCAHIAYQDSAKIQEgCkEhTw0ACyAAIAogAiADIAYQIgwDCwALIAAgAUEDdGpBACACIAMgBhAiDAELIAogASABQdyHwAAQngEACyAHQSBqJAAL9A8CEX8BfSMAQRBrIgckAEEAIQgCQAJAAkACQAJAAkAgBCADbCIJQQBIDQBBASEKQQEhCwJAAkAgCUUNABD8AUEBIQggCUEBEO4BIgpFDQIQ/AEgCUEBEO0BIgtFDQELAkAgCUUNACALQQEgCfwLAAsQ/AECQEGAwABBBBDtASIIRQ0AIAdBADYCDCAHIAg2AgggB0GACDYCBCADQX9qIgxBAkkNByAEQX9qIg1BAkkNByAKIANqIQ4gCyADaiEPQQIgA2shECADQQJ0IhEgAWpBBGohEiADIRNBAiEEQQEhFANAIAQhFSASIQhBASEEA0AgEyAEaiIWIAJPDQcCQAJAIAgqAgAiGCAGYEUNACAWIAlPDQcgDyAEakECOgAAIA4gBGpB/wE6AAACQCAHKAIMIhYgBygCBEcNACAHQQRqQei7wAAQbgsgBygCCCAWQQN0aiIXIBQ2AgQgFyAENgIAIAcgFkEBajYCDAwBCyAYIAVgRQ0AIBYgCU8NByAPIARqQQA6AAALIAhBBGohCCAQIARBAWoiBGpBAUcNAAsgEiARaiESIA4gA2ohDiAPIANqIQ8gEyADaiETIBUgFSANSSIIaiEEIBUhFCAIDQALIAcoAgwiCEUNByADQQFqIQ5BASADayEPIANBf3MhFyADRQ0GA0AgByAIQX9qIgg2AgwCQCAHKAIIIAhBA3RqIgQoAgQgA2wgBCgCAGoiBCAXaiIWIAlPDQAgCyAWaiITLQAADQAgE0ECOgAAIAogFmpB/wE6AAAgFiAWIANuIhMgA2xrIRYCQCAHKAIMIgggBygCBEcNACAHQQRqQai7wAAQbgsgBygCCCAIQQN0aiIQIBM2AgQgECAWNgIAIAcgCEEBaiIINgIMCwJAIAQgA2siFiAJTw0AIAsgFmoiEy0AAA0AIBNBAjoAACAKIBZqQf8BOgAAIBYgFiADbiITIANsayEWAkAgBygCDCIIIAcoAgRHDQAgB0EEakGou8AAEG4LIAcoAgggCEEDdGoiECATNgIEIBAgFjYCACAHIAhBAWoiCDYCDAsCQCAEIA9qIhYgCU8NACALIBZqIhMtAAANACATQQI6AAAgCiAWakH/AToAACAWIBYgA24iEyADbGshFgJAIAcoAgwiCCAHKAIERw0AIAdBBGpBqLvAABBuCyAHKAIIIAhBA3RqIhAgEzYCBCAQIBY2AgAgByAIQQFqIgg2AgwLAkAgBEF/aiIWIAlPDQAgCyAWaiITLQAADQAgE0ECOgAAIAogFmpB/wE6AAAgFiAWIANuIhMgA2xrIRYCQCAHKAIMIgggBygCBEcNACAHQQRqQai7wAAQbgsgBygCCCAIQQN0aiIQIBM2AgQgECAWNgIAIAcgCEEBaiIINgIMCwJAIARBAWoiFiAJTw0AIAsgFmoiEy0AAA0AIBNBAjoAACAKIBZqQf8BOgAAIBYgFiADbiITIANsayEWAkAgBygCDCIIIAcoAgRHDQAgB0EEakGou8AAEG4LIAcoAgggCEEDdGoiECATNgIEIBAgFjYCACAHIAhBAWoiCDYCDAsCQCAEIAxqIhYgCU8NACALIBZqIhMtAAANACATQQI6AAAgCiAWakH/AToAACAWIBYgA24iEyADbGshFgJAIAcoAgwiCCAHKAIERw0AIAdBBGpBqLvAABBuCyAHKAIIIAhBA3RqIhAgEzYCBCAQIBY2AgAgByAIQQFqIgg2AgwLAkAgBCADaiIWIAlPDQAgCyAWaiITLQAADQAgE0ECOgAAIAogFmpB/wE6AAAgFiAWIANuIhMgA2xrIRYCQCAHKAIMIgggBygCBEcNACAHQQRqQai7wAAQbgsgBygCCCAIQQN0aiIQIBM2AgQgECAWNgIAIAcgCEEBaiIINgIMCwJAIAQgDmoiBCAJTw0AIAsgBGoiFi0AAA0AIBZBAjoAACAKIARqQf8BOgAAIAQgBCADbiIIIANsayEWAkAgBygCDCIEIAcoAgRHDQAgB0EEakGou8AAEG4LIAcoAgggBEEDdGoiEyAINgIEIBMgFjYCACAHIARBAWoiCDYCDAsgCA0ADAgLC0EEQYDAAEGIu8AAEN0BAAtBASAJQfi6wAAQ3QEACyAIIAlB6LrAABDdAQALIBYgCUHYu8AAEJIBAAsgFiAJQci7wAAQkgEACyAWIAJBuLvAABCSAQALIAhBA3QgBygCCGpBeGohEAJAA0AgByAIQX9qIgg2AgwCQCAQKAIAIhYgF2oiBCAJTw0AIAsgBGoiEy0AAEUNAgsCQAJAIBYgCU8iFA0AIAsgFmoiEy0AAEUNAQsCQCAWIA9qIgQgCU8NACALIARqIhMtAABFDQMLAkAgFkF/aiIEIAlPDQAgCyAEaiITLQAARQ0DCwJAIBZBAWoiBCAJTw0AIAsgBGoiEy0AAEUNAwsCQCAWIAxqIgQgCU8NACALIARqIhMtAABFDQMLAkAgFA0AIAsgFmoiEy0AAEUNAQsCQCAWIA5qIgQgCU8NACALIARqIhMtAABFDQMLIBBBeGohECAIRQ0DDAELCyAWIQQLIBNBAjoAACAKIARqQf8BOgAAQZi7wAAQpgEACwJAIAcoAgQiBEUNACAHKAIIIARBA3RBBBDrAQsCQCAJRQ0AIAsgCUEBEOsBCwJAIAJFDQAgASACQQJ0QQQQ6wELIAAgCTYCBCAAIAo2AgAgB0EQaiQAC6oOAw1/AX4GfQJAAkAgAUECSQ0AAkACQAJAIAMgAUEQakkNACABQQF2IQUgAUEPSw0BIAIgBUEDdCIDaiEGIAAgA2ohAwJAIAFBB00NAEEEIQcgACAAKgIIIAQoAgAiCCgCACoCACITlCAAQQxqKgIAIAhBBGooAgAqAgAiFJSSIAAqAgAgE5QgAEEEaioCACAUlJJdIglBA3RqIgogAEEYQRAgEyAAKgIYlCAUIABBHGoqAgCUkiATIAAqAhCUIBQgAEEUaioCAJSSXSILG2oiCCAAIAlBAXNBA3RqIgkgEyAAQRBBGCALG2oiCyoCAJQgFCALQQRqKgIAlJIgEyAJKgIAlCAUIAlBBGoqAgCUkl0iDBsgEyAIKgIAlCAUIAhBBGoqAgCUkiATIAoqAgCUIBQgCkEEaioCAJSSXSINGyIOQQRqKgIAIRUgDioCACEWIAsgCSAIIA0bIAwbIg9BBGoqAgAhFyAPKgIAIRggAiAIIAogDRspAgA3AgAgAiAJIAsgDBspAgA3AhggAiAPIA4gEyAYlCAUIBeUkiATIBaUIBQgFZSSXSIIGykCADcCCCACIA4gDyAIGykCADcCECADIBMgAyoCCJQgFCADQQxqKgIAlJIgEyADKgIAlCAUIANBBGoqAgCUkl0iCUEDdGoiCiADQRhBECATIAMqAhiUIBQgA0EcaioCAJSSIBMgAyoCEJQgFCADQRRqKgIAlJJdIgsbaiIIIAMgCUEBc0EDdGoiCSATIANBEEEYIAsbaiIDKgIAlCAUIANBBGoqAgCUkiATIAkqAgCUIBQgCUEEaioCAJSSXSIPGyATIAgqAgCUIBQgCEEEaioCAJSSIBMgCioCAJQgFCAKQQRqKgIAlJJdIgwbIgtBBGoqAgAhFSALKgIAIRYgAyAJIAggDBsgDxsiDkEEaioCACEXIA4qAgAhGCAGIAggCiAMGykCADcCACAGIAkgAyAPGykCADcCGCAGIA4gCyATIBiUIBQgF5SSIBMgFpQgFCAVlJJdIgMbKQIANwIIIAYgCyAOIAMbKQIANwIQDAMLIAIgACkCADcCACAGIAMpAgA3AgBBASEHDAILAAsgACACIAIgAUEDdGoiAyAEKAIAIgYQGCAAIAVBA3QiCGogAiAIaiADQcAAaiAGEBhBCCEHCyAHQQFqIQ0gASAFayEQIAQoAgAhCAJAIAcgBU8NACAHQQN0IQogCEEEaiEGIA0hBCAHIQMDQCAEIQkgAiADQQN0IgNqIgQgACADaikCACISNwIAAkAgCCgCACoCACITIBKnIgu+IhWUIAYoAgAqAgAiFCASQiCIpyIOviIWlJIgBEF4aioCACATlCAEQXxqKgIAIBSUkl1FDQAgCiEEAkADQCACIARqIgMgA0F4aikCADcCAAJAIARBCEcNACACIQQMAgsgBEF4aiEEIAgoAgAqAgAiEyAVlCAGKAIAKgIAIhQgFpSSIANBcGoqAgAgE5QgA0F0aioCACAUlJJdDQALIAIgBGohBAsgBCAONgIEIAQgCzYCAAsgCkEIaiEKIAkgCSAFSSILaiEEIAkhAyALDQALCyACIAVBA3QiBGohCgJAIAcgEE8NACAAIARqIREgB0EDdCEJIAhBBGohC0EIIQ8gCiEMA0AgDSEOIAogB0EDdCIDaiIEIBEgA2opAgAiEjcCAAJAIAgoAgAqAgAiEyASpyIHviIVlCALKAIAKgIAIhQgEkIgiKciDb4iFpSSIARBeGoqAgAgE5QgBEF8aioCACAUlJJdRQ0AIA8hBiAMIQMCQANAIAMgCWoiBCAEQXhqKQIANwIAAkAgCSAGRw0AIAohBAwCCyAGQQhqIQYgA0F4aiEDIAgoAgAqAgAiEyAVlCALKAIAKgIAIhQgFpSSIARBcGoqAgAgE5QgBEF0aioCACAUlJJdDQALIAMgCWohBAsgBCANNgIEIAQgBzYCAAsgD0F4aiEPIAxBCGohDCAOIA4gEEkiBGohDSAOIQcgBA0ACwsgCkF4aiEEIAAgAUEDdEF4aiIDaiEGIAIgA2ohAyAIQQRqKAIAKgIAIRMgCCgCACoCACEUA0AgACAKIAIgFCAKKgIAlCATIApBBGoqAgCUkiAUIAIqAgCUIBMgAkEEaioCAJSSXSIIGykCADcCACAGIAQgAyAUIAMqAgCUIBMgA0EEaioCAJSSIBQgBCoCAJQgEyAEQQRqKgIAlJJdIgkbKQIANwIAIARBeEEAIAkbaiEEIANBAEF4IAkbaiEDIAogCEEDdGohCiACIAhBAXNBA3RqIQIgBkF4aiEGIABBCGohACAFQX9qIgUNAAsgBEEIaiEEAkAgAUEBcUUNACAAIAIgCiACIARJIgYbKQIANwIAIAogAiAET0EDdGohCiACIAZBA3RqIQILIAIgBEcNASAKIANBCGpHDQELDwsQpwEAC/oOAhF/A30jAEHQAGsiCSQAIAlBCGogBkM1+o48lCIaEE8gCSgCJCIKIAQgBGwgAyADbGqzkSIbIBuSIAWV/AFBAWoiC2wiDEECdCENQQAhDgJAAkACQAJAAkACQCAMQf////8DSw0AIA1B/P///wdLDQACQAJAIA0NAEEEIQ9BACEQDAELEPwBQQQhDiANQQQQ7gEiD0UNASAMIRALAkAgBEUNACADRQ0AIANBAEchEQJAIAkoAhwiDSAJKAIQIg4gDSAOSRsiEkUNACAJKAIYIRMgCSgCDCEUQQAhDUEBIQ4DQCAOIRUgDSADbCEWIA2zIRwgESEXQQEhGEEAIRkDQCAZIBZqIg4gAk8NBiAYIQ0CQCABIA5qLQAARQ0AIBmzIQZBACEZIBMhDSAUIQ4DQAJAIBsgDSoCACAGlCAOKgIAIByUkpIgBZX8ASIYIAtPDQAgGSAYIApsaiIYIAxPDQggDyAYQQJ0aiIYIBgoAgBBAWo2AgALIA1BBGohDSAOQQRqIQ4gEiAZQQFqIhlHDQALIBchDQsgDUEBaiIXIRggDSEZIA0gA0kNAAsgFSAVIARJIhlqIQ4gFSENIBkNAAwCCwtBACENQQEhDgNAIA4hFyANIANsIRIgESEZQQEhGEEAIQ0DQCANIBJqIg4gAk8NBSAZIBggASAOai0AABsiDUEBaiIZIRggDSADSQ0ACyAXIBcgBEkiGWohDiAXIQ0gGQ0ACwsgCUEANgIwIAlCgICAgMAANwIoAkAgC0UNACAKRQ0AIApBAnQhFEEAIQMgDyETQQAhGSAKIRdBASENQQAhFgNAIBYhDiANIRYCQAJAIBcNAEEAIRcMAQsgBSAOs5QgG5MhHEEAIQ0gEyEOA0ACQAJAIAMgDWoiGCAMTw0AIA4oAgAiGCAHSQ0BIBogDbOUIQYCQCAZIAkoAihHDQAgCUEoakHsiMAAEHcLIAkoAiwgGUEMbGoiEiAYNgIIIBIgBjgCBCASIBw4AgAgCSAZQQFqIhk2AjAMAQsgGCAMQdyIwAAQkgEACyAOQQRqIQ4gFyANQQFqIg1HDQALIAohFwsgEyAUaiETIAMgCmohAyAWIBYgC0lqIQ0gFiALSQ0ACyAJKAIsIQ0gCSAJQc8AajYCQCAZQQJJDQACQCAZQRVJDQAgDSAZIAlBwABqEHUMAQsgDSAZQQEgCUHAAGoQZgsgCUEANgI8IAlCgICAgMAANwI0IAkoAjAiDUUNBCAaQwAAIEGUIRogBUMAAKBBlCEcIAkoAiwiCyANQQxsaiEKIAtBDGohDUEAIRIDQCALIRkgDSELIBJBDGwhDiAJKAI4IgwhDQJAAkADQCAORQ0BIA5BdGohDiANKgIAIQYgGSoCACEFIBkqAgQgDSoCBJOLIhtD2w9JQCAbkxDeASEbIA1BDGoiGCENIAUgBpOLIBxdRQ0AIBghDSAbIBpdRQ0ADAILCyAJQcAAakEIaiINIBlBCGooAgA2AgAgCSAZKQIANwNAAkAgEiAJKAI0Rw0AIAlBNGpBjIjAABB3IAkoAjghDAsgDCASQQxsaiIOIAkpA0A3AgAgDkEIaiANKAIANgIAIAkgEkEBaiISNgI8IBIgCE8NBQsgC0EAQQwgCyAKRiIOG2ohDSAORQ0ADAQLCyAOIA1B/IfAABDdAQALIBggDEGMicAAEJIBAAsgDiACQfyIwAAQkgEACyASRQ0AEPwBAkAgEkEMbCINQQQQ7QEiGUUNACASQQNsIRggCSgCPCEODAILQQQgDUGciMAAEN0BAAtBBCEZQQAhGEEAIQ4LQQAhDSAJQQA2AkggCSAZNgJEIAkgGDYCQCAJKAI4IRIgCSgCNCEKAkAgDkUNACASIA5BDGxqIQxBACENQQAhGQNAIBIgDWoiDioCACEGIA5BCGooAgAhCyAOQQRqKgIAIQUCQCAZIhggCSgCQEcNACAJQcAAakGsiMAAEG8LIAkoAkQgDWogBjgCACAJIBhBAWoiGTYCSAJAIBkgCSgCQEcNACAJQcAAakG8iMAAEG8LIAkoAkQgDWpBBGogBTgCACAJIBlBAWoiGTYCSCALsyEGAkAgGSAJKAJARw0AIAlBwABqQcyIwAAQbwsgCSgCRCANakEIaiAGOAIAIAkgGUEBaiIZNgJIIA1BDGohDSAOQQxqIAxHDQALIBhBA2ohDQsCQCAKRQ0AIBIgCkEMbEEEEOsBIAkoAkghDQsgCSgCRCEZIAkoAkAhDgJAIAkoAigiGEUNACAJKAIsIBhBDGxBBBDrAQsCQCAQRQ0AIA8gEEECdEEEEOsBCwJAIAkoAggiGEUNACAJKAIMIBhBAnRBBBDrAQsCQCAJKAIUIhhFDQAgCSgCGCAYQQJ0QQQQ6wELAkAgAkUNACABIAJBARDrAQsCQAJAAkAgDiANSw0AIBkhDgwBCyAOQQJ0IRgCQCANDQBBBCEOIBkgGEEEEOsBDAELIBkgGEEEIA1BAnQiCxDoASIORQ0BCyAAIA02AgQgACAONgIAIAlB0ABqJAAPC0EEIAtBjJDAABDdAQALgQ4BGn8gBSAEbCEGQQEhByAFQQFqIARsIQggBUF/aiAEbCEJAkAgBEEGSQ0AQQAhB0EAIARBe2oiBSAFIARLGyEKIAAgBmohCyAAIAhqIQwgACAJaiENIAZBAXRBCWohBSACIAZBAnRqIQ4CQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkADQAJAAkACQAJAAkACQAJAAkACQCAJIAdqIg8gAU8NACAPQQFqIAFPDQEgD0ECaiABTw0CIAYgB2oiECABTw0ZIAYgB2oiEUECaiABTw0DIAggB2oiEiABTw0EIBJBAWogAU8NBSASQQJqIAFPDQYgBUF5aiADTw0HIA0gB2oiE0EBaiIULQAAIRUgDkEEaiALIAdqIhZBAmoiFy0AACAWLQAAa0EBdCATQQJqIhgtAAAiGWogEy0AACIaIAwgB2oiGy0AACIcamsgG0ECaiIdLQAAIh5qOwEAIAVBemogA0kNCCAFQXpqIQUMCwsgDyABQai0wAAQkgEACyAPQQFqIAFBuLTAABCSAQALIA9BAmohAwwaCyARQQJqIQMMEwsgEiABQfi0wAAQkgEACyASQQFqIAFBiLXAABCSAQALIBJBAmohAwwMCyAFQXlqIQEMBwsgDkEGaiAVQf7/A2wgGiAZamsgHGogHmogG0EBaiIVLQAAQQF0ajsBACAPQQNqIAFPDRMgEEEBaiABTw0PIBFBA2ogAU8NDSASQQNqIAFPDQkgBUF7aiADTw0FIBgtAAAhGSAOQQhqIBNBA2oiEC0AACIaIBQtAAAiHCAVLQAAIh5qayAWQQNqIh8tAAAgFkEBai0AAGtBAXRqIBtBA2oiFS0AACIUajsBAAJAIAVBfGogA08NACAOQQpqIBlB/v8DbCAcIBpqayAeaiAUaiAdLQAAQQF0ajsBACAPQQRqIAFPDRMgEUEEaiABTw0NIBJBBGogAU8NCSAFQX1qIANPDQUgEC0AACEZIA5BDGogE0EEaiIeLQAAIhogGC0AACIYIB0tAAAiHWprIBZBBGotAAAgFy0AAGtBAXRqIBtBBGoiFC0AACIcajsBACAFQX5qIANPDQIgDkEOaiAZQf7/A2wgGCAaamsgHWogHGogFS0AAEEBdGo7AQAgD0EFaiABTw0SIBFBBWogAU8NDCASQQVqIAFPDQggBUF/aiADTw0EIB4tAAAhDyAOQRBqIhIgE0EFai0AACITIBAtAAAiESAVLQAAIhhqayAWQQVqLQAAIB8tAABrQQF0aiAbQQVqLQAAIhtqOwEAIAUgA08NAyAOQRJqIA9B/v8DbCARIBNqayAYaiAbaiAULQAAQQF0ajsBACAFQQhqIQUgB0EFaiEPIBIhDiAHQQRqIhIhByAPIApLDRYMAQsLIAVBfGohBQwBCyAFQX5qIQULIAUgA0G4tcAAEJIBAAsgBUF/aiEBDAILIAVBfWohAQwBCyAFQXtqIQELIAEgA0GotcAAEJIBAAsgEkEFaiEDDAILIBJBBGohAwwBCyASQQNqIQMLIAMgAUGYtcAAEJIBAAsgEUEFaiEDDAILIBFBBGohAwwBCyARQQNqIQMLIAMgAUHotMAAEJIBAAsgEUEBaiEQCyAQIAFB2LTAABCSAQALIA9BBWohAwwCCyAPQQRqIQMMAQsgD0EDaiEDCyADIAFByLTAABCSAQALIBJBAWohBwsCQAJAAkACQAJAAkACQAJAAkACQAJAIAcgBEF/aiIYTw0AIAAgCWohHSAAIAZqIRAgByAGaiIOQQF0IQUgCCAAakF/aiEVIAIgDkECdGohDgNAIAkgB2oiD0F/aiABTw0DIA8gAU8NBCAPQQFqIAFPDQUgBiAHaiIPQX9qIAFPDQYgD0EBaiABTw0HIAggB2oiD0F/aiABTw0IIA8gAU8NCSAPQQFqIAFPDQogBSADTw0LIB0gB2oiDy0AACETIA4gECAHaiISQQFqLQAAIBJBf2otAABrQQF0IA9BAWotAAAiEmogD0F/ai0AACIbIBUgB2oiDy0AACIWamsgD0ECai0AACIRajsBACAFQQFqIANPDQIgDkECaiATQf7/A2wgGyASamsgFmogEWogD0EBai0AAEEBdGo7AQAgDkEEaiEOIAVBAmohBSAYIAdBAWoiB0cNAAsLDwsgBUEBaiADQZi0wAAQkgEACyAPQX9qIAFBiLPAABCSAQALIA8gAUGYs8AAEJIBAAsgD0EBaiABQaizwAAQkgEACyAPQX9qIAFBuLPAABCSAQALIA9BAWogAUHIs8AAEJIBAAsgD0F/aiABQdizwAAQkgEACyAPIAFB6LPAABCSAQALIA9BAWogAUH4s8AAEJIBAAsgBSADQYi0wAAQkgEAC8UNAg5/A30jAEEgayIHJAACQAJAIAFBIU8NACAAIAEgAiADIAYQKAwBCyACQXxqIQgCQAJAAkADQAJAIAQNACAAIAEgAiADQQEgBhAdDAULIAAgAUEDdiIJQRxsaiEKIAAgCUEEdGohCwJAAkAgAUHAAEkNACAAIAsgCiAJIAYQiQEhDAwBCyAAIAogCyAAKgIAIhUgCyoCACIWXSIJIBYgCioCACIXXXMbIAkgFSAXXXMbIQwLIARBf2ohBCAHIAwqAgAiFTgCBCAMIABrQQJ2IQ0CQAJAAkAgBUUNACAFKgIAIBVdRQ0BCyADIAFJDQNBACELIAAhCSACIAFBAnQiDmoiDyEKIA0hEANAAkAgCSAAQQAgEEF9aiIRIBEgEEsbQQJ0aiISTw0AIAwqAgAhFQNAIAIgCkF8aiAJKgIAIhYgFV0iERsgC0ECdGogFjgCACACIApBeGogCUEEaioCACIWIBVdIhMbIAsgEWoiC0ECdGogFjgCACACIApBdGogCUEIaioCACIWIBVdIhEbIAsgE2oiC0ECdGogFjgCACACIApBcGoiCiAJQQxqKgIAIhYgFV0iExsgCyARaiILQQJ0aiAWOAIAIAsgE2ohCyAJQRBqIgkgEkkNAAsLAkAgCSAAIBBBAnRqIhNPDQAgDCoCACEWA0AgAiAKQXxqIgogCSoCACIVIBZdIhEbIAtBAnRqIBU4AgAgCyARaiELIAlBBGoiCSATSQ0ACwsCQCAQIAFGDQAgCkF8aiIKIAtBAnRqIAkoAgA2AgAgCUEEaiEJIAEhEAwBCwsCQCALQQJ0IhBFDQAgACACIBD8CgAACyABIAtrIRQCQCABIAtGDQAgFEEDcSETQQAhCgJAIAsgAWtBfEsNACAAIBBqIQkgFEF8cSESIAggDmohEUEAIQoDQCAJIBEoAgA2AgAgCUEEaiAPIApB/v///wNzQQJ0aigCADYCACAJQQhqIA8gCkH9////A3NBAnRqKAIANgIAIAlBDGogDyAKQfz///8Dc0ECdGooAgA2AgAgEUFwaiERIAlBEGohCSASIApBBGoiCkcNAAsLIBNFDQAgCCAOIApBAnQiCmtqIQkgACAKaiAQaiEKA0AgCiAJKAIANgIAIAlBfGohCSAKQQRqIQogE0F/aiITDQALCyALRQ0AIAsgAU0NASAHQQA2AhggB0EBNgIMIAdBxIfAADYCCCAHQgQ3AhAgB0EIakHMh8AAEMsBAAsgAyABSQ0CQQAhCyAAIQkgAiABQQJ0IhRqIhAhCgNAAkAgCSAAQQAgDUF9aiIRIBEgDUsbQQJ0aiISTw0AIAwqAgAhFQNAIApBfGogAiAVIAkqAgAiFl0iERsgC0ECdGogFjgCACAKQXhqIAIgFSAJQQRqKgIAIhZdIhMbIAsgEUEBc2oiC0ECdGogFjgCACAKQXRqIAIgFSAJQQhqKgIAIhZdIhEbIAsgE0EBc2oiC0ECdGogFjgCACAKQXBqIgogAiAVIAlBDGoqAgAiFl0iExsgCyARQQFzaiILQQJ0aiAWOAIAIAsgE0EBc2ohCyAJQRBqIgkgEkkNAAsLAkAgCSAAIA1BAnRqIhNPDQAgDCoCACEWA0AgCkF8aiIKIAIgFiAJKgIAIhVdIhEbIAtBAnRqIBU4AgAgCyARQQFzaiELIAlBBGoiCSATSQ0ACwsCQCANIAFGDQAgAiALQQJ0aiAJKAIANgIAIAlBBGohCSALQQFqIQsgCkF8aiEKIAEhDQwBCwsCQCALQQJ0Ig9FDQAgACACIA/8CgAACyABIAtGDQMgASALayIMQQNxIRMgACAPaiENQQAhCgJAIAsgAWtBfEsNACAMQXxxIRIgCCAUaiERQQAhCiANIQkDQCAJIBEoAgA2AgAgCUEEaiAQIApB/v///wNzQQJ0aigCADYCACAJQQhqIBAgCkH9////A3NBAnRqKAIANgIAIAlBDGogECAKQfz///8Dc0ECdGooAgA2AgAgEUFwaiERIAlBEGohCSASIApBBGoiCkcNAAsLAkAgE0UNACAIIApBAnQiCmsgFGohCSAAIApqIA9qIQoDQCAKIAkoAgA2AgAgCUF8aiEJIApBBGohCiATQX9qIhMNAAsLIAsgAUsNBEEAIQUgDSEAIAwhASAMQSFPDQEgDSAMIAIgAyAGECgMBQsgACAQaiAUIAIgAyAEIAdBBGogBhASIAshASALQSFPDQALIAAgCyACIAMgBhAoDAMLAAsgACABQQJ0akEAIAIgAyAGECgMAQsgCyABIAFB3IfAABCeAQALIAdBIGokAAvFDAMSfwJ+Bn0jAEHQAmsiBiQAAkAgAUECSQ0AQoCAgICAgICAwAAgAa0iGIAiGSAYfkKAgICAgICAgMAAUq0hGAJAAkAgAUGBIEkNACABEKkBIQcMAQsgASABQQF2ayIIQcAAIAhBwABJGyEHCyAZIBh8IRkgAEF4aiEJIABBFGohCkEBIQhBACELQQAhDANAQQEhDUEAIQ4CQCABIAtNDQAgACALQQN0Ig9qIQ4CQAJAIAEgC2siECAHSQ0AAkACQCAQQQJPDQAgECERDAELAkACQAJAAkAgDioCCCIaIAUoAgAiESgCACoCACIblCAOQQxqKgIAIhwgEUEEaigCACoCACIdlJIgDioCACAblCAOQQRqKgIAIB2Ukl0iEg0AQQIhESAQQQJGDQQgCiAPaiETQQIhEQNAIBsgGpQhHiAdIByUIR8gGyATQXxqKgIAIhqUIB0gEyoCACIclJIgHyAekl0NAyATQQhqIRMgECARQQFqIhFHDQAMAgsLQQIhEUEBIRMgEEECRg0CIAogD2ohE0ECIREDQCAbIBqUIR4gHSAclCEfIBsgE0F8aioCACIalCAdIBMqAgAiHJSSIB8gHpJdRQ0CIBNBCGohEyAQIBFBAWoiEUcNAAsLIBAhEQsgESAHSQ0CIBJFDQECQCARQQJPDQBBASERDAILIBFBAXYhEwsgE0EBcSEUIA4gEUEDdCISaiENQQAhEAJAIBNBAUYNACATQf7///8HcSEVIAAgEmohE0EAIRAgACESA0AgEyAPakF4aiIWKQIAIRggFiASIA9qIhcpAgA3AgAgFyAYNwIAIBdBCGoiFykCACEYIBcgDSAQQf7///8Bc0EDdGoiFikCADcCACAWIBg3AgAgE0FwaiETIBJBEGohEiAVIBBBAmoiEEcNAAsLIBRFDQAgDiAQQQN0aiITKQIAIRggEyANIBBBf3NBA3RqIhApAgA3AgAgECAYNwIACyARQQF0QQFyIQ0MAQsCQCAEDQAgECAHIBAgB0kbQQF0IQ0MAQsgDiAQQSAgEEEgSRsiESACIANBAEEAIAUQCSARQQF0QQFyIQ0LIA1BAXYgC2qtIAutIhh8IBl+IAsgCEEBdmutIBh8IBl+hXmnIQ4LAkACQCAMQQJJDQAgCSALQQN0IhFqIRUgACARaiEWA0AgBkGOAmogDEF/aiIXai0AACAOSQ0BAkACQAJAAkACQCAGQQRqIBdBAnRqKAIAIgxBAXYiEyAIQQF2IhJqIg8gA0sNACAMIAhyQQFxRQ0BCyAAIAsgD2tBA3RqIRAgDEEBcUUNAQwCCyAPQQF0IQgMAgsgECATIAIgAyATQQFyZ0EBdEE+c0EAIAUQCQsCQCAIQQFxDQAgECATQQN0aiASIAIgAyASQQFyZ0EBdEE+c0EAIAUQCQsCQCAIQQJJDQAgDEECSQ0AIAMgEiATIBIgE0kiERsiDEkNACAQIBNBA3RqIQgCQCAMQQN0IgxFDQAgAiAIIBAgERsgDPwKAAALIAIgDGohESAFKAIAIQwCQAJAAkAgEiATTw0AIAxBBGooAgAqAgAhGyAMKAIAKgIAIR0gFSEMA0AgDCAIQXhqIhMgEUF4aiISIB0gEioCAJQgGyARQXxqKgIAlJIgHSATKgIAlCAbIAhBfGoqAgCUkl0iCBspAgA3AgAgEiAIQQN0aiERIBMgCEEBc0EDdGoiCCAQRg0CIAxBeGohDCARIAJHDQAMAgsLIAxBBGooAgAqAgAhGyAMKAIAKgIAIR0gAiEMA0AgECAIIAwgHSAIKgIAlCAbIAhBBGoqAgCUkiAdIAwqAgCUIBsgDEEEaioCAJSSXSITGykCADcCACAQQQhqIRAgDCATQQFzQQN0aiIMIBFGDQIgCCATQQN0aiIIIBZHDQAMAgsLIAghECACIQwLIBEgDGsiCEUNACAQIAwgCPwKAAALIA9BAXRBAXIhCAtBASERIBchDCAXQQFLDQAMAgsLIAwhEQsgBkGOAmogEWogDjoAACAGQQRqIBFBAnRqIAg2AgACQCABIAtNDQAgEUEBaiEMIA1BAXYgC2ohCyANIQgMAQsLIAhBAXENACAAIAEgAiADIAFBAXJnQQF0QT5zQQAgBRAJCyAGQdACaiQAC6QOAgR/H30CQAJAAkACQAJAIAJBCEYNABD8AUEcQQQQ7gEiAw0BQQRBHEHsqsAAEN0BAAtBAUF/IAEqAggiByABKgIAIgiTIgkgASoCFCIKIAEqAgwiC5MiDJQgCyABKgIEIg2TIg4gASoCECIPIAeTIhCUkyIRQwAAAABeGyEDIBGLQ703hjVeIQQCQAJAAkAgECABKgIcIhIgCpMiE5QgDCABKgIYIhQgD5MiFZSTIhGLQ703hjVeDQAgA0EAIAQbIQMMAQtBAUF/IBFDAAAAAF4bIQUCQCAEDQAgBSEDDAELQwAAAAAhFiADIAVHDQELAkAgFSANIBKTIhGUIAggFJMiFyATlJMiGItDvTeGNV5FDQBDAAAAACEWQQFBfyAYQwAAAABeGyEEAkAgAw0AIAQhAwwBCyADIARHDQELAkAgDiAXlCAJIBGUkyIRi0O9N4Y1XkUNACADRQ0AQwAAAAAhFiADQQFBfyARQwAAAABeG0cNAQtDAACAPyEWCyAUIAiTIhggGJQgEiANkyIZIBmUkpEhEUPbD0k/IRpD2w9JPyEbAkAgCSAJlCAOIA6UkpEiHEO9N4Y1XkUNAEPbD0k/IRsgEUO9N4Y1XkUNAEMAAIA/QwAAgL8gCSAYlCAOIBmUkiAcIBGUlSIXIBdDAACAv10bIhcgF0MAAIA/XhsQ+QFD2w/Jv5KLIRsLIBAgEJQgDCAMlJKRIRcCQCAIIAeTIh0gHZQgDSALkyIeIB6UkpEiH0O9N4Y1XkUNACAXQ703hjVeRQ0AQwAAgD9DAACAvyAdIBCUIB4gDJSSIB8gF5SVIh0gHUMAAIC/XRsiHSAdQwAAgD9eGxD5AUPbD8m/koshGgtD2w9JPyEgQ9sPST8hHgJAIAcgD5MiHSAdlCALIAqTIgsgC5SSkSIHQ703hjVeRQ0AQ9sPST8hHiAVIBWUIBMgE5SSkSIfQ703hjVeRQ0AQwAAgD9DAACAvyAdIBWUIAsgE5SSIAcgH5SVIgcgB0MAAIC/XRsiByAHQwAAgD9eGxD5AUPbD8m/koshHgsCQCAPIBSTIh8gH5QgCiASkyIhICGUkpEiB0O9N4Y1XkUNACAIIBSTIhQgFJQgDSASkyISIBKUkpEiIkO9N4Y1XkUNAEMAAIA/QwAAgL8gHyAUlCAhIBKUkiAHICKUlSISIBJDAACAv10bIhIgEkMAAIA/XhsQ+QFD2w/Jv5KLISALQwAAAAAhEkMAAAAAIRQCQCAcQ703hjVeRQ0AIA4gHJUhEiAJIByVIRQLQwAAAAAhIkMAAAAAISMCQCAHQ703hjVeRQ0AICEgB5UhIiAfIAeVISMLQwAAAAAhH0MAAAAAISFDAAAAACEkAkAgEUO9N4Y1XkUNACAZIBGVISEgGCARlSEkC0MAAAAAISUCQCAXQ703hjVeRQ0AIAwgF5UhHyAQIBeVISULQwAAgD8hDAJAIBcgEZJDAAAAP5QiEUO9N4Y1XkUNACAcIAeSQwAAAD+UIBGVIQwLQwAAgD9DAAAAAEMAAIA/QwAAgD8gDJUgDCAMQwAAgD9dGyIRQ/T9tL+Si0OamZk+lZMiFyAXQwAAAABdGyIXIBdDAACAP14bQwAAgD9DAAAAAEMAAIA/IBFDy6Glv5KLQ5qZmT6VkyIXIBdDAAAAAF0bIhcgF0MAAIA/XhsQ4AEhF0PNzEw+IRACQCAJIBmUIA4gGJReIB0gE5QgCyAVlF5GDQBDAAAAAEPNzEw+IA4gDyAIkyIIlCAJIAogDZMiDpReIAggGZQgDiAYlF5zGyEQCxD8AUEcQQQQ7QEiA0UNAyADQ5qZmT4gF0MAAIA/QwAAAABDAACAPyARQ4/Ctb+Si0OamZk+lZMiCSAJQwAAAABdGyIJIAlDAACAP14bIg5DAACAP0MAAAAAQwAAgD8gEUMMAsu/kotDmpmZPpWTIgkgCUMAAAAAXRsiCSAJQwAAgD9eGyIJQwAAAAAgCUMAAAAAXhsiCCAOIAheIgQbIg4gFyAOXiIFGyIOIA5DmpmZPl0gEUMAAEBAXXEgEUMAAAA/XnEiBhs4AhQgAyAMOAIQIAMgEiAilCAUICOUkosgISAflCAkICWUkouSQwAAAD+UIg44AgwgA0MAAIA/QwAAAAAgGyAakiAekiAgkkMAAIC+lEPbD0k/lUMAAIA/kiIRIBFDAAAAAF0bIhEgEUMAAIA/XhsiETgCCCADIBY4AgQgA0MAAAAAQwAAQEBDAAAAQEMAAIA/QwAAAAAgCUMAAAAAXhsgBBsgBRsgBhs4AhggA0MAAIA/QwAAAAAgFkPNzEw+lCARQ5qZmT6UkiAOQ5qZmT6UkiAQkiIJIAlDAAAAAF0bIgkgCUMAAIA/Xhs4AgAMAQsgAkUNAQsgASACQQJ0QQQQ6wELIABBBzYCBCAAIAM2AgAPC0EEQRwQ8QEAC78MAg5/AX4CQAJAIAFBAkkNAAJAAkACQCADIAFBEGpJDQAgAUEBdiEFIAFBD0sNAQJAIAFBB00NACACIABBJEEYIABBIGooAgAgAEEsaigCAEkiBhtqIgMgACAAQQhqKAIAIgcgAEEUaigCACIISUEMbGoiCSAJQQhqKAIAIANBCGooAgBJIgobIgspAgA3AgAgAkEIaiALQQhqKAIANgIAIAIgAEEYQSQgBhtqIgsgACAHIAhPQQxsaiIGIAMgChsgBkEIaigCACALQQhqKAIASSIHGyIIIAkgAyAGIAcbIAobIgMgA0EIaigCACAIQQhqKAIASSIJGyIKKQIANwIMIAJBFGogCkEIaigCADYCACACQSBqIAMgCCAJGyIDQQhqKAIANgIAIAIgAykCADcCGCACQSxqIAYgCyAHGyIDQQhqKAIANgIAIAIgAykCADcCJCAAIAVBDGwiDGoiA0EYQSQgA0EgaigCACADQSxqKAIASSIJG2oiCiADIANBCGooAgAiCyADQRRqKAIAIgdPQQxsaiIGIANBJEEYIAkbaiIJIAMgCyAHSUEMbGoiC0EIaigCACAJQQhqKAIASSIHGyAGQQhqKAIAIApBCGooAgBJIggbIg1BCGooAgAhDiALIAkgBiAIGyAHGyIPQQhqKAIAIRAgAiAMaiIDQQhqIAkgCyAHGyIJQQhqKAIANgIAIAMgCSkCADcCACADIA0gDyAQIA5JIgkbIgspAgA3AgwgA0EUaiALQQhqKAIANgIAIANBIGogDyANIAkbIglBCGooAgA2AgAgAyAJKQIANwIYIANBLGogBiAKIAgbIgZBCGooAgA2AgAgAyAGKQIANwIkQQQhDgwDCyACIAApAgA3AgAgAkEIaiAAQQhqKAIANgIAIAIgBUEMbCIDaiIGIAAgA2oiAykCADcCACAGQQhqIANBCGooAgA2AgBBASEODAILAAsgACACIAIgAUEMbGoiAxAlIAAgBUEMbCIGaiACIAZqIANB4ABqECVBCCEOCyAOQQFqIRAgASAFayERAkAgDiAFTw0AIA5BDGwhByAQIQMgDiEGA0AgAyELIAIgBkEMbCIGaiIDIAAgBmoiBikCADcCACADQQhqIAZBCGooAgAiCjYCAAJAIANBfGooAgAgCk8NACADKQIAIRMgByEGAkADQCACIAZqIgMgA0F0aiIJKQIANwIAIANBCGogCUEIaigCADYCAAJAIAZBDEcNACACIQYMAgsgBkF0aiEGIANBcGooAgAgCkkNAAsgAiAGaiEGCyAGIBM3AgAgA0F8aiAKNgIACyAHQQxqIQcgCyALIAVJIglqIQMgCyEGIAkNAAsLIAIgBUEMbCIDaiEIAkAgDiARTw0AIAAgA2ohEiAOQQxsIQpBDCEPIAghDANAIBAhDSAIIA5BDGwiBmoiAyASIAZqIgYpAgA3AgAgA0EIaiAGQQhqKAIAIgc2AgACQCADQXxqKAIAIAdPDQAgAykCACETIA8hCSAMIQYCQANAIAYgCmoiAyADQXRqIgspAgA3AgAgA0EIaiALQQhqKAIANgIAAkAgCiAJRw0AIAghBgwCCyAJQQxqIQkgBkF0aiEGIANBcGooAgAgB0kNAAsgBiAKaiEGCyAGIBM3AgAgA0F8aiAHNgIACyAPQXRqIQ8gDEEMaiEMIA0gDSARSSIDaiEQIA0hDiADDQALCyAIQXRqIQMgAiABQQxsQXRqIglqIQYgACAJaiEJA0AgACAIIAIgAkEIaigCACIKIAhBCGooAgAiC0kiBxsiDSkCADcCACAAQQhqIA1BCGooAgA2AgAgCSADIAYgA0EIaigCACINIAZBCGooAgAiD0kiDBsiDikCADcCACAJQQhqIA5BCGooAgA2AgAgA0F0QQAgDBtqIQMgBkF0QQAgDSAPTxtqIQYgAiAKIAtPQQxsaiECIAggB0EMbGohCCAJQXRqIQkgAEEMaiEAIAVBf2oiBQ0ACyADQQxqIQMCQCABQQFxRQ0AIAAgAiAIIAIgA0kiCRsiCikCADcCACAAQQhqIApBCGooAgA2AgAgCCACIANPQQxsaiEIIAIgCUEMbGohAgsgAiADRw0BIAggBkEMakcNAQsPCxCnAQALvwwCDn8BfgJAAkAgAUECSQ0AAkACQAJAIAMgAUEQakkNACABQQF2IQUgAUEPSw0BAkAgAUEHTQ0AIAIgAEEkQRggAEEgaigCACAAQSxqKAIASSIGG2oiAyAAIABBCGooAgAiByAAQRRqKAIAIghJQQxsaiIJIAlBCGooAgAgA0EIaigCAEkiChsiCykCADcCACACQQhqIAtBCGooAgA2AgAgAiAAQRhBJCAGG2oiCyAAIAcgCE9BDGxqIgYgAyAKGyAGQQhqKAIAIAtBCGooAgBJIgcbIgggCSADIAYgBxsgChsiAyADQQhqKAIAIAhBCGooAgBJIgkbIgopAgA3AgwgAkEUaiAKQQhqKAIANgIAIAJBIGogAyAIIAkbIgNBCGooAgA2AgAgAiADKQIANwIYIAJBLGogBiALIAcbIgNBCGooAgA2AgAgAiADKQIANwIkIAAgBUEMbCIMaiIDQRhBJCADQSBqKAIAIANBLGooAgBJIgkbaiIKIAMgA0EIaigCACILIANBFGooAgAiB09BDGxqIgYgA0EkQRggCRtqIgkgAyALIAdJQQxsaiILQQhqKAIAIAlBCGooAgBJIgcbIAZBCGooAgAgCkEIaigCAEkiCBsiDUEIaigCACEOIAsgCSAGIAgbIAcbIg9BCGooAgAhECACIAxqIgNBCGogCSALIAcbIglBCGooAgA2AgAgAyAJKQIANwIAIAMgDSAPIBAgDkkiCRsiCykCADcCDCADQRRqIAtBCGooAgA2AgAgA0EgaiAPIA0gCRsiCUEIaigCADYCACADIAkpAgA3AhggA0EsaiAGIAogCBsiBkEIaigCADYCACADIAYpAgA3AiRBBCEODAMLIAIgACkCADcCACACQQhqIABBCGooAgA2AgAgAiAFQQxsIgNqIgYgACADaiIDKQIANwIAIAZBCGogA0EIaigCADYCAEEBIQ4MAgsACyAAIAIgAiABQQxsaiIDECYgACAFQQxsIgZqIAIgBmogA0HgAGoQJkEIIQ4LIA5BAWohECABIAVrIRECQCAOIAVPDQAgDkEMbCEHIBAhAyAOIQYDQCADIQsgAiAGQQxsIgZqIgMgACAGaiIGKQIANwIAIANBCGogBkEIaigCACIKNgIAAkAgA0F8aigCACAKTw0AIAMpAgAhEyAHIQYCQANAIAIgBmoiAyADQXRqIgkpAgA3AgAgA0EIaiAJQQhqKAIANgIAAkAgBkEMRw0AIAIhBgwCCyAGQXRqIQYgA0FwaigCACAKSQ0ACyACIAZqIQYLIAYgEzcCACADQXxqIAo2AgALIAdBDGohByALIAsgBUkiCWohAyALIQYgCQ0ACwsgAiAFQQxsIgNqIQgCQCAOIBFPDQAgACADaiESIA5BDGwhCkEMIQ8gCCEMA0AgECENIAggDkEMbCIGaiIDIBIgBmoiBikCADcCACADQQhqIAZBCGooAgAiBzYCAAJAIANBfGooAgAgB08NACADKQIAIRMgDyEJIAwhBgJAA0AgBiAKaiIDIANBdGoiCykCADcCACADQQhqIAtBCGooAgA2AgACQCAKIAlHDQAgCCEGDAILIAlBDGohCSAGQXRqIQYgA0FwaigCACAHSQ0ACyAGIApqIQYLIAYgEzcCACADQXxqIAc2AgALIA9BdGohDyAMQQxqIQwgDSANIBFJIgNqIRAgDSEOIAMNAAsLIAhBdGohAyACIAFBDGxBdGoiCWohBiAAIAlqIQkDQCAAIAggAiACQQhqKAIAIgogCEEIaigCACILSSIHGyINKQIANwIAIABBCGogDUEIaigCADYCACAJIAMgBiADQQhqKAIAIg0gBkEIaigCACIPSSIMGyIOKQIANwIAIAlBCGogDkEIaigCADYCACADQXRBACAMG2ohAyAGQXRBACANIA9PG2ohBiACIAogC09BDGxqIQIgCCAHQQxsaiEIIAlBdGohCSAAQQxqIQAgBUF/aiIFDQALIANBDGohAwJAIAFBAXFFDQAgACACIAggAiADSSIJGyIKKQIANwIAIABBCGogCkEIaigCADYCACAIIAIgA09BDGxqIQggAiAJQQxsaiECCyACIANHDQEgCCAGQQxqRw0BCw8LEKcBAAvjDQEOfyMAQdAAayIMJAAgDEEIaiAB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IgkgBCgCACIESSILGyIKKQIANwJUIAFB3ABqIApBCGooAgA2AgAgASAHIABBDGxqIgAgAiAGIAhPQQxsaiICIAJBCGooAgAiBiAAQQhqKAIAIghJIgobIgcpAgA3AgwgAUEUaiAHQQhqKAIANgIAIAEgBUF0QQAgCxtqIgcgA0F0QQAgCSAETxtqIgMgB0EIaigCACIFIANBCGooAgAiBEkiCRsiCykCADcCSCABQdAAaiALQQhqKAIANgIAIAEgACAKQQxsaiIAIAIgBiAIT0EMbGoiAiACQQhqKAIAIgYgAEEIaigCACIISSILGyIKKQIANwIYIAFBIGogCkEIaigCADYCACABIAdBdEEAIAkbaiIHIANBdEEAIAUgBE8baiIDIAdBCGooAgAiBCADQQhqKAIAIglJIgobIgUpAgA3AjwgAUHEAGogBUEIaigCADYCACABIAAgC0EMbGoiBSACIAYgCE9BDGxqIgIgAkEIaigCACIGIAVBCGooAgAiCEkiCxsiACkCADcCJCABQSxqIABBCGooAgA2AgAgASAHQXRBACAKG2oiACADQXRBACAEIAlPG2oiByAAQQhqKAIAIgkgB0EIaigCACIKSSIDGyIEKQIANwIwIAFBOGogBEEIaigCADYCAAJAAkAgAiAGIAhPQQxsaiAAQXRBACADG2pBDGpHDQAgBSALQQxsaiAHQXRBACAJIApPG2pBDGpGDQELEKcBAAsL1wkBDX8gACAAQQhqKAIAIgMgAEEUaigCACIESUEMbGoiBSAAQSRBGCAAQSBqKAIAIABBLGooAgBJIgYbaiIHIAAgAyAET0EMbGoiAyADQQhqKAIAIABBGEEkIAYbaiIEQQhqKAIASSIGGyAFQQhqKAIAIAdBCGooAgBJIggbIglBCGooAgAhCiAEIAMgByAIGyAGGyILQQhqKAIAIQwgAkEIaiINIAcgBSAIGyIHQQhqKAIANgIAIAIgBykCADcCACACIAsgCSAKIAxJIgcbIgUpAgA3AgwgAkEUaiAFQQhqKAIANgIAIAJBIGogCSALIAcbIgdBCGooAgA2AgAgAiAHKQIANwIYIAJBLGoiCiADIAQgBhsiB0EIaigCADYCACACQSRqIgUgBykCADcCACAAQTBqIgdBGEEkIABB0ABqKAIAIABB3ABqKAIASSIDG2oiBCAHIABBOGooAgAiBiAAQcQAaigCACIIT0EMbGoiACAHQSRBGCADG2oiAyAHIAYgCElBDGxqIgdBCGooAgAgA0EIaigCAEkiBhsgAEEIaigCACAEQQhqKAIASSIIGyIJQQhqKAIAIQwgByADIAAgCBsgBhsiC0EIaigCACEOIAJBOGoiDyADIAcgBhsiA0EIaigCADYCACACQTBqIgcgAykCADcCACACQTxqIAkgCyAOIAxJIgMbIgYpAgA3AgAgAkHEAGogBkEIaigCADYCACACQcgAaiALIAkgAxsiAykCADcCACACQdAAaiADQQhqKAIANgIAIAJB1ABqIgMgACAEIAgbIgApAgA3AgAgAkHcAGoiBCAAQQhqKAIANgIAIAEgByACIA0oAgAiBiAPKAIAIghJIgAbIgkpAgA3AgAgAUEIaiAJQQhqKAIANgIAIAEgBSADIAooAgAiCSAEKAIAIgRJIgsbIgopAgA3AlQgAUHcAGogCkEIaigCADYCACABIAcgAEEMbGoiACACIAYgCE9BDGxqIgIgAkEIaigCACIGIABBCGooAgAiCEkiChsiBykCADcCDCABQRRqIAdBCGooAgA2AgAgASAFQXRBACALG2oiByADQXRBACAJIARPG2oiAyAHQQhqKAIAIgUgA0EIaigCACIESSIJGyILKQIANwJIIAFB0ABqIAtBCGooAgA2AgAgASAAIApBDGxqIgAgAiAGIAhPQQxsaiICIAJBCGooAgAiBiAAQQhqKAIAIghJIgsbIgopAgA3AhggAUEgaiAKQQhqKAIANgIAIAEgB0F0QQAgCRtqIgcgA0F0QQAgBSAETxtqIgMgB0EIaigCACIEIANBCGooAgAiCUkiChsiBSkCADcCPCABQcQAaiAFQQhqKAIANgIAIAEgACALQQxsaiIFIAIgBiAIT0EMbGoiAiACQQhqKAIAIgYgBUEIaigCACIISSILGyIAKQIANwIkIAFBLGogAEEIaigCADYCACABIAdBdEEAIAobaiIAIANBdEEAIAQgCU8baiIHIABBCGooAgAiCSAHQQhqKAIAIgpJIgMbIgQpAgA3AjAgAUE4aiAEQQhqKAIANgIAAkACQCACIAYgCE9BDGxqIABBdEEAIAMbakEMakcNACAFIAtBDGxqIAdBdEEAIAkgCk8bakEMakYNAQsQpwEACwvYCQIX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BCQAIAQgACABIAIgAxA8IAQoAgAgBCgCBCAEQRBqJAALKgEBfyMAQRBrIgQkACAEIAAgASACIAMQJCAEKAIAIAQoAgQgBEEQaiQACysBAX8jAEEQayIEJAAgBCAAIAEgAiADEIIBIAQoAgAgBCgCBCAEQRBqJAALKgEBfyMAQRBrIgQkACAEIAAgASACIAMQPyAEKAIAIAQoAgQgBEEQaiQACyoBAX8jAEEQayIEJAAgBCAAIAEgAiADEHwgBCgCACAEKAIEIARBEGokAAsqAQF/IwBBEGsiBCQAIAQgACABIAIgAxBWIAQoAgAgBCgCBCAEQRBqJAALKgEBfyMAQRBrIgQkACAEIAAgASACIAMQHCAEKAIAIAQoAgQgBEEQaiQACyoBAX8jAEEQayIEJAAgBCAAIAEgAiADED4gBCgCACAEKAIEIARBEGokAAsmAQF/IwBBEGsiAiQAIAIgACABEBQgAigCACACKAIEIAJBEGokAAsmAQF/IwBBEGsiAiQAIAIgACABEEYgAigCACACKAIEIAJBEGokAAsqAQF/AkAgACgCACIBQYCAgIB4ckGAgICAeEYNACAAKAIEIAFBARDrAQsLFwACQCABQQlJDQAgASAAEFAPCyAAEAILIAACQCAAQYCAgIB4ckGAgICAeEYNACABIABBARDrAQsLHQEBfwJAIAAoAgAiAUUNACAAKAIEIAFBARDrAQsLGAACQCAARQ0AIAAgARDxAQALIAIQpQEACxQAIAAgACABIAAgAV0bIAEgAVwbCxQAIAEgASAAIAAgAWMbIAAgAGIbCxQAIAEgASAAIAAgAV0bIAAgAFwbCxoBAX8gASAAQQAoApDNQCICQQIgAhsRBAAACx0AIABBCGpBACkCzL5ANwIAIABBACkCxL5ANwIACx0AIABBCGpBACkC3L5ANwIAIABBACkC1L5ANwIACxUAIAFpQQFGIABBgICAgHggAWtNcQscACAAQQA2AhAgAEIANwIIIABCgICAgMAANwIACxMAAkAgAUUNACAAIAEgAhDrAQsLFgAgACgCACABIAIgACgCBCgCDBEIAAsNACAAIAEgAiADEDgPCxEAIAEgACgCACAAKAIEEOcBCxMAIABBiMDAADYCBCAAIAE2AgALDAAgACABIAIQlwEPCwsAIAAgARD3ARoACwoAIAAgARDaAQ8LCgAgACABEJsBDwsKACAAIAEQ4QEPCwwAIAAgASkCADcDAAsKACABIAAQ7wEACwgAIAAQiwEACwkAIABBADYCAAsIACAAIAEQGwsIACAAIAEQXwsFAEEADwsGABD9AQALBgAgABBNCwYAIAAQVwsGACAAEC4LBgAgABAvCwMADwsDAAALC9ZJAgBBgIDAAAuoSXNyYy9jYW5ueS5ycwBzcmMvbW9ycGhvbG9neS5ycwBsaWJyYXJ5L2NvcmUvc3JjL3NsaWNlL3NvcnQvc2hhcmVkL3NtYWxsc29ydC5ycwAvcnVzdGMvZWQ2MWU3ZDdlMjQyNDk0ZmI3MDU3ZjI2NTczMDBkOWU3N2JiNGZjYi9saWJyYXJ5L2NvcmUvc3JjL3NsaWNlL3NvcnQvc3RhYmxlL3F1aWNrc29ydC5ycwBzcmMvaHlzdGVyZXNpcy5ycwAvcm9vdC8uY2FyZ28vcmVnaXN0cnkvc3JjL2luZGV4LmNyYXRlcy5pby0xOTQ5Y2Y4YzZiNWI1NTdmL3dhc20tYmluZGdlbi0wLjIuMTAwL3NyYy9jb252ZXJ0L3NsaWNlcy5ycwBzcmMvZ2F1c3NpYW5fYmx1ci5ycwAvcnVzdGMvZWQ2MWU3ZDdlMjQyNDk0ZmI3MDU3ZjI2NTczMDBkOWU3N2JiNGZjYi9saWJyYXJ5L2NvcmUvc3JjL2l0ZXIvdHJhaXRzL2l0ZXJhdG9yLnJzAC9ydXN0Yy9lZDYxZTdkN2UyNDI0OTRmYjcwNTdmMjY1NzMwMGQ5ZTc3YmI0ZmNiL2xpYnJhcnkvY29yZS9zcmMvY21wLnJzAHNyYy9kb2N1bWVudF9kZXRlY3Rpb24ucnMAc3JjL2dyYWRpZW50X2NhbGN1bGF0aW9uLnJzAHNyYy9kaWxhdGlvbi5ycwBzcmMvbm9uX21heGltdW1fc3VwcHJlc3Npb24ucnMAc3JjL3NvYmVsLnJzAHNyYy9ob3VnaC5ycwBzcmMvY2xhaGUucnMAL3J1c3RjL2VkNjFlN2Q3ZTI0MjQ5NGZiNzA1N2YyNjU3MzAwZDllNzdiYjRmY2IvbGlicmFyeS9hbGxvYy9zcmMvc2xpY2UucnMAL3J1c3RjL2VkNjFlN2Q3ZTI0MjQ5NGZiNzA1N2YyNjU3MzAwZDllNzdiYjRmY2IvbGlicmFyeS9hbGxvYy9z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ABEAAACBAQAAEwAAAA0AEAARAAAAdwEAABMAAAANABAAEQAAAFwAAAAWAAAADQAQABEAAAB0AAAAEwAAAA0AEAARAAAAZgAAABgAAAANABAAEQAAAG0AAAAfAAAADQAQABEAAAAXAAAABQAAAA0AEAARAAAAlwAAABYAAAANABAAEQAAAK8AAAATAAAADQAQABEAAAChAAAAGAAAAA0AEAARAAAAqAAAAB8AAAANABAAEQAAADEAAAAXAAAADQAQABEAAAA6AAAAEAAAAA0AEAARAAAANgAAABAAAAANABAAEQAAABgCAAARAAAADQAQABEAAAAdAgAAFgAAAA0AEAARAAAAHgIAABYAAAANABAAEQAAAB8CAAAWAAAADQAQABEAAAAgAgAAFgAAAA0AEAARAAAAIQIAABYAAAANABAAEQAAACICAAAWAAAADQAQABEAAAAjAgAAFgAAAA0AEAARAAAAJAIAABYAAAANABAAEQAAAD4CAAAbAAAADQAQABEAAAAcAAAAFwAAAA0AEAARAAAAJwAAABgAAAANABAAEQAAAOAAAAAWAAAADQAQABEAAADiAAAAHAAAAA0AEAARAAAA4gAAADUAAAANABAAEQAAAJ4BAAAWAAAADQAQABEAAACvAQAAFgAAAA0AEAARAAAAsgEAACQAAAANABAAEQAAAKYBAAAQAAAADQAQABEAAACmAQAAKQAAAA0AEAARAAAAqQEAAB0AAAANABAAEQAAAPQAAAAWAAAADQAQABEAAAD2AAAAFQAAAA0AEAARAAAA9gAAADMAAAANABAAEQAAAAgBAAAWAAAADQAQABEAAAAKAQAAGwAAAA0AEAARAAAACgEAAC4AAADBABAAZQAAACQBAAAOAAAAYXNzZXJ0aW9uIGZhaWxlZDogbWluIDw9IG1heJUBEABHAAAARAQAAAkAAAAFAxAAGQAAAE0AAAAJAAAABQMQABkAAABSAAAACQAAAAUDEAAZAAAAVwAAAAkAAAAFAxAAGQAAAFsAAAANAAAABQMQABkAAABkAAAACQAAAAUDEAAZAAAAaQAAAAkAAAAFAxAAGQAAAG4AAAAJAAAABQMQABkAAAByAAAADQAAAAUDEAAZAAAADgAAABgAAAAFAxAAGQAAABEAAAATAAAABQMQABkAAAARAAAADQAAAAUDEAAZAAAAIQAA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ZDo6aDYxMjZjZGJkOWZjNWQzMjEHF2h5c3RlcmVzaXNfdGhyZXNob2xkaW5nCDN3YXNtX2JsdXI6OmRpbGF0aW9uOjpkaWxhdGVfZmFzdDo6aDUxOTQ4M2Q0YzA1NWIwZWYJQmNvcmU6OnNsaWNlOjpzb3J0OjpzdGFibGU6OnF1aWNrc29ydDo6cXVpY2tzb3J0OjpoODllNDA3MTE2NDFmNzNhYQoqd2FzbV9ibHVyOjpjbGFoZTo6Y2xhaGU6OmgzNjA5NjRlZDUxY2E5YzNjC0Jjb3JlOjpzbGljZTo6c29ydDo6c3RhYmxlOjpxdWlja3NvcnQ6OnF1aWNrc29ydDo6aDQ3ZWQ3MTFkZjNhNDdhOGEMQmNvcmU6OnNsaWNlOjpzb3J0OjpzdGFibGU6OnF1aWNrc29ydDo6cXVpY2tzb3J0OjpoODI1OTFjZWE4NzczNzZkZQ1CY29yZTo6c2xpY2U6OnNvcnQ6OnN0YWJsZTo6cXVpY2tzb3J0OjpxdWlja3NvcnQ6OmgyOTEwNzdkOTgyMGU4NDg2Dh5oeXN0ZXJlc2lzX3RocmVzaG9sZGluZ19iaW5hcnkPWGNvcmU6OnNsaWNlOjpzb3J0OjpzaGFyZWQ6OnNtYWxsc29ydDo6c21hbGxfc29ydF9nZW5lcmFsX3dpdGhfc2NyYXRjaDo6aDI1MDFkNmQzNmU4ZTIxNjgQC2hvdWdoX2xpbmVzETd3YXNtX2JsdXI6OnNvYmVsOjpzb2JlbF8zeDNfc2ltZF9yb3c6Omg1YmNmNTVkYjAxYjBhMTVlEkJjb3JlOjpzbGljZTo6c29ydDo6c3RhYmxlOjpxdWlja3NvcnQ6OnF1aWNrc29ydDo6aDNmNDIxOWVjZmU3ZjhlMDMTOWNvcmU6OnNsaWNlOjpzb3J0OjpzdGFibGU6OmRyaWZ0Ojpzb3J0OjpoNTI0YTgwOGJhZTAzMmYxMhQWdmFsaWRhdGVfcXVhZHJpbGF0ZXJhbBVYY29yZTo6c2xpY2U6OnNvcnQ6OnNoYXJlZDo6c21hbGxzb3J0OjpzbWFsbF9zb3J0X2dlbmVyYWxfd2l0aF9zY3JhdGNoOjpoMmE2MmNhYmE3NWIwNjIzMhZYY29yZTo6c2xpY2U6OnNvcnQ6OnNoYXJlZDo6c21hbGxzb3J0OjpzbWFsbF9zb3J0X2dlbmVyYWxfd2l0aF9zY3JhdGNoOjpoNzgwYzkzODY5Yjc3OWEyYxcYY2FubnlfZWRnZV9kZXRlY3Rvcl9mdWxsGEVjb3JlOjpzbGljZTo6c29ydDo6c2hhcmVkOjpzbWFsbHNvcnQ6OnNvcnQ4X3N0YWJsZTo6aGQxMzM1YWFkMzk2ZjRlNzMZFG11bHRpX290c3VfdGhyZXNob2xkGjljb3JlOjpzbGljZTo6c29ydDo6c3RhYmxlOjpkcmlmdDo6c29ydDo6aDVhZjExMTM0NWQyMzljODEbQWNvbXBpbGVyX2J1aWx0aW5zOjptYXRoOjpsaWJtX21hdGg6OnBvd2Y6OnBvd2Y6Omg5OGMzMjA3NTRiMGY0MDQ1HBNzb2JlbF9ncmFkaWVudHNfNXg1HTljb3JlOjpzbGljZTo6c29ydDo6c3RhYmxlOjpkcmlmdDo6c29ydDo6aDYxOThmNjQyODg3MWUyY2QeOWNvcmU6OnNsaWNlOjpzb3J0OjpzdGFibGU6OmRyaWZ0Ojpzb3J0OjpoZDlmNzkwMDhlZmI2Yjc1Yx85Y29yZTo6c2xpY2U6OnNvcnQ6OnN0YWJsZTo6ZHJpZnQ6OnNvcnQ6OmhmNWU1M2Q4OTE0ZjMxNjA1IBphZGFwdGl2ZV90aHJlc2hvbGRfc2F1dm9sYSEXcmVmaW5lX2Nvcm5lcnNfc3VicGl4ZWwiWGNvcmU6OnNsaWNlOjpzb3J0OjpzaGFyZWQ6OnNtYWxsc29ydDo6c21hbGxfc29ydF9nZW5lcmFsX3dpdGhfc2NyYXRjaDo6aDZiYTdmNDIxMzNkMjU3MjQjGmFkYXB0aXZlX3RocmVzaG9sZF9uaWJsYWNrJBhyYW5rX2RvY3VtZW50X2NhbmRpZGF0ZXMlRWNvcmU6OnNsaWNlOjpzb3J0OjpzaGFyZWQ6OnNtYWxsc29ydDo6c29ydDhfc3RhYmxlOjpoMzJiMGY1ZjU2NWIxYTliMCZFY29yZTo6c2xpY2U6OnNvcnQ6OnNoYXJlZDo6c21hbGxzb3J0Ojpzb3J0OF9zdGFibGU6OmhmM2QwMzBlNDZjODliOGM1JxthZGFwdGl2ZV90aHJlc2hvbGRfZ2F1c3NpYW4oWGNvcmU6OnNsaWNlOjpzb3J0OjpzaGFyZWQ6OnNtYWxsc29ydDo6c21hbGxfc29ydF9nZW5lcmFsX3dpdGhfc2NyYXRjaDo6aDc2NDc5NjY0ZGNkMmNkMWQpT3dhc21fYmx1cjo6bm9uX21heGltdW1fc3VwcHJlc3Npb246OmNhbGN1bGF0ZV9tYWduaXR1ZGVfc2ltZDo6aDU0NzY1MDVkMzE5MTBmNTYqD2Nsb3NlX2VkZ2VfZ2FwcysXY2FsY3VsYXRlX2VkZ2Vfc3RyZW5ndGgsF3JlbW92ZV9zbWFsbF9jb21wb25lbnRzLU53YXNtX2JsdXI6Om5vbl9tYXhpbXVtX3N1cHByZXNzaW9uOjpub25fbWF4aW11bV9zdXBwcmVzc2lvbjo6aGRhMmQxMWMyOGYxYTNiMTkuQWNvbXBpbGVyX2J1aWx0aW5zOjptYXRoOjpsaWJtX21hdGg6OnNpbmY6OnNpbmY6Omg4ZmIwOWVmODkyNTMyYzQ5L0Fjb21waWxlcl9idWlsdGluczo6bWF0aDo6bGlibV9tYXRoOjpjb3NmOjpjb3NmOjpoYTY1OWMwYTVkOWY1ZjE2ZDA9d2FzbV9ibHVyOjptb3JwaG9sb2d5OjpkaWxhdGVfd2l0aF9lbGVtZW50OjpoM2ZlNDNmM2Q4ZmI0ZDJlZTE8d2FzbV9ibHVyOjptb3JwaG9sb2d5Ojplcm9kZV93aXRoX2VsZW1lbnQ6Omg4ZjFhNzU5YzlmNjE3MzdjMkVjb3JlOjpzbGljZTo6c29ydDo6c2hhcmVkOjpzbWFsbHNvcnQ6OnNvcnQ4X3N0YWJsZTo6aDdmMGZhNTZhMGQ0YTE5YWIzQHdhc21fYmx1cjo6Y2xhaGU6OnBlcmNlbnRpbGVfY29udHJhc3Rfc3RyZXRjaDo6aDkyYjYwM2I5YjlmMDNhODA0F2FkYXB0aXZlX3RocmVzaG9sZF9tZWFuNTNjb3JlOjpzdHI6OmNvdW50Ojpkb19jb3VudF9jaGFyczo6aGRiNzc0Y2RhNjcxY2JhOTA2CnRoaW5fZWRnZXM3Pndhc21fYmx1cjo6bW9ycGhvbG9neTo6emhhbmdfc3Vlbl9pdGVyYXRpb246Omg2ZjAxNTAxMjg3MzNmYWY3OChfX3J1c3RjW2ViODk0NmUzNjgzOTY0NGFdOjpfX3JkbF9yZWFsbG9jOQtza2VsZXRvbml6ZTpFY29yZTo6c2xpY2U6OnNvcnQ6OnNoYXJlZDo6c21hbGxzb3J0Ojpzb3J0OF9zdGFibGU6OmhmZDc0ODFkMGY5M2JlOTZmOxdmaW5kX2xpbmVfaW50ZXJzZWN0aW9uczwWaGlzdG9ncmFtX2VxdWFsaXphdGlvbj0xd2FzbV9ibHVyOjpnYXVzc2lhbl9ibHVyOjpibHVyOjpoYWQzYTY4YWU3Y2ZkYzczNT4Uc2NoYXJyX2dyYWRpZW50c18zeDM/E3NvYmVsX2dyYWRpZW50c18zeDNAS3dhc21fYmx1cjo6YWRhcHRpdmVfdGhyZXNob2xkOjpjb21wdXRlX2ludGVncmFsX2ltYWdlX3NxOjpoZDMyZTc3MzU4OGZhNTQ2ZEE1Y29yZTo6Zm10OjpGb3JtYXR0ZXI6OnBhZF9pbnRlZ3JhbDo6aGQ1ZTE5MWNjY2E4ZGVjNzJCSHdhc21fYmx1cjo6YWRhcHRpdmVfdGhyZXNob2xkOjpjb21wdXRlX2ludGVncmFsX2ltYWdlOjpoMDkyNWExOWU0MDI5ZTkxMkM4ZGxtYWxsb2M6OmRsbWFsbG9jOjpEbG1hbGxvYzxBPjo6ZnJlZTo6aDhmNGI1MWViOTY4MTFjY2VEEGNvbnRyYXN0X3N0cmV0Y2hFC25tc19wcmVjaXNlRhJlZGdlX21hcF90b19iaW5hcnlHDm90c3VfdGhyZXNob2xkSEd3YXNtX2JsdXI6OmdyYWRpZW50X2NhbGN1bGF0aW9uOjpjYWxjdWxhdGVfZ3JhZGllbnRzOjpoMjIzYmJjMjE1NmU4ZGM5NEkjY29yZTo6Zm10Ojp3cml0ZTo6aGNjMGEzOGM5NzY0NTYxYjlKHGdyYWRpZW50X21hZ25pdHVkZV9kaXJlY3Rpb25LIWNvbXB1dGVfYWRhcHRpdmVfY2FubnlfdGhyZXNob2xkc0wLaGl0X29yX21pc3NNQWNvbXBpbGVyX2J1aWx0aW5zOjptYXRoOjpsaWJtX21hdGg6OmV4cGY6OmV4cGY6Omg4NzA4ZWI1Mjg2NzMxMDkyTkFkbG1hbGxvYzo6ZGxtYWxsb2M6OkRsbWFsbG9jPEE+OjpkaXNwb3NlX2NodW5rOjpoY2M1ZjM0NDZkNjllMDBlZU8zd2FzbV9ibHVyOjpob3VnaDo6VHJpZ1RhYmxlOjpuZXc6Omg5OGFlM2FlZDZkNTk4ZGVkUDxkbG1hbGxvYzo6ZGxtYWxsb2M6OkRsbWFsbG9jPEE+OjptZW1hbGlnbjo6aGUwNWEyNThjZjUyOTQ4MTlRQGRsbWFsbG9jOjpkbG1hbGxvYzo6RGxtYWxsb2M8QT46OnVubGlua19jaHVuazo6aDk4YzdiOTI0MTMyZmM3NjNSQ2NvbXBpbGVyX2J1aWx0aW5zOjptYXRoOjpsaWJtX21hdGg6OmF0YW5mOjphdGFuZjo6aDExMzg5ODk0Yzk1NDJlZTBTcDxhbGxvYzo6dmVjOjpWZWM8VD4gYXMgYWxsb2M6OnZlYzo6c3BlY19mcm9tX2l0ZXJfbmVzdGVkOjpTcGVjRnJvbUl0ZXJOZXN0ZWQ8VCxJPj46OmZyb21faXRlcjo6aDlmYjgwMjQ5MWFmNGM5MWZUO3dhc21fYmx1cjo6Y2xhaGU6OmlsbHVtaW5hdGlvbl9ub3JtYWxpemU6Omg0NmQyOTc1MTUzMDFlNjY1VRZtb3JwaG9sb2dpY2FsX2dyYWRpZW50VhJlZGdlX2RpcmVjdGlvbl9tYXBXR2NvbXBpbGVyX2J1aWx0aW5zOjptYXRoOjpwYXJ0aWFsX2F2YWlsYWJpbGl0eTo6YWNvc2Y6OmhmM2Y4YzA4ODZiMzhmODQ0WAlibGFja19oYXRZB3RvcF9oYXRaRmRsbWFsbG9jOjpkbG1hbGxvYzo6RGxtYWxsb2M8QT46Omluc2VydF9sYXJnZV9jaHVuazo6aGM2YTIyNzY3MDg2YmNiMWZbTmNvcmU6OmZtdDo6bnVtOjppbXA6OjxpbXBsIGNvcmU6OmZtdDo6RGlzcGxheSBmb3IgdTMyPjo6Zm10OjpoZTljOTJlOTY1NjQ5MDhhOFwQZ2FtbWFfY29ycmVjdGlvbl1Ad2FzbV9ibHVyOjptb3JwaG9sb2d5OjpjcmVhdGVfZWxsaXBzZV9lbGVtZW50OjpoOGM4MTI4YjU1ZDZjOTAzZl5RYWxsb2M6OnJhd192ZWM6OlJhd1ZlY0lubmVyPEE+OjpyZXNlcnZlOjpkb19yZXNlcnZlX2FuZF9oYW5kbGU6OmgyMDRmMWYyNzUyYWM5N2U0X0Vjb21waWxlcl9idWlsdGluczo6bWF0aDo6bGlibV9tYXRoOjphdGFuMmY6OmF0YW4yZjo6aDZiYzRkOTJmMTM0N2ViMTdgSjxhbGxvYzo6c3RyaW5nOjpTdHJpbmcgYXMgY29yZTo6Zm10OjpXcml0ZT46OndyaXRlX2NoYXI6OmgyZGUxNTkwOGNjZjgwNWViYVFhbGxvYzo6cmF3X3ZlYzo6UmF3VmVjSW5uZXI8QT46OnJlc2VydmU6OmRvX3Jlc2VydmVfYW5kX2hhbmRsZTo6aDBkOTA0ZjZmZjc4Mjg0YmFibjxzdGQ6OnBhbmlja2luZzo6cGFuaWNfaGFuZGxlcjo6Rm9ybWF0U3RyaW5nUGF5bG9hZCBhcyBjb3JlOjpwYW5pYzo6UGFuaWNQYXlsb2FkPjo6dGFrZV9ib3g6Omg0OTc1Y2U2YmNkMjQwYzJhYxNwcmVwcm9jZXNzX2RvY3VtZW50ZEBjb3JlOjpzbGljZTo6c29ydDo6c2hhcmVkOjpwaXZvdDo6bWVkaWFuM19yZWM6OmgzZGMxM2UwMjE2MTFlN2I5ZVJjb3JlOjpzbGljZTo6c29ydDo6c2hhcmVkOjpzbWFsbHNvcnQ6Omluc2VydGlvbl9zb3J0X3NoaWZ0X2xlZnQ6OmgyMGRmYzJlN2MwN2E5ZGVmZlJjb3JlOjpzbGljZTo6c29ydDo6c2hhcmVkOjpzbWFsbHNvcnQ6Omluc2VydGlvbl9zb3J0X3NoaWZ0X2xlZnQ6Omg0NThjYmNjMjBjMzlhZTQyZxRjYWxjdWxhdGVfc2l6ZV9zY29yZWg+d2FzbV9ibHVyOjptb3JwaG9sb2d5OjpjcmVhdGVfY3Jvc3NfZWxlbWVudDo6aDU3MmNmNzYwMGNiMTJkY2JpOXdhc21fYmx1cjo6bW9ycGhvbG9neTo6ZGlsYXRlX2VuaGFuY2VkOjpoOGFhODNjZmFhNGFlOGFlOWovd2FzbV9ibHVyOjptb3JwaG9sb2d5Ojplcm9kZTo6aGJhNzczZjRlM2QzNmFhNjFrUmNvcmU6OnNsaWNlOjpzb3J0OjpzaGFyZWQ6OnNtYWxsc29ydDo6aW5zZXJ0aW9uX3NvcnRfc2hpZnRfbGVmdDo6aDQ3NWI2N2Q1ZTdjZjZjZjNsE21vcnBob2xvZ2ljYWxfY2xvc2VtEm1vcnBob2xvZ2ljYWxfb3Blbm44YWxsb2M6OnJhd192ZWM6OlJhd1ZlYzxULEE+Ojpncm93X29uZTo6aDkxNWY2Zjk2NTk1NDM0MTlvOGFsbG9jOjpyYXdfdmVjOjpSYXdWZWM8VCxBPjo6Z3Jvd19vbmU6OmhhNjExZWE0Mjk0OTQwODA2cDhhbGxvYzo6cmF3X3ZlYzo6UmF3VmVjPFQsQT46Omdyb3dfb25lOjpoZDM0ODdiYmExNTI0YzUyMnEXbm9uX21heGltdW1fc3VwcHJlc3Npb25yOGFsbG9jOjpyYXdfdmVjOjpSYXdWZWM8VCxBPjo6Z3Jvd19vbmU6OmhiMDE2MTZhYTllY2RjNTU4czJzdGQ6OnBhbmlja2luZzo6cGFuaWNfd2l0aF9ob29rOjpoMmYzZjc0M2Q3NjQyZDZmMHQ8Y29yZTo6c2xpY2U6OnNvcnQ6OnN0YWJsZTo6ZHJpZnRzb3J0X21haW46OmgxNTc5MTRmMGVlMDBhNGZhdTxjb3JlOjpzbGljZTo6c29ydDo6c3RhYmxlOjpkcmlmdHNvcnRfbWFpbjo6aDM0NzljOWU1ZmM0M2YxMzN2UmNvcmU6OnNsaWNlOjpzb3J0OjpzaGFyZWQ6OnNtYWxsc29ydDo6aW5zZXJ0aW9uX3NvcnRfc2hpZnRfbGVmdDo6aGQwMTRiZDBhMGZmODhjZGR3OGFsbG9jOjpyYXdfdmVjOjpSYXdWZWM8VCxBPjo6Z3Jvd19vbmU6OmgwZTA0NDMxM2Q3YzAxMTRleDhhbGxvYzo6cmF3X3ZlYzo6UmF3VmVjPFQsQT46Omdyb3dfb25lOjpoNTA0ZDM3ZmY0ZmY2ZjQ1ZHk8Y29yZTo6c2xpY2U6OnNvcnQ6OnN0YWJsZTo6ZHJpZnRzb3J0X21haW46OmhjZTYwNmE4NzFkOWE1NjI3ejxjb3JlOjpzbGljZTo6c29ydDo6c3RhYmxlOjpkcmlmdHNvcnRfbWFpbjo6aGYwMTIxMTJmMjg4MjNmMGJ7PGNvcmU6OnNsaWNlOjpzb3J0OjpzdGFibGU6OmRyaWZ0c29ydF9tYWluOjpoZmY4ZTRiNjY0ZmJkY2IyMXwYc29iZWxfZ3JhZGllbnRzXzN4M19zaW1kfWk8c3RkOjpwYW5pY2tpbmc6OnBhbmljX2hhbmRsZXI6OkZvcm1hdFN0cmluZ1BheWxvYWQgYXMgY29yZTo6cGFuaWM6OlBhbmljUGF5bG9hZD46OmdldDo6aDllYjUwMjk3NDgyOGRhOTJ+QGNvcmU6OnNsaWNlOjpzb3J0OjpzaGFyZWQ6OnBpdm90OjptZWRpYW4zX3JlYzo6aDAwNzkxZmM2YjQ0MWU5MWR/QGNvcmU6OnNsaWNlOjpzb3J0OjpzaGFyZWQ6OnBpdm90OjptZWRpYW4zX3JlYzo6aGQ1NTVjNjY4YmM0ZWVmZTiAAUBjb3JlOjpzbGljZTo6c29ydDo6c2hhcmVkOjpwaXZvdDo6bWVkaWFuM19yZWM6OmhlOWNlN2Q1Y2JhM2E4NDUzgQEWY29tcHV0ZV9pbnRlZ3JhbF9pbWFnZYIBE2NhbGN1bGF0ZV9ncmFkaWVudHODAUZjb21waWxlcl9idWlsdGluczo6bWF0aDo6bGlibV9tYXRoOjpzY2FsYm46OnNjYWxibmY6OmhlNmY2MTUyYWI4ZjZlZWQ3hAEFY2xhaGWFAQ9kaWxhdGVfZW5oYW5jZWSGAQVlcm9kZYcBG3BlcmNlbnRpbGVfY29udHJhc3Rfc3RyZXRjaIgBBGJsdXKJAUBjb3JlOjpzbGljZTo6c29ydDo6c2hhcmVkOjpwaXZvdDo6bWVkaWFuM19yZWM6OmhjMzg2NGIzZDcwZGRhYmM2igEWaWxsdW1pbmF0aW9uX25vcm1hbGl6ZYsBPXN0ZDo6cGFuaWNraW5nOjpwYW5pY19oYW5kbGVyOjp7e2Nsb3N1cmV9fTo6aDRkMjQzYWIwYmZkMTY3ZTWMAWI8c3RkOjpwYW5pY2tpbmc6OnBhbmljX2hhbmRsZXI6OkZvcm1hdFN0cmluZ1BheWxvYWQgYXMgY29yZTo6Zm10OjpEaXNwbGF5Pjo6Zm10OjpoOTVhMTk0YzYzZTY4YmZkM40BBmRpbGF0ZY4BLmFsbG9jOjpyYXdfdmVjOjpmaW5pc2hfZ3Jvdzo6aDZkMWUzMzg1MTJlZjdhOWGPAS5hbGxvYzo6cmF3X3ZlYzo6ZmluaXNoX2dyb3c6OmhiYmZlMjg5ZjY3ZWU3MmI2kAEuYWxsb2M6OnJhd192ZWM6OmZpbmlzaF9ncm93OjpoNjhiMjI1YWQ5NmU5MGYwY5EBN3N0ZDo6YWxsb2M6OmRlZmF1bHRfYWxsb2NfZXJyb3JfaG9vazo6aDg2MDc5ZTZmOThmZTM3ZGSSATZjb3JlOjpwYW5pY2tpbmc6OnBhbmljX2JvdW5kc19jaGVjazo6aDhmYjhkYjc0MmU3OGZjNGKTAUpjb3JlOjpzbGljZTo6aW5kZXg6OnNsaWNlX2luZGV4X2ZhaWw6OmRvX3BhbmljOjpydW50aW1lOjpoZjRiMjVkOGNjNGMxODA3ZJQBSmNvcmU6OnNsaWNlOjppbmRleDo6c2xpY2VfaW5kZXhfZmFpbDo6ZG9fcGFuaWM6OnJ1bnRpbWU6OmgwYmIxNzI2NGI4MWI5MTQ0lQFKY29yZTo6c2xpY2U6OmluZGV4OjpzbGljZV9pbmRleF9mYWlsOjpkb19wYW5pYzo6cnVudGltZTo6aDlkMDc5ODE0YmYyMjZhMzmWAUg8ZGxtYWxsb2M6OnN5czo6U3lzdGVtIGFzIGRsbWFsbG9jOjpBbGxvY2F0b3I+OjphbGxvYzo6aGJhYWYyYmY3Y2Y5NmQwMzKXAShfX3J1c3RjW2ViODk0NmUzNjgzOTY0NGFdOjpfX3JkbF9kZWFsbG9jmAEuY29yZTo6Zm10OjpXcml0ZTo6d3JpdGVfZm10OjpoMTViN2EyOGNjYzQ5MjI3NZkBBnJvdW5kZpoBSTxhbGxvYzo6c3RyaW5nOjpTdHJpbmcgYXMgY29yZTo6Zm10OjpXcml0ZT46OndyaXRlX3N0cjo6aGU0YTFmNWJjOTM0MzU2YzKbAS1fX3J1c3RjW2ViODk0NmUzNjgzOTY0NGFdOjpfX3JkbF9hbGxvY196ZXJvZWScAThzdGQ6OnBhbmlja2luZzo6cGFuaWNfY291bnQ6OmluY3JlYXNlOjpoYWU4ZTViMGRkNWI3Y2MzZJ0BazxzdGQ6OnBhbmlja2luZzo6cGFuaWNfaGFuZGxlcjo6U3RhdGljU3RyUGF5bG9hZCBhcyBjb3JlOjpwYW5pYzo6UGFuaWNQYXlsb2FkPjo6dGFrZV9ib3g6Omg1NTA1MzAwZjkzYjYwMjI5ngE3Y29yZTo6c2xpY2U6OmluZGV4OjpzbGljZV9pbmRleF9mYWlsOjpoZmFlZWU1YjBlNjRjNmY2ZJ8BKWNvcmU6OnBhbmlja2luZzo6cGFuaWM6OmgzMmFlYjZhNGQ3MzU1ZDYxoAEeY2FsY3VsYXRlX2RldGVjdGlvbl9jb25maWRlbmNloQEoY2FubnlfZWRnZV9kZXRlY3Rvcl9mdWxsIG11bHRpdmFsdWUgc2hpbaIBQ2NvcmU6OmZtdDo6Rm9ybWF0dGVyOjpwYWRfaW50ZWdyYWw6OndyaXRlX3ByZWZpeDo6aDQ5ZTE0ZWRiZTliMjkyNDSjAR1ob3VnaF9saW5lc19wIG11bHRpdmFsdWUgc2hpbaQBG2hpdF9vcl9taXNzIG11bHRpdmFsdWUgc2hpbaUBNGFsbG9jOjpyYXdfdmVjOjpjYXBhY2l0eV9vdmVyZmxvdzo6aDllMzJlODViM2NhMGNkMWamAUhjb3JlOjpwYW5pY2tpbmc6OnBhbmljX2NvbnN0OjpwYW5pY19jb25zdF9kaXZfYnlfemVybzo6aGRlYjEyNTRjOTcxMDFkZDmnAU9jb3JlOjpzbGljZTo6c29ydDo6c2hhcmVkOjpzbWFsbHNvcnQ6OnBhbmljX29uX29yZF92aW9sYXRpb246OmgwOGE2Y2MxODk3NjhmN2U5qAEbaG91Z2hfbGluZXMgbXVsdGl2YWx1ZSBzaGltqQFAY29yZTo6c2xpY2U6OnNvcnQ6OnN0YWJsZTo6ZHJpZnQ6OnNxcnRfYXBwcm94OjpoNzdkZWExNDEwMGRlZDE0MaoBKmFkYXB0aXZlX3RocmVzaG9sZF9zYXV2b2xhIG11bHRpdmFsdWUgc2hpbasBFWNsYWhlIG11bHRpdmFsdWUgc2hpbawBJ3JlZmluZV9jb3JuZXJzX3N1YnBpeGVsIG11bHRpdmFsdWUgc2hpba0BJ25vbl9tYXhpbXVtX3N1cHByZXNzaW9uIG11bHRpdmFsdWUgc2hpba4BK2ZpbmRfZG9jdW1lbnRfcXVhZHJpbGF0ZXJhbCBtdWx0aXZhbHVlIHNoaW2vASJtb3JwaG9sb2dpY2FsX29wZW4gbXVsdGl2YWx1ZSBzaGltsAEXdG9wX2hhdCBtdWx0aXZhbHVlIHNoaW2xASNtb3JwaG9sb2dpY2FsX2Nsb3NlIG11bHRpdmFsdWUgc2hpbbIBJm1vcnBob2xvZ2ljYWxfZ3JhZGllbnQgbXVsdGl2YWx1ZSBzaGltswEZYmxhY2tfaGF0IG11bHRpdmFsdWUgc2hpbbQBFWVyb2RlIG11bHRpdmFsdWUgc2hpbbUBH2RpbGF0ZV9lbmhhbmNlZCBtdWx0aXZhbHVlIHNoaW22ASphZGFwdGl2ZV90aHJlc2hvbGRfbmlibGFjayBtdWx0aXZhbHVlIHNoaW23ASthZGFwdGl2ZV90aHJlc2hvbGRfZ2F1c3NpYW4gbXVsdGl2YWx1ZSBzaGltuAEnYWRhcHRpdmVfdGhyZXNob2xkX21lYW4gbXVsdGl2YWx1ZSBzaGltuQExY29tcHV0ZV9hZGFwdGl2ZV9jYW5ueV90aHJlc2hvbGRzIG11bHRpdmFsdWUgc2hpbboBI3ByZXByb2Nlc3NfZG9jdW1lbnQgbXVsdGl2YWx1ZSBzaGltuwErcGVyY2VudGlsZV9jb250cmFzdF9zdHJldGNoIG11bHRpdmFsdWUgc2hpbbwBFGJsdXIgbXVsdGl2YWx1ZSBzaGltvQEbbm1zX3ByZWNpc2UgbXVsdGl2YWx1ZSBzaGltvgEnaHlzdGVyZXNpc190aHJlc2hvbGRpbmcgbXVsdGl2YWx1ZSBzaGltvwEuaHlzdGVyZXNpc190aHJlc2hvbGRpbmdfYmluYXJ5IG11bHRpdmFsdWUgc2hpbcABEV9fd2JpbmRnZW5fbWFsbG9jwQEnZmluZF9saW5lX2ludGVyc2VjdGlvbnMgbXVsdGl2YWx1ZSBzaGltwgEfY2xvc2VfZWRnZV9nYXBzIG11bHRpdmFsdWUgc2hpbcMBJ3JlbW92ZV9zbWFsbF9jb21wb25lbnRzIG11bHRpdmFsdWUgc2hpbcQBG3NrZWxldG9uaXplIG11bHRpdmFsdWUgc2hpbcUBJG11bHRpX290c3VfdGhyZXNob2xkIG11bHRpdmFsdWUgc2hpbcYBIGdhbW1hX2NvcnJlY3Rpb24gbXVsdGl2YWx1ZSBzaGltxwEmaWxsdW1pbmF0aW9uX25vcm1hbGl6ZSBtdWx0aXZhbHVlIHNoaW3IARZkaWxhdGUgbXVsdGl2YWx1ZSBzaGltyQEsZ3JhZGllbnRfbWFnbml0dWRlX2RpcmVjdGlvbiBtdWx0aXZhbHVlIHNoaW3KASxfX3J1c3RjW2ViODk0NmUzNjgzOTY0NGFdOjpydXN0X2JlZ2luX3Vud2luZMsBLWNvcmU6OnBhbmlja2luZzo6cGFuaWNfZm10OjpoMGNlOGYwZjhhZTgxMWIxN8wBGnRoaW5fZWRnZXMgbXVsdGl2YWx1ZSBzaGltzQEmY29tcHV0ZV9pbnRlZ3JhbF9pbWFnZSBtdWx0aXZhbHVlIHNoaW3OASBjb250cmFzdF9zdHJldGNoIG11bHRpdmFsdWUgc2hpbc8BJmhpc3RvZ3JhbV9lcXVhbGl6YXRpb24gbXVsdGl2YWx1ZSBzaGlt0AEocmFua19kb2N1bWVudF9jYW5kaWRhdGVzIG11bHRpdmFsdWUgc2hpbdEBI2NhbGN1bGF0ZV9ncmFkaWVudHMgbXVsdGl2YWx1ZSBzaGlt0gEjc29iZWxfZ3JhZGllbnRzXzN4MyBtdWx0aXZhbHVlIHNoaW3TAShzb2JlbF9ncmFkaWVudHNfM3gzX3NpbWQgbXVsdGl2YWx1ZSBzaGlt1AEiZWRnZV9kaXJlY3Rpb25fbWFwIG11bHRpdmFsdWUgc2hpbdUBI3NvYmVsX2dyYWRpZW50c181eDUgbXVsdGl2YWx1ZSBzaGlt1gEkc2NoYXJyX2dyYWRpZW50c18zeDMgbXVsdGl2YWx1ZSBzaGlt1wEmdmFsaWRhdGVfcXVhZHJpbGF0ZXJhbCBtdWx0aXZhbHVlIHNoaW3YASJlZGdlX21hcF90b19iaW5hcnkgbXVsdGl2YWx1ZSBzaGlt2QFfY29yZTo6cHRyOjpkcm9wX2luX3BsYWNlPHN0ZDo6cGFuaWNraW5nOjpwYW5pY19oYW5kbGVyOjpGb3JtYXRTdHJpbmdQYXlsb2FkPjo6aDdmNDI0MGQxMDk3OTE5NGPaASZfX3J1c3RjW2ViODk0NmUzNjgzOTY0NGFdOjpfX3JkbF9hbGxvY9sBVmNvcmU6OnB0cjo6ZHJvcF9pbl9wbGFjZTxjb3JlOjpvcHRpb246Ok9wdGlvbjxhbGxvYzo6dmVjOjpWZWM8dTg+Pj46Omg4MjA2ZTM1MGRhNzMzZjg43AFCY29yZTo6cHRyOjpkcm9wX2luX3BsYWNlPGFsbG9jOjpzdHJpbmc6OlN0cmluZz46OmhhZWU3ZjEyZDY5OGM4OWJm3QEvYWxsb2M6OnJhd192ZWM6OmhhbmRsZV9lcnJvcjo6aDViZjk0MzM5MTViYmY5ODLeAQVmbWluZt8BBGZtYXjgAQVmbWF4ZuEBI19fcnVzdGNbZWI4OTQ2ZTM2ODM5NjQ0YV06Ol9fcmdfb29t4gExPFQgYXMgY29yZTo6YW55OjpBbnk+Ojp0eXBlX2lkOjpoMTkxYTZkYWRkYzY0ZjY2ZuMBMTxUIGFzIGNvcmU6OmFueTo6QW55Pjo6dHlwZV9pZDo6aDNhMjQ5MGQ4OTgxMTljYzDkAUNjb3JlOjphbGxvYzo6bGF5b3V0OjpMYXlvdXQ6OmlzX3NpemVfYWxpZ25fdmFsaWQ6Omg5MGJiYjFmMmY2ZGI2ODEz5QE5Y29yZTo6b3BzOjpmdW5jdGlvbjo6Rm5PbmNlOjpjYWxsX29uY2U6Omg3ZjBlNTU0Y2IwNmJmMTgw5gEPX193YmluZGdlbl9mcmVl5wEyY29yZTo6Zm10OjpGb3JtYXR0ZXI6OndyaXRlX3N0cjo6aDNjZmM2MTY4MTE3ZjRmNDPoASlfX3J1c3RjW2ViODk0NmUzNjgzOTY0NGFdOjpfX3J1c3RfcmVhbGxvY+kBXzxzdGQ6OnBhbmlja2luZzo6cGFuaWNfaGFuZGxlcjo6U3RhdGljU3RyUGF5bG9hZCBhcyBjb3JlOjpmbXQ6OkRpc3BsYXk+OjpmbXQ6OmhhOGEzNThmMmViZDA1NzE16gFmPHN0ZDo6cGFuaWNraW5nOjpwYW5pY19oYW5kbGVyOjpTdGF0aWNTdHJQYXlsb2FkIGFzIGNvcmU6OnBhbmljOjpQYW5pY1BheWxvYWQ+OjpnZXQ6OmhiMjk0NzA4MDQyOGY3NjJh6wEpX19ydXN0Y1tlYjg5NDZlMzY4Mzk2NDRhXTo6X19ydXN0X2RlYWxsb2PsASVfX3J1c3RjW2ViODk0NmUzNjgzOTY0NGFdOjpydXN0X3Bhbmlj7QEnX19ydXN0Y1tlYjg5NDZlMzY4Mzk2NDRhXTo6X19ydXN0X2FsbG9j7gEuX19ydXN0Y1tlYjg5NDZlMzY4Mzk2NDRhXTo6X19ydXN0X2FsbG9jX3plcm9lZO8BNV9fcnVzdGNbZWI4OTQ2ZTM2ODM5NjQ0YV06Ol9fcnVzdF9hbGxvY19lcnJvcl9oYW5kbGVy8AFpPHN0ZDo6cGFuaWNraW5nOjpwYW5pY19oYW5kbGVyOjpTdGF0aWNTdHJQYXlsb2FkIGFzIGNvcmU6OnBhbmljOjpQYW5pY1BheWxvYWQ+Ojphc19zdHI6Omg3NGM2Mjc0MTk5NzBjYzA18QEzYWxsb2M6OmFsbG9jOjpoYW5kbGVfYWxsb2NfZXJyb3I6OmhkZWM4MWExMjBjMjgzMzRk8gFCc3RkOjpzeXM6OmJhY2t0cmFjZTo6X19ydXN0X2VuZF9zaG9ydF9iYWNrdHJhY2U6OmhmOWZiNDAzMWI5ZjI3NzY48wE0Y29yZTo6cGFuaWM6OlBhbmljUGF5bG9hZDo6YXNfc3RyOjpoMjQxOTM4OGU5MTg1OTYxZPQBBHBvd2b1AQZhdGFuMmb2AUVfX3J1c3RjW2ViODk0NmUzNjgzOTY0NGFdOjpfX3J1c3RfYWxsb2NfZXJyb3JfaGFuZGxlcl9zaG91bGRfcGFuaWNfdjL3AS1fX3J1c3RjW2ViODk0NmUzNjgzOTY0NGFdOjpfX3J1c3Rfc3RhcnRfcGFuaWP4AQRleHBm+QEFYWNvc2b6AQRzaW5m+wEEY29zZvwBPl9fcnVzdGNbZWI4OTQ2ZTM2ODM5NjQ0YV06Ol9fcnVzdF9ub19hbGxvY19zaGltX2lzX3Vuc3RhYmxlX3Yy/QEnX19ydXN0Y1tlYjg5NDZlMzY4Mzk2NDRhXTo6X19ydXN0X2Fib3J0BxIBAA9fX3N0YWNrX3BvaW50ZXIJEQIABy5yb2RhdGEBBS5kYXRhAHAJcHJvZHVjZXJzAghsYW5ndWFnZQEEUnVzdAAMcHJvY2Vzc2VkLWJ5AwVydXN0Yx0xLjkxLjEgKGVkNjFlN2Q3ZSAyMDI1LTExLTA3KQZ3YWxydXMGMC4yMy4zDHdhc20tYmluZGdlbgcwLjIuMTAwAJ0BD3RhcmdldF9mZWF0dXJlcwkrC2J1bGstbWVtb3J5Kw9idWxrLW1lbW9yeS1vcHQrFmNhbGwtaW5kaXJlY3Qtb3ZlcmxvbmcrCm11bHRpdmFsdWUrD211dGFibGUtZ2xvYmFscysTbm9udHJhcHBpbmctZnB0b2ludCsPcmVmZXJlbmNlLXR5cGVzKwhzaWduLWV4dCsHc2ltZDEyOA==", import.meta.url));
  const A = uA();
  (typeof I == "string" || typeof Request == "function" && I instanceof Request || typeof URL == "function" && I instanceof URL) && (I = fetch(I));
  const { instance: Q, module: B } = await VA(await I, A);
  return zA(Q, B);
}
const x = _();
function GA(I) {
  const { width: A, height: Q, data: B } = I, i = new Uint8ClampedArray(A * Q);
  for (let g = 0, C = 0; g < B.length; g += 4, C++)
    i[C] = B[g] * 54 + B[g + 1] * 183 + B[g + 2] * 19 >> 8;
  return i;
}
function PA(I, A, Q, B = 5, i = 0) {
  i === 0 && (i = 0.3 * ((B - 1) * 0.5 - 1) + 0.8);
  const g = Math.floor(B / 2), C = vA(B, i), D = new Uint8ClampedArray(A * Q), o = new Uint8ClampedArray(A * Q);
  for (let E = 0; E < Q; E++) {
    const h = E * A;
    for (let a = 0; a < A; a++) {
      let s = 0;
      for (let G = -g; G <= g; G++) {
        const w = Math.min(A - 1, Math.max(0, a + G));
        s += I[h + w] * C[g + G];
      }
      D[h + a] = s;
    }
  }
  for (let E = 0; E < A; E++)
    for (let h = 0; h < Q; h++) {
      let a = 0;
      for (let s = -g; s <= g; s++) {
        const G = Math.min(Q - 1, Math.max(0, h + s));
        a += D[G * A + E] * C[g + s];
      }
      o[h * A + E] = Math.round(a);
    }
  return o;
}
function vA(I, A) {
  const Q = new Float32Array(I), B = Math.floor(I / 2);
  let i = 0;
  for (let g = 0; g < I; g++) {
    const C = g - B;
    Q[g] = Math.exp(-(C * C) / (2 * A * A)), i += Q[g];
  }
  for (let g = 0; g < I; g++)
    Q[g] /= i;
  return Q;
}
function _A(I, A, Q) {
  const B = new Int16Array(A * Q), i = new Int16Array(A * Q);
  for (let g = 1; g < Q - 1; g++) {
    const C = g * A, D = (g - 1) * A, o = (g + 1) * A;
    for (let E = 1; E < A - 1; E++) {
      const h = C + E, a = I[D + E - 1], s = I[D + E], G = I[D + E + 1], w = I[C + E - 1], N = I[C + E + 1], F = I[o + E - 1], J = I[o + E], c = I[o + E + 1], y = G - a + 2 * (N - w) + (c - F), t = F + 2 * J + c - (a + 2 * s + G);
      B[h] = y, i[h] = t;
    }
  }
  return { dx: B, dy: i };
}
function $A(I, A, Q, B, i) {
  const g = new Float32Array(Q * B), C = new Float32Array(Q * B);
  for (let D = 0; D < I.length; D++) {
    const o = I[D], E = A[D];
    i ? g[D] = Math.sqrt(o * o + E * E) : g[D] = Math.abs(o) + Math.abs(E);
  }
  for (let D = 1; D < B - 1; D++)
    for (let o = 1; o < Q - 1; o++) {
      const E = D * Q + o, h = g[E];
      if (h === 0) {
        C[E] = 0;
        continue;
      }
      const a = I[E], s = A[E];
      let G = 0, w = 0;
      const N = Math.abs(a), F = Math.abs(s);
      if (F > N * 2.4142)
        G = g[E - Q], w = g[E + Q];
      else if (N > F * 2.4142)
        G = g[E - 1], w = g[E + 1];
      else {
        const J = (a ^ s) < 0 ? -1 : 1;
        s > 0 ? (G = g[(D - 1) * Q + (o - J)], w = g[(D + 1) * Q + (o + J)]) : (G = g[(D + 1) * Q + (o - J)], w = g[(D - 1) * Q + (o + J)]), a > 0 && s > 0 || a < 0 && s < 0 ? (G = g[(D - 1) * Q + (o + 1)], w = g[(D + 1) * Q + (o - 1)]) : (G = g[(D - 1) * Q + (o - 1)], w = g[(D + 1) * Q + (o + 1)]);
      }
      h >= G && h >= w ? C[E] = h : C[E] = 0;
    }
  return C;
}
function QA(I, A, Q, B, i) {
  const g = new Uint8Array(A * Q), C = [];
  for (let E = 1; E < Q - 1; E++)
    for (let h = 1; h < A - 1; h++) {
      const a = E * A + h, s = I[a];
      s >= i ? (g[a] = 2, C.push({ x: h, y: E })) : s >= B ? g[a] = 0 : g[a] = 1;
    }
  for (let E = 0; E < A; E++)
    g[E] = 1, g[(Q - 1) * A + E] = 1;
  for (let E = 1; E < Q - 1; E++)
    g[E * A] = 1, g[E * A + A - 1] = 1;
  const D = [-1, 0, 1, -1, 1, -1, 0, 1], o = [-1, -1, -1, 0, 0, 1, 1, 1];
  for (; C.length > 0; ) {
    const { x: E, y: h } = C.pop();
    for (let a = 0; a < 8; a++) {
      const s = E + D[a], G = h + o[a], w = G * A + s;
      g[w] === 0 && (g[w] = 2, C.push({ x: s, y: G }));
    }
  }
  return g;
}
function AI(I, A, Q, B = 5) {
  const i = Math.floor(B / 2), g = new Uint8ClampedArray(A * Q), C = new Uint8ClampedArray(A * Q);
  for (let D = 0; D < Q; D++) {
    const o = D * A;
    for (let E = 0; E < A; E++) {
      let h = 0;
      for (let a = -i; a <= i; a++) {
        const s = E + a;
        if (s >= 0 && s < A) {
          const G = I[o + s];
          G > h && (h = G);
        }
      }
      g[o + E] = h;
    }
  }
  for (let D = 0; D < A; D++)
    for (let o = 0; o < Q; o++) {
      let E = 0;
      for (let h = -i; h <= i; h++) {
        const a = o + h;
        if (a >= 0 && a < Q) {
          const s = g[a * A + D];
          s > E && (E = s);
        }
      }
      C[o * A + D] = E;
    }
  return C;
}
async function II(I, A = {}) {
  const Q = [], B = performance.now(), { width: i, height: g } = I;
  let C = A.lowThreshold !== void 0 ? A.lowThreshold : 75, D = A.highThreshold !== void 0 ? A.highThreshold : 200;
  const o = A.kernelSize || 5, E = A.sigma || 0, h = A.L2gradient === void 0 ? !1 : A.L2gradient, a = A.applyDilation !== void 0 ? A.applyDilation : !0, s = A.dilationKernelSize || 5, G = A.useWasmHysteresis !== void 0 ? A.useWasmHysteresis : !1;
  C >= D && (console.warn(`Canny Edge Detector: lowThreshold (${C}) should be lower than highThreshold (${D}). Swapping them.`), [C, D] = [D, C]);
  let w = performance.now();
  const N = GA(I);
  let F = performance.now();
  Q.push({ step: "Grayscale", ms: (F - w).toFixed(2) }), A.debug && (A.debug.grayscale = N);
  let J;
  w = performance.now();
  try {
    await x, J = hA(N, i, g, o, E);
  } catch {
    J = PA(N, i, g, o, E);
  }
  F = performance.now(), Q.push({ step: "Gaussian Blur", ms: (F - w).toFixed(2) }), A.debug && (A.debug.blurred = J), w = performance.now();
  let c, y;
  {
    const R = _A(J, i, g);
    c = R.dx, y = R.dy;
  }
  F = performance.now(), Q.push({ step: "Gradients", ms: (F - w).toFixed(2) }), w = performance.now();
  let t;
  try {
    await x, t = await fA(c, y, i, g, h);
  } catch {
    t = $A(c, y, i, g, h);
  }
  F = performance.now(), Q.push({ step: "Non-Max Suppression", ms: (F - w).toFixed(2) }), w = performance.now();
  const e = h ? C * C : C, L = h ? D * D : D;
  let n;
  if (G)
    try {
      await x, n = jA(t, i, g, e, L);
    } catch (R) {
      console.warn("WASM hysteresis failed, falling back to JS:", R), n = QA(t, i, g, e, L);
    }
  else
    n = QA(t, i, g, e, L);
  F = performance.now(), Q.push({ step: "Hysteresis", ms: (F - w).toFixed(2) }), w = performance.now();
  const U = new Uint8ClampedArray(i * g);
  for (let R = 0; R < n.length; R++)
    U[R] = n[R] === 2 ? 255 : 0;
  F = performance.now(), Q.push({ step: "Binary Image", ms: (F - w).toFixed(2) }), w = performance.now();
  let l = U;
  if (a)
    try {
      await x, l = mA(U, i, g, s);
    } catch {
      l = AI(U, i, g, s);
    }
  if (F = performance.now(), Q.push({ step: "Dilation", ms: (F - w).toFixed(2) }), A.debug) {
    A.debug.dx = c, A.debug.dy = y;
    const R = new Float32Array(i * g);
    for (let M = 0; M < c.length; M++) {
      const T = c[M], j = y[M];
      R[M] = h ? Math.sqrt(T * T + j * j) : Math.abs(T) + Math.abs(j);
    }
    A.debug.magnitude = R, A.debug.suppressed = t, A.debug.edgeMap = n, A.debug.cannyEdges = U, A.debug.finalEdges = l, A.debug.timings = Q;
  }
  const X = performance.now();
  return Q.unshift({ step: "Total", ms: (X - B).toFixed(2) }), console.table(Q), l;
}
const K = _(), v = {
  // Fast detection with reasonable accuracy
  fast: {
    preprocessing: {
      enableClahe: !1,
      enableIlluminationNorm: !1
    },
    edge: {
      gradientOperator: "sobel3x3",
      adaptiveThreshold: !1,
      lowThreshold: 50,
      highThreshold: 150
    },
    postprocessing: {
      closeGaps: !1,
      removeNoise: !1
    },
    detection: {
      useHoughLines: !1,
      minConfidence: 0.3
    }
  },
  // Balanced detection (recommended for most cases)
  balanced: {
    preprocessing: {
      enableClahe: !0,
      claheClip: 2,
      claheGrid: 8,
      enableIlluminationNorm: !1
    },
    edge: {
      gradientOperator: "sobel3x3",
      adaptiveThreshold: !0,
      adaptiveMethod: "percentile"
      // 'fixed', 'otsu', 'percentile'
    },
    postprocessing: {
      closeGaps: !0,
      gapSize: 5,
      removeNoise: !0,
      minComponentArea: 100
    },
    detection: {
      useHoughLines: !0,
      houghThreshold: 50,
      minLineLength: 30,
      maxLineGap: 10,
      minConfidence: 0.4
    }
  },
  // High accuracy detection (slower but more reliable)
  accurate: {
    preprocessing: {
      enableClahe: !0,
      claheClip: 2.5,
      claheGrid: 8,
      enableIlluminationNorm: !0
    },
    edge: {
      gradientOperator: "scharr3x3",
      // Better rotational accuracy
      adaptiveThreshold: !0,
      adaptiveMethod: "percentile"
    },
    postprocessing: {
      closeGaps: !0,
      gapSize: 7,
      removeNoise: !0,
      minComponentArea: 150,
      thinEdges: !0
    },
    detection: {
      useHoughLines: !0,
      houghThreshold: 30,
      minLineLength: 20,
      maxLineGap: 15,
      minConfidence: 0.5,
      refineCorners: !0
    }
  },
  // ID document optimized (passports, driver's licenses, ID cards)
  idDocument: {
    preprocessing: {
      enableClahe: !0,
      claheClip: 3,
      claheGrid: 8,
      enableIlluminationNorm: !0
    },
    edge: {
      gradientOperator: "scharr3x3",
      adaptiveThreshold: !0,
      adaptiveMethod: "percentile"
    },
    postprocessing: {
      closeGaps: !0,
      gapSize: 5,
      removeNoise: !0,
      minComponentArea: 100
    },
    detection: {
      useHoughLines: !0,
      houghThreshold: 40,
      minLineLength: 25,
      maxLineGap: 10,
      minConfidence: 0.5,
      refineCorners: !0,
      // ID documents have specific aspect ratios
      validateAspectRatio: !0,
      expectedAspectRatios: [1.586, 1.42],
      // CR-80, Passport
      aspectTolerance: 0.15
    }
  }
};
async function gI(I, A, Q, B) {
  await K;
  let i = I;
  const g = [];
  if (B.enableIlluminationNorm) {
    const C = performance.now(), D = Math.min(A, Q) / 10;
    i = KA(i, A, Q, D), g.push({ step: "Illumination Norm", ms: (performance.now() - C).toFixed(2) });
  }
  if (B.enableClahe) {
    const C = performance.now();
    i = dA(
      i,
      A,
      Q,
      B.claheGrid || 8,
      B.claheGrid || 8,
      B.claheClip || 2
    ), g.push({ step: "CLAHE", ms: (performance.now() - C).toFixed(2) });
  }
  if (B.enableContrastStretch) {
    const C = performance.now();
    i = bA(i, A, Q), g.push({ step: "Contrast Stretch", ms: (performance.now() - C).toFixed(2) });
  }
  return { processed: i, timings: g };
}
async function QI(I, A, Q, B) {
  await K;
  const i = B.gradientOperator || "sobel3x3";
  let g;
  const C = performance.now();
  switch (i) {
    case "scharr3x3":
      g = TA(I, A, Q);
      break;
    case "sobel5x5":
      g = WA(I, A, Q);
      break;
    case "sobel3x3_simd":
      g = xA(I, A, Q);
      break;
    case "sobel3x3":
    default:
      g = ZA(I, A, Q);
      break;
  }
  const D = performance.now() - C;
  return { gradients: g, elapsed: D };
}
async function CI(I, A, Q, B) {
  switch (await K, B.adaptiveMethod || "percentile") {
    case "otsu": {
      const g = new Uint8Array(I.length), C = Math.max(...I);
      for (let o = 0; o < I.length; o++)
        g[o] = Math.min(255, Math.floor(I[o] / C * 255));
      const D = YA(g, A, Q);
      return {
        low: D * 0.4 * C / 255,
        high: D * C / 255
      };
    }
    case "percentile":
    default: {
      const g = lA(I, A, Q, 0.4, 0.7);
      return {
        low: g[0],
        high: g[1]
      };
    }
  }
}
async function BI(I, A = {}) {
  await K;
  const { width: Q, height: B } = I, i = A.preset ? v[A.preset] : A, g = i.preprocessing || {}, C = i.edge || {}, D = i.postprocessing || {}, o = [], E = A.debug ? {} : null;
  let h = performance.now();
  const a = GA(I);
  o.push({ step: "Grayscale", ms: (performance.now() - h).toFixed(2) }), E && (E.grayscale = a);
  const { processed: s, timings: G } = await gI(
    a,
    Q,
    B,
    g
  );
  o.push(...G), E && (E.preprocessed = s), h = performance.now();
  const w = C.kernelSize || 5, N = C.sigma || 0, F = hA(s, Q, B, w, N);
  o.push({ step: "Gaussian Blur", ms: (performance.now() - h).toFixed(2) }), E && (E.blurred = F);
  const { gradients: J, elapsed: c } = await QI(
    F,
    Q,
    B,
    C
  );
  o.push({ step: "Gradients", ms: c.toFixed(2) }), h = performance.now();
  const y = OA(J, Q, B, !0), t = new Float32Array(Q * B), e = new Float32Array(Q * B);
  for (let M = 0; M < Q * B; M++)
    t[M] = y[2 * M], e[M] = y[2 * M + 1];
  o.push({ step: "Magnitude/Direction", ms: (performance.now() - h).toFixed(2) }), E && (E.magnitude = t, E.direction = e, E.gradients = J), h = performance.now();
  const L = XA(t, e, Q, B);
  o.push({ step: "NMS (Precise)", ms: (performance.now() - h).toFixed(2) }), E && (E.suppressed = L);
  let n = C.lowThreshold || 50, U = C.highThreshold || 150;
  if (C.adaptiveThreshold) {
    h = performance.now();
    const M = await CI(L, Q, B, C);
    n = M.low, U = M.high, o.push({ step: "Adaptive Threshold", ms: (performance.now() - h).toFixed(2) }), E && (E.adaptiveThresholds = { low: n, high: U });
  }
  h = performance.now();
  const l = new Uint8Array(Q * B);
  for (let M = 0; M < L.length; M++)
    L[M] >= U ? l[M] = 255 : L[M] >= n && (l[M] = 128);
  const X = EI(l, Q, B);
  o.push({ step: "Hysteresis", ms: (performance.now() - h).toFixed(2) }), E && (E.beforePost = new Uint8Array(X));
  let R = X;
  return D.closeGaps && (h = performance.now(), R = nA(R, Q, B, D.gapSize || 5), o.push({ step: "Close Gaps", ms: (performance.now() - h).toFixed(2) })), D.removeNoise && (h = performance.now(), R = LA(
    R,
    Q,
    B,
    D.minComponentArea || 100
  ), o.push({ step: "Remove Noise", ms: (performance.now() - h).toFixed(2) })), D.thinEdges && (h = performance.now(), R = qA(R, Q, B), o.push({ step: "Thin Edges", ms: (performance.now() - h).toFixed(2) })), E && (E.finalEdges = R, E.timings = o), console.table(o), {
    edges: new Uint8ClampedArray(R),
    gradients: J,
    magnitude: t,
    direction: e,
    debug: E
  };
}
function EI(I, A, Q) {
  const B = new Uint8Array(A * Q), i = new Uint8Array(A * Q), g = [];
  for (let D = 0; D < I.length; D++)
    I[D] === 255 && (B[D] = 255, g.push(D));
  const C = [-A - 1, -A, -A + 1, -1, 1, A - 1, A, A + 1];
  for (; g.length > 0; ) {
    const D = g.pop(), o = D % A;
    for (const E of C) {
      const h = D + E, a = h % A;
      h >= 0 && h < I.length && Math.abs(a - o) <= 1 && !i[h] && (i[h] = 1, I[h] === 128 && (B[h] = 255, g.push(h)));
    }
  }
  return B;
}
async function iI(I, A, Q, B = {}) {
  await K;
  const i = B.detection || B, g = [];
  let C = performance.now();
  const D = UA(
    I,
    A,
    Q,
    1,
    // rho resolution
    1,
    // theta resolution (degrees)
    i.houghThreshold || 50,
    100
    // max lines
  );
  g.push({ step: "Hough Lines", ms: (performance.now() - C).toFixed(2) });
  const o = D.length / 3;
  if (console.log(`Detected ${o} lines`), o < 4)
    return {
      success: !1,
      message: "Not enough lines detected",
      timings: g
    };
  C = performance.now();
  const E = eA(
    D,
    A,
    Q,
    i.minAreaRatio || 0.05,
    i.maxAreaRatio || 0.95
  );
  if (g.push({ step: "Find Quadrilateral", ms: (performance.now() - C).toFixed(2) }), E.length === 0)
    return {
      success: !1,
      message: "No valid quadrilateral found",
      lines: CA(D),
      timings: g
    };
  const h = {
    topLeft: { x: E[0], y: E[1] },
    topRight: { x: E[2], y: E[3] },
    bottomRight: { x: E[4], y: E[5] },
    bottomLeft: { x: E[6], y: E[7] }
  }, a = E[8];
  C = performance.now();
  const s = z(new Float32Array([
    E[0],
    E[1],
    E[2],
    E[3],
    E[4],
    E[5],
    E[6],
    E[7]
  ]));
  g.push({ step: "Validate Quad", ms: (performance.now() - C).toFixed(2) });
  const G = {
    shapeScore: s[0],
    convexityScore: s[1],
    angleScore: s[2],
    parallelismScore: s[3],
    aspectRatio: s[4],
    aspectScore: s[5],
    documentType: ["unknown", "id_card", "passport", "paper"][s[6]] || "unknown"
  }, w = u(
    new Float32Array([E[0], E[1], E[2], E[3], E[4], E[5], E[6], E[7]]),
    A,
    Q,
    0.05,
    // min coverage
    0.95,
    // max coverage
    0.3
    // ideal coverage
  ), N = P(
    a / 100,
    // Normalize line confidence
    G.shapeScore,
    G.aspectScore,
    w
  );
  return console.table(g), {
    success: N >= (i.minConfidence || 0.4),
    corners: h,
    confidence: N,
    validation: G,
    sizeScore: w,
    lines: CA(D),
    timings: g
  };
}
function CA(I) {
  const A = [];
  for (let Q = 0; Q < I.length; Q += 3)
    A.push({
      rho: I[Q],
      theta: I[Q + 1],
      thetaDegrees: I[Q + 1] * 180 / Math.PI,
      votes: I[Q + 2]
    });
  return A;
}
async function sA(I, A = {}) {
  await K;
  const Q = A.preset || "balanced", B = v[Q] || v.balanced, i = {
    ...B,
    ...A,
    preprocessing: { ...B.preprocessing, ...A.preprocessing },
    edge: { ...B.edge, ...A.edge },
    postprocessing: { ...B.postprocessing, ...A.postprocessing },
    detection: { ...B.detection, ...A.detection }
  }, { width: g, height: C } = I, D = A.debug ? {} : null, o = await BI(I, {
    ...i,
    debug: D ? {} : null
  });
  D && (D.edgeDetection = o.debug);
  let E;
  if (i.detection.useHoughLines)
    if (E = await iI(
      o.edges,
      g,
      C,
      i
    ), E.success)
      E.method = "hough";
    else {
      console.log("Hough detection failed, trying contour detection...");
      const { detectDocumentContour: h } = await Promise.resolve().then(() => AA), { findCornerPoints: a } = await Promise.resolve().then(() => IA), s = h(o.edges, {
        minArea: 1e3,
        width: g,
        height: C
      });
      if (s && s.length > 0) {
        const G = a(s[0]), w = new Float32Array([
          G.topLeft.x,
          G.topLeft.y,
          G.topRight.x,
          G.topRight.y,
          G.bottomRight.x,
          G.bottomRight.y,
          G.bottomLeft.x,
          G.bottomLeft.y
        ]), N = z(w), F = u(w, g, C, 0.05, 0.95, 0.3), J = gA(
          o.gradients,
          g,
          C,
          w,
          20
          // sample points
        ), c = P(J, N[0], N[5], F);
        E = {
          success: c >= (i.detection.minConfidence || 0.4),
          corners: G,
          confidence: c,
          validation: {
            shapeScore: N[0],
            convexityScore: N[1],
            angleScore: N[2],
            parallelismScore: N[3],
            aspectRatio: N[4],
            aspectScore: N[5],
            documentType: ["unknown", "id_card", "passport", "paper"][N[6]] || "unknown"
          },
          sizeScore: F,
          edgeScore: J,
          method: "contour"
        };
      }
    }
  else {
    const { detectDocumentContour: h } = await Promise.resolve().then(() => AA), { findCornerPoints: a } = await Promise.resolve().then(() => IA), s = h(o.edges, {
      minArea: 1e3,
      width: g,
      height: C
    });
    if (s && s.length > 0) {
      const G = a(s[0]), w = new Float32Array([
        G.topLeft.x,
        G.topLeft.y,
        G.topRight.x,
        G.topRight.y,
        G.bottomRight.x,
        G.bottomRight.y,
        G.bottomLeft.x,
        G.bottomLeft.y
      ]), N = z(w), F = u(w, g, C, 0.05, 0.95, 0.3), J = gA(o.gradients, g, C, w, 20), c = P(J, N[0], N[5], F);
      E = {
        success: c >= (i.detection.minConfidence || 0.4),
        corners: G,
        confidence: c,
        validation: {
          shapeScore: N[0],
          convexityScore: N[1],
          angleScore: N[2],
          parallelismScore: N[3],
          aspectRatio: N[4],
          aspectScore: N[5],
          documentType: ["unknown", "id_card", "passport", "paper"][N[6]] || "unknown"
        },
        sizeScore: F,
        edgeScore: J,
        method: "contour"
      };
    } else
      E = {
        success: !1,
        message: "No document contours found"
      };
  }
  if (E.success && i.detection.refineCorners && E.corners) {
    const h = new Float32Array([
      E.corners.topLeft.x,
      E.corners.topLeft.y,
      E.corners.topRight.x,
      E.corners.topRight.y,
      E.corners.bottomRight.x,
      E.corners.bottomRight.y,
      E.corners.bottomLeft.x,
      E.corners.bottomLeft.y
    ]), a = HA(o.gradients, g, C, h, 5);
    E.corners = {
      topLeft: { x: a[0], y: a[1] },
      topRight: { x: a[2], y: a[3] },
      bottomRight: { x: a[4], y: a[5] },
      bottomLeft: { x: a[6], y: a[7] }
    }, E.cornersRefined = !0;
  }
  return D && (D.detection = E, D.edges = o.edges), {
    ...E,
    edges: o.edges,
    debug: D
  };
}
async function aI(I, A = {}) {
  return sA(I, {
    preset: "fast",
    ...A
  });
}
async function kI(I, A = {}) {
  return sA(I, {
    preset: "idDocument",
    ...A
  });
}
function DI(I, A = 800) {
  const { width: Q, height: B } = I, i = Math.max(Q, B);
  if (i <= A)
    return {
      scaledImageData: I,
      scaleFactor: 1,
      originalDimensions: { width: Q, height: B },
      scaledDimensions: { width: Q, height: B }
    };
  const g = A / i, C = Math.round(Q * g), D = Math.round(B * g), o = document.createElement("canvas");
  o.width = Q, o.height = B, o.getContext("2d").putImageData(I, 0, 0);
  const h = document.createElement("canvas");
  h.width = C, h.height = D;
  const a = h.getContext("2d");
  return a.imageSmoothingEnabled = !0, a.imageSmoothingQuality = "high", a.drawImage(o, 0, 0, Q, B, 0, 0, C, D), {
    scaledImageData: a.getImageData(0, 0, C, D),
    scaleFactor: 1 / g,
    // Return inverse for compatibility with existing code
    originalDimensions: { width: Q, height: B },
    scaledDimensions: { width: C, height: D }
  };
}
async function oI(I, A = {}) {
  const Q = A.debug ? {} : null, B = A.maxProcessingDimension || 800, { scaledImageData: i, scaleFactor: g, originalDimensions: C, scaledDimensions: D } = DI(I, B);
  Q && (Q.preprocessing = {
    originalDimensions: C,
    scaledDimensions: D,
    scaleFactor: g,
    maxProcessingDimension: B
  });
  const { width: o, height: E } = i, h = await II(i, {
    lowThreshold: A.lowThreshold || 75,
    // Match OpenCV values
    highThreshold: A.highThreshold || 200,
    // Match OpenCV values
    dilationKernelSize: A.dilationKernelSize || 3,
    // Match OpenCV value 
    dilationIterations: A.dilationIterations || 1,
    debug: Q
  }), a = BA(h, {
    minArea: (A.minArea || 1e3) / (g * g),
    // Adjust minArea for scaled image
    debug: Q,
    width: o,
    height: E
  });
  if (!a || a.length === 0)
    return console.log("No document detected"), {
      success: !1,
      message: "No document detected",
      debug: Q
    };
  const s = a[0], G = iA(s, {
    epsilon: A.epsilon
    // Pass epsilon for approximation
  });
  let w = G;
  return g !== 1 && (w = {
    topLeft: { x: G.topLeft.x * g, y: G.topLeft.y * g },
    topRight: { x: G.topRight.x * g, y: G.topRight.y * g },
    bottomRight: { x: G.bottomRight.x * g, y: G.bottomRight.y * g },
    bottomLeft: { x: G.bottomLeft.x * g, y: G.bottomLeft.y * g }
  }), {
    success: !0,
    contour: s,
    corners: w,
    debug: Q
  };
}
function hI(I, A) {
  function Q(o) {
    const E = [];
    for (let h = 0; h < 4; h++) {
      const [a, s] = o[h];
      E.push([a, s, 1, 0, 0, 0, -a * A[h][0], -s * A[h][0]]), E.push([0, 0, 0, a, s, 1, -a * A[h][1], -s * A[h][1]]);
    }
    return E;
  }
  const B = Q(I), i = [
    A[0][0],
    A[0][1],
    A[1][0],
    A[1][1],
    A[2][0],
    A[2][1],
    A[3][0],
    A[3][1]
  ];
  function g(o, E) {
    const h = o.length, a = o[0].length, s = o.map((N) => N.slice()), G = E.slice();
    for (let N = 0; N < a; N++) {
      let F = N;
      for (let J = N + 1; J < h; J++)
        Math.abs(s[J][N]) > Math.abs(s[F][N]) && (F = J);
      [s[N], s[F]] = [s[F], s[N]], [G[N], G[F]] = [G[F], G[N]];
      for (let J = N + 1; J < h; J++) {
        const c = s[J][N] / s[N][N];
        for (let y = N; y < a; y++)
          s[J][y] -= c * s[N][y];
        G[J] -= c * G[N];
      }
    }
    const w = new Array(a);
    for (let N = a - 1; N >= 0; N--) {
      let F = G[N];
      for (let J = N + 1; J < a; J++)
        F -= s[N][J] * w[J];
      w[N] = F / s[N][N];
    }
    return w;
  }
  const C = g(B, i);
  return [
    [C[0], C[1], C[2]],
    [C[3], C[4], C[5]],
    [C[6], C[7], 1]
  ];
}
function aA(I, A, Q) {
  const { topLeft: B, topRight: i, bottomRight: g, bottomLeft: C } = Q, D = Math.hypot(g.x - C.x, g.y - C.y), o = Math.hypot(i.x - B.x, i.y - B.y), E = Math.round(Math.max(D, o)), h = Math.hypot(i.x - g.x, i.y - g.y), a = Math.hypot(B.x - C.x, B.y - C.y), s = Math.round(Math.max(h, a));
  I.canvas.width = E, I.canvas.height = s;
  const G = [
    [B.x, B.y],
    [i.x, i.y],
    [g.x, g.y],
    [C.x, C.y]
  ], w = [
    [0, 0],
    [E - 1, 0],
    [E - 1, s - 1],
    [0, s - 1]
  ], N = hI(G, w);
  sI(I, A, N, E, s);
}
function GI(I) {
  const A = I[0][0], Q = I[0][1], B = I[0][2], i = I[1][0], g = I[1][1], C = I[1][2], D = I[2][0], o = I[2][1], E = I[2][2], h = g * E - C * o, a = -(i * E - C * D), s = i * o - g * D, G = -(Q * E - B * o), w = A * E - B * D, N = -(A * o - Q * D), F = Q * C - B * g, J = -(A * C - B * i), c = A * g - Q * i, y = A * h + Q * a + B * s;
  if (y === 0) throw new Error("Singular matrix");
  return [
    [h / y, G / y, F / y],
    [a / y, w / y, J / y],
    [s / y, N / y, c / y]
  ];
}
function sI(I, A, Q, B, i) {
  const g = GI(Q), C = document.createElement("canvas");
  C.width = A.width || A.naturalWidth, C.height = A.height || A.naturalHeight;
  const D = C.getContext("2d");
  D.drawImage(A, 0, 0, C.width, C.height);
  const o = D.getImageData(0, 0, C.width, C.height), E = I.createImageData(B, i);
  for (let h = 0; h < i; h++)
    for (let a = 0; a < B; a++) {
      const s = g[2][0] * a + g[2][1] * h + g[2][2], G = (g[0][0] * a + g[0][1] * h + g[0][2]) / s, w = (g[1][0] * a + g[1][1] * h + g[1][2]) / s, N = Math.max(0, Math.min(C.width - 2, G)), F = Math.max(0, Math.min(C.height - 2, w)), J = Math.floor(N), c = Math.floor(F), y = N - J, t = F - c;
      for (let e = 0; e < 4; e++) {
        const L = o.data[(c * C.width + J) * 4 + e], n = o.data[(c * C.width + (J + 1)) * 4 + e], U = o.data[((c + 1) * C.width + J) * 4 + e], l = o.data[((c + 1) * C.width + (J + 1)) * 4 + e];
        E.data[(h * B + a) * 4 + e] = (1 - y) * (1 - t) * L + y * (1 - t) * n + (1 - y) * t * U + y * t * l;
      }
    }
  I.putImageData(E, 0, 0);
}
async function NI(I, A, Q = {}) {
  const B = Q.output || "canvas";
  if (!A || !A.topLeft || !A.topRight || !A.bottomRight || !A.bottomLeft)
    return {
      output: null,
      corners: null,
      success: !1,
      message: "Invalid corner points provided"
    };
  try {
    const i = document.createElement("canvas"), g = i.getContext("2d");
    aA(g, I, A);
    let C;
    return B === "canvas" ? C = i : B === "imagedata" ? C = i.getContext("2d").getImageData(0, 0, i.width, i.height) : B === "dataurl" ? C = i.toDataURL() : C = i, {
      output: C,
      corners: A,
      success: !0,
      message: "Document extracted successfully"
    };
  } catch (i) {
    return {
      output: null,
      corners: A,
      success: !1,
      message: `Extraction failed: ${i.message}`
    };
  }
}
async function wI(I, A = {}) {
  const Q = A.mode || "detect", B = A.output || "canvas";
  A.debug;
  let i;
  if (I instanceof ImageData)
    i = I, I.width, I.height;
  else {
    const o = document.createElement("canvas");
    o.width = I.width || I.naturalWidth, o.height = I.height || I.naturalHeight;
    const E = o.getContext("2d");
    E.drawImage(I, 0, 0, o.width, o.height), i = E.getImageData(0, 0, o.width, o.height), o.width, o.height;
  }
  const g = await oI(i, A);
  if (!g.success)
    return {
      output: null,
      corners: null,
      contour: null,
      debug: g.debug,
      success: !1,
      message: g.message || "No document detected"
    };
  let C, D;
  if (Q === "detect")
    D = null;
  else if (Q === "extract") {
    C = document.createElement("canvas");
    const o = C.getContext("2d");
    aA(o, I, g.corners);
  }
  return Q !== "detect" && C && (B === "canvas" ? D = C : B === "imagedata" ? D = C.getContext("2d").getImageData(0, 0, C.width, C.height) : B === "dataurl" ? D = C.toDataURL() : D = C), {
    output: D,
    corners: g.corners,
    contour: g.contour,
    debug: g.debug,
    success: !0,
    message: "Document detected"
  };
}
export {
  v as DETECTION_PRESETS,
  iI as detectDocumentHough,
  kI as detectIDDocument,
  sA as enhancedDocumentDetection,
  BI as enhancedEdgeDetection,
  NI as extractDocument,
  aI as quickDocumentDetection,
  wI as scanDocument
};
//# sourceMappingURL=scanic.js.map
