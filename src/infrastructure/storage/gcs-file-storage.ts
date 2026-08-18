import { Storage, StorageOptions } from '@google-cloud/storage'
import { config } from '../../config/env'
import { FileReadRange, FileStorage, SaveFileOptions } from '../../application/ports/file-storage'

let storageClient: Storage | null = null

const getClient = (): Storage => {
  if (!storageClient) {
    const options: StorageOptions = {}
    if (config.GCS_KEY_FILE) options.keyFilename = config.GCS_KEY_FILE
    storageClient = new Storage(options)
  }
  return storageClient
}

export class GcsFileStorage implements FileStorage {
  constructor(private readonly bucketName: string) {}

  async save(objectPath: string, data: Buffer, options: SaveFileOptions): Promise<void> {
    const file = getClient().bucket(this.bucketName).file(objectPath)
    await file.save(data, {
      resumable: false,
      contentType: options.contentType,
      metadata: options.cacheControl ? { cacheControl: options.cacheControl } : undefined,
    })
  }

  createReadStream(objectPath: string, range?: FileReadRange): NodeJS.ReadableStream {
    const file = getClient().bucket(this.bucketName).file(objectPath)
    return file.createReadStream({
      start: range?.start,
      end: range?.end,
      validation: range?.start !== undefined || range?.end !== undefined ? false : undefined,
    })
  }

  async exists(objectPath: string): Promise<boolean> {
    const [exists] = await getClient().bucket(this.bucketName).file(objectPath).exists()
    return exists
  }
}
