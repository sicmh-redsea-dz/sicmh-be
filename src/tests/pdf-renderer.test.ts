import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { isTransientPdfRenderError } from '../utils/pdfRenderer'

describe('PDF renderer transient errors', () => {
  test('recognizes Puppeteer frame initialization failures as transient', () => {
    assert.equal(isTransientPdfRenderError(new Error('Requesting main frame too early!')), true)
    assert.equal(isTransientPdfRenderError(new Error('Navigating frame was detached')), true)
    assert.equal(isTransientPdfRenderError(new Error('Protocol error: Session closed')), true)
  })

  test('does not retry deterministic PDF input and output failures', () => {
    assert.equal(isTransientPdfRenderError(new Error('Invalid HTML content')), false)
    assert.equal(isTransientPdfRenderError(new Error('PDF generation produced empty output')), false)
  })
})
