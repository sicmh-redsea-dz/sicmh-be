import puppeteer, { Browser } from 'puppeteer'

let browserPromise: Promise<Browser> | null = null

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

  let browser: Browser | null = null
  let page: any = null

  try {
    browser = await getBrowser()
    page = await browser.newPage()

    page.setDefaultNavigationTimeout(15000)

    await page.setContent(html, { waitUntil: 'domcontentloaded' })

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
  } catch (error: any) {
    console.error('PDF Rendering Error:', {
      message: error?.message,
      code: error?.code,
      stack: error?.stack,
      htmlLength: html?.length
    })
    throw new Error(`PDF generation failed: ${error?.message || 'Unknown error'}`)
  } finally {
    if (page) {
      await page.close().catch((err: any) => {
        console.warn('Error closing page:', err?.message)
      })
    }
  }
}

