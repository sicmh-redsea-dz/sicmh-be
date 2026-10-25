export const clinicalProfileFields = ['familyHst', 'backgroundHst', 'pathologicalHst', 'surgicalHst', 'allergies', 'currentMeds'] as const
export interface ClinicalProfileData {
  familyHst: string
  backgroundHst: string
  pathologicalHst: string
  surgicalHst: string
  allergies: string
  currentMeds: string
  allergyStatus: 'unknown' | 'none_known' | 'recorded'
}
export interface ClinicalProfileReview {
  version: number
  data: ClinicalProfileData
}
export const emptyClinicalProfile = (): ClinicalProfileData => ({
  familyHst: '', backgroundHst: '', pathologicalHst: '', surgicalHst: '',
  allergies: '', currentMeds: '', allergyStatus: 'unknown',
})
export const profileValidation = (message: string) => Object.assign(new Error(message), {
  name: 'validation_errors', errors: [{ msg: message }],
})
export const validateClinicalProfileReview = (value: unknown): ClinicalProfileReview => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw profileValidation('Revise la ficha clinica.')
  const { version, data } = value as ClinicalProfileReview
  if (!Number.isSafeInteger(version) || version < 0 || !data || typeof data !== 'object' || Array.isArray(data)) {
    throw profileValidation('La version o los datos de la ficha clinica no son validos.')
  }
  const result = emptyClinicalProfile()
  for (const field of clinicalProfileFields) {
    if (typeof data[field] !== 'string' || data[field].length > 20000) throw profileValidation(`${field} debe ser texto de hasta 20000 caracteres.`)
    result[field] = data[field].trim()
  }
  if (!['unknown', 'none_known', 'recorded'].includes(data.allergyStatus)) throw profileValidation('Seleccione el estado de alergias.')
  result.allergyStatus = data.allergyStatus
  if ((result.allergyStatus === 'recorded') !== Boolean(result.allergies)) throw profileValidation('El estado de alergias debe coincidir con las alergias registradas.')
  return { version, data: result }
}
