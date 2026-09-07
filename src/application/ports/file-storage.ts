export interface FileReadRange {
  start?: number
  end?: number
}

export interface SaveFileOptions {
  contentType: string
  cacheControl?: string
}

export interface FileStorage {
  save(objectPath: string, data: Buffer, options: SaveFileOptions): Promise<void>
  exists(objectPath: string): Promise<boolean>
  createReadStream(objectPath: string, range?: FileReadRange): NodeJS.ReadableStream
}
