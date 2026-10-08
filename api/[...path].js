import { createRequire as __holderpayCreateRequire } from "node:module";
const require = __holderpayCreateRequire(import.meta.url);
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});
var __commonJS = (cb, mod) => function __require2() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// node_modules/blakejs/util.js
var require_util = __commonJS({
  "node_modules/blakejs/util.js"(exports, module) {
    var ERROR_MSG_INPUT = "Input must be an string, Buffer or Uint8Array";
    function normalizeInput(input) {
      let ret;
      if (input instanceof Uint8Array) {
        ret = input;
      } else if (typeof input === "string") {
        const encoder = new TextEncoder();
        ret = encoder.encode(input);
      } else {
        throw new Error(ERROR_MSG_INPUT);
      }
      return ret;
    }
    function toHex3(bytes) {
      return Array.prototype.map.call(bytes, function(n) {
        return (n < 16 ? "0" : "") + n.toString(16);
      }).join("");
    }
    function uint32ToHex(val) {
      return (4294967296 + val).toString(16).substring(1);
    }
    function debugPrint(label, arr, size) {
      let msg = "\n" + label + " = ";
      for (let i = 0; i < arr.length; i += 2) {
        if (size === 32) {
          msg += uint32ToHex(arr[i]).toUpperCase();
          msg += " ";
          msg += uint32ToHex(arr[i + 1]).toUpperCase();
        } else if (size === 64) {
          msg += uint32ToHex(arr[i + 1]).toUpperCase();
          msg += uint32ToHex(arr[i]).toUpperCase();
        } else throw new Error("Invalid size " + size);
        if (i % 6 === 4) {
          msg += "\n" + new Array(label.length + 4).join(" ");
        } else if (i < arr.length - 2) {
          msg += " ";
        }
      }
      console.log(msg);
    }
    function testSpeed(hashFn, N, M) {
      let startMs = (/* @__PURE__ */ new Date()).getTime();
      const input = new Uint8Array(N);
      for (let i = 0; i < N; i++) {
        input[i] = i % 256;
      }
      const genMs = (/* @__PURE__ */ new Date()).getTime();
      console.log("Generated random input in " + (genMs - startMs) + "ms");
      startMs = genMs;
      for (let i = 0; i < M; i++) {
        const hashHex = hashFn(input);
        const hashMs = (/* @__PURE__ */ new Date()).getTime();
        const ms = hashMs - startMs;
        startMs = hashMs;
        console.log("Hashed in " + ms + "ms: " + hashHex.substring(0, 20) + "...");
        console.log(
          Math.round(N / (1 << 20) / (ms / 1e3) * 100) / 100 + " MB PER SECOND"
        );
      }
    }
    module.exports = {
      normalizeInput,
      toHex: toHex3,
      debugPrint,
      testSpeed
    };
  }
});

// node_modules/blakejs/blake2b.js
var require_blake2b = __commonJS({
  "node_modules/blakejs/blake2b.js"(exports, module) {
    var util = require_util();
    function ADD64AA(v2, a, b) {
      const o0 = v2[a] + v2[b];
      let o1 = v2[a + 1] + v2[b + 1];
      if (o0 >= 4294967296) {
        o1++;
      }
      v2[a] = o0;
      v2[a + 1] = o1;
    }
    function ADD64AC(v2, a, b0, b1) {
      let o0 = v2[a] + b0;
      if (b0 < 0) {
        o0 += 4294967296;
      }
      let o1 = v2[a + 1] + b1;
      if (o0 >= 4294967296) {
        o1++;
      }
      v2[a] = o0;
      v2[a + 1] = o1;
    }
    function B2B_GET32(arr, i) {
      return arr[i] ^ arr[i + 1] << 8 ^ arr[i + 2] << 16 ^ arr[i + 3] << 24;
    }
    function B2B_G(a, b, c, d, ix, iy) {
      const x0 = m[ix];
      const x1 = m[ix + 1];
      const y0 = m[iy];
      const y1 = m[iy + 1];
      ADD64AA(v, a, b);
      ADD64AC(v, a, x0, x1);
      let xor0 = v[d] ^ v[a];
      let xor1 = v[d + 1] ^ v[a + 1];
      v[d] = xor1;
      v[d + 1] = xor0;
      ADD64AA(v, c, d);
      xor0 = v[b] ^ v[c];
      xor1 = v[b + 1] ^ v[c + 1];
      v[b] = xor0 >>> 24 ^ xor1 << 8;
      v[b + 1] = xor1 >>> 24 ^ xor0 << 8;
      ADD64AA(v, a, b);
      ADD64AC(v, a, y0, y1);
      xor0 = v[d] ^ v[a];
      xor1 = v[d + 1] ^ v[a + 1];
      v[d] = xor0 >>> 16 ^ xor1 << 16;
      v[d + 1] = xor1 >>> 16 ^ xor0 << 16;
      ADD64AA(v, c, d);
      xor0 = v[b] ^ v[c];
      xor1 = v[b + 1] ^ v[c + 1];
      v[b] = xor1 >>> 31 ^ xor0 << 1;
      v[b + 1] = xor0 >>> 31 ^ xor1 << 1;
    }
    var BLAKE2B_IV32 = new Uint32Array([
      4089235720,
      1779033703,
      2227873595,
      3144134277,
      4271175723,
      1013904242,
      1595750129,
      2773480762,
      2917565137,
      1359893119,
      725511199,
      2600822924,
      4215389547,
      528734635,
      327033209,
      1541459225
    ]);
    var SIGMA8 = [
      0,
      1,
      2,
      3,
      4,
      5,
      6,
      7,
      8,
      9,
      10,
      11,
      12,
      13,
      14,
      15,
      14,
      10,
      4,
      8,
      9,
      15,
      13,
      6,
      1,
      12,
      0,
      2,
      11,
      7,
      5,
      3,
      11,
      8,
      12,
      0,
      5,
      2,
      15,
      13,
      10,
      14,
      3,
      6,
      7,
      1,
      9,
      4,
      7,
      9,
      3,
      1,
      13,
      12,
      11,
      14,
      2,
      6,
      5,
      10,
      4,
      0,
      15,
      8,
      9,
      0,
      5,
      7,
      2,
      4,
      10,
      15,
      14,
      1,
      11,
      12,
      6,
      8,
      3,
      13,
      2,
      12,
      6,
      10,
      0,
      11,
      8,
      3,
      4,
      13,
      7,
      5,
      15,
      14,
      1,
      9,
      12,
      5,
      1,
      15,
      14,
      13,
      4,
      10,
      0,
      7,
      6,
      3,
      9,
      2,
      8,
      11,
      13,
      11,
      7,
      14,
      12,
      1,
      3,
      9,
      5,
      0,
      15,
      4,
      8,
      6,
      2,
      10,
      6,
      15,
      14,
      9,
      11,
      3,
      0,
      8,
      12,
      2,
      13,
      7,
      1,
      4,
      10,
      5,
      10,
      2,
      8,
      4,
      7,
      6,
      1,
      5,
      15,
      11,
      9,
      14,
      3,
      12,
      13,
      0,
      0,
      1,
      2,
      3,
      4,
      5,
      6,
      7,
      8,
      9,
      10,
      11,
      12,
      13,
      14,
      15,
      14,
      10,
      4,
      8,
      9,
      15,
      13,
      6,
      1,
      12,
      0,
      2,
      11,
      7,
      5,
      3
    ];
    var SIGMA82 = new Uint8Array(
      SIGMA8.map(function(x) {
        return x * 2;
      })
    );
    var v = new Uint32Array(32);
    var m = new Uint32Array(32);
    function blake2bCompress(ctx, last) {
      let i = 0;
      for (i = 0; i < 16; i++) {
        v[i] = ctx.h[i];
        v[i + 16] = BLAKE2B_IV32[i];
      }
      v[24] = v[24] ^ ctx.t;
      v[25] = v[25] ^ ctx.t / 4294967296;
      if (last) {
        v[28] = ~v[28];
        v[29] = ~v[29];
      }
      for (i = 0; i < 32; i++) {
        m[i] = B2B_GET32(ctx.b, 4 * i);
      }
      for (i = 0; i < 12; i++) {
        B2B_G(0, 8, 16, 24, SIGMA82[i * 16 + 0], SIGMA82[i * 16 + 1]);
        B2B_G(2, 10, 18, 26, SIGMA82[i * 16 + 2], SIGMA82[i * 16 + 3]);
        B2B_G(4, 12, 20, 28, SIGMA82[i * 16 + 4], SIGMA82[i * 16 + 5]);
        B2B_G(6, 14, 22, 30, SIGMA82[i * 16 + 6], SIGMA82[i * 16 + 7]);
        B2B_G(0, 10, 20, 30, SIGMA82[i * 16 + 8], SIGMA82[i * 16 + 9]);
        B2B_G(2, 12, 22, 24, SIGMA82[i * 16 + 10], SIGMA82[i * 16 + 11]);
        B2B_G(4, 14, 16, 26, SIGMA82[i * 16 + 12], SIGMA82[i * 16 + 13]);
        B2B_G(6, 8, 18, 28, SIGMA82[i * 16 + 14], SIGMA82[i * 16 + 15]);
      }
      for (i = 0; i < 16; i++) {
        ctx.h[i] = ctx.h[i] ^ v[i] ^ v[i + 16];
      }
    }
    var parameterBlock = new Uint8Array([
      0,
      0,
      0,
      0,
      //  0: outlen, keylen, fanout, depth
      0,
      0,
      0,
      0,
      //  4: leaf length, sequential mode
      0,
      0,
      0,
      0,
      //  8: node offset
      0,
      0,
      0,
      0,
      // 12: node offset
      0,
      0,
      0,
      0,
      // 16: node depth, inner length, rfu
      0,
      0,
      0,
      0,
      // 20: rfu
      0,
      0,
      0,
      0,
      // 24: rfu
      0,
      0,
      0,
      0,
      // 28: rfu
      0,
      0,
      0,
      0,
      // 32: salt
      0,
      0,
      0,
      0,
      // 36: salt
      0,
      0,
      0,
      0,
      // 40: salt
      0,
      0,
      0,
      0,
      // 44: salt
      0,
      0,
      0,
      0,
      // 48: personal
      0,
      0,
      0,
      0,
      // 52: personal
      0,
      0,
      0,
      0,
      // 56: personal
      0,
      0,
      0,
      0
      // 60: personal
    ]);
    function blake2bInit(outlen, key, salt, personal) {
      if (outlen === 0 || outlen > 64) {
        throw new Error("Illegal output length, expected 0 < length <= 64");
      }
      if (key && key.length > 64) {
        throw new Error("Illegal key, expected Uint8Array with 0 < length <= 64");
      }
      if (salt && salt.length !== 16) {
        throw new Error("Illegal salt, expected Uint8Array with length is 16");
      }
      if (personal && personal.length !== 16) {
        throw new Error("Illegal personal, expected Uint8Array with length is 16");
      }
      const ctx = {
        b: new Uint8Array(128),
        h: new Uint32Array(16),
        t: 0,
        // input count
        c: 0,
        // pointer within buffer
        outlen
        // output length in bytes
      };
      parameterBlock.fill(0);
      parameterBlock[0] = outlen;
      if (key) parameterBlock[1] = key.length;
      parameterBlock[2] = 1;
      parameterBlock[3] = 1;
      if (salt) parameterBlock.set(salt, 32);
      if (personal) parameterBlock.set(personal, 48);
      for (let i = 0; i < 16; i++) {
        ctx.h[i] = BLAKE2B_IV32[i] ^ B2B_GET32(parameterBlock, i * 4);
      }
      if (key) {
        blake2bUpdate(ctx, key);
        ctx.c = 128;
      }
      return ctx;
    }
    function blake2bUpdate(ctx, input) {
      for (let i = 0; i < input.length; i++) {
        if (ctx.c === 128) {
          ctx.t += ctx.c;
          blake2bCompress(ctx, false);
          ctx.c = 0;
        }
        ctx.b[ctx.c++] = input[i];
      }
    }
    function blake2bFinal(ctx) {
      ctx.t += ctx.c;
      while (ctx.c < 128) {
        ctx.b[ctx.c++] = 0;
      }
      blake2bCompress(ctx, true);
      const out = new Uint8Array(ctx.outlen);
      for (let i = 0; i < ctx.outlen; i++) {
        out[i] = ctx.h[i >> 2] >> 8 * (i & 3);
      }
      return out;
    }
    function blake2b2(input, key, outlen, salt, personal) {
      outlen = outlen || 64;
      input = util.normalizeInput(input);
      if (salt) {
        salt = util.normalizeInput(salt);
      }
      if (personal) {
        personal = util.normalizeInput(personal);
      }
      const ctx = blake2bInit(outlen, key, salt, personal);
      blake2bUpdate(ctx, input);
      return blake2bFinal(ctx);
    }
    function blake2bHex4(input, key, outlen, salt, personal) {
      const output = blake2b2(input, key, outlen, salt, personal);
      return util.toHex(output);
    }
    module.exports = {
      blake2b: blake2b2,
      blake2bHex: blake2bHex4,
      blake2bInit,
      blake2bUpdate,
      blake2bFinal
    };
  }
});

// node_modules/blakejs/blake2s.js
var require_blake2s = __commonJS({
  "node_modules/blakejs/blake2s.js"(exports, module) {
    var util = require_util();
    function B2S_GET32(v2, i) {
      return v2[i] ^ v2[i + 1] << 8 ^ v2[i + 2] << 16 ^ v2[i + 3] << 24;
    }
    function B2S_G(a, b, c, d, x, y) {
      v[a] = v[a] + v[b] + x;
      v[d] = ROTR32(v[d] ^ v[a], 16);
      v[c] = v[c] + v[d];
      v[b] = ROTR32(v[b] ^ v[c], 12);
      v[a] = v[a] + v[b] + y;
      v[d] = ROTR32(v[d] ^ v[a], 8);
      v[c] = v[c] + v[d];
      v[b] = ROTR32(v[b] ^ v[c], 7);
    }
    function ROTR32(x, y) {
      return x >>> y ^ x << 32 - y;
    }
    var BLAKE2S_IV = new Uint32Array([
      1779033703,
      3144134277,
      1013904242,
      2773480762,
      1359893119,
      2600822924,
      528734635,
      1541459225
    ]);
    var SIGMA = new Uint8Array([
      0,
      1,
      2,
      3,
      4,
      5,
      6,
      7,
      8,
      9,
      10,
      11,
      12,
      13,
      14,
      15,
      14,
      10,
      4,
      8,
      9,
      15,
      13,
      6,
      1,
      12,
      0,
      2,
      11,
      7,
      5,
      3,
      11,
      8,
      12,
      0,
      5,
      2,
      15,
      13,
      10,
      14,
      3,
      6,
      7,
      1,
      9,
      4,
      7,
      9,
      3,
      1,
      13,
      12,
      11,
      14,
      2,
      6,
      5,
      10,
      4,
      0,
      15,
      8,
      9,
      0,
      5,
      7,
      2,
      4,
      10,
      15,
      14,
      1,
      11,
      12,
      6,
      8,
      3,
      13,
      2,
      12,
      6,
      10,
      0,
      11,
      8,
      3,
      4,
      13,
      7,
      5,
      15,
      14,
      1,
      9,
      12,
      5,
      1,
      15,
      14,
      13,
      4,
      10,
      0,
      7,
      6,
      3,
      9,
      2,
      8,
      11,
      13,
      11,
      7,
      14,
      12,
      1,
      3,
      9,
      5,
      0,
      15,
      4,
      8,
      6,
      2,
      10,
      6,
      15,
      14,
      9,
      11,
      3,
      0,
      8,
      12,
      2,
      13,
      7,
      1,
      4,
      10,
      5,
      10,
      2,
      8,
      4,
      7,
      6,
      1,
      5,
      15,
      11,
      9,
      14,
      3,
      12,
      13,
      0
    ]);
    var v = new Uint32Array(16);
    var m = new Uint32Array(16);
    function blake2sCompress(ctx, last) {
      let i = 0;
      for (i = 0; i < 8; i++) {
        v[i] = ctx.h[i];
        v[i + 8] = BLAKE2S_IV[i];
      }
      v[12] ^= ctx.t;
      v[13] ^= ctx.t / 4294967296;
      if (last) {
        v[14] = ~v[14];
      }
      for (i = 0; i < 16; i++) {
        m[i] = B2S_GET32(ctx.b, 4 * i);
      }
      for (i = 0; i < 10; i++) {
        B2S_G(0, 4, 8, 12, m[SIGMA[i * 16 + 0]], m[SIGMA[i * 16 + 1]]);
        B2S_G(1, 5, 9, 13, m[SIGMA[i * 16 + 2]], m[SIGMA[i * 16 + 3]]);
        B2S_G(2, 6, 10, 14, m[SIGMA[i * 16 + 4]], m[SIGMA[i * 16 + 5]]);
        B2S_G(3, 7, 11, 15, m[SIGMA[i * 16 + 6]], m[SIGMA[i * 16 + 7]]);
        B2S_G(0, 5, 10, 15, m[SIGMA[i * 16 + 8]], m[SIGMA[i * 16 + 9]]);
        B2S_G(1, 6, 11, 12, m[SIGMA[i * 16 + 10]], m[SIGMA[i * 16 + 11]]);
        B2S_G(2, 7, 8, 13, m[SIGMA[i * 16 + 12]], m[SIGMA[i * 16 + 13]]);
        B2S_G(3, 4, 9, 14, m[SIGMA[i * 16 + 14]], m[SIGMA[i * 16 + 15]]);
      }
      for (i = 0; i < 8; i++) {
        ctx.h[i] ^= v[i] ^ v[i + 8];
      }
    }
    function blake2sInit(outlen, key) {
      if (!(outlen > 0 && outlen <= 32)) {
        throw new Error("Incorrect output length, should be in [1, 32]");
      }
      const keylen = key ? key.length : 0;
      if (key && !(keylen > 0 && keylen <= 32)) {
        throw new Error("Incorrect key length, should be in [1, 32]");
      }
      const ctx = {
        h: new Uint32Array(BLAKE2S_IV),
        // hash state
        b: new Uint8Array(64),
        // input block
        c: 0,
        // pointer within block
        t: 0,
        // input count
        outlen
        // output length in bytes
      };
      ctx.h[0] ^= 16842752 ^ keylen << 8 ^ outlen;
      if (keylen > 0) {
        blake2sUpdate(ctx, key);
        ctx.c = 64;
      }
      return ctx;
    }
    function blake2sUpdate(ctx, input) {
      for (let i = 0; i < input.length; i++) {
        if (ctx.c === 64) {
          ctx.t += ctx.c;
          blake2sCompress(ctx, false);
          ctx.c = 0;
        }
        ctx.b[ctx.c++] = input[i];
      }
    }
    function blake2sFinal(ctx) {
      ctx.t += ctx.c;
      while (ctx.c < 64) {
        ctx.b[ctx.c++] = 0;
      }
      blake2sCompress(ctx, true);
      const out = new Uint8Array(ctx.outlen);
      for (let i = 0; i < ctx.outlen; i++) {
        out[i] = ctx.h[i >> 2] >> 8 * (i & 3) & 255;
      }
      return out;
    }
    function blake2s(input, key, outlen) {
      outlen = outlen || 32;
      input = util.normalizeInput(input);
      const ctx = blake2sInit(outlen, key);
      blake2sUpdate(ctx, input);
      return blake2sFinal(ctx);
    }
    function blake2sHex(input, key, outlen) {
      const output = blake2s(input, key, outlen);
      return util.toHex(output);
    }
    module.exports = {
      blake2s,
      blake2sHex,
      blake2sInit,
      blake2sUpdate,
      blake2sFinal
    };
  }
});

// node_modules/blakejs/index.js
var require_blakejs = __commonJS({
  "node_modules/blakejs/index.js"(exports, module) {
    var b2b = require_blake2b();
    var b2s = require_blake2s();
    module.exports = {
      blake2b: b2b.blake2b,
      blake2bHex: b2b.blake2bHex,
      blake2bInit: b2b.blake2bInit,
      blake2bUpdate: b2b.blake2bUpdate,
      blake2bFinal: b2b.blake2bFinal,
      blake2s: b2s.blake2s,
      blake2sHex: b2s.blake2sHex,
      blake2sInit: b2s.blake2sInit,
      blake2sUpdate: b2s.blake2sUpdate,
      blake2sFinal: b2s.blake2sFinal
    };
  }
});

// node_modules/bignumber.js/bignumber.js
var require_bignumber = __commonJS({
  "node_modules/bignumber.js/bignumber.js"(exports, module) {
    (function(globalObject) {
      "use strict";
      var BigNumber, isNumeric = /^-?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i, mathceil = Math.ceil, mathfloor = Math.floor, bignumberError = "[BigNumber Error] ", tooManyDigits = bignumberError + "Number primitive has more than 15 significant digits: ", BASE = 1e14, LOG_BASE = 14, MAX_SAFE_INTEGER = 9007199254740991, POWS_TEN = [1, 10, 100, 1e3, 1e4, 1e5, 1e6, 1e7, 1e8, 1e9, 1e10, 1e11, 1e12, 1e13], SQRT_BASE = 1e7, MAX = 1e9;
      function clone(configObject) {
        var div, convertBase, parseNumeric, P = BigNumber2.prototype = { constructor: BigNumber2, toString: null, valueOf: null }, ONE = new BigNumber2(1), DECIMAL_PLACES = 20, ROUNDING_MODE = 4, TO_EXP_NEG = -7, TO_EXP_POS = 21, MIN_EXP = -1e7, MAX_EXP = 1e7, CRYPTO = false, MODULO_MODE = 1, POW_PRECISION = 0, FORMAT = {
          prefix: "",
          groupSize: 3,
          secondaryGroupSize: 0,
          groupSeparator: ",",
          decimalSeparator: ".",
          fractionGroupSize: 0,
          fractionGroupSeparator: "\xA0",
          // non-breaking space
          suffix: ""
        }, ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyz", alphabetHasNormalDecimalDigits = true;
        function BigNumber2(v, b) {
          var alphabet, c, caseChanged, e, i, isNum, len, str, x = this;
          if (!(x instanceof BigNumber2)) return new BigNumber2(v, b);
          if (b == null) {
            if (v && v._isBigNumber === true) {
              x.s = v.s;
              if (!v.c || v.e > MAX_EXP) {
                x.c = x.e = null;
              } else if (v.e < MIN_EXP) {
                x.c = [x.e = 0];
              } else {
                x.e = v.e;
                x.c = v.c.slice();
              }
              return;
            }
            if ((isNum = typeof v == "number") && v * 0 == 0) {
              x.s = 1 / v < 0 ? (v = -v, -1) : 1;
              if (v === ~~v) {
                for (e = 0, i = v; i >= 10; i /= 10, e++) ;
                if (e > MAX_EXP) {
                  x.c = x.e = null;
                } else {
                  x.e = e;
                  x.c = [v];
                }
                return;
              }
              str = String(v);
            } else {
              if (!isNumeric.test(str = String(v))) return parseNumeric(x, str, isNum);
              x.s = str.charCodeAt(0) == 45 ? (str = str.slice(1), -1) : 1;
            }
            if ((e = str.indexOf(".")) > -1) str = str.replace(".", "");
            if ((i = str.search(/e/i)) > 0) {
              if (e < 0) e = i;
              e += +str.slice(i + 1);
              str = str.substring(0, i);
            } else if (e < 0) {
              e = str.length;
            }
          } else {
            intCheck(b, 2, ALPHABET.length, "Base");
            if (b == 10 && alphabetHasNormalDecimalDigits) {
              x = new BigNumber2(v);
              return round(x, DECIMAL_PLACES + x.e + 1, ROUNDING_MODE);
            }
            str = String(v);
            if (isNum = typeof v == "number") {
              if (v * 0 != 0) return parseNumeric(x, str, isNum, b);
              x.s = 1 / v < 0 ? (str = str.slice(1), -1) : 1;
              if (BigNumber2.DEBUG && str.replace(/^0\.0*|\./, "").length > 15) {
                throw Error(tooManyDigits + v);
              }
            } else {
              x.s = str.charCodeAt(0) === 45 ? (str = str.slice(1), -1) : 1;
            }
            alphabet = ALPHABET.slice(0, b);
            e = i = 0;
            for (len = str.length; i < len; i++) {
              if (alphabet.indexOf(c = str.charAt(i)) < 0) {
                if (c == ".") {
                  if (i > e) {
                    e = len;
                    continue;
                  }
                } else if (!caseChanged) {
                  if (str == str.toUpperCase() && (str = str.toLowerCase()) || str == str.toLowerCase() && (str = str.toUpperCase())) {
                    caseChanged = true;
                    i = -1;
                    e = 0;
                    continue;
                  }
                }
                return parseNumeric(x, String(v), isNum, b);
              }
            }
            isNum = false;
            str = convertBase(str, b, 10, x.s);
            if ((e = str.indexOf(".")) > -1) str = str.replace(".", "");
            else e = str.length;
          }
          for (i = 0; str.charCodeAt(i) === 48; i++) ;
          for (len = str.length; str.charCodeAt(--len) === 48; ) ;
          if (str = str.slice(i, ++len)) {
            len -= i;
            if (isNum && BigNumber2.DEBUG && len > 15 && (v > MAX_SAFE_INTEGER || v !== mathfloor(v))) {
              throw Error(tooManyDigits + x.s * v);
            }
            if ((e = e - i - 1) > MAX_EXP) {
              x.c = x.e = null;
            } else if (e < MIN_EXP) {
              x.c = [x.e = 0];
            } else {
              x.e = e;
              x.c = [];
              i = (e + 1) % LOG_BASE;
              if (e < 0) i += LOG_BASE;
              if (i < len) {
                if (i) x.c.push(+str.slice(0, i));
                for (len -= LOG_BASE; i < len; ) {
                  x.c.push(+str.slice(i, i += LOG_BASE));
                }
                i = LOG_BASE - (str = str.slice(i)).length;
              } else {
                i -= len;
              }
              for (; i--; str += "0") ;
              x.c.push(+str);
            }
          } else {
            x.c = [x.e = 0];
          }
        }
        BigNumber2.clone = clone;
        BigNumber2.ROUND_UP = 0;
        BigNumber2.ROUND_DOWN = 1;
        BigNumber2.ROUND_CEIL = 2;
        BigNumber2.ROUND_FLOOR = 3;
        BigNumber2.ROUND_HALF_UP = 4;
        BigNumber2.ROUND_HALF_DOWN = 5;
        BigNumber2.ROUND_HALF_EVEN = 6;
        BigNumber2.ROUND_HALF_CEIL = 7;
        BigNumber2.ROUND_HALF_FLOOR = 8;
        BigNumber2.EUCLID = 9;
        BigNumber2.config = BigNumber2.set = function(obj) {
          var p, v;
          if (obj != null) {
            if (typeof obj == "object") {
              if (obj.hasOwnProperty(p = "DECIMAL_PLACES")) {
                v = obj[p];
                intCheck(v, 0, MAX, p);
                DECIMAL_PLACES = v;
              }
              if (obj.hasOwnProperty(p = "ROUNDING_MODE")) {
                v = obj[p];
                intCheck(v, 0, 8, p);
                ROUNDING_MODE = v;
              }
              if (obj.hasOwnProperty(p = "EXPONENTIAL_AT")) {
                v = obj[p];
                if (v && v.pop) {
                  intCheck(v[0], -MAX, 0, p);
                  intCheck(v[1], 0, MAX, p);
                  TO_EXP_NEG = v[0];
                  TO_EXP_POS = v[1];
                } else {
                  intCheck(v, -MAX, MAX, p);
                  TO_EXP_NEG = -(TO_EXP_POS = v < 0 ? -v : v);
                }
              }
              if (obj.hasOwnProperty(p = "RANGE")) {
                v = obj[p];
                if (v && v.pop) {
                  intCheck(v[0], -MAX, -1, p);
                  intCheck(v[1], 1, MAX, p);
                  MIN_EXP = v[0];
                  MAX_EXP = v[1];
                } else {
                  intCheck(v, -MAX, MAX, p);
                  if (v) {
                    MIN_EXP = -(MAX_EXP = v < 0 ? -v : v);
                  } else {
                    throw Error(bignumberError + p + " cannot be zero: " + v);
                  }
                }
              }
              if (obj.hasOwnProperty(p = "CRYPTO")) {
                v = obj[p];
                if (v === !!v) {
                  if (v) {
                    if (typeof crypto != "undefined" && crypto && (crypto.getRandomValues || crypto.randomBytes)) {
                      CRYPTO = v;
                    } else {
                      CRYPTO = !v;
                      throw Error(bignumberError + "crypto unavailable");
                    }
                  } else {
                    CRYPTO = v;
                  }
                } else {
                  throw Error(bignumberError + p + " not true or false: " + v);
                }
              }
              if (obj.hasOwnProperty(p = "MODULO_MODE")) {
                v = obj[p];
                intCheck(v, 0, 9, p);
                MODULO_MODE = v;
              }
              if (obj.hasOwnProperty(p = "POW_PRECISION")) {
                v = obj[p];
                intCheck(v, 0, MAX, p);
                POW_PRECISION = v;
              }
              if (obj.hasOwnProperty(p = "FORMAT")) {
                v = obj[p];
                if (typeof v == "object") FORMAT = v;
                else throw Error(bignumberError + p + " not an object: " + v);
              }
              if (obj.hasOwnProperty(p = "ALPHABET")) {
                v = obj[p];
                if (typeof v == "string" && !/^.?$|[+\-.\s]|(.).*\1/.test(v)) {
                  alphabetHasNormalDecimalDigits = v.slice(0, 10) == "0123456789";
                  ALPHABET = v;
                } else {
                  throw Error(bignumberError + p + " invalid: " + v);
                }
              }
            } else {
              throw Error(bignumberError + "Object expected: " + obj);
            }
          }
          return {
            DECIMAL_PLACES,
            ROUNDING_MODE,
            EXPONENTIAL_AT: [TO_EXP_NEG, TO_EXP_POS],
            RANGE: [MIN_EXP, MAX_EXP],
            CRYPTO,
            MODULO_MODE,
            POW_PRECISION,
            FORMAT,
            ALPHABET
          };
        };
        BigNumber2.isBigNumber = function(v) {
          if (!v || v._isBigNumber !== true) return false;
          if (!BigNumber2.DEBUG) return true;
          var i, n, c = v.c, e = v.e, s = v.s;
          out: if ({}.toString.call(c) == "[object Array]") {
            if ((s === 1 || s === -1) && e >= -MAX && e <= MAX && e === mathfloor(e)) {
              if (c[0] === 0) {
                if (e === 0 && c.length === 1) return true;
                break out;
              }
              i = (e + 1) % LOG_BASE;
              if (i < 1) i += LOG_BASE;
              if (String(c[0]).length == i) {
                for (i = 0; i < c.length; i++) {
                  n = c[i];
                  if (n < 0 || n >= BASE || n !== mathfloor(n)) break out;
                }
                if (n !== 0) return true;
              }
            }
          } else if (c === null && e === null && (s === null || s === 1 || s === -1)) {
            return true;
          }
          throw Error(bignumberError + "Invalid BigNumber: " + v);
        };
        BigNumber2.maximum = BigNumber2.max = function() {
          return maxOrMin(arguments, -1);
        };
        BigNumber2.minimum = BigNumber2.min = function() {
          return maxOrMin(arguments, 1);
        };
        BigNumber2.random = (function() {
          var pow2_53 = 9007199254740992;
          var random53bitInt = Math.random() * pow2_53 & 2097151 ? function() {
            return mathfloor(Math.random() * pow2_53);
          } : function() {
            return (Math.random() * 1073741824 | 0) * 8388608 + (Math.random() * 8388608 | 0);
          };
          return function(dp) {
            var a, b, e, k, v, i = 0, c = [], rand = new BigNumber2(ONE);
            if (dp == null) dp = DECIMAL_PLACES;
            else intCheck(dp, 0, MAX);
            k = mathceil(dp / LOG_BASE);
            if (CRYPTO) {
              if (crypto.getRandomValues) {
                a = crypto.getRandomValues(new Uint32Array(k *= 2));
                for (; i < k; ) {
                  v = a[i] * 131072 + (a[i + 1] >>> 11);
                  if (v >= 9e15) {
                    b = crypto.getRandomValues(new Uint32Array(2));
                    a[i] = b[0];
                    a[i + 1] = b[1];
                  } else {
                    c.push(v % 1e14);
                    i += 2;
                  }
                }
                i = k / 2;
              } else if (crypto.randomBytes) {
                a = crypto.randomBytes(k *= 7);
                for (; i < k; ) {
                  v = (a[i] & 31) * 281474976710656 + a[i + 1] * 1099511627776 + a[i + 2] * 4294967296 + a[i + 3] * 16777216 + (a[i + 4] << 16) + (a[i + 5] << 8) + a[i + 6];
                  if (v >= 9e15) {
                    crypto.randomBytes(7).copy(a, i);
                  } else {
                    c.push(v % 1e14);
                    i += 7;
                  }
                }
                i = k / 7;
              } else {
                CRYPTO = false;
                throw Error(bignumberError + "crypto unavailable");
              }
            }
            if (!CRYPTO) {
              for (; i < k; ) {
                v = random53bitInt();
                if (v < 9e15) c[i++] = v % 1e14;
              }
            }
            k = c[--i];
            dp %= LOG_BASE;
            if (k && dp) {
              v = POWS_TEN[LOG_BASE - dp];
              c[i] = mathfloor(k / v) * v;
            }
            for (; c[i] === 0; c.pop(), i--) ;
            if (i < 0) {
              c = [e = 0];
            } else {
              for (e = -1; c[0] === 0; c.splice(0, 1), e -= LOG_BASE) ;
              for (i = 1, v = c[0]; v >= 10; v /= 10, i++) ;
              if (i < LOG_BASE) e -= LOG_BASE - i;
            }
            rand.e = e;
            rand.c = c;
            return rand;
          };
        })();
        BigNumber2.sum = function() {
          var i = 1, args = arguments, sum = new BigNumber2(args[0]);
          for (; i < args.length; ) sum = sum.plus(args[i++]);
          return sum;
        };
        convertBase = /* @__PURE__ */ (function() {
          var decimal = "0123456789";
          function toBaseOut(str, baseIn, baseOut, alphabet) {
            var j, arr = [0], arrL, i = 0, len = str.length;
            for (; i < len; ) {
              for (arrL = arr.length; arrL--; arr[arrL] *= baseIn) ;
              arr[0] += alphabet.indexOf(str.charAt(i++));
              for (j = 0; j < arr.length; j++) {
                if (arr[j] > baseOut - 1) {
                  if (arr[j + 1] == null) arr[j + 1] = 0;
                  arr[j + 1] += arr[j] / baseOut | 0;
                  arr[j] %= baseOut;
                }
              }
            }
            return arr.reverse();
          }
          return function(str, baseIn, baseOut, sign, callerIsToString) {
            var alphabet, d, e, k, r, x, xc, y, i = str.indexOf("."), dp = DECIMAL_PLACES, rm = ROUNDING_MODE;
            if (i >= 0) {
              k = POW_PRECISION;
              POW_PRECISION = 0;
              str = str.replace(".", "");
              y = new BigNumber2(baseIn);
              x = y.pow(str.length - i);
              POW_PRECISION = k;
              y.c = toBaseOut(
                toFixedPoint(coeffToString(x.c), x.e, "0"),
                10,
                baseOut,
                decimal
              );
              y.e = y.c.length;
            }
            xc = toBaseOut(str, baseIn, baseOut, callerIsToString ? (alphabet = ALPHABET, decimal) : (alphabet = decimal, ALPHABET));
            e = k = xc.length;
            for (; xc[--k] == 0; xc.pop()) ;
            if (!xc[0]) return alphabet.charAt(0);
            if (i < 0) {
              --e;
            } else {
              x.c = xc;
              x.e = e;
              x.s = sign;
              x = div(x, y, dp, rm, baseOut);
              xc = x.c;
              r = x.r;
              e = x.e;
            }
            d = e + dp + 1;
            i = xc[d];
            k = baseOut / 2;
            r = r || d < 0 || xc[d + 1] != null;
            r = rm < 4 ? (i != null || r) && (rm == 0 || rm == (x.s < 0 ? 3 : 2)) : i > k || i == k && (rm == 4 || r || rm == 6 && xc[d - 1] & 1 || rm == (x.s < 0 ? 8 : 7));
            if (d < 1 || !xc[0]) {
              str = r ? toFixedPoint(alphabet.charAt(1), -dp, alphabet.charAt(0)) : alphabet.charAt(0);
            } else {
              xc.length = d;
              if (r) {
                for (--baseOut; ++xc[--d] > baseOut; ) {
                  xc[d] = 0;
                  if (!d) {
                    ++e;
                    xc = [1].concat(xc);
                  }
                }
              }
              for (k = xc.length; !xc[--k]; ) ;
              for (i = 0, str = ""; i <= k; str += alphabet.charAt(xc[i++])) ;
              str = toFixedPoint(str, e, alphabet.charAt(0));
            }
            return str;
          };
        })();
        div = /* @__PURE__ */ (function() {
          function multiply(x, k, base) {
            var m, temp, xlo, xhi, carry = 0, i = x.length, klo = k % SQRT_BASE, khi = k / SQRT_BASE | 0;
            for (x = x.slice(); i--; ) {
              xlo = x[i] % SQRT_BASE;
              xhi = x[i] / SQRT_BASE | 0;
              m = khi * xlo + xhi * klo;
              temp = klo * xlo + m % SQRT_BASE * SQRT_BASE + carry;
              carry = (temp / base | 0) + (m / SQRT_BASE | 0) + khi * xhi;
              x[i] = temp % base;
            }
            if (carry) x = [carry].concat(x);
            return x;
          }
          function compare2(a, b, aL, bL) {
            var i, cmp;
            if (aL != bL) {
              cmp = aL > bL ? 1 : -1;
            } else {
              for (i = cmp = 0; i < aL; i++) {
                if (a[i] != b[i]) {
                  cmp = a[i] > b[i] ? 1 : -1;
                  break;
                }
              }
            }
            return cmp;
          }
          function subtract(a, b, aL, base) {
            var i = 0;
            for (; aL--; ) {
              a[aL] -= i;
              i = a[aL] < b[aL] ? 1 : 0;
              a[aL] = i * base + a[aL] - b[aL];
            }
            for (; !a[0] && a.length > 1; a.splice(0, 1)) ;
          }
          return function(x, y, dp, rm, base) {
            var cmp, e, i, more, n, prod, prodL, q, qc, rem, remL, rem0, xi, xL, yc0, yL, yz, s = x.s == y.s ? 1 : -1, xc = x.c, yc = y.c;
            if (!xc || !xc[0] || !yc || !yc[0]) {
              return new BigNumber2(
                // Return NaN if either NaN, or both Infinity or 0.
                !x.s || !y.s || (xc ? yc && xc[0] == yc[0] : !yc) ? NaN : (
                  // Return ±0 if x is ±0 or y is ±Infinity, or return ±Infinity as y is ±0.
                  xc && xc[0] == 0 || !yc ? s * 0 : s / 0
                )
              );
            }
            q = new BigNumber2(s);
            qc = q.c = [];
            e = x.e - y.e;
            s = dp + e + 1;
            if (!base) {
              base = BASE;
              e = bitFloor(x.e / LOG_BASE) - bitFloor(y.e / LOG_BASE);
              s = s / LOG_BASE | 0;
            }
            for (i = 0; yc[i] == (xc[i] || 0); i++) ;
            if (yc[i] > (xc[i] || 0)) e--;
            if (s < 0) {
              qc.push(1);
              more = true;
            } else {
              xL = xc.length;
              yL = yc.length;
              i = 0;
              s += 2;
              n = mathfloor(base / (yc[0] + 1));
              if (n > 1) {
                yc = multiply(yc, n, base);
                xc = multiply(xc, n, base);
                yL = yc.length;
                xL = xc.length;
              }
              xi = yL;
              rem = xc.slice(0, yL);
              remL = rem.length;
              for (; remL < yL; rem[remL++] = 0) ;
              yz = yc.slice();
              yz = [0].concat(yz);
              yc0 = yc[0];
              if (yc[1] >= base / 2) yc0++;
              do {
                n = 0;
                cmp = compare2(yc, rem, yL, remL);
                if (cmp < 0) {
                  rem0 = rem[0];
                  if (yL != remL) rem0 = rem0 * base + (rem[1] || 0);
                  n = mathfloor(rem0 / yc0);
                  if (n > 1) {
                    if (n >= base) n = base - 1;
                    prod = multiply(yc, n, base);
                    prodL = prod.length;
                    remL = rem.length;
                    while (compare2(prod, rem, prodL, remL) == 1) {
                      n--;
                      subtract(prod, yL < prodL ? yz : yc, prodL, base);
                      prodL = prod.length;
                      cmp = 1;
                    }
                  } else {
                    if (n == 0) {
                      cmp = n = 1;
                    }
                    prod = yc.slice();
                    prodL = prod.length;
                  }
                  if (prodL < remL) prod = [0].concat(prod);
                  subtract(rem, prod, remL, base);
                  remL = rem.length;
                  if (cmp == -1) {
                    while (compare2(yc, rem, yL, remL) < 1) {
                      n++;
                      subtract(rem, yL < remL ? yz : yc, remL, base);
                      remL = rem.length;
                    }
                  }
                } else if (cmp === 0) {
                  n++;
                  rem = [0];
                }
                qc[i++] = n;
                if (rem[0]) {
                  rem[remL++] = xc[xi] || 0;
                } else {
                  rem = [xc[xi]];
                  remL = 1;
                }
              } while ((xi++ < xL || rem[0] != null) && s--);
              more = rem[0] != null;
              if (!qc[0]) qc.splice(0, 1);
            }
            if (base == BASE) {
              for (i = 1, s = qc[0]; s >= 10; s /= 10, i++) ;
              round(q, dp + (q.e = i + e * LOG_BASE - 1) + 1, rm, more);
            } else {
              q.e = e;
              q.r = +more;
            }
            return q;
          };
        })();
        function format(n, i, rm, id) {
          var c0, e, ne, len, str;
          if (rm == null) rm = ROUNDING_MODE;
          else intCheck(rm, 0, 8);
          if (!n.c) return n.toString();
          c0 = n.c[0];
          ne = n.e;
          if (i == null) {
            str = coeffToString(n.c);
            str = id == 1 || id == 2 && (ne <= TO_EXP_NEG || ne >= TO_EXP_POS) ? toExponential(str, ne) : toFixedPoint(str, ne, "0");
          } else {
            n = round(new BigNumber2(n), i, rm);
            e = n.e;
            str = coeffToString(n.c);
            len = str.length;
            if (id == 1 || id == 2 && (i <= e || e <= TO_EXP_NEG)) {
              for (; len < i; str += "0", len++) ;
              str = toExponential(str, e);
            } else {
              i -= ne + (id === 2 && e > ne);
              str = toFixedPoint(str, e, "0");
              if (e + 1 > len) {
                if (--i > 0) for (str += "."; i--; str += "0") ;
              } else {
                i += e - len;
                if (i > 0) {
                  if (e + 1 == len) str += ".";
                  for (; i--; str += "0") ;
                }
              }
            }
          }
          return n.s < 0 && c0 ? "-" + str : str;
        }
        function maxOrMin(args, n) {
          var k, y, i = 1, x = new BigNumber2(args[0]);
          for (; i < args.length; i++) {
            y = new BigNumber2(args[i]);
            if (!y.s || (k = compare(x, y)) === n || k === 0 && x.s === n) {
              x = y;
            }
          }
          return x;
        }
        function normalise(n, c, e) {
          var i = 1, j = c.length;
          for (; !c[--j]; c.pop()) ;
          for (j = c[0]; j >= 10; j /= 10, i++) ;
          if ((e = i + e * LOG_BASE - 1) > MAX_EXP) {
            n.c = n.e = null;
          } else if (e < MIN_EXP) {
            n.c = [n.e = 0];
          } else {
            n.e = e;
            n.c = c;
          }
          return n;
        }
        parseNumeric = /* @__PURE__ */ (function() {
          var basePrefix = /^(-?)0([xbo])(?=\w[\w.]*$)/i, dotAfter = /^([^.]+)\.$/, dotBefore = /^\.([^.]+)$/, isInfinityOrNaN = /^-?(Infinity|NaN)$/, whitespaceOrPlus = /^\s*\+(?=[\w.])|^\s+|\s+$/g;
          return function(x, str, isNum, b) {
            var base, s = isNum ? str : str.replace(whitespaceOrPlus, "");
            if (isInfinityOrNaN.test(s)) {
              x.s = isNaN(s) ? null : s < 0 ? -1 : 1;
            } else {
              if (!isNum) {
                s = s.replace(basePrefix, function(m, p1, p2) {
                  base = (p2 = p2.toLowerCase()) == "x" ? 16 : p2 == "b" ? 2 : 8;
                  return !b || b == base ? p1 : m;
                });
                if (b) {
                  base = b;
                  s = s.replace(dotAfter, "$1").replace(dotBefore, "0.$1");
                }
                if (str != s) return new BigNumber2(s, base);
              }
              if (BigNumber2.DEBUG) {
                throw Error(bignumberError + "Not a" + (b ? " base " + b : "") + " number: " + str);
              }
              x.s = null;
            }
            x.c = x.e = null;
          };
        })();
        function round(x, sd, rm, r) {
          var d, i, j, k, n, ni, rd, xc = x.c, pows10 = POWS_TEN;
          if (xc) {
            out: {
              for (d = 1, k = xc[0]; k >= 10; k /= 10, d++) ;
              i = sd - d;
              if (i < 0) {
                i += LOG_BASE;
                j = sd;
                n = xc[ni = 0];
                rd = mathfloor(n / pows10[d - j - 1] % 10);
              } else {
                ni = mathceil((i + 1) / LOG_BASE);
                if (ni >= xc.length) {
                  if (r) {
                    for (; xc.length <= ni; xc.push(0)) ;
                    n = rd = 0;
                    d = 1;
                    i %= LOG_BASE;
                    j = i - LOG_BASE + 1;
                  } else {
                    break out;
                  }
                } else {
                  n = k = xc[ni];
                  for (d = 1; k >= 10; k /= 10, d++) ;
                  i %= LOG_BASE;
                  j = i - LOG_BASE + d;
                  rd = j < 0 ? 0 : mathfloor(n / pows10[d - j - 1] % 10);
                }
              }
              r = r || sd < 0 || // Are there any non-zero digits after the rounding digit?
              // The expression  n % pows10[d - j - 1]  returns all digits of n to the right
              // of the digit at j, e.g. if n is 908714 and j is 2, the expression gives 714.
              xc[ni + 1] != null || (j < 0 ? n : n % pows10[d - j - 1]);
              r = rm < 4 ? (rd || r) && (rm == 0 || rm == (x.s < 0 ? 3 : 2)) : rd > 5 || rd == 5 && (rm == 4 || r || rm == 6 && // Check whether the digit to the left of the rounding digit is odd.
              (i > 0 ? j > 0 ? n / pows10[d - j] : 0 : xc[ni - 1]) % 10 & 1 || rm == (x.s < 0 ? 8 : 7));
              if (sd < 1 || !xc[0]) {
                xc.length = 0;
                if (r) {
                  sd -= x.e + 1;
                  xc[0] = pows10[(LOG_BASE - sd % LOG_BASE) % LOG_BASE];
                  x.e = -sd || 0;
                } else {
                  xc[0] = x.e = 0;
                }
                return x;
              }
              if (i == 0) {
                xc.length = ni;
                k = 1;
                ni--;
              } else {
                xc.length = ni + 1;
                k = pows10[LOG_BASE - i];
                xc[ni] = j > 0 ? mathfloor(n / pows10[d - j] % pows10[j]) * k : 0;
              }
              if (r) {
                for (; ; ) {
                  if (ni == 0) {
                    for (i = 1, j = xc[0]; j >= 10; j /= 10, i++) ;
                    j = xc[0] += k;
                    for (k = 1; j >= 10; j /= 10, k++) ;
                    if (i != k) {
                      x.e++;
                      if (xc[0] == BASE) xc[0] = 1;
                    }
                    break;
                  } else {
                    xc[ni] += k;
                    if (xc[ni] != BASE) break;
                    xc[ni--] = 0;
                    k = 1;
                  }
                }
              }
              for (i = xc.length; xc[--i] === 0; xc.pop()) ;
            }
            if (x.e > MAX_EXP) {
              x.c = x.e = null;
            } else if (x.e < MIN_EXP) {
              x.c = [x.e = 0];
            }
          }
          return x;
        }
        function valueOf(n) {
          var str, e = n.e;
          if (e === null) return n.toString();
          str = coeffToString(n.c);
          str = e <= TO_EXP_NEG || e >= TO_EXP_POS ? toExponential(str, e) : toFixedPoint(str, e, "0");
          return n.s < 0 ? "-" + str : str;
        }
        P.absoluteValue = P.abs = function() {
          var x = new BigNumber2(this);
          if (x.s < 0) x.s = 1;
          return x;
        };
        P.comparedTo = function(y, b) {
          return compare(this, new BigNumber2(y, b));
        };
        P.decimalPlaces = P.dp = function(dp, rm) {
          var c, n, v, x = this;
          if (dp != null) {
            intCheck(dp, 0, MAX);
            if (rm == null) rm = ROUNDING_MODE;
            else intCheck(rm, 0, 8);
            return round(new BigNumber2(x), dp + x.e + 1, rm);
          }
          if (!(c = x.c)) return null;
          n = ((v = c.length - 1) - bitFloor(this.e / LOG_BASE)) * LOG_BASE;
          if (v = c[v]) for (; v % 10 == 0; v /= 10, n--) ;
          if (n < 0) n = 0;
          return n;
        };
        P.dividedBy = P.div = function(y, b) {
          return div(this, new BigNumber2(y, b), DECIMAL_PLACES, ROUNDING_MODE);
        };
        P.dividedToIntegerBy = P.idiv = function(y, b) {
          return div(this, new BigNumber2(y, b), 0, 1);
        };
        P.exponentiatedBy = P.pow = function(n, m) {
          var half, isModExp, i, k, more, nIsBig, nIsNeg, nIsOdd, y, x = this;
          n = new BigNumber2(n);
          if (n.c && !n.isInteger()) {
            throw Error(bignumberError + "Exponent not an integer: " + valueOf(n));
          }
          if (m != null) m = new BigNumber2(m);
          nIsBig = n.e > 14;
          if (!x.c || !x.c[0] || x.c[0] == 1 && !x.e && x.c.length == 1 || !n.c || !n.c[0]) {
            y = new BigNumber2(Math.pow(+valueOf(x), nIsBig ? n.s * (2 - isOdd(n)) : +valueOf(n)));
            return m ? y.mod(m) : y;
          }
          nIsNeg = n.s < 0;
          if (m) {
            if (m.c ? !m.c[0] : !m.s) return new BigNumber2(NaN);
            isModExp = !nIsNeg && x.isInteger() && m.isInteger();
            if (isModExp) x = x.mod(m);
          } else if (n.e > 9 && (x.e > 0 || x.e < -1 || (x.e == 0 ? x.c[0] > 1 || nIsBig && x.c[1] >= 24e7 : x.c[0] < 8e13 || nIsBig && x.c[0] <= 9999975e7))) {
            k = x.s < 0 && isOdd(n) ? -0 : 0;
            if (x.e > -1) k = 1 / k;
            return new BigNumber2(nIsNeg ? 1 / k : k);
          } else if (POW_PRECISION) {
            k = mathceil(POW_PRECISION / LOG_BASE + 2);
          }
          if (nIsBig) {
            half = new BigNumber2(0.5);
            if (nIsNeg) n.s = 1;
            nIsOdd = isOdd(n);
          } else {
            i = Math.abs(+valueOf(n));
            nIsOdd = i % 2;
          }
          y = new BigNumber2(ONE);
          for (; ; ) {
            if (nIsOdd) {
              y = y.times(x);
              if (!y.c) break;
              if (k) {
                if (y.c.length > k) y.c.length = k;
              } else if (isModExp) {
                y = y.mod(m);
              }
            }
            if (i) {
              i = mathfloor(i / 2);
              if (i === 0) break;
              nIsOdd = i % 2;
            } else {
              n = n.times(half);
              round(n, n.e + 1, 1);
              if (n.e > 14) {
                nIsOdd = isOdd(n);
              } else {
                i = +valueOf(n);
                if (i === 0) break;
                nIsOdd = i % 2;
              }
            }
            x = x.times(x);
            if (k) {
              if (x.c && x.c.length > k) x.c.length = k;
            } else if (isModExp) {
              x = x.mod(m);
            }
          }
          if (isModExp) return y;
          if (nIsNeg) y = ONE.div(y);
          return m ? y.mod(m) : k ? round(y, POW_PRECISION, ROUNDING_MODE, more) : y;
        };
        P.integerValue = function(rm) {
          var n = new BigNumber2(this);
          if (rm == null) rm = ROUNDING_MODE;
          else intCheck(rm, 0, 8);
          return round(n, n.e + 1, rm);
        };
        P.isEqualTo = P.eq = function(y, b) {
          return compare(this, new BigNumber2(y, b)) === 0;
        };
        P.isFinite = function() {
          return !!this.c;
        };
        P.isGreaterThan = P.gt = function(y, b) {
          return compare(this, new BigNumber2(y, b)) > 0;
        };
        P.isGreaterThanOrEqualTo = P.gte = function(y, b) {
          return (b = compare(this, new BigNumber2(y, b))) === 1 || b === 0;
        };
        P.isInteger = function() {
          return !!this.c && bitFloor(this.e / LOG_BASE) > this.c.length - 2;
        };
        P.isLessThan = P.lt = function(y, b) {
          return compare(this, new BigNumber2(y, b)) < 0;
        };
        P.isLessThanOrEqualTo = P.lte = function(y, b) {
          return (b = compare(this, new BigNumber2(y, b))) === -1 || b === 0;
        };
        P.isNaN = function() {
          return !this.s;
        };
        P.isNegative = function() {
          return this.s < 0;
        };
        P.isPositive = function() {
          return this.s > 0;
        };
        P.isZero = function() {
          return !!this.c && this.c[0] == 0;
        };
        P.minus = function(y, b) {
          var i, j, t, xLTy, x = this, a = x.s;
          y = new BigNumber2(y, b);
          b = y.s;
          if (!a || !b) return new BigNumber2(NaN);
          if (a != b) {
            y.s = -b;
            return x.plus(y);
          }
          var xe = x.e / LOG_BASE, ye = y.e / LOG_BASE, xc = x.c, yc = y.c;
          if (!xe || !ye) {
            if (!xc || !yc) return xc ? (y.s = -b, y) : new BigNumber2(yc ? x : NaN);
            if (!xc[0] || !yc[0]) {
              return yc[0] ? (y.s = -b, y) : new BigNumber2(xc[0] ? x : (
                // IEEE 754 (2008) 6.3: n - n = -0 when rounding to -Infinity
                ROUNDING_MODE == 3 ? -0 : 0
              ));
            }
          }
          xe = bitFloor(xe);
          ye = bitFloor(ye);
          xc = xc.slice();
          if (a = xe - ye) {
            if (xLTy = a < 0) {
              a = -a;
              t = xc;
            } else {
              ye = xe;
              t = yc;
            }
            t.reverse();
            for (b = a; b--; t.push(0)) ;
            t.reverse();
          } else {
            j = (xLTy = (a = xc.length) < (b = yc.length)) ? a : b;
            for (a = b = 0; b < j; b++) {
              if (xc[b] != yc[b]) {
                xLTy = xc[b] < yc[b];
                break;
              }
            }
          }
          if (xLTy) {
            t = xc;
            xc = yc;
            yc = t;
            y.s = -y.s;
          }
          b = (j = yc.length) - (i = xc.length);
          if (b > 0) for (; b--; xc[i++] = 0) ;
          b = BASE - 1;
          for (; j > a; ) {
            if (xc[--j] < yc[j]) {
              for (i = j; i && !xc[--i]; xc[i] = b) ;
              --xc[i];
              xc[j] += BASE;
            }
            xc[j] -= yc[j];
          }
          for (; xc[0] == 0; xc.splice(0, 1), --ye) ;
          if (!xc[0]) {
            y.s = ROUNDING_MODE == 3 ? -1 : 1;
            y.c = [y.e = 0];
            return y;
          }
          return normalise(y, xc, ye);
        };
        P.modulo = P.mod = function(y, b) {
          var q, s, x = this;
          y = new BigNumber2(y, b);
          if (!x.c || !y.s || y.c && !y.c[0]) {
            return new BigNumber2(NaN);
          } else if (!y.c || x.c && !x.c[0]) {
            return new BigNumber2(x);
          }
          if (MODULO_MODE == 9) {
            s = y.s;
            y.s = 1;
            q = div(x, y, 0, 3);
            y.s = s;
            q.s *= s;
          } else {
            q = div(x, y, 0, MODULO_MODE);
          }
          y = x.minus(q.times(y));
          if (!y.c[0] && MODULO_MODE == 1) y.s = x.s;
          return y;
        };
        P.multipliedBy = P.times = function(y, b) {
          var c, e, i, j, k, m, xcL, xlo, xhi, ycL, ylo, yhi, zc, base, sqrtBase, x = this, xc = x.c, yc = (y = new BigNumber2(y, b)).c;
          if (!xc || !yc || !xc[0] || !yc[0]) {
            if (!x.s || !y.s || xc && !xc[0] && !yc || yc && !yc[0] && !xc) {
              y.c = y.e = y.s = null;
            } else {
              y.s *= x.s;
              if (!xc || !yc) {
                y.c = y.e = null;
              } else {
                y.c = [0];
                y.e = 0;
              }
            }
            return y;
          }
          e = bitFloor(x.e / LOG_BASE) + bitFloor(y.e / LOG_BASE);
          y.s *= x.s;
          xcL = xc.length;
          ycL = yc.length;
          if (xcL < ycL) {
            zc = xc;
            xc = yc;
            yc = zc;
            i = xcL;
            xcL = ycL;
            ycL = i;
          }
          for (i = xcL + ycL, zc = []; i--; zc.push(0)) ;
          base = BASE;
          sqrtBase = SQRT_BASE;
          for (i = ycL; --i >= 0; ) {
            c = 0;
            ylo = yc[i] % sqrtBase;
            yhi = yc[i] / sqrtBase | 0;
            for (k = xcL, j = i + k; j > i; ) {
              xlo = xc[--k] % sqrtBase;
              xhi = xc[k] / sqrtBase | 0;
              m = yhi * xlo + xhi * ylo;
              xlo = ylo * xlo + m % sqrtBase * sqrtBase + zc[j] + c;
              c = (xlo / base | 0) + (m / sqrtBase | 0) + yhi * xhi;
              zc[j--] = xlo % base;
            }
            zc[j] = c;
          }
          if (c) {
            ++e;
          } else {
            zc.splice(0, 1);
          }
          return normalise(y, zc, e);
        };
        P.negated = function() {
          var x = new BigNumber2(this);
          x.s = -x.s || null;
          return x;
        };
        P.plus = function(y, b) {
          var t, x = this, a = x.s;
          y = new BigNumber2(y, b);
          b = y.s;
          if (!a || !b) return new BigNumber2(NaN);
          if (a != b) {
            y.s = -b;
            return x.minus(y);
          }
          var xe = x.e / LOG_BASE, ye = y.e / LOG_BASE, xc = x.c, yc = y.c;
          if (!xe || !ye) {
            if (!xc || !yc) return new BigNumber2(a / 0);
            if (!xc[0] || !yc[0]) return yc[0] ? y : new BigNumber2(xc[0] ? x : a * 0);
          }
          xe = bitFloor(xe);
          ye = bitFloor(ye);
          xc = xc.slice();
          if (a = xe - ye) {
            if (a > 0) {
              ye = xe;
              t = yc;
            } else {
              a = -a;
              t = xc;
            }
            t.reverse();
            for (; a--; t.push(0)) ;
            t.reverse();
          }
          a = xc.length;
          b = yc.length;
          if (a - b < 0) {
            t = yc;
            yc = xc;
            xc = t;
            b = a;
          }
          for (a = 0; b; ) {
            a = (xc[--b] = xc[b] + yc[b] + a) / BASE | 0;
            xc[b] = BASE === xc[b] ? 0 : xc[b] % BASE;
          }
          if (a) {
            xc = [a].concat(xc);
            ++ye;
          }
          return normalise(y, xc, ye);
        };
        P.precision = P.sd = function(sd, rm) {
          var c, n, v, x = this;
          if (sd != null && sd !== !!sd) {
            intCheck(sd, 1, MAX);
            if (rm == null) rm = ROUNDING_MODE;
            else intCheck(rm, 0, 8);
            return round(new BigNumber2(x), sd, rm);
          }
          if (!(c = x.c)) return null;
          v = c.length - 1;
          n = v * LOG_BASE + 1;
          if (v = c[v]) {
            for (; v % 10 == 0; v /= 10, n--) ;
            for (v = c[0]; v >= 10; v /= 10, n++) ;
          }
          if (sd && x.e + 1 > n) n = x.e + 1;
          return n;
        };
        P.shiftedBy = function(k) {
          intCheck(k, -MAX_SAFE_INTEGER, MAX_SAFE_INTEGER);
          return this.times("1e" + k);
        };
        P.squareRoot = P.sqrt = function() {
          var m, n, r, rep, t, x = this, c = x.c, s = x.s, e = x.e, dp = DECIMAL_PLACES + 4, half = new BigNumber2("0.5");
          if (s !== 1 || !c || !c[0]) {
            return new BigNumber2(!s || s < 0 && (!c || c[0]) ? NaN : c ? x : 1 / 0);
          }
          s = Math.sqrt(+valueOf(x));
          if (s == 0 || s == 1 / 0) {
            n = coeffToString(c);
            if ((n.length + e) % 2 == 0) n += "0";
            s = Math.sqrt(+n);
            e = bitFloor((e + 1) / 2) - (e < 0 || e % 2);
            if (s == 1 / 0) {
              n = "5e" + e;
            } else {
              n = s.toExponential();
              n = n.slice(0, n.indexOf("e") + 1) + e;
            }
            r = new BigNumber2(n);
          } else {
            r = new BigNumber2(s + "");
          }
          if (r.c[0]) {
            e = r.e;
            s = e + dp;
            if (s < 3) s = 0;
            for (; ; ) {
              t = r;
              r = half.times(t.plus(div(x, t, dp, 1)));
              if (coeffToString(t.c).slice(0, s) === (n = coeffToString(r.c)).slice(0, s)) {
                if (r.e < e) --s;
                n = n.slice(s - 3, s + 1);
                if (n == "9999" || !rep && n == "4999") {
                  if (!rep) {
                    round(t, t.e + DECIMAL_PLACES + 2, 0);
                    if (t.times(t).eq(x)) {
                      r = t;
                      break;
                    }
                  }
                  dp += 4;
                  s += 4;
                  rep = 1;
                } else {
                  if (!+n || !+n.slice(1) && n.charAt(0) == "5") {
                    round(r, r.e + DECIMAL_PLACES + 2, 1);
                    m = !r.times(r).eq(x);
                  }
                  break;
                }
              }
            }
          }
          return round(r, r.e + DECIMAL_PLACES + 1, ROUNDING_MODE, m);
        };
        P.toExponential = function(dp, rm) {
          if (dp != null) {
            intCheck(dp, 0, MAX);
            dp++;
          }
          return format(this, dp, rm, 1);
        };
        P.toFixed = function(dp, rm) {
          if (dp != null) {
            intCheck(dp, 0, MAX);
            dp = dp + this.e + 1;
          }
          return format(this, dp, rm);
        };
        P.toFormat = function(dp, rm, format2) {
          var str, x = this;
          if (format2 == null) {
            if (dp != null && rm && typeof rm == "object") {
              format2 = rm;
              rm = null;
            } else if (dp && typeof dp == "object") {
              format2 = dp;
              dp = rm = null;
            } else {
              format2 = FORMAT;
            }
          } else if (typeof format2 != "object") {
            throw Error(bignumberError + "Argument not an object: " + format2);
          }
          str = x.toFixed(dp, rm);
          if (x.c) {
            var i, arr = str.split("."), g1 = +format2.groupSize, g2 = +format2.secondaryGroupSize, groupSeparator = format2.groupSeparator || "", intPart = arr[0], fractionPart = arr[1], isNeg = x.s < 0, intDigits = isNeg ? intPart.slice(1) : intPart, len = intDigits.length;
            if (g2) {
              i = g1;
              g1 = g2;
              g2 = i;
              len -= i;
            }
            if (g1 > 0 && len > 0) {
              i = len % g1 || g1;
              intPart = intDigits.substr(0, i);
              for (; i < len; i += g1) intPart += groupSeparator + intDigits.substr(i, g1);
              if (g2 > 0) intPart += groupSeparator + intDigits.slice(i);
              if (isNeg) intPart = "-" + intPart;
            }
            str = fractionPart ? intPart + (format2.decimalSeparator || "") + ((g2 = +format2.fractionGroupSize) ? fractionPart.replace(
              new RegExp("\\d{" + g2 + "}\\B", "g"),
              "$&" + (format2.fractionGroupSeparator || "")
            ) : fractionPart) : intPart;
          }
          return (format2.prefix || "") + str + (format2.suffix || "");
        };
        P.toFraction = function(md) {
          var d, d0, d1, d2, e, exp, n, n0, n1, q, r, s, x = this, xc = x.c;
          if (md != null) {
            n = new BigNumber2(md);
            if (!n.isInteger() && (n.c || n.s !== 1) || n.lt(ONE)) {
              throw Error(bignumberError + "Argument " + (n.isInteger() ? "out of range: " : "not an integer: ") + valueOf(n));
            }
          }
          if (!xc) return new BigNumber2(x);
          d = new BigNumber2(ONE);
          n1 = d0 = new BigNumber2(ONE);
          d1 = n0 = new BigNumber2(ONE);
          s = coeffToString(xc);
          e = d.e = s.length - x.e - 1;
          d.c[0] = POWS_TEN[(exp = e % LOG_BASE) < 0 ? LOG_BASE + exp : exp];
          md = !md || n.comparedTo(d) > 0 ? e > 0 ? d : n1 : n;
          exp = MAX_EXP;
          MAX_EXP = 1 / 0;
          n = new BigNumber2(s);
          n0.c[0] = 0;
          for (; ; ) {
            q = div(n, d, 0, 1);
            d2 = d0.plus(q.times(d1));
            if (d2.comparedTo(md) == 1) break;
            d0 = d1;
            d1 = d2;
            n1 = n0.plus(q.times(d2 = n1));
            n0 = d2;
            d = n.minus(q.times(d2 = d));
            n = d2;
          }
          d2 = div(md.minus(d0), d1, 0, 1);
          n0 = n0.plus(d2.times(n1));
          d0 = d0.plus(d2.times(d1));
          n0.s = n1.s = x.s;
          e = e * 2;
          r = div(n1, d1, e, ROUNDING_MODE).minus(x).abs().comparedTo(
            div(n0, d0, e, ROUNDING_MODE).minus(x).abs()
          ) < 1 ? [n1, d1] : [n0, d0];
          MAX_EXP = exp;
          return r;
        };
        P.toNumber = function() {
          return +valueOf(this);
        };
        P.toPrecision = function(sd, rm) {
          if (sd != null) intCheck(sd, 1, MAX);
          return format(this, sd, rm, 2);
        };
        P.toString = function(b) {
          var str, n = this, s = n.s, e = n.e;
          if (e === null) {
            if (s) {
              str = "Infinity";
              if (s < 0) str = "-" + str;
            } else {
              str = "NaN";
            }
          } else {
            if (b == null) {
              str = e <= TO_EXP_NEG || e >= TO_EXP_POS ? toExponential(coeffToString(n.c), e) : toFixedPoint(coeffToString(n.c), e, "0");
            } else if (b === 10 && alphabetHasNormalDecimalDigits) {
              n = round(new BigNumber2(n), DECIMAL_PLACES + e + 1, ROUNDING_MODE);
              str = toFixedPoint(coeffToString(n.c), n.e, "0");
            } else {
              intCheck(b, 2, ALPHABET.length, "Base");
              str = convertBase(toFixedPoint(coeffToString(n.c), e, "0"), 10, b, s, true);
            }
            if (s < 0 && n.c[0]) str = "-" + str;
          }
          return str;
        };
        P.valueOf = P.toJSON = function() {
          return valueOf(this);
        };
        P._isBigNumber = true;
        if (configObject != null) BigNumber2.set(configObject);
        return BigNumber2;
      }
      function bitFloor(n) {
        var i = n | 0;
        return n > 0 || n === i ? i : i - 1;
      }
      function coeffToString(a) {
        var s, z, i = 1, j = a.length, r = a[0] + "";
        for (; i < j; ) {
          s = a[i++] + "";
          z = LOG_BASE - s.length;
          for (; z--; s = "0" + s) ;
          r += s;
        }
        for (j = r.length; r.charCodeAt(--j) === 48; ) ;
        return r.slice(0, j + 1 || 1);
      }
      function compare(x, y) {
        var a, b, xc = x.c, yc = y.c, i = x.s, j = y.s, k = x.e, l = y.e;
        if (!i || !j) return null;
        a = xc && !xc[0];
        b = yc && !yc[0];
        if (a || b) return a ? b ? 0 : -j : i;
        if (i != j) return i;
        a = i < 0;
        b = k == l;
        if (!xc || !yc) return b ? 0 : !xc ^ a ? 1 : -1;
        if (!b) return k > l ^ a ? 1 : -1;
        j = (k = xc.length) < (l = yc.length) ? k : l;
        for (i = 0; i < j; i++) if (xc[i] != yc[i]) return xc[i] > yc[i] ^ a ? 1 : -1;
        return k == l ? 0 : k > l ^ a ? 1 : -1;
      }
      function intCheck(n, min, max, name) {
        if (n < min || n > max || n !== mathfloor(n)) {
          throw Error(bignumberError + (name || "Argument") + (typeof n == "number" ? n < min || n > max ? " out of range: " : " not an integer: " : " not a primitive number: ") + String(n));
        }
      }
      function isOdd(n) {
        var k = n.c.length - 1;
        return bitFloor(n.e / LOG_BASE) == k && n.c[k] % 2 != 0;
      }
      function toExponential(str, e) {
        return (str.length > 1 ? str.charAt(0) + "." + str.slice(1) : str) + (e < 0 ? "e" : "e+") + e;
      }
      function toFixedPoint(str, e, z) {
        var len, zs;
        if (e < 0) {
          for (zs = z + "."; ++e; zs += z) ;
          str = zs + str;
        } else {
          len = str.length;
          if (++e > len) {
            for (zs = z, e -= len; --e; zs += z) ;
            str += zs;
          } else if (e < len) {
            str = str.slice(0, e) + "." + str.slice(e);
          }
        }
        return str;
      }
      BigNumber = clone();
      BigNumber["default"] = BigNumber.BigNumber = BigNumber;
      if (typeof define == "function" && define.amd) {
        define(function() {
          return BigNumber;
        });
      } else if (typeof module != "undefined" && module.exports) {
        module.exports = BigNumber;
      } else {
        if (!globalObject) {
          globalObject = typeof self != "undefined" && self ? self : window;
        }
        globalObject.BigNumber = BigNumber;
      }
    })(exports);
  }
});

// node_modules/nanocurrency/dist/nanocurrency.cjs.js
var require_nanocurrency_cjs = __commonJS({
  "node_modules/nanocurrency/dist/nanocurrency.cjs.js"(exports) {
    "use strict";
    function A(A2) {
      return A2 && "object" == typeof A2 && "default" in A2 ? A2.default : A2;
    }
    Object.defineProperty(exports, "__esModule", { value: true });
    var I = A(__require("fs"));
    var i = A(__require("path"));
    var g = A(require_bignumber());
    var C = require_blakejs();
    var r = A(C);
    function o(A2, I2, i2, g2) {
      return new (i2 || (i2 = Promise))((function(C2, r2) {
        function o2(A3) {
          try {
            e2(g2.next(A3));
          } catch (A4) {
            r2(A4);
          }
        }
        function n2(A3) {
          try {
            e2(g2.throw(A3));
          } catch (A4) {
            r2(A4);
          }
        }
        function e2(A3) {
          var I3;
          A3.done ? C2(A3.value) : (I3 = A3.value, I3 instanceof i2 ? I3 : new i2((function(A4) {
            A4(I3);
          }))).then(o2, n2);
        }
        e2((g2 = g2.apply(A2, I2 || [])).next());
      }));
    }
    function n(A2, I2) {
      var i2, g2, C2, r2, o2 = { label: 0, sent: function() {
        if (1 & C2[0]) throw C2[1];
        return C2[1];
      }, trys: [], ops: [] };
      return r2 = { next: n2(0), throw: n2(1), return: n2(2) }, "function" == typeof Symbol && (r2[Symbol.iterator] = function() {
        return this;
      }), r2;
      function n2(r3) {
        return function(n3) {
          return (function(r4) {
            if (i2) throw new TypeError("Generator is already executing.");
            for (; o2; ) try {
              if (i2 = 1, g2 && (C2 = 2 & r4[0] ? g2.return : r4[0] ? g2.throw || ((C2 = g2.return) && C2.call(g2), 0) : g2.next) && !(C2 = C2.call(g2, r4[1])).done) return C2;
              switch (g2 = 0, C2 && (r4 = [2 & r4[0], C2.value]), r4[0]) {
                case 0:
                case 1:
                  C2 = r4;
                  break;
                case 4:
                  return o2.label++, { value: r4[1], done: false };
                case 5:
                  o2.label++, g2 = r4[1], r4 = [0];
                  continue;
                case 7:
                  r4 = o2.ops.pop(), o2.trys.pop();
                  continue;
                default:
                  if (!(C2 = (C2 = o2.trys).length > 0 && C2[C2.length - 1]) && (6 === r4[0] || 2 === r4[0])) {
                    o2 = 0;
                    continue;
                  }
                  if (3 === r4[0] && (!C2 || r4[1] > C2[0] && r4[1] < C2[3])) {
                    o2.label = r4[1];
                    break;
                  }
                  if (6 === r4[0] && o2.label < C2[1]) {
                    o2.label = C2[1], C2 = r4;
                    break;
                  }
                  if (C2 && o2.label < C2[2]) {
                    o2.label = C2[2], o2.ops.push(r4);
                    break;
                  }
                  C2[2] && o2.ops.pop(), o2.trys.pop();
                  continue;
              }
              r4 = I2.call(A2, o2);
            } catch (A3) {
              r4 = [6, A3], g2 = 0;
            } finally {
              i2 = C2 = 0;
            }
            if (5 & r4[0]) throw r4[1];
            return { value: r4[0] ? r4[1] : void 0, done: true };
          })([r3, n3]);
        };
      }
    }
    var e;
    var t = (function(A2, I2) {
      return A2(I2 = { exports: {} }, I2.exports), I2.exports;
    })((function(A2, g2) {
      var C2, r2 = (C2 = "undefined" != typeof document && document.currentScript ? document.currentScript.src : void 0, function(A3) {
        var g3;
        A3 = A3 || {}, g3 || (g3 = void 0 !== A3 ? A3 : {});
        var r3, o2 = {};
        for (r3 in g3) g3.hasOwnProperty(r3) && (o2[r3] = g3[r3]);
        g3.arguments = [], g3.thisProgram = "./this.program", g3.quit = function(A4, I2) {
          throw I2;
        }, g3.preRun = [], g3.postRun = [];
        var n2 = false, e2 = false, t2 = false, h2 = false;
        n2 = "object" == typeof window, e2 = "function" == typeof importScripts, t2 = "object" == typeof process && !n2 && !e2, h2 = !n2 && !t2 && !e2;
        var a2, Q2, B2 = "";
        t2 ? (B2 = __dirname + "/", g3.read = function(A4, g4) {
          var C3 = V2(A4);
          return C3 || (a2 || (a2 = I), Q2 || (Q2 = i), A4 = Q2.normalize(A4), C3 = a2.readFileSync(A4)), g4 ? C3 : C3.toString();
        }, g3.readBinary = function(A4) {
          return (A4 = g3.read(A4, true)).buffer || (A4 = new Uint8Array(A4)), c2(A4.buffer), A4;
        }, 1 < process.argv.length && (g3.thisProgram = process.argv[1].replace(/\\/g, "/")), g3.arguments = process.argv.slice(2), process.on("uncaughtException", (function(A4) {
          if (!(A4 instanceof z2)) throw A4;
        })), process.on("unhandledRejection", $2), g3.quit = function(A4) {
          process.exit(A4);
        }, g3.inspect = function() {
          return "[Emscripten Module object]";
        }) : h2 ? ("undefined" != typeof read && (g3.read = function(A4) {
          var I2 = V2(A4);
          return I2 ? X2(I2) : read(A4);
        }), g3.readBinary = function(A4) {
          var I2;
          return (I2 = V2(A4)) ? I2 : "function" == typeof readbuffer ? new Uint8Array(readbuffer(A4)) : (c2("object" == typeof (I2 = read(A4, "binary"))), I2);
        }, "undefined" != typeof scriptArgs ? g3.arguments = scriptArgs : void 0 !== arguments && (g3.arguments = arguments), "function" == typeof quit && (g3.quit = function(A4) {
          quit(A4);
        })) : (n2 || e2) && (e2 ? B2 = self.location.href : document.currentScript && (B2 = document.currentScript.src), C2 && (B2 = C2), B2 = 0 !== B2.indexOf("blob:") ? B2.substr(0, B2.lastIndexOf("/") + 1) : "", g3.read = function(A4) {
          try {
            var I2 = new XMLHttpRequest();
            return I2.open("GET", A4, false), I2.send(null), I2.responseText;
          } catch (I3) {
            if (A4 = V2(A4)) return X2(A4);
            throw I3;
          }
        }, e2 && (g3.readBinary = function(A4) {
          try {
            var I2 = new XMLHttpRequest();
            return I2.open("GET", A4, false), I2.responseType = "arraybuffer", I2.send(null), new Uint8Array(I2.response);
          } catch (I3) {
            if (A4 = V2(A4)) return A4;
            throw I3;
          }
        }), g3.readAsync = function(A4, I2, i2) {
          var g4 = new XMLHttpRequest();
          g4.open("GET", A4, true), g4.responseType = "arraybuffer", g4.onload = function() {
            if (200 == g4.status || 0 == g4.status && g4.response) I2(g4.response);
            else {
              var C3 = V2(A4);
              C3 ? I2(C3.buffer) : i2();
            }
          }, g4.onerror = i2, g4.send(null);
        }, g3.setWindowTitle = function(A4) {
          document.title = A4;
        });
        var f2 = g3.print || ("undefined" != typeof console ? console.log.bind(console) : "undefined" != typeof print ? print : null), E2 = g3.printErr || ("undefined" != typeof printErr ? printErr : "undefined" != typeof console && console.warn.bind(console) || f2);
        for (r3 in o2) o2.hasOwnProperty(r3) && (g3[r3] = o2[r3]);
        o2 = void 0;
        var w2 = { "f64-rem": function(A4, I2) {
          return A4 % I2;
        }, debugger: function() {
        } };
        "object" != typeof WebAssembly && E2("no native wasm support detected");
        var s2, u2 = false;
        function c2(A4, I2) {
          A4 || $2("Assertion failed: " + I2);
        }
        function l2(A4) {
          var I2 = g3["_" + A4];
          return c2(I2, "Cannot call unknown function " + A4 + ", make sure it is exported"), I2;
        }
        function S2(A4, I2, i2, g4) {
          var C3 = { string: function(A5) {
            var I3 = 0;
            if (null != A5 && 0 !== A5) {
              var i3 = 1 + (A5.length << 2), g5 = I3 = q2(i3), C4 = y2;
              if (0 < i3) {
                i3 = g5 + i3 - 1;
                for (var r5 = 0; r5 < A5.length; ++r5) {
                  var o4 = A5.charCodeAt(r5);
                  if (55296 <= o4 && 57343 >= o4 && (o4 = 65536 + ((1023 & o4) << 10) | 1023 & A5.charCodeAt(++r5)), 127 >= o4) {
                    if (g5 >= i3) break;
                    C4[g5++] = o4;
                  } else {
                    if (2047 >= o4) {
                      if (g5 + 1 >= i3) break;
                      C4[g5++] = 192 | o4 >> 6;
                    } else {
                      if (65535 >= o4) {
                        if (g5 + 2 >= i3) break;
                        C4[g5++] = 224 | o4 >> 12;
                      } else {
                        if (g5 + 3 >= i3) break;
                        C4[g5++] = 240 | o4 >> 18, C4[g5++] = 128 | o4 >> 12 & 63;
                      }
                      C4[g5++] = 128 | o4 >> 6 & 63;
                    }
                    C4[g5++] = 128 | 63 & o4;
                  }
                }
                C4[g5] = 0;
              }
            }
            return I3;
          }, array: function(A5) {
            var I3 = q2(A5.length);
            return G2.set(A5, I3), I3;
          } }, r4 = l2(A4), o3 = [];
          if (A4 = 0, g4) for (var n3 = 0; n3 < g4.length; n3++) {
            var e3 = C3[i2[n3]];
            e3 ? (0 === A4 && (A4 = W2()), o3[n3] = e3(g4[n3])) : o3[n3] = g4[n3];
          }
          return i2 = (function(A5) {
            if ("string" === I2) if (A5) {
              for (var i3 = y2, g5 = A5 + void 0, C4 = A5; i3[C4] && !(C4 >= g5); ) ++C4;
              if (16 < C4 - A5 && i3.subarray && U2) A5 = U2.decode(i3.subarray(A5, C4));
              else {
                for (g5 = ""; A5 < C4; ) {
                  var r5 = i3[A5++];
                  if (128 & r5) {
                    var o4 = 63 & i3[A5++];
                    if (192 == (224 & r5)) g5 += String.fromCharCode((31 & r5) << 6 | o4);
                    else {
                      var n4 = 63 & i3[A5++];
                      65536 > (r5 = 224 == (240 & r5) ? (15 & r5) << 12 | o4 << 6 | n4 : (7 & r5) << 18 | o4 << 12 | n4 << 6 | 63 & i3[A5++]) ? g5 += String.fromCharCode(r5) : (r5 -= 65536, g5 += String.fromCharCode(55296 | r5 >> 10, 56320 | 1023 & r5));
                    }
                  } else g5 += String.fromCharCode(r5);
                }
                A5 = g5;
              }
            } else A5 = "";
            else A5 = "boolean" === I2 ? !!A5 : A5;
            return A5;
          })(i2 = r4.apply(null, o3)), 0 !== A4 && T2(A4), i2;
        }
        var U2 = "undefined" != typeof TextDecoder ? new TextDecoder("utf8") : void 0;
        "undefined" != typeof TextDecoder && new TextDecoder("utf-16le");
        var F2, G2, y2, d2, D2 = g3.TOTAL_MEMORY || 16777216;
        function k2(A4) {
          for (; 0 < A4.length; ) {
            var I2 = A4.shift();
            if ("function" == typeof I2) I2();
            else {
              var i2 = I2.h;
              "number" == typeof i2 ? void 0 === I2.g ? g3.dynCall_v(i2) : g3.dynCall_vi(i2, I2.g) : i2(void 0 === I2.g ? null : I2.g);
            }
          }
        }
        5242880 > D2 && E2("TOTAL_MEMORY should be larger than TOTAL_STACK, was " + D2 + "! (TOTAL_STACK=5242880)"), g3.buffer ? F2 = g3.buffer : (F2 = "object" == typeof WebAssembly && "function" == typeof WebAssembly.Memory ? (s2 = new WebAssembly.Memory({ initial: D2 / 65536, maximum: D2 / 65536 })).buffer : new ArrayBuffer(D2), g3.buffer = F2), g3.HEAP8 = G2 = new Int8Array(F2), g3.HEAP16 = new Int16Array(F2), g3.HEAP32 = d2 = new Int32Array(F2), g3.HEAPU8 = y2 = new Uint8Array(F2), g3.HEAPU16 = new Uint16Array(F2), g3.HEAPU32 = new Uint32Array(F2), g3.HEAPF32 = new Float32Array(F2), g3.HEAPF64 = new Float64Array(F2), d2[724] = 5246032;
        var p2 = [], H2 = [], v2 = [], Y2 = [], M2 = false;
        function b2() {
          var A4 = g3.preRun.shift();
          p2.unshift(A4);
        }
        var x2 = 0, K2 = null;
        g3.preloadedImages = {}, g3.preloadedAudios = {};
        var m2 = "data:application/octet-stream;base64,";
        function N2(A4) {
          return String.prototype.startsWith ? A4.startsWith(m2) : 0 === A4.indexOf(m2);
        }
        var L2 = "data:application/octet-stream;base64,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NCAAIAM2AjggACADNgI8IABBQGshAAwBCwsDQCAAIAVIBEAgACADNgIAIABBBGohAAwBCwsLA0AgACAESARAIAAgAToAACAAQQFqIQAMAQsLIAQgAmsLxgMBA38gAkGAwABOBEAgACABIAIQABogAA8LIAAhBCAAIAJqIQMgAEEDcSABQQNxRgRAA0AgAEEDcQRAIAJFBEAgBA8LIAAgASwAADoAACAAQQFqIQAgAUEBaiEBIAJBAWshAgwBCwsgA0F8cSICQUBqIQUDQCAAIAVMBEAgACABKAIANgIAIAAgASgCBDYCBCAAIAEoAgg2AgggACABKAIMNgIMIAAgASgCEDYCECAAIAEoAhQ2AhQgACABKAIYNgIYIAAgASgCHDYCHCAAIAEoAiA2AiAgACABKAIkNgIkIAAgASgCKDYCKCAAIAEoAiw2AiwgACABKAIwNgIwIAAgASgCNDYCNCAAIAEoAjg2AjggACABKAI8NgI8IABBQGshACABQUBrIQEMAQsLA0AgACACSARAIAAgASgCADYCACAAQQRqIQAgAUEEaiEBDAELCwUgA0EEayECA0AgACACSARAIAAgASwAADoAACAAIAEsAAE6AAEgACABLAACOgACIAAgASwAAzoAAyAAQQRqIQAgAUEEaiEBDAELCwsDQCAAIANIBEAgACABLAAAOgAAIABBAWohACABQQFqIQEMAQsLIAQLBwAgABAMpwuNAQEDfwJAAkAgACICQQNxRQ0AIAIiASEAAkADQCABLAAARQ0BIAFBAWoiASIAQQNxDQALIAEhAAwBCwwBCwNAIABBBGohASAAKAIAIgNB//37d2ogA0GAgYKEeHFBgIGChHhzcUUEQCABIQAMAQsLIANB/wFxBEADQCAAQQFqIgAsAAANAAsLCyAAIAJrC+wFAgR/AX4DQCAAKAIEIgEgACgCZEkEfyAAIAFBAWo2AgQgAS0AAAUgABACCyIBIgNBIEYgA0F3akEFSXINAAsCQAJAIAFBK2sOAwABAAELIAFBLUZBH3RBH3UhBCAAKAIEIgEgACgCZEkEfyAAIAFBAWo2AgQgAS0AAAUgABACCyEBCwJ+An8CQAJAIAFBMEYEfiAAKAIEIgEgACgCZEkEfyAAIAFBAWo2AgQgAS0AAAUgABACCyIBQSByQfgARwRAIAFBkQhqLAAAIgNB/wFxIQEgA0H/AXFBEEgNAyABIQIgAwwECyAAKAIEIgEgACgCZEkEfyAAIAFBAWo2AgQgAS0AAAUgABACC0GRCGosAAAiAUH/AXFBD0wNASAAKAJkBEAgACAAKAIEQX5qNgIEC0IABSABQZEIaiwAACIBQf8BcUEQSAR+DAIFIAAoAmQEQCAAIAAoAgRBf2o2AgQLIABBADYCaCAAIAAoAggiAiAAKAIEazYCbCAAIAI2AmRCAAsLDAMLIAFB/wFxIQELA0AgAkEEdCABciECIAAoAgQiASAAKAJkSQR/IAAgAUEBajYCBCABLQAABSAAEAILQZEIaiwAACIDQf8BcSEBIANB/wFxQRBIIAJBgICAwABJcQ0ACyACrSEFIAEhAiADCyEBIAJBD00EfwN/IAAoAgQiAiAAKAJkSQR/IAAgAkEBajYCBCACLQAABSAAEAILQZEIaiwAACICQf8BcUEPSiABQf8Bca0gBUIEhoQiBUL//////////w9WcgR/IAIFIAIhAQwBCwsFIAELQf8BcUEQSARAA34gACgCBCIBIAAoAmRJBH8gACABQQFqNgIEIAEtAAAFIAAQAgtBkQhqLQAAQRBIDQBCgICAgAgLIQULIAAoAmQEQCAAIAAoAgRBf2o2AgQLIAVCgICAgAhaBEBC/////wcgBEUNARpCgICAgAggBUKAgICACFYNARoLIAUgBKwiBYUgBX0LC/ESAhN/BX4jASEHIwFB8AJqJAEgB0EgaiEEIAchCSAALAAABEADQCAEIAAgBWouAAA7AQAgBEEAOgACIAhBAWohBiAIIAlqIAQQBjoAACAFQQJqIgUgABAHSQRAIAYhCAwBCwsLIAdB4ABqIQYgASwAAAR/QQAhAEEAIQUDQCAEIAAgAWouAAA7AQAgBEEAOgACIAVBAWohCCAFIAZqIAQQBjoAACAAQQJqIgAgARAHSQRAIAghBQwBCwsgBkEHaiIFIQAgBkEBaiIMIQEgBkEGaiILIQggBkECaiIOIQogBkEFaiINIREgBkEDaiIQIRIgBkEEaiIPIRMgBiwAACEUIAssAAAhCyAMLAAAIQwgDSwAACENIA4sAAAhDiAPLAAAIQ8gECwAACEQIAUsAAAFIAZBB2ohACAGQQFqIQEgBkEGaiEIIAZBAmohCiAGQQVqIREgBkEDaiESIAZBBGohE0EACyEWIAdB+ABqIQUgB0HwAGohFSAGIBY6AAAgACAUOgAAIAEgCzoAACAIIAw6AAAgCiANOgAAIBEgDjoAACASIA86AAAgEyAQOgAAIAYpAwAhGUJ/IANB/wFxrYAiFyACQf8Bca1+IhhCfyAXIBh8IANB/wFxQX9qIAJB/wFxRhsiGlEEf0EAIQRBACEAQQAhAkEAIQNBACEJQQAhBUEAIQhBACEGQQAFAn8gBUHgAGohCCAFQUBrIQIgBUFAayEGA0ACQCAHIBg3A2ggBkEAQbABEAQaIAVCgJL3lf/M+YTqADcDACAFQrvOqqbY0Ouzu383AwggBUKr8NP0r+68tzw3AxAgBULx7fT4paf9p6V/NwMYIAVC0YWa7/rPlIfRADcDICAFQp/Y+dnCkdqCm383AyggBULr+obav7X2wR83AzAgBUL5wvibkaOz8NsANwM4IAVBCDYC5AEgCCAHKQNoNwMAIAUgBSgC4AEiA0EIaiIANgLgAUH4ACADayIBQSBJBEAgBUEANgLgASAAIAVB4ABqaiAJIAEQBRogAkKAATcDACAFQgA3A0ggBSAIEAMgASAJaiEAQSAgAWsiAUGAAUsEQCADQad+aiEKA0AgAiACKQMAIhdCgAF8NwMAIAUgBSkDSCAXQv9+Vq18NwNIIAUgABADIABBgAFqIQAgAUGAf2oiAUGAAUsNAAsgA0GofmogCkGAf3EiAGshAUH4ASADayAAaiAJaiEACwVBICEBIAkhAAsgBSgC4AEgBUHgAGpqIAAgARAFGiAFIAEgBSgC4AFqIgA2AuABIARCADcDACAEQgA3AwggBEIANwMQIARCADcDGCAEQgA3AyAgBEIANwMoIARCADcDMCAEQgA3AzggBSgC5AFBCUkgBSkDUEIAUXEEfiACIACtIhcgAikDAHwiGzcDACAFIAUpA0ggGyAXVK18NwNIIAUsAOgBBEAgBUJ/NwNYCyAFQn83A1AgACAFQeAAampBAEGAASAAaxAEGiAFIAgQAyAEIAUpAwAiFzwAACAEIBdCCIg8AAEgBCAXQhCIPAACIAQgF0IYiDwAAyAEIBdCIIg8AAQgBCAXQiiIPAAFIAQgF0IwiDwABiAEIBdCOIg8AAcgBCAFKQMIIhc8AAggBCAXQgiIPAAJIAQgF0IQiDwACiAEIBdCGIg8AAsgBCAXQiCIPAAMIAQgF0IoiDwADSAEIBdCMIg8AA4gBCAXQjiIPAAPIAQgBSkDECIXPAAQIAQgF0IIiDwAESAEIBdCEIg8ABIgBCAXQhiIPAATIAQgF0IgiDwAFCAEIBdCKIg8ABUgBCAXQjCIPAAWIAQgF0I4iDwAFyAEIAUpAxgiFzwAGCAEIBdCCIg8ABkgBCAXQhCIPAAaIAQgF0IYiDwAGyAEIBdCIIg8ABwgBCAXQiiIPAAdIAQgF0IwiDwAHiAEIBdCOIg8AB8gBCAFKQMgIhc8ACAgBCAXQgiIPAAhIAQgF0IQiDwAIiAEIBdCGIg8ACMgBCAXQiCIPAAkIAQgF0IoiDwAJSAEIBdCMIg8ACYgBCAXQjiIPAAnIAQgBSkDKCIXPAAoIAQgF0IIiDwAKSAEIBdCEIg8ACogBCAXQhiIPAArIAQgF0IgiDwALCAEIBdCKIg8AC0gBCAXQjCIPAAuIAQgF0I4iDwALyAEIAUpAzAiFzwAMCAEIBdCCIg8ADEgBCAXQhCIPAAyIAQgF0IYiDwAMyAEIBdCIIg8ADQgBCAXQiiIPAA1IAQgF0IwiDwANiAEIBdCOIg8ADcgBCAFKQM4Ihc8ADggBCAXQgiIPAA5IAQgF0IQiDwAOiAEIBdCGIg8ADsgBCAXQiCIPAA8IAQgF0IoiDwAPSAEIBdCMIg8AD4gBCAXQjiIPAA/IBUgBCAFKALkARAFGkGgCigCACEAIARBAEHAACAAQQFxEQAAGiAVKQMABUIACyAZWg0AIBogGEIBfCIYUg0BQQAhBEEAIQBBACECQQAhA0EAIQlBACEFQQAhCEEAIQZBAAwCCwsgByAYQjiIPABoIAcgGDwAbyAHIBhCMIg8AGkgByAYQgiIPABuIAcgGEIoiDwAaiAHIBhCEIg8AG0gByAYQiCIPABrIAcgGEIYiDwAbEEBIQQgBykDaCIYp0H/AXEhACAYQhiIp0H/AXEhAiAYQiCIp0H/AXEhAyAYQiiIp0H/AXEhCSAYQjCIp0H/AXEhBSAYQjiIp0H/AXEhCCAYQgiIp0H/AXEhBiAYQhCIp0H/AXELCyEBQbAKQTA6AABBsQogBEGACGosAAA6AABBsgogAEH/AXFBBHZBgAhqLAAAOgAAQbMKIABBD3FBgAhqLAAAOgAAQbQKIAZB/wFxQQR2QYAIaiwAADoAAEG1CiAGQQ9xQYAIaiwAADoAAEG2CiABQf8BcUEEdkGACGosAAA6AABBtwogAUEPcUGACGosAAA6AABBuAogAkH/AXFBBHZBgAhqLAAAOgAAQbkKIAJBD3FBgAhqLAAAOgAAQboKIANB/wFxQQR2QYAIaiwAADoAAEG7CiADQQ9xQYAIaiwAADoAAEG8CiAJQf8BcUEEdkGACGosAAA6AABBvQogCUEPcUGACGosAAA6AABBvgogBUH/AXFBBHZBgAhqLAAAOgAAQb8KIAVBD3FBgAhqLAAAOgAAQcAKIAhB/wFxQQR2QYAIaiwAADoAAEHBCiAIQQ9xQYAIaiwAADoAAEHCCkEAOgAAIAckAUGwCgsGACAAJAELCABBABABQQALcAIBfwJ+IwEhASMBQYABaiQBIAFBADYCACABIAA2AgQgASAANgIsIAFBfyAAQf////8HaiAAQQBIGzYCCCABQX82AkwgAUEANgJoIAEgASgCCCIAIAEoAgRrNgJsIAEgADYCZCABEAghAyABJAEgAwuLAQECfyAAIAAsAEoiASABQf8BanI6AEogACgCFCAAKAIcSwRAIAAoAiQhASAAQQBBACABQQFxEQAAGgsgAEEANgIQIABBADYCHCAAQQA2AhQgACgCACIBQQRxBH8gACABQSByNgIAQX8FIAAgACgCLCAAKAIwaiICNgIIIAAgAjYCBCABQRt0QR91CwtEAQN/IwEhASMBQRBqJAEgABANBH9BfwUgACgCICECIAAgAUEBIAJBAXERAABBAUYEfyABLQAABUF/CwshAyABJAEgAwsEACMBCxsBAn8jASECIAAjAWokASMBQQ9qQXBxJAEgAgsLoAICAEGACAuRAjAxMjM0NTY3ODlhYmNkZWb/////////////////////////////////////////////////////////////////AAECAwQFBgcICf////////8KCwwNDg8QERITFBUWFxgZGhscHR4fICEiI////////woLDA0ODxAREhMUFRYXGBkaGxwdHh8gISIj/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////wBBoAoLAQE=";
        if (!N2(L2)) {
          var R2 = L2;
          L2 = g3.locateFile ? g3.locateFile(R2, B2) : B2 + R2;
        }
        function P2() {
          try {
            if (g3.wasmBinary) return new Uint8Array(g3.wasmBinary);
            var A4 = V2(L2);
            if (A4) return A4;
            if (g3.readBinary) return g3.readBinary(L2);
            throw "both async and sync fetching of the wasm failed";
          } catch (A5) {
            $2(A5);
          }
        }
        function J2() {
          return g3.wasmBinary || !n2 && !e2 || "function" != typeof fetch ? new Promise((function(A4) {
            A4(P2());
          })) : fetch(L2, { credentials: "same-origin" }).then((function(A4) {
            if (!A4.ok) throw "failed to load wasm binary file at '" + L2 + "'";
            return A4.arrayBuffer();
          })).catch((function() {
            return P2();
          }));
        }
        function j2(A4) {
          function I2(A5) {
            g3.asm = A5.exports, x2--, g3.monitorRunDependencies && g3.monitorRunDependencies(x2), 0 == x2 && K2 && (A5 = K2, K2 = null, A5());
          }
          function i2(A5) {
            I2(A5.instance);
          }
          function C3(A5) {
            J2().then((function(A6) {
              return WebAssembly.instantiate(A6, r4);
            })).then(A5, (function(A6) {
              E2("failed to asynchronously prepare wasm: " + A6), $2(A6);
            }));
          }
          var r4 = { env: A4, global: { NaN: NaN, Infinity: 1 / 0 }, "global.Math": Math, asm2wasm: w2 };
          if (x2++, g3.monitorRunDependencies && g3.monitorRunDependencies(x2), g3.instantiateWasm) try {
            return g3.instantiateWasm(r4, I2);
          } catch (A5) {
            return E2("Module.instantiateWasm callback failed with error: " + A5), false;
          }
          return g3.wasmBinary || "function" != typeof WebAssembly.instantiateStreaming || N2(L2) || "function" != typeof fetch ? C3(i2) : WebAssembly.instantiateStreaming(fetch(L2, { credentials: "same-origin" }), r4).then(i2, (function(A5) {
            E2("wasm streaming compile failed: " + A5), E2("falling back to ArrayBuffer instantiation"), C3(i2);
          })), {};
        }
        function X2(A4) {
          for (var I2 = [], i2 = 0; i2 < A4.length; i2++) {
            var g4 = A4[i2];
            255 < g4 && (g4 &= 255), I2.push(String.fromCharCode(g4));
          }
          return I2.join("");
        }
        g3.asm = function(A4, I2) {
          return I2.memory = s2, I2.table = new WebAssembly.Table({ initial: 2, maximum: 2, element: "anyfunc" }), I2.__memory_base = 1024, I2.__table_base = 0, j2(I2);
        };
        var O2 = "function" == typeof atob ? atob : function(A4) {
          var I2 = "", i2 = 0;
          A4 = A4.replace(/[^A-Za-z0-9\+\/=]/g, "");
          do {
            var g4 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=".indexOf(A4.charAt(i2++)), C3 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=".indexOf(A4.charAt(i2++)), r4 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=".indexOf(A4.charAt(i2++)), o3 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=".indexOf(A4.charAt(i2++));
            g4 = g4 << 2 | C3 >> 4, C3 = (15 & C3) << 4 | r4 >> 2;
            var n3 = (3 & r4) << 6 | o3;
            I2 += String.fromCharCode(g4), 64 !== r4 && (I2 += String.fromCharCode(C3)), 64 !== o3 && (I2 += String.fromCharCode(n3));
          } while (i2 < A4.length);
          return I2;
        };
        function V2(A4) {
          if (N2(A4)) {
            if (A4 = A4.slice(m2.length), "boolean" == typeof t2 && t2) {
              try {
                var I2 = Buffer.from(A4, "base64");
              } catch (i3) {
                I2 = new Buffer(A4, "base64");
              }
              var i2 = new Uint8Array(I2.buffer, I2.byteOffset, I2.byteLength);
            } else try {
              var g4 = O2(A4), C3 = new Uint8Array(g4.length);
              for (I2 = 0; I2 < g4.length; ++I2) C3[I2] = g4.charCodeAt(I2);
              i2 = C3;
            } catch (A5) {
              throw Error("Converting base64 string to bytes failed.");
            }
            return i2;
          }
        }
        var Z2 = g3.asm({}, { b: $2, a: function(A4, I2, i2) {
          y2.set(y2.subarray(I2, I2 + i2), A4);
        } }, F2);
        g3.asm = Z2, g3._emscripten_work = function() {
          return g3.asm.c.apply(null, arguments);
        };
        var q2 = g3.stackAlloc = function() {
          return g3.asm.d.apply(null, arguments);
        }, T2 = g3.stackRestore = function() {
          return g3.asm.e.apply(null, arguments);
        }, W2 = g3.stackSave = function() {
          return g3.asm.f.apply(null, arguments);
        };
        function z2(A4) {
          this.name = "ExitStatus", this.message = "Program terminated with exit(" + A4 + ")", this.status = A4;
        }
        function _2() {
          function A4() {
            if (!g3.calledRun && (g3.calledRun = true, !u2)) {
              if (M2 || (M2 = true, k2(H2)), k2(v2), g3.onRuntimeInitialized && g3.onRuntimeInitialized(), g3.postRun) for ("function" == typeof g3.postRun && (g3.postRun = [g3.postRun]); g3.postRun.length; ) {
                var A5 = g3.postRun.shift();
                Y2.unshift(A5);
              }
              k2(Y2);
            }
          }
          if (!(0 < x2)) {
            if (g3.preRun) for ("function" == typeof g3.preRun && (g3.preRun = [g3.preRun]); g3.preRun.length; ) b2();
            k2(p2), 0 < x2 || g3.calledRun || (g3.setStatus ? (g3.setStatus("Running..."), setTimeout((function() {
              setTimeout((function() {
                g3.setStatus("");
              }), 1), A4();
            }), 1)) : A4());
          }
        }
        function $2(A4) {
          throw g3.onAbort && g3.onAbort(A4), void 0 !== A4 ? (f2(A4), E2(A4), A4 = JSON.stringify(A4)) : A4 = "", u2 = true, "abort(" + A4 + "). Build with -s ASSERTIONS=1 for more info.";
        }
        if (g3.asm = Z2, g3.cwrap = function(A4, I2, i2, g4) {
          var C3 = (i2 = i2 || []).every((function(A5) {
            return "number" === A5;
          }));
          return "string" !== I2 && C3 && !g4 ? l2(A4) : function() {
            return S2(A4, I2, i2, arguments);
          };
        }, g3.then = function(A4) {
          if (g3.calledRun) A4(g3);
          else {
            var I2 = g3.onRuntimeInitialized;
            g3.onRuntimeInitialized = function() {
              I2 && I2(), A4(g3);
            };
          }
          return g3;
        }, z2.prototype = Error(), z2.prototype.constructor = z2, K2 = function A4() {
          g3.calledRun || _2(), g3.calledRun || (K2 = A4);
        }, g3.run = _2, g3.abort = $2, g3.preInit) for ("function" == typeof g3.preInit && (g3.preInit = [g3.preInit]); 0 < g3.preInit.length; ) g3.preInit.pop()();
        return g3.noExitRuntime = true, _2(), A3;
      });
      A2.exports = r2;
    }));
    if ("[object process]" === Object.prototype.toString.call("undefined" != typeof process ? process : 0)) {
      h = __require("util").promisify;
      e = h(__require("crypto").randomFill);
    } else e = function(A2) {
      return new Promise((function(I2) {
        crypto.getRandomValues(A2), I2();
      }));
    };
    var h;
    function a(A2) {
      if (!A2) return "";
      for (var I2 = "", i2 = 0; i2 < A2.length; i2++) {
        var g2 = (255 & A2[i2]).toString(16);
        I2 += g2 = 1 === g2.length ? "0" + g2 : g2;
      }
      return I2.toUpperCase();
    }
    function Q(A2) {
      if (!A2) return new Uint8Array();
      for (var I2 = [], i2 = 0; i2 < A2.length; i2 += 2) I2.push(parseInt(A2.substr(i2, 2), 16));
      return new Uint8Array(I2);
    }
    var B = "13456789abcdefghijkmnopqrstuwxyz";
    function f(A2) {
      for (var I2 = A2.length, i2 = 8 * I2 % 5, g2 = 0 === i2 ? 0 : 5 - i2, C2 = 0, r2 = "", o2 = 0, n2 = 0; n2 < I2; n2++) for (C2 = C2 << 8 | A2[n2], o2 += 8; o2 >= 5; ) r2 += B[C2 >>> o2 + g2 - 5 & 31], o2 -= 5;
      return o2 > 0 && (r2 += B[C2 << 5 - (o2 + g2) & 31]), r2;
    }
    function E(A2) {
      var I2 = B.indexOf(A2);
      if (-1 === I2) throw new Error("Invalid character found: " + A2);
      return I2;
    }
    function w(A2) {
      for (var I2 = A2.length, i2 = 5 * I2 % 8, g2 = 0 === i2 ? 0 : 8 - i2, C2 = 0, r2 = 0, o2 = 0, n2 = new Uint8Array(Math.ceil(5 * I2 / 8)), e2 = 0; e2 < I2; e2++) r2 = r2 << 5 | E(A2[e2]), (C2 += 5) >= 8 && (n2[o2++] = r2 >>> C2 + g2 - 8 & 255, C2 -= 8);
      return C2 > 0 && (n2[o2++] = r2 << C2 + g2 - 8 & 255), 0 !== i2 && (n2 = n2.slice(1)), n2;
    }
    function s(A2) {
      var I2, i2 = { valid: false, publicKeyBytes: null };
      if (!l(A2) || !/^(xrb_|nano_)[13][13-9a-km-uw-z]{59}$/.test(A2)) return i2;
      I2 = A2.startsWith("xrb_") ? 4 : 5;
      var g2 = w(A2.substr(I2, 52));
      return (function(A3, I3) {
        for (var i3 = 0; i3 < A3.length; i3++) if (A3[i3] !== I3[i3]) return false;
        return true;
      })(w(A2.substr(I2 + 52)), C.blake2b(g2, null, 5).reverse()) ? { publicKeyBytes: g2, valid: true } : i2;
    }
    var u = Math.pow(2, 32) - 1;
    var c = new g("0xffffffffffffffffffffffffffffffff");
    function l(A2) {
      return "string" == typeof A2;
    }
    function S(A2) {
      return "0" === A2 || !(!l(A2) || !/^[1-9]{1}[0-9]{0,38}$/.test(A2)) && new g(A2).isLessThanOrEqualTo(c);
    }
    function U(A2) {
      return l(A2) && /^[0-9a-fA-F]{64}$/.test(A2);
    }
    function F(A2) {
      return l(A2) && /^[0-9a-fA-F]{16}$/.test(A2);
    }
    function G(A2) {
      return Number.isInteger(A2) && A2 >= 0 && A2 <= u;
    }
    function y(A2) {
      return U(A2);
    }
    function d(A2) {
      return U(A2);
    }
    function D(A2) {
      return s(A2).valid;
    }
    function k(A2) {
      return l(A2) && /^[0-9a-fA-F]{16}$/.test(A2);
    }
    function p(A2) {
      return l(A2) && /^[0-9a-fA-F]{128}$/.test(A2);
    }
    var H = { loaded: false, work: null };
    function v() {
      return new Promise((function(A2, I2) {
        if (H.loaded) return A2(H);
        try {
          t().then((function(I3) {
            var i2 = Object.assign(H, { loaded: true, work: I3.cwrap("emscripten_work", "string", ["string", "string", "number", "number"]) });
            A2(i2);
          }));
        } catch (A3) {
          I2(A3);
        }
      }));
    }
    var Y = function(A2) {
      var I2 = new Float64Array(16);
      if (A2) for (var i2 = 0; i2 < A2.length; i2++) I2[i2] = A2[i2];
      return I2;
    };
    new Uint8Array(32)[0] = 9;
    var M = Y();
    var b = Y([1]);
    var x = Y([30883, 4953, 19914, 30187, 55467, 16705, 2637, 112, 59544, 30585, 16505, 36039, 65139, 11119, 27886, 20995]);
    var K = Y([61785, 9906, 39828, 60374, 45398, 33411, 5274, 224, 53552, 61171, 33010, 6542, 64743, 22239, 55772, 9222]);
    var m = Y([54554, 36645, 11616, 51542, 42930, 38181, 51040, 26924, 56412, 64982, 57905, 49316, 21502, 52590, 14035, 8553]);
    var N = Y([26200, 26214, 26214, 26214, 26214, 26214, 26214, 26214, 26214, 26214, 26214, 26214, 26214, 26214, 26214, 26214]);
    var L = Y([41136, 18958, 6951, 50414, 58488, 44335, 6150, 12099, 55207, 15867, 153, 11085, 57099, 20417, 9344, 11139]);
    function R(A2, I2, i2, g2) {
      return (function(A3, I3, i3, g3, C2) {
        for (var r2 = 0, o2 = 0; o2 < C2; o2++) r2 |= A3[I3 + o2] ^ i3[g3 + o2];
        return (1 & r2 - 1 >>> 8) - 1;
      })(A2, I2, i2, g2, 32);
    }
    function P(A2, I2) {
      var i2;
      for (i2 = 0; i2 < 16; i2++) A2[i2] = 0 | I2[i2];
    }
    function J(A2) {
      for (var I2, i2 = 1, g2 = 0; g2 < 16; g2++) I2 = A2[g2] + i2 + 65535, i2 = Math.floor(I2 / 65536), A2[g2] = I2 - 65536 * i2;
      A2[0] += i2 - 1 + 37 * (i2 - 1);
    }
    function j(A2, I2, i2) {
      for (var g2, C2 = ~(i2 - 1), r2 = 0; r2 < 16; r2++) g2 = C2 & (A2[r2] ^ I2[r2]), A2[r2] ^= g2, I2[r2] ^= g2;
    }
    function X(A2, I2) {
      for (var i2, g2 = Y(), C2 = Y(), r2 = 0; r2 < 16; r2++) C2[r2] = I2[r2];
      J(C2), J(C2), J(C2);
      for (var o2 = 0; o2 < 2; o2++) {
        g2[0] = C2[0] - 65517;
        for (r2 = 1; r2 < 15; r2++) g2[r2] = C2[r2] - 65535 - (g2[r2 - 1] >> 16 & 1), g2[r2 - 1] &= 65535;
        g2[15] = C2[15] - 32767 - (g2[14] >> 16 & 1), i2 = g2[15] >> 16 & 1, g2[14] &= 65535, j(C2, g2, 1 - i2);
      }
      for (r2 = 0; r2 < 16; r2++) A2[2 * r2] = 255 & C2[r2], A2[2 * r2 + 1] = C2[r2] >> 8;
    }
    function O(A2, I2) {
      var i2 = new Uint8Array(32), g2 = new Uint8Array(32);
      return X(i2, A2), X(g2, I2), R(i2, 0, g2, 0);
    }
    function V(A2) {
      var I2 = new Uint8Array(32);
      return X(I2, A2), 1 & I2[0];
    }
    function Z(A2, I2, i2) {
      for (var g2 = 0; g2 < 16; g2++) A2[g2] = I2[g2] + i2[g2];
    }
    function q(A2, I2, i2) {
      for (var g2 = 0; g2 < 16; g2++) A2[g2] = I2[g2] - i2[g2];
    }
    function T(A2, I2, i2) {
      var g2, C2, r2 = 0, o2 = 0, n2 = 0, e2 = 0, t2 = 0, h2 = 0, a2 = 0, Q2 = 0, B2 = 0, f2 = 0, E2 = 0, w2 = 0, s2 = 0, u2 = 0, c2 = 0, l2 = 0, S2 = 0, U2 = 0, F2 = 0, G2 = 0, y2 = 0, d2 = 0, D2 = 0, k2 = 0, p2 = 0, H2 = 0, v2 = 0, Y2 = 0, M2 = 0, b2 = 0, x2 = 0, K2 = i2[0], m2 = i2[1], N2 = i2[2], L2 = i2[3], R2 = i2[4], P2 = i2[5], J2 = i2[6], j2 = i2[7], X2 = i2[8], O2 = i2[9], V2 = i2[10], Z2 = i2[11], q2 = i2[12], T2 = i2[13], W2 = i2[14], z2 = i2[15];
      r2 += (g2 = I2[0]) * K2, o2 += g2 * m2, n2 += g2 * N2, e2 += g2 * L2, t2 += g2 * R2, h2 += g2 * P2, a2 += g2 * J2, Q2 += g2 * j2, B2 += g2 * X2, f2 += g2 * O2, E2 += g2 * V2, w2 += g2 * Z2, s2 += g2 * q2, u2 += g2 * T2, c2 += g2 * W2, l2 += g2 * z2, o2 += (g2 = I2[1]) * K2, n2 += g2 * m2, e2 += g2 * N2, t2 += g2 * L2, h2 += g2 * R2, a2 += g2 * P2, Q2 += g2 * J2, B2 += g2 * j2, f2 += g2 * X2, E2 += g2 * O2, w2 += g2 * V2, s2 += g2 * Z2, u2 += g2 * q2, c2 += g2 * T2, l2 += g2 * W2, S2 += g2 * z2, n2 += (g2 = I2[2]) * K2, e2 += g2 * m2, t2 += g2 * N2, h2 += g2 * L2, a2 += g2 * R2, Q2 += g2 * P2, B2 += g2 * J2, f2 += g2 * j2, E2 += g2 * X2, w2 += g2 * O2, s2 += g2 * V2, u2 += g2 * Z2, c2 += g2 * q2, l2 += g2 * T2, S2 += g2 * W2, U2 += g2 * z2, e2 += (g2 = I2[3]) * K2, t2 += g2 * m2, h2 += g2 * N2, a2 += g2 * L2, Q2 += g2 * R2, B2 += g2 * P2, f2 += g2 * J2, E2 += g2 * j2, w2 += g2 * X2, s2 += g2 * O2, u2 += g2 * V2, c2 += g2 * Z2, l2 += g2 * q2, S2 += g2 * T2, U2 += g2 * W2, F2 += g2 * z2, t2 += (g2 = I2[4]) * K2, h2 += g2 * m2, a2 += g2 * N2, Q2 += g2 * L2, B2 += g2 * R2, f2 += g2 * P2, E2 += g2 * J2, w2 += g2 * j2, s2 += g2 * X2, u2 += g2 * O2, c2 += g2 * V2, l2 += g2 * Z2, S2 += g2 * q2, U2 += g2 * T2, F2 += g2 * W2, G2 += g2 * z2, h2 += (g2 = I2[5]) * K2, a2 += g2 * m2, Q2 += g2 * N2, B2 += g2 * L2, f2 += g2 * R2, E2 += g2 * P2, w2 += g2 * J2, s2 += g2 * j2, u2 += g2 * X2, c2 += g2 * O2, l2 += g2 * V2, S2 += g2 * Z2, U2 += g2 * q2, F2 += g2 * T2, G2 += g2 * W2, y2 += g2 * z2, a2 += (g2 = I2[6]) * K2, Q2 += g2 * m2, B2 += g2 * N2, f2 += g2 * L2, E2 += g2 * R2, w2 += g2 * P2, s2 += g2 * J2, u2 += g2 * j2, c2 += g2 * X2, l2 += g2 * O2, S2 += g2 * V2, U2 += g2 * Z2, F2 += g2 * q2, G2 += g2 * T2, y2 += g2 * W2, d2 += g2 * z2, Q2 += (g2 = I2[7]) * K2, B2 += g2 * m2, f2 += g2 * N2, E2 += g2 * L2, w2 += g2 * R2, s2 += g2 * P2, u2 += g2 * J2, c2 += g2 * j2, l2 += g2 * X2, S2 += g2 * O2, U2 += g2 * V2, F2 += g2 * Z2, G2 += g2 * q2, y2 += g2 * T2, d2 += g2 * W2, D2 += g2 * z2, B2 += (g2 = I2[8]) * K2, f2 += g2 * m2, E2 += g2 * N2, w2 += g2 * L2, s2 += g2 * R2, u2 += g2 * P2, c2 += g2 * J2, l2 += g2 * j2, S2 += g2 * X2, U2 += g2 * O2, F2 += g2 * V2, G2 += g2 * Z2, y2 += g2 * q2, d2 += g2 * T2, D2 += g2 * W2, k2 += g2 * z2, f2 += (g2 = I2[9]) * K2, E2 += g2 * m2, w2 += g2 * N2, s2 += g2 * L2, u2 += g2 * R2, c2 += g2 * P2, l2 += g2 * J2, S2 += g2 * j2, U2 += g2 * X2, F2 += g2 * O2, G2 += g2 * V2, y2 += g2 * Z2, d2 += g2 * q2, D2 += g2 * T2, k2 += g2 * W2, p2 += g2 * z2, E2 += (g2 = I2[10]) * K2, w2 += g2 * m2, s2 += g2 * N2, u2 += g2 * L2, c2 += g2 * R2, l2 += g2 * P2, S2 += g2 * J2, U2 += g2 * j2, F2 += g2 * X2, G2 += g2 * O2, y2 += g2 * V2, d2 += g2 * Z2, D2 += g2 * q2, k2 += g2 * T2, p2 += g2 * W2, H2 += g2 * z2, w2 += (g2 = I2[11]) * K2, s2 += g2 * m2, u2 += g2 * N2, c2 += g2 * L2, l2 += g2 * R2, S2 += g2 * P2, U2 += g2 * J2, F2 += g2 * j2, G2 += g2 * X2, y2 += g2 * O2, d2 += g2 * V2, D2 += g2 * Z2, k2 += g2 * q2, p2 += g2 * T2, H2 += g2 * W2, v2 += g2 * z2, s2 += (g2 = I2[12]) * K2, u2 += g2 * m2, c2 += g2 * N2, l2 += g2 * L2, S2 += g2 * R2, U2 += g2 * P2, F2 += g2 * J2, G2 += g2 * j2, y2 += g2 * X2, d2 += g2 * O2, D2 += g2 * V2, k2 += g2 * Z2, p2 += g2 * q2, H2 += g2 * T2, v2 += g2 * W2, Y2 += g2 * z2, u2 += (g2 = I2[13]) * K2, c2 += g2 * m2, l2 += g2 * N2, S2 += g2 * L2, U2 += g2 * R2, F2 += g2 * P2, G2 += g2 * J2, y2 += g2 * j2, d2 += g2 * X2, D2 += g2 * O2, k2 += g2 * V2, p2 += g2 * Z2, H2 += g2 * q2, v2 += g2 * T2, Y2 += g2 * W2, M2 += g2 * z2, c2 += (g2 = I2[14]) * K2, l2 += g2 * m2, S2 += g2 * N2, U2 += g2 * L2, F2 += g2 * R2, G2 += g2 * P2, y2 += g2 * J2, d2 += g2 * j2, D2 += g2 * X2, k2 += g2 * O2, p2 += g2 * V2, H2 += g2 * Z2, v2 += g2 * q2, Y2 += g2 * T2, M2 += g2 * W2, b2 += g2 * z2, l2 += (g2 = I2[15]) * K2, o2 += 38 * (U2 += g2 * N2), n2 += 38 * (F2 += g2 * L2), e2 += 38 * (G2 += g2 * R2), t2 += 38 * (y2 += g2 * P2), h2 += 38 * (d2 += g2 * J2), a2 += 38 * (D2 += g2 * j2), Q2 += 38 * (k2 += g2 * X2), B2 += 38 * (p2 += g2 * O2), f2 += 38 * (H2 += g2 * V2), E2 += 38 * (v2 += g2 * Z2), w2 += 38 * (Y2 += g2 * q2), s2 += 38 * (M2 += g2 * T2), u2 += 38 * (b2 += g2 * W2), c2 += 38 * (x2 += g2 * z2), r2 = (g2 = (r2 += 38 * (S2 += g2 * m2)) + (C2 = 1) + 65535) - 65536 * (C2 = Math.floor(g2 / 65536)), o2 = (g2 = o2 + C2 + 65535) - 65536 * (C2 = Math.floor(g2 / 65536)), n2 = (g2 = n2 + C2 + 65535) - 65536 * (C2 = Math.floor(g2 / 65536)), e2 = (g2 = e2 + C2 + 65535) - 65536 * (C2 = Math.floor(g2 / 65536)), t2 = (g2 = t2 + C2 + 65535) - 65536 * (C2 = Math.floor(g2 / 65536)), h2 = (g2 = h2 + C2 + 65535) - 65536 * (C2 = Math.floor(g2 / 65536)), a2 = (g2 = a2 + C2 + 65535) - 65536 * (C2 = Math.floor(g2 / 65536)), Q2 = (g2 = Q2 + C2 + 65535) - 65536 * (C2 = Math.floor(g2 / 65536)), B2 = (g2 = B2 + C2 + 65535) - 65536 * (C2 = Math.floor(g2 / 65536)), f2 = (g2 = f2 + C2 + 65535) - 65536 * (C2 = Math.floor(g2 / 65536)), E2 = (g2 = E2 + C2 + 65535) - 65536 * (C2 = Math.floor(g2 / 65536)), w2 = (g2 = w2 + C2 + 65535) - 65536 * (C2 = Math.floor(g2 / 65536)), s2 = (g2 = s2 + C2 + 65535) - 65536 * (C2 = Math.floor(g2 / 65536)), u2 = (g2 = u2 + C2 + 65535) - 65536 * (C2 = Math.floor(g2 / 65536)), c2 = (g2 = c2 + C2 + 65535) - 65536 * (C2 = Math.floor(g2 / 65536)), l2 = (g2 = l2 + C2 + 65535) - 65536 * (C2 = Math.floor(g2 / 65536)), r2 = (g2 = (r2 += C2 - 1 + 37 * (C2 - 1)) + (C2 = 1) + 65535) - 65536 * (C2 = Math.floor(g2 / 65536)), o2 = (g2 = o2 + C2 + 65535) - 65536 * (C2 = Math.floor(g2 / 65536)), n2 = (g2 = n2 + C2 + 65535) - 65536 * (C2 = Math.floor(g2 / 65536)), e2 = (g2 = e2 + C2 + 65535) - 65536 * (C2 = Math.floor(g2 / 65536)), t2 = (g2 = t2 + C2 + 65535) - 65536 * (C2 = Math.floor(g2 / 65536)), h2 = (g2 = h2 + C2 + 65535) - 65536 * (C2 = Math.floor(g2 / 65536)), a2 = (g2 = a2 + C2 + 65535) - 65536 * (C2 = Math.floor(g2 / 65536)), Q2 = (g2 = Q2 + C2 + 65535) - 65536 * (C2 = Math.floor(g2 / 65536)), B2 = (g2 = B2 + C2 + 65535) - 65536 * (C2 = Math.floor(g2 / 65536)), f2 = (g2 = f2 + C2 + 65535) - 65536 * (C2 = Math.floor(g2 / 65536)), E2 = (g2 = E2 + C2 + 65535) - 65536 * (C2 = Math.floor(g2 / 65536)), w2 = (g2 = w2 + C2 + 65535) - 65536 * (C2 = Math.floor(g2 / 65536)), s2 = (g2 = s2 + C2 + 65535) - 65536 * (C2 = Math.floor(g2 / 65536)), u2 = (g2 = u2 + C2 + 65535) - 65536 * (C2 = Math.floor(g2 / 65536)), c2 = (g2 = c2 + C2 + 65535) - 65536 * (C2 = Math.floor(g2 / 65536)), l2 = (g2 = l2 + C2 + 65535) - 65536 * (C2 = Math.floor(g2 / 65536)), r2 += C2 - 1 + 37 * (C2 - 1), A2[0] = r2, A2[1] = o2, A2[2] = n2, A2[3] = e2, A2[4] = t2, A2[5] = h2, A2[6] = a2, A2[7] = Q2, A2[8] = B2, A2[9] = f2, A2[10] = E2, A2[11] = w2, A2[12] = s2, A2[13] = u2, A2[14] = c2, A2[15] = l2;
    }
    function W(A2, I2) {
      T(A2, I2, I2);
    }
    function z(A2, I2, i2) {
      for (var g2 = new Uint8Array(i2), C2 = 0; C2 < i2; ++C2) g2[C2] = I2[C2];
      var o2 = r.blake2b(g2);
      for (C2 = 0; C2 < 64; ++C2) A2[C2] = o2[C2];
      return 0;
    }
    function _(A2, I2) {
      var i2 = Y(), g2 = Y(), C2 = Y(), r2 = Y(), o2 = Y(), n2 = Y(), e2 = Y(), t2 = Y(), h2 = Y();
      q(i2, A2[1], A2[0]), q(h2, I2[1], I2[0]), T(i2, i2, h2), Z(g2, A2[0], A2[1]), Z(h2, I2[0], I2[1]), T(g2, g2, h2), T(C2, A2[3], I2[3]), T(C2, C2, K), T(r2, A2[2], I2[2]), Z(r2, r2, r2), q(o2, g2, i2), q(n2, r2, C2), Z(e2, r2, C2), Z(t2, g2, i2), T(A2[0], o2, n2), T(A2[1], t2, e2), T(A2[2], e2, n2), T(A2[3], o2, t2);
    }
    function $(A2, I2, i2) {
      var g2;
      for (g2 = 0; g2 < 4; g2++) j(A2[g2], I2[g2], i2);
    }
    function AA(A2, I2) {
      var i2 = Y(), g2 = Y(), C2 = Y();
      !(function(A3, I3) {
        var i3, g3 = Y();
        for (i3 = 0; i3 < 16; i3++) g3[i3] = I3[i3];
        for (i3 = 253; i3 >= 0; i3--) W(g3, g3), 2 !== i3 && 4 !== i3 && T(g3, g3, I3);
        for (i3 = 0; i3 < 16; i3++) A3[i3] = g3[i3];
      })(C2, I2[2]), T(i2, I2[0], C2), T(g2, I2[1], C2), X(A2, g2), A2[31] ^= V(i2) << 7;
    }
    function IA(A2, I2, i2) {
      var g2, C2;
      for (P(A2[0], M), P(A2[1], b), P(A2[2], b), P(A2[3], M), C2 = 255; C2 >= 0; --C2) $(A2, I2, g2 = i2[C2 / 8 | 0] >> (7 & C2) & 1), _(I2, A2), _(A2, A2), $(A2, I2, g2);
    }
    function iA(A2, I2) {
      var i2 = [Y(), Y(), Y(), Y()];
      P(i2[0], m), P(i2[1], N), P(i2[2], b), T(i2[3], m, N), IA(A2, i2, I2);
    }
    var gA;
    var CA = new Float64Array([237, 211, 245, 92, 26, 99, 18, 88, 214, 156, 247, 162, 222, 249, 222, 20, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 16]);
    function rA(A2, I2) {
      var i2, g2, C2, r2;
      for (g2 = 63; g2 >= 32; --g2) {
        for (i2 = 0, C2 = g2 - 32, r2 = g2 - 12; C2 < r2; ++C2) I2[C2] += i2 - 16 * I2[g2] * CA[C2 - (g2 - 32)], i2 = I2[C2] + 128 >> 8, I2[C2] -= 256 * i2;
        I2[C2] += i2, I2[g2] = 0;
      }
      for (i2 = 0, C2 = 0; C2 < 32; C2++) I2[C2] += i2 - (I2[31] >> 4) * CA[C2], i2 = I2[C2] >> 8, I2[C2] &= 255;
      for (C2 = 0; C2 < 32; C2++) I2[C2] -= i2 * CA[C2];
      for (g2 = 0; g2 < 32; g2++) I2[g2 + 1] += I2[g2] >> 8, A2[g2] = 255 & I2[g2];
    }
    function oA(A2) {
      for (var I2 = new Float64Array(64), i2 = 0; i2 < 64; i2++) I2[i2] = A2[i2];
      for (i2 = 0; i2 < 64; i2++) A2[i2] = 0;
      rA(A2, I2);
    }
    function nA(A2) {
      var I2 = new Uint8Array(64), i2 = [Y(), Y(), Y(), Y()], g2 = new Uint8Array(32), C2 = r.blake2bInit(64);
      return r.blake2bUpdate(C2, A2), (I2 = r.blake2bFinal(C2))[0] &= 248, I2[31] &= 127, I2[31] |= 64, iA(i2, I2), AA(g2, i2), g2;
    }
    function eA(A2, I2) {
      var i2 = Y(), g2 = Y(), C2 = Y(), r2 = Y(), o2 = Y(), n2 = Y(), e2 = Y();
      return P(A2[2], b), (function(A3, I3) {
        var i3;
        for (i3 = 0; i3 < 16; i3++) A3[i3] = I3[2 * i3] + (I3[2 * i3 + 1] << 8);
        A3[15] &= 32767;
      })(A2[1], I2), W(C2, A2[1]), T(r2, C2, x), q(C2, C2, A2[2]), Z(r2, A2[2], r2), W(o2, r2), W(n2, o2), T(e2, n2, o2), T(i2, e2, C2), T(i2, i2, r2), (function(A3, I3) {
        var i3, g3 = Y();
        for (i3 = 0; i3 < 16; i3++) g3[i3] = I3[i3];
        for (i3 = 250; i3 >= 0; i3--) W(g3, g3), 1 !== i3 && T(g3, g3, I3);
        for (i3 = 0; i3 < 16; i3++) A3[i3] = g3[i3];
      })(i2, i2), T(i2, i2, C2), T(i2, i2, r2), T(i2, i2, r2), T(A2[0], i2, r2), W(g2, A2[0]), T(g2, g2, r2), O(g2, C2) && T(A2[0], A2[0], L), W(g2, A2[0]), T(g2, g2, r2), O(g2, C2) ? -1 : (V(A2[0]) === I2[31] >> 7 && q(A2[0], M, A2[0]), T(A2[3], A2[0], A2[1]), 0);
    }
    function tA(A2, I2) {
      if (32 !== I2.length) throw new Error("bad secret key size");
      var i2 = new Uint8Array(64 + A2.length);
      return (function(A3, I3, i3, g2) {
        var C2, r2, o2 = new Uint8Array(64), n2 = new Uint8Array(64), e2 = new Uint8Array(64), t2 = new Float64Array(64), h2 = [Y(), Y(), Y(), Y()], a2 = nA(g2);
        z(o2, g2, 32), o2[0] &= 248, o2[31] &= 127, o2[31] |= 64;
        var Q2 = i3 + 64;
        for (C2 = 0; C2 < i3; C2++) A3[64 + C2] = I3[C2];
        for (C2 = 0; C2 < 32; C2++) A3[32 + C2] = o2[32 + C2];
        for (z(e2, A3.subarray(32), i3 + 32), oA(e2), iA(h2, e2), AA(A3, h2), C2 = 32; C2 < 64; C2++) A3[C2] = a2[C2 - 32];
        for (z(n2, A3, i3 + 64), oA(n2), C2 = 0; C2 < 64; C2++) t2[C2] = 0;
        for (C2 = 0; C2 < 32; C2++) t2[C2] = e2[C2];
        for (C2 = 0; C2 < 32; C2++) for (r2 = 0; r2 < 32; r2++) t2[C2 + r2] += n2[C2] * o2[r2];
        rA(A3.subarray(32), t2);
      })(i2, A2, A2.length, I2), i2;
    }
    function hA(A2, I2, i2) {
      if (64 !== I2.length) throw new Error("bad signature size");
      if (32 !== i2.length) throw new Error("bad public key size");
      var g2, C2 = new Uint8Array(64 + A2.length), r2 = new Uint8Array(64 + A2.length);
      for (g2 = 0; g2 < 64; g2++) C2[g2] = I2[g2];
      for (g2 = 0; g2 < A2.length; g2++) C2[g2 + 64] = A2[g2];
      return (function(A3, I3, i3, g3) {
        var C3, r3 = new Uint8Array(32), o2 = new Uint8Array(64), n2 = [Y(), Y(), Y(), Y()], e2 = [Y(), Y(), Y(), Y()];
        if (-1, i3 < 64) return -1;
        if (eA(e2, g3)) return -1;
        for (C3 = 0; C3 < i3; C3++) A3[C3] = I3[C3];
        for (C3 = 0; C3 < 32; C3++) A3[C3 + 32] = g3[C3];
        if (z(o2, A3, i3), oA(o2), IA(n2, e2, o2), iA(e2, I3.subarray(32)), _(n2, e2), AA(r3, n2), i3 -= 64, R(I3, 0, r3, 0)) {
          for (C3 = 0; C3 < i3; C3++) A3[C3] = 0;
          return -1;
        }
        for (C3 = 0; C3 < i3; C3++) A3[C3] = I3[C3 + 64];
        return i3;
      })(r2, C2, C2.length, i2) >= 0;
    }
    function aA(A2) {
      var I2, i2 = d(A2), g2 = s(A2), C2 = g2.valid;
      if (!i2 && !C2) throw new Error("Secret key or address is not valid");
      i2 ? I2 = nA(Q(A2)) : I2 = g2.publicKeyBytes;
      return a(I2);
    }
    function QA(A2, I2) {
      if (void 0 === I2 && (I2 = {}), !d(A2)) throw new Error("Public key is not valid");
      var i2 = Q(A2), g2 = Q(A2), r2 = "xrb_";
      return true === I2.useNanoPrefix && (r2 = "nano_"), r2 + f(g2) + f(C.blake2b(i2, null, 5).reverse());
    }
    (gA = exports.Unit || (exports.Unit = {})).hex = "hex", gA.raw = "raw", gA.nano = "nano", gA.knano = "knano", gA.Nano = "Nano", gA.NANO = "NANO", gA.KNano = "KNano", gA.MNano = "MNano";
    var BA = { hex: 0, raw: 0, nano: 24, knano: 27, Nano: 30, NANO: 30, KNano: 33, MNano: 36 };
    var fA = g.clone({ EXPONENTIAL_AT: 1e9, DECIMAL_PLACES: BA.MNano });
    function EA(A2, I2) {
      var i2 = new Error("From or to is not valid");
      if (!I2) throw i2;
      var g2 = BA[I2.from], C2 = BA[I2.to];
      if (void 0 === g2 || void 0 === C2) throw new Error("From or to is not valid");
      var r2 = new Error("Value is not valid");
      if ("hex" === I2.from) {
        if (!/^[0-9a-fA-F]{32}$/.test(A2)) throw r2;
      } else if (!(function(A3) {
        if (!l(A3)) return false;
        if (A3.startsWith(".") || A3.endsWith(".")) return false;
        var I3 = A3.replace(".", "");
        if (A3.length - I3.length > 1) return false;
        for (var i3 = 0, g3 = I3; i3 < g3.length; i3++) {
          var C3 = g3[i3];
          if (C3 < "0" || C3 > "9") return false;
        }
        return true;
      })(A2)) throw r2;
      var o2, n2 = g2 - C2;
      if (o2 = "hex" === I2.from ? new fA("0x" + A2) : new fA(A2), n2 < 0) for (var e2 = 0; e2 < -n2; e2++) o2 = o2.dividedBy(10);
      else if (n2 > 0) for (e2 = 0; e2 < n2; e2++) o2 = o2.multipliedBy(10);
      return "hex" === I2.to ? o2.toString(16).padStart(32, "0") : o2.toString();
    }
    var wA = new Uint8Array(32);
    function sA(A2) {
      var I2, i2 = Q(aA(A2.account)), g2 = Q(A2.previous), r2 = Q(aA(A2.representative)), o2 = Q(EA(A2.balance, { from: exports.Unit.raw, to: exports.Unit.hex }));
      I2 = D(A2.link) ? Q(aA(A2.link)) : Q(A2.link);
      var n2 = C.blake2bInit(32);
      return C.blake2bUpdate(n2, wA), C.blake2bUpdate(n2, i2), C.blake2bUpdate(n2, g2), C.blake2bUpdate(n2, r2), C.blake2bUpdate(n2, o2), C.blake2bUpdate(n2, I2), a(C.blake2bFinal(n2));
    }
    function uA(A2) {
      if (!y(A2.hash)) throw new Error("Hash is not valid");
      if (!d(A2.secretKey)) throw new Error("Secret key is not valid");
      return a((function(A3, I2) {
        for (var i2 = tA(A3, I2), g2 = new Uint8Array(64), C2 = 0; C2 < g2.length; C2++) g2[C2] = i2[C2];
        return g2;
      })(Q(A2.hash), Q(A2.secretKey)));
    }
    wA[31] = 6;
    var cA = "0000000000000000000000000000000000000000000000000000000000000000";
    exports.checkAddress = D, exports.checkAmount = S, exports.checkHash = y, exports.checkIndex = G, exports.checkKey = d, exports.checkSeed = U, exports.checkSignature = p, exports.checkThreshold = F, exports.checkWork = k, exports.computeWork = function(A2, I2) {
      return void 0 === I2 && (I2 = {}), o(this, void 0, void 0, (function() {
        var i2, g2, C2, r2, o2, e2, t2, h2;
        return n(this, (function(n2) {
          switch (n2.label) {
            case 0:
              return i2 = I2.workerIndex, g2 = void 0 === i2 ? 0 : i2, C2 = I2.workerCount, r2 = void 0 === C2 ? 1 : C2, o2 = I2.workThreshold, e2 = void 0 === o2 ? "ffffffc000000000" : o2, [4, v()];
            case 1:
              if (t2 = n2.sent(), !y(A2)) throw new Error("Hash is not valid");
              if (!F(e2)) throw new Error("Threshold is not valid");
              if (!Number.isInteger(g2) || !Number.isInteger(r2) || g2 < 0 || r2 < 1 || g2 > r2 - 1) throw new Error("Worker parameters are not valid");
              return h2 = t2.work(A2, e2, g2, r2), "1" === h2[1] ? [2, h2.substr(2)] : [2, null];
          }
        }));
      }));
    }, exports.convert = EA, exports.createBlock = function(A2, I2) {
      if (!d(A2)) throw new Error("Secret key is not valid");
      if (void 0 === I2.work) throw new Error("Work is not set");
      if (!D(I2.representative)) throw new Error("Representative is not valid");
      if (!S(I2.balance)) throw new Error("Balance is not valid");
      var i2;
      if (null === I2.previous) i2 = cA;
      else if (!y(i2 = I2.previous)) throw new Error("Previous is not valid");
      var g2, C2 = false;
      if (null === I2.link) g2 = cA;
      else if (D(g2 = I2.link)) C2 = true;
      else if (!y(g2)) throw new Error("Link is not valid");
      if (i2 === cA && (C2 || g2 === cA)) throw new Error("Block is impossible");
      var r2, o2, n2 = QA(aA(A2)), e2 = sA({ account: n2, previous: i2, representative: I2.representative, balance: I2.balance, link: g2 }), t2 = uA({ hash: e2, secretKey: A2 });
      return C2 ? r2 = aA(o2 = g2) : o2 = QA(r2 = g2), { hash: e2, block: { type: "state", account: n2, previous: i2, representative: I2.representative, balance: I2.balance, link: r2, link_as_account: o2, work: I2.work, signature: t2 } };
    }, exports.deriveAddress = QA, exports.derivePublicKey = aA, exports.deriveSecretKey = function(A2, I2) {
      if (!U(A2)) throw new Error("Seed is not valid");
      if (!G(I2)) throw new Error("Index is not valid");
      var i2 = Q(A2), g2 = new ArrayBuffer(4);
      new DataView(g2).setUint32(0, I2);
      var r2 = new Uint8Array(g2), o2 = C.blake2bInit(32);
      return C.blake2bUpdate(o2, i2), C.blake2bUpdate(o2, r2), a(C.blake2bFinal(o2));
    }, exports.generateSeed = function() {
      return new Promise((function(A2, I2) {
        var i2;
        (i2 = 32, new Promise((function(A3, I3) {
          var g2 = new Uint8Array(i2);
          e(g2).then((function() {
            return A3(g2);
          })).catch(I3);
        }))).then((function(I3) {
          var i3 = I3.reduce((function(A3, I4) {
            return "" + A3 + ("0" + I4.toString(16)).slice(-2);
          }), "");
          return A2(i3);
        })).catch(I2);
      }));
    }, exports.hashBlock = function(A2) {
      if (!D(A2.account)) throw new Error("Account is not valid");
      if (!y(A2.previous)) throw new Error("Previous is not valid");
      if (!D(A2.representative)) throw new Error("Representative is not valid");
      if (!S(A2.balance)) throw new Error("Balance is not valid");
      if (!D(A2.link) && !y(A2.link)) throw new Error("Link is not valid");
      return sA(A2);
    }, exports.signBlock = uA, exports.validateWork = function(A2) {
      var I2, i2 = null !== (I2 = A2.threshold) && void 0 !== I2 ? I2 : "ffffffc000000000";
      if (!y(A2.blockHash)) throw new Error("Hash is not valid");
      if (!k(A2.work)) throw new Error("Work is not valid");
      if (!F(i2)) throw new Error("Threshold is not valid");
      var r2 = new g("0x" + i2), o2 = Q(A2.blockHash), n2 = Q(A2.work).reverse(), e2 = C.blake2bInit(8);
      C.blake2bUpdate(e2, n2), C.blake2bUpdate(e2, o2);
      var t2 = a(C.blake2bFinal(e2).reverse());
      return new g("0x" + t2).isGreaterThanOrEqualTo(r2);
    }, exports.verifyBlock = function(A2) {
      if (!y(A2.hash)) throw new Error("Hash is not valid");
      if (!p(A2.signature)) throw new Error("Signature is not valid");
      if (!d(A2.publicKey)) throw new Error("Public key is not valid");
      return hA(Q(A2.hash), Q(A2.signature), Q(A2.publicKey));
    };
  }
});

// server/vercel-env.ts
process.env.HOLDERPAY_DEV = "0";
process.env.HOLDERPAY_ALLOW_FORGE = "0";
process.env.HOST = "0.0.0.0";
process.env.WORK_MAX_WAIT_MS ??= "25000";
if (!process.env.CHALLENGE_SECRET) {
  console.error(
    "CHALLENGE_SECRET is not set: this deployment will reject challenges issued by its own other instances. Set it in the project's environment variables."
  );
}

// server/index.ts
import * as http from "node:http";
import * as fs4 from "node:fs";
import * as path4 from "node:path";
import * as crypto2 from "node:crypto";

// core/env.ts
import * as fs from "node:fs";
import * as path from "node:path";
var loaded = false;
function loadEnv(file = path.resolve(process.cwd(), ".env")) {
  if (loaded) return;
  loaded = true;
  let text = "";
  try {
    text = fs.readFileSync(file, "utf-8");
  } catch {
    return;
  }
  for (const line of text.split("\n")) {
    const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/.exec(line);
    if (!m) continue;
    const key = m[1];
    let val = m[2].trim();
    if (val.startsWith('"') && val.endsWith('"') || val.startsWith("'") && val.endsWith("'")) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === void 0) process.env[key] = val;
  }
}
function env(key, fallback = "") {
  loadEnv();
  return process.env[key] ?? fallback;
}

// core/rpc.ts
var import_blakejs = __toESM(require_blakejs(), 1);
var { blake2b } = import_blakejs.default;
var NANO_RPC = process.env.NANO_RPC_URL || "https://rpc.nano.to";
var NANO_WS = process.env.NANO_WS_URL || "wss://ws.nano.to";
var SEND_DIFFICULTY = "fffffff800000000";
var RECEIVE_DIFFICULTY = "fffffe0000000000";
var TIMEOUT_MS = 15e3;
var WORK_TIMEOUT_MS = 2e4;
function rpcKey() {
  return process.env.NANO_RPC_KEY ?? "";
}
var RpcSemanticError = class extends Error {
};
async function callRpc(body, timeoutMs, key) {
  const payload = { ...body };
  if (key) payload.key = key;
  payload._nb = Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const res = await fetch(NANO_RPC, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
        ...key ? { Authorization: key } : {}
      },
      body: JSON.stringify(payload),
      signal: ctl.signal
    });
    const json2 = await res.json();
    if (json2?.error) {
      throw new RpcSemanticError(typeof json2.error === "string" ? json2.error : JSON.stringify(json2.error));
    }
    return json2;
  } finally {
    clearTimeout(t);
  }
}
function validateWork(workHex, rootHex, difficultyHex) {
  if (!/^[0-9a-fA-F]{16}$/.test(workHex) || !/^[0-9a-fA-F]{64}$/.test(rootHex)) return false;
  const workLe = Buffer.from(workHex, "hex").reverse();
  const digest = blake2b(Buffer.concat([workLe, Buffer.from(rootHex, "hex")]), void 0, 8);
  let v = 0n;
  for (let i = 7; i >= 0; i--) v = v << 8n | BigInt(digest[i]);
  return v >= BigInt("0x" + difficultyHex);
}
var workCache = /* @__PURE__ */ new Map();
var WORK_CACHE_MAX = 2e3;
function cacheGet(root, difficulty) {
  const r = root.toLowerCase();
  return workCache.get(`${r}|${difficulty.toLowerCase()}`) ?? // send-difficulty work always satisfies receive difficulty
  (difficulty.toLowerCase() === RECEIVE_DIFFICULTY ? workCache.get(`${r}|${SEND_DIFFICULTY}`) : void 0);
}
function cachePut(root, difficulty, work) {
  if (workCache.size >= WORK_CACHE_MAX) workCache.delete(workCache.keys().next().value);
  workCache.set(`${root.toLowerCase()}|${difficulty.toLowerCase()}`, work);
}
var WORK_ATTEMPTS = 3;
async function generateWork(root, difficulty, key) {
  const cached2 = cacheGet(root, difficulty);
  if (cached2) return { work: cached2, difficulty, source: "cache" };
  if (!key) {
    throw new Error(
      "work_generate requires NANO_RPC_KEY \u2014 proof of work is never computed locally (set it in .env)"
    );
  }
  let last = "";
  for (let i = 0; i < WORK_ATTEMPTS; i++) {
    try {
      const json2 = await callRpc({ action: "work_generate", hash: root, difficulty }, WORK_TIMEOUT_MS, key);
      const w = String(json2?.work ?? "").trim();
      if (w && validateWork(w, root, difficulty)) {
        cachePut(root, difficulty, w);
        return { work: w, difficulty, source: "rpc" };
      }
      last = w ? `endpoint returned a nonce that fails the ${difficulty} threshold` : "endpoint returned no nonce";
    } catch (e) {
      if (e instanceof RpcSemanticError) throw new Error(`work_generate refused by ${NANO_RPC}: ${e.message}`);
      last = e?.message ?? String(e);
    }
  }
  throw new Error(`work_generate failed after ${WORK_ATTEMPTS} attempts against ${NANO_RPC}: ${last}`);
}
async function nanoRpc(key, body) {
  if (body.action === "work_generate" && typeof body.hash === "string") {
    const raw = typeof body.difficulty === "string" && /^[0-9a-fA-F]{16}$/.test(body.difficulty) ? body.difficulty : SEND_DIFFICULTY;
    const difficulty = BigInt("0x" + raw) > BigInt("0x" + SEND_DIFFICULTY) ? SEND_DIFFICULTY : raw;
    return generateWork(body.hash, difficulty, key);
  }
  return callRpc(body, TIMEOUT_MS, key);
}
function rpc(body) {
  return nanoRpc(rpcKey(), body);
}

// core/hash.ts
var import_blakejs2 = __toESM(require_blakejs(), 1);
var { blake2bHex } = import_blakejs2.default;
var DOMAIN_POLICY = "holderpay-policy-v1";
var DOMAIN_MEMO = "holderpay-pay-v1";
var DOMAIN_AUTH = "holderpay-auth-v1";
var DOMAIN_GRANT = "holderpay-grant-v1";
var SEP = "";
function h256(domain, ...parts) {
  const payload = Buffer.from([domain, ...parts].join(SEP), "utf-8");
  return blake2bHex(payload, void 0, 32);
}
function canonicalJson(value) {
  if (value === null || typeof value === "number" || typeof value === "boolean") return JSON.stringify(value);
  if (typeof value === "bigint") return JSON.stringify(value.toString());
  if (typeof value === "string") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(canonicalJson).join(",") + "]";
  if (typeof value === "object") {
    const obj = value;
    const keys = Object.keys(obj).filter((k) => obj[k] !== void 0).sort();
    return "{" + keys.map((k) => JSON.stringify(k) + ":" + canonicalJson(obj[k])).join(",") + "}";
  }
  throw new Error("cannot canonicalize " + typeof value);
}

// core/policy.ts
function hashableV1(p) {
  return {
    v: 1,
    merchant: p.merchant,
    resource: p.resource,
    title: p.title,
    description: p.description,
    priceXno: p.priceXno ?? "",
    priceToken: p.priceToken ?? "",
    token: p.token ? { tokenId: p.token.tokenId.toLowerCase(), symbol: p.token.symbol, decimals: p.token.decimals } : null,
    autoswap: !!p.autoswap,
    expires: Math.floor(p.expires) || 0
  };
}
function hashableV2(p) {
  const accept = normalizeAccept(p.accept);
  const any = normalizeAcceptAny(p.acceptAny);
  return {
    v: 2,
    merchant: p.merchant,
    resource: p.resource,
    title: p.title,
    description: p.description,
    priceXno: p.priceXno ?? "",
    accept: accept.map((a) => ({
      tokenId: a.tokenId,
      symbol: a.symbol,
      decimals: a.decimals,
      price: a.price
    })),
    autoswap: !!p.autoswap,
    swapInto: (p.swapInto ?? "").toLowerCase(),
    expires: Math.floor(p.expires) || 0,
    // Included ONLY when set. An offer published before this existed must keep
    // hashing to the id it already has -- its receipts are on chain and its
    // buyers' grants are derived from that id, so adding a key unconditionally
    // would revoke access people have paid for. Tampering is still caught: an
    // acceptAny added or stripped in transit changes the hash either way.
    ...any ? { acceptAny: { priceXno: any.priceXno, minBacking: any.minBacking ?? "0" } } : {}
  };
}
function normalizeAccept(list2) {
  const byId = /* @__PURE__ */ new Map();
  for (const a of list2 ?? []) {
    const tokenId = String(a?.tokenId ?? "").toLowerCase();
    if (!/^[0-9a-f]{32}$/.test(tokenId)) continue;
    let price;
    try {
      price = BigInt(a.price);
    } catch {
      continue;
    }
    if (price <= 0n) continue;
    if (byId.has(tokenId)) continue;
    byId.set(tokenId, {
      tokenId,
      symbol: String(a.symbol ?? ""),
      decimals: Number(a.decimals) || 0,
      price: price.toString()
    });
  }
  return [...byId.values()].sort((x, y) => x.tokenId < y.tokenId ? -1 : x.tokenId > y.tokenId ? 1 : 0);
}
function policyId(p) {
  const v = p.v ?? 2;
  return h256(DOMAIN_POLICY, canonicalJson(v === 1 ? hashableV1(p) : hashableV2(p)));
}
function makePolicy(p) {
  const v = p.v ?? 2;
  const base = v === 2 ? { ...p, accept: normalizeAccept(p.accept), acceptAny: normalizeAcceptAny(p.acceptAny) ?? void 0 } : p;
  return { ...base, v, id: policyId({ ...base, v }) };
}
function policyIsIntact(p) {
  if (p.v !== 1 && p.v !== 2) return false;
  return policyId(p) === p.id;
}
function acceptedTokens(p) {
  if ((p.v ?? 2) === 1) {
    if (!p.token || !p.priceToken || BigInt(p.priceToken) <= 0n) return [];
    return [
      {
        tokenId: p.token.tokenId.toLowerCase(),
        symbol: p.token.symbol,
        decimals: p.token.decimals,
        price: p.priceToken
      }
    ];
  }
  return normalizeAccept(p.accept);
}
function acceptedToken(p, tokenId) {
  const want = (tokenId ?? "").toLowerCase();
  return acceptedTokens(p).find((a) => a.tokenId === want) ?? null;
}
function swapTarget(p) {
  const list2 = acceptedTokens(p);
  if (list2.length === 0) return null;
  const want = (p.swapInto ?? "").toLowerCase();
  return list2.find((a) => a.tokenId === want) ?? list2[0];
}
function acceptsXno(p) {
  if (!p.priceXno) return false;
  try {
    return BigInt(p.priceXno) > 0n;
  } catch {
    return false;
  }
}
function acceptsToken(p) {
  return acceptedTokens(p).length > 0 || acceptAnyOf(p) !== null;
}
function normalizeAcceptAny(a) {
  if (!a) return null;
  let price;
  let min;
  try {
    price = BigInt(a.priceXno ?? "0");
    min = BigInt(a.minBacking ?? "0");
  } catch {
    return null;
  }
  if (price <= 0n || min < 0n) return null;
  return { priceXno: price.toString(), minBacking: min.toString() };
}
function acceptAnyOf(p) {
  if ((p.v ?? 2) === 1) return null;
  return normalizeAcceptAny(p.acceptAny);
}
function priceXnoOf(p) {
  return acceptsXno(p) ? BigInt(p.priceXno) : null;
}

// vendor/hodl/core/fraglink.ts
var nanocurrency = __toESM(require_nanocurrency_cjs(), 1);

// vendor/hodl/core/ops.ts
var OP_CODE = {
  launch: 1,
  transfer: 2,
  buy: 3,
  sell: 4,
  stake: 5,
  unstake: 6,
  claim: 7,
  withdraw: 10,
  seedLiq: 8,
  addLiq: 9,
  futOpen: 12,
  futClose: 13
};
var OP_CODE_LAUNCH_DIRECT = 11;

// vendor/hodl/core/token.ts
var TOKEN_ID_HEX = 32;
var TOKEN_ID_BYTES = 16;
function tokenIdFromLaunchHash(hash) {
  return hash.replace(/^0x/i, "").toLowerCase().slice(0, TOKEN_ID_HEX);
}

// vendor/hodl/core/fraglink.ts
var AMT_BYTES = 15;
var BODY_BYTES = 47;
var FRAG_HIGH = 224;
var HEX = "0123456789abcdef";
function toHex(bytes) {
  let s = "";
  for (const b of bytes) s += HEX[b >> 4] + HEX[b & 15];
  return s;
}
function fromHex(hex) {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}
function readAmt(buf, offset) {
  let n = 0n;
  for (let i = 0; i < AMT_BYTES; i++) n = n << 8n | BigInt(buf[offset + i]);
  return n;
}
function isFragA(linkHex) {
  if (linkHex.length !== 64 || !/^[0-9a-fA-F]{64}$/.test(linkHex)) return false;
  const b0 = parseInt(linkHex.slice(0, 2), 16);
  if ((b0 & 240) !== FRAG_HIGH) return false;
  const code = b0 & 15;
  return code === OP_CODE.transfer || code === OP_CODE.sell || code === OP_CODE.buy || code === OP_CODE.seedLiq || code === OP_CODE.addLiq || code === OP_CODE.futOpen;
}
function assembleFrag(aHex, bHex) {
  if (!isFragA(aHex)) throw new Error("not a fragment A link");
  if (bHex.length !== 64 || !/^[0-9a-fA-F]{64}$/.test(bHex)) throw new Error("bad fragment B link");
  const a = fromHex(aHex);
  const code = a[0] & 15;
  const tokenId = toHex(a.slice(1, 1 + TOKEN_ID_BYTES));
  const body = new Uint8Array(BODY_BYTES);
  body.set(a.slice(1 + TOKEN_ID_BYTES), 0);
  body.set(fromHex(bHex), 15);
  if (code === OP_CODE.transfer) {
    const toPub = toHex(body.slice(0, 32));
    if (/^0+$/.test(toPub)) throw new Error("transfer to zero pubkey");
    const to = nanocurrency.deriveAddress(toPub, { useNanoPrefix: true });
    return { tokenId, op: { kind: "transfer", to, amount: readAmt(body, 32) } };
  }
  if (code === OP_CODE.futOpen) {
    const sideByte = body[2 * AMT_BYTES];
    if (sideByte !== 0 && sideByte !== 1) throw new Error("bad futures side");
    for (let i = 3 * AMT_BYTES + 1; i < BODY_BYTES; i++) {
      if (body[i] !== 0) throw new Error("fragment padding not zero");
    }
    return {
      tokenId,
      op: {
        kind: "futOpen",
        side: sideByte,
        size: readAmt(body, 0),
        margin: readAmt(body, AMT_BYTES),
        guard: readAmt(body, 2 * AMT_BYTES + 1)
      }
    };
  }
  for (let i = 2 * AMT_BYTES; i < BODY_BYTES; i++) {
    if (body[i] !== 0) throw new Error("fragment padding not zero");
  }
  const a0 = readAmt(body, 0);
  const a1 = readAmt(body, AMT_BYTES);
  if (code === OP_CODE.sell) return { tokenId, op: { kind: "sell", tokens: a0, minXno: a1 } };
  if (code === OP_CODE.buy) return { tokenId, op: { kind: "buy", xno: a0, minTokens: a1 } };
  if (code === OP_CODE.seedLiq) return { tokenId, op: { kind: "seedLiq", xno: a0, tokens: a1 } };
  if (code === OP_CODE.addLiq) return { tokenId, op: { kind: "addLiq", xno: a0, tokens: a1 } };
  throw new Error("unknown fragment opcode");
}

// core/proof.ts
var nanocurrency2 = __toESM(require_nanocurrency_cjs(), 1);
var RECEIPT_MARKER = 80;
function memoLink(policyId2) {
  const digest = h256(DOMAIN_MEMO, policyId2.toLowerCase());
  return (RECEIPT_MARKER.toString(16).padStart(2, "0") + digest.slice(2)).toUpperCase();
}
function isReceiptLink(link, policyId2) {
  return (link ?? "").toUpperCase() === memoLink(policyId2);
}
function authDigest(policyId2, receiptHash, challenge) {
  return h256(DOMAIN_AUTH, policyId2.toLowerCase(), receiptHash.toUpperCase(), challenge).toUpperCase();
}
function verifyAuth(publicKey, signature, policyId2, receiptHash, challenge) {
  try {
    return nanocurrency2.verifyBlock({
      hash: authDigest(policyId2, receiptHash, challenge),
      signature,
      publicKey
    });
  } catch {
    return false;
  }
}
function grantId(policyId2, receiptHash) {
  return h256(DOMAIN_GRANT, policyId2.toLowerCase(), receiptHash.toUpperCase());
}

// core/block.ts
var nanocurrency3 = __toESM(require_nanocurrency_cjs(), 1);
var ZERO_HASH = "0".repeat(64);
function linkAsAddress(link) {
  try {
    return nanocurrency3.deriveAddress(link, { useNanoPrefix: true });
  } catch {
    return "";
  }
}
function addressToPub(address) {
  return nanocurrency3.derivePublicKey(address).toUpperCase();
}
function isNanoAddress(a) {
  return /^(nano|xrb)_[13][13456789abcdefghijkmnopqrstuwxyz]{59}$/.test((a ?? "").trim());
}
function sameAccount(a, b) {
  return (a ?? "").replace(/^xrb_/, "nano_").toLowerCase() === (b ?? "").replace(/^xrb_/, "nano_").toLowerCase();
}
async function sentAmount(reader, block) {
  if (block.previous === ZERO_HASH || /^0+$/.test(block.previous)) return null;
  const prev = await reader.getBlock(block.previous);
  if (!prev || !sameAccount(prev.account, block.account)) return null;
  return prev.balance - block.balance;
}

// core/verify.ts
var deny = (policyId2, reason, extra = {}) => ({
  granted: false,
  reason,
  policyId: policyId2,
  confirmed: false,
  ...extra
});
async function verifyPayment(policy, receiptHash, reader, now = Math.floor(Date.now() / 1e3)) {
  const pid = policy?.id ?? "";
  if (!policy || !policyIsIntact(policy)) return deny(pid, "policy does not match its own id (tampered or malformed)");
  if (!/^[0-9A-Fa-f]{64}$/.test(receiptHash ?? "")) return deny(pid, "receipt hash is not a 64-hex block hash");
  const receipt = await reader.getBlock(receiptHash);
  if (!receipt) return deny(pid, "receipt block not found on chain (or failed local signature verification)");
  if (!isReceiptLink(receipt.link, policy.id)) {
    return deny(pid, "receipt block does not commit to this policy", { receipt: receipt.hash, payer: receipt.account });
  }
  const payer = receipt.account;
  if (receipt.previous === ZERO_HASH) {
    return deny(pid, "receipt block has no payment under it", { receipt: receipt.hash, payer });
  }
  const payment = await reader.getBlock(receipt.previous);
  if (!payment) {
    return deny(pid, "the payment block under the receipt could not be verified", { receipt: receipt.hash, payer });
  }
  if (!sameAccount(payment.account, payer)) {
    return deny(pid, "payment and receipt are not the same account", { receipt: receipt.hash, payer });
  }
  if (policy.expires > 0 && receipt.timestamp > 0 && receipt.timestamp > policy.expires) {
    return deny(pid, "this offer had already expired when the payment was made", {
      receipt: receipt.hash,
      payer,
      at: receipt.timestamp
    });
  }
  const confirmed = receipt.confirmed && payment.confirmed;
  const base = { receipt: receipt.hash, payer, at: receipt.timestamp };
  const xno = await xnoLane(policy, payment, reader);
  if (xno && !xno.fail) return finish(policy, xno, confirmed, base);
  const token = await tokenLane(policy, receipt, payment, reader);
  if (token && !token.fail) return finish(policy, token, confirmed, base);
  if (xno) return finish(policy, xno, confirmed, base);
  if (token) return finish(policy, token, confirmed, base);
  return deny(pid, "the block under the receipt is not a payment this policy accepts", base);
}
function finish(policy, lane, confirmed, base) {
  const common = {
    granted: false,
    reason: "",
    policyId: policy.id,
    confirmed,
    asset: lane.asset,
    payment: lane.payment,
    paid: lane.paid.toString(),
    price: lane.price.toString(),
    tokenId: lane.tokenId,
    symbol: lane.symbol,
    ...base
  };
  if (lane.fail) return { ...common, reason: lane.fail };
  if (lane.paid < lane.price) return { ...common, reason: `underpaid: ${lane.paid} < ${lane.price}` };
  if (!confirmed) return { ...common, reason: "waiting for network confirmation" };
  return {
    ...common,
    granted: true,
    reason: "paid and confirmed on chain",
    grant: grantId(policy.id, common.receipt)
  };
}
async function xnoLane(policy, payment, reader) {
  const dest = linkAsAddress(payment.link);
  if (!dest || !sameAccount(dest, policy.merchant)) return null;
  const price = priceXnoOf(policy);
  if (price == null) {
    return { asset: "XNO", paid: 0n, price: 0n, payment: payment.hash, fail: "this offer does not accept XNO" };
  }
  const amount = await sentAmount(reader, payment);
  if (amount == null || amount <= 0n) {
    return { asset: "XNO", paid: 0n, price, payment: payment.hash, fail: "that block did not send any XNO" };
  }
  return { asset: "XNO", paid: amount, price, payment: payment.hash };
}
async function tokenLane(policy, receipt, fragB, reader) {
  if (fragB.previous === ZERO_HASH) return null;
  const fragA = await reader.getBlock(fragB.previous);
  if (!fragA || !sameAccount(fragA.account, fragB.account) || !isFragA(fragA.link)) return null;
  if (fragA.balance - fragB.balance !== 1n) return null;
  let assembled;
  try {
    assembled = assembleFrag(fragA.link, fragB.link);
  } catch {
    return null;
  }
  if (assembled.op?.kind !== "transfer") return null;
  if (!acceptsToken(policy)) {
    return { asset: "TOKEN", paid: 0n, price: 0n, payment: fragB.hash, fail: "this offer does not accept tokens" };
  }
  const paidId = assembled.tokenId.toLowerCase();
  const entry = acceptedToken(policy, paidId);
  const open = entry ? null : acceptAnyOf(policy);
  if (!entry && !open) {
    const listed = acceptedTokens(policy).map((a) => a.symbol || a.tokenId.slice(0, 8)).join(", ");
    return {
      asset: "TOKEN",
      paid: 0n,
      price: 0n,
      payment: fragB.hash,
      fail: `wrong token: paid ${paidId.slice(0, 10)}, this offer takes ${listed}`,
      tokenId: paidId
    };
  }
  const price = entry ? BigInt(entry.price) : BigInt(open.priceXno);
  if (!sameAccount(assembled.op.to, policy.merchant)) {
    return {
      asset: "TOKEN",
      paid: 0n,
      price,
      payment: fragB.hash,
      tokenId: paidId,
      symbol: entry?.symbol,
      fail: "token transfer was sent to a different address"
    };
  }
  const amount = assembled.op.amount;
  if (!reader.tokenOpApplied) {
    return {
      asset: "TOKEN",
      paid: amount,
      price,
      payment: fragB.hash,
      tokenId: paidId,
      symbol: entry?.symbol,
      fail: "this verifier cannot replay the token ledger, so a token payment cannot be proven here"
    };
  }
  const applied = await reader.tokenOpApplied(assembled.tokenId, fragA.hash);
  if (!applied.applied) {
    return {
      asset: "TOKEN",
      paid: amount,
      price,
      payment: fragB.hash,
      tokenId: paidId,
      symbol: entry?.symbol,
      fail: `token transfer is signed but did not apply in the ledger: ${applied.reason}`
    };
  }
  if (entry) {
    return { asset: "TOKEN", paid: amount, price, payment: fragB.hash, tokenId: paidId, symbol: entry.symbol };
  }
  const common = { asset: "TOKEN", payment: fragB.hash, tokenId: paidId, price };
  if (!reader.tokenBacking) {
    return {
      ...common,
      paid: 0n,
      fail: "this verifier cannot value tokens, so a payment in an unlisted token cannot be proven here"
    };
  }
  const b = await reader.tokenBacking(paidId);
  if (!b || b.circulating <= 0n) {
    return { ...common, paid: 0n, fail: `token ${paidId.slice(0, 10)} has no circulating supply to value` };
  }
  if (b.backing <= 0n) {
    return {
      ...common,
      paid: 0n,
      fail: `token ${paidId.slice(0, 10)} has no collateral behind it, so no amount of it is worth anything here`
    };
  }
  const minBacking = BigInt(open.minBacking ?? "0");
  if (b.backing < minBacking) {
    return {
      ...common,
      paid: 0n,
      fail: `token ${paidId.slice(0, 10)} is backed by ${b.backing} raw, under this offer's minimum of ${minBacking}`
    };
  }
  const backedValue = b.backing * amount / b.circulating;
  return { ...common, paid: backedValue, symbol: void 0 };
}
function lanesOf(policy) {
  const out = [];
  if (acceptsToken(policy)) out.push("TOKEN");
  if (acceptsXno(policy)) out.push("XNO");
  return out;
}

// core/chain.ts
var nanocurrency5 = __toESM(require_nanocurrency_cjs(), 1);

// vendor/hodl/core/blockVerify.ts
var nanocurrency4 = __toESM(require_nanocurrency_cjs(), 1);
function verifyFetchedBlock(hash, b) {
  const c = b.contents ?? {};
  if (c.type && c.type !== "state") return false;
  try {
    const acct = String(c.account ?? "");
    if (!acct || acct.toLowerCase() !== String(b.block_account ?? "").toLowerCase()) return false;
    const computed = nanocurrency4.hashBlock({
      account: acct,
      previous: c.previous,
      representative: c.representative,
      balance: c.balance,
      link: c.link
    });
    if (computed.toLowerCase() !== hash.toLowerCase()) return false;
    const publicKey = nanocurrency4.derivePublicKey(acct);
    return nanocurrency4.verifyBlock({
      hash: computed,
      signature: String(c.signature ?? "").toUpperCase(),
      publicKey
    });
  } catch {
    return false;
  }
}
function deriveAmountSubtype(balance, previous, prevBalance) {
  const bal = BigInt(balance);
  const isOpen = !previous || /^0+$/.test(previous);
  const prev = isOpen ? 0n : prevBalance;
  const delta = bal - prev;
  if (delta < 0n) return { amount: (-delta).toString(), subtype: "send" };
  if (delta > 0n) return { amount: delta.toString(), subtype: isOpen ? "open" : "receive" };
  return { amount: "0", subtype: isOpen ? "open" : "change" };
}
function finalizeChain(raw) {
  const staged = raw.map((b) => ({
    authentic: verifyFetchedBlock(b.hash, b),
    block: {
      account: b.block_account,
      hash: b.hash,
      previous: b.contents?.previous ?? "",
      link: b.contents?.link ?? "",
      representative: b.contents?.representative ?? "",
      height: BigInt(b.height ?? "0"),
      timestamp: b.local_timestamp,
      balance: b.contents?.balance
    }
  }));
  staged.sort((a, b) => a.block.height < b.block.height ? -1 : a.block.height > b.block.height ? 1 : 0);
  const balByHash = /* @__PURE__ */ new Map();
  const out = [];
  for (const { authentic, block } of staged) {
    if (block.balance == null) continue;
    const isOpen = !block.previous || /^0+$/.test(block.previous);
    const prevBal = isOpen ? 0n : balByHash.get(block.previous);
    const derived = prevBal === void 0 ? { amount: "0", subtype: "change" } : deriveAmountSubtype(block.balance, block.previous, prevBal);
    if (!authentic && derived.amount !== "0") continue;
    block.amount = derived.amount;
    block.subtype = derived.subtype;
    balByHash.set(block.hash, BigInt(block.balance));
    out.push(block);
  }
  return out;
}

// core/chain.ts
async function getBlocks(hashes) {
  const out = /* @__PURE__ */ new Map();
  const want = [...new Set(hashes.map((h) => h.toUpperCase()))].filter((h) => /^[0-9A-F]{64}$/.test(h));
  if (want.length === 0) return out;
  const res = await rpc({
    action: "blocks_info",
    hashes: want,
    json_block: "true",
    include_not_found: "true"
    // `pending`/`source` are not needed; balance + previous give us everything,
    // and asking for less keeps the single RPC call small.
  });
  const blocks = res?.blocks && typeof res.blocks === "object" ? res.blocks : {};
  for (const [hash, entry] of Object.entries(blocks)) {
    if (!verifyFetchedBlock(hash, entry)) continue;
    const c = entry.contents ?? {};
    out.set(hash.toUpperCase(), {
      hash: hash.toUpperCase(),
      account: String(entry.block_account ?? c.account ?? ""),
      previous: String(c.previous ?? "").toUpperCase(),
      representative: String(c.representative ?? ""),
      balance: BigInt(c.balance ?? "0"),
      link: String(c.link ?? "").toUpperCase(),
      // "confirmed" is the node's own view and is NOT signature-covered. It is
      // reported so a caller can wait for it, but nothing security-relevant
      // rests on it alone: the money is proven by the signed balance delta, and
      // a Nano send is irreversible once its successor block exists, which is
      // exactly what the receipt block is.
      confirmed: String(entry.confirmed ?? "").toLowerCase() === "true",
      timestamp: Number(entry.local_timestamp ?? 0) || 0,
      height: Number(entry.height ?? 0) || 0
    });
  }
  return out;
}

// vendor/hodl/indexer/blockSource.ts
var nanocurrency6 = __toESM(require_nanocurrency_cjs(), 1);

// vendor/hodl/lib/rpc.ts
var NANO_RPC2 = process.env.NANO_RPC_URL || "https://rpc.nano.to";
var FALLBACK_RPC = NANO_RPC2;

// vendor/hodl/indexer/blockSource.ts
var FRONTIER_CACHE = /* @__PURE__ */ new Map();
var FRONTIER_CACHE_MAX = 5e3;
async function fallbackRpc(body) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 15e3);
  try {
    const res = await fetch(FALLBACK_RPC, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Cache-Control": "no-cache", Pragma: "no-cache" },
      // Same cache-buster as lib/rpc.ts callEndpoint — identical POST bodies
      // were served frozen from some regions; a nonce defeats any edge cache.
      body: JSON.stringify({ ...body, _nb: Date.now().toString(36) + Math.random().toString(36).slice(2, 10) }),
      signal: ctl.signal
    });
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}
async function fallbackPending(account) {
  try {
    const j = await fallbackRpc({ action: "pending", account, count: 1e3 });
    return Array.isArray(j?.blocks) ? j.blocks : [];
  } catch {
    return [];
  }
}
var NanoRpcSource = class {
  /**
   * `opts.staleTips` lets a READ path serve an account's last known tip from
   * the shared store instead of paying the 3-view probe, when the cheap batch
   * refresh could not resolve it. Off by default, and deliberately never
   * enabled for the payout sweep: money must not move on a stale view.
   */
  // NOTE (holderPay vendoring): parameter properties written out longhand —
  // Node's type-stripping loader does not support them. Behaviour identical.
  apiKey;
  cache;
  opts;
  constructor(apiKey, cache2, opts = {}) {
    this.apiKey = apiKey;
    this.cache = cache2;
    this.opts = opts;
  }
  /** When the batched tip refresh last resolved ANYTHING. If it is working,
   * an account it did not resolve is genuinely unopened rather than hidden by
   * rate limiting — which is what makes a stored tip safe to lean on. */
  lastBatchOkAt = 0;
  /** Accounts served from a stored tip this request — surfaced for observability. */
  tipsFromCache = /* @__PURE__ */ new Set();
  /** Accounts whose whole verified chain came from the store (zero RPC), and
   * accounts we actually re-walked. A fold on an unchanged chain should be
   * nearly all cached — if it is not, the walk is where the RPC budget goes,
   * and that is worth knowing from a header rather than inferring. */
  blocksFromCache = /* @__PURE__ */ new Set();
  blocksWalked = /* @__PURE__ */ new Set();
  // account → the exact tip (last block hash) this source replayed for it.
  // Published by the trust view so a browser can pin its own walk to the SAME
  // per-account frontier and reproduce a byte-identical root regardless of any
  // blocks that landed after this snapshot (kills the live-freshness mismatch).
  frontiers = /* @__PURE__ */ new Map();
  // Request-scoped memo. A NanoRpcSource is created fresh per request (compute()
  // makes a new one each call), so this dedupes listBlocks WITHIN one request —
  // not across requests. compute() calls collectEvents up to twice (watched,
  // then watched+extra after the discovery pass), and the discovery pass queries
  // pools; without this, every watched account's uncached best-view frontier
  // check (3 account_info calls) runs twice. This is "compute once per request,"
  // fully debuggable: the memo dies with the instance, so every new request
  // still replays live from chain — there is no stale cross-request cache.
  blockMemo = /* @__PURE__ */ new Map();
  // Request-scoped best-frontier hints (account → frontier hash), populated by
  // warmFrontiers via ONE batch call per source instead of 3 account_info per
  // account. Also request-scoped (dies with the instance).
  frontierHint = /* @__PURE__ */ new Map();
  /**
   * Prefetch the best frontier for MANY accounts in ~3 RPC calls instead of
   * 3 per account. Uses the batch `accounts_frontiers` action from all three
   * permitted views; when they AGREE (the common case) the frontier is settled
   * cheaply, and only accounts whose views DISAGREE fall back to the precise
   * per-account best-view (which needs block heights to pick the furthest tip).
   * Preserves the exact freshness guarantee — max observed frontier wins — while
   * collapsing the per-request account_info storm. Degrades gracefully: any
   * account left unhinted just takes the original per-account path in listBlocks,
   * so an endpoint that doesn't support accounts_frontiers changes nothing but
   * speed. Call before collectChains; safe to call repeatedly (skips hinted).
   */
  /** The batch-resolved tips from `warmFrontiers` (account → frontier hash).
   * Exposed so a caller can fingerprint "what the chain looks like right now"
   * in ~1 RPC call, without walking any chain. An account missing from the map
   * is simply unresolved — callers must treat that as "unknown", never "empty".
   */
  frontierHints() {
    return new Map(this.frontierHint);
  }
  async warmFrontiers(accounts) {
    const need = accounts.filter((a) => !this.frontierHint.has(a));
    if (need.length === 0) return;
    const af = async (call) => {
      try {
        const j = await Promise.race([
          call({ action: "accounts_frontiers", accounts: need }),
          new Promise((r) => setTimeout(() => r(null), 3e3))
        ]);
        return j && typeof j.frontiers === "object" && j.frontiers ? j.frontiers : {};
      } catch {
        return {};
      }
    };
    const f0 = await af((b) => nanoRpc(this.apiKey, b));
    const enough = need.every((a) => typeof f0[a] === "string");
    const [f1, f2] = enough ? [{}, {}] : await Promise.all([af((b) => nanoRpc("", b)), af((b) => fallbackRpc(b))]);
    const disagree = [];
    for (const account of need) {
      const hs = [f0[account], f1[account], f2[account]].filter((h) => typeof h === "string" && /^[0-9a-fA-F]{64}$/.test(h));
      if (hs.length === 0) continue;
      if (new Set(hs.map((h) => h.toUpperCase())).size === 1) {
        this.frontierHint.set(account, hs[0]);
        this.lastBatchOkAt = Date.now();
      } else disagree.push(account);
    }
    await Promise.all(disagree.map(async (account) => {
      const view = async (fn) => {
        try {
          const i = await fn();
          return { frontier: String(i?.frontier ?? ""), height: Number(i?.block_count ?? 0) };
        } catch {
          return { frontier: "", height: 0 };
        }
      };
      const views = await Promise.all([
        view(() => nanoRpc(this.apiKey, { action: "account_info", account })),
        view(() => nanoRpc("", { action: "account_info", account })),
        view(() => fallbackRpc({ action: "account_info", account }))
      ]);
      const best = views.reduce((a, b) => b.height > a.height ? b : a);
      if (best.frontier) this.frontierHint.set(account, best.frontier);
    }));
  }
  /**
   * blocks_info with RETRIES for silently-omitted entries. Root-caused live
   * (2026-08-22): rpc.nano.to's batch blocks_info randomly OMITS some of the
   * requested hashes depending on which backend node answers — the same
   * request, seconds apart, resolves a different subset. A dropped entry made
   * discovery silently lose a real hello sender (a freshly-launched coin's
   * creator vanished from the index) and could leave a gap mid-chain in
   * listBlocks. Each retry very likely lands on a different backend, so up to
   * 3 attempts converge on the full set; anything still missing after that is
   * genuinely unknown to both endpoints and is returned unresolved.
   */
  async fetchBlocksInfo(call, hashes) {
    const infos = /* @__PURE__ */ new Map();
    let missing = hashes;
    for (let attempt = 0; attempt < 3 && missing.length > 0; attempt++) {
      const next = [];
      for (let i = 0; i < missing.length; i += 200) {
        const chunk = missing.slice(i, i + 200);
        const info = await call({ action: "blocks_info", hashes: chunk, json_block: true }).catch(() => ({}));
        for (const h of chunk) {
          const b = info.blocks?.[h];
          if (b?.block_account) infos.set(h, b);
          else next.push(h);
        }
      }
      missing = next;
    }
    return infos;
  }
  /** Discovery primitive: who sent into / received from this account. Inbound
   * covers both confirmed receives and STILL-PENDING sends (a hello counts
   * even if the anchor never pockets it).
   *
   * The pending list is unioned across ALL THREE permitted views of the two
   * allowed endpoints — nano.to keyed, nano.to keyless, and the nano-gpt
   * fallback. Root-caused live (2026-08-22): pending/receivable state is
   * node-local in Nano, and rpc.nano.to's regional backends serve DIFFERENT
   * pending lists for the same account (its US cluster was missing a
   * confirmed hello for hours that both its EU view and nano-gpt had), so a
   * new creator's coin never appeared for requests served from that region.
   * Unioning is safe: every hash is then resolved via blocks_info and
   * verified locally (core/blockVerify.ts), so a wrong entry cannot get in —
   * omission was the only failure mode, and a union closes it as long as ANY
   * of the three views has current data. No new endpoints (strict RPC rule):
   * the key still goes only to nano.to, never to the fallback. */
  async counterparties(account) {
    const blocks = await this.listBlocks(account);
    const sourceHashes = blocks.filter((b) => (b.subtype === "receive" || b.subtype === "open") && /^[0-9a-fA-F]{64}$/.test(b.link)).map((b) => b.link);
    const [pKeyed, pKeyless, pFallback] = await Promise.all([
      nanoRpc(this.apiKey, { action: "pending", account, count: 1e3 }).catch(() => ({})),
      nanoRpc("", { action: "pending", account, count: 1e3 }).catch(() => ({})),
      fallbackPending(account)
    ]);
    const pending = [
      ...pKeyed.blocks ?? [],
      ...pKeyless.blocks ?? [],
      ...pFallback
    ];
    const all = [.../* @__PURE__ */ new Set([...sourceHashes, ...pending])];
    const inbound = [];
    for (const [h, b] of await this.fetchBlocksInfo((body) => nanoRpc(this.apiKey, body), all)) {
      if (!verifyFetchedBlock(h, b)) continue;
      inbound.push({ sender: b.block_account, representative: b.contents?.representative ?? "" });
    }
    const outbound = blocks.filter((b) => b.subtype === "send" && /^[0-9a-fA-F]{64}$/.test(b.link)).map((b) => nanocurrency6.deriveAddress(b.link, { useNanoPrefix: true }));
    return { inbound, outbound };
  }
  /**
   * Root-caused live (2026-08-22): the exact same account, queried at the
   * exact same moment, can report a DIFFERENT frontier from rpc.nano.to's
   * keyed tier vs its own keyless tier — the keyed tier lagged behind on a
   * specific account's history, silently hiding its most recent blocks (a
   * launch, in the observed case). Cheap fix: check both frontiers first (one
   * lightweight account_info each, in parallel). If they agree, the keyed
   * tier is caught up and the normal single-source walk below is used as
   * before. If they disagree, walk BOTH full chains and keep whichever is
   * more complete — blocks are self-verifying (core/blockVerify.ts), so a
   * longer verified chain is strictly a superset of a shorter one from the
   * same real ledger, never a reason to distrust it. The common case (tiers
   * agree) pays only one extra cheap call; the full double-walk only
   * triggers when staleness is actually detected.
   */
  async listBlocks(account, limit = 2e4) {
    const key = `${account}|${limit}`;
    const memo = this.blockMemo.get(key);
    if (memo) return memo;
    const p = this._listBlocks(account, limit).catch((e) => {
      this.blockMemo.delete(key);
      throw e;
    });
    this.blockMemo.set(key, p);
    return p;
  }
  async _listBlocks(account, limit = 2e4) {
    let best;
    const hinted = this.frontierHint.get(account);
    let stored = null;
    if (!hinted && this.opts.staleTips && this.cache) {
      try {
        stored = await this.cache.getFrontier(account);
      } catch {
      }
    }
    if (hinted) {
      best = { frontier: hinted, height: 0 };
    } else if (stored?.frontier) {
      best = stored;
      this.tipsFromCache.add(account);
    } else {
      const view = async (fn) => {
        try {
          const i = await fn();
          return { frontier: String(i?.frontier ?? ""), height: Number(i?.block_count ?? 0) };
        } catch {
          return { frontier: "", height: 0 };
        }
      };
      const views = await Promise.all([
        view(() => nanoRpc(this.apiKey, { action: "account_info", account })),
        view(() => nanoRpc("", { action: "account_info", account })),
        view(() => fallbackRpc({ action: "account_info", account }))
      ]);
      best = views.reduce((a, b) => b.height > a.height ? b : a);
    }
    if (this.cache) {
      try {
        const stored2 = await this.cache.getFrontier(account);
        if (stored2 && stored2.height > best.height && stored2.frontier) best = stored2;
      } catch {
      }
      if (best.frontier) {
        try {
          const cached2 = await this.cache.getBlocks(account, best.frontier);
          if (cached2 && cached2.length) {
            this.blocksFromCache.add(account);
            this.frontiers.set(account, cached2[cached2.length - 1].hash);
            return cached2;
          }
        } catch {
        }
      }
    }
    if (!best.frontier) return [];
    const sources = [
      (body) => nanoRpc(this.apiKey, body),
      (body) => nanoRpc("", body),
      (body) => fallbackRpc(body)
    ];
    const walks = [];
    this.blocksWalked.add(account);
    for (let round = 0; round < 2; round++) {
      for (const source of sources) {
        let walk = null;
        try {
          walk = await this.fetchChain(source, account, limit, best.frontier);
        } catch {
        }
        if (!walk) continue;
        walks.push(walk);
        if (!walk.complete) continue;
        const blocks = walk.blocks;
        if (blocks.length) this.frontiers.set(account, blocks[blocks.length - 1].hash);
        if (this.cache && best.frontier) {
          void this.cache.putBlocks(account, best.frontier, blocks).catch(() => {
          });
          void this.cache.putFrontier(account, best.frontier, best.height || blocks.length).catch(() => {
          });
        }
        return blocks;
      }
    }
    if (walks.length === 0) throw new Error(`listBlocks(${account}): both keyed and keyless RPC failed`);
    return walks.reduce((a, b) => b.blocks.length > a.blocks.length ? b : a).blocks;
  }
  async fetchChain(call, account, limit, frontier) {
    if (frontier) {
      const hit = FRONTIER_CACHE.get(`${account}|${frontier}`);
      if (hit) return { blocks: hit, complete: true };
    }
    const raw = [];
    const seen = /* @__PURE__ */ new Set();
    let head = frontier || void 0;
    while (raw.length < limit) {
      const params = { action: "account_history", account, count: 500, raw: true };
      if (head) params.head = head;
      const hist = await call(params);
      const history = hist.history ?? [];
      if (history.length === 0) break;
      const hashes = history.map((h) => h.hash).filter((h) => !seen.has(h));
      if (hashes.length === 0) break;
      const infos = await this.fetchBlocksInfo(call, hashes);
      for (const hash of hashes) {
        const b = infos.get(hash);
        if (!b) continue;
        seen.add(hash);
        raw.push({ hash, block_account: b.block_account, contents: b.contents, height: b.height, local_timestamp: b.local_timestamp });
      }
      const prev = hist.previous;
      if (!prev || /^0+$/.test(prev)) break;
      head = prev;
    }
    const out = finalizeChain(raw);
    const complete = !frontier || out.some((b) => b.hash === frontier);
    if (frontier && complete && raw.length < limit) {
      if (FRONTIER_CACHE.size >= FRONTIER_CACHE_MAX) FRONTIER_CACHE.delete(FRONTIER_CACHE.keys().next().value);
      FRONTIER_CACHE.set(`${account}|${frontier}`, out);
    }
    return { blocks: out, complete };
  }
};

// vendor/hodl/indexer/multiIndexer.ts
var nanocurrency9 = __toESM(require_nanocurrency_cjs(), 1);

// vendor/hodl/core/futures.ts
var FUTURES_ERA = 17881e5;
var MAX_LEVERAGE = 5n;
var MAINT_BPS = 500n;
var CLOSE_FEE_BPS = 50n;
var MAX_OI_BPS = 2500n;
var MAX_OI_POOL_BPS = 1000n;
var MARK_RESPONSIVENESS = 4n;
var MAX_BOOK_SIDE = 32;
var MAX_ORDERS_PER_ACCOUNT = 2;
var MAX_PAIRS = 128;
var MIN_SIZE_DIV = 10000n;
var MAX_SETTLED = 32;
var LONG = 0;
var SHORT = 1;
function emptyFutures() {
  return { book: [], pairs: [], nextId: 0n, mark: 0n, settled: [], nextSeq: 0n };
}
function cloneFutures(f) {
  return {
    book: f.book.map((o) => ({ ...o })),
    pairs: f.pairs.map((p) => ({ ...p, long: { ...p.long }, short: { ...p.short } })),
    nextId: f.nextId,
    mark: f.mark,
    settled: f.settled.map((x) => ({ ...x })),
    nextSeq: f.nextSeq
  };
}
function futuresActive(f) {
  return f.nextId > 0n || f.book.length > 0 || f.pairs.length > 0 || f.mark > 0n;
}
function markPrice(s) {
  if (s.poolXno <= 0n || s.poolTokens <= 0n) return 0n;
  return s.poolXno * PRECISION / s.poolTokens;
}
function refPrice(s, f) {
  return f.mark > 0n ? f.mark : markPrice(s);
}
function updateMark(s, f, prevPoolXno, prevPoolTokens) {
  if (!futuresActive(f)) return;
  const spot = markPrice(s);
  if (spot <= 0n) return;
  if (f.mark <= 0n) {
    f.mark = spot;
    return;
  }
  const fracX = relMove(prevPoolXno, s.poolXno);
  const fracT = relMove(prevPoolTokens, s.poolTokens);
  const num = fracX.num * fracT.den > fracT.num * fracX.den ? fracX : fracT;
  if (num.num <= 0n || num.den <= 0n) return;
  const gap = spot - f.mark;
  const w = num.num * MARK_RESPONSIVENESS;
  f.mark = w >= num.den ? spot : f.mark + gap * w / num.den;
}
function relMove(before, after) {
  const num = after > before ? after - before : before - after;
  const den = after > before ? after : before;
  return { num, den };
}
function lockedMarginOf(f, account) {
  let t = 0n;
  for (const o of f.book) if (o.account === account) t += o.margin;
  for (const p of f.pairs) {
    if (p.long.account === account) t += p.long.margin;
    if (p.short.account === account) t += p.short.margin;
  }
  return t;
}
function voidMarginOf(f, account, short, floor) {
  if (floor <= 0n || short <= 0n) return 0n;
  let voided = 0n;
  const keep = [];
  for (const o of f.book) {
    if (o.account !== account) {
      keep.push(o);
      continue;
    }
    const v = o.margin * short / floor;
    o.margin -= v;
    voided += v;
    if (o.margin > 0n) keep.push(o);
  }
  f.book = keep;
  for (const p of f.pairs) {
    if (p.long.account === account) {
      const v = p.long.margin * short / floor;
      p.long.margin -= v;
      voided += v;
    }
    if (p.short.account === account) {
      const v = p.short.margin * short / floor;
      p.short.margin -= v;
      voided += v;
    }
  }
  return voided;
}
function worseFor(side, forExit, spot, mark) {
  const lo = spot < mark ? spot : mark;
  const hi = spot < mark ? mark : spot;
  if (side === LONG) return forExit ? lo : hi;
  return forExit ? hi : lo;
}
function pnlTokens(side, size, entry, price) {
  if (price <= 0n) return 0n;
  const diff = side === LONG ? price - entry : entry - price;
  return size * diff / price;
}
function get(m, k) {
  return m.get(k) ?? 0n;
}
function set(m, k, v) {
  if (v === 0n) m.delete(k);
  else m.set(k, v);
}
function guardOk(side, entry, guard) {
  if (guard <= 0n) return true;
  return side === LONG ? entry <= guard : entry >= guard;
}
function minPositionSize(s) {
  const floorSize = BPS / MAINT_BPS;
  const bySupply = s.supply / MIN_SIZE_DIV;
  return bySupply > floorSize ? bySupply : floorSize;
}
function sideOI(f, side) {
  let t = 0n;
  for (const o of f.book) if (o.side === side) t += o.size;
  for (const p of f.pairs) t += p.size;
  return t;
}
function hasRoomToRest(f, account, side) {
  let sideCount = 0;
  let mine = 0;
  for (const o of f.book) {
    if (o.side === side) sideCount++;
    if (o.account === account) mine++;
  }
  return sideCount < MAX_BOOK_SIDE && mine < MAX_ORDERS_PER_ACCOUNT;
}
function settlePortion(s, f, p, portion, price, closer) {
  if (p.size <= 0n) throw new InvalidOp("empty pair");
  const lm = p.long.margin * portion / p.size;
  const sm = p.short.margin * portion / p.size;
  let pl = pnlTokens(LONG, portion, p.entry, price);
  if (pl > sm) pl = sm;
  if (pl < -lm) pl = -lm;
  let longOut = lm + pl;
  let shortOut = sm - pl;
  if (closer) {
    const fee = portion * CLOSE_FEE_BPS / BPS;
    if (closer === p.long.account) {
      const paid = fee < longOut ? fee : longOut;
      longOut -= paid;
      shortOut += paid;
    } else {
      const paid = fee < shortOut ? fee : shortOut;
      shortOut -= paid;
      longOut += paid;
    }
  }
  set(s.balances, p.long.account, get(s.balances, p.long.account) + longOut);
  set(s.balances, p.short.account, get(s.balances, p.short.account) + shortOut);
  f.settled.push({
    seq: f.nextSeq++,
    id: p.id,
    size: portion,
    entry: p.entry,
    price,
    long: p.long.account,
    short: p.short.account,
    longPnl: longOut - lm,
    kind: closer ? 0 : 1,
    closer: closer ?? ""
  });
  while (f.settled.length > MAX_SETTLED) f.settled.shift();
  p.size -= portion;
  p.long.margin -= lm;
  p.short.margin -= sm;
}
function belowMaint(p, price) {
  const pl = pnlTokens(LONG, p.size, p.entry, price);
  const maint = p.size * MAINT_BPS / BPS;
  if (p.long.margin + pl <= maint) return LONG;
  if (p.short.margin - pl <= maint) return SHORT;
  return null;
}
function sweepFutures(s, f) {
  if (f.pairs.length === 0) return;
  const spot = markPrice(s);
  if (spot <= 0n) return;
  const mark = refPrice(s, f);
  const keep = [];
  for (const p of f.pairs) {
    const a = belowMaint(p, spot);
    const b = belowMaint(p, mark);
    if (a != null && a === b) settlePortion(s, f, p, p.size, worseFor(a === LONG ? SHORT : LONG, true, spot, mark));
    else keep.push(p);
  }
  f.pairs = keep;
}
function openFutures(s, f, sender, side, size, margin, guard) {
  if (size <= 0n) throw new InvalidOp("zero size");
  if (margin <= 0n) throw new InvalidOp("zero margin");
  if (guard <= 0n) throw new InvalidOp("entry price guard required");
  if (size > margin * MAX_LEVERAGE) throw new InvalidOp("leverage too high");
  const minSize = minPositionSize(s);
  if (size < minSize) throw new InvalidOp("position too small");
  const spot = markPrice(s);
  if (spot <= 0n) throw new InvalidOp("no liquidity");
  const bal = get(s.balances, sender);
  if (bal < margin) throw new InvalidOp("insufficient balance");
  const capSupply = s.supply * MAX_OI_BPS / BPS;
  const capPool = s.poolTokens * MAX_OI_POOL_BPS / BPS;
  const cap = capSupply < capPool ? capSupply : capPool;
  if (sideOI(f, side) + size > cap) throw new InvalidOp("open interest cap");
  if (f.mark <= 0n) f.mark = spot;
  const entry = worseFor(side, false, spot, f.mark);
  if (!guardOk(side, entry, guard)) throw new InvalidOp("entry price guard");
  const canMatch = f.book.some((o) => o.side !== side && o.account !== sender && guardOk(o.side, entry, o.guard));
  if (!canMatch && !hasRoomToRest(f, sender, side)) throw new InvalidOp("order book full");
  set(s.balances, sender, bal - margin);
  const origSize = size;
  let remSize = size;
  let remMargin = margin;
  const book = [];
  for (const o of f.book) {
    if (remSize < minSize || o.side === side || o.account === sender || f.pairs.length >= MAX_PAIRS) {
      book.push(o);
      continue;
    }
    if (!guardOk(o.side, entry, o.guard)) {
      book.push(o);
      continue;
    }
    if (remSize < o.size && o.size - remSize < minSize) {
      book.push(o);
      continue;
    }
    const fill = remSize < o.size ? remSize : o.size;
    const makerM = o.margin * fill / o.size;
    const takerM = margin * fill / origSize;
    const taker = { account: sender, margin: takerM };
    const maker = { account: o.account, margin: makerM };
    f.pairs.push({
      id: f.nextId++,
      size: fill,
      entry,
      long: side === LONG ? taker : maker,
      short: side === SHORT ? taker : maker
    });
    o.size -= fill;
    o.margin -= makerM;
    remSize -= fill;
    remMargin -= takerM;
    if (o.size > 0n) book.push(o);
    else if (o.margin > 0n) set(s.balances, o.account, get(s.balances, o.account) + o.margin);
  }
  f.book = book;
  if (remSize >= minSize && hasRoomToRest(f, sender, side)) {
    f.book.push({ id: f.nextId++, account: sender, side, size: remSize, margin: remMargin, guard });
  } else if (remMargin > 0n) set(s.balances, sender, get(s.balances, sender) + remMargin);
  sweepFutures(s, f);
}
function closeFutures(s, f, sender, size) {
  const spot = markPrice(s);
  if (spot <= 0n) return;
  const mark = refPrice(s, f);
  const minSize = minPositionSize(s);
  if (size === 0n) {
    const keep2 = [];
    for (const o of f.book) {
      if (o.account !== sender) {
        keep2.push(o);
        continue;
      }
      set(s.balances, sender, get(s.balances, sender) + o.margin);
    }
    f.book = keep2;
  }
  let rem = size === 0n ? -1n : size;
  const keep = [];
  for (const p of f.pairs) {
    const mine = p.long.account === sender || p.short.account === sender;
    if (!mine || rem === 0n) {
      keep.push(p);
      continue;
    }
    const mySide = p.long.account === sender ? LONG : SHORT;
    let portion = rem < 0n || rem >= p.size ? p.size : rem;
    if (portion < minSize || p.size - portion < minSize) portion = p.size;
    settlePortion(s, f, p, portion, worseFor(mySide, true, spot, mark), sender);
    if (rem > 0n) rem -= portion;
    if (p.size > 0n) keep.push(p);
  }
  f.pairs = keep;
  sweepFutures(s, f);
}

// vendor/hodl/core/state.ts
var PRECISION = 1000000000000n;
var BPS = 10000n;
var MAX_CREATOR_SHARE_BPS = 500n;
var TAX_BPS = 2000n;
var TAX_BURN_SHARE_BPS = 2500n;
var FULL_REBATE_ERA = 1787644e3;
var SWAP_FEE_BPS = 100n;
var InvalidOp = class extends Error {
  constructor(msg) {
    super(msg);
    this.name = "InvalidOp";
  }
};
function emptyState() {
  return {
    id: "",
    name: "",
    symbol: "",
    decimals: 6,
    image: "",
    launched: false,
    supply: 0n,
    creator: "",
    creatorShare: 0n,
    balances: /* @__PURE__ */ new Map(),
    staked: /* @__PURE__ */ new Map(),
    banked: /* @__PURE__ */ new Map(),
    rewardDebt: /* @__PURE__ */ new Map(),
    totalStaked: 0n,
    rewardPerShare: 0n,
    rebateVault: 0n,
    treasury: 0n,
    poolXno: 0n,
    poolTokens: 0n,
    xnoCredit: /* @__PURE__ */ new Map(),
    xnoWithdrawn: /* @__PURE__ */ new Map(),
    direct: false,
    earmark: /* @__PURE__ */ new Map(),
    earmarkFloor: /* @__PURE__ */ new Map(),
    queue: [],
    prepaid: /* @__PURE__ */ new Map(),
    futures: emptyFutures(),
    height: 0n
  };
}
function get2(m, k) {
  return m.get(k) ?? 0n;
}
function set2(m, k, v) {
  if (v === 0n) m.delete(k);
  else m.set(k, v);
}
function settle(s, a) {
  const st = get2(s.staked, a);
  const acc = st * s.rewardPerShare / PRECISION;
  const pending = acc - get2(s.rewardDebt, a);
  if (pending > 0n) set2(s.banked, a, get2(s.banked, a) + pending);
  set2(s.rewardDebt, a, acc);
}
function resetDebt(s, a) {
  set2(s.rewardDebt, a, get2(s.staked, a) * s.rewardPerShare / PRECISION);
}
function syncRewards(s, newRebate) {
  if (newRebate > 0n && s.totalStaked > 0n) {
    s.rewardPerShare += newRebate * PRECISION / s.totalStaked;
  }
}
function constantProductOut(reserveIn, reserveOut, amountIn) {
  const afterFee = amountIn * (BPS - SWAP_FEE_BPS) / BPS;
  if (reserveIn + afterFee <= 0n) throw new InvalidOp("insufficient liquidity");
  return afterFee * reserveOut / (reserveIn + afterFee);
}
function sellValueOf(s, a) {
  const pos = get2(s.balances, a) + get2(s.staked, a) + lockedMarginOf(s.futures, a);
  if (pos <= 0n || s.poolXno <= 0n || s.poolTokens <= 0n) return 0n;
  return pos * s.poolXno / (s.poolTokens + pos);
}
function ratchetFloors(s) {
  for (const [a, em] of s.earmark) {
    const sv = sellValueOf(s, a);
    const cur = s.earmarkFloor.get(a) ?? em;
    let f = cur < em ? cur : em;
    if (sv < f) f = sv;
    set2(s.earmarkFloor, a, f);
  }
}
function queueTotal(s) {
  let t = 0n;
  for (const e of s.queue) t += e.owed;
  return t;
}
function floorTotalExcept(s, a) {
  let t = 0n;
  for (const [acct, f] of s.earmarkFloor) if (acct !== a) t += f;
  return t;
}
function applyVoid(s0, account, newFloor) {
  const floor = s0.earmarkFloor.get(account) ?? 0n;
  if (!s0.direct || floor <= 0n || newFloor >= floor) return s0;
  const s = cloneState(s0);
  const short = floor - (newFloor > 0n ? newFloor : 0n);
  const bal = get2(s.balances, account);
  const vb = bal * short / floor;
  set2(s.balances, account, bal - vb);
  let voided = vb;
  const st = get2(s.staked, account);
  if (st > 0n) {
    settle(s, account);
    const vs = st * short / floor;
    set2(s.staked, account, st - vs);
    s.totalStaked -= vs;
    resetDebt(s, account);
    voided += vs;
  }
  voided += voidMarginOf(s.futures, account, short, floor);
  s.poolTokens += voided;
  s.queue = s.queue.map((e) => e.account === account ? { account: e.account, owed: e.owed - e.owed * short / floor } : e).filter((e) => e.owed > 0n);
  const em = get2(s.earmark, account);
  set2(s.earmark, account, em - em * short / floor);
  set2(s.earmarkFloor, account, newFloor > 0n ? newFloor : 0n);
  if (s.futures.pairs.length > 0) sweepFutures(s, s.futures);
  return s;
}
function cloneState(s0) {
  return {
    ...s0,
    balances: new Map(s0.balances),
    staked: new Map(s0.staked),
    banked: new Map(s0.banked),
    rewardDebt: new Map(s0.rewardDebt),
    xnoCredit: new Map(s0.xnoCredit),
    xnoWithdrawn: new Map(s0.xnoWithdrawn),
    earmark: new Map(s0.earmark),
    earmarkFloor: new Map(s0.earmarkFloor),
    queue: s0.queue.map((e) => ({ ...e })),
    prepaid: new Map(s0.prepaid),
    futures: cloneFutures(s0.futures)
  };
}
function afterPriceChange(s, prevPoolXno, prevPoolTokens) {
  updateMark(s, s.futures, prevPoolXno, prevPoolTokens);
  if (s.futures.pairs.length > 0) sweepFutures(s, s.futures);
}
function applyOp(s0, op, sender, height, timestamp) {
  if (op.kind === "balance") return s0;
  const s = cloneState(s0);
  switch (op.kind) {
    case "launch": {
      if (s.launched) throw new InvalidOp("already launched");
      if (op.supply <= 0n) throw new InvalidOp("zero supply");
      const creatorShare = op.supply * MAX_CREATOR_SHARE_BPS / BPS;
      if (creatorShare <= 0n) throw new InvalidOp("supply too small");
      s.launched = true;
      s.direct = Boolean(op.direct);
      s.creator = sender;
      s.creatorShare = creatorShare;
      s.supply = op.supply;
      s.name = op.name;
      s.symbol = op.symbol;
      s.decimals = op.decimals;
      s.image = op.image;
      set2(s.balances, sender, creatorShare);
      s.treasury = op.supply - creatorShare;
      s.height = height;
      return s;
    }
    case "transfer": {
      if (!s.launched) throw new InvalidOp("not launched");
      if (op.amount <= 0n) throw new InvalidOp("zero amount");
      const bal = get2(s.balances, sender);
      if (bal < op.amount) throw new InvalidOp("insufficient balance");
      set2(s.balances, sender, bal - op.amount);
      set2(s.balances, op.to, get2(s.balances, op.to) + op.amount);
      s.height = height;
      return s;
    }
    case "buy": {
      if (!s.launched) throw new InvalidOp("not launched");
      if (op.xno <= 0n) throw new InvalidOp("zero xno");
      if (s.poolXno <= 0n || s.poolTokens <= 0n) throw new InvalidOp("no liquidity");
      if (!s.direct) {
        const out = constantProductOut(s.poolXno, s.poolTokens, op.xno);
        if (out < op.minTokens || out >= s.poolTokens) throw new InvalidOp("slippage");
        s.poolXno += op.xno;
        s.poolTokens -= out;
        set2(s.balances, sender, get2(s.balances, sender) + out);
        afterPriceChange(s, s0.poolXno, s0.poolTokens);
        s.height = height;
        return s;
      }
      if (op.depositTo) {
        const entry = s.queue.find((e) => e.account === op.depositTo && e.owed > 0n);
        if (!entry) throw new InvalidOp("deposit does not pay a queued seller");
        const pay = op.xno < entry.owed ? op.xno : entry.owed;
        entry.owed -= pay;
        const excess = op.xno - pay;
        if (excess > 0n) set2(s.prepaid, op.depositTo, get2(s.prepaid, op.depositTo) + excess);
        s.queue = s.queue.filter((e) => e.owed > 0n);
        const out = constantProductOut(s.poolXno, s.poolTokens, pay);
        if (out < op.minTokens || out >= s.poolTokens) throw new InvalidOp("slippage");
        s.poolXno += pay;
        s.poolTokens -= out;
        set2(s.balances, sender, get2(s.balances, sender) + out);
      } else {
        if (s.queue.some((e) => e.owed > 0n)) throw new InvalidOp("queued sellers must be paid first");
        const bal = op.balanceAt ?? 0n;
        if (bal < op.xno + (s.earmarkFloor.get(sender) ?? 0n)) throw new InvalidOp("insufficient collateral");
        const out = constantProductOut(s.poolXno, s.poolTokens, op.xno);
        if (out < op.minTokens || out >= s.poolTokens) throw new InvalidOp("slippage");
        s.poolXno += op.xno;
        s.poolTokens -= out;
        set2(s.balances, sender, get2(s.balances, sender) + out);
        set2(s.earmark, sender, get2(s.earmark, sender) + op.xno);
        set2(s.earmarkFloor, sender, (s.earmarkFloor.get(sender) ?? 0n) + op.xno);
      }
      ratchetFloors(s);
      afterPriceChange(s, s0.poolXno, s0.poolTokens);
      s.height = height;
      return s;
    }
    case "sell": {
      if (!s.launched) throw new InvalidOp("not launched");
      if (op.tokens <= 0n) throw new InvalidOp("zero tokens");
      const bal = get2(s.balances, sender);
      if (bal < op.tokens) throw new InvalidOp("insufficient balance");
      if (s.poolXno <= 0n || s.poolTokens <= 0n) throw new InvalidOp("no liquidity");
      const out = op.tokens * s.poolXno / (s.poolTokens + op.tokens);
      if (out < op.minXno || out >= s.poolXno) throw new InvalidOp("slippage");
      set2(s.balances, sender, bal - op.tokens);
      s.poolTokens += op.tokens;
      s.poolXno -= out;
      if (!s.direct) {
        set2(s.xnoCredit, sender, get2(s.xnoCredit, sender) + out);
        afterPriceChange(s, s0.poolXno, s0.poolTokens);
        s.height = height;
        return s;
      }
      const pre = get2(s.prepaid, sender);
      const usePre = out < pre ? out : pre;
      set2(s.prepaid, sender, pre - usePre);
      let rem = out - usePre;
      const em = get2(s.earmark, sender);
      const exitBal = op.balanceAt ?? 0n;
      let net = rem < em ? rem : em;
      if (net > exitBal) net = exitBal;
      set2(s.earmark, sender, em - net);
      const fl = s.earmarkFloor.get(sender) ?? 0n;
      const emAfter = em - net;
      if (fl > emAfter) set2(s.earmarkFloor, sender, emAfter);
      rem -= net;
      let credited = 0n;
      if (rem > 0n) {
        const num = floorTotalExcept(s, sender);
        const q = queueTotal(s);
        const headroom = num > q ? num - q : 0n;
        credited = rem < headroom ? rem : headroom;
        if (credited > 0n) s.queue = [...s.queue, { account: sender, owed: credited }];
        s.poolXno += rem - credited;
      }
      if (usePre + net + credited < op.minXno) throw new InvalidOp("slippage");
      ratchetFloors(s);
      afterPriceChange(s, s0.poolXno, s0.poolTokens);
      s.height = height;
      return s;
    }
    case "futOpen":
    case "futClose": {
      if (!s.launched) throw new InvalidOp("not launched");
      if (!(typeof timestamp === "number" && Number.isFinite(timestamp) && timestamp >= FUTURES_ERA)) {
        throw new InvalidOp("futures not active");
      }
      if (op.kind === "futOpen") openFutures(s, s.futures, sender, op.side, op.size, op.margin, op.guard);
      else closeFutures(s, s.futures, sender, op.size);
      s.height = height;
      return s;
    }
    case "withdraw": {
      if (!s.launched) throw new InvalidOp("not launched");
      if (s.direct) throw new InvalidOp("direct tokens settle at sell");
      const credit = get2(s.xnoCredit, sender);
      if (credit <= 0n) throw new InvalidOp("nothing to withdraw");
      set2(s.xnoWithdrawn, sender, get2(s.xnoWithdrawn, sender) + credit);
      set2(s.xnoCredit, sender, 0n);
      s.height = height;
      return s;
    }
    case "stake": {
      if (!s.launched) throw new InvalidOp("not launched");
      if (op.amount <= 0n) throw new InvalidOp("zero amount");
      const bal = get2(s.balances, sender);
      if (bal < op.amount) throw new InvalidOp("insufficient balance");
      settle(s, sender);
      set2(s.balances, sender, bal - op.amount);
      set2(s.staked, sender, get2(s.staked, sender) + op.amount);
      s.totalStaked += op.amount;
      resetDebt(s, sender);
      s.height = height;
      return s;
    }
    case "unstake": {
      if (!s.launched) throw new InvalidOp("not launched");
      if (op.amount <= 0n) throw new InvalidOp("zero amount");
      const st = get2(s.staked, sender);
      if (st < op.amount) throw new InvalidOp("insufficient stake");
      settle(s, sender);
      const tax = op.amount * TAX_BPS / BPS;
      const legacy = timestamp == null || timestamp < FULL_REBATE_ERA;
      const remaining = s.totalStaked - op.amount;
      const burn = legacy ? tax * TAX_BURN_SHARE_BPS / BPS : remaining > 0n ? 0n : tax;
      const rebate = tax - burn;
      const toUser = op.amount - tax;
      s.supply -= burn;
      s.rebateVault += rebate;
      set2(s.balances, sender, get2(s.balances, sender) + toUser);
      set2(s.staked, sender, st - op.amount);
      s.totalStaked -= op.amount;
      resetDebt(s, sender);
      syncRewards(s, rebate);
      s.height = height;
      return s;
    }
    case "claim": {
      if (!s.launched) throw new InvalidOp("not launched");
      settle(s, sender);
      const owed = get2(s.banked, sender);
      if (owed <= 0n) throw new InvalidOp("nothing to claim");
      const payout = owed < s.rebateVault ? owed : s.rebateVault;
      if (payout <= 0n) throw new InvalidOp("nothing to claim");
      set2(s.banked, sender, owed - payout);
      s.rebateVault -= payout;
      set2(s.balances, sender, get2(s.balances, sender) + payout);
      s.height = height;
      return s;
    }
    case "seedLiq":
    case "addLiq": {
      if (!s.launched) throw new InvalidOp("not launched");
      if (sender !== s.creator) throw new InvalidOp("creator only");
      if (op.xno < 0n || op.tokens < 0n) throw new InvalidOp("negative amount");
      if (op.xno <= 0n && op.tokens <= 0n) throw new InvalidOp("zero amounts");
      if (op.tokens > s.treasury) throw new InvalidOp("exceeds treasury");
      s.treasury -= op.tokens;
      s.poolXno += op.xno;
      s.poolTokens += op.tokens;
      if (s.direct) ratchetFloors(s);
      afterPriceChange(s, s0.poolXno, s0.poolTokens);
      s.height = height;
      return s;
    }
    default:
      throw new InvalidOp("unknown op");
  }
}

// vendor/hodl/core/multi.ts
function multiEmpty() {
  return /* @__PURE__ */ new Map();
}
function tokenState(m, tokenId) {
  return m.get(tokenId) ?? emptyState();
}
function applyBalanceObservation(m, account, raw) {
  let total = 0n;
  const floors = [];
  for (const [tokenId, s] of m) {
    if (!s.direct) continue;
    const f = s.earmarkFloor.get(account) ?? 0n;
    if (f > 0n) {
      total += f;
      floors.push({ tokenId, floor: f });
    }
  }
  if (total <= 0n || raw >= total) return m;
  const out = new Map(m);
  for (const { tokenId, floor } of floors) {
    const newFloor = floor * raw / total;
    const next = applyVoid(out.get(tokenId), account, newFloor);
    out.set(tokenId, next);
  }
  return out;
}
function applyBlock(m, b) {
  if (b.op.kind === "balance") return applyBalanceObservation(m, b.sender, b.op.raw);
  const next = applyOp(tokenState(m, b.tokenId), b.op, b.sender, b.height, b.timestamp);
  next.id = b.tokenId;
  const out = new Map(m);
  out.set(b.tokenId, next);
  return out;
}
function tokens(m) {
  const out = [];
  for (const [tokenId, state] of m) if (state.launched) out.push({ tokenId, state });
  return out;
}

// vendor/hodl/core/oplink.ts
var AMT_BYTES2 = 15;
var HEX2 = "0123456789abcdef";
function toHex2(bytes) {
  let s = "";
  for (const b of bytes) s += HEX2[b >> 4] + HEX2[b & 15];
  return s;
}
function fromHex2(hex) {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}
var AMT_MAX = (1n << BigInt(AMT_BYTES2 * 8)) - 1n;
function readAmount(buf, offset) {
  let n = 0n;
  for (let i = 0; i < AMT_BYTES2; i++) n = n << 8n | BigInt(buf[offset + i]);
  return n;
}
function readTokenId(buf, offset) {
  return toHex2(buf.slice(offset, offset + TOKEN_ID_BYTES));
}
function decodeOpLink(hex, meta) {
  const buf = fromHex2(hex);
  if (buf.length !== 32) throw new Error("compact link must be 32 bytes");
  const code = buf[0];
  const tokenId = readTokenId(buf, 1);
  const amt = readAmount(buf, 1 + TOKEN_ID_BYTES);
  let op;
  switch (code) {
    case OP_CODE.launch:
    case OP_CODE_LAUNCH_DIRECT: {
      const dByte = buf[1];
      const decimals = dByte === 0 ? meta?.decimals ?? 6 : dByte - 1;
      op = {
        kind: "launch",
        supply: amt,
        name: meta?.name ?? "",
        symbol: meta?.symbol ?? "",
        decimals,
        image: meta?.image ?? "",
        ...code === OP_CODE_LAUNCH_DIRECT ? { direct: true } : {}
      };
      break;
    }
    case OP_CODE.buy:
      op = { kind: "buy", xno: 0n, minTokens: amt };
      break;
    case OP_CODE.sell:
      op = { kind: "sell", tokens: amt, minXno: 0n };
      break;
    case OP_CODE.stake:
      op = { kind: "stake", amount: amt };
      break;
    case OP_CODE.unstake:
      op = { kind: "unstake", amount: amt };
      break;
    case OP_CODE.claim:
      op = { kind: "claim" };
      break;
    case OP_CODE.withdraw:
      op = { kind: "withdraw" };
      break;
    case OP_CODE.seedLiq:
      op = { kind: "seedLiq", xno: 0n, tokens: amt };
      break;
    case OP_CODE.addLiq:
      op = { kind: "addLiq", xno: 0n, tokens: amt };
      break;
    case OP_CODE.futClose:
      op = { kind: "futClose", size: amt };
      break;
    default:
      throw new Error("unknown op code " + code);
  }
  return { tokenId, op };
}

// vendor/hodl/core/rotate.ts
var nanocurrency7 = __toESM(require_nanocurrency_cjs(), 1);
var ROTATE_MARKER_PUB = "d0d0d0d0" + "00".repeat(28);
function isRotateRep(representative) {
  const rep = representative ?? "";
  if (/^[0-9a-fA-F]{64}$/.test(rep)) return rep.toLowerCase() === ROTATE_MARKER_PUB;
  try {
    return nanocurrency7.derivePublicKey(rep).toLowerCase() === ROTATE_MARKER_PUB;
  } catch {
    return false;
  }
}
function applyRotations(initial, rotations) {
  const byFrom = /* @__PURE__ */ new Map();
  for (const r of [...rotations].sort(
    (a, b) => a.height !== b.height ? a.height < b.height ? -1 : 1 : a.hash < b.hash ? -1 : a.hash > b.hash ? 1 : 0
  )) {
    if (!byFrom.has(r.fromPub)) byFrom.set(r.fromPub, r);
  }
  const current = /* @__PURE__ */ new Map();
  const accepted = /* @__PURE__ */ new Map();
  for (const [tokenId, p0] of initial) {
    const set3 = /* @__PURE__ */ new Set([p0]);
    let cur = p0;
    const seen = /* @__PURE__ */ new Set([p0]);
    while (byFrom.has(cur)) {
      const next = byFrom.get(cur).toPub;
      if (seen.has(next)) break;
      seen.add(next);
      set3.add(next);
      cur = next;
    }
    current.set(tokenId, cur);
    accepted.set(tokenId, set3);
  }
  return { current, accepted };
}

// vendor/hodl/core/commit.ts
var import_blakejs4 = __toESM(require_blakejs(), 1);

// vendor/hodl/core/encoding.ts
var import_blakejs3 = __toESM(require_blakejs(), 1);
var { blake2bHex: blake2bHex2 } = import_blakejs3.default;

// vendor/hodl/core/commit.ts
var { blake2bHex: blake2bHex3 } = import_blakejs4.default;
function isCommitLink(link) {
  return link.length >= 2 && link.slice(0, 2).toLowerCase() === "ff";
}

// vendor/hodl/core/metaAnchor.ts
var nanocurrency8 = __toESM(require_nanocurrency_cjs(), 1);
var IMMUTABLE_MARKER = 238;
var SET_AUTHORITY_MARKER = 234;
function isImmutableAnchor(linkHex) {
  if (!/^[0-9a-fA-F]{64}$/.test(linkHex)) return false;
  if (parseInt(linkHex.slice(0, 2), 16) !== IMMUTABLE_MARKER) return false;
  return /^0{30}$/.test(linkHex.slice(34));
}
function isSetAuthorityAnchorA(linkHex) {
  return /^[0-9a-fA-F]{64}$/.test(linkHex) && parseInt(linkHex.slice(0, 2), 16) === SET_AUTHORITY_MARKER;
}
function tokenIdOfAnchor(linkHex) {
  return linkHex.slice(2, 2 + TOKEN_ID_BYTES * 2).toLowerCase();
}
function assembleSetAuthority(aHex, bHex) {
  if (!isSetAuthorityAnchorA(aHex)) throw new Error("not a setAuthority anchor A");
  if (!/^[0-9a-fA-F]{64}$/.test(bHex)) throw new Error("bad anchor B link");
  if (!/^0{30}$/.test(bHex.slice(34))) throw new Error("anchor B padding not zero");
  const pub = aHex.slice(34) + bHex.slice(0, 34);
  if (/^0+$/.test(pub)) throw new Error("zero authority pubkey");
  return {
    tokenId: tokenIdOfAnchor(aHex),
    newAuthority: nanocurrency8.deriveAddress(pub.toLowerCase(), { useNanoPrefix: true })
  };
}

// vendor/hodl/indexer/replay.ts
function fixpointOrder(events, onApply) {
  let state = multiEmpty();
  const applied = [];
  const deferred = [];
  const errs = /* @__PURE__ */ new Map();
  const tryApply = (p) => {
    const before = state;
    try {
      state = applyBlock(state, p.e);
      applied.push(p.e);
      errs.delete(p.i);
      onApply?.(p.e, before, state);
      return true;
    } catch (err) {
      errs.set(p.i, err instanceof Error ? err.message : String(err));
      return false;
    }
  };
  const drainDeferred = () => {
    let progress = true;
    while (progress) {
      progress = false;
      for (let j = 0; j < deferred.length; ) {
        if (tryApply(deferred[j])) {
          deferred.splice(j, 1);
          progress = true;
        } else j++;
      }
    }
  };
  for (let i = 0; i < events.length; i++) {
    const p = { e: events[i], i };
    if (tryApply(p)) drainDeferred();
    else deferred.push(p);
  }
  const invalid = deferred.map((p) => ({ index: p.i, reason: errs.get(p.i) ?? "invalid" }));
  return { applied, state, invalid };
}
function replayMulti(events) {
  const { state, invalid } = fixpointOrder(events);
  return { state, invalid };
}

// vendor/hodl/indexer/multiIndexer.ts
var EMPTY_META = { name: "", symbol: "", decimals: 6, image: "" };
function metaMapResolver(map) {
  return (tokenId) => map.get(tokenId) ?? EMPTY_META;
}
var TIME_ORDER_ERA = 178758e4;
function canonicalOrder(a, b) {
  const ta = a.timestamp ?? 0, tb = b.timestamp ?? 0;
  const ea = ta >= TIME_ORDER_ERA ? 1 : 0, eb = tb >= TIME_ORDER_ERA ? 1 : 0;
  if (ea !== eb) return ea - eb;
  if (ea === 1 && ta !== tb) return ta < tb ? -1 : 1;
  const la = a.lam ?? 0n, lb = b.lam ?? 0n;
  if (la !== lb) return la < lb ? -1 : 1;
  if (a.height !== b.height) return a.height < b.height ? -1 : 1;
  if (a.hash === b.hash) return (a.sub ?? 0) - (b.sub ?? 0);
  return a.hash < b.hash ? -1 : 1;
}
function lamportClocks(chains) {
  const all = /* @__PURE__ */ new Map();
  for (const { byHash } of chains.values()) for (const b of byHash.values()) all.set(b.hash, b);
  const lam = /* @__PURE__ */ new Map();
  const isHex64 = (s) => /^[0-9a-fA-F]{64}$/.test(s);
  let changed = true;
  while (changed) {
    changed = false;
    for (const { byHash } of chains.values()) {
      const ordered = [...byHash.values()].sort((x, y) => x.height < y.height ? -1 : 1);
      for (const b of ordered) {
        let m = lam.get(b.previous) ?? 0n;
        if ((b.subtype === "receive" || b.subtype === "open") && isHex64(b.link)) {
          const s = lam.get(b.link.toUpperCase()) ?? lam.get(b.link.toLowerCase()) ?? lam.get(b.link) ?? 0n;
          if (s > m) m = s;
        }
        const v = m + 1n;
        if ((lam.get(b.hash) ?? -1n) < v) {
          lam.set(b.hash, v);
          changed = true;
        }
      }
    }
  }
  return lam;
}
function collectRotationsFromChain(chains) {
  const out = [];
  for (const { byHash } of chains.values()) {
    for (const b of byHash.values()) {
      if (!isRotateRep(b.representative)) continue;
      if (!/^[0-9a-fA-F]{64}$/.test(b.link)) continue;
      let fromPub;
      try {
        fromPub = nanocurrency9.derivePublicKey(b.account).toLowerCase();
      } catch {
        continue;
      }
      out.push({ fromPub, toPub: b.link.toLowerCase(), height: b.height, hash: b.hash });
    }
  }
  return out;
}
function derivePoolKeysFromChain(chains) {
  const creators = /* @__PURE__ */ new Map();
  const candidates = [];
  for (const { events, byHash } of chains.values()) {
    for (const { ev, prev } of events) {
      if (ev.op.kind === "launch") creators.set(ev.tokenId, ev.sender);
      if (ev.op.kind === "seedLiq") {
        const dep = byHash.get(prev);
        if (dep && BigInt(dep.amount ?? "0") > 0n) {
          candidates.push({ tokenId: ev.tokenId, sender: ev.sender, height: ev.height, hash: ev.hash, poolPub: dep.link });
        }
      }
    }
  }
  candidates.sort(
    (a, b) => a.height !== b.height ? a.height < b.height ? -1 : 1 : a.hash < b.hash ? -1 : a.hash > b.hash ? 1 : 0
  );
  const pools = /* @__PURE__ */ new Map();
  for (const c of candidates) {
    if (pools.has(c.tokenId)) continue;
    if (creators.get(c.tokenId) !== c.sender) continue;
    pools.set(c.tokenId, c.poolPub.toLowerCase());
  }
  return pools;
}
var MultiIndexer = class {
  state = multiEmpty();
  // NOTE (holderPay vendoring): upstream used TypeScript parameter properties
  // here. Node's type-stripping loader does not support them, so they are
  // written out longhand. Behaviour is identical.
  source;
  meta;
  commit;
  poolKey;
  constructor(source, meta = () => EMPTY_META, commit = () => null, poolKey = () => null) {
    this.source = source;
    this.meta = meta;
    this.commit = commit;
    this.poolKey = poolKey;
  }
  getState() {
    return this.state;
  }
  /** Decode a block into a routed event, or null if it carries no op. */
  decode(block) {
    if (block.amount != null && BigInt(block.amount) !== 1n) return null;
    let tokenId;
    let op;
    if (isCommitLink(block.link)) {
      const r = this.commit(block.link);
      if (!r) return null;
      tokenId = r.tokenId;
      op = r.op;
    } else {
      try {
        const d = decodeOpLink(block.link);
        tokenId = d.tokenId;
        op = d.op;
      } catch {
        return null;
      }
      if (op.kind === "launch") {
        tokenId = tokenIdFromLaunchHash(block.hash);
        const m = this.meta(tokenId);
        op = { ...op, name: m.name, symbol: m.symbol, image: m.image };
      }
    }
    const timestamp = block.timestamp ? Number(block.timestamp) : void 0;
    return { tokenId, op, sender: block.account, height: block.height, timestamp, hash: block.hash };
  }
  /** tokenId → CURRENT pool pubkey (lowercase hex), after following custody
   * rotations. Empty until a sync/collect has run. */
  chainPools = /* @__PURE__ */ new Map();
  getChainPools() {
    return new Map(this.chainPools);
  }
  /** tokenId → the SET of accepted pool pubkeys (current ∪ legacy). Deposits
   * value-bind against any address in the set, so a custody rotation doesn't
   * strand historical buys. */
  chainPoolSet = /* @__PURE__ */ new Map();
  getChainPoolSet() {
    return new Map([...this.chainPoolSet].map(([k, v]) => [k, new Set(v)]));
  }
  /** Metadata-authority anchors found by the last collectEvents. */
  metaAnchors = [];
  getMetaAnchors() {
    return [...this.metaAnchors];
  }
  /** op hash → the pool deposit that value-bound it (explorer edges). */
  depositEdges = /* @__PURE__ */ new Map();
  getDepositEdges() {
    return new Map(this.depositEdges);
  }
  /** Pull + decode all ops for the given accounts, in confirmation order.
   *
   * Two passes. Pass 1 derives each token's pool pubkey FROM CHAIN DATA: the
   * first (canonical order) creator-signed seedLiq that chains from a real
   * XNO send names the pool in that deposit's `link`. This makes replay
   * verifiable with zero secrets — POOL_SEED is only needed to SIGN payouts,
   * never to validate history. The injected `poolKey` resolver remains as a
   * fallback for tokens with no seed yet (bootstrap) and MUST agree with the
   * chain-derived key for serviced tokens (the sweep asserts this). */
  /** Fragment-aware decode of one account chain (no value binding yet). Frag
   * B blocks are consumed by their A so their bytes are never mis-decoded as
   * standalone ops; a dangling A is skipped deterministically. */
  decodeChain(blocks) {
    const byHash = new Map(blocks.map((b) => [b.hash, b]));
    const childByPrev = /* @__PURE__ */ new Map();
    for (const b of blocks) childByPrev.set(b.previous, b);
    const consumed = /* @__PURE__ */ new Set();
    const events = [];
    const anchors = [];
    for (const block of blocks) {
      if (consumed.has(block.hash)) continue;
      const isOpCarrier = block.amount == null || BigInt(block.amount) === 1n;
      if (isOpCarrier && isImmutableAnchor(block.link)) {
        anchors.push({
          tokenId: tokenIdOfAnchor(block.link),
          kind: "immutable",
          sender: block.account,
          height: block.height,
          hash: block.hash
        });
        continue;
      }
      if (isOpCarrier && isSetAuthorityAnchorA(block.link)) {
        const child = childByPrev.get(block.hash);
        if (!child) continue;
        if (child.amount != null && BigInt(child.amount) !== 1n) continue;
        try {
          const d = assembleSetAuthority(block.link, child.link);
          consumed.add(child.hash);
          anchors.push({
            tokenId: d.tokenId,
            kind: "setAuthority",
            newAuthority: d.newAuthority,
            sender: block.account,
            height: child.height,
            hash: child.hash
          });
        } catch {
        }
        continue;
      }
      if (isOpCarrier && isFragA(block.link)) {
        const child = childByPrev.get(block.hash);
        if (!child) continue;
        if (child.amount != null && BigInt(child.amount) !== 1n) continue;
        let d;
        try {
          d = assembleFrag(block.link, child.link);
        } catch {
          continue;
        }
        consumed.add(child.hash);
        const timestamp = child.timestamp ? Number(child.timestamp) : void 0;
        if ((d.op.kind === "sell" || d.op.kind === "buy") && child.balance != null) {
          d.op = { ...d.op, balanceAt: BigInt(child.balance) };
        }
        events.push({
          ev: {
            tokenId: d.tokenId,
            op: d.op,
            sender: block.account,
            height: child.height,
            timestamp,
            hash: child.hash,
            carriers: [block.hash, child.hash]
          },
          prev: block.previous
        });
        continue;
      }
      const ev = this.decode(block);
      if (ev) {
        if ((ev.op.kind === "sell" || ev.op.kind === "buy") && block.balance != null) {
          ev.op = { ...ev.op, balanceAt: BigInt(block.balance) };
        }
        events.push({ ev, prev: block.previous });
      }
    }
    return { events, byHash, anchors };
  }
  /** Fragment-aware decoded chains per account (explorer/edge consumers).
   *
   * Block fetches run with bounded concurrency (each account's listBlocks is an
   * independent RPC round-trip), then the Map is rebuilt in the ORIGINAL
   * `accounts` order. decodeChain is a pure function of one account's own
   * locally-verified blocks with zero cross-account dependency, and downstream
   * consumers either sort (canonicalOrder) or are order-independent — so the
   * folded state is byte-identical; only wall-clock changes. Was O(N) serial. */
  async collectChains(accounts, onProgress) {
    const CONCURRENCY = 10;
    const out = new Array(accounts.length).fill(null);
    let cursor = 0;
    let done = 0;
    onProgress?.(0, accounts.length);
    const worker = async () => {
      for (; ; ) {
        const i = cursor++;
        if (i >= accounts.length) return;
        out[i] = this.decodeChain(await this.source.listBlocks(accounts[i]));
        onProgress?.(++done, accounts.length);
      }
    };
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, accounts.length) }, worker));
    const decoded = /* @__PURE__ */ new Map();
    for (let i = 0; i < accounts.length; i++) decoded.set(accounts[i], out[i]);
    return decoded;
  }
  async collectEvents(accounts, onProgress) {
    const decoded = await this.collectChains(accounts, onProgress);
    const initial = derivePoolKeysFromChain(decoded);
    const rotations = collectRotationsFromChain(decoded);
    const rotated = applyRotations(initial, rotations);
    this.chainPools = rotated.current;
    this.chainPoolSet = rotated.accepted;
    this.metaAnchors = [...decoded.values()].flatMap((d) => d.anchors);
    const routesToPool = (tokenId, depLink) => {
      const set3 = this.chainPoolSet.get(tokenId);
      const l = depLink.toLowerCase();
      if (set3 && set3.has(l)) return true;
      const boot = this.poolKey?.(tokenId);
      return Boolean(boot && boot.toLowerCase() === l);
    };
    this.depositEdges = /* @__PURE__ */ new Map();
    const lamMap = lamportClocks(decoded);
    const directSet = /* @__PURE__ */ new Set();
    for (const { events: evs } of decoded.values()) {
      for (const { ev } of evs) {
        if (ev.op.kind === "launch" && ev.op.direct) directSet.add(ev.tokenId);
      }
    }
    const consumedDeposits = /* @__PURE__ */ new Set();
    const events = [];
    for (const { events: evs, byHash } of decoded.values()) {
      for (const { ev, prev } of evs) {
        if (ev.op.kind === "buy" && directSet.has(ev.tokenId)) {
          if (ev.op.xno > 0n) {
          } else {
            const dep = byHash.get(prev);
            const amount = dep ? BigInt(dep.amount ?? "0") : 0n;
            if (!dep || amount <= 0n || dep.subtype !== "send" || consumedDeposits.has(dep.hash)) continue;
            consumedDeposits.add(dep.hash);
            let payee;
            try {
              payee = nanocurrency9.deriveAddress(dep.link.toLowerCase(), { useNanoPrefix: true });
            } catch {
              continue;
            }
            ev.op = { ...ev.op, xno: amount, depositTo: payee };
            this.depositEdges.set(ev.hash, { deposit: dep.hash, amountRaw: amount.toString() });
          }
        } else if (ev.op.kind === "buy") {
          const dep = byHash.get(prev);
          const amount = dep ? BigInt(dep.amount ?? "0") : 0n;
          const routed = Boolean(dep && routesToPool(ev.tokenId, dep.link));
          if (!dep || amount <= 0n || !routed || consumedDeposits.has(dep.hash)) continue;
          consumedDeposits.add(dep.hash);
          ev.op = { ...ev.op, xno: amount };
          this.depositEdges.set(ev.hash, { deposit: dep.hash, amountRaw: amount.toString() });
        } else if ((ev.op.kind === "seedLiq" || ev.op.kind === "addLiq") && directSet.has(ev.tokenId)) {
        } else if (ev.op.kind === "seedLiq" || ev.op.kind === "addLiq") {
          const dep = byHash.get(prev);
          const amount = dep ? BigInt(dep.amount ?? "0") : 0n;
          const routed = Boolean(dep && routesToPool(ev.tokenId, dep.link));
          if (routed && amount > 0n && !consumedDeposits.has(dep.hash)) {
            consumedDeposits.add(dep.hash);
            ev.op = { ...ev.op, xno: amount };
            this.depositEdges.set(ev.hash, { deposit: dep.hash, amountRaw: amount.toString() });
          } else if (ev.op.xno > 0n) {
            continue;
          }
        }
        ev.lam = lamMap.get(ev.hash) ?? 0n;
        events.push(ev);
      }
    }
    if (directSet.size > 0) {
      let maxLam = 0n;
      for (const v of lamMap.values()) if (v > maxLam) maxLam = v;
      const headLam = maxLam + 1n;
      let maxT = 0;
      for (const { byHash } of decoded.values())
        for (const b of byHash.values()) {
          const t = b.timestamp ? Number(b.timestamp) : 0;
          if (t > maxT) maxT = t;
        }
      for (const { byHash } of decoded.values()) {
        let head = null;
        for (const b of byHash.values()) {
          if (b.balance == null) continue;
          events.push({
            tokenId: "",
            op: { kind: "balance", raw: BigInt(b.balance) },
            sender: b.account,
            height: b.height,
            // The block's own time, so the observation folds at the same
            // primary key as the block's op (sub orders it strictly after).
            timestamp: b.timestamp ? Number(b.timestamp) : void 0,
            hash: b.hash,
            sub: 1,
            lam: lamMap.get(b.hash) ?? 0n
          });
          if (!head || b.height > head.height) head = b;
        }
        if (head) {
          events.push({
            tokenId: "",
            op: { kind: "balance", raw: BigInt(head.balance) },
            sender: head.account,
            height: head.height,
            timestamp: maxT + 1,
            hash: head.hash,
            sub: 2,
            lam: headLam
          });
        }
      }
    }
    return events.sort(canonicalOrder);
  }
  /** Pull blocks for the given accounts and fold them into a MultiState. */
  async sync(accounts, onProgress) {
    const events = await this.collectEvents(accounts, onProgress);
    const result = replayMulti(events);
    this.state = result.state;
    return {
      applied: events.length - result.invalid.length,
      invalid: result.invalid.length,
      reasons: result.invalid.map((r) => r.reason)
    };
  }
  /** Collect on-chain sell ops (with block hash, for payout idempotency). */
  async collectSells(accounts) {
    const out = [];
    for (const account of accounts) {
      for (const block of await this.source.listBlocks(account)) {
        const ev = this.decode(block);
        if (ev && ev.op.kind === "sell") {
          out.push({
            tokenId: ev.tokenId,
            sender: ev.sender,
            tokens: ev.op.tokens,
            minXno: ev.op.minXno,
            hash: block.hash
          });
        }
      }
    }
    return out;
  }
};

// core/fold.ts
function carriersOf(e) {
  const hashes = e.carriers && e.carriers.length ? e.carriers : [e.hash];
  return hashes.map((h) => h.toUpperCase());
}
async function watchSet(reader, seeds2, cap = 400) {
  const set3 = new Set(seeds2.filter(Boolean));
  const hops = await Promise.all(
    seeds2.filter(Boolean).map(async (a) => {
      try {
        return await reader.counterparties(a);
      } catch {
        return { inbound: [], outbound: [] };
      }
    })
  );
  for (const cp of hops) {
    for (const h of cp.inbound) set3.add(h.sender);
    for (const a of cp.outbound) set3.add(a);
  }
  const kept = new Set(seeds2.filter(Boolean));
  const discovered = [...set3].filter((a) => a && !kept.has(a)).sort();
  for (const a of discovered) {
    if (kept.size >= cap) break;
    kept.add(a);
  }
  return [...kept].filter(Boolean).sort();
}
async function foldAccounts(source, accounts, meta) {
  const indexer = new MultiIndexer(source, meta ? metaMapResolver(meta) : void 0);
  const events = await indexer.collectEvents(accounts);
  const appliedByCarrier = /* @__PURE__ */ new Map();
  const { state, invalid } = fixpointOrder(events, (e) => {
    for (const h of carriersOf(e)) appliedByCarrier.set(h, e);
  });
  const rejectedByCarrier = /* @__PURE__ */ new Map();
  for (const bad of invalid) {
    const e = events[bad.index];
    if (!e) continue;
    for (const h of carriersOf(e)) rejectedByCarrier.set(h, bad.reason);
  }
  return { state, appliedByCarrier, rejectedByCarrier, accounts, at: Date.now() };
}
function stateOf(f, tokenId) {
  return tokenState(f.state, tokenId.toLowerCase());
}
function opApplied(f, tokenId, carrierHash) {
  const key = carrierHash.toUpperCase();
  const ev = f.appliedByCarrier.get(key);
  if (ev) {
    if (ev.tokenId.toLowerCase() !== tokenId.toLowerCase()) {
      return { applied: false, reason: "carrier applied under a different token" };
    }
    return { applied: true, reason: "applied in replay" };
  }
  const why = f.rejectedByCarrier.get(key);
  if (why) return { applied: false, reason: why };
  return {
    applied: false,
    reason: "not present in this verifier's replay yet (unwatched account, or not yet confirmed)"
  };
}

// vendor/hodl/core/anchor.ts
var nanocurrency10 = __toESM(require_nanocurrency_cjs(), 1);
var ANCHOR_PUB = "834E06E07A2EE50CCF472C1098211277BA93D66FB8F501C9BED31B785CC54245";

// core/ledger.ts
var nanocurrency11 = __toESM(require_nanocurrency_cjs(), 1);
loadEnv();
function seeds(extra) {
  const list2 = [
    env("CREATOR_ADDRESS"),
    env("MERCHANT_ADDRESS"),
    env("HOLDERPAY_ANCHOR_ADDRESS"),
    ...extra,
    ...env("WATCH_EXTRA").split(/[,\s]+/).filter(Boolean)
  ];
  if (env("DISCOVER_HODLGAME") === "1") {
    try {
      list2.push(nanocurrency11.deriveAddress(ANCHOR_PUB, { useNanoPrefix: true }));
    } catch {
    }
  }
  return list2.filter(Boolean);
}
async function fold(extraAccounts = []) {
  const source = new NanoRpcSource(rpcKey());
  const anchor = env("HOLDERPAY_ANCHOR_ADDRESS");
  const accounts = (await watchSet(source, seeds(extraAccounts))).filter((a) => a !== anchor);
  return foldAccounts(source, accounts);
}
var cached = null;
var inflight = null;
var FOLD_TTL_MS = 4e3;
async function currentFold(extraAccounts = [], force = false) {
  const key = [...extraAccounts].sort().join(",");
  if (!force && cached && cached.key === key && Date.now() - cached.fold.at < FOLD_TTL_MS) return cached.fold;
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const f = await fold(extraAccounts);
      cached = { fold: f, key };
      return f;
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}
function bustFold() {
  cached = null;
}

// core/valuation.ts
var XNO = 10n ** 30n;
function backingOf(s) {
  let total = 0n;
  for (const f of s.earmarkFloor.values()) total += f;
  return total;
}
function circulatingOf(s) {
  return s.supply > s.treasury ? s.supply - s.treasury : 0n;
}
function quotedPriceOf(s) {
  if (s.poolTokens <= 0n || s.poolXno <= 0n) return 0n;
  return s.poolXno * 10n ** BigInt(s.decimals) / s.poolTokens;
}
function viewToken(tokenId, s, account = "", labels) {
  const unit = 10n ** BigInt(s.decimals);
  const quotedPrice = quotedPriceOf(s);
  const quotedValue = s.supply * quotedPrice / unit;
  const backing = backingOf(s);
  const balance = account ? s.balances.get(account) ?? 0n : 0n;
  const circulating = circulatingOf(s);
  const backedHoldingValue = circulating > 0n ? backing * balance / circulating : 0n;
  const label = labels?.get(tokenId.toLowerCase());
  return {
    tokenId,
    symbol: label?.symbol || s.symbol || tokenId.slice(0, 6),
    name: label?.name || s.name || "",
    decimals: s.decimals,
    supply: s.supply.toString(),
    poolXno: s.poolXno.toString(),
    poolTokens: s.poolTokens.toString(),
    creator: s.creator,
    holders: s.balances.size,
    direct: s.direct,
    quotedPrice: quotedPrice.toString(),
    quotedValue: quotedValue.toString(),
    backing: backing.toString(),
    circulating: circulating.toString(),
    // Parts-per-million internally, reported as a percentage, so a real but
    // tiny ratio does not round away to a flat 0 and read like "unbacked".
    backedPct: quotedValue > 0n ? Number(backing * 1000000n / quotedValue) / 1e4 : null,
    balance: balance.toString(),
    quotedHoldingValue: (balance * quotedPrice / unit).toString(),
    backedHoldingValue: backedHoldingValue.toString()
  };
}
function sortTokens(list2, key = "backedHoldingValue") {
  const num = (v, k) => {
    if (k === "symbol") return 0n;
    try {
      return BigInt(v[k] ?? "0");
    } catch {
      return 0n;
    }
  };
  return [...list2].sort((a, b) => {
    if (key === "symbol") return a.symbol.localeCompare(b.symbol) || a.tokenId.localeCompare(b.tokenId);
    const primary = num(b, key) - num(a, key);
    if (primary !== 0n) return primary > 0n ? 1 : -1;
    const secondary = BigInt(b.backing) - BigInt(a.backing);
    if (secondary !== 0n) return secondary > 0n ? 1 : -1;
    return a.tokenId.localeCompare(b.tokenId);
  });
}
function tokenList(fold2, account = "", key = "backedHoldingValue", labels) {
  const views = tokens(fold2.state).map(({ tokenId, state }) => viewToken(tokenId, state, account, labels));
  return sortTokens(views, key);
}

// core/reader.ts
var NodeReader = class {
  // Per-instance memo: one verify call touches the receipt, the payment and
  // (token lane) the fragment underneath it, and the balance check walks back
  // one more. Re-fetching the same hash within a call is pure waste.
  memo = /* @__PURE__ */ new Map();
  extraAccounts;
  constructor(extraAccounts = []) {
    this.extraAccounts = extraAccounts;
  }
  async getBlock(hash) {
    const key = (hash ?? "").toUpperCase();
    if (this.memo.has(key)) return this.memo.get(key);
    const got = (await getBlocks([key])).get(key) ?? null;
    this.memo.set(key, got);
    return got;
  }
  /** Prefetch several hashes in one RPC round-trip. */
  async warm(hashes) {
    const want = hashes.map((h) => h.toUpperCase()).filter((h) => !this.memo.has(h));
    if (want.length === 0) return;
    const got = await getBlocks(want);
    for (const h of want) this.memo.set(h, got.get(h) ?? null);
  }
  async tokenOpApplied(tokenId, carrierHash) {
    const f = await currentFold(this.extraAccounts);
    return opApplied(f, tokenId, carrierHash);
  }
  /** Collateral behind a token, from this verifier's own replay. */
  async tokenBacking(tokenId) {
    const f = await currentFold(this.extraAccounts);
    const s = stateOf(f, tokenId);
    if (!s.launched) return null;
    return { backing: backingOf(s), circulating: circulatingOf(s) };
  }
  /** Token balance as this verifier computes it. For display, not verdicts. */
  async tokenBalance(tokenId, account) {
    const f = await currentFold(this.extraAccounts);
    return stateOf(f, tokenId).balances.get(account) ?? 0n;
  }
};

// core/swap.ts
var nanocurrency13 = __toESM(require_nanocurrency_cjs(), 1);

// core/wallet.ts
var nanocurrency12 = __toESM(require_nanocurrency_cjs(), 1);
var XNO2 = 10n ** 30n;

// core/swap.ts
function quoteBuy(poolXno, poolTokens, xno) {
  if (poolXno <= 0n || poolTokens <= 0n || xno <= 0n) return 0n;
  const afterFee = xno * 9900n / 10000n;
  return afterFee * poolTokens / (poolXno + afterFee);
}
function xnoNeededFor(poolXno, poolTokens, tokens2) {
  if (tokens2 <= 0n) return 0n;
  if (poolXno <= 0n || poolTokens <= 0n || tokens2 >= poolTokens) return null;
  let lo = 1n;
  let hi = poolXno;
  for (let i = 0; i < 128 && quoteBuy(poolXno, poolTokens, hi) < tokens2; i++) hi *= 2n;
  if (quoteBuy(poolXno, poolTokens, hi) < tokens2) return null;
  while (lo < hi) {
    const mid = (lo + hi) / 2n;
    if (quoteBuy(poolXno, poolTokens, mid) >= tokens2) hi = mid;
    else lo = mid + 1n;
  }
  return lo;
}
function planSwap(i) {
  const s = i.state;
  const fail = (problem) => ({
    lane: "earmark",
    xno: 0n,
    tokensOut: 0n,
    minTokens: 0n,
    needBalance: 0n,
    problem
  });
  if (!s.launched) return fail("token has not launched");
  if (s.poolXno <= 0n || s.poolTokens <= 0n) return fail("token has no liquidity to swap against yet");
  if (i.wantTokens <= 0n) return fail("nothing to buy");
  const xno = xnoNeededFor(s.poolXno, s.poolTokens, i.wantTokens);
  if (xno == null) return fail("not enough liquidity for that size");
  const tokensOut = quoteBuy(s.poolXno, s.poolTokens, xno);
  const bps = Math.min(1e4, Math.max(0, Math.floor(i.slippageBps)));
  const guard = tokensOut * BigInt(1e4 - bps) / 10000n;
  const minTokens = guard < i.wantTokens ? guard : i.wantTokens;
  const head = s.queue.find((q) => q.owed > 0n);
  if (head) {
    if (xno <= head.owed) {
      return {
        lane: "queue",
        xno,
        tokensOut,
        minTokens,
        payTo: head.account,
        // send + 1-raw op block
        needBalance: xno + 1n
      };
    }
    const capped = head.owed;
    const out = quoteBuy(s.poolXno, s.poolTokens, capped);
    return {
      lane: "queue",
      xno: capped,
      tokensOut: out,
      minTokens: out * BigInt(1e4 - bps) / 10000n,
      payTo: head.account,
      needBalance: capped + 1n,
      problem: out < i.wantTokens ? `the queued seller is only owed ${capped} raw, which buys ${out} -- repeat the buy for the rest` : void 0
    };
  }
  const need = xno + i.myFloor + 2n;
  return {
    lane: "earmark",
    xno,
    tokensOut,
    minTokens,
    needBalance: need,
    problem: i.walletBalance < need ? `wallet needs ${need} raw to collateralize this buy` : void 0
  };
}

// server/catalog.ts
import * as fs2 from "node:fs";
import * as path2 from "node:path";
var DIR = path2.resolve(process.cwd(), "data");
var FILE = path2.join(DIR, "catalog.json");
var frozen = null;
var CatalogReadOnlyError = class extends Error {
  constructor() {
    super(
      "this deployment serves a fixed catalog -- publish with scripts/publish-offers.ts and redeploy, or run the Node server where the catalog is writable"
    );
  }
};
function seedReadOnly(listings) {
  frozen = new Map(listings.map((l) => [l.policy.id.toLowerCase(), l]));
}
function isReadOnly() {
  return frozen !== null;
}
var cache = null;
var cachedMtimeMs = -1;
function mtime() {
  try {
    return fs2.statSync(FILE).mtimeMs;
  } catch {
    return -1;
  }
}
function load() {
  if (frozen) return frozen;
  const m = mtime();
  if (cache && m === cachedMtimeMs) return cache;
  cache = /* @__PURE__ */ new Map();
  cachedMtimeMs = m;
  try {
    const raw = JSON.parse(fs2.readFileSync(FILE, "utf-8"));
    for (const l of raw.listings ?? []) cache.set(l.policy.id, l);
  } catch {
  }
  return cache;
}
function save() {
  fs2.mkdirSync(DIR, { recursive: true });
  const tmp = FILE + ".tmp";
  fs2.writeFileSync(tmp, JSON.stringify({ listings: [...load().values()] }, null, 2));
  fs2.renameSync(tmp, FILE);
  cachedMtimeMs = mtime();
}
function list() {
  return [...load().values()].sort((a, b) => a.createdAt - b.createdAt);
}
function get3(policyId2) {
  return load().get((policyId2 ?? "").toLowerCase()) ?? null;
}
function put(input, unlock) {
  if (frozen) throw new CatalogReadOnlyError();
  const policy = makePolicy(input);
  const existing = load().get(policy.id);
  const listing = { policy, unlock, createdAt: existing?.createdAt ?? Date.now() };
  load().set(policy.id, listing);
  save();
  return listing;
}

// server/snapshot.ts
import * as fs3 from "node:fs";
import * as path3 from "node:path";
var baked = null;
var fileChecked = false;
var fromFile = null;
function seed(s) {
  baked = s && Array.isArray(s.tokens) ? s : null;
}
function snapshot() {
  if (baked) return baked;
  if (!fileChecked) {
    fileChecked = true;
    try {
      const raw = fs3.readFileSync(path3.resolve(process.cwd(), "data", "tokens.snapshot.json"), "utf-8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed?.tokens)) fromFile = parsed;
    } catch {
    }
  }
  return fromFile;
}
function ageMs() {
  const s = snapshot();
  if (!s?.at) return null;
  const t = Date.parse(s.at);
  return Number.isFinite(t) ? Date.now() - t : null;
}

// server/watch.ts
import WebSocket from "ws";
var ConfirmationWatcher = class {
  ws = null;
  accounts = /* @__PURE__ */ new Set();
  listeners = /* @__PURE__ */ new Set();
  backoff = 1e3;
  closed = false;
  /** Recent confirmations, newest last. Lets a page that connects a moment late
   * still see the block it was waiting for. */
  recent = [];
  RECENT_MAX = 200;
  start() {
    if (this.ws || this.closed) return;
    const ws = new WebSocket(NANO_WS);
    this.ws = ws;
    ws.on("open", () => {
      this.backoff = 1e3;
      this.send({
        action: "subscribe",
        topic: "confirmation",
        ack: true,
        options: { accounts: [...this.accounts] }
      });
      const timer = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) this.send({ action: "ping" });
        else clearInterval(timer);
      }, 25e3);
    });
    ws.on("message", (raw) => {
      let msg;
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        return;
      }
      if (msg.topic !== "confirmation" || !msg.message) return;
      const m = msg.message;
      const c = {
        hash: String(m.hash ?? "").toUpperCase(),
        account: String(m.account ?? ""),
        link: String(m.block?.link ?? "").toUpperCase(),
        subtype: String(m.block?.subtype ?? ""),
        amount: String(m.amount ?? "0"),
        at: Date.now()
      };
      bustFold();
      this.recent.push(c);
      if (this.recent.length > this.RECENT_MAX) this.recent.shift();
      for (const l of this.listeners) {
        try {
          l(c);
        } catch {
        }
      }
    });
    const retry = () => {
      this.ws = null;
      if (this.closed) return;
      setTimeout(() => this.start(), this.backoff);
      this.backoff = Math.min(3e4, this.backoff * 2);
    };
    ws.on("close", retry);
    ws.on("error", retry);
  }
  send(obj) {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(obj));
  }
  /** Add accounts to the live subscription (no reconnect needed). */
  watch(accounts) {
    const added = accounts.filter((a) => a && !this.accounts.has(a));
    for (const a of added) this.accounts.add(a);
    if (added.length) {
      this.send({ action: "update", topic: "confirmation", options: { accounts_add: added } });
    }
    this.start();
  }
  on(l) {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  }
  /** Confirmations seen in the last `ms`, optionally filtered by account. */
  since(ms, account) {
    const cutoff = Date.now() - ms;
    return this.recent.filter((c) => c.at >= cutoff && (!account || c.account === account));
  }
  get connected() {
    return this.ws?.readyState === WebSocket.OPEN;
  }
  get watching() {
    return [...this.accounts];
  }
  stop() {
    this.closed = true;
    this.ws?.close();
    this.ws = null;
  }
};
var watcher = new ConfirmationWatcher();

// server/index.ts
loadEnv();
var PORT = Number(env("PORT", "8787"));
var HOST = env("HOST", "127.0.0.1");
var WEB = path4.resolve(process.cwd(), "web");
var TOKEN_ID = env("TEACHER_TOKEN_ID");
var MERCHANT = env("MERCHANT_ADDRESS");
var isLoopback = (h) => h === "127.0.0.1" || h === "::1" || h === "localhost";
var PUBLIC_BIND = !isLoopback(HOST);
var ALLOWED_ACTIONS = /* @__PURE__ */ new Set([
  "account_info",
  "account_history",
  "accounts_frontiers",
  "block_info",
  "blocks_info",
  "pending",
  "receivable",
  "process",
  "work_generate",
  "version"
]);
var WORK_PER_IP_PER_MIN = 12;
var WORK_GLOBAL_PER_MIN = 120;
var WORK_MAX_WAIT_MS = Number(env("WORK_MAX_WAIT_MS", "75000"));
var WORK_MAX_WAITERS = 64;
var READ_GLOBAL_PER_MIN = Number(env("READ_GLOBAL_PER_MIN", "3000"));
var workBudgets = /* @__PURE__ */ new Map();
var workWaiters = 0;
function budgetFor(key) {
  const now = Date.now();
  let b = workBudgets.get(key);
  if (!b || now > b.until) {
    b = { n: 0, until: now + 6e4 };
    workBudgets.set(key, b);
    if (workBudgets.size > 5e3) {
      for (const [k, v] of workBudgets) if (now > v.until) workBudgets.delete(k);
    }
  }
  return b;
}
function msUntilSlot(key, max) {
  const b = budgetFor(key);
  return b.n < max ? 0 : Math.max(0, b.until - Date.now());
}
async function awaitWorkSlot(ip, res) {
  const started = Date.now();
  for (; ; ) {
    const wait = Math.max(
      msUntilSlot(`ip:${ip}`, WORK_PER_IP_PER_MIN),
      msUntilSlot("global", WORK_GLOBAL_PER_MIN)
    );
    if (wait <= 0) {
      budgetFor(`ip:${ip}`).n++;
      budgetFor("global").n++;
      return { ok: true, waitedMs: Date.now() - started };
    }
    if (Date.now() - started + wait > WORK_MAX_WAIT_MS) {
      return { ok: false, retryAfterMs: wait, reason: "the work budget is spent for longer than a request may be held" };
    }
    if (workWaiters >= WORK_MAX_WAITERS) {
      return { ok: false, retryAfterMs: wait, reason: "too many requests already waiting for work" };
    }
    workWaiters++;
    try {
      await new Promise((r) => setTimeout(r, Math.min(wait + 50, 5e3)));
    } finally {
      workWaiters--;
    }
    if (res.destroyed || res.writableEnded) return { ok: false, retryAfterMs: 0, reason: "client went away" };
  }
}
var hits = /* @__PURE__ */ new Map();
function rateLimit(key, max, windowMs) {
  const now = Date.now();
  const h = hits.get(key);
  if (!h || now > h.until) {
    hits.set(key, { n: 1, until: now + windowMs });
    return true;
  }
  h.n++;
  return h.n <= max;
}
var ADMIN_TOKEN = env("ADMIN_TOKEN");
var DEV_OPEN_CATALOG = env("HOLDERPAY_DEV") === "1";
var ALLOW_FORGE = env("HOLDERPAY_ALLOW_FORGE") === "1";
function adminOk(req) {
  if (!ADMIN_TOKEN) return DEV_OPEN_CATALOG;
  const given = String(req.headers["x-admin-token"] ?? "");
  const a = Buffer.from(given);
  const b = Buffer.from(ADMIN_TOKEN);
  return a.length === b.length && crypto2.timingSafeEqual(a, b);
}
var CHALLENGE_TTL_MS = 10 * 6e4;
var CHALLENGE_SECRET = (() => {
  const s = env("CHALLENGE_SECRET");
  if (s) return Buffer.from(s);
  if (PUBLIC_BIND) {
    console.log("  challenge no CHALLENGE_SECRET -- generating one; set it if you run more than one instance");
  }
  return crypto2.randomBytes(32);
})();
function signChallenge(payload) {
  return crypto2.createHmac("sha256", CHALLENGE_SECRET).update(payload).digest("hex").slice(0, 32);
}
function newChallenge() {
  const payload = `${Date.now() + CHALLENGE_TTL_MS}.${crypto2.randomBytes(16).toString("hex")}`;
  return `${payload}.${signChallenge(payload)}`;
}
var spent = /* @__PURE__ */ new Set();
function challengeValid(c) {
  const parts = c.split(".");
  if (parts.length !== 3) return false;
  const [expStr, nonce, mac] = parts;
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp < Date.now()) return false;
  if (!/^[0-9a-f]{32}$/.test(nonce) || !/^[0-9a-f]{32}$/.test(mac)) return false;
  const expected = signChallenge(`${expStr}.${nonce}`);
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto2.timingSafeEqual(a, b)) return false;
  return !spent.has(c);
}
function spendChallenge(c) {
  spent.add(c);
  if (spent.size > 1e4) {
    const now = Date.now();
    for (const k of spent) if (Number(k.split(".")[0]) < now) spent.delete(k);
  }
}
var json = (res, code, body) => {
  const text = JSON.stringify(body, (_k, v) => typeof v === "bigint" ? v.toString() : v);
  res.writeHead(code, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store"
  });
  res.end(text);
};
async function readBody(req, limit = 256 * 1024) {
  const chunks = [];
  let size = 0;
  for await (const c of req) {
    size += c.length;
    if (size > limit) throw new Error("body too large");
    chunks.push(c);
  }
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf-8"));
}
function resolvePolicy(body) {
  if (body?.policy && typeof body.policy === "object") {
    const p = body.policy;
    if (!policyIsIntact(p)) return { policy: null, error: "inline policy does not match its own id" };
    return { policy: p };
  }
  const id = String(body?.policyId ?? "");
  const listing = get3(id);
  if (!listing) return { policy: null, error: "unknown policy id" };
  return { policy: listing.policy };
}
function tokenLabels() {
  const labels = /* @__PURE__ */ new Map();
  try {
    for (const [id, v] of Object.entries(JSON.parse(env("TOKEN_LABELS", "{}")))) {
      labels.set(id.toLowerCase(), typeof v === "string" ? { symbol: v } : v);
    }
  } catch {
  }
  if (TOKEN_ID) labels.set(TOKEN_ID.toLowerCase(), { symbol: "TEACHER", name: "Teacher" });
  for (const l of list()) {
    for (const a of acceptedTokens(l.policy)) {
      if (a.symbol && !labels.has(a.tokenId)) labels.set(a.tokenId, { symbol: a.symbol });
    }
  }
  return labels;
}
var inFlight = 0;
var draining = false;
var drained = null;
async function handle(req, res) {
  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
  const ip = String(req.socket.remoteAddress ?? "?");
  const route = `${req.method} ${url.pathname}`;
  harden(res);
  inFlight++;
  res.on("close", () => {
    inFlight--;
    if (draining && inFlight === 0) drained?.();
  });
  try {
    if (req.method === "GET" && (url.pathname === "/" || url.pathname === "/index.html")) {
      return serveFile(res, path4.join(WEB, "index.html"), "text/html; charset=utf-8");
    }
    if (req.method === "GET" && /^\/[a-zA-Z0-9._-]+\.(js|css|svg|png|ico|map)$/.test(url.pathname)) {
      const file = path4.join(WEB, url.pathname.slice(1));
      const type = url.pathname.endsWith(".js") ? "text/javascript; charset=utf-8" : url.pathname.endsWith(".css") ? "text/css; charset=utf-8" : url.pathname.endsWith(".svg") ? "image/svg+xml" : "application/octet-stream";
      return serveFile(res, file, type);
    }
    if (route === "GET /api/config") {
      return json(res, 200, {
        ws: NANO_WS,
        rpc: "/api/rpc",
        // A convenience default for the merchant form. The app is NOT limited
        // to it: an offer may list any hodlgame token, and /api/tokens returns
        // everything this verifier can see.
        tokenId: TOKEN_ID,
        symbol: "TEACHER",
        decimals: 6,
        merchant: MERCHANT,
        anchors: { holderpay: env("HOLDERPAY_ANCHOR_ADDRESS"), hodlgame: ANCHOR_PUB },
        launchHash: env("TEACHER_LAUNCH_HASH"),
        wsConnected: watcher.connected
      });
    }
    if (route === "POST /api/rpc") {
      if (!rateLimit(`rpc:${ip}`, 600, 6e4)) {
        res.setHeader("retry-after", "60");
        return json(res, 429, { error: "too many ledger reads from this address -- try again in a minute" });
      }
      if (!rateLimit("rpc:global", READ_GLOBAL_PER_MIN, 6e4)) {
        res.setHeader("retry-after", "60");
        return json(res, 429, { error: "this verifier is at its ledger-read ceiling right now -- try again in a minute" });
      }
      const body = await readBody(req);
      const action = String(body?.action ?? "");
      if (!ALLOWED_ACTIONS.has(action)) return json(res, 400, { error: `action not allowed: ${action}` });
      let workWaitMs = 0;
      if (action === "work_generate") {
        const slot = await awaitWorkSlot(ip, res);
        if (!slot.ok) {
          if (slot.retryAfterMs === 0) return;
          const secs = Math.ceil(slot.retryAfterMs / 1e3);
          res.setHeader("retry-after", String(secs));
          return json(res, 429, {
            error: `proof of work is rate limited -- ${slot.reason}. Try again in ${secs}s.`,
            retryAfterMs: slot.retryAfterMs
          });
        }
        workWaitMs = slot.waitedMs;
        if (workWaitMs > 0) res.setHeader("x-work-wait-ms", String(workWaitMs));
      }
      try {
        return json(res, 200, await rpc(body));
      } catch (e) {
        return json(res, 200, { error: e?.message ?? String(e) });
      }
    }
    if (route === "GET /api/policies") {
      return json(res, 200, {
        listings: list().map((l) => ({
          policy: l.policy,
          lanes: lanesOf(l.policy),
          accept: acceptedTokens(l.policy),
          swapInto: swapTarget(l.policy),
          receiptLink: memoLink(l.policy.id)
        }))
      });
    }
    if (route === "POST /api/policies") {
      if (isReadOnly()) {
        return json(res, 405, { error: new CatalogReadOnlyError().message });
      }
      if (!adminOk(req)) {
        return json(res, 403, {
          error: "publishing offers is disabled -- set ADMIN_TOKEN in .env and send it as x-admin-token (or HOLDERPAY_DEV=1 for a local demo)"
        });
      }
      const body = await readBody(req);
      const input = body?.policy;
      if (!input || !isNanoAddress(input.merchant ?? "")) return json(res, 400, { error: "merchant address required" });
      const accept = normalizeAccept(input.accept).slice(0, 50);
      if (accept.length === 0 && !input.priceXno) {
        return json(res, 400, { error: "an offer must accept XNO, at least one token, or both" });
      }
      const listing = put(
        {
          merchant: input.merchant,
          resource: String(input.resource ?? "").slice(0, 200),
          title: String(input.title ?? "").slice(0, 200),
          description: String(input.description ?? "").slice(0, 2e3),
          priceXno: input.priceXno ? BigInt(input.priceXno).toString() : void 0,
          accept,
          autoswap: !!input.autoswap,
          swapInto: input.swapInto ? String(input.swapInto).toLowerCase() : void 0,
          expires: Number(input.expires) || 0
        },
        String(body?.unlock ?? "").slice(0, 2e4)
      );
      watcher.watch([listing.policy.merchant]);
      return json(res, 200, { policy: listing.policy, receiptLink: memoLink(listing.policy.id) });
    }
    if (route === "GET /api/policy") {
      const l = get3(url.searchParams.get("id") ?? "");
      if (!l) return json(res, 404, { error: "unknown policy" });
      return json(res, 200, {
        policy: l.policy,
        lanes: lanesOf(l.policy),
        accept: acceptedTokens(l.policy),
        swapInto: swapTarget(l.policy),
        receiptLink: memoLink(l.policy.id)
      });
    }
    if (route === "GET /api/tokens") {
      const account = url.searchParams.get("account") ?? "";
      const sort = url.searchParams.get("sort") ?? "backedHoldingValue";
      const held = url.searchParams.get("held") === "1";
      const f = await currentFold(account ? [account] : []);
      const live = tokenList(f, account, sort, tokenLabels());
      const seen = new Set(live.map((t) => t.tokenId));
      const snap = snapshot();
      const extra = (snap?.tokens ?? []).filter((t) => !seen.has(t.tokenId)).map((t) => ({ ...t, balance: "0", quotedHoldingValue: "0", backedHoldingValue: "0", stale: true }));
      let tokens2 = [...live.map((t) => ({ ...t, stale: false })), ...extra];
      if (held && account) tokens2 = tokens2.filter((t) => BigInt(t.balance) > 0n);
      return json(res, 200, {
        tokens: tokens2,
        watched: f.accounts.length,
        foldAt: f.at,
        sort,
        // So the page can say "as of ..." instead of implying everything here
        // was checked a moment ago.
        catalogue: snap ? { at: snap.at, accounts: snap.accounts, tokens: snap.tokens.length, ageMs: ageMs() } : null
      });
    }
    if (route === "GET /api/token") {
      const account = url.searchParams.get("account") ?? "";
      const tokenId = (url.searchParams.get("tokenId") || TOKEN_ID).toLowerCase();
      if (!tokenId) return json(res, 400, { error: "tokenId required" });
      const f = await currentFold(account ? [account] : []);
      const s = stateOf(f, tokenId);
      const head = s.queue.find((q) => q.owed > 0n) ?? null;
      return json(res, 200, {
        ...viewToken(tokenId, s, account, tokenLabels()),
        launched: s.launched,
        treasury: s.treasury.toString(),
        queueHead: head ? { account: head.account, owed: head.owed } : null,
        queueTotal: s.queue.reduce((a, q) => a + q.owed, 0n),
        you: account ? {
          balance: s.balances.get(account) ?? 0n,
          earmark: s.earmark.get(account) ?? 0n,
          floor: s.earmarkFloor.get(account) ?? 0n
        } : null,
        merchantBalance: MERCHANT ? s.balances.get(MERCHANT) ?? 0n : 0n,
        watched: f.accounts.length,
        foldAt: f.at
      });
    }
    if (route === "GET /api/quote") {
      const tokenId = (url.searchParams.get("tokenId") || TOKEN_ID).toLowerCase();
      const want = BigInt(url.searchParams.get("tokens") ?? "0");
      const account = url.searchParams.get("account") ?? "";
      const slippageBps = Number(url.searchParams.get("slippageBps") ?? "300");
      if (!tokenId) return json(res, 400, { error: "no token configured" });
      const f = await currentFold(account ? [account] : []);
      const s = stateOf(f, tokenId);
      let walletBalance = 0n;
      if (account) {
        try {
          const info = await rpc({ action: "account_info", account });
          walletBalance = BigInt(info.balance ?? "0");
        } catch {
        }
      }
      const plan = planSwap({
        state: s,
        walletBalance,
        myFloor: s.earmarkFloor.get(account) ?? 0n,
        wantTokens: want,
        slippageBps
      });
      return json(res, 200, { plan, walletBalance, spot: quoteBuy(s.poolXno, s.poolTokens, 10n ** 30n) });
    }
    if (route === "GET /api/challenge") {
      return json(res, 200, { challenge: newChallenge(), ttlMs: CHALLENGE_TTL_MS });
    }
    if (route === "POST /api/verify") {
      if (!rateLimit(`verify:${ip}`, 120, 6e4)) return json(res, 429, { error: "slow down" });
      const body = await readBody(req);
      const { policy, error } = resolvePolicy(body);
      if (!policy) return json(res, 400, { error });
      const receipt = String(body?.receipt ?? "");
      const reader = new NodeReader(body?.payer ? [String(body.payer)] : []);
      const verdict = await verifyPayment(policy, receipt, reader);
      if (url.searchParams.get("forge") === "1" && (DEV_OPEN_CATALOG || ALLOW_FORGE)) {
        const forged = {
          ...verdict,
          granted: true,
          reason: "FORGED BY THE SERVER (demo) -- the page should reject this",
          confirmed: true,
          grant: grantId(policy.id, receipt || "00".repeat(32)),
          receipt: receipt || "00".repeat(32)
        };
        return json(res, 200, { verdict: forged, forged: true });
      }
      return json(res, 200, { verdict });
    }
    if (route === "POST /api/access") {
      const body = await readBody(req);
      const listing = get3(String(body?.policyId ?? ""));
      if (!listing) return json(res, 404, { error: "unknown policy" });
      const receipt = String(body?.receipt ?? "");
      const challenge = String(body?.challenge ?? "");
      const signature = String(body?.signature ?? "");
      if (!challengeValid(challenge)) return json(res, 400, { error: "challenge expired -- request a new one" });
      const reader = new NodeReader(body?.payer ? [String(body.payer)] : []);
      const verdict = await verifyPayment(listing.policy, receipt, reader);
      if (!verdict.granted) return json(res, 402, { error: verdict.reason, verdict });
      const pub = addressToPub(verdict.payer);
      if (!verifyAuth(pub, signature, listing.policy.id, verdict.receipt, challenge)) {
        return json(res, 401, {
          error: "that payment is real, but you did not prove you control the paying account",
          verdict,
          digest: authDigest(listing.policy.id, verdict.receipt, challenge)
        });
      }
      spendChallenge(challenge);
      return json(res, 200, { verdict, unlock: listing.unlock });
    }
    if (route === "GET /api/watch") {
      return json(res, 200, {
        connected: watcher.connected,
        accounts: watcher.watching,
        recent: watcher.since(6e4),
        url: NANO_WS
      });
    }
    if (route === "POST /api/watch") {
      const body = await readBody(req);
      const accounts = (Array.isArray(body?.accounts) ? body.accounts : []).filter(isNanoAddress).slice(0, 20);
      watcher.watch(accounts);
      return json(res, 200, { ok: true, accounts: watcher.watching, connected: watcher.connected });
    }
    return json(res, 404, { error: "no such route", route });
  } catch (e) {
    const ref = crypto2.randomBytes(6).toString("hex");
    console.error(`[${ref}] ${route} failed:`, e);
    return json(res, 500, { error: "something went wrong on this server", ref });
  }
}
var server = http.createServer(handle);
function contentSecurityPolicy() {
  let wsOrigin = "";
  try {
    wsOrigin = new URL(NANO_WS).origin;
  } catch {
  }
  return [
    "default-src 'none'",
    "script-src 'self'",
    "style-src 'self'",
    "img-src 'self' data:",
    "font-src 'self'",
    `connect-src 'self'${wsOrigin ? " " + wsOrigin : ""}`,
    "base-uri 'none'",
    "form-action 'none'",
    "frame-ancestors 'none'"
  ].join("; ");
}
function harden(res) {
  res.setHeader("x-content-type-options", "nosniff");
  res.setHeader("referrer-policy", "no-referrer");
  res.setHeader("x-frame-options", "DENY");
  res.setHeader("cross-origin-opener-policy", "same-origin");
  res.setHeader("cross-origin-resource-policy", "same-origin");
  res.setHeader("permissions-policy", "geolocation=(), microphone=(), camera=(), payment=()");
  if (PUBLIC_BIND) res.setHeader("strict-transport-security", "max-age=31536000");
}
function serveFile(res, file, type) {
  fs4.readFile(file, (err, data) => {
    if (err) {
      res.writeHead(404, { "content-type": "text/plain" });
      return res.end("not found: " + path4.basename(file));
    }
    res.writeHead(200, {
      "content-type": type,
      "cache-control": "no-store",
      "content-security-policy": contentSecurityPolicy()
    });
    res.end(data);
  });
}
var SHUTDOWN_GRACE_MS = WORK_MAX_WAIT_MS + 15e3;
if (false) {
  watcher.watch([MERCHANT, ...list().map((l) => l.policy.merchant)].filter(Boolean));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
  refusePublicIfUnsafe();
  server.listen(PORT, HOST, () => {
    console.log(`holderPay on http://${isLoopback(HOST) ? "localhost" : HOST}:${PORT}`);
    console.log(`  rpc       ${env("NANO_RPC_URL", "https://rpc.nano.to")} (key ${env("NANO_RPC_KEY") ? "loaded" : "MISSING"})`);
    console.log(`  websocket ${NANO_WS}`);
    console.log(`  token     ${TOKEN_ID || "(not launched yet -- run scripts/launch-token.ts)"}`);
    console.log(`  merchant  ${MERCHANT}`);
  });
}

// server/catalog.baked.json
var catalog_baked_default = {
  listings: [
    {
      policy: {
        merchant: "nano_177uaf8ucnokskie7nt5maanp3pqwnmmh8qowoujxi6c48htzyc1zsrcgnxf",
        resource: "course/nano-101",
        title: "Nano 101 \u2014 the full course",
        description: "Pay in TEACHER, or pay in XNO and let the page swap it into TEACHER for the seller. Either way your access is proven by a block, not by our database.",
        accept: [
          {
            tokenId: "cb9b91d6f52deb3541ae3988c42cb78b",
            symbol: "TEACHER",
            decimals: 6,
            price: "1000000"
          }
        ],
        priceXno: "10000000000000000000000000",
        autoswap: true,
        expires: 0,
        v: 2,
        id: "72d84cb8364784eac8db1c4f8a4c2640b03ec3426f2a4c010cc2a56f51a18b54"
      },
      unlock: "Welcome to Nano 101.\n\nLesson 0: the reason you are reading this is not that a server decided you could. It is that two blocks exist on your own account chain -- a payment, and a receipt that commits to this exact offer -- and anyone can check them. Delete our database and your access survives; compromise our server and it still cannot be handed to someone who did not pay.",
      createdAt: 1789127222831
    },
    {
      policy: {
        merchant: "nano_177uaf8ucnokskie7nt5maanp3pqwnmmh8qowoujxi6c48htzyc1zsrcgnxf",
        resource: "seller/teacher-only",
        title: "TEACHER only \u2014 no XNO accepted",
        description: "This seller wants the token and nothing else. XNO payers are auto-swapped on the AMM inside their own wallet; the seller is paid in TEACHER.",
        accept: [
          {
            tokenId: "cb9b91d6f52deb3541ae3988c42cb78b",
            symbol: "TEACHER",
            decimals: 6,
            price: "1000000"
          }
        ],
        autoswap: true,
        expires: 0,
        v: 2,
        id: "0b0bc56a205999a58b1f4b43900a2b04eab1151ceebf60b950e63fa980fe6e78"
      },
      unlock: "Paid in TEACHER. The seller never touched XNO, and you never had to source the token in advance.",
      createdAt: 1789127222836
    },
    {
      policy: {
        merchant: "nano_177uaf8ucnokskie7nt5maanp3pqwnmmh8qowoujxi6c48htzyc1zsrcgnxf",
        resource: "shop/any-token",
        title: "Pay with any token you hold",
        description: "Bring whatever token you have. What it is worth here is its share of REAL collateral -- the earmarked XNO behind it, which somebody had to actually hold -- not the price its own curve quotes. A token launched for three raw that claims to be worth a million cannot buy this, at any quantity.",
        accept: [
          {
            tokenId: "cb9b91d6f52deb3541ae3988c42cb78b",
            symbol: "TEACHER",
            decimals: 6,
            price: "1000000"
          }
        ],
        priceXno: "10000000000000000000000000",
        acceptAny: {
          priceXno: "1000000000000000000000",
          minBacking: "0"
        },
        autoswap: true,
        expires: 0,
        v: 2,
        id: "d3d1ac006e39a0794a373ccf0f147118ae3538ddecb8614f4a6fb856bf2a6a77"
      },
      unlock: "Paid with a token nobody listed in advance.\n\nWhat made it acceptable was not its name, its picture, or the price its own AMM quotes -- all three are free to invent. It was the collateral behind it: earmarked XNO that consensus checks against the signed balance of a real wallet. That is why a token minted for three raw, quoting a million XNO a unit, buys exactly nothing here.",
      createdAt: 1789144384171
    }
  ]
};

// server/tokens.baked.json
var tokens_baked_default = { at: "2026-09-11T17:55:11.343Z", tookMs: 66755, accounts: 58, tokens: [{ tokenId: "4709abf5cf2685b2d0b7305f12856779", symbol: "4709ab", name: "", decimals: 6, supply: "999999887684804", poolXno: "436124556038898537600475495843612", poolTokens: "289148401383602", creator: "nano_1bwt9kgto81mowsi93cgtq73t43a1buerdbgrcasq76z65rturznrny79zg7", holders: 10, direct: true, quotedPrice: "1508306993751312351831005", quotedValue: "1508306824345516720481582946879714", backing: "308419024739129800298088449218758", circulating: "999999887684804", backedPct: 20.448, balance: "0", quotedHoldingValue: "0", backedHoldingValue: "0" }, { tokenId: "b56f256ff88bf377468c1dabda1b9a9e", symbol: "b56f25", name: "", decimals: 6, supply: "100000000000000", poolXno: "11637690936945832339567499891039", poolTokens: "8398671341873", creator: "nano_3sfk41ebrodgt4w411ysybofx6ipnbkm91xk8izhpmxyp8on881qonpknz5d", holders: 4, direct: true, quotedPrice: "1385658571841494851792638", quotedValue: "138565857184149485179263800000000", backing: "10412979644064370067118031800863", circulating: "100000000000000", backedPct: 7.5148, balance: "0", quotedHoldingValue: "0", backedHoldingValue: "0" }, { tokenId: "dc785abdf56742927b59d5789eb0b25c", symbol: "dc785a", name: "", decimals: 6, supply: "1000000000000000", poolXno: "112845974000000000000000000000000", poolTokens: "453584061533624", creator: "nano_3twewtcb4qhjep1dapao4tcc7j4kp74h3tupf5xnio46wp3py4d8ffq8ggy1", holders: 8, direct: true, quotedPrice: "248787344110932289320783", quotedValue: "248787344110932289320783000000000", backing: "10406040247463878339337785564757", circulating: "550000000000000", backedPct: 4.1827, balance: "0", quotedHoldingValue: "0", backedHoldingValue: "0" }, { tokenId: "84d9e78fd93e7c70c8bea00d86120c4c", symbol: "84d9e7", name: "", decimals: 6, supply: "1000000000000000", poolXno: "110000000000000000000000000000000", poolTokens: "888849412584308", creator: "nano_1cexacexqrr51coik9eeqzebmfej7g6chrd1eygmzm9ad86qek84pnhpda1t", holders: 12, direct: true, quotedPrice: "123755496085864175149008", quotedValue: "123755496085864175149008000000000", backing: "7080594332343080795132763834728", circulating: "1000000000000000", backedPct: 5.7214, balance: "0", quotedHoldingValue: "0", backedHoldingValue: "0" }, { tokenId: "28f52bff968e3d84391e0a07f98ec6bd", symbol: "28f52b", name: "", decimals: 6, supply: "399000000000000", poolXno: "9998387646762490174440541076867", poolTokens: "1281247439", creator: "nano_1spr8bbkjrrs5zknm3mkhwqxueqf6jf7173iu9jh5ri7msck55wcwxtg8e9i", holders: 5, direct: true, quotedPrice: "7803635224875942307690763764", quotedValue: "3113650454725500980768614741836000000", backing: "6168882584608523198766651516361", circulating: "19953000000000", backedPct: 1e-4, balance: "0", quotedHoldingValue: "0", backedHoldingValue: "0" }, { tokenId: "8deae33fd67097dd44b940e0e1308ac3", symbol: "8deae3", name: "", decimals: 6, supply: "1000000000000000", poolXno: "4100000000000000000000000000000", poolTokens: "513694999329375", creator: "nano_16pokt5ugh13hcm1bmuakszxxs1ioki6p3i6m458gbo4d9q7qfbktfh1stk5", holders: 2, direct: true, quotedPrice: "7981389745573773344349", quotedValue: "7981389745573773344349000000000", backing: "1912698421099129147341642319800", circulating: "1000000000000000", backedPct: 23.9644, balance: "0", quotedHoldingValue: "0", backedHoldingValue: "0" }, { tokenId: "a0943e91ba202e7298a783de1c468082", symbol: "a0943e", name: "", decimals: 6, supply: "21000000000000", poolXno: "3000000000000000000000000000000", poolTokens: "11922692139389", creator: "nano_314738ebtt9htzs5tx76z1zzurhe7jgwd7ndeoupjfb3kqdrer7im8cr1z8h", holders: 2, direct: true, quotedPrice: "251621023584841170394452", quotedValue: "5284041495281664578283492000000", backing: "1207113964001537572887829279942", circulating: "21000000000000", backedPct: 22.8445, balance: "0", quotedHoldingValue: "0", backedHoldingValue: "0" }, { tokenId: "3eb93c9cf3b8a7d849fade3a54cc0b97", symbol: "3eb93c", name: "", decimals: 6, supply: "1000000000000000", poolXno: "3293664885022464021775310033033", poolTokens: "699926061070661", creator: "nano_3gkbxrzwoqpx7bmtxfao7yju5t1hwsm1bcnmwgp68cj9znce1nisw15acup8", holders: 2, direct: true, quotedPrice: "4705732602646941946543", quotedValue: "4705732602646941946543000000000", backing: "889535558830874687934806287409", circulating: "1000000000000000", backedPct: 18.9032, balance: "0", quotedHoldingValue: "0", backedHoldingValue: "0" }, { tokenId: "a96c4ed6af79a795f68182d051be48e1", symbol: "a96c4e", name: "", decimals: 6, supply: "1000000000000", poolXno: "514787347001397206739442346487", poolTokens: "18703977087", creator: "nano_1iaaroiz9syfy4esw5con61tua3x4qqyip9oshgru5ox1texh5b674nqcfwz", holders: 4, direct: true, quotedPrice: "27522881609986288299575820", quotedValue: "27522881609986288299575820000000", backing: "504601691688230806127098119781", circulating: "1000000000000", backedPct: 1.8333, balance: "0", quotedHoldingValue: "0", backedHoldingValue: "0" }, { tokenId: "6d7e02143109754003a34c14d238dbf0", symbol: "6d7e02", name: "", decimals: 6, supply: "1000000000000000", poolXno: "100100000000000000000000000000000", poolTokens: "949060430174128", creator: "nano_3obz5p4y6tijgxsyp8wowbzr6fppfmu4a99xmmk814cdkqx537j8o9n8wtb4", holders: 1, direct: true, quotedPrice: "105472735789473641275351", quotedValue: "105472735789473641275351000000000", backing: "100000000000000000000000000000", circulating: "1000000000000000", backedPct: 0.0948, balance: "0", quotedHoldingValue: "0", backedHoldingValue: "0" }, { tokenId: "04239330a506f91f37b53166df1e56ec", symbol: "042393", name: "", decimals: 6, supply: "1000000000000", poolXno: "20076852364349241215445246862", poolTokens: "99621022651", creator: "nano_37896e5ah3o9myy378qzgi5dwxps4fu69d9mpucqb3imqkd4yshru5fbkzxm", holders: 3, direct: true, quotedPrice: "201532285355913367850669", quotedValue: "201532285355913367850669000000", backing: "75286660224889601395347779", circulating: "150000000000", backedPct: 0.0373, balance: "0", quotedHoldingValue: "0", backedHoldingValue: "0" }, { tokenId: "78e7ba60509a47475350f2f3c9134445", symbol: "78e7ba", name: "", decimals: 6, supply: "999500000", poolXno: "160027814494293151169168932", poolTokens: "348464459", creator: "nano_1fcbzc7yxqp1zy5ywo8rkq5pzdw8cgnc3hucpsmw6zhx999tfk3nofb5tge4", holders: 4, direct: true, quotedPrice: "459237119772645597607901", quotedValue: "459007501212759274809097049", backing: "45027535699240832275852147", circulating: "550500000", backedPct: 9.8097, balance: "0", quotedHoldingValue: "0", backedHoldingValue: "0" }, { tokenId: "cb9b91d6f52deb3541ae3988c42cb78b", symbol: "cb9b91", name: "", decimals: 6, supply: "1000000000000", poolXno: "10000404056627525180669074381", poolTokens: "99996000000", creator: "nano_37896e5ah3o9myy378qzgi5dwxps4fu69d9mpucqb3imqkd4yshru5fbkzxm", holders: 2, direct: true, quotedPrice: "100008040887910768237420", quotedValue: "100008040887910768237420000000", backing: "100007040777498576763993", circulating: "150000000000", backedPct: 0, balance: "0", quotedHoldingValue: "0", backedHoldingValue: "0" }, { tokenId: "3607cd6ff3a0f4345a2192b67fdc0024", symbol: "3607cd", name: "", decimals: 6, supply: "100000000000000", poolXno: "0", poolTokens: "0", creator: "nano_35tu4kcxfxnxfgxx5p8a7mfxy5ntfaksnf5ocwdh56zmwmksyrdp1iug7bxx", holders: 1, direct: false, quotedPrice: "0", quotedValue: "0", backing: "0", circulating: "5000000000000", backedPct: null, balance: "0", quotedHoldingValue: "0", backedHoldingValue: "0" }, { tokenId: "3bb4966ab2fd0eb47072ce0108f67f8e", symbol: "3bb496", name: "", decimals: 6, supply: "100000000000000", poolXno: "0", poolTokens: "0", creator: "nano_35tu4kcxfxnxfgxx5p8a7mfxy5ntfaksnf5ocwdh56zmwmksyrdp1iug7bxx", holders: 1, direct: false, quotedPrice: "0", quotedValue: "0", backing: "0", circulating: "5000000000000", backedPct: null, balance: "0", quotedHoldingValue: "0", backedHoldingValue: "0" }, { tokenId: "3fd713ab3cb2ce7943f6b849053d4329", symbol: "3fd713", name: "", decimals: 6, supply: "1000000000000", poolXno: "10987289440951996076845", poolTokens: "865422202002", creator: "nano_1z3ryire4dayu63w1ic9qm7dkapu46msaogohu7mq5f8t5z155orbpgccfjn", holders: 1, direct: false, quotedPrice: "12695871928793669", quotedValue: "12695871928793669000000", backing: "0", circulating: "1000000000000", backedPct: 0, balance: "0", quotedHoldingValue: "0", backedHoldingValue: "0" }, { tokenId: "4af130e7da9ee1d80fef8e8cdd2dc282", symbol: "4af130", name: "", decimals: 6, supply: "1000000000000", poolXno: "1000000000000000000000000000000000000", poolTokens: "900000000000", creator: "nano_3fmenhou8hg1q4x6m7mh4qqp7rsgkbfaa7q5a94q7py6i54kafnnemtrydb1", holders: 2, direct: true, quotedPrice: "1111111111111111111111111111111", quotedValue: "1111111111111111111111111111111000000", backing: "0", circulating: "950000000000", backedPct: 0, balance: "0", quotedHoldingValue: "0", backedHoldingValue: "0" }, { tokenId: "5269273a3bda86b0093ecb651b608cdd", symbol: "526927", name: "", decimals: 6, supply: "1000000000000", poolXno: "10987289440951996076845", poolTokens: "865422202002", creator: "nano_1z3ryire4dayu63w1ic9qm7dkapu46msaogohu7mq5f8t5z155orbpgccfjn", holders: 2, direct: false, quotedPrice: "12695871928793669", quotedValue: "12695871928793669000000", backing: "0", circulating: "1000000000000", backedPct: 0, balance: "0", quotedHoldingValue: "0", backedHoldingValue: "0" }, { tokenId: "6e2d2dd2961618a125d095380162c1ff", symbol: "6e2d2d", name: "", decimals: 6, supply: "80376237800000", poolXno: "119364375200218689509251949586", poolTokens: "80376237800000", creator: "nano_1iaaroiz9syfy4esw5con61tua3x4qqyip9oshgru5ox1texh5b674nqcfwz", holders: 0, direct: true, quotedPrice: "1485070444541492205912", quotedValue: "119364375200218689509229477873", backing: "0", circulating: "80376237800000", backedPct: 0, balance: "0", quotedHoldingValue: "0", backedHoldingValue: "0" }, { tokenId: "7a985d9627f7279bd022cb989cecd3d3", symbol: "7a985d", name: "", decimals: 6, supply: "100000000000000", poolXno: "0", poolTokens: "0", creator: "nano_35tu4kcxfxnxfgxx5p8a7mfxy5ntfaksnf5ocwdh56zmwmksyrdp1iug7bxx", holders: 1, direct: false, quotedPrice: "0", quotedValue: "0", backing: "0", circulating: "5000000000000", backedPct: null, balance: "0", quotedHoldingValue: "0", backedHoldingValue: "0" }, { tokenId: "adc44bc37a9b5b46722e4009c3a6f32d", symbol: "adc44b", name: "", decimals: 6, supply: "100000000000000", poolXno: "0", poolTokens: "0", creator: "nano_35tu4kcxfxnxfgxx5p8a7mfxy5ntfaksnf5ocwdh56zmwmksyrdp1iug7bxx", holders: 1, direct: false, quotedPrice: "0", quotedValue: "0", backing: "0", circulating: "5000000000000", backedPct: null, balance: "0", quotedHoldingValue: "0", backedHoldingValue: "0" }, { tokenId: "ca386f29c79f778e31b1c19d7c8125ad", symbol: "ca386f", name: "", decimals: 6, supply: "1000000000000", poolXno: "1000000000000000000000000000000000000", poolTokens: "900000000000", creator: "nano_3fmenhou8hg1q4x6m7mh4qqp7rsgkbfaa7q5a94q7py6i54kafnnemtrydb1", holders: 2, direct: true, quotedPrice: "1111111111111111111111111111111", quotedValue: "1111111111111111111111111111111000000", backing: "0", circulating: "950000000000", backedPct: 0, balance: "0", quotedHoldingValue: "0", backedHoldingValue: "0" }, { tokenId: "cd864f9bb7efcdfcdeb23d8f3d68834d", symbol: "cd864f", name: "", decimals: 6, supply: "999500000", poolXno: "210536802176635630573746259", poolTokens: "23998401", creator: "nano_1fcbzc7yxqp1zy5ywo8rkq5pzdw8cgnc3hucpsmw6zhx999tfk3nofb5tge4", holders: 3, direct: false, quotedPrice: "8772951255237198118897432", quotedValue: "8768564779609579519837983284", backing: "0", circulating: "549500000", backedPct: 0, balance: "0", quotedHoldingValue: "0", backedHoldingValue: "0" }] };

// server/vercel-entry.ts
seedReadOnly(catalog_baked_default?.listings ?? []);
seed(tokens_baked_default?.tokens?.length ? tokens_baked_default : null);
function vercel_entry_default(req, res) {
  return handle(req, res);
}
export {
  vercel_entry_default as default
};
/*! Bundled license information:

nanocurrency/dist/nanocurrency.cjs.js:
  (*!
  * nanocurrency-js v2.5.0: A toolkit for the Nano cryptocurrency.
  * Copyright (c) 2020 Marvin ROGER <dev at marvinroger dot fr>
  * Licensed under GPL-3.0 (https://git.io/vAZsK)
  *)
  (*! *****************************************************************************
  Copyright (c) Microsoft Corporation. All rights reserved.
  Licensed under the Apache License, Version 2.0 (the "License"); you may not use
  this file except in compliance with the License. You may obtain a copy of the
  License at http://www.apache.org/licenses/LICENSE-2.0
  
  THIS CODE IS PROVIDED ON AN *AS IS* BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
  KIND, EITHER EXPRESS OR IMPLIED, INCLUDING WITHOUT LIMITATION ANY IMPLIED
  WARRANTIES OR CONDITIONS OF TITLE, FITNESS FOR A PARTICULAR PURPOSE,
  MERCHANTABLITY OR NON-INFRINGEMENT.
  
  See the Apache Version 2.0 License for specific language governing permissions
  and limitations under the License.
  ***************************************************************************** *)
  (*!
   * nanocurrency-js: A toolkit for the Nano cryptocurrency.
   * Copyright (c) 2019 Marvin ROGER <dev at marvinroger dot fr>
   * Licensed under GPL-3.0 (https://git.io/vAZsK)
   *)
*/
