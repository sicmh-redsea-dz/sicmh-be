import { ExpedienteModule, ExpedientePayload, ExpedienteStandard } from '../../domain/entities/Expediente'

export type ExpedienteInput = {
  standard?: Partial<ExpedienteStandard> | null
  module?: ExpedienteModule | null
}

const validation = (message: string) => Object.assign(new Error(message), {
  name: 'validation_errors', errors: [{ msg: message }],
})

export const visitDate = (value?: string | null): string => {
  if (value == null || value.trim() === '') return new Date().toISOString()
  if (!Number.isFinite(new Date(value).getTime())) throw validation('La fecha de la atencion no es valida.')
  return value.trim()
}

const objectOrEmpty = (value: unknown): Record<string, unknown> => {
  if (value == null) return {}
  if (typeof value !== 'object' || Array.isArray(value)) throw validation('El expediente debe contener objetos validos.')
  return value as Record<string, unknown>
}

/** Empty text satisfies the target's NOT NULL text columns without inventing clinical content.
 * Do not create a medical_record at all when there is no clinical information. */
export const normalizeExpediente = (
  input: ExpedienteInput | null | undefined,
  previous?: ExpedientePayload | null,
): ExpedientePayload | undefined => {
  if (input == null) return undefined
  objectOrEmpty(input)
  const incomingStandard = objectOrEmpty(input.standard)
  const incomingModule = objectOrEmpty(input.module)
  const standard: ExpedienteStandard = {
    chiefComplaint: '', currentIllness: '', physicalExam: '', ...previous?.standard,
  }
  for (const field of ['chiefComplaint', 'currentIllness', 'physicalExam', 'allergies', 'currentMeds'] as const) {
    const value = incomingStandard[field]
    if (value === undefined) continue
    if (value !== null && typeof value !== 'string') throw validation(`${field} debe ser texto.`)
    standard[field] = value ?? ''
  }
  const module: ExpedienteModule = { ...previous?.module }
  const numericFields = ['painScale', 'glasgow'] as const
  for (const field of numericFields) {
    const value = incomingModule[field]
    if (value == null || value === '') continue
    if (!Number.isSafeInteger(Number(value))) throw validation(`${field} debe ser un entero.`)
    module[field] = Number(value)
  }
  for (const field of [
    'followUpPlan', 'referrals', 'triageLevel', 'arrivalMode', 'disposition', 'injuryMechanism',
    'preOpDiagnosis', 'postOpDiagnosis', 'procedure', 'anesthesiaType', 'surgeryStart', 'surgeryEnd',
    'findings', 'complications', 'admissionDiagnosis', 'admissionReason', 'service', 'bed',
    'evolutionSummary', 'dischargePlan', 'dischargeDate',
  ] as const) {
    const value = incomingModule[field]
    if (value === undefined) continue
    if (value !== null && typeof value !== 'string') throw validation(`${field} debe ser texto.`)
    if (['surgeryStart', 'surgeryEnd', 'dischargeDate'].includes(field)
      && value && !Number.isFinite(new Date(value).getTime())) throw validation(`${field} no es una fecha valida.`)
    module[field] = value ?? ''
  }
  const hasContent = [...Object.values(standard), ...Object.values(module)]
    .some((value) => value != null && (typeof value === 'number' || String(value).trim() !== ''))
  return !previous && !hasContent ? undefined : { standard, module }
}
