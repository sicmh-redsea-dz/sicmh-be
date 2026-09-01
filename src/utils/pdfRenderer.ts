import puppeteer, { Browser, Page } from 'puppeteer'

let browserPromise: Promise<Browser> | null = null

const MAX_RENDER_ATTEMPTS = 3

export const isTransientPdfRenderError = (error: unknown): boolean => {
  const message = error instanceof Error ? error.message : String(error)
  return [
    'Requesting main frame too early',
    'Navigating frame was detached',
    'Target closed',
    'Session closed',
    'Connection closed',
  ].some(fragment => message.includes(fragment))
}

const wait = (milliseconds: number) => new Promise<void>(resolve => setTimeout(resolve, milliseconds))

const getBrowser = async (): Promise<Browser> => {
  if (!browserPromise) {
    browserPromise = puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-first-run'
      ]
    }).catch((err) => {
      browserPromise = null
      throw err
    })
  }

  const browser = await browserPromise
  try {
    if (!browser.connected) {
      browserPromise = null
      return getBrowser()
    }
  } catch {
    browserPromise = null
    return getBrowser()
  }

  return browser
}

export const renderPdfFromHtml = async (html: string): Promise<Buffer> => {
  if (!html || typeof html !== 'string' || html.trim().length === 0) {
    throw new Error('Invalid HTML content provided for PDF generation')
  }

  try {
    for (let attempt = 1; attempt <= MAX_RENDER_ATTEMPTS; attempt += 1) {
      let page: Page | null = null
      try {
        const browser = await getBrowser()
        page = await browser.newPage()
        page.setDefaultNavigationTimeout(15000)

        await page.setContent(html, { waitUntil: 'domcontentloaded' })
        await page.evaluate(async () => {
          const images = Array.from(document.images)
          await Promise.all(images.map((img) => img.complete
            ? Promise.resolve()
            : new Promise<void>((resolve) => {
                img.addEventListener('load', () => resolve(), { once: true })
                img.addEventListener('error', () => resolve(), { once: true })
              })))
        })

        const pdf = await page.pdf({
          format: 'A4',
          printBackground: true,
          preferCSSPageSize: true,
          margin: { top: '0.5cm', right: '0.5cm', bottom: '0.5cm', left: '0.5cm' }
        })

        if (!pdf || pdf.length === 0) {
          throw new Error('PDF generation produced empty output')
        }

        return Buffer.from(pdf)
      } catch (error) {
        if (attempt === MAX_RENDER_ATTEMPTS || !isTransientPdfRenderError(error)) {
          throw error
        }
        console.warn('Transient PDF rendering error; retrying with a new page.', {
          attempt,
          message: error instanceof Error ? error.message : String(error),
        })
        await wait(attempt * 100)
      } finally {
        if (page) {
          await page.close().catch((err: any) => {
            console.warn('Error closing page:', err?.message)
          })
        }
      }
    }

    throw new Error('PDF generation exhausted all attempts')
  } catch (error: any) {
    console.error('PDF Rendering Error:', {
      message: error?.message,
      code: error?.code,
      stack: error?.stack,
      htmlLength: html?.length
    })
    throw new Error(`PDF generation failed: ${error?.message || 'Unknown error'}`)
  }
}
