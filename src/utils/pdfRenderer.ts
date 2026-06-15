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
        '--no-first-run',
        '--no-zygote',
        '--single-process'
      ]
    }).catch((err) => {
      browserPromise = null
      throw err
    })
  }

  const browser = await browserPromise
  if (!browser.connected) {
    browserPromise = null
    return getBrowser()
  }

  return browser
}

export const renderPdfFromHtml = async (html: string): Promise<Buffer> => {
  const browser = await getBrowser()
  const page = await browser.newPage()

  try {
    page.setDefaultNavigationTimeout(15000)
    await page.setContent(html, { waitUntil: 'domcontentloaded' })
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true
    })
    return Buffer.from(pdf)
  } finally {
    await page.close().catch(() => {})
  }
}
