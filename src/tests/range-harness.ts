/**
 * Manual verification harness for the Range-request streaming logic.
 * Serves a generated PDF-like buffer through the exact same header/stream
 * code path the attachments controller uses, backed by an in-memory
 * FileStorage instead of GCS.
 *
 *   npm run build && node dist/tests/range-harness.js
 *   curl -i -H "Range: bytes=0-1000" http://localhost:4999/file
 */
import express from 'express'
import { Readable } from 'node:stream'
import { FileReadRange, FileStorage, SaveFileOptions } from '../application/ports/file-storage'
import { parseRangeHeader } from '../utils/httpRange'

const FILE_SIZE = 64 * 1024
const payload = Buffer.alloc(FILE_SIZE)
payload.write('%PDF-1.4\n', 0)
for (let i = 0; i < FILE_SIZE; i++) if (payload[i] === 0) payload[i] = 65 + (i % 26)

const memoryStorage: FileStorage = {
  async save(_path: string, _data: Buffer, _options: SaveFileOptions) {},
  createReadStream(_path: string, range?: FileReadRange) {
    const start = range?.start ?? 0
    const end = range?.end ?? FILE_SIZE - 1
    return Readable.from(payload.subarray(start, end + 1))
  },
}

const app = express()

// Mirrors AttachmentsController.stream
app.get('/file', (req, res) => {
  const size = FILE_SIZE
  res.setHeader('Cache-Control', 'private, no-store')
  res.setHeader('Accept-Ranges', 'bytes')
  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', 'inline')

  const parsed = parseRangeHeader(req.headers.range, size)
  if (parsed.kind === 'unsatisfiable') {
    res.status(416).setHeader('Content-Range', `bytes */${size}`)
    res.end()
    return
  }

  let range: { start: number; end: number } | undefined
  if (parsed.kind === 'range') {
    range = parsed.range
    res.status(206)
    res.setHeader('Content-Range', `bytes ${range.start}-${range.end}/${size}`)
    res.setHeader('Content-Length', String(range.end - range.start + 1))
  } else {
    res.setHeader('Content-Length', String(size))
  }

  memoryStorage.createReadStream('test', range).pipe(res)
})

app.listen(4999, () => console.log('Range harness listening on http://localhost:4999/file'))
