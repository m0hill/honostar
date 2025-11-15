// oxlint-disable no-extraneous-class
import { Readable, Writable } from 'node:stream'
import zlib from 'node:zlib'

const transformMap = {
  deflate: zlib.createDeflate,
  'deflate-raw': zlib.createDeflateRaw,
  gzip: zlib.createGzip,
  brotli: zlib.createBrotliCompress,
  zstd: zlib.createZstdCompress,
}

const decompressMap = {
  deflate: zlib.createInflate,
  'deflate-raw': zlib.createInflateRaw,
  gzip: zlib.createGunzip,
  brotli: zlib.createBrotliDecompress,
  zstd: zlib.createZstdDecompress,
}

globalThis.CompressionStream ??= class CompressionStream {
  constructor(format) {
    const handle = transformMap[format]()
    this.readable = Readable.toWeb(handle)
    this.writable = Writable.toWeb(handle)
  }
}

globalThis.DecompressionStream ??= class DecompressionStream {
  constructor(format) {
    const handle = decompressMap[format]()
    this.readable = Readable.toWeb(handle)
    this.writable = Writable.toWeb(handle)
  }
}
