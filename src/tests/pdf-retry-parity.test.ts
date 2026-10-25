import assert from 'node:assert/strict'
import { test } from 'node:test'
import puppeteer from 'puppeteer'
import { renderPdfFromHtml } from '../utils/pdfRenderer'

test('PDF retries transient failures, waits for images and closes each page', async () => {
  const original = puppeteer.launch
  let pages = 0, closed = 0, evaluated = false
  ;(puppeteer as any).launch = async () => ({ connected: true, newPage: async () => {
    pages++
    return { setDefaultNavigationTimeout() {}, setContent: async () => {
      if (pages < 3) throw new Error('Navigating frame was detached')
    }, evaluate: async () => { evaluated = true }, pdf: async () => {
      assert.equal(evaluated, true)
      return Buffer.from('%PDF-test')
    }, close: async () => { closed++ } }
  } })
  try {
    assert.match((await renderPdfFromHtml('<html><body>Test</body></html>')).toString(), /PDF/)
    assert.equal(pages, 3); assert.equal(closed, 3)
  } finally { puppeteer.launch = original }
})
