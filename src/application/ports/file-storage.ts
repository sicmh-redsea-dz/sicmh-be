export interface FileReadRange {
  start?: number
  end?: number
}

export interface SaveFileOptions {
  contentType: string
  cacheControl?: string
  ifNotExists?: boolean
}

export interface FileStorage {
  save(objectPath: string, data: Buffer, options: SaveFileOptions): Promise<void>
  createReadStream(objectPath: string, range?: FileReadRange): NodeJS.ReadableStream
  exists?(objectPath: string): Promise<boolean>
}
