import { and, desc, eq, isNull } from 'drizzle-orm'
import { TenantContext } from '../../infrastructure/database/TenantContext'
import { invoiceNumberSequences } from '../../infrastructure/database/schema/tenant'

const invalid = (message: string) => Object.assign(new Error(message), {
  name: 'validation_errors', errors: [{ msg: message }],
})

export const validateInvoiceSequence = (input: Record<string, unknown>) => {
  const code = String(input.code ?? '').trim()
  const prefix = String(input.prefix ?? '').trim()
  const cai = String(input.cai ?? '').trim()
  const minNumber = input.minNumber
  const maxNumber = input.maxNumber
  const padding = input.padding ?? 8
  if (!code || code.length > 50 || !cai || cai.length > 100 || prefix.length > 30) {
    throw invalid('Código, CAI y prefijo de la serie no válidos.')
  }
  if (typeof minNumber !== 'number' || typeof maxNumber !== 'number' ||
      !Number.isInteger(minNumber) || !Number.isInteger(maxNumber) || minNumber < 1 ||
      maxNumber < minNumber || maxNumber > 2147483647 ||
      typeof padding !== 'number' || !Number.isInteger(padding) || padding < 1 || padding > 10) {
    throw invalid('El rango SAR debe contener enteros positivos, máximo mayor o igual al mínimo y longitud entre 1 y 10.')
  }
  return { code, prefix, cai, minNumber, maxNumber, padding }
}

export const nextInvoiceSequenceNumber = (sequence: {
  currentNumber: number; minNumber: number; maxNumber: number; prefix: string; padding: number
}) => {
  const number = sequence.currentNumber + 1
  if (number < sequence.minNumber || number > sequence.maxNumber) throw invalid('El rango de numeración SAR está agotado.')
  return { number, formatted: `${sequence.prefix}${String(number).padStart(sequence.padding, '0')}` }
}

export class InvoiceNumberSequencesService {
  list() {
    return TenantContext.getDb().select().from(invoiceNumberSequences)
      .where(isNull(invoiceNumberSequences.deletedAt)).orderBy(desc(invoiceNumberSequences.createdAt))
  }

  async create(input: Record<string, unknown>) {
    const values = validateInvoiceSequence(input)
    return TenantContext.getDb().transaction(async (tx) => {
      await tx.select({ id: invoiceNumberSequences.id }).from(invoiceNumberSequences)
        .where(eq(invoiceNumberSequences.activeKey, 'sar')).for('update')
      // Preserve historical ranges. Rollover creates a new series instead of resetting a counter.
      const previous = await tx.select().from(invoiceNumberSequences)
        .where(eq(invoiceNumberSequences.prefix, values.prefix))
      if (previous.some((row) => values.minNumber <= row.maxNumber && values.maxNumber >= row.minNumber)) {
        throw invalid('El rango se superpone con una serie existente que utiliza el mismo prefijo.')
      }
      await tx.update(invoiceNumberSequences).set({ activeKey: null })
        .where(and(eq(invoiceNumberSequences.activeKey, 'sar'), isNull(invoiceNumberSequences.deletedAt)))
      const [created] = await tx.insert(invoiceNumberSequences)
        .values({ ...values, currentNumber: values.minNumber - 1, activeKey: 'sar' }).$returningId()
      const [row] = await tx.select().from(invoiceNumberSequences).where(eq(invoiceNumberSequences.id, created.id))
      return row
    })
  }
}
