import { NextFunction, Request, Response } from 'express'

type ResponseMode = 'standard' | 'payload' | 'manual'

interface ResponseContext<T> {
  req: Request
  res: Response
  next: NextFunction
  result: T
  statusCode: number
  message: string
}

interface AsyncHandlerOptions<T = unknown> {
  mode?: ResponseMode
  statusCode?: number
  message?: string
  responder?: (context: ResponseContext<T>) => Promise<void> | void
}

interface HtmlDecoratorOptions {
  statusCode?: number
}

interface PdfDecoratorOptions<T = Buffer> {
  statusCode?: number
  disposition?: 'inline' | 'attachment'
  filename: string | ((req: Request, result: T) => string)
  getBody?: (result: T) => Buffer
}

const DEFAULT_MESSAGE = 'Service executed successfully'

const sendStandardResponse = <T>(context: ResponseContext<T>) => {
  context.res.status(context.statusCode).json({
    success: true,
    message: context.message,
    data: context.result,
  })
}

const sendPayloadResponse = <T>(context: ResponseContext<T>) => {
  context.res.status(context.statusCode).json(context.result)
}

export const asyncHandler = <T = unknown>(options: AsyncHandlerOptions<T> = {}) => {
  const {
    mode = 'standard',
    statusCode = 200,
    message = DEFAULT_MESSAGE,
    responder,
  } = options

  return (_target: any, _propertyKey: string, descriptor: PropertyDescriptor) => {
    const originalMethod = descriptor.value

    descriptor.value = async function (...args: any[]) {
      const [req, res, next] = args as [Request, Response, NextFunction]

      try {
        const result = await originalMethod.apply(this, args)

        if (result === undefined) return

        const context: ResponseContext<T> = {
          req,
          res,
          next,
          result,
          statusCode,
          message,
        }

        if (responder) {
          await responder(context)
          return
        }

        if (mode === 'manual') return
        if (mode === 'payload') {
          sendPayloadResponse(context)
          return
        }

        sendStandardResponse(context)
      } catch (err: any) {
        next(err)
      }
    }

    return descriptor
  }
}

export const htmlResponse = (options: HtmlDecoratorOptions = {}) =>
  asyncHandler<string>({
    mode: 'manual',
    statusCode: options.statusCode ?? 200,
    responder: ({ res, result, statusCode }) => {
      res.status(statusCode).type('html').send(result)
    },
  })

export const pdfResponse = <T = Buffer>(options: PdfDecoratorOptions<T>) =>
  asyncHandler<T>({
    mode: 'manual',
    statusCode: options.statusCode ?? 200,
    responder: ({ req, res, result, statusCode }) => {
      const body = options.getBody ? options.getBody(result) : (result as unknown as Buffer)
      const filename = typeof options.filename === 'function'
        ? options.filename(req, result)
        : options.filename
      const disposition = options.disposition ?? 'attachment'

      res.writeHead(statusCode, {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `${disposition}; filename="${filename}"`,
        'Content-Length': body.length,
      })
      res.end(body)
    },
  })
