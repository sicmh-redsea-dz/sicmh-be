import { NextFunction, Request, Response } from 'express'
import multer, { MulterError } from 'multer'
import { TenantContext } from '../../infrastructure/database/TenantContext'

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024 // hard cap; per-source limits are enforced in the service

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
})

export const singleFileUpload = (fieldName: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Multer finishes on socket stream events, which escape the AsyncLocalStorage
    // scope set by authMiddleware — capture the pool now and re-enter the tenant
    // context before handing off to the controller.
    const pool = TenantContext.getPool()

    upload.single(fieldName)(req, res, (err: any) => {
      if (err instanceof MulterError) {
        const msg = err.code === 'LIMIT_FILE_SIZE'
          ? 'El archivo excede el tamaño máximo permitido (25MB).'
          : 'No se pudo procesar el archivo enviado.'
        next(Object.assign(new Error('Validation error'), { name: 'validation_errors', errors: [{ msg }] }))
        return
      }
      TenantContext.run(pool, () => next(err))
    })
  }
}
