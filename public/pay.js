var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __commonJS = (cb, mod) => function __require() {
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

// web/.shim/process.js
var process;
var init_process = __esm({
  "web/.shim/process.js"() {
    process = { env: {}, browser: true };
  }
});

// node_modules/base64-js/index.js
var require_base64_js = __commonJS({
  "node_modules/base64-js/index.js"(exports) {
    "use strict";
    init_buffer();
    init_process();
    exports.byteLength = byteLength;
    exports.toByteArray = toByteArray;
    exports.fromByteArray = fromByteArray;
    var lookup = [];
    var revLookup = [];
    var Arr = typeof Uint8Array !== "undefined" ? Uint8Array : Array;
    var code = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    for (i = 0, len = code.length; i < len; ++i) {
      lookup[i] = code[i];
      revLookup[code.charCodeAt(i)] = i;
    }
    var i;
    var len;
    revLookup["-".charCodeAt(0)] = 62;
    revLookup["_".charCodeAt(0)] = 63;
    function getLens(b64) {
      var len2 = b64.length;
      if (len2 % 4 > 0) {
        throw new Error("Invalid string. Length must be a multiple of 4");
      }
      var validLen = b64.indexOf("=");
      if (validLen === -1) validLen = len2;
      var placeHoldersLen = validLen === len2 ? 0 : 4 - validLen % 4;
      return [validLen, placeHoldersLen];
    }
    function byteLength(b64) {
      var lens = getLens(b64);
      var validLen = lens[0];
      var placeHoldersLen = lens[1];
      return (validLen + placeHoldersLen) * 3 / 4 - placeHoldersLen;
    }
    function _byteLength(b64, validLen, placeHoldersLen) {
      return (validLen + placeHoldersLen) * 3 / 4 - placeHoldersLen;
    }
    function toByteArray(b64) {
      var tmp;
      var lens = getLens(b64);
      var validLen = lens[0];
      var placeHoldersLen = lens[1];
      var arr = new Arr(_byteLength(b64, validLen, placeHoldersLen));
      var curByte = 0;
      var len2 = placeHoldersLen > 0 ? validLen - 4 : validLen;
      var i2;
      for (i2 = 0; i2 < len2; i2 += 4) {
        tmp = revLookup[b64.charCodeAt(i2)] << 18 | revLookup[b64.charCodeAt(i2 + 1)] << 12 | revLookup[b64.charCodeAt(i2 + 2)] << 6 | revLookup[b64.charCodeAt(i2 + 3)];
        arr[curByte++] = tmp >> 16 & 255;
        arr[curByte++] = tmp >> 8 & 255;
        arr[curByte++] = tmp & 255;
      }
      if (placeHoldersLen === 2) {
        tmp = revLookup[b64.charCodeAt(i2)] << 2 | revLookup[b64.charCodeAt(i2 + 1)] >> 4;
        arr[curByte++] = tmp & 255;
      }
      if (placeHoldersLen === 1) {
        tmp = revLookup[b64.charCodeAt(i2)] << 10 | revLookup[b64.charCodeAt(i2 + 1)] << 4 | revLookup[b64.charCodeAt(i2 + 2)] >> 2;
        arr[curByte++] = tmp >> 8 & 255;
        arr[curByte++] = tmp & 255;
      }
      return arr;
    }
    function tripletToBase64(num) {
      return lookup[num >> 18 & 63] + lookup[num >> 12 & 63] + lookup[num >> 6 & 63] + lookup[num & 63];
    }
    function encodeChunk(uint8, start, end) {
      var tmp;
      var output = [];
      for (var i2 = start; i2 < end; i2 += 3) {
        tmp = (uint8[i2] << 16 & 16711680) + (uint8[i2 + 1] << 8 & 65280) + (uint8[i2 + 2] & 255);
        output.push(tripletToBase64(tmp));
      }
      return output.join("");
    }
    function fromByteArray(uint8) {
      var tmp;
      var len2 = uint8.length;
      var extraBytes = len2 % 3;
      var parts = [];
      var maxChunkLength = 16383;
      for (var i2 = 0, len22 = len2 - extraBytes; i2 < len22; i2 += maxChunkLength) {
        parts.push(encodeChunk(uint8, i2, i2 + maxChunkLength > len22 ? len22 : i2 + maxChunkLength));
      }
      if (extraBytes === 1) {
        tmp = uint8[len2 - 1];
        parts.push(
          lookup[tmp >> 2] + lookup[tmp << 4 & 63] + "=="
        );
      } else if (extraBytes === 2) {
        tmp = (uint8[len2 - 2] << 8) + uint8[len2 - 1];
        parts.push(
          lookup[tmp >> 10] + lookup[tmp >> 4 & 63] + lookup[tmp << 2 & 63] + "="
        );
      }
      return parts.join("");
    }
  }
});

// node_modules/ieee754/index.js
var require_ieee754 = __commonJS({
  "node_modules/ieee754/index.js"(exports) {
    init_buffer();
    init_process();
    exports.read = function(buffer, offset, isLE, mLen, nBytes) {
      var e2, m2;
      var eLen = nBytes * 8 - mLen - 1;
      var eMax = (1 << eLen) - 1;
      var eBias = eMax >> 1;
      var nBits = -7;
      var i = isLE ? nBytes - 1 : 0;
      var d2 = isLE ? -1 : 1;
      var s2 = buffer[offset + i];
      i += d2;
      e2 = s2 & (1 << -nBits) - 1;
      s2 >>= -nBits;
      nBits += eLen;
      for (; nBits > 0; e2 = e2 * 256 + buffer[offset + i], i += d2, nBits -= 8) {
      }
      m2 = e2 & (1 << -nBits) - 1;
      e2 >>= -nBits;
      nBits += mLen;
      for (; nBits > 0; m2 = m2 * 256 + buffer[offset + i], i += d2, nBits -= 8) {
      }
      if (e2 === 0) {
        e2 = 1 - eBias;
      } else if (e2 === eMax) {
        return m2 ? NaN : (s2 ? -1 : 1) * Infinity;
      } else {
        m2 = m2 + Math.pow(2, mLen);
        e2 = e2 - eBias;
      }
      return (s2 ? -1 : 1) * m2 * Math.pow(2, e2 - mLen);
    };
    exports.write = function(buffer, value, offset, isLE, mLen, nBytes) {
      var e2, m2, c2;
      var eLen = nBytes * 8 - mLen - 1;
      var eMax = (1 << eLen) - 1;
      var eBias = eMax >> 1;
      var rt = mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0;
      var i = isLE ? 0 : nBytes - 1;
      var d2 = isLE ? 1 : -1;
      var s2 = value < 0 || value === 0 && 1 / value < 0 ? 1 : 0;
      value = Math.abs(value);
      if (isNaN(value) || value === Infinity) {
        m2 = isNaN(value) ? 1 : 0;
        e2 = eMax;
      } else {
        e2 = Math.floor(Math.log(value) / Math.LN2);
        if (value * (c2 = Math.pow(2, -e2)) < 1) {
          e2--;
          c2 *= 2;
        }
        if (e2 + eBias >= 1) {
          value += rt / c2;
        } else {
          value += rt * Math.pow(2, 1 - eBias);
        }
        if (value * c2 >= 2) {
          e2++;
          c2 /= 2;
        }
        if (e2 + eBias >= eMax) {
          m2 = 0;
          e2 = eMax;
        } else if (e2 + eBias >= 1) {
          m2 = (value * c2 - 1) * Math.pow(2, mLen);
          e2 = e2 + eBias;
        } else {
          m2 = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen);
          e2 = 0;
        }
      }
      for (; mLen >= 8; buffer[offset + i] = m2 & 255, i += d2, m2 /= 256, mLen -= 8) {
      }
      e2 = e2 << mLen | m2;
      eLen += mLen;
      for (; eLen > 0; buffer[offset + i] = e2 & 255, i += d2, e2 /= 256, eLen -= 8) {
      }
      buffer[offset + i - d2] |= s2 * 128;
    };
  }
});

// node_modules/buffer/index.js
var require_buffer = __commonJS({
  "node_modules/buffer/index.js"(exports) {
    "use strict";
    init_buffer();
    init_process();
    var base64 = require_base64_js();
    var ieee754 = require_ieee754();
    var customInspectSymbol = typeof Symbol === "function" && typeof Symbol["for"] === "function" ? Symbol["for"]("nodejs.util.inspect.custom") : null;
    exports.Buffer = Buffer3;
    exports.SlowBuffer = SlowBuffer;
    exports.INSPECT_MAX_BYTES = 50;
    var K_MAX_LENGTH = 2147483647;
    exports.kMaxLength = K_MAX_LENGTH;
    Buffer3.TYPED_ARRAY_SUPPORT = typedArraySupport();
    if (!Buffer3.TYPED_ARRAY_SUPPORT && typeof console !== "undefined" && typeof console.error === "function") {
      console.error(
        "This browser lacks typed array (Uint8Array) support which is required by `buffer` v5.x. Use `buffer` v4.x if you require old browser support."
      );
    }
    function typedArraySupport() {
      try {
        const arr = new Uint8Array(1);
        const proto = { foo: function() {
          return 42;
        } };
        Object.setPrototypeOf(proto, Uint8Array.prototype);
        Object.setPrototypeOf(arr, proto);
        return arr.foo() === 42;
      } catch (e2) {
        return false;
      }
    }
    Object.defineProperty(Buffer3.prototype, "parent", {
      enumerable: true,
      get: function() {
        if (!Buffer3.isBuffer(this)) return void 0;
        return this.buffer;
      }
    });
    Object.defineProperty(Buffer3.prototype, "offset", {
      enumerable: true,
      get: function() {
        if (!Buffer3.isBuffer(this)) return void 0;
        return this.byteOffset;
      }
    });
    function createBuffer(length) {
      if (length > K_MAX_LENGTH) {
        throw new RangeError('The value "' + length + '" is invalid for option "size"');
      }
      const buf = new Uint8Array(length);
      Object.setPrototypeOf(buf, Buffer3.prototype);
      return buf;
    }
    function Buffer3(arg, encodingOrOffset, length) {
      if (typeof arg === "number") {
        if (typeof encodingOrOffset === "string") {
          throw new TypeError(
            'The "string" argument must be of type string. Received type number'
          );
        }
        return allocUnsafe(arg);
      }
      return from(arg, encodingOrOffset, length);
    }
    Buffer3.poolSize = 8192;
    function from(value, encodingOrOffset, length) {
      if (typeof value === "string") {
        return fromString(value, encodingOrOffset);
      }
      if (ArrayBuffer.isView(value)) {
        return fromArrayView(value);
      }
      if (value == null) {
        throw new TypeError(
          "The first argument must be one of type string, Buffer, ArrayBuffer, Array, or Array-like Object. Received type " + typeof value
        );
      }
      if (isInstance(value, ArrayBuffer) || value && isInstance(value.buffer, ArrayBuffer)) {
        return fromArrayBuffer(value, encodingOrOffset, length);
      }
      if (typeof SharedArrayBuffer !== "undefined" && (isInstance(value, SharedArrayBuffer) || value && isInstance(value.buffer, SharedArrayBuffer))) {
        return fromArrayBuffer(value, encodingOrOffset, length);
      }
      if (typeof value === "number") {
        throw new TypeError(
          'The "value" argument must not be of type number. Received type number'
        );
      }
      const valueOf = value.valueOf && value.valueOf();
      if (valueOf != null && valueOf !== value) {
        return Buffer3.from(valueOf, encodingOrOffset, length);
      }
      const b = fromObject(value);
      if (b) return b;
      if (typeof Symbol !== "undefined" && Symbol.toPrimitive != null && typeof value[Symbol.toPrimitive] === "function") {
        return Buffer3.from(value[Symbol.toPrimitive]("string"), encodingOrOffset, length);
      }
      throw new TypeError(
        "The first argument must be one of type string, Buffer, ArrayBuffer, Array, or Array-like Object. Received type " + typeof value
      );
    }
    Buffer3.from = function(value, encodingOrOffset, length) {
      return from(value, encodingOrOffset, length);
    };
    Object.setPrototypeOf(Buffer3.prototype, Uint8Array.prototype);
    Object.setPrototypeOf(Buffer3, Uint8Array);
    function assertSize(size) {
      if (typeof size !== "number") {
        throw new TypeError('"size" argument must be of type number');
      } else if (size < 0) {
        throw new RangeError('The value "' + size + '" is invalid for option "size"');
      }
    }
    function alloc(size, fill, encoding) {
      assertSize(size);
      if (size <= 0) {
        return createBuffer(size);
      }
      if (fill !== void 0) {
        return typeof encoding === "string" ? createBuffer(size).fill(fill, encoding) : createBuffer(size).fill(fill);
      }
      return createBuffer(size);
    }
    Buffer3.alloc = function(size, fill, encoding) {
      return alloc(size, fill, encoding);
    };
    function allocUnsafe(size) {
      assertSize(size);
      return createBuffer(size < 0 ? 0 : checked(size) | 0);
    }
    Buffer3.allocUnsafe = function(size) {
      return allocUnsafe(size);
    };
    Buffer3.allocUnsafeSlow = function(size) {
      return allocUnsafe(size);
    };
    function fromString(string, encoding) {
      if (typeof encoding !== "string" || encoding === "") {
        encoding = "utf8";
      }
      if (!Buffer3.isEncoding(encoding)) {
        throw new TypeError("Unknown encoding: " + encoding);
      }
      const length = byteLength(string, encoding) | 0;
      let buf = createBuffer(length);
      const actual = buf.write(string, encoding);
      if (actual !== length) {
        buf = buf.slice(0, actual);
      }
      return buf;
    }
    function fromArrayLike(array) {
      const length = array.length < 0 ? 0 : checked(array.length) | 0;
      const buf = createBuffer(length);
      for (let i = 0; i < length; i += 1) {
        buf[i] = array[i] & 255;
      }
      return buf;
    }
    function fromArrayView(arrayView) {
      if (isInstance(arrayView, Uint8Array)) {
        const copy = new Uint8Array(arrayView);
        return fromArrayBuffer(copy.buffer, copy.byteOffset, copy.byteLength);
      }
      return fromArrayLike(arrayView);
    }
    function fromArrayBuffer(array, byteOffset, length) {
      if (byteOffset < 0 || array.byteLength < byteOffset) {
        throw new RangeError('"offset" is outside of buffer bounds');
      }
      if (array.byteLength < byteOffset + (length || 0)) {
        throw new RangeError('"length" is outside of buffer bounds');
      }
      let buf;
      if (byteOffset === void 0 && length === void 0) {
        buf = new Uint8Array(array);
      } else if (length === void 0) {
        buf = new Uint8Array(array, byteOffset);
      } else {
        buf = new Uint8Array(array, byteOffset, length);
      }
      Object.setPrototypeOf(buf, Buffer3.prototype);
      return buf;
    }
    function fromObject(obj) {
      if (Buffer3.isBuffer(obj)) {
        const len = checked(obj.length) | 0;
        const buf = createBuffer(len);
        if (buf.length === 0) {
          return buf;
        }
        obj.copy(buf, 0, 0, len);
        return buf;
      }
      if (obj.length !== void 0) {
        if (typeof obj.length !== "number" || numberIsNaN(obj.length)) {
          return createBuffer(0);
        }
        return fromArrayLike(obj);
      }
      if (obj.type === "Buffer" && Array.isArray(obj.data)) {
        return fromArrayLike(obj.data);
      }
    }
    function checked(length) {
      if (length >= K_MAX_LENGTH) {
        throw new RangeError("Attempt to allocate Buffer larger than maximum size: 0x" + K_MAX_LENGTH.toString(16) + " bytes");
      }
      return length | 0;
    }
    function SlowBuffer(length) {
      if (+length != length) {
        length = 0;
      }
      return Buffer3.alloc(+length);
    }
    Buffer3.isBuffer = function isBuffer(b) {
      return b != null && b._isBuffer === true && b !== Buffer3.prototype;
    };
    Buffer3.compare = function compare2(a2, b) {
      if (isInstance(a2, Uint8Array)) a2 = Buffer3.from(a2, a2.offset, a2.byteLength);
      if (isInstance(b, Uint8Array)) b = Buffer3.from(b, b.offset, b.byteLength);
      if (!Buffer3.isBuffer(a2) || !Buffer3.isBuffer(b)) {
        throw new TypeError(
          'The "buf1", "buf2" arguments must be one of type Buffer or Uint8Array'
        );
      }
      if (a2 === b) return 0;
      let x2 = a2.length;
      let y = b.length;
      for (let i = 0, len = Math.min(x2, y); i < len; ++i) {
        if (a2[i] !== b[i]) {
          x2 = a2[i];
          y = b[i];
          break;
        }
      }
      if (x2 < y) return -1;
      if (y < x2) return 1;
      return 0;
    };
    Buffer3.isEncoding = function isEncoding(encoding) {
      switch (String(encoding).toLowerCase()) {
        case "hex":
        case "utf8":
        case "utf-8":
        case "ascii":
        case "latin1":
        case "binary":
        case "base64":
        case "ucs2":
        case "ucs-2":
        case "utf16le":
        case "utf-16le":
          return true;
        default:
          return false;
      }
    };
    Buffer3.concat = function concat(list, length) {
      if (!Array.isArray(list)) {
        throw new TypeError('"list" argument must be an Array of Buffers');
      }
      if (list.length === 0) {
        return Buffer3.alloc(0);
      }
      let i;
      if (length === void 0) {
        length = 0;
        for (i = 0; i < list.length; ++i) {
          length += list[i].length;
        }
      }
      const buffer = Buffer3.allocUnsafe(length);
      let pos = 0;
      for (i = 0; i < list.length; ++i) {
        let buf = list[i];
        if (isInstance(buf, Uint8Array)) {
          if (pos + buf.length > buffer.length) {
            if (!Buffer3.isBuffer(buf)) buf = Buffer3.from(buf);
            buf.copy(buffer, pos);
          } else {
            Uint8Array.prototype.set.call(
              buffer,
              buf,
              pos
            );
          }
        } else if (!Buffer3.isBuffer(buf)) {
          throw new TypeError('"list" argument must be an Array of Buffers');
        } else {
          buf.copy(buffer, pos);
        }
        pos += buf.length;
      }
      return buffer;
    };
    function byteLength(string, encoding) {
      if (Buffer3.isBuffer(string)) {
        return string.length;
      }
      if (ArrayBuffer.isView(string) || isInstance(string, ArrayBuffer)) {
        return string.byteLength;
      }
      if (typeof string !== "string") {
        throw new TypeError(
          'The "string" argument must be one of type string, Buffer, or ArrayBuffer. Received type ' + typeof string
        );
      }
      const len = string.length;
      const mustMatch = arguments.length > 2 && arguments[2] === true;
      if (!mustMatch && len === 0) return 0;
      let loweredCase = false;
      for (; ; ) {
        switch (encoding) {
          case "ascii":
          case "latin1":
          case "binary":
            return len;
          case "utf8":
          case "utf-8":
            return utf8ToBytes(string).length;
          case "ucs2":
          case "ucs-2":
          case "utf16le":
          case "utf-16le":
            return len * 2;
          case "hex":
            return len >>> 1;
          case "base64":
            return base64ToBytes(string).length;
          default:
            if (loweredCase) {
              return mustMatch ? -1 : utf8ToBytes(string).length;
            }
            encoding = ("" + encoding).toLowerCase();
            loweredCase = true;
        }
      }
    }
    Buffer3.byteLength = byteLength;
    function slowToString(encoding, start, end) {
      let loweredCase = false;
      if (start === void 0 || start < 0) {
        start = 0;
      }
      if (start > this.length) {
        return "";
      }
      if (end === void 0 || end > this.length) {
        end = this.length;
      }
      if (end <= 0) {
        return "";
      }
      end >>>= 0;
      start >>>= 0;
      if (end <= start) {
        return "";
      }
      if (!encoding) encoding = "utf8";
      while (true) {
        switch (encoding) {
          case "hex":
            return hexSlice(this, start, end);
          case "utf8":
          case "utf-8":
            return utf8Slice(this, start, end);
          case "ascii":
            return asciiSlice(this, start, end);
          case "latin1":
          case "binary":
            return latin1Slice(this, start, end);
          case "base64":
            return base64Slice(this, start, end);
          case "ucs2":
          case "ucs-2":
          case "utf16le":
          case "utf-16le":
            return utf16leSlice(this, start, end);
          default:
            if (loweredCase) throw new TypeError("Unknown encoding: " + encoding);
            encoding = (encoding + "").toLowerCase();
            loweredCase = true;
        }
      }
    }
    Buffer3.prototype._isBuffer = true;
    function swap(b, n2, m2) {
      const i = b[n2];
      b[n2] = b[m2];
      b[m2] = i;
    }
    Buffer3.prototype.swap16 = function swap16() {
      const len = this.length;
      if (len % 2 !== 0) {
        throw new RangeError("Buffer size must be a multiple of 16-bits");
      }
      for (let i = 0; i < len; i += 2) {
        swap(this, i, i + 1);
      }
      return this;
    };
    Buffer3.prototype.swap32 = function swap32() {
      const len = this.length;
      if (len % 4 !== 0) {
        throw new RangeError("Buffer size must be a multiple of 32-bits");
      }
      for (let i = 0; i < len; i += 4) {
        swap(this, i, i + 3);
        swap(this, i + 1, i + 2);
      }
      return this;
    };
    Buffer3.prototype.swap64 = function swap64() {
      const len = this.length;
      if (len % 8 !== 0) {
        throw new RangeError("Buffer size must be a multiple of 64-bits");
      }
      for (let i = 0; i < len; i += 8) {
        swap(this, i, i + 7);
        swap(this, i + 1, i + 6);
        swap(this, i + 2, i + 5);
        swap(this, i + 3, i + 4);
      }
      return this;
    };
    Buffer3.prototype.toString = function toString() {
      const length = this.length;
      if (length === 0) return "";
      if (arguments.length === 0) return utf8Slice(this, 0, length);
      return slowToString.apply(this, arguments);
    };
    Buffer3.prototype.toLocaleString = Buffer3.prototype.toString;
    Buffer3.prototype.equals = function equals(b) {
      if (!Buffer3.isBuffer(b)) throw new TypeError("Argument must be a Buffer");
      if (this === b) return true;
      return Buffer3.compare(this, b) === 0;
    };
    Buffer3.prototype.inspect = function inspect() {
      let str = "";
      const max = exports.INSPECT_MAX_BYTES;
      str = this.toString("hex", 0, max).replace(/(.{2})/g, "$1 ").trim();
      if (this.length > max) str += " ... ";
      return "<Buffer " + str + ">";
    };
    if (customInspectSymbol) {
      Buffer3.prototype[customInspectSymbol] = Buffer3.prototype.inspect;
    }
    Buffer3.prototype.compare = function compare2(target, start, end, thisStart, thisEnd) {
      if (isInstance(target, Uint8Array)) {
        target = Buffer3.from(target, target.offset, target.byteLength);
      }
      if (!Buffer3.isBuffer(target)) {
        throw new TypeError(
          'The "target" argument must be one of type Buffer or Uint8Array. Received type ' + typeof target
        );
      }
      if (start === void 0) {
        start = 0;
      }
      if (end === void 0) {
        end = target ? target.length : 0;
      }
      if (thisStart === void 0) {
        thisStart = 0;
      }
      if (thisEnd === void 0) {
        thisEnd = this.length;
      }
      if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) {
        throw new RangeError("out of range index");
      }
      if (thisStart >= thisEnd && start >= end) {
        return 0;
      }
      if (thisStart >= thisEnd) {
        return -1;
      }
      if (start >= end) {
        return 1;
      }
      start >>>= 0;
      end >>>= 0;
      thisStart >>>= 0;
      thisEnd >>>= 0;
      if (this === target) return 0;
      let x2 = thisEnd - thisStart;
      let y = end - start;
      const len = Math.min(x2, y);
      const thisCopy = this.slice(thisStart, thisEnd);
      const targetCopy = target.slice(start, end);
      for (let i = 0; i < len; ++i) {
        if (thisCopy[i] !== targetCopy[i]) {
          x2 = thisCopy[i];
          y = targetCopy[i];
          break;
        }
      }
      if (x2 < y) return -1;
      if (y < x2) return 1;
      return 0;
    };
    function bidirectionalIndexOf(buffer, val, byteOffset, encoding, dir) {
      if (buffer.length === 0) return -1;
      if (typeof byteOffset === "string") {
        encoding = byteOffset;
        byteOffset = 0;
      } else if (byteOffset > 2147483647) {
        byteOffset = 2147483647;
      } else if (byteOffset < -2147483648) {
        byteOffset = -2147483648;
      }
      byteOffset = +byteOffset;
      if (numberIsNaN(byteOffset)) {
        byteOffset = dir ? 0 : buffer.length - 1;
      }
      if (byteOffset < 0) byteOffset = buffer.length + byteOffset;
      if (byteOffset >= buffer.length) {
        if (dir) return -1;
        else byteOffset = buffer.length - 1;
      } else if (byteOffset < 0) {
        if (dir) byteOffset = 0;
        else return -1;
      }
      if (typeof val === "string") {
        val = Buffer3.from(val, encoding);
      }
      if (Buffer3.isBuffer(val)) {
        if (val.length === 0) {
          return -1;
        }
        return arrayIndexOf(buffer, val, byteOffset, encoding, dir);
      } else if (typeof val === "number") {
        val = val & 255;
        if (typeof Uint8Array.prototype.indexOf === "function") {
          if (dir) {
            return Uint8Array.prototype.indexOf.call(buffer, val, byteOffset);
          } else {
            return Uint8Array.prototype.lastIndexOf.call(buffer, val, byteOffset);
          }
        }
        return arrayIndexOf(buffer, [val], byteOffset, encoding, dir);
      }
      throw new TypeError("val must be string, number or Buffer");
    }
    function arrayIndexOf(arr, val, byteOffset, encoding, dir) {
      let indexSize = 1;
      let arrLength = arr.length;
      let valLength = val.length;
      if (encoding !== void 0) {
        encoding = String(encoding).toLowerCase();
        if (encoding === "ucs2" || encoding === "ucs-2" || encoding === "utf16le" || encoding === "utf-16le") {
          if (arr.length < 2 || val.length < 2) {
            return -1;
          }
          indexSize = 2;
          arrLength /= 2;
          valLength /= 2;
          byteOffset /= 2;
        }
      }
      function read2(buf, i2) {
        if (indexSize === 1) {
          return buf[i2];
        } else {
          return buf.readUInt16BE(i2 * indexSize);
        }
      }
      let i;
      if (dir) {
        let foundIndex = -1;
        for (i = byteOffset; i < arrLength; i++) {
          if (read2(arr, i) === read2(val, foundIndex === -1 ? 0 : i - foundIndex)) {
            if (foundIndex === -1) foundIndex = i;
            if (i - foundIndex + 1 === valLength) return foundIndex * indexSize;
          } else {
            if (foundIndex !== -1) i -= i - foundIndex;
            foundIndex = -1;
          }
        }
      } else {
        if (byteOffset + valLength > arrLength) byteOffset = arrLength - valLength;
        for (i = byteOffset; i >= 0; i--) {
          let found = true;
          for (let j2 = 0; j2 < valLength; j2++) {
            if (read2(arr, i + j2) !== read2(val, j2)) {
              found = false;
              break;
            }
          }
          if (found) return i;
        }
      }
      return -1;
    }
    Buffer3.prototype.includes = function includes(val, byteOffset, encoding) {
      return this.indexOf(val, byteOffset, encoding) !== -1;
    };
    Buffer3.prototype.indexOf = function indexOf(val, byteOffset, encoding) {
      return bidirectionalIndexOf(this, val, byteOffset, encoding, true);
    };
    Buffer3.prototype.lastIndexOf = function lastIndexOf(val, byteOffset, encoding) {
      return bidirectionalIndexOf(this, val, byteOffset, encoding, false);
    };
    function hexWrite(buf, string, offset, length) {
      offset = Number(offset) || 0;
      const remaining = buf.length - offset;
      if (!length) {
        length = remaining;
      } else {
        length = Number(length);
        if (length > remaining) {
          length = remaining;
        }
      }
      const strLen = string.length;
      if (length > strLen / 2) {
        length = strLen / 2;
      }
      let i;
      for (i = 0; i < length; ++i) {
        const parsed = parseInt(string.substr(i * 2, 2), 16);
        if (numberIsNaN(parsed)) return i;
        buf[offset + i] = parsed;
      }
      return i;
    }
    function utf8Write(buf, string, offset, length) {
      return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length);
    }
    function asciiWrite(buf, string, offset, length) {
      return blitBuffer(asciiToBytes(string), buf, offset, length);
    }
    function base64Write(buf, string, offset, length) {
      return blitBuffer(base64ToBytes(string), buf, offset, length);
    }
    function ucs2Write(buf, string, offset, length) {
      return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length);
    }
    Buffer3.prototype.write = function write(string, offset, length, encoding) {
      if (offset === void 0) {
        encoding = "utf8";
        length = this.length;
        offset = 0;
      } else if (length === void 0 && typeof offset === "string") {
        encoding = offset;
        length = this.length;
        offset = 0;
      } else if (isFinite(offset)) {
        offset = offset >>> 0;
        if (isFinite(length)) {
          length = length >>> 0;
          if (encoding === void 0) encoding = "utf8";
        } else {
          encoding = length;
          length = void 0;
        }
      } else {
        throw new Error(
          "Buffer.write(string, encoding, offset[, length]) is no longer supported"
        );
      }
      const remaining = this.length - offset;
      if (length === void 0 || length > remaining) length = remaining;
      if (string.length > 0 && (length < 0 || offset < 0) || offset > this.length) {
        throw new RangeError("Attempt to write outside buffer bounds");
      }
      if (!encoding) encoding = "utf8";
      let loweredCase = false;
      for (; ; ) {
        switch (encoding) {
          case "hex":
            return hexWrite(this, string, offset, length);
          case "utf8":
          case "utf-8":
            return utf8Write(this, string, offset, length);
          case "ascii":
          case "latin1":
          case "binary":
            return asciiWrite(this, string, offset, length);
          case "base64":
            return base64Write(this, string, offset, length);
          case "ucs2":
          case "ucs-2":
          case "utf16le":
          case "utf-16le":
            return ucs2Write(this, string, offset, length);
          default:
            if (loweredCase) throw new TypeError("Unknown encoding: " + encoding);
            encoding = ("" + encoding).toLowerCase();
            loweredCase = true;
        }
      }
    };
    Buffer3.prototype.toJSON = function toJSON() {
      return {
        type: "Buffer",
        data: Array.prototype.slice.call(this._arr || this, 0)
      };
    };
    function base64Slice(buf, start, end) {
      if (start === 0 && end === buf.length) {
        return base64.fromByteArray(buf);
      } else {
        return base64.fromByteArray(buf.slice(start, end));
      }
    }
    function utf8Slice(buf, start, end) {
      end = Math.min(buf.length, end);
      const res = [];
      let i = start;
      while (i < end) {
        const firstByte = buf[i];
        let codePoint = null;
        let bytesPerSequence = firstByte > 239 ? 4 : firstByte > 223 ? 3 : firstByte > 191 ? 2 : 1;
        if (i + bytesPerSequence <= end) {
          let secondByte, thirdByte, fourthByte, tempCodePoint;
          switch (bytesPerSequence) {
            case 1:
              if (firstByte < 128) {
                codePoint = firstByte;
              }
              break;
            case 2:
              secondByte = buf[i + 1];
              if ((secondByte & 192) === 128) {
                tempCodePoint = (firstByte & 31) << 6 | secondByte & 63;
                if (tempCodePoint > 127) {
                  codePoint = tempCodePoint;
                }
              }
              break;
            case 3:
              secondByte = buf[i + 1];
              thirdByte = buf[i + 2];
              if ((secondByte & 192) === 128 && (thirdByte & 192) === 128) {
                tempCodePoint = (firstByte & 15) << 12 | (secondByte & 63) << 6 | thirdByte & 63;
                if (tempCodePoint > 2047 && (tempCodePoint < 55296 || tempCodePoint > 57343)) {
                  codePoint = tempCodePoint;
                }
              }
              break;
            case 4:
              secondByte = buf[i + 1];
              thirdByte = buf[i + 2];
              fourthByte = buf[i + 3];
              if ((secondByte & 192) === 128 && (thirdByte & 192) === 128 && (fourthByte & 192) === 128) {
                tempCodePoint = (firstByte & 15) << 18 | (secondByte & 63) << 12 | (thirdByte & 63) << 6 | fourthByte & 63;
                if (tempCodePoint > 65535 && tempCodePoint < 1114112) {
                  codePoint = tempCodePoint;
                }
              }
          }
        }
        if (codePoint === null) {
          codePoint = 65533;
          bytesPerSequence = 1;
        } else if (codePoint > 65535) {
          codePoint -= 65536;
          res.push(codePoint >>> 10 & 1023 | 55296);
          codePoint = 56320 | codePoint & 1023;
        }
        res.push(codePoint);
        i += bytesPerSequence;
      }
      return decodeCodePointsArray(res);
    }
    var MAX_ARGUMENTS_LENGTH = 4096;
    function decodeCodePointsArray(codePoints) {
      const len = codePoints.length;
      if (len <= MAX_ARGUMENTS_LENGTH) {
        return String.fromCharCode.apply(String, codePoints);
      }
      let res = "";
      let i = 0;
      while (i < len) {
        res += String.fromCharCode.apply(
          String,
          codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
        );
      }
      return res;
    }
    function asciiSlice(buf, start, end) {
      let ret = "";
      end = Math.min(buf.length, end);
      for (let i = start; i < end; ++i) {
        ret += String.fromCharCode(buf[i] & 127);
      }
      return ret;
    }
    function latin1Slice(buf, start, end) {
      let ret = "";
      end = Math.min(buf.length, end);
      for (let i = start; i < end; ++i) {
        ret += String.fromCharCode(buf[i]);
      }
      return ret;
    }
    function hexSlice(buf, start, end) {
      const len = buf.length;
      if (!start || start < 0) start = 0;
      if (!end || end < 0 || end > len) end = len;
      let out = "";
      for (let i = start; i < end; ++i) {
        out += hexSliceLookupTable[buf[i]];
      }
      return out;
    }
    function utf16leSlice(buf, start, end) {
      const bytes = buf.slice(start, end);
      let res = "";
      for (let i = 0; i < bytes.length - 1; i += 2) {
        res += String.fromCharCode(bytes[i] + bytes[i + 1] * 256);
      }
      return res;
    }
    Buffer3.prototype.slice = function slice(start, end) {
      const len = this.length;
      start = ~~start;
      end = end === void 0 ? len : ~~end;
      if (start < 0) {
        start += len;
        if (start < 0) start = 0;
      } else if (start > len) {
        start = len;
      }
      if (end < 0) {
        end += len;
        if (end < 0) end = 0;
      } else if (end > len) {
        end = len;
      }
      if (end < start) end = start;
      const newBuf = this.subarray(start, end);
      Object.setPrototypeOf(newBuf, Buffer3.prototype);
      return newBuf;
    };
    function checkOffset(offset, ext, length) {
      if (offset % 1 !== 0 || offset < 0) throw new RangeError("offset is not uint");
      if (offset + ext > length) throw new RangeError("Trying to access beyond buffer length");
    }
    Buffer3.prototype.readUintLE = Buffer3.prototype.readUIntLE = function readUIntLE(offset, byteLength2, noAssert) {
      offset = offset >>> 0;
      byteLength2 = byteLength2 >>> 0;
      if (!noAssert) checkOffset(offset, byteLength2, this.length);
      let val = this[offset];
      let mul = 1;
      let i = 0;
      while (++i < byteLength2 && (mul *= 256)) {
        val += this[offset + i] * mul;
      }
      return val;
    };
    Buffer3.prototype.readUintBE = Buffer3.prototype.readUIntBE = function readUIntBE(offset, byteLength2, noAssert) {
      offset = offset >>> 0;
      byteLength2 = byteLength2 >>> 0;
      if (!noAssert) {
        checkOffset(offset, byteLength2, this.length);
      }
      let val = this[offset + --byteLength2];
      let mul = 1;
      while (byteLength2 > 0 && (mul *= 256)) {
        val += this[offset + --byteLength2] * mul;
      }
      return val;
    };
    Buffer3.prototype.readUint8 = Buffer3.prototype.readUInt8 = function readUInt8(offset, noAssert) {
      offset = offset >>> 0;
      if (!noAssert) checkOffset(offset, 1, this.length);
      return this[offset];
    };
    Buffer3.prototype.readUint16LE = Buffer3.prototype.readUInt16LE = function readUInt16LE(offset, noAssert) {
      offset = offset >>> 0;
      if (!noAssert) checkOffset(offset, 2, this.length);
      return this[offset] | this[offset + 1] << 8;
    };
    Buffer3.prototype.readUint16BE = Buffer3.prototype.readUInt16BE = function readUInt16BE(offset, noAssert) {
      offset = offset >>> 0;
      if (!noAssert) checkOffset(offset, 2, this.length);
      return this[offset] << 8 | this[offset + 1];
    };
    Buffer3.prototype.readUint32LE = Buffer3.prototype.readUInt32LE = function readUInt32LE(offset, noAssert) {
      offset = offset >>> 0;
      if (!noAssert) checkOffset(offset, 4, this.length);
      return (this[offset] | this[offset + 1] << 8 | this[offset + 2] << 16) + this[offset + 3] * 16777216;
    };
    Buffer3.prototype.readUint32BE = Buffer3.prototype.readUInt32BE = function readUInt32BE(offset, noAssert) {
      offset = offset >>> 0;
      if (!noAssert) checkOffset(offset, 4, this.length);
      return this[offset] * 16777216 + (this[offset + 1] << 16 | this[offset + 2] << 8 | this[offset + 3]);
    };
    Buffer3.prototype.readBigUInt64LE = defineBigIntMethod(function readBigUInt64LE(offset) {
      offset = offset >>> 0;
      validateNumber(offset, "offset");
      const first = this[offset];
      const last = this[offset + 7];
      if (first === void 0 || last === void 0) {
        boundsError(offset, this.length - 8);
      }
      const lo = first + this[++offset] * 2 ** 8 + this[++offset] * 2 ** 16 + this[++offset] * 2 ** 24;
      const hi = this[++offset] + this[++offset] * 2 ** 8 + this[++offset] * 2 ** 16 + last * 2 ** 24;
      return BigInt(lo) + (BigInt(hi) << BigInt(32));
    });
    Buffer3.prototype.readBigUInt64BE = defineBigIntMethod(function readBigUInt64BE(offset) {
      offset = offset >>> 0;
      validateNumber(offset, "offset");
      const first = this[offset];
      const last = this[offset + 7];
      if (first === void 0 || last === void 0) {
        boundsError(offset, this.length - 8);
      }
      const hi = first * 2 ** 24 + this[++offset] * 2 ** 16 + this[++offset] * 2 ** 8 + this[++offset];
      const lo = this[++offset] * 2 ** 24 + this[++offset] * 2 ** 16 + this[++offset] * 2 ** 8 + last;
      return (BigInt(hi) << BigInt(32)) + BigInt(lo);
    });
    Buffer3.prototype.readIntLE = function readIntLE(offset, byteLength2, noAssert) {
      offset = offset >>> 0;
      byteLength2 = byteLength2 >>> 0;
      if (!noAssert) checkOffset(offset, byteLength2, this.length);
      let val = this[offset];
      let mul = 1;
      let i = 0;
      while (++i < byteLength2 && (mul *= 256)) {
        val += this[offset + i] * mul;
      }
      mul *= 128;
      if (val >= mul) val -= Math.pow(2, 8 * byteLength2);
      return val;
    };
    Buffer3.prototype.readIntBE = function readIntBE(offset, byteLength2, noAssert) {
      offset = offset >>> 0;
      byteLength2 = byteLength2 >>> 0;
      if (!noAssert) checkOffset(offset, byteLength2, this.length);
      let i = byteLength2;
      let mul = 1;
      let val = this[offset + --i];
      while (i > 0 && (mul *= 256)) {
        val += this[offset + --i] * mul;
      }
      mul *= 128;
      if (val >= mul) val -= Math.pow(2, 8 * byteLength2);
      return val;
    };
    Buffer3.prototype.readInt8 = function readInt8(offset, noAssert) {
      offset = offset >>> 0;
      if (!noAssert) checkOffset(offset, 1, this.length);
      if (!(this[offset] & 128)) return this[offset];
      return (255 - this[offset] + 1) * -1;
    };
    Buffer3.prototype.readInt16LE = function readInt16LE(offset, noAssert) {
      offset = offset >>> 0;
      if (!noAssert) checkOffset(offset, 2, this.length);
      const val = this[offset] | this[offset + 1] << 8;
      return val & 32768 ? val | 4294901760 : val;
    };
    Buffer3.prototype.readInt16BE = function readInt16BE(offset, noAssert) {
      offset = offset >>> 0;
      if (!noAssert) checkOffset(offset, 2, this.length);
      const val = this[offset + 1] | this[offset] << 8;
      return val & 32768 ? val | 4294901760 : val;
    };
    Buffer3.prototype.readInt32LE = function readInt32LE(offset, noAssert) {
      offset = offset >>> 0;
      if (!noAssert) checkOffset(offset, 4, this.length);
      return this[offset] | this[offset + 1] << 8 | this[offset + 2] << 16 | this[offset + 3] << 24;
    };
    Buffer3.prototype.readInt32BE = function readInt32BE(offset, noAssert) {
      offset = offset >>> 0;
      if (!noAssert) checkOffset(offset, 4, this.length);
      return this[offset] << 24 | this[offset + 1] << 16 | this[offset + 2] << 8 | this[offset + 3];
    };
    Buffer3.prototype.readBigInt64LE = defineBigIntMethod(function readBigInt64LE(offset) {
      offset = offset >>> 0;
      validateNumber(offset, "offset");
      const first = this[offset];
      const last = this[offset + 7];
      if (first === void 0 || last === void 0) {
        boundsError(offset, this.length - 8);
      }
      const val = this[offset + 4] + this[offset + 5] * 2 ** 8 + this[offset + 6] * 2 ** 16 + (last << 24);
      return (BigInt(val) << BigInt(32)) + BigInt(first + this[++offset] * 2 ** 8 + this[++offset] * 2 ** 16 + this[++offset] * 2 ** 24);
    });
    Buffer3.prototype.readBigInt64BE = defineBigIntMethod(function readBigInt64BE(offset) {
      offset = offset >>> 0;
      validateNumber(offset, "offset");
      const first = this[offset];
      const last = this[offset + 7];
      if (first === void 0 || last === void 0) {
        boundsError(offset, this.length - 8);
      }
      const val = (first << 24) + // Overflow
      this[++offset] * 2 ** 16 + this[++offset] * 2 ** 8 + this[++offset];
      return (BigInt(val) << BigInt(32)) + BigInt(this[++offset] * 2 ** 24 + this[++offset] * 2 ** 16 + this[++offset] * 2 ** 8 + last);
    });
    Buffer3.prototype.readFloatLE = function readFloatLE(offset, noAssert) {
      offset = offset >>> 0;
      if (!noAssert) checkOffset(offset, 4, this.length);
      return ieee754.read(this, offset, true, 23, 4);
    };
    Buffer3.prototype.readFloatBE = function readFloatBE(offset, noAssert) {
      offset = offset >>> 0;
      if (!noAssert) checkOffset(offset, 4, this.length);
      return ieee754.read(this, offset, false, 23, 4);
    };
    Buffer3.prototype.readDoubleLE = function readDoubleLE(offset, noAssert) {
      offset = offset >>> 0;
      if (!noAssert) checkOffset(offset, 8, this.length);
      return ieee754.read(this, offset, true, 52, 8);
    };
    Buffer3.prototype.readDoubleBE = function readDoubleBE(offset, noAssert) {
      offset = offset >>> 0;
      if (!noAssert) checkOffset(offset, 8, this.length);
      return ieee754.read(this, offset, false, 52, 8);
    };
    function checkInt(buf, value, offset, ext, max, min) {
      if (!Buffer3.isBuffer(buf)) throw new TypeError('"buffer" argument must be a Buffer instance');
      if (value > max || value < min) throw new RangeError('"value" argument is out of bounds');
      if (offset + ext > buf.length) throw new RangeError("Index out of range");
    }
    Buffer3.prototype.writeUintLE = Buffer3.prototype.writeUIntLE = function writeUIntLE(value, offset, byteLength2, noAssert) {
      value = +value;
      offset = offset >>> 0;
      byteLength2 = byteLength2 >>> 0;
      if (!noAssert) {
        const maxBytes = Math.pow(2, 8 * byteLength2) - 1;
        checkInt(this, value, offset, byteLength2, maxBytes, 0);
      }
      let mul = 1;
      let i = 0;
      this[offset] = value & 255;
      while (++i < byteLength2 && (mul *= 256)) {
        this[offset + i] = value / mul & 255;
      }
      return offset + byteLength2;
    };
    Buffer3.prototype.writeUintBE = Buffer3.prototype.writeUIntBE = function writeUIntBE(value, offset, byteLength2, noAssert) {
      value = +value;
      offset = offset >>> 0;
      byteLength2 = byteLength2 >>> 0;
      if (!noAssert) {
        const maxBytes = Math.pow(2, 8 * byteLength2) - 1;
        checkInt(this, value, offset, byteLength2, maxBytes, 0);
      }
      let i = byteLength2 - 1;
      let mul = 1;
      this[offset + i] = value & 255;
      while (--i >= 0 && (mul *= 256)) {
        this[offset + i] = value / mul & 255;
      }
      return offset + byteLength2;
    };
    Buffer3.prototype.writeUint8 = Buffer3.prototype.writeUInt8 = function writeUInt8(value, offset, noAssert) {
      value = +value;
      offset = offset >>> 0;
      if (!noAssert) checkInt(this, value, offset, 1, 255, 0);
      this[offset] = value & 255;
      return offset + 1;
    };
    Buffer3.prototype.writeUint16LE = Buffer3.prototype.writeUInt16LE = function writeUInt16LE(value, offset, noAssert) {
      value = +value;
      offset = offset >>> 0;
      if (!noAssert) checkInt(this, value, offset, 2, 65535, 0);
      this[offset] = value & 255;
      this[offset + 1] = value >>> 8;
      return offset + 2;
    };
    Buffer3.prototype.writeUint16BE = Buffer3.prototype.writeUInt16BE = function writeUInt16BE(value, offset, noAssert) {
      value = +value;
      offset = offset >>> 0;
      if (!noAssert) checkInt(this, value, offset, 2, 65535, 0);
      this[offset] = value >>> 8;
      this[offset + 1] = value & 255;
      return offset + 2;
    };
    Buffer3.prototype.writeUint32LE = Buffer3.prototype.writeUInt32LE = function writeUInt32LE(value, offset, noAssert) {
      value = +value;
      offset = offset >>> 0;
      if (!noAssert) checkInt(this, value, offset, 4, 4294967295, 0);
      this[offset + 3] = value >>> 24;
      this[offset + 2] = value >>> 16;
      this[offset + 1] = value >>> 8;
      this[offset] = value & 255;
      return offset + 4;
    };
    Buffer3.prototype.writeUint32BE = Buffer3.prototype.writeUInt32BE = function writeUInt32BE(value, offset, noAssert) {
      value = +value;
      offset = offset >>> 0;
      if (!noAssert) checkInt(this, value, offset, 4, 4294967295, 0);
      this[offset] = value >>> 24;
      this[offset + 1] = value >>> 16;
      this[offset + 2] = value >>> 8;
      this[offset + 3] = value & 255;
      return offset + 4;
    };
    function wrtBigUInt64LE(buf, value, offset, min, max) {
      checkIntBI(value, min, max, buf, offset, 7);
      let lo = Number(value & BigInt(4294967295));
      buf[offset++] = lo;
      lo = lo >> 8;
      buf[offset++] = lo;
      lo = lo >> 8;
      buf[offset++] = lo;
      lo = lo >> 8;
      buf[offset++] = lo;
      let hi = Number(value >> BigInt(32) & BigInt(4294967295));
      buf[offset++] = hi;
      hi = hi >> 8;
      buf[offset++] = hi;
      hi = hi >> 8;
      buf[offset++] = hi;
      hi = hi >> 8;
      buf[offset++] = hi;
      return offset;
    }
    function wrtBigUInt64BE(buf, value, offset, min, max) {
      checkIntBI(value, min, max, buf, offset, 7);
      let lo = Number(value & BigInt(4294967295));
      buf[offset + 7] = lo;
      lo = lo >> 8;
      buf[offset + 6] = lo;
      lo = lo >> 8;
      buf[offset + 5] = lo;
      lo = lo >> 8;
      buf[offset + 4] = lo;
      let hi = Number(value >> BigInt(32) & BigInt(4294967295));
      buf[offset + 3] = hi;
      hi = hi >> 8;
      buf[offset + 2] = hi;
      hi = hi >> 8;
      buf[offset + 1] = hi;
      hi = hi >> 8;
      buf[offset] = hi;
      return offset + 8;
    }
    Buffer3.prototype.writeBigUInt64LE = defineBigIntMethod(function writeBigUInt64LE(value, offset = 0) {
      return wrtBigUInt64LE(this, value, offset, BigInt(0), BigInt("0xffffffffffffffff"));
    });
    Buffer3.prototype.writeBigUInt64BE = defineBigIntMethod(function writeBigUInt64BE(value, offset = 0) {
      return wrtBigUInt64BE(this, value, offset, BigInt(0), BigInt("0xffffffffffffffff"));
    });
    Buffer3.prototype.writeIntLE = function writeIntLE(value, offset, byteLength2, noAssert) {
      value = +value;
      offset = offset >>> 0;
      if (!noAssert) {
        const limit = Math.pow(2, 8 * byteLength2 - 1);
        checkInt(this, value, offset, byteLength2, limit - 1, -limit);
      }
      let i = 0;
      let mul = 1;
      let sub = 0;
      this[offset] = value & 255;
      while (++i < byteLength2 && (mul *= 256)) {
        if (value < 0 && sub === 0 && this[offset + i - 1] !== 0) {
          sub = 1;
        }
        this[offset + i] = (value / mul >> 0) - sub & 255;
      }
      return offset + byteLength2;
    };
    Buffer3.prototype.writeIntBE = function writeIntBE(value, offset, byteLength2, noAssert) {
      value = +value;
      offset = offset >>> 0;
      if (!noAssert) {
        const limit = Math.pow(2, 8 * byteLength2 - 1);
        checkInt(this, value, offset, byteLength2, limit - 1, -limit);
      }
      let i = byteLength2 - 1;
      let mul = 1;
      let sub = 0;
      this[offset + i] = value & 255;
      while (--i >= 0 && (mul *= 256)) {
        if (value < 0 && sub === 0 && this[offset + i + 1] !== 0) {
          sub = 1;
        }
        this[offset + i] = (value / mul >> 0) - sub & 255;
      }
      return offset + byteLength2;
    };
    Buffer3.prototype.writeInt8 = function writeInt8(value, offset, noAssert) {
      value = +value;
      offset = offset >>> 0;
      if (!noAssert) checkInt(this, value, offset, 1, 127, -128);
      if (value < 0) value = 255 + value + 1;
      this[offset] = value & 255;
      return offset + 1;
    };
    Buffer3.prototype.writeInt16LE = function writeInt16LE(value, offset, noAssert) {
      value = +value;
      offset = offset >>> 0;
      if (!noAssert) checkInt(this, value, offset, 2, 32767, -32768);
      this[offset] = value & 255;
      this[offset + 1] = value >>> 8;
      return offset + 2;
    };
    Buffer3.prototype.writeInt16BE = function writeInt16BE(value, offset, noAssert) {
      value = +value;
      offset = offset >>> 0;
      if (!noAssert) checkInt(this, value, offset, 2, 32767, -32768);
      this[offset] = value >>> 8;
      this[offset + 1] = value & 255;
      return offset + 2;
    };
    Buffer3.prototype.writeInt32LE = function writeInt32LE(value, offset, noAssert) {
      value = +value;
      offset = offset >>> 0;
      if (!noAssert) checkInt(this, value, offset, 4, 2147483647, -2147483648);
      this[offset] = value & 255;
      this[offset + 1] = value >>> 8;
      this[offset + 2] = value >>> 16;
      this[offset + 3] = value >>> 24;
      return offset + 4;
    };
    Buffer3.prototype.writeInt32BE = function writeInt32BE(value, offset, noAssert) {
      value = +value;
      offset = offset >>> 0;
      if (!noAssert) checkInt(this, value, offset, 4, 2147483647, -2147483648);
      if (value < 0) value = 4294967295 + value + 1;
      this[offset] = value >>> 24;
      this[offset + 1] = value >>> 16;
      this[offset + 2] = value >>> 8;
      this[offset + 3] = value & 255;
      return offset + 4;
    };
    Buffer3.prototype.writeBigInt64LE = defineBigIntMethod(function writeBigInt64LE(value, offset = 0) {
      return wrtBigUInt64LE(this, value, offset, -BigInt("0x8000000000000000"), BigInt("0x7fffffffffffffff"));
    });
    Buffer3.prototype.writeBigInt64BE = defineBigIntMethod(function writeBigInt64BE(value, offset = 0) {
      return wrtBigUInt64BE(this, value, offset, -BigInt("0x8000000000000000"), BigInt("0x7fffffffffffffff"));
    });
    function checkIEEE754(buf, value, offset, ext, max, min) {
      if (offset + ext > buf.length) throw new RangeError("Index out of range");
      if (offset < 0) throw new RangeError("Index out of range");
    }
    function writeFloat(buf, value, offset, littleEndian, noAssert) {
      value = +value;
      offset = offset >>> 0;
      if (!noAssert) {
        checkIEEE754(buf, value, offset, 4, 34028234663852886e22, -34028234663852886e22);
      }
      ieee754.write(buf, value, offset, littleEndian, 23, 4);
      return offset + 4;
    }
    Buffer3.prototype.writeFloatLE = function writeFloatLE(value, offset, noAssert) {
      return writeFloat(this, value, offset, true, noAssert);
    };
    Buffer3.prototype.writeFloatBE = function writeFloatBE(value, offset, noAssert) {
      return writeFloat(this, value, offset, false, noAssert);
    };
    function writeDouble(buf, value, offset, littleEndian, noAssert) {
      value = +value;
      offset = offset >>> 0;
      if (!noAssert) {
        checkIEEE754(buf, value, offset, 8, 17976931348623157e292, -17976931348623157e292);
      }
      ieee754.write(buf, value, offset, littleEndian, 52, 8);
      return offset + 8;
    }
    Buffer3.prototype.writeDoubleLE = function writeDoubleLE(value, offset, noAssert) {
      return writeDouble(this, value, offset, true, noAssert);
    };
    Buffer3.prototype.writeDoubleBE = function writeDoubleBE(value, offset, noAssert) {
      return writeDouble(this, value, offset, false, noAssert);
    };
    Buffer3.prototype.copy = function copy(target, targetStart, start, end) {
      if (!Buffer3.isBuffer(target)) throw new TypeError("argument should be a Buffer");
      if (!start) start = 0;
      if (!end && end !== 0) end = this.length;
      if (targetStart >= target.length) targetStart = target.length;
      if (!targetStart) targetStart = 0;
      if (end > 0 && end < start) end = start;
      if (end === start) return 0;
      if (target.length === 0 || this.length === 0) return 0;
      if (targetStart < 0) {
        throw new RangeError("targetStart out of bounds");
      }
      if (start < 0 || start >= this.length) throw new RangeError("Index out of range");
      if (end < 0) throw new RangeError("sourceEnd out of bounds");
      if (end > this.length) end = this.length;
      if (target.length - targetStart < end - start) {
        end = target.length - targetStart + start;
      }
      const len = end - start;
      if (this === target && typeof Uint8Array.prototype.copyWithin === "function") {
        this.copyWithin(targetStart, start, end);
      } else {
        Uint8Array.prototype.set.call(
          target,
          this.subarray(start, end),
          targetStart
        );
      }
      return len;
    };
    Buffer3.prototype.fill = function fill(val, start, end, encoding) {
      if (typeof val === "string") {
        if (typeof start === "string") {
          encoding = start;
          start = 0;
          end = this.length;
        } else if (typeof end === "string") {
          encoding = end;
          end = this.length;
        }
        if (encoding !== void 0 && typeof encoding !== "string") {
          throw new TypeError("encoding must be a string");
        }
        if (typeof encoding === "string" && !Buffer3.isEncoding(encoding)) {
          throw new TypeError("Unknown encoding: " + encoding);
        }
        if (val.length === 1) {
          const code = val.charCodeAt(0);
          if (encoding === "utf8" && code < 128 || encoding === "latin1") {
            val = code;
          }
        }
      } else if (typeof val === "number") {
        val = val & 255;
      } else if (typeof val === "boolean") {
        val = Number(val);
      }
      if (start < 0 || this.length < start || this.length < end) {
        throw new RangeError("Out of range index");
      }
      if (end <= start) {
        return this;
      }
      start = start >>> 0;
      end = end === void 0 ? this.length : end >>> 0;
      if (!val) val = 0;
      let i;
      if (typeof val === "number") {
        for (i = start; i < end; ++i) {
          this[i] = val;
        }
      } else {
        const bytes = Buffer3.isBuffer(val) ? val : Buffer3.from(val, encoding);
        const len = bytes.length;
        if (len === 0) {
          throw new TypeError('The value "' + val + '" is invalid for argument "value"');
        }
        for (i = 0; i < end - start; ++i) {
          this[i + start] = bytes[i % len];
        }
      }
      return this;
    };
    var errors = {};
    function E2(sym, getMessage, Base) {
      errors[sym] = class NodeError extends Base {
        constructor() {
          super();
          Object.defineProperty(this, "message", {
            value: getMessage.apply(this, arguments),
            writable: true,
            configurable: true
          });
          this.name = `${this.name} [${sym}]`;
          this.stack;
          delete this.name;
        }
        get code() {
          return sym;
        }
        set code(value) {
          Object.defineProperty(this, "code", {
            configurable: true,
            enumerable: true,
            value,
            writable: true
          });
        }
        toString() {
          return `${this.name} [${sym}]: ${this.message}`;
        }
      };
    }
    E2(
      "ERR_BUFFER_OUT_OF_BOUNDS",
      function(name) {
        if (name) {
          return `${name} is outside of buffer bounds`;
        }
        return "Attempt to access memory outside buffer bounds";
      },
      RangeError
    );
    E2(
      "ERR_INVALID_ARG_TYPE",
      function(name, actual) {
        return `The "${name}" argument must be of type number. Received type ${typeof actual}`;
      },
      TypeError
    );
    E2(
      "ERR_OUT_OF_RANGE",
      function(str, range, input) {
        let msg = `The value of "${str}" is out of range.`;
        let received = input;
        if (Number.isInteger(input) && Math.abs(input) > 2 ** 32) {
          received = addNumericalSeparator(String(input));
        } else if (typeof input === "bigint") {
          received = String(input);
          if (input > BigInt(2) ** BigInt(32) || input < -(BigInt(2) ** BigInt(32))) {
            received = addNumericalSeparator(received);
          }
          received += "n";
        }
        msg += ` It must be ${range}. Received ${received}`;
        return msg;
      },
      RangeError
    );
    function addNumericalSeparator(val) {
      let res = "";
      let i = val.length;
      const start = val[0] === "-" ? 1 : 0;
      for (; i >= start + 4; i -= 3) {
        res = `_${val.slice(i - 3, i)}${res}`;
      }
      return `${val.slice(0, i)}${res}`;
    }
    function checkBounds(buf, offset, byteLength2) {
      validateNumber(offset, "offset");
      if (buf[offset] === void 0 || buf[offset + byteLength2] === void 0) {
        boundsError(offset, buf.length - (byteLength2 + 1));
      }
    }
    function checkIntBI(value, min, max, buf, offset, byteLength2) {
      if (value > max || value < min) {
        const n2 = typeof min === "bigint" ? "n" : "";
        let range;
        if (byteLength2 > 3) {
          if (min === 0 || min === BigInt(0)) {
            range = `>= 0${n2} and < 2${n2} ** ${(byteLength2 + 1) * 8}${n2}`;
          } else {
            range = `>= -(2${n2} ** ${(byteLength2 + 1) * 8 - 1}${n2}) and < 2 ** ${(byteLength2 + 1) * 8 - 1}${n2}`;
          }
        } else {
          range = `>= ${min}${n2} and <= ${max}${n2}`;
        }
        throw new errors.ERR_OUT_OF_RANGE("value", range, value);
      }
      checkBounds(buf, offset, byteLength2);
    }
    function validateNumber(value, name) {
      if (typeof value !== "number") {
        throw new errors.ERR_INVALID_ARG_TYPE(name, "number", value);
      }
    }
    function boundsError(value, length, type) {
      if (Math.floor(value) !== value) {
        validateNumber(value, type);
        throw new errors.ERR_OUT_OF_RANGE(type || "offset", "an integer", value);
      }
      if (length < 0) {
        throw new errors.ERR_BUFFER_OUT_OF_BOUNDS();
      }
      throw new errors.ERR_OUT_OF_RANGE(
        type || "offset",
        `>= ${type ? 1 : 0} and <= ${length}`,
        value
      );
    }
    var INVALID_BASE64_RE = /[^+/0-9A-Za-z-_]/g;
    function base64clean(str) {
      str = str.split("=")[0];
      str = str.trim().replace(INVALID_BASE64_RE, "");
      if (str.length < 2) return "";
      while (str.length % 4 !== 0) {
        str = str + "=";
      }
      return str;
    }
    function utf8ToBytes(string, units) {
      units = units || Infinity;
      let codePoint;
      const length = string.length;
      let leadSurrogate = null;
      const bytes = [];
      for (let i = 0; i < length; ++i) {
        codePoint = string.charCodeAt(i);
        if (codePoint > 55295 && codePoint < 57344) {
          if (!leadSurrogate) {
            if (codePoint > 56319) {
              if ((units -= 3) > -1) bytes.push(239, 191, 189);
              continue;
            } else if (i + 1 === length) {
              if ((units -= 3) > -1) bytes.push(239, 191, 189);
              continue;
            }
            leadSurrogate = codePoint;
            continue;
          }
          if (codePoint < 56320) {
            if ((units -= 3) > -1) bytes.push(239, 191, 189);
            leadSurrogate = codePoint;
            continue;
          }
          codePoint = (leadSurrogate - 55296 << 10 | codePoint - 56320) + 65536;
        } else if (leadSurrogate) {
          if ((units -= 3) > -1) bytes.push(239, 191, 189);
        }
        leadSurrogate = null;
        if (codePoint < 128) {
          if ((units -= 1) < 0) break;
          bytes.push(codePoint);
        } else if (codePoint < 2048) {
          if ((units -= 2) < 0) break;
          bytes.push(
            codePoint >> 6 | 192,
            codePoint & 63 | 128
          );
        } else if (codePoint < 65536) {
          if ((units -= 3) < 0) break;
          bytes.push(
            codePoint >> 12 | 224,
            codePoint >> 6 & 63 | 128,
            codePoint & 63 | 128
          );
        } else if (codePoint < 1114112) {
          if ((units -= 4) < 0) break;
          bytes.push(
            codePoint >> 18 | 240,
            codePoint >> 12 & 63 | 128,
            codePoint >> 6 & 63 | 128,
            codePoint & 63 | 128
          );
        } else {
          throw new Error("Invalid code point");
        }
      }
      return bytes;
    }
    function asciiToBytes(str) {
      const byteArray = [];
      for (let i = 0; i < str.length; ++i) {
        byteArray.push(str.charCodeAt(i) & 255);
      }
      return byteArray;
    }
    function utf16leToBytes(str, units) {
      let c2, hi, lo;
      const byteArray = [];
      for (let i = 0; i < str.length; ++i) {
        if ((units -= 2) < 0) break;
        c2 = str.charCodeAt(i);
        hi = c2 >> 8;
        lo = c2 % 256;
        byteArray.push(lo);
        byteArray.push(hi);
      }
      return byteArray;
    }
    function base64ToBytes(str) {
      return base64.toByteArray(base64clean(str));
    }
    function blitBuffer(src, dst, offset, length) {
      let i;
      for (i = 0; i < length; ++i) {
        if (i + offset >= dst.length || i >= src.length) break;
        dst[i + offset] = src[i];
      }
      return i;
    }
    function isInstance(obj, type) {
      return obj instanceof type || obj != null && obj.constructor != null && obj.constructor.name != null && obj.constructor.name === type.name;
    }
    function numberIsNaN(obj) {
      return obj !== obj;
    }
    var hexSliceLookupTable = (function() {
      const alphabet = "0123456789abcdef";
      const table = new Array(256);
      for (let i = 0; i < 16; ++i) {
        const i16 = i * 16;
        for (let j2 = 0; j2 < 16; ++j2) {
          table[i16 + j2] = alphabet[i] + alphabet[j2];
        }
      }
      return table;
    })();
    function defineBigIntMethod(fn) {
      return typeof BigInt === "undefined" ? BufferBigIntNotDefined : fn;
    }
    function BufferBigIntNotDefined() {
      throw new Error("BigInt not supported");
    }
  }
});

// web/.shim/buffer.js
var import_buffer;
var init_buffer = __esm({
  "web/.shim/buffer.js"() {
    import_buffer = __toESM(require_buffer(), 1);
  }
});

// (disabled):fs
var require_fs = __commonJS({
  "(disabled):fs"() {
    init_buffer();
    init_process();
  }
});

// (disabled):path
var require_path = __commonJS({
  "(disabled):path"() {
    init_buffer();
    init_process();
  }
});

// node_modules/blakejs/util.js
var require_util = __commonJS({
  "node_modules/blakejs/util.js"(exports, module) {
    init_buffer();
    init_process();
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
      return Array.prototype.map.call(bytes, function(n2) {
        return (n2 < 16 ? "0" : "") + n2.toString(16);
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
    function testSpeed(hashFn, N2, M) {
      let startMs = (/* @__PURE__ */ new Date()).getTime();
      const input = new Uint8Array(N2);
      for (let i = 0; i < N2; i++) {
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
          Math.round(N2 / (1 << 20) / (ms / 1e3) * 100) / 100 + " MB PER SECOND"
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
    init_buffer();
    init_process();
    var util = require_util();
    function ADD64AA(v3, a2, b) {
      const o0 = v3[a2] + v3[b];
      let o1 = v3[a2 + 1] + v3[b + 1];
      if (o0 >= 4294967296) {
        o1++;
      }
      v3[a2] = o0;
      v3[a2 + 1] = o1;
    }
    function ADD64AC(v3, a2, b0, b1) {
      let o0 = v3[a2] + b0;
      if (b0 < 0) {
        o0 += 4294967296;
      }
      let o1 = v3[a2 + 1] + b1;
      if (o0 >= 4294967296) {
        o1++;
      }
      v3[a2] = o0;
      v3[a2 + 1] = o1;
    }
    function B2B_GET32(arr, i) {
      return arr[i] ^ arr[i + 1] << 8 ^ arr[i + 2] << 16 ^ arr[i + 3] << 24;
    }
    function B2B_G(a2, b, c2, d2, ix, iy) {
      const x0 = m2[ix];
      const x1 = m2[ix + 1];
      const y0 = m2[iy];
      const y1 = m2[iy + 1];
      ADD64AA(v2, a2, b);
      ADD64AC(v2, a2, x0, x1);
      let xor0 = v2[d2] ^ v2[a2];
      let xor1 = v2[d2 + 1] ^ v2[a2 + 1];
      v2[d2] = xor1;
      v2[d2 + 1] = xor0;
      ADD64AA(v2, c2, d2);
      xor0 = v2[b] ^ v2[c2];
      xor1 = v2[b + 1] ^ v2[c2 + 1];
      v2[b] = xor0 >>> 24 ^ xor1 << 8;
      v2[b + 1] = xor1 >>> 24 ^ xor0 << 8;
      ADD64AA(v2, a2, b);
      ADD64AC(v2, a2, y0, y1);
      xor0 = v2[d2] ^ v2[a2];
      xor1 = v2[d2 + 1] ^ v2[a2 + 1];
      v2[d2] = xor0 >>> 16 ^ xor1 << 16;
      v2[d2 + 1] = xor1 >>> 16 ^ xor0 << 16;
      ADD64AA(v2, c2, d2);
      xor0 = v2[b] ^ v2[c2];
      xor1 = v2[b + 1] ^ v2[c2 + 1];
      v2[b] = xor1 >>> 31 ^ xor0 << 1;
      v2[b + 1] = xor0 >>> 31 ^ xor1 << 1;
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
      SIGMA8.map(function(x2) {
        return x2 * 2;
      })
    );
    var v2 = new Uint32Array(32);
    var m2 = new Uint32Array(32);
    function blake2bCompress(ctx, last) {
      let i = 0;
      for (i = 0; i < 16; i++) {
        v2[i] = ctx.h[i];
        v2[i + 16] = BLAKE2B_IV32[i];
      }
      v2[24] = v2[24] ^ ctx.t;
      v2[25] = v2[25] ^ ctx.t / 4294967296;
      if (last) {
        v2[28] = ~v2[28];
        v2[29] = ~v2[29];
      }
      for (i = 0; i < 32; i++) {
        m2[i] = B2B_GET32(ctx.b, 4 * i);
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
        ctx.h[i] = ctx.h[i] ^ v2[i] ^ v2[i + 16];
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
    function blake2b(input, key, outlen, salt, personal) {
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
      const output = blake2b(input, key, outlen, salt, personal);
      return util.toHex(output);
    }
    module.exports = {
      blake2b,
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
    init_buffer();
    init_process();
    var util = require_util();
    function B2S_GET32(v3, i) {
      return v3[i] ^ v3[i + 1] << 8 ^ v3[i + 2] << 16 ^ v3[i + 3] << 24;
    }
    function B2S_G(a2, b, c2, d2, x2, y) {
      v2[a2] = v2[a2] + v2[b] + x2;
      v2[d2] = ROTR32(v2[d2] ^ v2[a2], 16);
      v2[c2] = v2[c2] + v2[d2];
      v2[b] = ROTR32(v2[b] ^ v2[c2], 12);
      v2[a2] = v2[a2] + v2[b] + y;
      v2[d2] = ROTR32(v2[d2] ^ v2[a2], 8);
      v2[c2] = v2[c2] + v2[d2];
      v2[b] = ROTR32(v2[b] ^ v2[c2], 7);
    }
    function ROTR32(x2, y) {
      return x2 >>> y ^ x2 << 32 - y;
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
    var v2 = new Uint32Array(16);
    var m2 = new Uint32Array(16);
    function blake2sCompress(ctx, last) {
      let i = 0;
      for (i = 0; i < 8; i++) {
        v2[i] = ctx.h[i];
        v2[i + 8] = BLAKE2S_IV[i];
      }
      v2[12] ^= ctx.t;
      v2[13] ^= ctx.t / 4294967296;
      if (last) {
        v2[14] = ~v2[14];
      }
      for (i = 0; i < 16; i++) {
        m2[i] = B2S_GET32(ctx.b, 4 * i);
      }
      for (i = 0; i < 10; i++) {
        B2S_G(0, 4, 8, 12, m2[SIGMA[i * 16 + 0]], m2[SIGMA[i * 16 + 1]]);
        B2S_G(1, 5, 9, 13, m2[SIGMA[i * 16 + 2]], m2[SIGMA[i * 16 + 3]]);
        B2S_G(2, 6, 10, 14, m2[SIGMA[i * 16 + 4]], m2[SIGMA[i * 16 + 5]]);
        B2S_G(3, 7, 11, 15, m2[SIGMA[i * 16 + 6]], m2[SIGMA[i * 16 + 7]]);
        B2S_G(0, 5, 10, 15, m2[SIGMA[i * 16 + 8]], m2[SIGMA[i * 16 + 9]]);
        B2S_G(1, 6, 11, 12, m2[SIGMA[i * 16 + 10]], m2[SIGMA[i * 16 + 11]]);
        B2S_G(2, 7, 8, 13, m2[SIGMA[i * 16 + 12]], m2[SIGMA[i * 16 + 13]]);
        B2S_G(3, 4, 9, 14, m2[SIGMA[i * 16 + 14]], m2[SIGMA[i * 16 + 15]]);
      }
      for (i = 0; i < 8; i++) {
        ctx.h[i] ^= v2[i] ^ v2[i + 8];
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
    init_buffer();
    init_process();
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

// (disabled):util
var require_util2 = __commonJS({
  "(disabled):util"() {
    init_buffer();
    init_process();
  }
});

// (disabled):crypto
var require_crypto = __commonJS({
  "(disabled):crypto"() {
    init_buffer();
    init_process();
  }
});

// web/app.ts
init_buffer();
init_process();

// node_modules/nanocurrency/dist/nanocurrency.esm.js
init_buffer();
init_process();
var import_fs = __toESM(require_fs());
var import_path = __toESM(require_path());

// node_modules/bignumber.js/bignumber.mjs
init_buffer();
init_process();
var isNumeric = /^-?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i;
var mathceil = Math.ceil;
var mathfloor = Math.floor;
var bignumberError = "[BigNumber Error] ";
var tooManyDigits = bignumberError + "Number primitive has more than 15 significant digits: ";
var BASE = 1e14;
var LOG_BASE = 14;
var MAX_SAFE_INTEGER = 9007199254740991;
var POWS_TEN = [1, 10, 100, 1e3, 1e4, 1e5, 1e6, 1e7, 1e8, 1e9, 1e10, 1e11, 1e12, 1e13];
var SQRT_BASE = 1e7;
var MAX = 1e9;
function clone(configObject) {
  var div, convertBase, parseNumeric, P2 = BigNumber2.prototype = { constructor: BigNumber2, toString: null, valueOf: null }, ONE = new BigNumber2(1), DECIMAL_PLACES = 20, ROUNDING_MODE = 4, TO_EXP_NEG = -7, TO_EXP_POS = 21, MIN_EXP = -1e7, MAX_EXP = 1e7, CRYPTO = false, MODULO_MODE = 1, POW_PRECISION = 0, FORMAT = {
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
  function BigNumber2(v2, b) {
    var alphabet, c2, caseChanged, e2, i, isNum, len, str, x2 = this;
    if (!(x2 instanceof BigNumber2)) return new BigNumber2(v2, b);
    if (b == null) {
      if (v2 && v2._isBigNumber === true) {
        x2.s = v2.s;
        if (!v2.c || v2.e > MAX_EXP) {
          x2.c = x2.e = null;
        } else if (v2.e < MIN_EXP) {
          x2.c = [x2.e = 0];
        } else {
          x2.e = v2.e;
          x2.c = v2.c.slice();
        }
        return;
      }
      if ((isNum = typeof v2 == "number") && v2 * 0 == 0) {
        x2.s = 1 / v2 < 0 ? (v2 = -v2, -1) : 1;
        if (v2 === ~~v2) {
          for (e2 = 0, i = v2; i >= 10; i /= 10, e2++) ;
          if (e2 > MAX_EXP) {
            x2.c = x2.e = null;
          } else {
            x2.e = e2;
            x2.c = [v2];
          }
          return;
        }
        str = String(v2);
      } else {
        if (!isNumeric.test(str = String(v2))) return parseNumeric(x2, str, isNum);
        x2.s = str.charCodeAt(0) == 45 ? (str = str.slice(1), -1) : 1;
      }
      if ((e2 = str.indexOf(".")) > -1) str = str.replace(".", "");
      if ((i = str.search(/e/i)) > 0) {
        if (e2 < 0) e2 = i;
        e2 += +str.slice(i + 1);
        str = str.substring(0, i);
      } else if (e2 < 0) {
        e2 = str.length;
      }
    } else {
      intCheck(b, 2, ALPHABET.length, "Base");
      if (b == 10 && alphabetHasNormalDecimalDigits) {
        x2 = new BigNumber2(v2);
        return round(x2, DECIMAL_PLACES + x2.e + 1, ROUNDING_MODE);
      }
      str = String(v2);
      if (isNum = typeof v2 == "number") {
        if (v2 * 0 != 0) return parseNumeric(x2, str, isNum, b);
        x2.s = 1 / v2 < 0 ? (str = str.slice(1), -1) : 1;
        if (BigNumber2.DEBUG && str.replace(/^0\.0*|\./, "").length > 15) {
          throw Error(tooManyDigits + v2);
        }
      } else {
        x2.s = str.charCodeAt(0) === 45 ? (str = str.slice(1), -1) : 1;
      }
      alphabet = ALPHABET.slice(0, b);
      e2 = i = 0;
      for (len = str.length; i < len; i++) {
        if (alphabet.indexOf(c2 = str.charAt(i)) < 0) {
          if (c2 == ".") {
            if (i > e2) {
              e2 = len;
              continue;
            }
          } else if (!caseChanged) {
            if (str == str.toUpperCase() && (str = str.toLowerCase()) || str == str.toLowerCase() && (str = str.toUpperCase())) {
              caseChanged = true;
              i = -1;
              e2 = 0;
              continue;
            }
          }
          return parseNumeric(x2, String(v2), isNum, b);
        }
      }
      isNum = false;
      str = convertBase(str, b, 10, x2.s);
      if ((e2 = str.indexOf(".")) > -1) str = str.replace(".", "");
      else e2 = str.length;
    }
    for (i = 0; str.charCodeAt(i) === 48; i++) ;
    for (len = str.length; str.charCodeAt(--len) === 48; ) ;
    if (str = str.slice(i, ++len)) {
      len -= i;
      if (isNum && BigNumber2.DEBUG && len > 15 && (v2 > MAX_SAFE_INTEGER || v2 !== mathfloor(v2))) {
        throw Error(tooManyDigits + x2.s * v2);
      }
      if ((e2 = e2 - i - 1) > MAX_EXP) {
        x2.c = x2.e = null;
      } else if (e2 < MIN_EXP) {
        x2.c = [x2.e = 0];
      } else {
        x2.e = e2;
        x2.c = [];
        i = (e2 + 1) % LOG_BASE;
        if (e2 < 0) i += LOG_BASE;
        if (i < len) {
          if (i) x2.c.push(+str.slice(0, i));
          for (len -= LOG_BASE; i < len; ) {
            x2.c.push(+str.slice(i, i += LOG_BASE));
          }
          i = LOG_BASE - (str = str.slice(i)).length;
        } else {
          i -= len;
        }
        for (; i--; str += "0") ;
        x2.c.push(+str);
      }
    } else {
      x2.c = [x2.e = 0];
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
    var p, v2;
    if (obj != null) {
      if (typeof obj == "object") {
        if (obj.hasOwnProperty(p = "DECIMAL_PLACES")) {
          v2 = obj[p];
          intCheck(v2, 0, MAX, p);
          DECIMAL_PLACES = v2;
        }
        if (obj.hasOwnProperty(p = "ROUNDING_MODE")) {
          v2 = obj[p];
          intCheck(v2, 0, 8, p);
          ROUNDING_MODE = v2;
        }
        if (obj.hasOwnProperty(p = "EXPONENTIAL_AT")) {
          v2 = obj[p];
          if (v2 && v2.pop) {
            intCheck(v2[0], -MAX, 0, p);
            intCheck(v2[1], 0, MAX, p);
            TO_EXP_NEG = v2[0];
            TO_EXP_POS = v2[1];
          } else {
            intCheck(v2, -MAX, MAX, p);
            TO_EXP_NEG = -(TO_EXP_POS = v2 < 0 ? -v2 : v2);
          }
        }
        if (obj.hasOwnProperty(p = "RANGE")) {
          v2 = obj[p];
          if (v2 && v2.pop) {
            intCheck(v2[0], -MAX, -1, p);
            intCheck(v2[1], 1, MAX, p);
            MIN_EXP = v2[0];
            MAX_EXP = v2[1];
          } else {
            intCheck(v2, -MAX, MAX, p);
            if (v2) {
              MIN_EXP = -(MAX_EXP = v2 < 0 ? -v2 : v2);
            } else {
              throw Error(bignumberError + p + " cannot be zero: " + v2);
            }
          }
        }
        if (obj.hasOwnProperty(p = "CRYPTO")) {
          v2 = obj[p];
          if (v2 === !!v2) {
            if (v2) {
              if (typeof crypto != "undefined" && crypto && (crypto.getRandomValues || crypto.randomBytes)) {
                CRYPTO = v2;
              } else {
                CRYPTO = !v2;
                throw Error(bignumberError + "crypto unavailable");
              }
            } else {
              CRYPTO = v2;
            }
          } else {
            throw Error(bignumberError + p + " not true or false: " + v2);
          }
        }
        if (obj.hasOwnProperty(p = "MODULO_MODE")) {
          v2 = obj[p];
          intCheck(v2, 0, 9, p);
          MODULO_MODE = v2;
        }
        if (obj.hasOwnProperty(p = "POW_PRECISION")) {
          v2 = obj[p];
          intCheck(v2, 0, MAX, p);
          POW_PRECISION = v2;
        }
        if (obj.hasOwnProperty(p = "FORMAT")) {
          v2 = obj[p];
          if (typeof v2 == "object") FORMAT = v2;
          else throw Error(bignumberError + p + " not an object: " + v2);
        }
        if (obj.hasOwnProperty(p = "ALPHABET")) {
          v2 = obj[p];
          if (typeof v2 == "string" && !/^.?$|[+\-.\s]|(.).*\1/.test(v2)) {
            alphabetHasNormalDecimalDigits = v2.slice(0, 10) == "0123456789";
            ALPHABET = v2;
          } else {
            throw Error(bignumberError + p + " invalid: " + v2);
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
  BigNumber2.isBigNumber = function(v2) {
    if (!v2 || v2._isBigNumber !== true) return false;
    if (!BigNumber2.DEBUG) return true;
    var i, n2, c2 = v2.c, e2 = v2.e, s2 = v2.s;
    out: if ({}.toString.call(c2) == "[object Array]") {
      if ((s2 === 1 || s2 === -1) && e2 >= -MAX && e2 <= MAX && e2 === mathfloor(e2)) {
        if (c2[0] === 0) {
          if (e2 === 0 && c2.length === 1) return true;
          break out;
        }
        i = (e2 + 1) % LOG_BASE;
        if (i < 1) i += LOG_BASE;
        if (String(c2[0]).length == i) {
          for (i = 0; i < c2.length; i++) {
            n2 = c2[i];
            if (n2 < 0 || n2 >= BASE || n2 !== mathfloor(n2)) break out;
          }
          if (n2 !== 0) return true;
        }
      }
    } else if (c2 === null && e2 === null && (s2 === null || s2 === 1 || s2 === -1)) {
      return true;
    }
    throw Error(bignumberError + "Invalid BigNumber: " + v2);
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
      var a2, b, e2, k2, v2, i = 0, c2 = [], rand = new BigNumber2(ONE);
      if (dp == null) dp = DECIMAL_PLACES;
      else intCheck(dp, 0, MAX);
      k2 = mathceil(dp / LOG_BASE);
      if (CRYPTO) {
        if (crypto.getRandomValues) {
          a2 = crypto.getRandomValues(new Uint32Array(k2 *= 2));
          for (; i < k2; ) {
            v2 = a2[i] * 131072 + (a2[i + 1] >>> 11);
            if (v2 >= 9e15) {
              b = crypto.getRandomValues(new Uint32Array(2));
              a2[i] = b[0];
              a2[i + 1] = b[1];
            } else {
              c2.push(v2 % 1e14);
              i += 2;
            }
          }
          i = k2 / 2;
        } else if (crypto.randomBytes) {
          a2 = crypto.randomBytes(k2 *= 7);
          for (; i < k2; ) {
            v2 = (a2[i] & 31) * 281474976710656 + a2[i + 1] * 1099511627776 + a2[i + 2] * 4294967296 + a2[i + 3] * 16777216 + (a2[i + 4] << 16) + (a2[i + 5] << 8) + a2[i + 6];
            if (v2 >= 9e15) {
              crypto.randomBytes(7).copy(a2, i);
            } else {
              c2.push(v2 % 1e14);
              i += 7;
            }
          }
          i = k2 / 7;
        } else {
          CRYPTO = false;
          throw Error(bignumberError + "crypto unavailable");
        }
      }
      if (!CRYPTO) {
        for (; i < k2; ) {
          v2 = random53bitInt();
          if (v2 < 9e15) c2[i++] = v2 % 1e14;
        }
      }
      k2 = c2[--i];
      dp %= LOG_BASE;
      if (k2 && dp) {
        v2 = POWS_TEN[LOG_BASE - dp];
        c2[i] = mathfloor(k2 / v2) * v2;
      }
      for (; c2[i] === 0; c2.pop(), i--) ;
      if (i < 0) {
        c2 = [e2 = 0];
      } else {
        for (e2 = -1; c2[0] === 0; c2.splice(0, 1), e2 -= LOG_BASE) ;
        for (i = 1, v2 = c2[0]; v2 >= 10; v2 /= 10, i++) ;
        if (i < LOG_BASE) e2 -= LOG_BASE - i;
      }
      rand.e = e2;
      rand.c = c2;
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
      var j2, arr = [0], arrL, i = 0, len = str.length;
      for (; i < len; ) {
        for (arrL = arr.length; arrL--; arr[arrL] *= baseIn) ;
        arr[0] += alphabet.indexOf(str.charAt(i++));
        for (j2 = 0; j2 < arr.length; j2++) {
          if (arr[j2] > baseOut - 1) {
            if (arr[j2 + 1] == null) arr[j2 + 1] = 0;
            arr[j2 + 1] += arr[j2] / baseOut | 0;
            arr[j2] %= baseOut;
          }
        }
      }
      return arr.reverse();
    }
    return function(str, baseIn, baseOut, sign, callerIsToString) {
      var alphabet, d2, e2, k2, r2, x2, xc, y, i = str.indexOf("."), dp = DECIMAL_PLACES, rm = ROUNDING_MODE;
      if (i >= 0) {
        k2 = POW_PRECISION;
        POW_PRECISION = 0;
        str = str.replace(".", "");
        y = new BigNumber2(baseIn);
        x2 = y.pow(str.length - i);
        POW_PRECISION = k2;
        y.c = toBaseOut(
          toFixedPoint(coeffToString(x2.c), x2.e, "0"),
          10,
          baseOut,
          decimal
        );
        y.e = y.c.length;
      }
      xc = toBaseOut(str, baseIn, baseOut, callerIsToString ? (alphabet = ALPHABET, decimal) : (alphabet = decimal, ALPHABET));
      e2 = k2 = xc.length;
      for (; xc[--k2] == 0; xc.pop()) ;
      if (!xc[0]) return alphabet.charAt(0);
      if (i < 0) {
        --e2;
      } else {
        x2.c = xc;
        x2.e = e2;
        x2.s = sign;
        x2 = div(x2, y, dp, rm, baseOut);
        xc = x2.c;
        r2 = x2.r;
        e2 = x2.e;
      }
      d2 = e2 + dp + 1;
      i = xc[d2];
      k2 = baseOut / 2;
      r2 = r2 || d2 < 0 || xc[d2 + 1] != null;
      r2 = rm < 4 ? (i != null || r2) && (rm == 0 || rm == (x2.s < 0 ? 3 : 2)) : i > k2 || i == k2 && (rm == 4 || r2 || rm == 6 && xc[d2 - 1] & 1 || rm == (x2.s < 0 ? 8 : 7));
      if (d2 < 1 || !xc[0]) {
        str = r2 ? toFixedPoint(alphabet.charAt(1), -dp, alphabet.charAt(0)) : alphabet.charAt(0);
      } else {
        xc.length = d2;
        if (r2) {
          for (--baseOut; ++xc[--d2] > baseOut; ) {
            xc[d2] = 0;
            if (!d2) {
              ++e2;
              xc = [1].concat(xc);
            }
          }
        }
        for (k2 = xc.length; !xc[--k2]; ) ;
        for (i = 0, str = ""; i <= k2; str += alphabet.charAt(xc[i++])) ;
        str = toFixedPoint(str, e2, alphabet.charAt(0));
      }
      return str;
    };
  })();
  div = /* @__PURE__ */ (function() {
    function multiply(x2, k2, base) {
      var m2, temp, xlo, xhi, carry = 0, i = x2.length, klo = k2 % SQRT_BASE, khi = k2 / SQRT_BASE | 0;
      for (x2 = x2.slice(); i--; ) {
        xlo = x2[i] % SQRT_BASE;
        xhi = x2[i] / SQRT_BASE | 0;
        m2 = khi * xlo + xhi * klo;
        temp = klo * xlo + m2 % SQRT_BASE * SQRT_BASE + carry;
        carry = (temp / base | 0) + (m2 / SQRT_BASE | 0) + khi * xhi;
        x2[i] = temp % base;
      }
      if (carry) x2 = [carry].concat(x2);
      return x2;
    }
    function compare2(a2, b, aL, bL) {
      var i, cmp;
      if (aL != bL) {
        cmp = aL > bL ? 1 : -1;
      } else {
        for (i = cmp = 0; i < aL; i++) {
          if (a2[i] != b[i]) {
            cmp = a2[i] > b[i] ? 1 : -1;
            break;
          }
        }
      }
      return cmp;
    }
    function subtract(a2, b, aL, base) {
      var i = 0;
      for (; aL--; ) {
        a2[aL] -= i;
        i = a2[aL] < b[aL] ? 1 : 0;
        a2[aL] = i * base + a2[aL] - b[aL];
      }
      for (; !a2[0] && a2.length > 1; a2.splice(0, 1)) ;
    }
    return function(x2, y, dp, rm, base) {
      var cmp, e2, i, more, n2, prod, prodL, q2, qc, rem, remL, rem0, xi, xL, yc0, yL, yz, s2 = x2.s == y.s ? 1 : -1, xc = x2.c, yc = y.c;
      if (!xc || !xc[0] || !yc || !yc[0]) {
        return new BigNumber2(
          // Return NaN if either NaN, or both Infinity or 0.
          !x2.s || !y.s || (xc ? yc && xc[0] == yc[0] : !yc) ? NaN : (
            // Return ±0 if x is ±0 or y is ±Infinity, or return ±Infinity as y is ±0.
            xc && xc[0] == 0 || !yc ? s2 * 0 : s2 / 0
          )
        );
      }
      q2 = new BigNumber2(s2);
      qc = q2.c = [];
      e2 = x2.e - y.e;
      s2 = dp + e2 + 1;
      if (!base) {
        base = BASE;
        e2 = bitFloor(x2.e / LOG_BASE) - bitFloor(y.e / LOG_BASE);
        s2 = s2 / LOG_BASE | 0;
      }
      for (i = 0; yc[i] == (xc[i] || 0); i++) ;
      if (yc[i] > (xc[i] || 0)) e2--;
      if (s2 < 0) {
        qc.push(1);
        more = true;
      } else {
        xL = xc.length;
        yL = yc.length;
        i = 0;
        s2 += 2;
        n2 = mathfloor(base / (yc[0] + 1));
        if (n2 > 1) {
          yc = multiply(yc, n2, base);
          xc = multiply(xc, n2, base);
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
          n2 = 0;
          cmp = compare2(yc, rem, yL, remL);
          if (cmp < 0) {
            rem0 = rem[0];
            if (yL != remL) rem0 = rem0 * base + (rem[1] || 0);
            n2 = mathfloor(rem0 / yc0);
            if (n2 > 1) {
              if (n2 >= base) n2 = base - 1;
              prod = multiply(yc, n2, base);
              prodL = prod.length;
              remL = rem.length;
              while (compare2(prod, rem, prodL, remL) == 1) {
                n2--;
                subtract(prod, yL < prodL ? yz : yc, prodL, base);
                prodL = prod.length;
                cmp = 1;
              }
            } else {
              if (n2 == 0) {
                cmp = n2 = 1;
              }
              prod = yc.slice();
              prodL = prod.length;
            }
            if (prodL < remL) prod = [0].concat(prod);
            subtract(rem, prod, remL, base);
            remL = rem.length;
            if (cmp == -1) {
              while (compare2(yc, rem, yL, remL) < 1) {
                n2++;
                subtract(rem, yL < remL ? yz : yc, remL, base);
                remL = rem.length;
              }
            }
          } else if (cmp === 0) {
            n2++;
            rem = [0];
          }
          qc[i++] = n2;
          if (rem[0]) {
            rem[remL++] = xc[xi] || 0;
          } else {
            rem = [xc[xi]];
            remL = 1;
          }
        } while ((xi++ < xL || rem[0] != null) && s2--);
        more = rem[0] != null;
        if (!qc[0]) qc.splice(0, 1);
      }
      if (base == BASE) {
        for (i = 1, s2 = qc[0]; s2 >= 10; s2 /= 10, i++) ;
        round(q2, dp + (q2.e = i + e2 * LOG_BASE - 1) + 1, rm, more);
      } else {
        q2.e = e2;
        q2.r = +more;
      }
      return q2;
    };
  })();
  function format(n2, i, rm, id) {
    var c0, e2, ne, len, str;
    if (rm == null) rm = ROUNDING_MODE;
    else intCheck(rm, 0, 8);
    if (!n2.c) return n2.toString();
    c0 = n2.c[0];
    ne = n2.e;
    if (i == null) {
      str = coeffToString(n2.c);
      str = id == 1 || id == 2 && (ne <= TO_EXP_NEG || ne >= TO_EXP_POS) ? toExponential(str, ne) : toFixedPoint(str, ne, "0");
    } else {
      n2 = round(new BigNumber2(n2), i, rm);
      e2 = n2.e;
      str = coeffToString(n2.c);
      len = str.length;
      if (id == 1 || id == 2 && (i <= e2 || e2 <= TO_EXP_NEG)) {
        for (; len < i; str += "0", len++) ;
        str = toExponential(str, e2);
      } else {
        i -= ne + (id === 2 && e2 > ne);
        str = toFixedPoint(str, e2, "0");
        if (e2 + 1 > len) {
          if (--i > 0) for (str += "."; i--; str += "0") ;
        } else {
          i += e2 - len;
          if (i > 0) {
            if (e2 + 1 == len) str += ".";
            for (; i--; str += "0") ;
          }
        }
      }
    }
    return n2.s < 0 && c0 ? "-" + str : str;
  }
  function maxOrMin(args, n2) {
    var k2, y, i = 1, x2 = new BigNumber2(args[0]);
    for (; i < args.length; i++) {
      y = new BigNumber2(args[i]);
      if (!y.s || (k2 = compare(x2, y)) === n2 || k2 === 0 && x2.s === n2) {
        x2 = y;
      }
    }
    return x2;
  }
  function normalise(n2, c2, e2) {
    var i = 1, j2 = c2.length;
    for (; !c2[--j2]; c2.pop()) ;
    for (j2 = c2[0]; j2 >= 10; j2 /= 10, i++) ;
    if ((e2 = i + e2 * LOG_BASE - 1) > MAX_EXP) {
      n2.c = n2.e = null;
    } else if (e2 < MIN_EXP) {
      n2.c = [n2.e = 0];
    } else {
      n2.e = e2;
      n2.c = c2;
    }
    return n2;
  }
  parseNumeric = /* @__PURE__ */ (function() {
    var basePrefix = /^(-?)0([xbo])(?=\w[\w.]*$)/i, dotAfter = /^([^.]+)\.$/, dotBefore = /^\.([^.]+)$/, isInfinityOrNaN = /^-?(Infinity|NaN)$/, whitespaceOrPlus = /^\s*\+(?=[\w.])|^\s+|\s+$/g;
    return function(x2, str, isNum, b) {
      var base, s2 = isNum ? str : str.replace(whitespaceOrPlus, "");
      if (isInfinityOrNaN.test(s2)) {
        x2.s = isNaN(s2) ? null : s2 < 0 ? -1 : 1;
      } else {
        if (!isNum) {
          s2 = s2.replace(basePrefix, function(m2, p1, p2) {
            base = (p2 = p2.toLowerCase()) == "x" ? 16 : p2 == "b" ? 2 : 8;
            return !b || b == base ? p1 : m2;
          });
          if (b) {
            base = b;
            s2 = s2.replace(dotAfter, "$1").replace(dotBefore, "0.$1");
          }
          if (str != s2) return new BigNumber2(s2, base);
        }
        if (BigNumber2.DEBUG) {
          throw Error(bignumberError + "Not a" + (b ? " base " + b : "") + " number: " + str);
        }
        x2.s = null;
      }
      x2.c = x2.e = null;
    };
  })();
  function round(x2, sd, rm, r2) {
    var d2, i, j2, k2, n2, ni, rd, xc = x2.c, pows10 = POWS_TEN;
    if (xc) {
      out: {
        for (d2 = 1, k2 = xc[0]; k2 >= 10; k2 /= 10, d2++) ;
        i = sd - d2;
        if (i < 0) {
          i += LOG_BASE;
          j2 = sd;
          n2 = xc[ni = 0];
          rd = mathfloor(n2 / pows10[d2 - j2 - 1] % 10);
        } else {
          ni = mathceil((i + 1) / LOG_BASE);
          if (ni >= xc.length) {
            if (r2) {
              for (; xc.length <= ni; xc.push(0)) ;
              n2 = rd = 0;
              d2 = 1;
              i %= LOG_BASE;
              j2 = i - LOG_BASE + 1;
            } else {
              break out;
            }
          } else {
            n2 = k2 = xc[ni];
            for (d2 = 1; k2 >= 10; k2 /= 10, d2++) ;
            i %= LOG_BASE;
            j2 = i - LOG_BASE + d2;
            rd = j2 < 0 ? 0 : mathfloor(n2 / pows10[d2 - j2 - 1] % 10);
          }
        }
        r2 = r2 || sd < 0 || // Are there any non-zero digits after the rounding digit?
        // The expression  n % pows10[d - j - 1]  returns all digits of n to the right
        // of the digit at j, e.g. if n is 908714 and j is 2, the expression gives 714.
        xc[ni + 1] != null || (j2 < 0 ? n2 : n2 % pows10[d2 - j2 - 1]);
        r2 = rm < 4 ? (rd || r2) && (rm == 0 || rm == (x2.s < 0 ? 3 : 2)) : rd > 5 || rd == 5 && (rm == 4 || r2 || rm == 6 && // Check whether the digit to the left of the rounding digit is odd.
        (i > 0 ? j2 > 0 ? n2 / pows10[d2 - j2] : 0 : xc[ni - 1]) % 10 & 1 || rm == (x2.s < 0 ? 8 : 7));
        if (sd < 1 || !xc[0]) {
          xc.length = 0;
          if (r2) {
            sd -= x2.e + 1;
            xc[0] = pows10[(LOG_BASE - sd % LOG_BASE) % LOG_BASE];
            x2.e = -sd || 0;
          } else {
            xc[0] = x2.e = 0;
          }
          return x2;
        }
        if (i == 0) {
          xc.length = ni;
          k2 = 1;
          ni--;
        } else {
          xc.length = ni + 1;
          k2 = pows10[LOG_BASE - i];
          xc[ni] = j2 > 0 ? mathfloor(n2 / pows10[d2 - j2] % pows10[j2]) * k2 : 0;
        }
        if (r2) {
          for (; ; ) {
            if (ni == 0) {
              for (i = 1, j2 = xc[0]; j2 >= 10; j2 /= 10, i++) ;
              j2 = xc[0] += k2;
              for (k2 = 1; j2 >= 10; j2 /= 10, k2++) ;
              if (i != k2) {
                x2.e++;
                if (xc[0] == BASE) xc[0] = 1;
              }
              break;
            } else {
              xc[ni] += k2;
              if (xc[ni] != BASE) break;
              xc[ni--] = 0;
              k2 = 1;
            }
          }
        }
        for (i = xc.length; xc[--i] === 0; xc.pop()) ;
      }
      if (x2.e > MAX_EXP) {
        x2.c = x2.e = null;
      } else if (x2.e < MIN_EXP) {
        x2.c = [x2.e = 0];
      }
    }
    return x2;
  }
  function valueOf(n2) {
    var str, e2 = n2.e;
    if (e2 === null) return n2.toString();
    str = coeffToString(n2.c);
    str = e2 <= TO_EXP_NEG || e2 >= TO_EXP_POS ? toExponential(str, e2) : toFixedPoint(str, e2, "0");
    return n2.s < 0 ? "-" + str : str;
  }
  P2.absoluteValue = P2.abs = function() {
    var x2 = new BigNumber2(this);
    if (x2.s < 0) x2.s = 1;
    return x2;
  };
  P2.comparedTo = function(y, b) {
    return compare(this, new BigNumber2(y, b));
  };
  P2.decimalPlaces = P2.dp = function(dp, rm) {
    var c2, n2, v2, x2 = this;
    if (dp != null) {
      intCheck(dp, 0, MAX);
      if (rm == null) rm = ROUNDING_MODE;
      else intCheck(rm, 0, 8);
      return round(new BigNumber2(x2), dp + x2.e + 1, rm);
    }
    if (!(c2 = x2.c)) return null;
    n2 = ((v2 = c2.length - 1) - bitFloor(this.e / LOG_BASE)) * LOG_BASE;
    if (v2 = c2[v2]) for (; v2 % 10 == 0; v2 /= 10, n2--) ;
    if (n2 < 0) n2 = 0;
    return n2;
  };
  P2.dividedBy = P2.div = function(y, b) {
    return div(this, new BigNumber2(y, b), DECIMAL_PLACES, ROUNDING_MODE);
  };
  P2.dividedToIntegerBy = P2.idiv = function(y, b) {
    return div(this, new BigNumber2(y, b), 0, 1);
  };
  P2.exponentiatedBy = P2.pow = function(n2, m2) {
    var half, isModExp, i, k2, more, nIsBig, nIsNeg, nIsOdd, y, x2 = this;
    n2 = new BigNumber2(n2);
    if (n2.c && !n2.isInteger()) {
      throw Error(bignumberError + "Exponent not an integer: " + valueOf(n2));
    }
    if (m2 != null) m2 = new BigNumber2(m2);
    nIsBig = n2.e > 14;
    if (!x2.c || !x2.c[0] || x2.c[0] == 1 && !x2.e && x2.c.length == 1 || !n2.c || !n2.c[0]) {
      y = new BigNumber2(Math.pow(+valueOf(x2), nIsBig ? n2.s * (2 - isOdd(n2)) : +valueOf(n2)));
      return m2 ? y.mod(m2) : y;
    }
    nIsNeg = n2.s < 0;
    if (m2) {
      if (m2.c ? !m2.c[0] : !m2.s) return new BigNumber2(NaN);
      isModExp = !nIsNeg && x2.isInteger() && m2.isInteger();
      if (isModExp) x2 = x2.mod(m2);
    } else if (n2.e > 9 && (x2.e > 0 || x2.e < -1 || (x2.e == 0 ? x2.c[0] > 1 || nIsBig && x2.c[1] >= 24e7 : x2.c[0] < 8e13 || nIsBig && x2.c[0] <= 9999975e7))) {
      k2 = x2.s < 0 && isOdd(n2) ? -0 : 0;
      if (x2.e > -1) k2 = 1 / k2;
      return new BigNumber2(nIsNeg ? 1 / k2 : k2);
    } else if (POW_PRECISION) {
      k2 = mathceil(POW_PRECISION / LOG_BASE + 2);
    }
    if (nIsBig) {
      half = new BigNumber2(0.5);
      if (nIsNeg) n2.s = 1;
      nIsOdd = isOdd(n2);
    } else {
      i = Math.abs(+valueOf(n2));
      nIsOdd = i % 2;
    }
    y = new BigNumber2(ONE);
    for (; ; ) {
      if (nIsOdd) {
        y = y.times(x2);
        if (!y.c) break;
        if (k2) {
          if (y.c.length > k2) y.c.length = k2;
        } else if (isModExp) {
          y = y.mod(m2);
        }
      }
      if (i) {
        i = mathfloor(i / 2);
        if (i === 0) break;
        nIsOdd = i % 2;
      } else {
        n2 = n2.times(half);
        round(n2, n2.e + 1, 1);
        if (n2.e > 14) {
          nIsOdd = isOdd(n2);
        } else {
          i = +valueOf(n2);
          if (i === 0) break;
          nIsOdd = i % 2;
        }
      }
      x2 = x2.times(x2);
      if (k2) {
        if (x2.c && x2.c.length > k2) x2.c.length = k2;
      } else if (isModExp) {
        x2 = x2.mod(m2);
      }
    }
    if (isModExp) return y;
    if (nIsNeg) y = ONE.div(y);
    return m2 ? y.mod(m2) : k2 ? round(y, POW_PRECISION, ROUNDING_MODE, more) : y;
  };
  P2.integerValue = function(rm) {
    var n2 = new BigNumber2(this);
    if (rm == null) rm = ROUNDING_MODE;
    else intCheck(rm, 0, 8);
    return round(n2, n2.e + 1, rm);
  };
  P2.isEqualTo = P2.eq = function(y, b) {
    return compare(this, new BigNumber2(y, b)) === 0;
  };
  P2.isFinite = function() {
    return !!this.c;
  };
  P2.isGreaterThan = P2.gt = function(y, b) {
    return compare(this, new BigNumber2(y, b)) > 0;
  };
  P2.isGreaterThanOrEqualTo = P2.gte = function(y, b) {
    return (b = compare(this, new BigNumber2(y, b))) === 1 || b === 0;
  };
  P2.isInteger = function() {
    return !!this.c && bitFloor(this.e / LOG_BASE) > this.c.length - 2;
  };
  P2.isLessThan = P2.lt = function(y, b) {
    return compare(this, new BigNumber2(y, b)) < 0;
  };
  P2.isLessThanOrEqualTo = P2.lte = function(y, b) {
    return (b = compare(this, new BigNumber2(y, b))) === -1 || b === 0;
  };
  P2.isNaN = function() {
    return !this.s;
  };
  P2.isNegative = function() {
    return this.s < 0;
  };
  P2.isPositive = function() {
    return this.s > 0;
  };
  P2.isZero = function() {
    return !!this.c && this.c[0] == 0;
  };
  P2.minus = function(y, b) {
    var i, j2, t, xLTy, x2 = this, a2 = x2.s;
    y = new BigNumber2(y, b);
    b = y.s;
    if (!a2 || !b) return new BigNumber2(NaN);
    if (a2 != b) {
      y.s = -b;
      return x2.plus(y);
    }
    var xe = x2.e / LOG_BASE, ye = y.e / LOG_BASE, xc = x2.c, yc = y.c;
    if (!xe || !ye) {
      if (!xc || !yc) return xc ? (y.s = -b, y) : new BigNumber2(yc ? x2 : NaN);
      if (!xc[0] || !yc[0]) {
        return yc[0] ? (y.s = -b, y) : new BigNumber2(xc[0] ? x2 : (
          // IEEE 754 (2008) 6.3: n - n = -0 when rounding to -Infinity
          ROUNDING_MODE == 3 ? -0 : 0
        ));
      }
    }
    xe = bitFloor(xe);
    ye = bitFloor(ye);
    xc = xc.slice();
    if (a2 = xe - ye) {
      if (xLTy = a2 < 0) {
        a2 = -a2;
        t = xc;
      } else {
        ye = xe;
        t = yc;
      }
      t.reverse();
      for (b = a2; b--; t.push(0)) ;
      t.reverse();
    } else {
      j2 = (xLTy = (a2 = xc.length) < (b = yc.length)) ? a2 : b;
      for (a2 = b = 0; b < j2; b++) {
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
    b = (j2 = yc.length) - (i = xc.length);
    if (b > 0) for (; b--; xc[i++] = 0) ;
    b = BASE - 1;
    for (; j2 > a2; ) {
      if (xc[--j2] < yc[j2]) {
        for (i = j2; i && !xc[--i]; xc[i] = b) ;
        --xc[i];
        xc[j2] += BASE;
      }
      xc[j2] -= yc[j2];
    }
    for (; xc[0] == 0; xc.splice(0, 1), --ye) ;
    if (!xc[0]) {
      y.s = ROUNDING_MODE == 3 ? -1 : 1;
      y.c = [y.e = 0];
      return y;
    }
    return normalise(y, xc, ye);
  };
  P2.modulo = P2.mod = function(y, b) {
    var q2, s2, x2 = this;
    y = new BigNumber2(y, b);
    if (!x2.c || !y.s || y.c && !y.c[0]) {
      return new BigNumber2(NaN);
    } else if (!y.c || x2.c && !x2.c[0]) {
      return new BigNumber2(x2);
    }
    if (MODULO_MODE == 9) {
      s2 = y.s;
      y.s = 1;
      q2 = div(x2, y, 0, 3);
      y.s = s2;
      q2.s *= s2;
    } else {
      q2 = div(x2, y, 0, MODULO_MODE);
    }
    y = x2.minus(q2.times(y));
    if (!y.c[0] && MODULO_MODE == 1) y.s = x2.s;
    return y;
  };
  P2.multipliedBy = P2.times = function(y, b) {
    var c2, e2, i, j2, k2, m2, xcL, xlo, xhi, ycL, ylo, yhi, zc, base, sqrtBase, x2 = this, xc = x2.c, yc = (y = new BigNumber2(y, b)).c;
    if (!xc || !yc || !xc[0] || !yc[0]) {
      if (!x2.s || !y.s || xc && !xc[0] && !yc || yc && !yc[0] && !xc) {
        y.c = y.e = y.s = null;
      } else {
        y.s *= x2.s;
        if (!xc || !yc) {
          y.c = y.e = null;
        } else {
          y.c = [0];
          y.e = 0;
        }
      }
      return y;
    }
    e2 = bitFloor(x2.e / LOG_BASE) + bitFloor(y.e / LOG_BASE);
    y.s *= x2.s;
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
      c2 = 0;
      ylo = yc[i] % sqrtBase;
      yhi = yc[i] / sqrtBase | 0;
      for (k2 = xcL, j2 = i + k2; j2 > i; ) {
        xlo = xc[--k2] % sqrtBase;
        xhi = xc[k2] / sqrtBase | 0;
        m2 = yhi * xlo + xhi * ylo;
        xlo = ylo * xlo + m2 % sqrtBase * sqrtBase + zc[j2] + c2;
        c2 = (xlo / base | 0) + (m2 / sqrtBase | 0) + yhi * xhi;
        zc[j2--] = xlo % base;
      }
      zc[j2] = c2;
    }
    if (c2) {
      ++e2;
    } else {
      zc.splice(0, 1);
    }
    return normalise(y, zc, e2);
  };
  P2.negated = function() {
    var x2 = new BigNumber2(this);
    x2.s = -x2.s || null;
    return x2;
  };
  P2.plus = function(y, b) {
    var t, x2 = this, a2 = x2.s;
    y = new BigNumber2(y, b);
    b = y.s;
    if (!a2 || !b) return new BigNumber2(NaN);
    if (a2 != b) {
      y.s = -b;
      return x2.minus(y);
    }
    var xe = x2.e / LOG_BASE, ye = y.e / LOG_BASE, xc = x2.c, yc = y.c;
    if (!xe || !ye) {
      if (!xc || !yc) return new BigNumber2(a2 / 0);
      if (!xc[0] || !yc[0]) return yc[0] ? y : new BigNumber2(xc[0] ? x2 : a2 * 0);
    }
    xe = bitFloor(xe);
    ye = bitFloor(ye);
    xc = xc.slice();
    if (a2 = xe - ye) {
      if (a2 > 0) {
        ye = xe;
        t = yc;
      } else {
        a2 = -a2;
        t = xc;
      }
      t.reverse();
      for (; a2--; t.push(0)) ;
      t.reverse();
    }
    a2 = xc.length;
    b = yc.length;
    if (a2 - b < 0) {
      t = yc;
      yc = xc;
      xc = t;
      b = a2;
    }
    for (a2 = 0; b; ) {
      a2 = (xc[--b] = xc[b] + yc[b] + a2) / BASE | 0;
      xc[b] = BASE === xc[b] ? 0 : xc[b] % BASE;
    }
    if (a2) {
      xc = [a2].concat(xc);
      ++ye;
    }
    return normalise(y, xc, ye);
  };
  P2.precision = P2.sd = function(sd, rm) {
    var c2, n2, v2, x2 = this;
    if (sd != null && sd !== !!sd) {
      intCheck(sd, 1, MAX);
      if (rm == null) rm = ROUNDING_MODE;
      else intCheck(rm, 0, 8);
      return round(new BigNumber2(x2), sd, rm);
    }
    if (!(c2 = x2.c)) return null;
    v2 = c2.length - 1;
    n2 = v2 * LOG_BASE + 1;
    if (v2 = c2[v2]) {
      for (; v2 % 10 == 0; v2 /= 10, n2--) ;
      for (v2 = c2[0]; v2 >= 10; v2 /= 10, n2++) ;
    }
    if (sd && x2.e + 1 > n2) n2 = x2.e + 1;
    return n2;
  };
  P2.shiftedBy = function(k2) {
    intCheck(k2, -MAX_SAFE_INTEGER, MAX_SAFE_INTEGER);
    return this.times("1e" + k2);
  };
  P2.squareRoot = P2.sqrt = function() {
    var m2, n2, r2, rep, t, x2 = this, c2 = x2.c, s2 = x2.s, e2 = x2.e, dp = DECIMAL_PLACES + 4, half = new BigNumber2("0.5");
    if (s2 !== 1 || !c2 || !c2[0]) {
      return new BigNumber2(!s2 || s2 < 0 && (!c2 || c2[0]) ? NaN : c2 ? x2 : 1 / 0);
    }
    s2 = Math.sqrt(+valueOf(x2));
    if (s2 == 0 || s2 == 1 / 0) {
      n2 = coeffToString(c2);
      if ((n2.length + e2) % 2 == 0) n2 += "0";
      s2 = Math.sqrt(+n2);
      e2 = bitFloor((e2 + 1) / 2) - (e2 < 0 || e2 % 2);
      if (s2 == 1 / 0) {
        n2 = "5e" + e2;
      } else {
        n2 = s2.toExponential();
        n2 = n2.slice(0, n2.indexOf("e") + 1) + e2;
      }
      r2 = new BigNumber2(n2);
    } else {
      r2 = new BigNumber2(s2 + "");
    }
    if (r2.c[0]) {
      e2 = r2.e;
      s2 = e2 + dp;
      if (s2 < 3) s2 = 0;
      for (; ; ) {
        t = r2;
        r2 = half.times(t.plus(div(x2, t, dp, 1)));
        if (coeffToString(t.c).slice(0, s2) === (n2 = coeffToString(r2.c)).slice(0, s2)) {
          if (r2.e < e2) --s2;
          n2 = n2.slice(s2 - 3, s2 + 1);
          if (n2 == "9999" || !rep && n2 == "4999") {
            if (!rep) {
              round(t, t.e + DECIMAL_PLACES + 2, 0);
              if (t.times(t).eq(x2)) {
                r2 = t;
                break;
              }
            }
            dp += 4;
            s2 += 4;
            rep = 1;
          } else {
            if (!+n2 || !+n2.slice(1) && n2.charAt(0) == "5") {
              round(r2, r2.e + DECIMAL_PLACES + 2, 1);
              m2 = !r2.times(r2).eq(x2);
            }
            break;
          }
        }
      }
    }
    return round(r2, r2.e + DECIMAL_PLACES + 1, ROUNDING_MODE, m2);
  };
  P2.toExponential = function(dp, rm) {
    if (dp != null) {
      intCheck(dp, 0, MAX);
      dp++;
    }
    return format(this, dp, rm, 1);
  };
  P2.toFixed = function(dp, rm) {
    if (dp != null) {
      intCheck(dp, 0, MAX);
      dp = dp + this.e + 1;
    }
    return format(this, dp, rm);
  };
  P2.toFormat = function(dp, rm, format2) {
    var str, x2 = this;
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
    str = x2.toFixed(dp, rm);
    if (x2.c) {
      var i, arr = str.split("."), g1 = +format2.groupSize, g2 = +format2.secondaryGroupSize, groupSeparator = format2.groupSeparator || "", intPart = arr[0], fractionPart = arr[1], isNeg = x2.s < 0, intDigits = isNeg ? intPart.slice(1) : intPart, len = intDigits.length;
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
  P2.toFraction = function(md) {
    var d2, d0, d1, d22, e2, exp, n2, n0, n1, q2, r2, s2, x2 = this, xc = x2.c;
    if (md != null) {
      n2 = new BigNumber2(md);
      if (!n2.isInteger() && (n2.c || n2.s !== 1) || n2.lt(ONE)) {
        throw Error(bignumberError + "Argument " + (n2.isInteger() ? "out of range: " : "not an integer: ") + valueOf(n2));
      }
    }
    if (!xc) return new BigNumber2(x2);
    d2 = new BigNumber2(ONE);
    n1 = d0 = new BigNumber2(ONE);
    d1 = n0 = new BigNumber2(ONE);
    s2 = coeffToString(xc);
    e2 = d2.e = s2.length - x2.e - 1;
    d2.c[0] = POWS_TEN[(exp = e2 % LOG_BASE) < 0 ? LOG_BASE + exp : exp];
    md = !md || n2.comparedTo(d2) > 0 ? e2 > 0 ? d2 : n1 : n2;
    exp = MAX_EXP;
    MAX_EXP = 1 / 0;
    n2 = new BigNumber2(s2);
    n0.c[0] = 0;
    for (; ; ) {
      q2 = div(n2, d2, 0, 1);
      d22 = d0.plus(q2.times(d1));
      if (d22.comparedTo(md) == 1) break;
      d0 = d1;
      d1 = d22;
      n1 = n0.plus(q2.times(d22 = n1));
      n0 = d22;
      d2 = n2.minus(q2.times(d22 = d2));
      n2 = d22;
    }
    d22 = div(md.minus(d0), d1, 0, 1);
    n0 = n0.plus(d22.times(n1));
    d0 = d0.plus(d22.times(d1));
    n0.s = n1.s = x2.s;
    e2 = e2 * 2;
    r2 = div(n1, d1, e2, ROUNDING_MODE).minus(x2).abs().comparedTo(
      div(n0, d0, e2, ROUNDING_MODE).minus(x2).abs()
    ) < 1 ? [n1, d1] : [n0, d0];
    MAX_EXP = exp;
    return r2;
  };
  P2.toNumber = function() {
    return +valueOf(this);
  };
  P2.toPrecision = function(sd, rm) {
    if (sd != null) intCheck(sd, 1, MAX);
    return format(this, sd, rm, 2);
  };
  P2.toString = function(b) {
    var str, n2 = this, s2 = n2.s, e2 = n2.e;
    if (e2 === null) {
      if (s2) {
        str = "Infinity";
        if (s2 < 0) str = "-" + str;
      } else {
        str = "NaN";
      }
    } else {
      if (b == null) {
        str = e2 <= TO_EXP_NEG || e2 >= TO_EXP_POS ? toExponential(coeffToString(n2.c), e2) : toFixedPoint(coeffToString(n2.c), e2, "0");
      } else if (b === 10 && alphabetHasNormalDecimalDigits) {
        n2 = round(new BigNumber2(n2), DECIMAL_PLACES + e2 + 1, ROUNDING_MODE);
        str = toFixedPoint(coeffToString(n2.c), n2.e, "0");
      } else {
        intCheck(b, 2, ALPHABET.length, "Base");
        str = convertBase(toFixedPoint(coeffToString(n2.c), e2, "0"), 10, b, s2, true);
      }
      if (s2 < 0 && n2.c[0]) str = "-" + str;
    }
    return str;
  };
  P2.valueOf = P2.toJSON = function() {
    return valueOf(this);
  };
  P2._isBigNumber = true;
  P2[Symbol.toStringTag] = "BigNumber";
  P2[Symbol.for("nodejs.util.inspect.custom")] = P2.valueOf;
  if (configObject != null) BigNumber2.set(configObject);
  return BigNumber2;
}
function bitFloor(n2) {
  var i = n2 | 0;
  return n2 > 0 || n2 === i ? i : i - 1;
}
function coeffToString(a2) {
  var s2, z2, i = 1, j2 = a2.length, r2 = a2[0] + "";
  for (; i < j2; ) {
    s2 = a2[i++] + "";
    z2 = LOG_BASE - s2.length;
    for (; z2--; s2 = "0" + s2) ;
    r2 += s2;
  }
  for (j2 = r2.length; r2.charCodeAt(--j2) === 48; ) ;
  return r2.slice(0, j2 + 1 || 1);
}
function compare(x2, y) {
  var a2, b, xc = x2.c, yc = y.c, i = x2.s, j2 = y.s, k2 = x2.e, l2 = y.e;
  if (!i || !j2) return null;
  a2 = xc && !xc[0];
  b = yc && !yc[0];
  if (a2 || b) return a2 ? b ? 0 : -j2 : i;
  if (i != j2) return i;
  a2 = i < 0;
  b = k2 == l2;
  if (!xc || !yc) return b ? 0 : !xc ^ a2 ? 1 : -1;
  if (!b) return k2 > l2 ^ a2 ? 1 : -1;
  j2 = (k2 = xc.length) < (l2 = yc.length) ? k2 : l2;
  for (i = 0; i < j2; i++) if (xc[i] != yc[i]) return xc[i] > yc[i] ^ a2 ? 1 : -1;
  return k2 == l2 ? 0 : k2 > l2 ^ a2 ? 1 : -1;
}
function intCheck(n2, min, max, name) {
  if (n2 < min || n2 > max || n2 !== mathfloor(n2)) {
    throw Error(bignumberError + (name || "Argument") + (typeof n2 == "number" ? n2 < min || n2 > max ? " out of range: " : " not an integer: " : " not a primitive number: ") + String(n2));
  }
}
function isOdd(n2) {
  var k2 = n2.c.length - 1;
  return bitFloor(n2.e / LOG_BASE) == k2 && n2.c[k2] % 2 != 0;
}
function toExponential(str, e2) {
  return (str.length > 1 ? str.charAt(0) + "." + str.slice(1) : str) + (e2 < 0 ? "e" : "e+") + e2;
}
function toFixedPoint(str, e2, z2) {
  var len, zs;
  if (e2 < 0) {
    for (zs = z2 + "."; ++e2; zs += z2) ;
    str = zs + str;
  } else {
    len = str.length;
    if (++e2 > len) {
      for (zs = z2, e2 -= len; --e2; zs += z2) ;
      str += zs;
    } else if (e2 < len) {
      str = str.slice(0, e2) + "." + str.slice(e2);
    }
  }
  return str;
}
var BigNumber = clone();
var bignumber_default = BigNumber;

// node_modules/nanocurrency/dist/nanocurrency.esm.js
var import_blakejs = __toESM(require_blakejs());
var e;
var a = (function(A2, I2) {
  return A2(I2 = { exports: {} }, I2.exports), I2.exports;
})((function(i, g2) {
  var C2, r2 = (C2 = "undefined" != typeof document && document.currentScript ? document.currentScript.src : void 0, function(i2) {
    var g3;
    i2 = i2 || {}, g3 || (g3 = void 0 !== i2 ? i2 : {});
    var r3, o2 = {};
    for (r3 in g3) g3.hasOwnProperty(r3) && (o2[r3] = g3[r3]);
    g3.arguments = [], g3.thisProgram = "./this.program", g3.quit = function(A2, I2) {
      throw I2;
    }, g3.preRun = [], g3.postRun = [];
    var n2 = false, t = false, h = false, e2 = false;
    n2 = "object" == typeof window, t = "function" == typeof importScripts, h = "object" == typeof process && !n2 && !t, e2 = !n2 && !h && !t;
    var a2, Q, B2 = "";
    h ? (B2 = __dirname + "/", g3.read = function(i3, g4) {
      var C3 = V2(i3);
      return C3 || (a2 || (a2 = import_fs.default), Q || (Q = import_path.default), i3 = Q.normalize(i3), C3 = a2.readFileSync(i3)), g4 ? C3 : C3.toString();
    }, g3.readBinary = function(A2) {
      return (A2 = g3.read(A2, true)).buffer || (A2 = new Uint8Array(A2)), c2(A2.buffer), A2;
    }, 1 < process.argv.length && (g3.thisProgram = process.argv[1].replace(/\\/g, "/")), g3.arguments = process.argv.slice(2), process.on("uncaughtException", (function(A2) {
      if (!(A2 instanceof z2)) throw A2;
    })), process.on("unhandledRejection", $3), g3.quit = function(A2) {
      process.exit(A2);
    }, g3.inspect = function() {
      return "[Emscripten Module object]";
    }) : e2 ? ("undefined" != typeof read && (g3.read = function(A2) {
      var I2 = V2(A2);
      return I2 ? j2(I2) : read(A2);
    }), g3.readBinary = function(A2) {
      var I2;
      return (I2 = V2(A2)) ? I2 : "function" == typeof readbuffer ? new Uint8Array(readbuffer(A2)) : (c2("object" == typeof (I2 = read(A2, "binary"))), I2);
    }, "undefined" != typeof scriptArgs ? g3.arguments = scriptArgs : void 0 !== arguments && (g3.arguments = arguments), "function" == typeof quit && (g3.quit = function(A2) {
      quit(A2);
    })) : (n2 || t) && (t ? B2 = self.location.href : document.currentScript && (B2 = document.currentScript.src), C2 && (B2 = C2), B2 = 0 !== B2.indexOf("blob:") ? B2.substr(0, B2.lastIndexOf("/") + 1) : "", g3.read = function(A2) {
      try {
        var I2 = new XMLHttpRequest();
        return I2.open("GET", A2, false), I2.send(null), I2.responseText;
      } catch (I3) {
        if (A2 = V2(A2)) return j2(A2);
        throw I3;
      }
    }, t && (g3.readBinary = function(A2) {
      try {
        var I2 = new XMLHttpRequest();
        return I2.open("GET", A2, false), I2.responseType = "arraybuffer", I2.send(null), new Uint8Array(I2.response);
      } catch (I3) {
        if (A2 = V2(A2)) return A2;
        throw I3;
      }
    }), g3.readAsync = function(A2, I2, i3) {
      var g4 = new XMLHttpRequest();
      g4.open("GET", A2, true), g4.responseType = "arraybuffer", g4.onload = function() {
        if (200 == g4.status || 0 == g4.status && g4.response) I2(g4.response);
        else {
          var C3 = V2(A2);
          C3 ? I2(C3.buffer) : i3();
        }
      }, g4.onerror = i3, g4.send(null);
    }, g3.setWindowTitle = function(A2) {
      document.title = A2;
    });
    var f2 = g3.print || ("undefined" != typeof console ? console.log.bind(console) : "undefined" != typeof print ? print : null), E2 = g3.printErr || ("undefined" != typeof printErr ? printErr : "undefined" != typeof console && console.warn.bind(console) || f2);
    for (r3 in o2) o2.hasOwnProperty(r3) && (g3[r3] = o2[r3]);
    o2 = void 0;
    var w2 = { "f64-rem": function(A2, I2) {
      return A2 % I2;
    }, debugger: function() {
    } };
    "object" != typeof WebAssembly && E2("no native wasm support detected");
    var u2, s2 = false;
    function c2(A2, I2) {
      A2 || $3("Assertion failed: " + I2);
    }
    function l2(A2) {
      var I2 = g3["_" + A2];
      return c2(I2, "Cannot call unknown function " + A2 + ", make sure it is exported"), I2;
    }
    function S2(A2, I2, i3, g4) {
      var C3 = { string: function(A3) {
        var I3 = 0;
        if (null != A3 && 0 !== A3) {
          var i4 = 1 + (A3.length << 2), g5 = I3 = q2(i4), C4 = y;
          if (0 < i4) {
            i4 = g5 + i4 - 1;
            for (var r5 = 0; r5 < A3.length; ++r5) {
              var o4 = A3.charCodeAt(r5);
              if (55296 <= o4 && 57343 >= o4 && (o4 = 65536 + ((1023 & o4) << 10) | 1023 & A3.charCodeAt(++r5)), 127 >= o4) {
                if (g5 >= i4) break;
                C4[g5++] = o4;
              } else {
                if (2047 >= o4) {
                  if (g5 + 1 >= i4) break;
                  C4[g5++] = 192 | o4 >> 6;
                } else {
                  if (65535 >= o4) {
                    if (g5 + 2 >= i4) break;
                    C4[g5++] = 224 | o4 >> 12;
                  } else {
                    if (g5 + 3 >= i4) break;
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
      }, array: function(A3) {
        var I3 = q2(A3.length);
        return G2.set(A3, I3), I3;
      } }, r4 = l2(A2), o3 = [];
      if (A2 = 0, g4) for (var n3 = 0; n3 < g4.length; n3++) {
        var t2 = C3[i3[n3]];
        t2 ? (0 === A2 && (A2 = W2()), o3[n3] = t2(g4[n3])) : o3[n3] = g4[n3];
      }
      return i3 = (function(A3) {
        if ("string" === I2) if (A3) {
          for (var i4 = y, g5 = A3 + void 0, C4 = A3; i4[C4] && !(C4 >= g5); ) ++C4;
          if (16 < C4 - A3 && i4.subarray && F2) A3 = F2.decode(i4.subarray(A3, C4));
          else {
            for (g5 = ""; A3 < C4; ) {
              var r5 = i4[A3++];
              if (128 & r5) {
                var o4 = 63 & i4[A3++];
                if (192 == (224 & r5)) g5 += String.fromCharCode((31 & r5) << 6 | o4);
                else {
                  var n4 = 63 & i4[A3++];
                  65536 > (r5 = 224 == (240 & r5) ? (15 & r5) << 12 | o4 << 6 | n4 : (7 & r5) << 18 | o4 << 12 | n4 << 6 | 63 & i4[A3++]) ? g5 += String.fromCharCode(r5) : (r5 -= 65536, g5 += String.fromCharCode(55296 | r5 >> 10, 56320 | 1023 & r5));
                }
              } else g5 += String.fromCharCode(r5);
            }
            A3 = g5;
          }
        } else A3 = "";
        else A3 = "boolean" === I2 ? !!A3 : A3;
        return A3;
      })(i3 = r4.apply(null, o3)), 0 !== A2 && T2(A2), i3;
    }
    var F2 = "undefined" != typeof TextDecoder ? new TextDecoder("utf8") : void 0;
    "undefined" != typeof TextDecoder && new TextDecoder("utf-16le");
    var U2, G2, y, D2, d2 = g3.TOTAL_MEMORY || 16777216;
    function k2(A2) {
      for (; 0 < A2.length; ) {
        var I2 = A2.shift();
        if ("function" == typeof I2) I2();
        else {
          var i3 = I2.h;
          "number" == typeof i3 ? void 0 === I2.g ? g3.dynCall_v(i3) : g3.dynCall_vi(i3, I2.g) : i3(void 0 === I2.g ? null : I2.g);
        }
      }
    }
    5242880 > d2 && E2("TOTAL_MEMORY should be larger than TOTAL_STACK, was " + d2 + "! (TOTAL_STACK=5242880)"), g3.buffer ? U2 = g3.buffer : (U2 = "object" == typeof WebAssembly && "function" == typeof WebAssembly.Memory ? (u2 = new WebAssembly.Memory({ initial: d2 / 65536, maximum: d2 / 65536 })).buffer : new ArrayBuffer(d2), g3.buffer = U2), g3.HEAP8 = G2 = new Int8Array(U2), g3.HEAP16 = new Int16Array(U2), g3.HEAP32 = D2 = new Int32Array(U2), g3.HEAPU8 = y = new Uint8Array(U2), g3.HEAPU16 = new Uint16Array(U2), g3.HEAPU32 = new Uint32Array(U2), g3.HEAPF32 = new Float32Array(U2), g3.HEAPF64 = new Float64Array(U2), D2[724] = 5246032;
    var H2 = [], p = [], v2 = [], Y = [], M = false;
    function K() {
      var A2 = g3.preRun.shift();
      H2.unshift(A2);
    }
    var b = 0, x2 = null;
    g3.preloadedImages = {}, g3.preloadedAudios = {};
    var m2 = "data:application/octet-stream;base64,";
    function N2(A2) {
      return String.prototype.startsWith ? A2.startsWith(m2) : 0 === A2.indexOf(m2);
    }
    var L2 = "data:application/octet-stream;base64,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NCAAIAM2AjggACADNgI8IABBQGshAAwBCwsDQCAAIAVIBEAgACADNgIAIABBBGohAAwBCwsLA0AgACAESARAIAAgAToAACAAQQFqIQAMAQsLIAQgAmsLxgMBA38gAkGAwABOBEAgACABIAIQABogAA8LIAAhBCAAIAJqIQMgAEEDcSABQQNxRgRAA0AgAEEDcQRAIAJFBEAgBA8LIAAgASwAADoAACAAQQFqIQAgAUEBaiEBIAJBAWshAgwBCwsgA0F8cSICQUBqIQUDQCAAIAVMBEAgACABKAIANgIAIAAgASgCBDYCBCAAIAEoAgg2AgggACABKAIMNgIMIAAgASgCEDYCECAAIAEoAhQ2AhQgACABKAIYNgIYIAAgASgCHDYCHCAAIAEoAiA2AiAgACABKAIkNgIkIAAgASgCKDYCKCAAIAEoAiw2AiwgACABKAIwNgIwIAAgASgCNDYCNCAAIAEoAjg2AjggACABKAI8NgI8IABBQGshACABQUBrIQEMAQsLA0AgACACSARAIAAgASgCADYCACAAQQRqIQAgAUEEaiEBDAELCwUgA0EEayECA0AgACACSARAIAAgASwAADoAACAAIAEsAAE6AAEgACABLAACOgACIAAgASwAAzoAAyAAQQRqIQAgAUEEaiEBDAELCwsDQCAAIANIBEAgACABLAAAOgAAIABBAWohACABQQFqIQEMAQsLIAQLBwAgABAMpwuNAQEDfwJAAkAgACICQQNxRQ0AIAIiASEAAkADQCABLAAARQ0BIAFBAWoiASIAQQNxDQALIAEhAAwBCwwBCwNAIABBBGohASAAKAIAIgNB//37d2ogA0GAgYKEeHFBgIGChHhzcUUEQCABIQAMAQsLIANB/wFxBEADQCAAQQFqIgAsAAANAAsLCyAAIAJrC+wFAgR/AX4DQCAAKAIEIgEgACgCZEkEfyAAIAFBAWo2AgQgAS0AAAUgABACCyIBIgNBIEYgA0F3akEFSXINAAsCQAJAIAFBK2sOAwABAAELIAFBLUZBH3RBH3UhBCAAKAIEIgEgACgCZEkEfyAAIAFBAWo2AgQgAS0AAAUgABACCyEBCwJ+An8CQAJAIAFBMEYEfiAAKAIEIgEgACgCZEkEfyAAIAFBAWo2AgQgAS0AAAUgABACCyIBQSByQfgARwRAIAFBkQhqLAAAIgNB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aiwAADoAAEG2CiABQf8BcUEEdkGACGosAAA6AABBtwogAUEPcUGACGosAAA6AABBuAogAkH/AXFBBHZBgAhqLAAAOgAAQbkKIAJBD3FBgAhqLAAAOgAAQboKIANB/wFxQQR2QYAIaiwAADoAAEG7CiADQQ9xQYAIaiwAADoAAEG8CiAJQf8BcUEEdkGACGosAAA6AABBvQogCUEPcUGACGosAAA6AABBvgogBUH/AXFBBHZBgAhqLAAAOgAAQb8KIAVBD3FBgAhqLAAAOgAAQcAKIAhB/wFxQQR2QYAIaiwAADoAAEHBCiAIQQ9xQYAIaiwAADoAAEHCCkEAOgAAIAckAUGwCgsGACAAJAELCABBABABQQALcAIBfwJ+IwEhASMBQYABaiQBIAFBADYCACABIAA2AgQgASAANgIsIAFBfyAAQf////8HaiAAQQBIGzYCCCABQX82AkwgAUEANgJoIAEgASgCCCIAIAEoAgRrNgJsIAEgADYCZCABEAghAyABJAEgAwuLAQECfyAAIAAsAEoiASABQf8BanI6AEogACgCFCAAKAIcSwRAIAAoAiQhASAAQQBBACABQQFxEQAAGgsgAEEANgIQIABBADYCHCAAQQA2AhQgACgCACIBQQRxBH8gACABQSByNgIAQX8FIAAgACgCLCAAKAIwaiICNgIIIAAgAjYCBCABQRt0QR91CwtEAQN/IwEhASMBQRBqJAEgABANBH9BfwUgACgCICECIAAgAUEBIAJBAXERAABBAUYEfyABLQAABUF/CwshAyABJAEgAwsEACMBCxsBAn8jASECIAAjAWokASMBQQ9qQXBxJAEgAgsLoAICAEGACAuRAjAxMjM0NTY3ODlhYmNkZWb/////////////////////////////////////////////////////////////////AAECAwQFBgcICf////////8KCwwNDg8QERITFBUWFxgZGhscHR4fICEiI////////woLDA0ODxAREhMUFRYXGBkaGxwdHh8gISIj/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////wBBoAoLAQE=";
    if (!N2(L2)) {
      var R2 = L2;
      L2 = g3.locateFile ? g3.locateFile(R2, B2) : B2 + R2;
    }
    function J2() {
      try {
        if (g3.wasmBinary) return new Uint8Array(g3.wasmBinary);
        var A2 = V2(L2);
        if (A2) return A2;
        if (g3.readBinary) return g3.readBinary(L2);
        throw "both async and sync fetching of the wasm failed";
      } catch (A3) {
        $3(A3);
      }
    }
    function P2() {
      return g3.wasmBinary || !n2 && !t || "function" != typeof fetch ? new Promise((function(A2) {
        A2(J2());
      })) : fetch(L2, { credentials: "same-origin" }).then((function(A2) {
        if (!A2.ok) throw "failed to load wasm binary file at '" + L2 + "'";
        return A2.arrayBuffer();
      })).catch((function() {
        return J2();
      }));
    }
    function X2(A2) {
      function I2(A3) {
        g3.asm = A3.exports, b--, g3.monitorRunDependencies && g3.monitorRunDependencies(b), 0 == b && x2 && (A3 = x2, x2 = null, A3());
      }
      function i3(A3) {
        I2(A3.instance);
      }
      function C3(A3) {
        P2().then((function(A4) {
          return WebAssembly.instantiate(A4, r4);
        })).then(A3, (function(A4) {
          E2("failed to asynchronously prepare wasm: " + A4), $3(A4);
        }));
      }
      var r4 = { env: A2, global: { NaN: NaN, Infinity: 1 / 0 }, "global.Math": Math, asm2wasm: w2 };
      if (b++, g3.monitorRunDependencies && g3.monitorRunDependencies(b), g3.instantiateWasm) try {
        return g3.instantiateWasm(r4, I2);
      } catch (A3) {
        return E2("Module.instantiateWasm callback failed with error: " + A3), false;
      }
      return g3.wasmBinary || "function" != typeof WebAssembly.instantiateStreaming || N2(L2) || "function" != typeof fetch ? C3(i3) : WebAssembly.instantiateStreaming(fetch(L2, { credentials: "same-origin" }), r4).then(i3, (function(A3) {
        E2("wasm streaming compile failed: " + A3), E2("falling back to ArrayBuffer instantiation"), C3(i3);
      })), {};
    }
    function j2(A2) {
      for (var I2 = [], i3 = 0; i3 < A2.length; i3++) {
        var g4 = A2[i3];
        255 < g4 && (g4 &= 255), I2.push(String.fromCharCode(g4));
      }
      return I2.join("");
    }
    g3.asm = function(A2, I2) {
      return I2.memory = u2, I2.table = new WebAssembly.Table({ initial: 2, maximum: 2, element: "anyfunc" }), I2.__memory_base = 1024, I2.__table_base = 0, X2(I2);
    };
    var O2 = "function" == typeof atob ? atob : function(A2) {
      var I2 = "", i3 = 0;
      A2 = A2.replace(/[^A-Za-z0-9\+\/=]/g, "");
      do {
        var g4 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=".indexOf(A2.charAt(i3++)), C3 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=".indexOf(A2.charAt(i3++)), r4 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=".indexOf(A2.charAt(i3++)), o3 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=".indexOf(A2.charAt(i3++));
        g4 = g4 << 2 | C3 >> 4, C3 = (15 & C3) << 4 | r4 >> 2;
        var n3 = (3 & r4) << 6 | o3;
        I2 += String.fromCharCode(g4), 64 !== r4 && (I2 += String.fromCharCode(C3)), 64 !== o3 && (I2 += String.fromCharCode(n3));
      } while (i3 < A2.length);
      return I2;
    };
    function V2(A2) {
      if (N2(A2)) {
        if (A2 = A2.slice(m2.length), "boolean" == typeof h && h) {
          try {
            var I2 = import_buffer.Buffer.from(A2, "base64");
          } catch (i4) {
            I2 = new import_buffer.Buffer(A2, "base64");
          }
          var i3 = new Uint8Array(I2.buffer, I2.byteOffset, I2.byteLength);
        } else try {
          var g4 = O2(A2), C3 = new Uint8Array(g4.length);
          for (I2 = 0; I2 < g4.length; ++I2) C3[I2] = g4.charCodeAt(I2);
          i3 = C3;
        } catch (A3) {
          throw Error("Converting base64 string to bytes failed.");
        }
        return i3;
      }
    }
    var Z2 = g3.asm({}, { b: $3, a: function(A2, I2, i3) {
      y.set(y.subarray(I2, I2 + i3), A2);
    } }, U2);
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
    function z2(A2) {
      this.name = "ExitStatus", this.message = "Program terminated with exit(" + A2 + ")", this.status = A2;
    }
    function _2() {
      function A2() {
        if (!g3.calledRun && (g3.calledRun = true, !s2)) {
          if (M || (M = true, k2(p)), k2(v2), g3.onRuntimeInitialized && g3.onRuntimeInitialized(), g3.postRun) for ("function" == typeof g3.postRun && (g3.postRun = [g3.postRun]); g3.postRun.length; ) {
            var A3 = g3.postRun.shift();
            Y.unshift(A3);
          }
          k2(Y);
        }
      }
      if (!(0 < b)) {
        if (g3.preRun) for ("function" == typeof g3.preRun && (g3.preRun = [g3.preRun]); g3.preRun.length; ) K();
        k2(H2), 0 < b || g3.calledRun || (g3.setStatus ? (g3.setStatus("Running..."), setTimeout((function() {
          setTimeout((function() {
            g3.setStatus("");
          }), 1), A2();
        }), 1)) : A2());
      }
    }
    function $3(A2) {
      throw g3.onAbort && g3.onAbort(A2), void 0 !== A2 ? (f2(A2), E2(A2), A2 = JSON.stringify(A2)) : A2 = "", s2 = true, "abort(" + A2 + "). Build with -s ASSERTIONS=1 for more info.";
    }
    if (g3.asm = Z2, g3.cwrap = function(A2, I2, i3, g4) {
      var C3 = (i3 = i3 || []).every((function(A3) {
        return "number" === A3;
      }));
      return "string" !== I2 && C3 && !g4 ? l2(A2) : function() {
        return S2(A2, I2, i3, arguments);
      };
    }, g3.then = function(A2) {
      if (g3.calledRun) A2(g3);
      else {
        var I2 = g3.onRuntimeInitialized;
        g3.onRuntimeInitialized = function() {
          I2 && I2(), A2(g3);
        };
      }
      return g3;
    }, z2.prototype = Error(), z2.prototype.constructor = z2, x2 = function A2() {
      g3.calledRun || _2(), g3.calledRun || (x2 = A2);
    }, g3.run = _2, g3.abort = $3, g3.preInit) for ("function" == typeof g3.preInit && (g3.preInit = [g3.preInit]); 0 < g3.preInit.length; ) g3.preInit.pop()();
    return g3.noExitRuntime = true, _2(), i2;
  });
  i.exports = r2;
}));
if ("[object process]" === Object.prototype.toString.call("undefined" != typeof process ? process : 0)) {
  Q = require_util2().promisify;
  e = Q(require_crypto().randomFill);
} else e = function(A2) {
  return new Promise((function(I2) {
    crypto.getRandomValues(A2), I2();
  }));
};
var Q;
function B(A2) {
  if (!A2) return "";
  for (var I2 = "", i = 0; i < A2.length; i++) {
    var g2 = (255 & A2[i]).toString(16);
    I2 += g2 = 1 === g2.length ? "0" + g2 : g2;
  }
  return I2.toUpperCase();
}
function f(A2) {
  if (!A2) return new Uint8Array();
  for (var I2 = [], i = 0; i < A2.length; i += 2) I2.push(parseInt(A2.substr(i, 2), 16));
  return new Uint8Array(I2);
}
var E = "13456789abcdefghijkmnopqrstuwxyz";
function w(A2) {
  for (var I2 = A2.length, i = 8 * I2 % 5, g2 = 0 === i ? 0 : 5 - i, C2 = 0, r2 = "", o2 = 0, n2 = 0; n2 < I2; n2++) for (C2 = C2 << 8 | A2[n2], o2 += 8; o2 >= 5; ) r2 += E[C2 >>> o2 + g2 - 5 & 31], o2 -= 5;
  return o2 > 0 && (r2 += E[C2 << 5 - (o2 + g2) & 31]), r2;
}
function u(A2) {
  var I2 = E.indexOf(A2);
  if (-1 === I2) throw new Error("Invalid character found: " + A2);
  return I2;
}
function s(A2) {
  for (var I2 = A2.length, i = 5 * I2 % 8, g2 = 0 === i ? 0 : 8 - i, C2 = 0, r2 = 0, o2 = 0, n2 = new Uint8Array(Math.ceil(5 * I2 / 8)), t = 0; t < I2; t++) r2 = r2 << 5 | u(A2[t]), (C2 += 5) >= 8 && (n2[o2++] = r2 >>> C2 + g2 - 8 & 255, C2 -= 8);
  return C2 > 0 && (n2[o2++] = r2 << C2 + g2 - 8 & 255), 0 !== i && (n2 = n2.slice(1)), n2;
}
function c(A2) {
  var I2, i = { valid: false, publicKeyBytes: null };
  if (!F(A2) || !/^(xrb_|nano_)[13][13-9a-km-uw-z]{59}$/.test(A2)) return i;
  I2 = A2.startsWith("xrb_") ? 4 : 5;
  var g2 = s(A2.substr(I2, 52));
  return (function(A3, I3) {
    for (var i2 = 0; i2 < A3.length; i2++) if (A3[i2] !== I3[i2]) return false;
    return true;
  })(s(A2.substr(I2 + 52)), (0, import_blakejs.blake2b)(g2, null, 5).reverse()) ? { publicKeyBytes: g2, valid: true } : i;
}
var l = Math.pow(2, 32) - 1;
var S = new bignumber_default("0xffffffffffffffffffffffffffffffff");
function F(A2) {
  return "string" == typeof A2;
}
function U(A2) {
  return "0" === A2 || !(!F(A2) || !/^[1-9]{1}[0-9]{0,38}$/.test(A2)) && new bignumber_default(A2).isLessThanOrEqualTo(S);
}
function G(A2) {
  return F(A2) && /^[0-9a-fA-F]{64}$/.test(A2);
}
function D(A2) {
  return Number.isInteger(A2) && A2 >= 0 && A2 <= l;
}
function d(A2) {
  return G(A2);
}
function k(A2) {
  return G(A2);
}
function H(A2) {
  return c(A2).valid;
}
function v(A2) {
  return F(A2) && /^[0-9a-fA-F]{128}$/.test(A2);
}
var x = function(A2) {
  var I2 = new Float64Array(16);
  if (A2) for (var i = 0; i < A2.length; i++) I2[i] = A2[i];
  return I2;
};
new Uint8Array(32)[0] = 9;
var m = x();
var N = x([1]);
var L = x([30883, 4953, 19914, 30187, 55467, 16705, 2637, 112, 59544, 30585, 16505, 36039, 65139, 11119, 27886, 20995]);
var R = x([61785, 9906, 39828, 60374, 45398, 33411, 5274, 224, 53552, 61171, 33010, 6542, 64743, 22239, 55772, 9222]);
var J = x([54554, 36645, 11616, 51542, 42930, 38181, 51040, 26924, 56412, 64982, 57905, 49316, 21502, 52590, 14035, 8553]);
var P = x([26200, 26214, 26214, 26214, 26214, 26214, 26214, 26214, 26214, 26214, 26214, 26214, 26214, 26214, 26214, 26214]);
var X = x([41136, 18958, 6951, 50414, 58488, 44335, 6150, 12099, 55207, 15867, 153, 11085, 57099, 20417, 9344, 11139]);
function j(A2, I2, i, g2) {
  return (function(A3, I3, i2, g3, C2) {
    for (var r2 = 0, o2 = 0; o2 < C2; o2++) r2 |= A3[I3 + o2] ^ i2[g3 + o2];
    return (1 & r2 - 1 >>> 8) - 1;
  })(A2, I2, i, g2, 32);
}
function O(A2, I2) {
  var i;
  for (i = 0; i < 16; i++) A2[i] = 0 | I2[i];
}
function V(A2) {
  for (var I2, i = 1, g2 = 0; g2 < 16; g2++) I2 = A2[g2] + i + 65535, i = Math.floor(I2 / 65536), A2[g2] = I2 - 65536 * i;
  A2[0] += i - 1 + 37 * (i - 1);
}
function Z(A2, I2, i) {
  for (var g2, C2 = ~(i - 1), r2 = 0; r2 < 16; r2++) g2 = C2 & (A2[r2] ^ I2[r2]), A2[r2] ^= g2, I2[r2] ^= g2;
}
function q(A2, I2) {
  for (var i, g2 = x(), C2 = x(), r2 = 0; r2 < 16; r2++) C2[r2] = I2[r2];
  V(C2), V(C2), V(C2);
  for (var o2 = 0; o2 < 2; o2++) {
    g2[0] = C2[0] - 65517;
    for (r2 = 1; r2 < 15; r2++) g2[r2] = C2[r2] - 65535 - (g2[r2 - 1] >> 16 & 1), g2[r2 - 1] &= 65535;
    g2[15] = C2[15] - 32767 - (g2[14] >> 16 & 1), i = g2[15] >> 16 & 1, g2[14] &= 65535, Z(C2, g2, 1 - i);
  }
  for (r2 = 0; r2 < 16; r2++) A2[2 * r2] = 255 & C2[r2], A2[2 * r2 + 1] = C2[r2] >> 8;
}
function T(A2, I2) {
  var i = new Uint8Array(32), g2 = new Uint8Array(32);
  return q(i, A2), q(g2, I2), j(i, 0, g2, 0);
}
function W(A2) {
  var I2 = new Uint8Array(32);
  return q(I2, A2), 1 & I2[0];
}
function z(A2, I2, i) {
  for (var g2 = 0; g2 < 16; g2++) A2[g2] = I2[g2] + i[g2];
}
function _(A2, I2, i) {
  for (var g2 = 0; g2 < 16; g2++) A2[g2] = I2[g2] - i[g2];
}
function $(A2, I2, i) {
  var g2, C2, r2 = 0, o2 = 0, n2 = 0, t = 0, h = 0, e2 = 0, a2 = 0, Q = 0, B2 = 0, f2 = 0, E2 = 0, w2 = 0, u2 = 0, s2 = 0, c2 = 0, l2 = 0, S2 = 0, F2 = 0, U2 = 0, G2 = 0, y = 0, D2 = 0, d2 = 0, k2 = 0, H2 = 0, p = 0, v2 = 0, Y = 0, M = 0, K = 0, b = 0, x2 = i[0], m2 = i[1], N2 = i[2], L2 = i[3], R2 = i[4], J2 = i[5], P2 = i[6], X2 = i[7], j2 = i[8], O2 = i[9], V2 = i[10], Z2 = i[11], q2 = i[12], T2 = i[13], W2 = i[14], z2 = i[15];
  r2 += (g2 = I2[0]) * x2, o2 += g2 * m2, n2 += g2 * N2, t += g2 * L2, h += g2 * R2, e2 += g2 * J2, a2 += g2 * P2, Q += g2 * X2, B2 += g2 * j2, f2 += g2 * O2, E2 += g2 * V2, w2 += g2 * Z2, u2 += g2 * q2, s2 += g2 * T2, c2 += g2 * W2, l2 += g2 * z2, o2 += (g2 = I2[1]) * x2, n2 += g2 * m2, t += g2 * N2, h += g2 * L2, e2 += g2 * R2, a2 += g2 * J2, Q += g2 * P2, B2 += g2 * X2, f2 += g2 * j2, E2 += g2 * O2, w2 += g2 * V2, u2 += g2 * Z2, s2 += g2 * q2, c2 += g2 * T2, l2 += g2 * W2, S2 += g2 * z2, n2 += (g2 = I2[2]) * x2, t += g2 * m2, h += g2 * N2, e2 += g2 * L2, a2 += g2 * R2, Q += g2 * J2, B2 += g2 * P2, f2 += g2 * X2, E2 += g2 * j2, w2 += g2 * O2, u2 += g2 * V2, s2 += g2 * Z2, c2 += g2 * q2, l2 += g2 * T2, S2 += g2 * W2, F2 += g2 * z2, t += (g2 = I2[3]) * x2, h += g2 * m2, e2 += g2 * N2, a2 += g2 * L2, Q += g2 * R2, B2 += g2 * J2, f2 += g2 * P2, E2 += g2 * X2, w2 += g2 * j2, u2 += g2 * O2, s2 += g2 * V2, c2 += g2 * Z2, l2 += g2 * q2, S2 += g2 * T2, F2 += g2 * W2, U2 += g2 * z2, h += (g2 = I2[4]) * x2, e2 += g2 * m2, a2 += g2 * N2, Q += g2 * L2, B2 += g2 * R2, f2 += g2 * J2, E2 += g2 * P2, w2 += g2 * X2, u2 += g2 * j2, s2 += g2 * O2, c2 += g2 * V2, l2 += g2 * Z2, S2 += g2 * q2, F2 += g2 * T2, U2 += g2 * W2, G2 += g2 * z2, e2 += (g2 = I2[5]) * x2, a2 += g2 * m2, Q += g2 * N2, B2 += g2 * L2, f2 += g2 * R2, E2 += g2 * J2, w2 += g2 * P2, u2 += g2 * X2, s2 += g2 * j2, c2 += g2 * O2, l2 += g2 * V2, S2 += g2 * Z2, F2 += g2 * q2, U2 += g2 * T2, G2 += g2 * W2, y += g2 * z2, a2 += (g2 = I2[6]) * x2, Q += g2 * m2, B2 += g2 * N2, f2 += g2 * L2, E2 += g2 * R2, w2 += g2 * J2, u2 += g2 * P2, s2 += g2 * X2, c2 += g2 * j2, l2 += g2 * O2, S2 += g2 * V2, F2 += g2 * Z2, U2 += g2 * q2, G2 += g2 * T2, y += g2 * W2, D2 += g2 * z2, Q += (g2 = I2[7]) * x2, B2 += g2 * m2, f2 += g2 * N2, E2 += g2 * L2, w2 += g2 * R2, u2 += g2 * J2, s2 += g2 * P2, c2 += g2 * X2, l2 += g2 * j2, S2 += g2 * O2, F2 += g2 * V2, U2 += g2 * Z2, G2 += g2 * q2, y += g2 * T2, D2 += g2 * W2, d2 += g2 * z2, B2 += (g2 = I2[8]) * x2, f2 += g2 * m2, E2 += g2 * N2, w2 += g2 * L2, u2 += g2 * R2, s2 += g2 * J2, c2 += g2 * P2, l2 += g2 * X2, S2 += g2 * j2, F2 += g2 * O2, U2 += g2 * V2, G2 += g2 * Z2, y += g2 * q2, D2 += g2 * T2, d2 += g2 * W2, k2 += g2 * z2, f2 += (g2 = I2[9]) * x2, E2 += g2 * m2, w2 += g2 * N2, u2 += g2 * L2, s2 += g2 * R2, c2 += g2 * J2, l2 += g2 * P2, S2 += g2 * X2, F2 += g2 * j2, U2 += g2 * O2, G2 += g2 * V2, y += g2 * Z2, D2 += g2 * q2, d2 += g2 * T2, k2 += g2 * W2, H2 += g2 * z2, E2 += (g2 = I2[10]) * x2, w2 += g2 * m2, u2 += g2 * N2, s2 += g2 * L2, c2 += g2 * R2, l2 += g2 * J2, S2 += g2 * P2, F2 += g2 * X2, U2 += g2 * j2, G2 += g2 * O2, y += g2 * V2, D2 += g2 * Z2, d2 += g2 * q2, k2 += g2 * T2, H2 += g2 * W2, p += g2 * z2, w2 += (g2 = I2[11]) * x2, u2 += g2 * m2, s2 += g2 * N2, c2 += g2 * L2, l2 += g2 * R2, S2 += g2 * J2, F2 += g2 * P2, U2 += g2 * X2, G2 += g2 * j2, y += g2 * O2, D2 += g2 * V2, d2 += g2 * Z2, k2 += g2 * q2, H2 += g2 * T2, p += g2 * W2, v2 += g2 * z2, u2 += (g2 = I2[12]) * x2, s2 += g2 * m2, c2 += g2 * N2, l2 += g2 * L2, S2 += g2 * R2, F2 += g2 * J2, U2 += g2 * P2, G2 += g2 * X2, y += g2 * j2, D2 += g2 * O2, d2 += g2 * V2, k2 += g2 * Z2, H2 += g2 * q2, p += g2 * T2, v2 += g2 * W2, Y += g2 * z2, s2 += (g2 = I2[13]) * x2, c2 += g2 * m2, l2 += g2 * N2, S2 += g2 * L2, F2 += g2 * R2, U2 += g2 * J2, G2 += g2 * P2, y += g2 * X2, D2 += g2 * j2, d2 += g2 * O2, k2 += g2 * V2, H2 += g2 * Z2, p += g2 * q2, v2 += g2 * T2, Y += g2 * W2, M += g2 * z2, c2 += (g2 = I2[14]) * x2, l2 += g2 * m2, S2 += g2 * N2, F2 += g2 * L2, U2 += g2 * R2, G2 += g2 * J2, y += g2 * P2, D2 += g2 * X2, d2 += g2 * j2, k2 += g2 * O2, H2 += g2 * V2, p += g2 * Z2, v2 += g2 * q2, Y += g2 * T2, M += g2 * W2, K += g2 * z2, l2 += (g2 = I2[15]) * x2, o2 += 38 * (F2 += g2 * N2), n2 += 38 * (U2 += g2 * L2), t += 38 * (G2 += g2 * R2), h += 38 * (y += g2 * J2), e2 += 38 * (D2 += g2 * P2), a2 += 38 * (d2 += g2 * X2), Q += 38 * (k2 += g2 * j2), B2 += 38 * (H2 += g2 * O2), f2 += 38 * (p += g2 * V2), E2 += 38 * (v2 += g2 * Z2), w2 += 38 * (Y += g2 * q2), u2 += 38 * (M += g2 * T2), s2 += 38 * (K += g2 * W2), c2 += 38 * (b += g2 * z2), r2 = (g2 = (r2 += 38 * (S2 += g2 * m2)) + (C2 = 1) + 65535) - 65536 * (C2 = Math.floor(g2 / 65536)), o2 = (g2 = o2 + C2 + 65535) - 65536 * (C2 = Math.floor(g2 / 65536)), n2 = (g2 = n2 + C2 + 65535) - 65536 * (C2 = Math.floor(g2 / 65536)), t = (g2 = t + C2 + 65535) - 65536 * (C2 = Math.floor(g2 / 65536)), h = (g2 = h + C2 + 65535) - 65536 * (C2 = Math.floor(g2 / 65536)), e2 = (g2 = e2 + C2 + 65535) - 65536 * (C2 = Math.floor(g2 / 65536)), a2 = (g2 = a2 + C2 + 65535) - 65536 * (C2 = Math.floor(g2 / 65536)), Q = (g2 = Q + C2 + 65535) - 65536 * (C2 = Math.floor(g2 / 65536)), B2 = (g2 = B2 + C2 + 65535) - 65536 * (C2 = Math.floor(g2 / 65536)), f2 = (g2 = f2 + C2 + 65535) - 65536 * (C2 = Math.floor(g2 / 65536)), E2 = (g2 = E2 + C2 + 65535) - 65536 * (C2 = Math.floor(g2 / 65536)), w2 = (g2 = w2 + C2 + 65535) - 65536 * (C2 = Math.floor(g2 / 65536)), u2 = (g2 = u2 + C2 + 65535) - 65536 * (C2 = Math.floor(g2 / 65536)), s2 = (g2 = s2 + C2 + 65535) - 65536 * (C2 = Math.floor(g2 / 65536)), c2 = (g2 = c2 + C2 + 65535) - 65536 * (C2 = Math.floor(g2 / 65536)), l2 = (g2 = l2 + C2 + 65535) - 65536 * (C2 = Math.floor(g2 / 65536)), r2 = (g2 = (r2 += C2 - 1 + 37 * (C2 - 1)) + (C2 = 1) + 65535) - 65536 * (C2 = Math.floor(g2 / 65536)), o2 = (g2 = o2 + C2 + 65535) - 65536 * (C2 = Math.floor(g2 / 65536)), n2 = (g2 = n2 + C2 + 65535) - 65536 * (C2 = Math.floor(g2 / 65536)), t = (g2 = t + C2 + 65535) - 65536 * (C2 = Math.floor(g2 / 65536)), h = (g2 = h + C2 + 65535) - 65536 * (C2 = Math.floor(g2 / 65536)), e2 = (g2 = e2 + C2 + 65535) - 65536 * (C2 = Math.floor(g2 / 65536)), a2 = (g2 = a2 + C2 + 65535) - 65536 * (C2 = Math.floor(g2 / 65536)), Q = (g2 = Q + C2 + 65535) - 65536 * (C2 = Math.floor(g2 / 65536)), B2 = (g2 = B2 + C2 + 65535) - 65536 * (C2 = Math.floor(g2 / 65536)), f2 = (g2 = f2 + C2 + 65535) - 65536 * (C2 = Math.floor(g2 / 65536)), E2 = (g2 = E2 + C2 + 65535) - 65536 * (C2 = Math.floor(g2 / 65536)), w2 = (g2 = w2 + C2 + 65535) - 65536 * (C2 = Math.floor(g2 / 65536)), u2 = (g2 = u2 + C2 + 65535) - 65536 * (C2 = Math.floor(g2 / 65536)), s2 = (g2 = s2 + C2 + 65535) - 65536 * (C2 = Math.floor(g2 / 65536)), c2 = (g2 = c2 + C2 + 65535) - 65536 * (C2 = Math.floor(g2 / 65536)), l2 = (g2 = l2 + C2 + 65535) - 65536 * (C2 = Math.floor(g2 / 65536)), r2 += C2 - 1 + 37 * (C2 - 1), A2[0] = r2, A2[1] = o2, A2[2] = n2, A2[3] = t, A2[4] = h, A2[5] = e2, A2[6] = a2, A2[7] = Q, A2[8] = B2, A2[9] = f2, A2[10] = E2, A2[11] = w2, A2[12] = u2, A2[13] = s2, A2[14] = c2, A2[15] = l2;
}
function AA(A2, I2) {
  $(A2, I2, I2);
}
function IA(A2, I2, i) {
  for (var C2 = new Uint8Array(i), r2 = 0; r2 < i; ++r2) C2[r2] = I2[r2];
  var o2 = import_blakejs.default.blake2b(C2);
  for (r2 = 0; r2 < 64; ++r2) A2[r2] = o2[r2];
  return 0;
}
function iA(A2, I2) {
  var i = x(), g2 = x(), C2 = x(), r2 = x(), o2 = x(), n2 = x(), t = x(), h = x(), e2 = x();
  _(i, A2[1], A2[0]), _(e2, I2[1], I2[0]), $(i, i, e2), z(g2, A2[0], A2[1]), z(e2, I2[0], I2[1]), $(g2, g2, e2), $(C2, A2[3], I2[3]), $(C2, C2, R), $(r2, A2[2], I2[2]), z(r2, r2, r2), _(o2, g2, i), _(n2, r2, C2), z(t, r2, C2), z(h, g2, i), $(A2[0], o2, n2), $(A2[1], h, t), $(A2[2], t, n2), $(A2[3], o2, h);
}
function gA(A2, I2, i) {
  var g2;
  for (g2 = 0; g2 < 4; g2++) Z(A2[g2], I2[g2], i);
}
function CA(A2, I2) {
  var i = x(), g2 = x(), C2 = x();
  !(function(A3, I3) {
    var i2, g3 = x();
    for (i2 = 0; i2 < 16; i2++) g3[i2] = I3[i2];
    for (i2 = 253; i2 >= 0; i2--) AA(g3, g3), 2 !== i2 && 4 !== i2 && $(g3, g3, I3);
    for (i2 = 0; i2 < 16; i2++) A3[i2] = g3[i2];
  })(C2, I2[2]), $(i, I2[0], C2), $(g2, I2[1], C2), q(A2, g2), A2[31] ^= W(i) << 7;
}
function rA(A2, I2, i) {
  var g2, C2;
  for (O(A2[0], m), O(A2[1], N), O(A2[2], N), O(A2[3], m), C2 = 255; C2 >= 0; --C2) gA(A2, I2, g2 = i[C2 / 8 | 0] >> (7 & C2) & 1), iA(I2, A2), iA(A2, A2), gA(A2, I2, g2);
}
function oA(A2, I2) {
  var i = [x(), x(), x(), x()];
  O(i[0], J), O(i[1], P), O(i[2], N), $(i[3], J, P), rA(A2, i, I2);
}
var nA;
var tA = new Float64Array([237, 211, 245, 92, 26, 99, 18, 88, 214, 156, 247, 162, 222, 249, 222, 20, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 16]);
function hA(A2, I2) {
  var i, g2, C2, r2;
  for (g2 = 63; g2 >= 32; --g2) {
    for (i = 0, C2 = g2 - 32, r2 = g2 - 12; C2 < r2; ++C2) I2[C2] += i - 16 * I2[g2] * tA[C2 - (g2 - 32)], i = I2[C2] + 128 >> 8, I2[C2] -= 256 * i;
    I2[C2] += i, I2[g2] = 0;
  }
  for (i = 0, C2 = 0; C2 < 32; C2++) I2[C2] += i - (I2[31] >> 4) * tA[C2], i = I2[C2] >> 8, I2[C2] &= 255;
  for (C2 = 0; C2 < 32; C2++) I2[C2] -= i * tA[C2];
  for (g2 = 0; g2 < 32; g2++) I2[g2 + 1] += I2[g2] >> 8, A2[g2] = 255 & I2[g2];
}
function eA(A2) {
  for (var I2 = new Float64Array(64), i = 0; i < 64; i++) I2[i] = A2[i];
  for (i = 0; i < 64; i++) A2[i] = 0;
  hA(A2, I2);
}
function aA(A2) {
  var I2 = new Uint8Array(64), i = [x(), x(), x(), x()], C2 = new Uint8Array(32), r2 = import_blakejs.default.blake2bInit(64);
  return import_blakejs.default.blake2bUpdate(r2, A2), (I2 = import_blakejs.default.blake2bFinal(r2))[0] &= 248, I2[31] &= 127, I2[31] |= 64, oA(i, I2), CA(C2, i), C2;
}
function QA(A2, I2) {
  var i = x(), g2 = x(), C2 = x(), r2 = x(), o2 = x(), n2 = x(), t = x();
  return O(A2[2], N), (function(A3, I3) {
    var i2;
    for (i2 = 0; i2 < 16; i2++) A3[i2] = I3[2 * i2] + (I3[2 * i2 + 1] << 8);
    A3[15] &= 32767;
  })(A2[1], I2), AA(C2, A2[1]), $(r2, C2, L), _(C2, C2, A2[2]), z(r2, A2[2], r2), AA(o2, r2), AA(n2, o2), $(t, n2, o2), $(i, t, C2), $(i, i, r2), (function(A3, I3) {
    var i2, g3 = x();
    for (i2 = 0; i2 < 16; i2++) g3[i2] = I3[i2];
    for (i2 = 250; i2 >= 0; i2--) AA(g3, g3), 1 !== i2 && $(g3, g3, I3);
    for (i2 = 0; i2 < 16; i2++) A3[i2] = g3[i2];
  })(i, i), $(i, i, C2), $(i, i, r2), $(i, i, r2), $(A2[0], i, r2), AA(g2, A2[0]), $(g2, g2, r2), T(g2, C2) && $(A2[0], A2[0], X), AA(g2, A2[0]), $(g2, g2, r2), T(g2, C2) ? -1 : (W(A2[0]) === I2[31] >> 7 && _(A2[0], m, A2[0]), $(A2[3], A2[0], A2[1]), 0);
}
function BA(A2, I2) {
  if (32 !== I2.length) throw new Error("bad secret key size");
  var i = new Uint8Array(64 + A2.length);
  return (function(A3, I3, i2, g2) {
    var C2, r2, o2 = new Uint8Array(64), n2 = new Uint8Array(64), t = new Uint8Array(64), h = new Float64Array(64), e2 = [x(), x(), x(), x()], a2 = aA(g2);
    IA(o2, g2, 32), o2[0] &= 248, o2[31] &= 127, o2[31] |= 64;
    var Q = i2 + 64;
    for (C2 = 0; C2 < i2; C2++) A3[64 + C2] = I3[C2];
    for (C2 = 0; C2 < 32; C2++) A3[32 + C2] = o2[32 + C2];
    for (IA(t, A3.subarray(32), i2 + 32), eA(t), oA(e2, t), CA(A3, e2), C2 = 32; C2 < 64; C2++) A3[C2] = a2[C2 - 32];
    for (IA(n2, A3, i2 + 64), eA(n2), C2 = 0; C2 < 64; C2++) h[C2] = 0;
    for (C2 = 0; C2 < 32; C2++) h[C2] = t[C2];
    for (C2 = 0; C2 < 32; C2++) for (r2 = 0; r2 < 32; r2++) h[C2 + r2] += n2[C2] * o2[r2];
    hA(A3.subarray(32), h);
  })(i, A2, A2.length, I2), i;
}
function fA(A2, I2, i) {
  if (64 !== I2.length) throw new Error("bad signature size");
  if (32 !== i.length) throw new Error("bad public key size");
  var g2, C2 = new Uint8Array(64 + A2.length), r2 = new Uint8Array(64 + A2.length);
  for (g2 = 0; g2 < 64; g2++) C2[g2] = I2[g2];
  for (g2 = 0; g2 < A2.length; g2++) C2[g2 + 64] = A2[g2];
  return (function(A3, I3, i2, g3) {
    var C3, r3 = new Uint8Array(32), o2 = new Uint8Array(64), n2 = [x(), x(), x(), x()], t = [x(), x(), x(), x()];
    if (-1, i2 < 64) return -1;
    if (QA(t, g3)) return -1;
    for (C3 = 0; C3 < i2; C3++) A3[C3] = I3[C3];
    for (C3 = 0; C3 < 32; C3++) A3[C3 + 32] = g3[C3];
    if (IA(o2, A3, i2), eA(o2), rA(n2, t, o2), oA(t, I3.subarray(32)), iA(n2, t), CA(r3, n2), i2 -= 64, j(I3, 0, r3, 0)) {
      for (C3 = 0; C3 < i2; C3++) A3[C3] = 0;
      return -1;
    }
    for (C3 = 0; C3 < i2; C3++) A3[C3] = I3[C3 + 64];
    return i2;
  })(r2, C2, C2.length, i) >= 0;
}
function wA(A2, I2) {
  if (!G(A2)) throw new Error("Seed is not valid");
  if (!D(I2)) throw new Error("Index is not valid");
  var i = f(A2), g2 = new ArrayBuffer(4);
  new DataView(g2).setUint32(0, I2);
  var C2 = new Uint8Array(g2), t = (0, import_blakejs.blake2bInit)(32);
  return (0, import_blakejs.blake2bUpdate)(t, i), (0, import_blakejs.blake2bUpdate)(t, C2), B((0, import_blakejs.blake2bFinal)(t));
}
function uA(A2) {
  var I2, i = k(A2), g2 = c(A2), C2 = g2.valid;
  if (!i && !C2) throw new Error("Secret key or address is not valid");
  i ? I2 = aA(f(A2)) : I2 = g2.publicKeyBytes;
  return B(I2);
}
function sA(A2, I2) {
  if (void 0 === I2 && (I2 = {}), !k(A2)) throw new Error("Public key is not valid");
  var i = f(A2), g2 = f(A2), r2 = "xrb_";
  return true === I2.useNanoPrefix && (r2 = "nano_"), r2 + w(g2) + w((0, import_blakejs.blake2b)(i, null, 5).reverse());
}
!(function(A2) {
  A2.hex = "hex", A2.raw = "raw", A2.nano = "nano", A2.knano = "knano", A2.Nano = "Nano", A2.NANO = "NANO", A2.KNano = "KNano", A2.MNano = "MNano";
})(nA || (nA = {}));
var cA = { hex: 0, raw: 0, nano: 24, knano: 27, Nano: 30, NANO: 30, KNano: 33, MNano: 36 };
var lA = bignumber_default.clone({ EXPONENTIAL_AT: 1e9, DECIMAL_PLACES: cA.MNano });
function SA(A2, I2) {
  var i = new Error("From or to is not valid");
  if (!I2) throw i;
  var g2 = cA[I2.from], C2 = cA[I2.to];
  if (void 0 === g2 || void 0 === C2) throw new Error("From or to is not valid");
  var r2 = new Error("Value is not valid");
  if ("hex" === I2.from) {
    if (!/^[0-9a-fA-F]{32}$/.test(A2)) throw r2;
  } else if (!(function(A3) {
    if (!F(A3)) return false;
    if (A3.startsWith(".") || A3.endsWith(".")) return false;
    var I3 = A3.replace(".", "");
    if (A3.length - I3.length > 1) return false;
    for (var i2 = 0, g3 = I3; i2 < g3.length; i2++) {
      var C3 = g3[i2];
      if (C3 < "0" || C3 > "9") return false;
    }
    return true;
  })(A2)) throw r2;
  var o2, n2 = g2 - C2;
  if (o2 = "hex" === I2.from ? new lA("0x" + A2) : new lA(A2), n2 < 0) for (var t = 0; t < -n2; t++) o2 = o2.dividedBy(10);
  else if (n2 > 0) for (t = 0; t < n2; t++) o2 = o2.multipliedBy(10);
  return "hex" === I2.to ? o2.toString(16).padStart(32, "0") : o2.toString();
}
var FA = new Uint8Array(32);
function UA(A2) {
  var I2, i = f(uA(A2.account)), g2 = f(A2.previous), C2 = f(uA(A2.representative)), t = f(SA(A2.balance, { from: nA.raw, to: nA.hex }));
  I2 = H(A2.link) ? f(uA(A2.link)) : f(A2.link);
  var h = (0, import_blakejs.blake2bInit)(32);
  return (0, import_blakejs.blake2bUpdate)(h, FA), (0, import_blakejs.blake2bUpdate)(h, i), (0, import_blakejs.blake2bUpdate)(h, g2), (0, import_blakejs.blake2bUpdate)(h, C2), (0, import_blakejs.blake2bUpdate)(h, t), (0, import_blakejs.blake2bUpdate)(h, I2), B((0, import_blakejs.blake2bFinal)(h));
}
function GA(A2) {
  if (!H(A2.account)) throw new Error("Account is not valid");
  if (!d(A2.previous)) throw new Error("Previous is not valid");
  if (!H(A2.representative)) throw new Error("Representative is not valid");
  if (!U(A2.balance)) throw new Error("Balance is not valid");
  if (!H(A2.link) && !d(A2.link)) throw new Error("Link is not valid");
  return UA(A2);
}
function yA(A2) {
  if (!d(A2.hash)) throw new Error("Hash is not valid");
  if (!k(A2.secretKey)) throw new Error("Secret key is not valid");
  return B((function(A3, I2) {
    for (var i = BA(A3, I2), g2 = new Uint8Array(64), C2 = 0; C2 < g2.length; C2++) g2[C2] = i[C2];
    return g2;
  })(f(A2.hash), f(A2.secretKey)));
}
function DA(A2) {
  if (!d(A2.hash)) throw new Error("Hash is not valid");
  if (!v(A2.signature)) throw new Error("Signature is not valid");
  if (!k(A2.publicKey)) throw new Error("Public key is not valid");
  return fA(f(A2.hash), f(A2.signature), f(A2.publicKey));
}
FA[31] = 6;
var dA = "0000000000000000000000000000000000000000000000000000000000000000";
function kA(A2, I2) {
  if (!k(A2)) throw new Error("Secret key is not valid");
  if (void 0 === I2.work) throw new Error("Work is not set");
  if (!H(I2.representative)) throw new Error("Representative is not valid");
  if (!U(I2.balance)) throw new Error("Balance is not valid");
  var i;
  if (null === I2.previous) i = dA;
  else if (!d(i = I2.previous)) throw new Error("Previous is not valid");
  var g2, C2 = false;
  if (null === I2.link) g2 = dA;
  else if (H(g2 = I2.link)) C2 = true;
  else if (!d(g2)) throw new Error("Link is not valid");
  if (i === dA && (C2 || g2 === dA)) throw new Error("Block is impossible");
  var r2, o2, n2 = sA(uA(A2)), t = UA({ account: n2, previous: i, representative: I2.representative, balance: I2.balance, link: g2 }), h = yA({ hash: t, secretKey: A2 });
  return C2 ? r2 = uA(o2 = g2) : o2 = sA(r2 = g2), { hash: t, block: { type: "state", account: n2, previous: i, representative: I2.representative, balance: I2.balance, link: r2, link_as_account: o2, work: I2.work, signature: h } };
}

// core/proof.ts
init_buffer();
init_process();

// core/hash.ts
init_buffer();
init_process();
var import_blakejs2 = __toESM(require_blakejs(), 1);
var { blake2bHex } = import_blakejs2.default;
var DOMAIN_POLICY = "holderpay-policy-v1";
var DOMAIN_MEMO = "holderpay-pay-v1";
var DOMAIN_AUTH = "holderpay-auth-v1";
var DOMAIN_GRANT = "holderpay-grant-v1";
var SEP = "";
function h256(domain, ...parts) {
  const payload = import_buffer.Buffer.from([domain, ...parts].join(SEP), "utf-8");
  return blake2bHex(payload, void 0, 32);
}
function canonicalJson(value) {
  if (value === null || typeof value === "number" || typeof value === "boolean") return JSON.stringify(value);
  if (typeof value === "bigint") return JSON.stringify(value.toString());
  if (typeof value === "string") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(canonicalJson).join(",") + "]";
  if (typeof value === "object") {
    const obj = value;
    const keys2 = Object.keys(obj).filter((k2) => obj[k2] !== void 0).sort();
    return "{" + keys2.map((k2) => JSON.stringify(k2) + ":" + canonicalJson(obj[k2])).join(",") + "}";
  }
  throw new Error("cannot canonicalize " + typeof value);
}

// core/proof.ts
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
function signAuth(secretKey, policyId2, receiptHash, challenge) {
  return yA({ hash: authDigest(policyId2, receiptHash, challenge), secretKey });
}
function grantId(policyId2, receiptHash) {
  return h256(DOMAIN_GRANT, policyId2.toLowerCase(), receiptHash.toUpperCase());
}

// core/verify.ts
init_buffer();
init_process();

// vendor/hodl/core/fraglink.ts
init_buffer();
init_process();

// vendor/hodl/core/ops.ts
init_buffer();
init_process();
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
init_buffer();
init_process();
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
  let s2 = "";
  for (const b of bytes) s2 += HEX[b >> 4] + HEX[b & 15];
  return s2;
}
function fromHex(hex) {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}
function writeAmt(buf, offset, n2) {
  if (n2 < 0n || n2 >= 1n << 120n) throw new Error("amount out of 120-bit range");
  for (let i = AMT_BYTES - 1; i >= 0; i--) {
    buf[offset + i] = Number(n2 & 0xffn);
    n2 >>= 8n;
  }
}
function readAmt(buf, offset) {
  let n2 = 0n;
  for (let i = 0; i < AMT_BYTES; i++) n2 = n2 << 8n | BigInt(buf[offset + i]);
  return n2;
}
function fragCode(kind) {
  switch (kind) {
    case "transfer":
      return OP_CODE.transfer;
    case "sell":
      return OP_CODE.sell;
    case "buy":
      return OP_CODE.buy;
    case "seedLiq":
      return OP_CODE.seedLiq;
    case "addLiq":
      return OP_CODE.addLiq;
    case "futOpen":
      return OP_CODE.futOpen;
    default:
      return null;
  }
}
function bodyOf(op) {
  const b = new Uint8Array(BODY_BYTES);
  if (op.kind === "transfer") {
    b.set(fromHex(uA(op.to)), 0);
    writeAmt(b, 32, op.amount);
  } else if (op.kind === "sell") {
    writeAmt(b, 0, op.tokens);
    writeAmt(b, AMT_BYTES, op.minXno);
  } else if (op.kind === "buy") {
    writeAmt(b, 0, op.xno);
    writeAmt(b, AMT_BYTES, op.minTokens);
  } else if (op.kind === "seedLiq" || op.kind === "addLiq") {
    writeAmt(b, 0, op.xno);
    writeAmt(b, AMT_BYTES, op.tokens);
  } else if (op.kind === "futOpen") {
    writeAmt(b, 0, op.size);
    writeAmt(b, AMT_BYTES, op.margin);
    if (op.side !== 0 && op.side !== 1) throw new Error("futures side must be 0 or 1");
    b[2 * AMT_BYTES] = op.side;
    writeAmt(b, 2 * AMT_BYTES + 1, op.guard);
  } else {
    throw new Error("op does not use fragment links: " + op.kind);
  }
  return b;
}
function encodeFragLinks(tokenId, op) {
  const code = fragCode(op.kind);
  if (code == null) throw new Error("op does not use fragment links: " + op.kind);
  const body = bodyOf(op);
  const a2 = new Uint8Array(32);
  a2[0] = FRAG_HIGH | code;
  a2.set(fromHex(tokenId), 1);
  a2.set(body.slice(0, 15), 1 + TOKEN_ID_BYTES);
  return [toHex(a2), toHex(body.slice(15, BODY_BYTES))];
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
  const a2 = fromHex(aHex);
  const code = a2[0] & 15;
  const tokenId = toHex(a2.slice(1, 1 + TOKEN_ID_BYTES));
  const body = new Uint8Array(BODY_BYTES);
  body.set(a2.slice(1 + TOKEN_ID_BYTES), 0);
  body.set(fromHex(bHex), 15);
  if (code === OP_CODE.transfer) {
    const toPub = toHex(body.slice(0, 32));
    if (/^0+$/.test(toPub)) throw new Error("transfer to zero pubkey");
    const to = sA(toPub, { useNanoPrefix: true });
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

// core/policy.ts
init_buffer();
init_process();
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
    accept: accept.map((a2) => ({
      tokenId: a2.tokenId,
      symbol: a2.symbol,
      decimals: a2.decimals,
      price: a2.price
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
function normalizeAccept(list) {
  const byId = /* @__PURE__ */ new Map();
  for (const a2 of list ?? []) {
    const tokenId = String(a2?.tokenId ?? "").toLowerCase();
    if (!/^[0-9a-f]{32}$/.test(tokenId)) continue;
    let price;
    try {
      price = BigInt(a2.price);
    } catch {
      continue;
    }
    if (price <= 0n) continue;
    if (byId.has(tokenId)) continue;
    byId.set(tokenId, {
      tokenId,
      symbol: String(a2.symbol ?? ""),
      decimals: Number(a2.decimals) || 0,
      price: price.toString()
    });
  }
  return [...byId.values()].sort((x2, y) => x2.tokenId < y.tokenId ? -1 : x2.tokenId > y.tokenId ? 1 : 0);
}
function policyId(p) {
  const v2 = p.v ?? 2;
  return h256(DOMAIN_POLICY, canonicalJson(v2 === 1 ? hashableV1(p) : hashableV2(p)));
}
function policyIsIntact(p) {
  if (p.v !== 1 && p.v !== 2) return false;
  return policyId(p) === p.id;
}
function acceptedTokens(p) {
  if ((p.v ?? 2) === 1) {
    if (!p.token || !p.priceToken) return [];
    let price;
    try {
      price = BigInt(p.priceToken);
    } catch {
      return [];
    }
    if (price <= 0n) return [];
    return [
      {
        tokenId: String(p.token.tokenId ?? "").toLowerCase(),
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
  return acceptedTokens(p).find((a2) => a2.tokenId === want) ?? null;
}
function swapTarget(p) {
  const list = acceptedTokens(p);
  if (list.length === 0) return null;
  const want = (p.swapInto ?? "").toLowerCase();
  return list.find((a2) => a2.tokenId === want) ?? list[0];
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
function normalizeAcceptAny(a2) {
  if (!a2) return null;
  let price;
  let min;
  try {
    price = BigInt(a2.priceXno ?? "0");
    min = BigInt(a2.minBacking ?? "0");
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

// core/block.ts
init_buffer();
init_process();
var ZERO_HASH = "0".repeat(64);
function linkAsAddress(link) {
  try {
    return sA(link, { useNanoPrefix: true });
  } catch {
    return "";
  }
}
function sameAccount(a2, b) {
  return (a2 ?? "").replace(/^xrb_/, "nano_").toLowerCase() === (b ?? "").replace(/^xrb_/, "nano_").toLowerCase();
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
    const listed = acceptedTokens(policy).map((a2) => a2.symbol || a2.tokenId.slice(0, 8)).join(", ");
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

// core/wallet.ts
init_buffer();
init_process();
var SEND_DIFFICULTY = "fffffff800000000";
var RECEIVE_DIFFICULTY = "fffffe0000000000";
var XNO = 10n ** 30n;
function keysFromSeed(seed, index = 0) {
  const secretKey = wA(seed, index);
  const publicKey = uA(secretKey);
  return { secretKey, publicKey, address: sA(publicKey, { useNanoPrefix: true }) };
}
function toRaw(s2, decimals) {
  const t = (s2 ?? "").trim();
  if (t === "" || t === "." || !/^\d*\.?\d*$/.test(t)) return 0n;
  const [int = "", frac = ""] = t.split(".");
  const d2 = Math.max(0, Math.floor(decimals));
  const fracPadded = (frac + "0".repeat(d2)).slice(0, d2);
  return BigInt(int || "0") * 10n ** BigInt(d2) + BigInt(fracPadded || "0");
}
function fromRaw(n2, decimals) {
  const v2 = BigInt(n2);
  const d2 = 10n ** BigInt(decimals);
  const neg = v2 < 0n;
  const a2 = neg ? -v2 : v2;
  const whole = a2 / d2;
  const frac = (a2 % d2).toString().padStart(decimals, "0").replace(/0+$/, "");
  return (neg ? "-" : "") + (frac ? `${whole}.${frac}` : `${whole}`);
}
function buildBlock(secretKey, opts) {
  const b = kA(secretKey, {
    work: opts.work,
    previous: opts.previous,
    representative: opts.representative,
    balance: opts.balance,
    link: opts.link
  });
  const blk = { ...b.block };
  blk.account = blk.account.replace(/^xrb_/, "nano_");
  delete blk.link_as_account;
  return blk;
}
async function tip(rpc2, account) {
  try {
    const info = await rpc2({ action: "account_info", account, representative: "true" });
    if (!info?.frontier) return { frontier: null, balance: 0n, representative: account };
    return {
      frontier: info.frontier,
      balance: BigInt(info.balance ?? "0"),
      representative: info.representative ?? account
    };
  } catch {
    return { frontier: null, balance: 0n, representative: account };
  }
}
async function work(rpc2, hash, difficulty) {
  const r2 = await rpc2({ action: "work_generate", hash, difficulty });
  const w2 = String(r2?.work ?? "");
  if (!/^[0-9a-fA-F]{16}$/.test(w2)) throw new Error("work_generate returned no usable nonce");
  return w2;
}
async function submitLink(rpc2, keys2, link, delta) {
  const t = await tip(rpc2, keys2.address);
  if (!t.frontier) throw new Error("wallet is unopened -- send it some XNO first");
  if (t.balance < delta) throw new Error("not enough XNO in this wallet");
  const w2 = await work(rpc2, t.frontier, SEND_DIFFICULTY);
  const blk = buildBlock(keys2.secretKey, {
    work: w2,
    previous: t.frontier,
    representative: t.representative,
    balance: (t.balance - delta).toString(),
    link
  });
  const r2 = await rpc2({ action: "process", json_block: "true", block: blk });
  if (!r2?.hash) throw new Error("process returned no hash");
  return String(r2.hash).toUpperCase();
}
async function sendXno(rpc2, keys2, to, raw) {
  if (raw <= 0n) throw new Error("amount must be positive");
  return submitLink(rpc2, keys2, uA(to), raw);
}
var DUST_RAW = 1000n;
async function receiveAll(rpc2, keys2, opts = {}) {
  const max = Math.max(1, Math.min(opts.max ?? 8, 25));
  const dust = opts.dust ?? DUST_RAW;
  const r2 = await rpc2({
    action: "receivable",
    account: keys2.address,
    count: String(max + 10),
    source: "true",
    threshold: dust.toString()
  });
  const blocks = r2?.blocks && typeof r2.blocks === "object" ? r2.blocks : {};
  const t = await tip(rpc2, keys2.address);
  let previous = t.frontier;
  let balance = t.balance;
  const representative = t.representative;
  let count = 0;
  let skipped = 0;
  let remaining = 0;
  for (const [hash, entry] of Object.entries(blocks)) {
    const amount = BigInt(typeof entry === "string" ? entry : entry.amount);
    if (amount < dust) {
      skipped++;
      continue;
    }
    if (count >= max) {
      remaining++;
      continue;
    }
    balance += amount;
    const w2 = await work(rpc2, previous ?? keys2.publicKey, RECEIVE_DIFFICULTY);
    const blk = buildBlock(keys2.secretKey, {
      work: w2,
      previous,
      representative,
      balance: balance.toString(),
      link: hash
    });
    const res = await rpc2({ action: "process", json_block: "true", block: blk });
    previous = String(res.hash);
    count++;
  }
  return { count, balance, skipped, remaining };
}

// core/swap.ts
init_buffer();
init_process();

// vendor/hodl/core/oplink.ts
init_buffer();
init_process();
var AMT_BYTES2 = 15;
var HEX2 = "0123456789abcdef";
function toHex2(bytes) {
  let s2 = "";
  for (const b of bytes) s2 += HEX2[b >> 4] + HEX2[b & 15];
  return s2;
}
function fromHex2(hex) {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}
var AMT_MAX = (1n << BigInt(AMT_BYTES2 * 8)) - 1n;
function writeAmount(buf, offset, n2) {
  if (n2 < 0n || n2 > AMT_MAX) throw new Error(`amount ${n2} does not fit the ${AMT_BYTES2}-byte link field`);
  for (let i = AMT_BYTES2 - 1; i >= 0; i--) {
    buf[offset + i] = Number(n2 & 0xffn);
    n2 >>= 8n;
  }
}
function readAmount(buf, offset) {
  let n2 = 0n;
  for (let i = 0; i < AMT_BYTES2; i++) n2 = n2 << 8n | BigInt(buf[offset + i]);
  return n2;
}
function writeTokenId(buf, offset, tokenId) {
  const raw = fromHex2(tokenId || "0".repeat(TOKEN_ID_BYTES * 2));
  buf.set(raw, offset);
}
function readTokenId(buf, offset) {
  return toHex2(buf.slice(offset, offset + TOKEN_ID_BYTES));
}
function primaryAmount(op) {
  switch (op.kind) {
    case "launch":
      return op.supply;
    case "buy":
      return op.minTokens;
    // xno is bound by the chained deposit, not here
    case "sell":
      return op.tokens;
    case "stake":
    case "unstake":
      return op.amount;
    case "claim":
      return 0n;
    case "withdraw":
      return 0n;
    case "seedLiq":
    case "addLiq":
      return op.tokens;
    // xno is bound by the chained pool deposit
    case "futClose":
      return op.size;
    case "futOpen":
      throw new Error("futOpen uses fragment links");
    case "balance":
      throw new Error("balance is a synthetic observation, never encoded");
    default:
      throw new Error("op does not fit compact link: " + op.kind);
  }
}
function encodeOpLink(tokenId, op) {
  const buf = new Uint8Array(32);
  if (op.kind === "balance") throw new Error("balance is a synthetic observation, never encoded");
  buf[0] = op.kind === "launch" && op.direct ? OP_CODE_LAUNCH_DIRECT : OP_CODE[op.kind];
  writeTokenId(buf, 1, op.kind === "launch" ? "" : tokenId);
  writeAmount(buf, 1 + TOKEN_ID_BYTES, primaryAmount(op));
  if (op.kind === "launch") {
    const d2 = op.decimals;
    if (Number.isInteger(d2) && d2 >= 0 && d2 <= 18) buf[1] = d2 + 1;
  }
  return toHex2(buf);
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
  const s2 = i.state;
  const fail = (problem) => ({
    lane: "earmark",
    xno: 0n,
    tokensOut: 0n,
    minTokens: 0n,
    needBalance: 0n,
    problem
  });
  if (!s2.launched) return fail("token has not launched");
  if (s2.poolXno <= 0n || s2.poolTokens <= 0n) return fail("token has no liquidity to swap against yet");
  if (i.wantTokens <= 0n) return fail("nothing to buy");
  const xno = xnoNeededFor(s2.poolXno, s2.poolTokens, i.wantTokens);
  if (xno == null) return fail("not enough liquidity for that size");
  const tokensOut = quoteBuy(s2.poolXno, s2.poolTokens, xno);
  const bps = Math.min(1e4, Math.max(0, Math.floor(i.slippageBps)));
  const guard = tokensOut * BigInt(1e4 - bps) / 10000n;
  const minTokens = guard < i.wantTokens ? guard : i.wantTokens;
  const head = s2.queue.find((q2) => q2.owed > 0n);
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
    const out = quoteBuy(s2.poolXno, s2.poolTokens, capped);
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
async function executeSwap(rpc2, keys2, tokenId, plan) {
  if (plan.problem && plan.tokensOut <= 0n) throw new Error(plan.problem);
  if (plan.lane === "queue") {
    if (!plan.payTo) throw new Error("queue lane without a payee");
    const t = await tip(rpc2, keys2.address);
    if (!t.frontier) throw new Error("wallet is unopened -- send it some XNO first");
    if (t.balance < plan.needBalance) throw new Error("not enough XNO for this swap");
    const w1 = (await rpc2({ action: "work_generate", hash: t.frontier, difficulty: SEND_DIFFICULTY })).work;
    const send = buildBlock(keys2.secretKey, {
      work: w1,
      previous: t.frontier,
      representative: t.representative,
      balance: (t.balance - plan.xno).toString(),
      link: uA(plan.payTo)
    });
    const r1 = await rpc2({ action: "process", json_block: "true", block: send });
    const w2 = (await rpc2({ action: "work_generate", hash: r1.hash, difficulty: SEND_DIFFICULTY })).work;
    const op = buildBlock(keys2.secretKey, {
      work: w2,
      previous: String(r1.hash),
      representative: t.representative,
      balance: (t.balance - plan.xno - 1n).toString(),
      link: encodeOpLink(tokenId, { kind: "buy", xno: 0n, minTokens: plan.minTokens })
    });
    const r2 = await rpc2({ action: "process", json_block: "true", block: op });
    return String(r2.hash).toUpperCase();
  }
  const [fragA, fragB] = encodeFragLinks(tokenId, { kind: "buy", xno: plan.xno, minTokens: plan.minTokens });
  await submitLink(rpc2, keys2, fragA, 1n);
  return submitLink(rpc2, keys2, fragB, 1n);
}
async function payTokenWithReceipt(rpc2, keys2, tokenId, to, amount, receiptLink) {
  const [a2, b] = encodeFragLinks(tokenId, { kind: "transfer", to, amount });
  const fragA = await submitLink(rpc2, keys2, a2, 1n);
  const payment = await submitLink(rpc2, keys2, b, 1n);
  const receipt = await submitLink(rpc2, keys2, receiptLink, 1n);
  return { fragA, payment, receipt };
}

// web/rpc-browser.ts
init_buffer();
init_process();
var NANO_RPC = "/api/rpc";
var FALLBACK_RPC = "/api/rpc";
async function nanoRpc(_key, body) {
  const res = await fetch(NANO_RPC, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const json = await res.json();
  if (json?.error) {
    throw new Error(typeof json.error === "string" ? json.error : JSON.stringify(json.error));
  }
  return json;
}
function rpc(body) {
  return nanoRpc("", body);
}

// web/verifier.ts
init_buffer();
init_process();

// vendor/hodl/indexer/blockSource.ts
init_buffer();
init_process();

// vendor/hodl/core/blockVerify.ts
init_buffer();
init_process();
function verifyFetchedBlock(hash, b) {
  const c2 = b.contents ?? {};
  if (c2.type && c2.type !== "state") return false;
  try {
    const acct = String(c2.account ?? "");
    if (!acct || acct.toLowerCase() !== String(b.block_account ?? "").toLowerCase()) return false;
    const computed = GA({
      account: acct,
      previous: c2.previous,
      representative: c2.representative,
      balance: c2.balance,
      link: c2.link
    });
    if (computed.toLowerCase() !== hash.toLowerCase()) return false;
    const publicKey = uA(acct);
    return DA({
      hash: computed,
      signature: String(c2.signature ?? "").toUpperCase(),
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
  staged.sort((a2, b) => a2.block.height < b.block.height ? -1 : a2.block.height > b.block.height ? 1 : 0);
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
    const j2 = await fallbackRpc({ action: "pending", account, count: 1e3 });
    return Array.isArray(j2?.blocks) ? j2.blocks : [];
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
  constructor(apiKey, cache, opts = {}) {
    this.apiKey = apiKey;
    this.cache = cache;
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
    const need = accounts.filter((a2) => !this.frontierHint.has(a2));
    if (need.length === 0) return;
    const af = async (call) => {
      try {
        const j2 = await Promise.race([
          call({ action: "accounts_frontiers", accounts: need }),
          new Promise((r2) => setTimeout(() => r2(null), 3e3))
        ]);
        return j2 && typeof j2.frontiers === "object" && j2.frontiers ? j2.frontiers : {};
      } catch {
        return {};
      }
    };
    const f0 = await af((b) => nanoRpc(this.apiKey, b));
    const enough = need.every((a2) => typeof f0[a2] === "string");
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
      const best = views.reduce((a2, b) => b.height > a2.height ? b : a2);
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
    const outbound = blocks.filter((b) => b.subtype === "send" && /^[0-9a-fA-F]{64}$/.test(b.link)).map((b) => sA(b.link, { useNanoPrefix: true }));
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
    const p = this._listBlocks(account, limit).catch((e2) => {
      this.blockMemo.delete(key);
      throw e2;
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
      best = views.reduce((a2, b) => b.height > a2.height ? b : a2);
    }
    if (this.cache) {
      try {
        const stored2 = await this.cache.getFrontier(account);
        if (stored2 && stored2.height > best.height && stored2.frontier) best = stored2;
      } catch {
      }
      if (best.frontier) {
        try {
          const cached = await this.cache.getBlocks(account, best.frontier);
          if (cached && cached.length) {
            this.blocksFromCache.add(account);
            this.frontiers.set(account, cached[cached.length - 1].hash);
            return cached;
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
    return walks.reduce((a2, b) => b.blocks.length > a2.blocks.length ? b : a2).blocks;
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

// core/fold.ts
init_buffer();
init_process();

// vendor/hodl/indexer/multiIndexer.ts
init_buffer();
init_process();

// vendor/hodl/core/multi.ts
init_buffer();
init_process();

// vendor/hodl/core/state.ts
init_buffer();
init_process();

// vendor/hodl/core/futures.ts
init_buffer();
init_process();
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
function cloneFutures(f2) {
  return {
    book: f2.book.map((o2) => ({ ...o2 })),
    pairs: f2.pairs.map((p) => ({ ...p, long: { ...p.long }, short: { ...p.short } })),
    nextId: f2.nextId,
    mark: f2.mark,
    settled: f2.settled.map((x2) => ({ ...x2 })),
    nextSeq: f2.nextSeq
  };
}
function futuresActive(f2) {
  return f2.nextId > 0n || f2.book.length > 0 || f2.pairs.length > 0 || f2.mark > 0n;
}
function markPrice(s2) {
  if (s2.poolXno <= 0n || s2.poolTokens <= 0n) return 0n;
  return s2.poolXno * PRECISION / s2.poolTokens;
}
function refPrice(s2, f2) {
  return f2.mark > 0n ? f2.mark : markPrice(s2);
}
function updateMark(s2, f2, prevPoolXno, prevPoolTokens) {
  if (!futuresActive(f2)) return;
  const spot = markPrice(s2);
  if (spot <= 0n) return;
  if (f2.mark <= 0n) {
    f2.mark = spot;
    return;
  }
  const fracX = relMove(prevPoolXno, s2.poolXno);
  const fracT = relMove(prevPoolTokens, s2.poolTokens);
  const num = fracX.num * fracT.den > fracT.num * fracX.den ? fracX : fracT;
  if (num.num <= 0n || num.den <= 0n) return;
  const gap = spot - f2.mark;
  const w2 = num.num * MARK_RESPONSIVENESS;
  f2.mark = w2 >= num.den ? spot : f2.mark + gap * w2 / num.den;
}
function relMove(before, after) {
  const num = after > before ? after - before : before - after;
  const den = after > before ? after : before;
  return { num, den };
}
function lockedMarginOf(f2, account) {
  let t = 0n;
  for (const o2 of f2.book) if (o2.account === account) t += o2.margin;
  for (const p of f2.pairs) {
    if (p.long.account === account) t += p.long.margin;
    if (p.short.account === account) t += p.short.margin;
  }
  return t;
}
function voidMarginOf(f2, account, short2, floor) {
  if (floor <= 0n || short2 <= 0n) return 0n;
  let voided = 0n;
  const keep = [];
  for (const o2 of f2.book) {
    if (o2.account !== account) {
      keep.push(o2);
      continue;
    }
    const v2 = o2.margin * short2 / floor;
    o2.margin -= v2;
    voided += v2;
    if (o2.margin > 0n) keep.push(o2);
  }
  f2.book = keep;
  for (const p of f2.pairs) {
    if (p.long.account === account) {
      const v2 = p.long.margin * short2 / floor;
      p.long.margin -= v2;
      voided += v2;
    }
    if (p.short.account === account) {
      const v2 = p.short.margin * short2 / floor;
      p.short.margin -= v2;
      voided += v2;
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
function get(m2, k2) {
  return m2.get(k2) ?? 0n;
}
function set(m2, k2, v2) {
  if (v2 === 0n) m2.delete(k2);
  else m2.set(k2, v2);
}
function guardOk(side, entry, guard) {
  if (guard <= 0n) return true;
  return side === LONG ? entry <= guard : entry >= guard;
}
function minPositionSize(s2) {
  const floorSize = BPS / MAINT_BPS;
  const bySupply = s2.supply / MIN_SIZE_DIV;
  return bySupply > floorSize ? bySupply : floorSize;
}
function sideOI(f2, side) {
  let t = 0n;
  for (const o2 of f2.book) if (o2.side === side) t += o2.size;
  for (const p of f2.pairs) t += p.size;
  return t;
}
function hasRoomToRest(f2, account, side) {
  let sideCount = 0;
  let mine = 0;
  for (const o2 of f2.book) {
    if (o2.side === side) sideCount++;
    if (o2.account === account) mine++;
  }
  return sideCount < MAX_BOOK_SIDE && mine < MAX_ORDERS_PER_ACCOUNT;
}
function settlePortion(s2, f2, p, portion, price, closer) {
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
  set(s2.balances, p.long.account, get(s2.balances, p.long.account) + longOut);
  set(s2.balances, p.short.account, get(s2.balances, p.short.account) + shortOut);
  f2.settled.push({
    seq: f2.nextSeq++,
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
  while (f2.settled.length > MAX_SETTLED) f2.settled.shift();
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
function sweepFutures(s2, f2) {
  if (f2.pairs.length === 0) return;
  const spot = markPrice(s2);
  if (spot <= 0n) return;
  const mark = refPrice(s2, f2);
  const keep = [];
  for (const p of f2.pairs) {
    const a2 = belowMaint(p, spot);
    const b = belowMaint(p, mark);
    if (a2 != null && a2 === b) settlePortion(s2, f2, p, p.size, worseFor(a2 === LONG ? SHORT : LONG, true, spot, mark));
    else keep.push(p);
  }
  f2.pairs = keep;
}
function openFutures(s2, f2, sender, side, size, margin, guard) {
  if (size <= 0n) throw new InvalidOp("zero size");
  if (margin <= 0n) throw new InvalidOp("zero margin");
  if (guard <= 0n) throw new InvalidOp("entry price guard required");
  if (size > margin * MAX_LEVERAGE) throw new InvalidOp("leverage too high");
  const minSize = minPositionSize(s2);
  if (size < minSize) throw new InvalidOp("position too small");
  const spot = markPrice(s2);
  if (spot <= 0n) throw new InvalidOp("no liquidity");
  const bal = get(s2.balances, sender);
  if (bal < margin) throw new InvalidOp("insufficient balance");
  const capSupply = s2.supply * MAX_OI_BPS / BPS;
  const capPool = s2.poolTokens * MAX_OI_POOL_BPS / BPS;
  const cap = capSupply < capPool ? capSupply : capPool;
  if (sideOI(f2, side) + size > cap) throw new InvalidOp("open interest cap");
  if (f2.mark <= 0n) f2.mark = spot;
  const entry = worseFor(side, false, spot, f2.mark);
  if (!guardOk(side, entry, guard)) throw new InvalidOp("entry price guard");
  const canMatch = f2.book.some((o2) => o2.side !== side && o2.account !== sender && guardOk(o2.side, entry, o2.guard));
  if (!canMatch && !hasRoomToRest(f2, sender, side)) throw new InvalidOp("order book full");
  set(s2.balances, sender, bal - margin);
  const origSize = size;
  let remSize = size;
  let remMargin = margin;
  const book = [];
  for (const o2 of f2.book) {
    if (remSize < minSize || o2.side === side || o2.account === sender || f2.pairs.length >= MAX_PAIRS) {
      book.push(o2);
      continue;
    }
    if (!guardOk(o2.side, entry, o2.guard)) {
      book.push(o2);
      continue;
    }
    if (remSize < o2.size && o2.size - remSize < minSize) {
      book.push(o2);
      continue;
    }
    const fill = remSize < o2.size ? remSize : o2.size;
    const makerM = o2.margin * fill / o2.size;
    const takerM = margin * fill / origSize;
    const taker = { account: sender, margin: takerM };
    const maker = { account: o2.account, margin: makerM };
    f2.pairs.push({
      id: f2.nextId++,
      size: fill,
      entry,
      long: side === LONG ? taker : maker,
      short: side === SHORT ? taker : maker
    });
    o2.size -= fill;
    o2.margin -= makerM;
    remSize -= fill;
    remMargin -= takerM;
    if (o2.size > 0n) book.push(o2);
    else if (o2.margin > 0n) set(s2.balances, o2.account, get(s2.balances, o2.account) + o2.margin);
  }
  f2.book = book;
  if (remSize >= minSize && hasRoomToRest(f2, sender, side)) {
    f2.book.push({ id: f2.nextId++, account: sender, side, size: remSize, margin: remMargin, guard });
  } else if (remMargin > 0n) set(s2.balances, sender, get(s2.balances, sender) + remMargin);
  sweepFutures(s2, f2);
}
function closeFutures(s2, f2, sender, size) {
  const spot = markPrice(s2);
  if (spot <= 0n) return;
  const mark = refPrice(s2, f2);
  const minSize = minPositionSize(s2);
  if (size === 0n) {
    const keep2 = [];
    for (const o2 of f2.book) {
      if (o2.account !== sender) {
        keep2.push(o2);
        continue;
      }
      set(s2.balances, sender, get(s2.balances, sender) + o2.margin);
    }
    f2.book = keep2;
  }
  let rem = size === 0n ? -1n : size;
  const keep = [];
  for (const p of f2.pairs) {
    const mine = p.long.account === sender || p.short.account === sender;
    if (!mine || rem === 0n) {
      keep.push(p);
      continue;
    }
    const mySide = p.long.account === sender ? LONG : SHORT;
    let portion = rem < 0n || rem >= p.size ? p.size : rem;
    if (portion < minSize || p.size - portion < minSize) portion = p.size;
    settlePortion(s2, f2, p, portion, worseFor(mySide, true, spot, mark), sender);
    if (rem > 0n) rem -= portion;
    if (p.size > 0n) keep.push(p);
  }
  f2.pairs = keep;
  sweepFutures(s2, f2);
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
function get2(m2, k2) {
  return m2.get(k2) ?? 0n;
}
function set2(m2, k2, v2) {
  if (v2 === 0n) m2.delete(k2);
  else m2.set(k2, v2);
}
function settle(s2, a2) {
  const st = get2(s2.staked, a2);
  const acc = st * s2.rewardPerShare / PRECISION;
  const pending = acc - get2(s2.rewardDebt, a2);
  if (pending > 0n) set2(s2.banked, a2, get2(s2.banked, a2) + pending);
  set2(s2.rewardDebt, a2, acc);
}
function resetDebt(s2, a2) {
  set2(s2.rewardDebt, a2, get2(s2.staked, a2) * s2.rewardPerShare / PRECISION);
}
function syncRewards(s2, newRebate) {
  if (newRebate > 0n && s2.totalStaked > 0n) {
    s2.rewardPerShare += newRebate * PRECISION / s2.totalStaked;
  }
}
function constantProductOut(reserveIn, reserveOut, amountIn) {
  const afterFee = amountIn * (BPS - SWAP_FEE_BPS) / BPS;
  if (reserveIn + afterFee <= 0n) throw new InvalidOp("insufficient liquidity");
  return afterFee * reserveOut / (reserveIn + afterFee);
}
function sellValueOf(s2, a2) {
  const pos = get2(s2.balances, a2) + get2(s2.staked, a2) + lockedMarginOf(s2.futures, a2);
  if (pos <= 0n || s2.poolXno <= 0n || s2.poolTokens <= 0n) return 0n;
  return pos * s2.poolXno / (s2.poolTokens + pos);
}
function ratchetFloors(s2) {
  for (const [a2, em] of s2.earmark) {
    const sv = sellValueOf(s2, a2);
    const cur = s2.earmarkFloor.get(a2) ?? em;
    let f2 = cur < em ? cur : em;
    if (sv < f2) f2 = sv;
    set2(s2.earmarkFloor, a2, f2);
  }
}
function queueTotal(s2) {
  let t = 0n;
  for (const e2 of s2.queue) t += e2.owed;
  return t;
}
function floorTotalExcept(s2, a2) {
  let t = 0n;
  for (const [acct, f2] of s2.earmarkFloor) if (acct !== a2) t += f2;
  return t;
}
function applyVoid(s0, account, newFloor) {
  const floor = s0.earmarkFloor.get(account) ?? 0n;
  if (!s0.direct || floor <= 0n || newFloor >= floor) return s0;
  const s2 = cloneState(s0);
  const short2 = floor - (newFloor > 0n ? newFloor : 0n);
  const bal = get2(s2.balances, account);
  const vb = bal * short2 / floor;
  set2(s2.balances, account, bal - vb);
  let voided = vb;
  const st = get2(s2.staked, account);
  if (st > 0n) {
    settle(s2, account);
    const vs = st * short2 / floor;
    set2(s2.staked, account, st - vs);
    s2.totalStaked -= vs;
    resetDebt(s2, account);
    voided += vs;
  }
  voided += voidMarginOf(s2.futures, account, short2, floor);
  s2.poolTokens += voided;
  s2.queue = s2.queue.map((e2) => e2.account === account ? { account: e2.account, owed: e2.owed - e2.owed * short2 / floor } : e2).filter((e2) => e2.owed > 0n);
  const em = get2(s2.earmark, account);
  set2(s2.earmark, account, em - em * short2 / floor);
  set2(s2.earmarkFloor, account, newFloor > 0n ? newFloor : 0n);
  if (s2.futures.pairs.length > 0) sweepFutures(s2, s2.futures);
  return s2;
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
    queue: s0.queue.map((e2) => ({ ...e2 })),
    prepaid: new Map(s0.prepaid),
    futures: cloneFutures(s0.futures)
  };
}
function afterPriceChange(s2, prevPoolXno, prevPoolTokens) {
  updateMark(s2, s2.futures, prevPoolXno, prevPoolTokens);
  if (s2.futures.pairs.length > 0) sweepFutures(s2, s2.futures);
}
function applyOp(s0, op, sender, height, timestamp) {
  if (op.kind === "balance") return s0;
  const s2 = cloneState(s0);
  switch (op.kind) {
    case "launch": {
      if (s2.launched) throw new InvalidOp("already launched");
      if (op.supply <= 0n) throw new InvalidOp("zero supply");
      const creatorShare = op.supply * MAX_CREATOR_SHARE_BPS / BPS;
      if (creatorShare <= 0n) throw new InvalidOp("supply too small");
      s2.launched = true;
      s2.direct = Boolean(op.direct);
      s2.creator = sender;
      s2.creatorShare = creatorShare;
      s2.supply = op.supply;
      s2.name = op.name;
      s2.symbol = op.symbol;
      s2.decimals = op.decimals;
      s2.image = op.image;
      set2(s2.balances, sender, creatorShare);
      s2.treasury = op.supply - creatorShare;
      s2.height = height;
      return s2;
    }
    case "transfer": {
      if (!s2.launched) throw new InvalidOp("not launched");
      if (op.amount <= 0n) throw new InvalidOp("zero amount");
      const bal = get2(s2.balances, sender);
      if (bal < op.amount) throw new InvalidOp("insufficient balance");
      set2(s2.balances, sender, bal - op.amount);
      set2(s2.balances, op.to, get2(s2.balances, op.to) + op.amount);
      s2.height = height;
      return s2;
    }
    case "buy": {
      if (!s2.launched) throw new InvalidOp("not launched");
      if (op.xno <= 0n) throw new InvalidOp("zero xno");
      if (s2.poolXno <= 0n || s2.poolTokens <= 0n) throw new InvalidOp("no liquidity");
      if (!s2.direct) {
        const out = constantProductOut(s2.poolXno, s2.poolTokens, op.xno);
        if (out < op.minTokens || out >= s2.poolTokens) throw new InvalidOp("slippage");
        s2.poolXno += op.xno;
        s2.poolTokens -= out;
        set2(s2.balances, sender, get2(s2.balances, sender) + out);
        afterPriceChange(s2, s0.poolXno, s0.poolTokens);
        s2.height = height;
        return s2;
      }
      if (op.depositTo) {
        const entry = s2.queue.find((e2) => e2.account === op.depositTo && e2.owed > 0n);
        if (!entry) throw new InvalidOp("deposit does not pay a queued seller");
        const pay = op.xno < entry.owed ? op.xno : entry.owed;
        entry.owed -= pay;
        const excess = op.xno - pay;
        if (excess > 0n) set2(s2.prepaid, op.depositTo, get2(s2.prepaid, op.depositTo) + excess);
        s2.queue = s2.queue.filter((e2) => e2.owed > 0n);
        const out = constantProductOut(s2.poolXno, s2.poolTokens, pay);
        if (out < op.minTokens || out >= s2.poolTokens) throw new InvalidOp("slippage");
        s2.poolXno += pay;
        s2.poolTokens -= out;
        set2(s2.balances, sender, get2(s2.balances, sender) + out);
      } else {
        if (s2.queue.some((e2) => e2.owed > 0n)) throw new InvalidOp("queued sellers must be paid first");
        const bal = op.balanceAt ?? 0n;
        if (bal < op.xno + (s2.earmarkFloor.get(sender) ?? 0n)) throw new InvalidOp("insufficient collateral");
        const out = constantProductOut(s2.poolXno, s2.poolTokens, op.xno);
        if (out < op.minTokens || out >= s2.poolTokens) throw new InvalidOp("slippage");
        s2.poolXno += op.xno;
        s2.poolTokens -= out;
        set2(s2.balances, sender, get2(s2.balances, sender) + out);
        set2(s2.earmark, sender, get2(s2.earmark, sender) + op.xno);
        set2(s2.earmarkFloor, sender, (s2.earmarkFloor.get(sender) ?? 0n) + op.xno);
      }
      ratchetFloors(s2);
      afterPriceChange(s2, s0.poolXno, s0.poolTokens);
      s2.height = height;
      return s2;
    }
    case "sell": {
      if (!s2.launched) throw new InvalidOp("not launched");
      if (op.tokens <= 0n) throw new InvalidOp("zero tokens");
      const bal = get2(s2.balances, sender);
      if (bal < op.tokens) throw new InvalidOp("insufficient balance");
      if (s2.poolXno <= 0n || s2.poolTokens <= 0n) throw new InvalidOp("no liquidity");
      const out = op.tokens * s2.poolXno / (s2.poolTokens + op.tokens);
      if (out < op.minXno || out >= s2.poolXno) throw new InvalidOp("slippage");
      set2(s2.balances, sender, bal - op.tokens);
      s2.poolTokens += op.tokens;
      s2.poolXno -= out;
      if (!s2.direct) {
        set2(s2.xnoCredit, sender, get2(s2.xnoCredit, sender) + out);
        afterPriceChange(s2, s0.poolXno, s0.poolTokens);
        s2.height = height;
        return s2;
      }
      const pre = get2(s2.prepaid, sender);
      const usePre = out < pre ? out : pre;
      set2(s2.prepaid, sender, pre - usePre);
      let rem = out - usePre;
      const em = get2(s2.earmark, sender);
      const exitBal = op.balanceAt ?? 0n;
      let net = rem < em ? rem : em;
      if (net > exitBal) net = exitBal;
      set2(s2.earmark, sender, em - net);
      const fl = s2.earmarkFloor.get(sender) ?? 0n;
      const emAfter = em - net;
      if (fl > emAfter) set2(s2.earmarkFloor, sender, emAfter);
      rem -= net;
      let credited = 0n;
      if (rem > 0n) {
        const num = floorTotalExcept(s2, sender);
        const q2 = queueTotal(s2);
        const headroom = num > q2 ? num - q2 : 0n;
        credited = rem < headroom ? rem : headroom;
        if (credited > 0n) s2.queue = [...s2.queue, { account: sender, owed: credited }];
        s2.poolXno += rem - credited;
      }
      if (usePre + net + credited < op.minXno) throw new InvalidOp("slippage");
      ratchetFloors(s2);
      afterPriceChange(s2, s0.poolXno, s0.poolTokens);
      s2.height = height;
      return s2;
    }
    case "futOpen":
    case "futClose": {
      if (!s2.launched) throw new InvalidOp("not launched");
      if (!(typeof timestamp === "number" && Number.isFinite(timestamp) && timestamp >= FUTURES_ERA)) {
        throw new InvalidOp("futures not active");
      }
      if (op.kind === "futOpen") openFutures(s2, s2.futures, sender, op.side, op.size, op.margin, op.guard);
      else closeFutures(s2, s2.futures, sender, op.size);
      s2.height = height;
      return s2;
    }
    case "withdraw": {
      if (!s2.launched) throw new InvalidOp("not launched");
      if (s2.direct) throw new InvalidOp("direct tokens settle at sell");
      const credit = get2(s2.xnoCredit, sender);
      if (credit <= 0n) throw new InvalidOp("nothing to withdraw");
      set2(s2.xnoWithdrawn, sender, get2(s2.xnoWithdrawn, sender) + credit);
      set2(s2.xnoCredit, sender, 0n);
      s2.height = height;
      return s2;
    }
    case "stake": {
      if (!s2.launched) throw new InvalidOp("not launched");
      if (op.amount <= 0n) throw new InvalidOp("zero amount");
      const bal = get2(s2.balances, sender);
      if (bal < op.amount) throw new InvalidOp("insufficient balance");
      settle(s2, sender);
      set2(s2.balances, sender, bal - op.amount);
      set2(s2.staked, sender, get2(s2.staked, sender) + op.amount);
      s2.totalStaked += op.amount;
      resetDebt(s2, sender);
      s2.height = height;
      return s2;
    }
    case "unstake": {
      if (!s2.launched) throw new InvalidOp("not launched");
      if (op.amount <= 0n) throw new InvalidOp("zero amount");
      const st = get2(s2.staked, sender);
      if (st < op.amount) throw new InvalidOp("insufficient stake");
      settle(s2, sender);
      const tax = op.amount * TAX_BPS / BPS;
      const legacy = timestamp == null || timestamp < FULL_REBATE_ERA;
      const remaining = s2.totalStaked - op.amount;
      const burn = legacy ? tax * TAX_BURN_SHARE_BPS / BPS : remaining > 0n ? 0n : tax;
      const rebate = tax - burn;
      const toUser = op.amount - tax;
      s2.supply -= burn;
      s2.rebateVault += rebate;
      set2(s2.balances, sender, get2(s2.balances, sender) + toUser);
      set2(s2.staked, sender, st - op.amount);
      s2.totalStaked -= op.amount;
      resetDebt(s2, sender);
      syncRewards(s2, rebate);
      s2.height = height;
      return s2;
    }
    case "claim": {
      if (!s2.launched) throw new InvalidOp("not launched");
      settle(s2, sender);
      const owed = get2(s2.banked, sender);
      if (owed <= 0n) throw new InvalidOp("nothing to claim");
      const payout = owed < s2.rebateVault ? owed : s2.rebateVault;
      if (payout <= 0n) throw new InvalidOp("nothing to claim");
      set2(s2.banked, sender, owed - payout);
      s2.rebateVault -= payout;
      set2(s2.balances, sender, get2(s2.balances, sender) + payout);
      s2.height = height;
      return s2;
    }
    case "seedLiq":
    case "addLiq": {
      if (!s2.launched) throw new InvalidOp("not launched");
      if (sender !== s2.creator) throw new InvalidOp("creator only");
      if (op.xno < 0n || op.tokens < 0n) throw new InvalidOp("negative amount");
      if (op.xno <= 0n && op.tokens <= 0n) throw new InvalidOp("zero amounts");
      if (op.tokens > s2.treasury) throw new InvalidOp("exceeds treasury");
      s2.treasury -= op.tokens;
      s2.poolXno += op.xno;
      s2.poolTokens += op.tokens;
      if (s2.direct) ratchetFloors(s2);
      afterPriceChange(s2, s0.poolXno, s0.poolTokens);
      s2.height = height;
      return s2;
    }
    default:
      throw new InvalidOp("unknown op");
  }
}

// vendor/hodl/core/multi.ts
function multiEmpty() {
  return /* @__PURE__ */ new Map();
}
function tokenState(m2, tokenId) {
  return m2.get(tokenId) ?? emptyState();
}
function applyBalanceObservation(m2, account, raw) {
  let total = 0n;
  const floors = [];
  for (const [tokenId, s2] of m2) {
    if (!s2.direct) continue;
    const f2 = s2.earmarkFloor.get(account) ?? 0n;
    if (f2 > 0n) {
      total += f2;
      floors.push({ tokenId, floor: f2 });
    }
  }
  if (total <= 0n || raw >= total) return m2;
  const out = new Map(m2);
  for (const { tokenId, floor } of floors) {
    const newFloor = floor * raw / total;
    const next = applyVoid(out.get(tokenId), account, newFloor);
    out.set(tokenId, next);
  }
  return out;
}
function applyBlock(m2, b) {
  if (b.op.kind === "balance") return applyBalanceObservation(m2, b.sender, b.op.raw);
  const next = applyOp(tokenState(m2, b.tokenId), b.op, b.sender, b.height, b.timestamp);
  next.id = b.tokenId;
  const out = new Map(m2);
  out.set(b.tokenId, next);
  return out;
}

// vendor/hodl/core/rotate.ts
init_buffer();
init_process();
var ROTATE_MARKER_PUB = "d0d0d0d0" + "00".repeat(28);
function isRotateRep(representative) {
  const rep = representative ?? "";
  if (/^[0-9a-fA-F]{64}$/.test(rep)) return rep.toLowerCase() === ROTATE_MARKER_PUB;
  try {
    return uA(rep).toLowerCase() === ROTATE_MARKER_PUB;
  } catch {
    return false;
  }
}
function applyRotations(initial, rotations) {
  const byFrom = /* @__PURE__ */ new Map();
  for (const r2 of [...rotations].sort(
    (a2, b) => a2.height !== b.height ? a2.height < b.height ? -1 : 1 : a2.hash < b.hash ? -1 : a2.hash > b.hash ? 1 : 0
  )) {
    if (!byFrom.has(r2.fromPub)) byFrom.set(r2.fromPub, r2);
  }
  const current2 = /* @__PURE__ */ new Map();
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
    current2.set(tokenId, cur);
    accepted.set(tokenId, set3);
  }
  return { current: current2, accepted };
}

// vendor/hodl/core/commit.ts
init_buffer();
init_process();
var import_blakejs4 = __toESM(require_blakejs(), 1);

// vendor/hodl/core/encoding.ts
init_buffer();
init_process();
var import_blakejs3 = __toESM(require_blakejs(), 1);
var { blake2bHex: blake2bHex2 } = import_blakejs3.default;

// vendor/hodl/core/commit.ts
var { blake2bHex: blake2bHex3 } = import_blakejs4.default;
function isCommitLink(link) {
  return link.length >= 2 && link.slice(0, 2).toLowerCase() === "ff";
}

// vendor/hodl/core/metaAnchor.ts
init_buffer();
init_process();
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
    newAuthority: sA(pub.toLowerCase(), { useNanoPrefix: true })
  };
}

// vendor/hodl/indexer/replay.ts
init_buffer();
init_process();
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
      for (let j2 = 0; j2 < deferred.length; ) {
        if (tryApply(deferred[j2])) {
          deferred.splice(j2, 1);
          progress = true;
        } else j2++;
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
function canonicalOrder(a2, b) {
  const ta = a2.timestamp ?? 0, tb = b.timestamp ?? 0;
  const ea = ta >= TIME_ORDER_ERA ? 1 : 0, eb = tb >= TIME_ORDER_ERA ? 1 : 0;
  if (ea !== eb) return ea - eb;
  if (ea === 1 && ta !== tb) return ta < tb ? -1 : 1;
  const la = a2.lam ?? 0n, lb = b.lam ?? 0n;
  if (la !== lb) return la < lb ? -1 : 1;
  if (a2.height !== b.height) return a2.height < b.height ? -1 : 1;
  if (a2.hash === b.hash) return (a2.sub ?? 0) - (b.sub ?? 0);
  return a2.hash < b.hash ? -1 : 1;
}
function lamportClocks(chains) {
  const all = /* @__PURE__ */ new Map();
  for (const { byHash } of chains.values()) for (const b of byHash.values()) all.set(b.hash, b);
  const lam = /* @__PURE__ */ new Map();
  const isHex64 = (s2) => /^[0-9a-fA-F]{64}$/.test(s2);
  let changed = true;
  while (changed) {
    changed = false;
    for (const { byHash } of chains.values()) {
      const ordered = [...byHash.values()].sort((x2, y) => x2.height < y.height ? -1 : 1);
      for (const b of ordered) {
        let m2 = lam.get(b.previous) ?? 0n;
        if ((b.subtype === "receive" || b.subtype === "open") && isHex64(b.link)) {
          const s2 = lam.get(b.link.toUpperCase()) ?? lam.get(b.link.toLowerCase()) ?? lam.get(b.link) ?? 0n;
          if (s2 > m2) m2 = s2;
        }
        const v2 = m2 + 1n;
        if ((lam.get(b.hash) ?? -1n) < v2) {
          lam.set(b.hash, v2);
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
        fromPub = uA(b.account).toLowerCase();
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
    (a2, b) => a2.height !== b.height ? a2.height < b.height ? -1 : 1 : a2.hash < b.hash ? -1 : a2.hash > b.hash ? 1 : 0
  );
  const pools = /* @__PURE__ */ new Map();
  for (const c2 of candidates) {
    if (pools.has(c2.tokenId)) continue;
    if (creators.get(c2.tokenId) !== c2.sender) continue;
    pools.set(c2.tokenId, c2.poolPub.toLowerCase());
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
      const r2 = this.commit(block.link);
      if (!r2) return null;
      tokenId = r2.tokenId;
      op = r2.op;
    } else {
      try {
        const d2 = decodeOpLink(block.link);
        tokenId = d2.tokenId;
        op = d2.op;
      } catch {
        return null;
      }
      if (op.kind === "launch") {
        tokenId = tokenIdFromLaunchHash(block.hash);
        const m2 = this.meta(tokenId);
        op = { ...op, name: m2.name, symbol: m2.symbol, image: m2.image };
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
    return new Map([...this.chainPoolSet].map(([k2, v2]) => [k2, new Set(v2)]));
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
          const d2 = assembleSetAuthority(block.link, child.link);
          consumed.add(child.hash);
          anchors.push({
            tokenId: d2.tokenId,
            kind: "setAuthority",
            newAuthority: d2.newAuthority,
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
        let d2;
        try {
          d2 = assembleFrag(block.link, child.link);
        } catch {
          continue;
        }
        consumed.add(child.hash);
        const timestamp = child.timestamp ? Number(child.timestamp) : void 0;
        if ((d2.op.kind === "sell" || d2.op.kind === "buy") && child.balance != null) {
          d2.op = { ...d2.op, balanceAt: BigInt(child.balance) };
        }
        events.push({
          ev: {
            tokenId: d2.tokenId,
            op: d2.op,
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
    this.metaAnchors = [...decoded.values()].flatMap((d2) => d2.anchors);
    const routesToPool = (tokenId, depLink) => {
      const set3 = this.chainPoolSet.get(tokenId);
      const l2 = depLink.toLowerCase();
      if (set3 && set3.has(l2)) return true;
      const boot = this.poolKey?.(tokenId);
      return Boolean(boot && boot.toLowerCase() === l2);
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
              payee = sA(dep.link.toLowerCase(), { useNanoPrefix: true });
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
      for (const v2 of lamMap.values()) if (v2 > maxLam) maxLam = v2;
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
      reasons: result.invalid.map((r2) => r2.reason)
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
function carriersOf(e2) {
  const hashes = e2.carriers && e2.carriers.length ? e2.carriers : [e2.hash];
  return hashes.map((h) => h.toUpperCase());
}
async function watchSet(reader, seeds, cap = 400) {
  const set3 = new Set(seeds.filter(Boolean));
  const hops = await Promise.all(
    seeds.filter(Boolean).map(async (a2) => {
      try {
        return await reader.counterparties(a2);
      } catch {
        return { inbound: [], outbound: [] };
      }
    })
  );
  for (const cp of hops) {
    for (const h of cp.inbound) set3.add(h.sender);
    for (const a2 of cp.outbound) set3.add(a2);
  }
  const kept = new Set(seeds.filter(Boolean));
  const discovered = [...set3].filter((a2) => a2 && !kept.has(a2)).sort();
  for (const a2 of discovered) {
    if (kept.size >= cap) break;
    kept.add(a2);
  }
  return [...kept].filter(Boolean).sort();
}
async function foldAccounts(source, accounts, meta) {
  const indexer = new MultiIndexer(source, meta ? metaMapResolver(meta) : void 0);
  const events = await indexer.collectEvents(accounts);
  const appliedByCarrier = /* @__PURE__ */ new Map();
  const { state, invalid } = fixpointOrder(events, (e2) => {
    for (const h of carriersOf(e2)) appliedByCarrier.set(h, e2);
  });
  const rejectedByCarrier = /* @__PURE__ */ new Map();
  for (const bad of invalid) {
    const e2 = events[bad.index];
    if (!e2) continue;
    for (const h of carriersOf(e2)) rejectedByCarrier.set(h, bad.reason);
  }
  return { state, appliedByCarrier, rejectedByCarrier, accounts, at: Date.now() };
}
function stateOf(f2, tokenId) {
  return tokenState(f2.state, tokenId.toLowerCase());
}
function opApplied(f2, tokenId, carrierHash) {
  const key = carrierHash.toUpperCase();
  const ev = f2.appliedByCarrier.get(key);
  if (ev) {
    if (ev.tokenId.toLowerCase() !== tokenId.toLowerCase()) {
      return { applied: false, reason: "carrier applied under a different token" };
    }
    return { applied: true, reason: "applied in replay" };
  }
  const why = f2.rejectedByCarrier.get(key);
  if (why) return { applied: false, reason: why };
  return {
    applied: false,
    reason: "not present in this verifier's replay yet (unwatched account, or not yet confirmed)"
  };
}

// core/valuation.ts
init_buffer();
init_process();
var XNO2 = 10n ** 30n;
function backingOf(s2) {
  let total = 0n;
  for (const f2 of s2.earmarkFloor.values()) total += f2;
  return total;
}
function circulatingOf(s2) {
  return s2.supply > s2.treasury ? s2.supply - s2.treasury : 0n;
}

// web/verifier.ts
var BrowserReader = class {
  memo = /* @__PURE__ */ new Map();
  fold = null;
  seeds;
  tokenId;
  constructor(tokenId, seeds) {
    this.tokenId = (tokenId ?? "").toLowerCase();
    this.seeds = seeds.filter(Boolean);
  }
  async getBlock(hash) {
    const key = (hash ?? "").toUpperCase();
    if (this.memo.has(key)) return this.memo.get(key);
    if (!/^[0-9A-F]{64}$/.test(key)) return null;
    const res = await rpc({ action: "blocks_info", hashes: [key], json_block: "true", include_not_found: "true" });
    const entry = res?.blocks?.[key];
    let out = null;
    if (entry && verifyFetchedBlock(key, entry)) {
      const c2 = entry.contents ?? {};
      out = {
        hash: key,
        account: String(entry.block_account ?? c2.account ?? ""),
        previous: String(c2.previous ?? "").toUpperCase(),
        representative: String(c2.representative ?? ""),
        balance: BigInt(c2.balance ?? "0"),
        link: String(c2.link ?? "").toUpperCase(),
        confirmed: String(entry.confirmed ?? "").toLowerCase() === "true",
        timestamp: Number(entry.local_timestamp ?? 0) || 0,
        height: Number(entry.height ?? 0) || 0
      };
    }
    this.memo.set(key, out);
    return out;
  }
  /** Replay the token ledger here, in the page. Cached per verifier instance
   * because it costs a burst of RPC round-trips. */
  async ensureFold(force = false) {
    if (this.fold && !force) return this.fold;
    const source = new NanoRpcSource("");
    const accounts = await watchSet(source, this.seeds);
    this.fold = await foldAccounts(source, accounts);
    return this.fold;
  }
  async tokenOpApplied(tokenId, carrierHash) {
    return opApplied(await this.ensureFold(), tokenId, carrierHash);
  }
  /**
   * Collateral behind a token, replayed HERE.
   *
   * An offer that accepts any token derives what is owed from this number, so
   * without it the page could not re-check such a payment for itself -- it
   * would have to take the server's word, which is the one thing this file
   * exists to avoid.
   */
  async tokenBacking(tokenId) {
    const st = stateOf(await this.ensureFold(), tokenId);
    return st.launched ? { backing: backingOf(st), circulating: circulatingOf(st) } : null;
  }
  async tokenState() {
    return stateOf(await this.ensureFold(), this.tokenId);
  }
};
function crossCheck(mine, theirs) {
  if (!theirs) {
    return { mine, theirs, agrees: false, serverOverclaimed: false, differences: ["no answer from the server"] };
  }
  const differences = [];
  const cmp = (label, a2, b) => {
    if (String(a2 ?? "") !== String(b ?? "")) differences.push(`${label}: server says ${b}, this browser says ${a2}`);
  };
  cmp("granted", mine.granted, theirs.granted);
  cmp("payer", mine.payer, theirs.payer);
  cmp("asset", mine.asset, theirs.asset);
  cmp("paid", mine.paid, theirs.paid);
  cmp("payment", mine.payment, theirs.payment);
  cmp("grant", mine.grant, theirs.grant);
  return {
    mine,
    theirs,
    agrees: differences.length === 0,
    serverOverclaimed: !!theirs.granted && !mine.granted,
    differences
  };
}
async function verifyLocally(policy, receiptHash, reader, serverVerdict) {
  const mine = await verifyPayment(policy, receiptHash, reader);
  return crossCheck(mine, serverVerdict);
}

// web/app.ts
var $2 = (id) => document.getElementById(id);
var el = (tag, cls, text) => {
  const n2 = document.createElement(tag);
  if (cls) n2.className = cls;
  if (text != null) n2.textContent = text;
  return n2;
};
var short = (s2, n2 = 10) => s2 && s2.length > n2 * 2 ? `${s2.slice(0, n2)}\u2026${s2.slice(-6)}` : s2 || "\u2014";
function log(msg, kind = "") {
  const line = el("div", kind, `${(/* @__PURE__ */ new Date()).toLocaleTimeString()}  ${msg}`);
  $2("log").appendChild(line);
  $2("log").scrollTop = $2("log").scrollHeight;
}
function status(msg, kind = "") {
  const n2 = $2("status");
  n2.className = "status " + kind;
  n2.textContent = msg;
  if (msg) log(msg, kind);
}
var cfg;
var listings = [];
var current = null;
var keys;
var tokenView = null;
var catalogueAt = "";
var myTokens = [];
var lastReceipt = "";
var SEED_KEY = "holderpay.seed.v1";
var RECEIPTS_KEY = "holderpay.receipts.v1";
function loadWallet() {
  let seed = "";
  try {
    seed = localStorage.getItem(SEED_KEY) ?? "";
  } catch {
  }
  if (!/^[0-9a-fA-F]{64}$/.test(seed)) {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    seed = [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
    try {
      localStorage.setItem(SEED_KEY, seed);
    } catch {
    }
  }
  return keysFromSeed(seed);
}
function rememberReceipt(policyId2, receipt) {
  try {
    const all = JSON.parse(localStorage.getItem(RECEIPTS_KEY) ?? "{}");
    all[policyId2] = receipt;
    localStorage.setItem(RECEIPTS_KEY, JSON.stringify(all));
  } catch {
  }
}
function recallReceipt(policyId2) {
  try {
    return JSON.parse(localStorage.getItem(RECEIPTS_KEY) ?? "{}")[policyId2] ?? "";
  } catch {
    return "";
  }
}
function renderOffer() {
  if (!current) {
    $2("offerTitle").textContent = "Nothing for sale yet";
    $2("offerDesc").textContent = "";
    $2("offerPrice").textContent = "";
    $2("payActions").replaceChildren();
    return;
  }
  const p = current.policy;
  $2("offerTitle").textContent = p.title || p.resource;
  $2("offerDesc").textContent = p.description;
  $2("switchOffer").hidden = listings.length < 2;
  const box = $2("offerPrice");
  box.replaceChildren();
  const prices = acceptedTokens(p).map((a2) => ({ a: a2, rank: rankOf(a2.tokenId) })).sort((x2, y) => y.rank > x2.rank ? 1 : y.rank < x2.rank ? -1 : 0).map(({ a: a2 }) => `${fromRaw(a2.price, a2.decimals)} ${a2.symbol || a2.tokenId.slice(0, 6)}`);
  if (p.priceXno) prices.push(`${fromRaw(p.priceXno, 30)} XNO`);
  box.appendChild(el("span", "", prices[0] ?? "\u2014"));
  if (prices.length > 1) box.appendChild(el("span", "alt", `or ${prices.slice(1).join(" / ")}`));
  renderPayActions();
}
function payOption(label, hint, onClick, disabled = false) {
  const btn = el("button", "primary", label);
  btn.disabled = disabled;
  btn.title = hint;
  btn.onclick = () => {
    document.querySelectorAll("#payActions button").forEach((b) => b.disabled = true);
    Promise.resolve(onClick()).finally(() => renderPayActions());
  };
  return btn;
}
function rankOf(tokenId) {
  const row = myTokens.find((t) => t.tokenId === tokenId.toLowerCase());
  if (!row) return -1n;
  try {
    return BigInt(row.backedHoldingValue);
  } catch {
    return 0n;
  }
}
function heldBalance(tokenId) {
  const row = myTokens.find((t) => t.tokenId === tokenId.toLowerCase());
  try {
    return BigInt(row?.balance ?? "0");
  } catch {
    return 0n;
  }
}
function tokenIcon(tokenId, size = 40) {
  const id = (tokenId || "").toLowerCase().padEnd(32, "0");
  const byte = (i) => parseInt(id.slice(i * 2, i * 2 + 2) || "00", 16);
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 5 5");
  svg.setAttribute("width", String(size));
  svg.setAttribute("height", String(size));
  svg.setAttribute("class", "tokenIcon");
  svg.setAttribute("aria-hidden", "true");
  const hue = byte(0) * 360 / 256;
  const bg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  bg.setAttribute("width", "5");
  bg.setAttribute("height", "5");
  bg.setAttribute("fill", `hsl(${hue} 45% 92%)`);
  svg.appendChild(bg);
  const fg = `hsl(${hue} 62% 42%)`;
  for (let col = 0; col < 3; col++) {
    for (let row = 0; row < 5; row++) {
      if (!(byte(col * 5 + row + 1) & 1)) continue;
      for (const c2 of col === 2 ? [2] : [col, 4 - col]) {
        const cell = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        cell.setAttribute("x", String(c2));
        cell.setAttribute("y", String(row));
        cell.setAttribute("width", "1");
        cell.setAttribute("height", "1");
        cell.setAttribute("fill", fg);
        svg.appendChild(cell);
      }
    }
  }
  return svg;
}
function tokenButton(opts) {
  const btn = el("button", "tokenBtn" + (opts.open ? " open" : ""));
  btn.disabled = opts.disabled;
  btn.title = opts.hint;
  btn.appendChild(tokenIcon(opts.tokenId));
  const text = el("span", "tokenBtnText");
  text.appendChild(el("span", "tokenSym", opts.symbol));
  text.appendChild(el("span", "tokenAmt", opts.amount));
  text.appendChild(el("span", "tokenNote", opts.note));
  btn.appendChild(text);
  btn.onclick = () => {
    document.querySelectorAll("#payActions button").forEach((b) => b.disabled = true);
    Promise.resolve(opts.onClick()).finally(() => renderPayActions());
  };
  return btn;
}
function openTokenNeed(row, priceXno) {
  let backing, circulating;
  try {
    backing = BigInt(row.backing ?? "0");
    circulating = BigInt(row.circulating ?? "0");
  } catch {
    return null;
  }
  if (backing <= 0n || circulating <= 0n) return null;
  return (priceXno * circulating + backing - 1n) / backing;
}
function renderPayActions() {
  if (!current) return;
  const p = current.policy;
  const box = $2("payActions");
  box.replaceChildren();
  const lanes = lanesOf(p);
  if (lanes.includes("TOKEN")) {
    const rows = acceptedTokens(p).map((a2) => ({ a: a2, have: heldBalance(a2.tokenId), rank: rankOf(a2.tokenId) })).sort((x2, y) => {
      const xOk = x2.have >= BigInt(x2.a.price) ? 1 : 0;
      const yOk = y.have >= BigInt(y.a.price) ? 1 : 0;
      if (xOk !== yOk) return yOk - xOk;
      if (x2.rank !== y.rank) return y.rank > x2.rank ? 1 : -1;
      return (x2.a.symbol || x2.a.tokenId).localeCompare(y.a.symbol || y.a.tokenId);
    });
    for (const { a: a2, have } of rows) {
      const need = BigInt(a2.price);
      const sym = a2.symbol || a2.tokenId.slice(0, 6);
      box.appendChild(
        tokenButton({
          tokenId: a2.tokenId,
          symbol: sym,
          amount: fromRaw(need, a2.decimals),
          note: have >= need ? `you hold ${fromRaw(have, a2.decimals)}` : `${fromRaw(need - have, a2.decimals)} short`,
          hint: have >= need ? `the merchant lists ${sym} at ${fromRaw(need, a2.decimals)}; you hold ${fromRaw(have, a2.decimals)}` : `you hold ${fromRaw(have, a2.decimals)} ${sym} \u2014 ${fromRaw(need - have, a2.decimals)} short`,
          disabled: have < need,
          onClick: () => payWithToken(a2)
        })
      );
    }
    const any = p.acceptAny;
    if (any?.priceXno) {
      const priceXno = BigInt(any.priceXno);
      const minBacking = BigInt(any.minBacking ?? "0");
      const listed = new Set(acceptedTokens(p).map((a2) => a2.tokenId));
      const mine = myTokens.filter((t) => !listed.has(t.tokenId) && BigInt(t.balance || "0") > 0n);
      const rest = myTokens.filter((t) => !listed.has(t.tokenId) && BigInt(t.balance || "0") === 0n);
      const byValue = (x2, y) => BigInt(y.backedHoldingValue || "0") > BigInt(x2.backedHoldingValue || "0") ? 1 : -1;
      const byBacking = (x2, y) => BigInt(y.backing || "0") > BigInt(x2.backing || "0") ? 1 : -1;
      const others = [...mine.sort(byValue), ...rest.sort(byBacking)];
      for (const t of others) {
        const need = openTokenNeed(t, priceXno);
        const have = BigInt(t.balance || "0");
        const backing = BigInt(t.backing || "0");
        const sym = t.symbol || t.tokenId.slice(0, 6);
        const belowMin = backing < minBacking;
        const usable = need !== null && !belowMin && have >= need && !t.stale;
        box.appendChild(
          tokenButton({
            tokenId: t.tokenId,
            symbol: sym,
            amount: need === null ? "\u2014" : fromRaw(need, t.decimals),
            note: t.stale ? "not in this verifier's replay" : need === null ? "nothing behind it" : belowMin ? "below this offer's minimum" : have >= need ? `you hold ${fromRaw(have, t.decimals)}` : have > 0n ? `${fromRaw(need - have, t.decimals)} short` : "you hold none",
            hint: t.stale ? `${sym} is in the catalogue from ${catalogueAt || "an earlier build"}, but this verifier has not replayed it. Hold some and it comes into the replay with your own chain.` : need === null ? `${sym} has no collateral behind it, so no amount of it can pay for anything here` : `priced by real collateral: ${sym} is backed by ${fromRaw(backing, 30)} XNO across ${fromRaw(t.circulating, t.decimals)} circulating`,
            disabled: !usable,
            open: true,
            onClick: () => payWithToken({ tokenId: t.tokenId, symbol: sym, decimals: t.decimals, price: need.toString() })
          })
        );
      }
    }
  }
  if (lanes.includes("XNO")) {
    box.appendChild(
      payOption(`Pay ${fromRaw(p.priceXno, 30)} XNO`, "straight to the merchant, wallet to wallet", () => payWithXno())
    );
  }
  const target = swapTarget(p);
  if (p.autoswap && target) {
    const canQuote = tokenView && BigInt(tokenView.poolXno ?? "0") > 0n;
    const sym = target.symbol || target.tokenId.slice(0, 6);
    box.appendChild(
      payOption(
        `Pay with XNO \u2192 ${sym}`,
        "buys the token on the AMM in your own wallet, then pays the merchant in it",
        () => payWithSwap(target),
        !canQuote
      )
    );
  }
}
function renderVerdict(mine, check) {
  const card = $2("verdictCard");
  card.hidden = false;
  const v2 = check?.mine ?? mine;
  if (!v2) return;
  const badge = $2("verdictBadge");
  badge.className = v2.granted ? "granted" : "denied";
  badge.textContent = v2.granted ? "Paid \u2713 verified on chain" : v2.reason;
  const rows = $2("verdictRows");
  rows.replaceChildren();
  const row = (k2, val) => {
    const d2 = el("div");
    d2.append(el("span", "", k2), el("span", "", val));
    rows.appendChild(d2);
  };
  if (v2.paid && v2.price) {
    const dec = v2.asset === "XNO" ? 30 : current?.policy.token?.decimals ?? 6;
    row("paid", `${fromRaw(v2.paid, dec)} / ${fromRaw(v2.price, dec)} ${v2.asset === "XNO" ? "XNO" : current?.policy.token?.symbol ?? ""}`);
  }
  if (v2.payer) row("payer", v2.payer);
  if (v2.payment) row("payment", v2.payment);
  if (v2.receipt) row("receipt", v2.receipt);
  if (v2.grant) row("grant", v2.grant);
  if (current) row("policy", current.policy.id);
  const cc = $2("crosscheck");
  cc.replaceChildren();
  if (!check) {
    cc.className = "crosscheck muted";
    cc.textContent = "checking independently\u2026";
    return;
  }
  if (check.serverOverclaimed) {
    card.open = true;
    cc.className = "crosscheck disagree";
    cc.appendChild(el("b", "", "Refused: the server claimed this grant, the ledger does not support it."));
    const ul = el("ul");
    for (const d2 of check.differences) ul.appendChild(el("li", "", d2));
    cc.appendChild(ul);
    badge.className = "denied";
    badge.textContent = "Refused \u2014 the server and the chain disagree";
  } else if (check.agrees) {
    cc.className = "crosscheck agree";
    cc.textContent = "Re-verified in this browser: the server matches the ledger.";
  } else {
    card.open = true;
    cc.className = "crosscheck disagree";
    cc.appendChild(el("b", "", "This browser and the server disagree."));
    const ul = el("ul");
    for (const d2 of check.differences) ul.appendChild(el("li", "", d2));
    cc.appendChild(ul);
  }
}
async function ensureHellos() {
  const done = `holderpay.hello.${keys.address}`;
  try {
    if (localStorage.getItem(done)) return;
  } catch {
  }
  for (const target of [cfg.anchors.holderpay, cfg.anchors.hodlgame]) {
    if (!target) continue;
    try {
      const pub = /^[0-9a-fA-F]{64}$/.test(target) ? target : uA(target);
      await submitLink(rpc, keys, pub, 1n);
    } catch {
    }
  }
  try {
    localStorage.setItem(done, "1");
  } catch {
  }
}
async function payWithXno() {
  if (!current) return;
  const p = current.policy;
  const amount = BigInt(p.priceXno);
  try {
    status(`Paying ${fromRaw(amount, 30)} XNO\u2026`);
    await ensureHellos();
    const payment = await sendXno(rpc, keys, p.merchant, amount);
    log(`payment block ${short(payment)}`, "ok");
    const receipt = await submitLink(rpc, keys, memoLink(p.id), 1n);
    log(`receipt block ${short(receipt)} \u2014 committed to policy ${short(p.id, 8)}`, "ok");
    await onPaid(receipt);
  } catch (e2) {
    status(e2.message, "err");
  }
}
async function payWithToken(a2) {
  if (!current) return;
  const p = current.policy;
  const sym = a2.symbol || a2.tokenId.slice(0, 6);
  try {
    status(`Paying ${fromRaw(a2.price, a2.decimals)} ${sym}\u2026`);
    await ensureHellos();
    const r2 = await payTokenWithReceipt(rpc, keys, a2.tokenId, p.merchant, BigInt(a2.price), memoLink(p.id));
    log(`transfer ${short(r2.fragA)} + ${short(r2.payment)}`, "ok");
    log(`receipt block ${short(r2.receipt)}`, "ok");
    await onPaid(r2.receipt);
  } catch (e2) {
    status(e2.message, "err");
  }
}
async function payWithSwap(a2) {
  if (!current) return;
  const p = current.policy;
  const want = BigInt(a2.price);
  const sym = a2.symbol || a2.tokenId.slice(0, 6);
  try {
    await ensureHellos();
    const have = heldBalance(a2.tokenId);
    if (have < want) {
      const missing = want - have;
      status(`Swapping XNO for ${fromRaw(missing, a2.decimals)} ${sym}\u2026`);
      const st = await loadTokenState(a2.tokenId, true);
      if (!st) throw new Error(`could not read ${sym}'s market`);
      const walletBalance = (await tip(rpc, keys.address)).balance;
      const plan = planSwap({
        state: st,
        walletBalance,
        myFloor: BigInt(tokenView?.you?.floor ?? "0"),
        wantTokens: missing,
        slippageBps: 300
      });
      if (plan.problem && plan.tokensOut <= 0n) throw new Error(plan.problem);
      log(
        `lane ${plan.lane}: ${fromRaw(plan.xno, 30)} XNO -> ${fromRaw(plan.tokensOut, a2.decimals)} ${sym}` + (plan.payTo ? ` (paid straight to queued seller ${short(plan.payTo)})` : " (collateral stays in your wallet)")
      );
      const h = await executeSwap(rpc, keys, a2.tokenId, plan);
      log(`swap block ${short(h)}`, "ok");
      await loadTokenState(a2.tokenId, true);
    }
    status(`Paying in ${sym}\u2026`);
    const r2 = await payTokenWithReceipt(rpc, keys, a2.tokenId, p.merchant, want, memoLink(p.id));
    log(`receipt block ${short(r2.receipt)}`, "ok");
    await onPaid(r2.receipt);
  } catch (e2) {
    status(e2.message, "err");
  }
}
async function onPaid(receipt) {
  lastReceipt = receipt;
  if (current) rememberReceipt(current.policy.id, receipt);
  await checkReceipt(receipt);
  await refreshBalances();
}
async function askServer(receipt, forge = false) {
  if (!current) return null;
  try {
    const res = await fetch(`/api/verify${forge ? "?forge=1" : ""}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ policy: current.policy, receipt, payer: keys.address })
    });
    const j2 = await res.json();
    return j2.verdict ?? null;
  } catch {
    return null;
  }
}
async function checkReceipt(receipt, forge = false) {
  if (!current || !receipt) return;
  renderVerdict(null, null);
  const theirs = await askServer(receipt, forge);
  renderVerdict(theirs, null);
  status("Verifying against the chain\u2026");
  const reader = new BrowserReader(current.policy.token?.tokenId ?? "", [
    keys.address,
    current.policy.merchant,
    cfg.anchors.holderpay
  ]);
  const check = await verifyLocally(current.policy, receipt, reader, theirs);
  renderVerdict(check.mine, check);
  if (check.serverOverclaimed) status("Refused \u2014 the server and the chain disagree", "err");
  else if (check.agrees) status(check.mine.granted ? "" : check.mine.reason, check.mine.granted ? "ok" : "");
  if (check.mine.granted && !forge) await claimAccess(receipt);
}
async function claimAccess(receipt) {
  if (!current) return;
  try {
    const { challenge } = await (await fetch("/api/challenge")).json();
    const signature = signAuth(keys.secretKey, current.policy.id, receipt, challenge);
    const res = await fetch("/api/access", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ policyId: current.policy.id, receipt, challenge, signature, payer: keys.address })
    });
    const j2 = await res.json();
    if (j2.unlock) {
      $2("unlockCard").hidden = false;
      $2("unlock").textContent = j2.unlock;
      status("", "ok");
    } else {
      status(j2.error, "err");
    }
  } catch (e2) {
    status(e2.message, "err");
  }
}
async function loadTokenState(tokenId, force = false) {
  const id = (tokenId || cfg.tokenId || "").toLowerCase();
  if (!id) return null;
  const res = await fetch(
    `/api/token?tokenId=${id}&account=${encodeURIComponent(keys.address)}${force ? "&t=" + Date.now() : ""}`
  );
  const j2 = await res.json();
  if (j2.error) return null;
  tokenView = j2;
  return {
    launched: j2.launched,
    direct: j2.direct,
    poolXno: BigInt(j2.poolXno ?? "0"),
    poolTokens: BigInt(j2.poolTokens ?? "0"),
    queue: j2.queueHead ? [{ account: j2.queueHead.account, owed: BigInt(j2.queueHead.owed) }] : [],
    earmarkFloor: /* @__PURE__ */ new Map([[keys.address, BigInt(j2.you?.floor ?? "0")]])
  };
}
async function loadTokens() {
  const res = await fetch(`/api/tokens?account=${encodeURIComponent(keys.address)}&t=${Date.now()}`);
  const j2 = await res.json();
  myTokens = Array.isArray(j2.tokens) ? j2.tokens : [];
  catalogueAt = j2.catalogue?.at ? new Date(j2.catalogue.at).toLocaleString() : "";
  const top = myTokens.find((t) => BigInt(t.balance) > 0n);
  $2("balTok").textContent = top ? fromRaw(top.balance, top.decimals) : "0";
  $2("balTokLabel").textContent = top ? top.symbol : cfg.symbol || "tokens";
  const held = myTokens.filter((t) => BigInt(t.balance) > 0n).length;
  const n2 = myTokens.length;
  $2("tokenChip").textContent = held > 1 ? `${top.symbol} +${held - 1}` : top ? top.symbol : `${n2} token${n2 === 1 ? "" : "s"}`;
}
async function refreshBalances() {
  try {
    const info = await rpc({ action: "account_info", account: keys.address });
    $2("balXno").textContent = fromRaw(info?.balance ?? "0", 30);
  } catch {
    $2("balXno").textContent = "0";
  }
  await loadTokens();
  const target = current ? swapTarget(current.policy) : null;
  if (target) await loadTokenState(target.tokenId, true);
  renderOffer();
}
async function loadListings() {
  const j2 = await (await fetch("/api/policies")).json();
  listings = j2.listings ?? [];
  const want = new URL(location.href).searchParams.get("policy");
  current = listings.find((l2) => l2.policy.id === want) ?? listings[0] ?? null;
  renderOffer();
  if (current) {
    const remembered = recallReceipt(current.policy.id);
    if (remembered) {
      lastReceipt = remembered;
      log(`found an earlier receipt for this offer (${short(remembered)}) \u2014 re-checking`);
      void checkReceipt(remembered);
    }
  }
}
function connectSocket() {
  const chip = $2("wsChip");
  const dot = chip.querySelector(".dot");
  let ws;
  let backoff = 1e3;
  const open = () => {
    ws = new WebSocket(cfg.ws);
    ws.onopen = () => {
      backoff = 1e3;
      dot.classList.add("on");
      chip.title = `subscribed on ${cfg.ws}`;
      const accounts = [keys.address, current?.policy.merchant, cfg.merchant].filter(Boolean);
      ws.send(JSON.stringify({ action: "subscribe", topic: "confirmation", ack: true, options: { accounts } }));
      log(`websocket subscribed to ${accounts.length} account(s)`);
    };
    ws.onmessage = (ev) => {
      let msg;
      try {
        msg = JSON.parse(ev.data);
      } catch {
        return;
      }
      if (msg.ack) return;
      if (msg.topic !== "confirmation") return;
      const m2 = msg.message ?? {};
      const hash = String(m2.hash ?? "").toUpperCase();
      const account = String(m2.account ?? "");
      if (account === keys.address) {
        log(`confirmed ${short(hash)} on your wallet`);
        if (hash === lastReceipt.toUpperCase()) void checkReceipt(lastReceipt);
        void refreshBalances();
      } else {
        log(`confirmed ${short(hash)} on ${short(account)}`);
        void loadTokens();
      }
    };
    ws.onclose = () => {
      dot.classList.remove("on");
      setTimeout(open, backoff);
      backoff = Math.min(3e4, backoff * 2);
    };
    ws.onerror = () => ws.close();
  };
  open();
  setInterval(() => {
    if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ action: "ping" }));
  }, 25e3);
}
function wireConfigPanel() {
  $2("cfgMerchant").value = cfg.merchant;
  $2("cfgTokenId").value = cfg.tokenId;
  $2("cfgSave").onclick = async () => {
    const val = (id) => $2(id).value.trim();
    const decimals = cfg.decimals ?? 6;
    const ids = val("cfgTokenId").toLowerCase().split(/[,\s]+/).filter(Boolean);
    const priceToken = val("cfgPriceToken");
    const priceXno = val("cfgPriceXno");
    const symbols = val("cfgSymbol").split(/[,\s]+/).filter(Boolean);
    const accept = ids.map((tokenId, i) => ({
      tokenId,
      symbol: symbols[i] ?? symbols[0] ?? "",
      decimals,
      price: toRaw(priceToken, decimals).toString()
    }));
    const body = {
      policy: {
        merchant: val("cfgMerchant"),
        resource: val("cfgResource"),
        title: val("cfgTitle"),
        description: val("cfgDesc"),
        accept: priceToken ? accept : [],
        priceXno: priceXno ? toRaw(priceXno, 30).toString() : void 0,
        autoswap: $2("cfgAutoswap").checked,
        expires: 0
      },
      unlock: $2("cfgUnlock").value
    };
    const res = await fetch("/api/policies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const j2 = await res.json();
    if (j2.error) return status(j2.error, "err");
    status("Published", "ok");
    await loadListings();
    await refreshBalances();
  };
}
async function main() {
  cfg = await (await fetch("/api/config")).json();
  keys = loadWallet();
  $2("walletAddr").textContent = keys.address;
  $2("copyAddr").onclick = () => navigator.clipboard?.writeText(keys.address);
  $2("walletMenu").onclick = () => {
    const seed = localStorage.getItem(SEED_KEY) ?? "(in memory only)";
    if (confirm("Show this wallet's seed? Anyone with it can spend the funds.")) alert(seed);
  };
  $2("receiveBtn").onclick = async () => {
    try {
      const r2 = await receiveAll(rpc, keys);
      const more = r2.remaining ? ` -- ${r2.remaining} more, press again` : "";
      status(
        r2.count ? `Received ${r2.count} block(s)${more}` : r2.remaining ? `Nothing received${more}` : "Nothing to receive",
        r2.count ? "ok" : ""
      );
      await refreshBalances();
    } catch (e2) {
      status(e2.message, "err");
    }
  };
  $2("recheck").onclick = () => checkReceipt(lastReceipt);
  $2("tamperBtn").onclick = async () => {
    if (!lastReceipt) return status("Pay first \u2014 there is nothing to tamper with yet", "err");
    status("Asking the server to forge a grant\u2026");
    await checkReceipt(lastReceipt, true);
  };
  $2("switchOffer").onclick = () => {
    const i = listings.findIndex((l2) => l2 === current);
    current = listings[(i + 1) % listings.length];
    renderOffer();
    void refreshBalances();
  };
  const step = async (name, fn) => {
    try {
      await fn();
    } catch (e2) {
      log(`${name} failed: ${e2?.message ?? e2}`, "err");
    }
  };
  await step("merchant panel", () => wireConfigPanel());
  await step("offers", () => loadListings());
  await step("websocket", () => connectSocket());
  await step("balances", () => refreshBalances());
  log(`wallet ${keys.address}`);
  log("chain access: rpc.nano.to only (proxied so the key stays server-side)");
}
void main().catch((e2) => log(`startup failed: ${e2.message}`, "err"));
/*! Bundled license information:

ieee754/index.js:
  (*! ieee754. BSD-3-Clause License. Feross Aboukhadijeh <https://feross.org/opensource> *)

buffer/index.js:
  (*!
   * The buffer module from node.js, for the browser.
   *
   * @author   Feross Aboukhadijeh <https://feross.org>
   * @license  MIT
   *)

nanocurrency/dist/nanocurrency.esm.js:
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

nanocurrency/dist/nanocurrency.esm.js:
nanocurrency/dist/nanocurrency.esm.js:
nanocurrency/dist/nanocurrency.esm.js:
nanocurrency/dist/nanocurrency.esm.js:
  (*!
   * nanocurrency-js: A toolkit for the Nano cryptocurrency.
   * Copyright (c) 2019 Marvin ROGER <dev at marvinroger dot fr>
   * Licensed under GPL-3.0 (https://git.io/vAZsK)
   *)
*/
//# sourceMappingURL=pay.js.map
