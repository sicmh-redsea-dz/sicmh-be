export interface ByteRange {
  start: number
  end: number
}

export type RangeParseResult =
  | { kind: 'none' }            // no Range header — serve the full body (200)
  | { kind: 'range'; range: ByteRange } // valid single range — serve partial (206)
  | { kind: 'unsatisfiable' }   // malformed or out of bounds — respond 416

/**
 * Parses a single-range `Range: bytes=start-end` header against a known size.
 * Multi-range requests are answered with the first range only, which is a
 * valid server behavior and what PDF viewers actually use.
 */
export const parseRangeHeader = (header: string | undefined, size: number): RangeParseResult => {
  if (!header) return { kind: 'none' }

  const match = /^bytes=(\d*)-(\d*)(?:,|$)/.exec(header.trim())
  if (!match) return { kind: 'unsatisfiable' }

  const [, rawStart, rawEnd] = match
  if (rawStart === '' && rawEnd === '') return { kind: 'unsatisfiable' }

  // Suffix form: bytes=-N → last N bytes
  if (rawStart === '') {
    const suffix = parseInt(rawEnd, 10)
    if (suffix === 0) return { kind: 'unsatisfiable' }
    const start = Math.max(0, size - suffix)
    return { kind: 'range', range: { start, end: size - 1 } }
  }

  const start = parseInt(rawStart, 10)
  const end = rawEnd === '' ? size - 1 : Math.min(parseInt(rawEnd, 10), size - 1)

  if (start >= size || start > end) return { kind: 'unsatisfiable' }
  return { kind: 'range', range: { start, end } }
}
