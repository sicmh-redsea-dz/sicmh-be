import { and, desc, eq, inArray, isNull } from 'drizzle-orm'
import { ClinicalAttachmentsService } from './clinical-attachments.service'
import { renderPdfFromHtml } from '../../utils/pdfRenderer'
import { PoolManager } from '../../infrastructure/database/PoolManager'
import { companies } from '../../infrastructure/database/schema/global'
import { config } from '../../config/env'
import { FileStorage } from '../ports/file-storage'
import { TenantContext } from '../../infrastructure/database/TenantContext'
import {
  clinicalEncounters,
  consentInstances,
  consentTemplates,
  consentTemplateVersions,
  patients,
  staffMembers,
} from '../../infrastructure/database/schema/tenant'

type ConsentTemplateDto = {
  id: string
  name: string
  current_version: number
  content: string
  is_active: number
  created_at: string
  updated_at: string
}

type ConsentInstanceDto = {
  id: string
  template_id: string
  template_name: string
  template_version: number
  status: 'printed' | 'accepted'
  acceptance_method: 'checkbox' | 'drawn_signature' | 'physical' | null
  signer_name: string | null
  attachment_id: string | null
  accepted_at: string | null
  created_at: string
}

type ConsentDocumentContext = {
  visitId: string | null
  patientId: string
  patientName: string
  patientAge: number | null
  patientPhone: string | null
  patientIdentification: string | null
  doctorId: string
  doctorName: string
  clinicName: string
  logoUrl: string
  signatureUrl: string | null
  stampUrl: string | null
  hasDoctorSignature: boolean
  hasDoctorStamp: boolean
  template: ConsentTemplateDto
  visitDate: string
}

type PrescriptionContext = {
  visitId: string
  visitDate: string
  treatment: string | null
  diagnosis: string | null
  patientId: string
  patientName: string
  patientBirthDate: string | null
  patientIdentification: string | null
  doctorId: string
  doctorUserId: string | null
  doctorName: string
  doctorSpecialty: string | null
  doctorPosition: string | null
  doctorPhone: string | null
  doctorEmail: string | null
  doctorAddress: string | null
  clinicName: string
  logoUrl: string
  signatureUrl: string | null
  stampUrl: string | null
}

type AcceptConsentPayload = {
  mode?: string
  signatureDataUrl?: string | null
  signerType?: string | null
  signerName?: string | null
  signerIdentification?: string | null
  signerRelationship?: string | null
  signerPhone?: string | null
  expectedTemplateVersion?: number
}

type UploadedPhysicalFile = {
  buffer: Buffer
  originalName: string
  mimeType: string
}

type VisitRecord = {
  encounter: typeof clinicalEncounters.$inferSelect
  patient: typeof patients.$inferSelect
  staff: typeof staffMembers.$inferSelect
}

const formatIsoDate = (value: Date | null | undefined) => value ? value.toISOString() : null

export class ClinicalDocumentsService {
  constructor(
    private readonly attachmentsService: ClinicalAttachmentsService,
    private readonly publicStorage: FileStorage,
  ) {}

  async getPrescription(visitId: string, tenantCode: string): Promise<PrescriptionContext> {
    const visit = await this.loadVisitRecord(visitId)
    const clinicName = await this.getClinicName(tenantCode)
    const assets = await this.loadDoctorAssets(tenantCode, visit.staff.userId)

    return {
      visitId: visit.encounter.id,
      visitDate: visit.encounter.occurredAt.toISOString(),
      treatment: visit.encounter.treatment ?? null,
      diagnosis: visit.encounter.diagnosis ?? null,
      patientId: visit.patient.id,
      patientName: this.fullName(visit.patient.firstName, visit.patient.lastName),
      patientBirthDate: formatIsoDate(visit.patient.birthDate),
      patientIdentification: visit.patient.identification ?? null,
      doctorId: visit.staff.id,
      doctorUserId: visit.staff.userId ?? null,
      doctorName: this.fullName(visit.staff.firstName, visit.staff.lastName),
      doctorSpecialty: visit.staff.specialty ?? null,
      doctorPosition: visit.staff.position ?? null,
      doctorPhone: visit.staff.phone ?? null,
      doctorEmail: visit.staff.email ?? null,
      doctorAddress: null,
      clinicName,
      logoUrl: this.publicUrl(`${tenantCode}/logo.png`),
      signatureUrl: assets.signatureUrl,
      stampUrl: assets.stampUrl,
    }
  }

  async listTemplates(includeInactive = false): Promise<ConsentTemplateDto[]> {
    const db = TenantContext.getDb()
    const rows = await db
      .select()
      .from(consentTemplates)
      .where(includeInactive
        ? isNull(consentTemplates.deletedAt)
        : and(eq(consentTemplates.isActive, true), isNull(consentTemplates.deletedAt)))
      .orderBy(desc(consentTemplates.updatedAt))

    if (rows.length === 0) return []

    const versionRows = await db
      .select()
      .from(consentTemplateVersions)
      .where(and(
        inArray(consentTemplateVersions.templateId, rows.map((row) => row.id)),
        isNull(consentTemplateVersions.deletedAt),
      ))

    const currentContentByTemplate = new Map(
      versionRows.map((row) => [`${row.templateId}:${row.version}`, row.content])
    )

    return rows.map((row) => this.toTemplateDto(row, currentContentByTemplate.get(`${row.id}:${row.currentVersion}`) ?? ''))
  }

  async createTemplate(name: string, content: string): Promise<ConsentTemplateDto> {
    const normalizedName = name.trim()
    const normalizedContent = content.trim()
    if (!normalizedName || !normalizedContent) {
      throw this.validationError('El nombre y contenido del consentimiento son requeridos.')
    }

    const db = TenantContext.getDb()
    const [created] = await db
      .insert(consentTemplates)
      .values({ name: normalizedName, currentVersion: 1, isActive: true })
      .$returningId()

    await db.insert(consentTemplateVersions).values({
      templateId: created.id,
      version: 1,
      content: normalizedContent,
    })

    const [template] = await db.select().from(consentTemplates).where(eq(consentTemplates.id, created.id)).limit(1)
    if (!template) throw new Error('No se pudo crear la plantilla de consentimiento.')
    return this.toTemplateDto(template, normalizedContent)
  }

  async updateTemplate(templateId: string, name: string, content: string): Promise<ConsentTemplateDto> {
    const template = await this.findTemplate(templateId, true)
    const normalizedName = name.trim()
    const normalizedContent = content.trim()
    if (!normalizedName || !normalizedContent) {
      throw this.validationError('El nombre y contenido del consentimiento son requeridos.')
    }

    const nextVersion = template.current_version + 1
    await TenantContext.getDb().insert(consentTemplateVersions).values({
      templateId,
      version: nextVersion,
      content: normalizedContent,
    })

    await TenantContext.getDb()
      .update(consentTemplates)
      .set({ name: normalizedName, currentVersion: nextVersion })
      .where(and(eq(consentTemplates.id, templateId), isNull(consentTemplates.deletedAt)))

    const [updated] = await TenantContext.getDb().select().from(consentTemplates).where(eq(consentTemplates.id, templateId)).limit(1)
    if (!updated) throw this.notFoundError('Plantilla de consentimiento no encontrada.')
    return this.toTemplateDto(updated, normalizedContent)
  }

  async setTemplateActive(templateId: string, active: boolean): Promise<{ updated: boolean }> {
    const result = await TenantContext.getDb()
      .update(consentTemplates)
      .set({ isActive: active })
      .where(and(eq(consentTemplates.id, templateId), isNull(consentTemplates.deletedAt)))
    if ((result as any)[0]?.affectedRows === 0) {
      throw this.notFoundError('Plantilla de consentimiento no encontrada.')
    }
    return { updated: true }
  }

  async listVisitConsents(visitId: string): Promise<ConsentInstanceDto[]> {
    const rows = await TenantContext.getDb()
      .select({ instance: consentInstances, template: consentTemplates })
      .from(consentInstances)
      .innerJoin(consentTemplates, eq(consentInstances.templateId, consentTemplates.id))
      .where(and(
        eq(consentInstances.clinicalEncounterId, visitId),
        isNull(consentInstances.deletedAt),
        isNull(consentTemplates.deletedAt),
      ))
      .orderBy(desc(consentInstances.updatedAt))

    return rows.map(({ instance, template }) => ({
      id: instance.id,
      template_id: template.id,
      template_name: template.name,
      template_version: instance.templateVersion,
      status: instance.status,
      acceptance_method: instance.acceptanceMethod ?? null,
      signer_name: instance.signerName ?? null,
      attachment_id: instance.attachmentId ?? null,
      accepted_at: formatIsoDate(instance.acceptedAt),
      created_at: instance.createdAt.toISOString(),
    }))
  }

  async getVisitContext(visitId: string, templateId: string, tenantCode: string): Promise<ConsentDocumentContext> {
    const template = await this.findTemplate(templateId, false)
    const visit = await this.loadVisitRecord(visitId)
    return this.buildConsentContext({
      visitId,
      visitDate: visit.encounter.occurredAt,
      patientId: visit.patient.id,
      patientFirstName: visit.patient.firstName,
      patientLastName: visit.patient.lastName,
      patientBirthDate: visit.patient.birthDate,
      patientPhone: visit.patient.phone ?? null,
      patientIdentification: visit.patient.identification ?? null,
      doctorId: visit.staff.id,
      doctorFirstName: visit.staff.firstName,
      doctorLastName: visit.staff.lastName,
      doctorUserId: visit.staff.userId ?? null,
      template,
      tenantCode,
    })
  }

  async getDraftContext(
    patientId: string,
    doctorId: string,
    date: string | null,
    templateId: string,
    tenantCode: string,
  ): Promise<ConsentDocumentContext> {
    const template = await this.findTemplate(templateId, false)
    const [patient, doctor] = await Promise.all([
      this.findPatient(patientId),
      this.findDoctor(doctorId),
    ])

    return this.buildConsentContext({
      visitId: null,
      visitDate: date ? new Date(date) : new Date(),
      patientId: patient.id,
      patientFirstName: patient.firstName,
      patientLastName: patient.lastName,
      patientBirthDate: patient.birthDate,
      patientPhone: patient.phone ?? null,
      patientIdentification: patient.identification ?? null,
      doctorId: doctor.id,
      doctorFirstName: doctor.firstName,
      doctorLastName: doctor.lastName,
      doctorUserId: doctor.userId ?? null,
      template,
      tenantCode,
    })
  }

  async printDraft(patientId: string, doctorId: string, date: string | null, templateId: string, tenantCode: string): Promise<Buffer> {
    const context = await this.getDraftContext(patientId, doctorId, date, templateId, tenantCode)
    return renderPdfFromHtml(this.renderConsentHtml(context, { kind: 'printed' }))
  }

  async printVisit(
    visitId: string,
    templateId: string,
    expectedTemplateVersion: number | undefined,
    tenantCode: string,
  ): Promise<Buffer> {
    const context = await this.getVisitContext(visitId, templateId, tenantCode)
    this.assertExpectedTemplateVersion(context.template.current_version, expectedTemplateVersion)
    const buffer = await renderPdfFromHtml(this.renderConsentHtml(context, { kind: 'printed' }))

    await TenantContext.getDb()
      .insert(consentInstances)
      .values({
        templateId,
        clinicalEncounterId: visitId,
        patientId: context.patientId,
        staffMemberId: context.doctorId,
        templateVersion: context.template.current_version,
        status: 'printed',
        printedAt: new Date(),
      })
      .onDuplicateKeyUpdate({
        set: {
          patientId: context.patientId,
          staffMemberId: context.doctorId,
          templateVersion: context.template.current_version,
          status: 'printed',
          acceptanceMethod: null,
          signerType: null,
          signerName: null,
          signerIdentification: null,
          signerRelationship: null,
          signerPhone: null,
          attachmentId: null,
          acceptedAt: null,
          printedAt: new Date(),
          deletedAt: null,
        },
      })

    return buffer
  }

  async acceptVisit(
    visitId: string,
    templateId: string,
    payload: AcceptConsentPayload,
    tenantCode: string,
    actorId: string,
  ): Promise<{ id: string; attachmentId: string }> {
    const context = await this.getVisitContext(visitId, templateId, tenantCode)
    this.assertExpectedTemplateVersion(context.template.current_version, payload.expectedTemplateVersion)

    const mode = payload.mode === 'drawn_signature' ? 'drawn_signature' : 'checkbox'
    if (!context.hasDoctorSignature || !context.hasDoctorStamp) {
      throw this.validationError('El médico debe tener firma y sello configurados para aceptar electrónicamente.')
    }
    if (mode === 'drawn_signature' && !payload.signatureDataUrl) {
      throw this.validationError('La firma del aceptante es requerida.')
    }
    if (!(payload.signerName ?? '').trim()) {
      throw this.validationError('El nombre del firmante es requerido.')
    }

    const pdf = await renderPdfFromHtml(this.renderConsentHtml(context, {
      kind: 'accepted',
      mode,
      signatureDataUrl: mode === 'drawn_signature' ? payload.signatureDataUrl ?? null : null,
      signerType: payload.signerType ?? null,
      signerName: payload.signerName?.trim() ?? null,
      signerIdentification: payload.signerIdentification?.trim() ?? null,
      signerRelationship: payload.signerRelationship?.trim() ?? null,
      signerPhone: payload.signerPhone?.trim() ?? null,
    }))

    const attachment = await this.attachmentsService.upload({
      tenantCode,
      patientId: context.patientId,
      recordId: visitId,
      label: `Consentimiento ${context.template.name}`,
      source: 'file_upload',
      buffer: pdf,
      originalName: `${this.slug(context.template.name)}.pdf`,
      declaredMime: 'application/pdf',
      uploadedBy: actorId,
    })

    await TenantContext.getDb()
      .insert(consentInstances)
      .values({
        templateId,
        clinicalEncounterId: visitId,
        patientId: context.patientId,
        staffMemberId: context.doctorId,
        templateVersion: context.template.current_version,
        status: 'accepted',
        acceptanceMethod: mode,
        signerType: payload.signerType?.trim() || null,
        signerName: payload.signerName?.trim() || null,
        signerIdentification: payload.signerIdentification?.trim() || null,
        signerRelationship: payload.signerRelationship?.trim() || null,
        signerPhone: payload.signerPhone?.trim() || null,
        attachmentId: attachment.id,
        acceptedAt: new Date(),
        printedAt: new Date(),
      })
      .onDuplicateKeyUpdate({
        set: {
          patientId: context.patientId,
          staffMemberId: context.doctorId,
          templateVersion: context.template.current_version,
          status: 'accepted',
          acceptanceMethod: mode,
          signerType: payload.signerType?.trim() || null,
          signerName: payload.signerName?.trim() || null,
          signerIdentification: payload.signerIdentification?.trim() || null,
          signerRelationship: payload.signerRelationship?.trim() || null,
          signerPhone: payload.signerPhone?.trim() || null,
          attachmentId: attachment.id,
          acceptedAt: new Date(),
          deletedAt: null,
        },
      })

    const instanceId = (await this.findConsentInstance(visitId, templateId))?.id
    if (!instanceId) throw new Error('No se pudo registrar el consentimiento aceptado.')
    return { id: instanceId, attachmentId: attachment.id }
  }

  async uploadPhysical(
    visitId: string,
    instanceId: string,
    file: UploadedPhysicalFile,
    tenantCode: string,
    actorId: string,
  ): Promise<{ id: string; attachmentId: string }> {
    const [row] = await TenantContext.getDb()
      .select({ instance: consentInstances, template: consentTemplates })
      .from(consentInstances)
      .innerJoin(consentTemplates, eq(consentInstances.templateId, consentTemplates.id))
      .where(and(
        eq(consentInstances.id, instanceId),
        eq(consentInstances.clinicalEncounterId, visitId),
        isNull(consentInstances.deletedAt),
        isNull(consentTemplates.deletedAt),
      ))
      .limit(1)

    if (!row) throw this.notFoundError('Consentimiento no encontrado.')

    const attachment = await this.attachmentsService.upload({
      tenantCode,
      patientId: row.instance.patientId,
      recordId: visitId,
      label: `Consentimiento firmado ${row.template.name}`,
      source: 'file_upload',
      buffer: file.buffer,
      originalName: file.originalName,
      declaredMime: file.mimeType,
      uploadedBy: actorId,
    })

    await TenantContext.getDb()
      .update(consentInstances)
      .set({
        status: 'accepted',
        acceptanceMethod: 'physical',
        attachmentId: attachment.id,
        acceptedAt: new Date(),
      })
      .where(eq(consentInstances.id, instanceId))

    return { id: instanceId, attachmentId: attachment.id }
  }

  private async buildConsentContext(params: {
    visitId: string | null
    visitDate: Date
    patientId: string
    patientFirstName: string
    patientLastName: string
    patientBirthDate: Date | null
    patientPhone: string | null
    patientIdentification: string | null
    doctorId: string
    doctorFirstName: string
    doctorLastName: string
    doctorUserId: string | null
    template: ConsentTemplateDto
    tenantCode: string
  }): Promise<ConsentDocumentContext> {
    const [clinicName, assets] = await Promise.all([
      this.getClinicName(params.tenantCode),
      this.loadDoctorAssets(params.tenantCode, params.doctorUserId),
    ])

    return {
      visitId: params.visitId,
      patientId: params.patientId,
      patientName: this.fullName(params.patientFirstName, params.patientLastName),
      patientAge: this.calculateAge(params.patientBirthDate, params.visitDate),
      patientPhone: params.patientPhone,
      patientIdentification: params.patientIdentification,
      doctorId: params.doctorId,
      doctorName: this.fullName(params.doctorFirstName, params.doctorLastName),
      clinicName,
      logoUrl: this.publicUrl(`${params.tenantCode}/logo.png`),
      signatureUrl: assets.signatureUrl,
      stampUrl: assets.stampUrl,
      hasDoctorSignature: assets.hasSignature,
      hasDoctorStamp: assets.hasStamp,
      template: params.template,
      visitDate: params.visitDate.toISOString(),
    }
  }

  private async loadVisitRecord(visitId: string): Promise<VisitRecord> {
    const [row] = await TenantContext.getDb()
      .select({ encounter: clinicalEncounters, patient: patients, staff: staffMembers })
      .from(clinicalEncounters)
      .innerJoin(patients, eq(clinicalEncounters.patientId, patients.id))
      .innerJoin(staffMembers, eq(clinicalEncounters.staffMemberId, staffMembers.id))
      .where(and(eq(clinicalEncounters.id, visitId), isNull(clinicalEncounters.deletedAt)))
      .limit(1)

    if (!row) throw this.notFoundError('Visita no encontrada.')
    return row
  }

  private async findPatient(patientId: string) {
    const [patient] = await TenantContext.getDb()
      .select()
      .from(patients)
      .where(and(eq(patients.id, patientId), isNull(patients.deletedAt)))
      .limit(1)
    if (!patient) throw this.notFoundError('Paciente no encontrado.')
    return patient
  }

  private async findDoctor(doctorId: string) {
    const [doctor] = await TenantContext.getDb()
      .select()
      .from(staffMembers)
      .where(and(eq(staffMembers.id, doctorId), isNull(staffMembers.deletedAt)))
      .limit(1)
    if (!doctor) throw this.notFoundError('Médico no encontrado.')
    return doctor
  }

  private async findTemplate(templateId: string, includeInactive: boolean): Promise<ConsentTemplateDto> {
    const [template] = await TenantContext.getDb()
      .select()
      .from(consentTemplates)
      .where(includeInactive
        ? and(eq(consentTemplates.id, templateId), isNull(consentTemplates.deletedAt))
        : and(eq(consentTemplates.id, templateId), eq(consentTemplates.isActive, true), isNull(consentTemplates.deletedAt)))
      .limit(1)

    if (!template) throw this.notFoundError('Plantilla de consentimiento no encontrada.')

    const [version] = await TenantContext.getDb()
      .select()
      .from(consentTemplateVersions)
      .where(and(
        eq(consentTemplateVersions.templateId, template.id),
        eq(consentTemplateVersions.version, template.currentVersion),
        isNull(consentTemplateVersions.deletedAt),
      ))
      .limit(1)

    if (!version) throw new Error('La versión actual del consentimiento no está disponible.')
    return this.toTemplateDto(template, version.content)
  }

  private async findConsentInstance(visitId: string, templateId: string) {
    const [instance] = await TenantContext.getDb()
      .select({ id: consentInstances.id })
      .from(consentInstances)
      .where(and(
        eq(consentInstances.clinicalEncounterId, visitId),
        eq(consentInstances.templateId, templateId),
        isNull(consentInstances.deletedAt),
      ))
      .limit(1)
    return instance ?? null
  }

  private async getClinicName(tenantCode: string): Promise<string> {
    const [company] = await PoolManager.globalDb()
      .select({ name: companies.name })
      .from(companies)
      .where(and(eq(companies.code, tenantCode.toUpperCase()), isNull(companies.deletedAt)))
      .limit(1)
    return company?.name ?? tenantCode.toUpperCase()
  }

  private async loadDoctorAssets(tenantCode: string, userId: string | null | undefined) {
    if (!userId) {
      return { hasSignature: false, hasStamp: false, signatureUrl: null, stampUrl: null }
    }

    const signaturePath = `${tenantCode}/users/${userId}/signature.png`
    const stampPath = `${tenantCode}/users/${userId}/stamp.png`

    const [hasSignature, hasStamp] = await Promise.all([
      this.publicStorage.exists(signaturePath).catch(() => false),
      this.publicStorage.exists(stampPath).catch(() => false),
    ])

    return {
      hasSignature,
      hasStamp,
      signatureUrl: hasSignature ? this.publicUrl(signaturePath) : null,
      stampUrl: hasStamp ? this.publicUrl(stampPath) : null,
    }
  }

  private toTemplateDto(row: typeof consentTemplates.$inferSelect, content: string): ConsentTemplateDto {
    return {
      id: row.id,
      name: row.name,
      current_version: row.currentVersion,
      content,
      is_active: row.isActive ? 1 : 0,
      created_at: row.createdAt.toISOString(),
      updated_at: row.updatedAt.toISOString(),
    }
  }

  private assertExpectedTemplateVersion(currentVersion: number, expectedVersion: number | undefined) {
    if (expectedVersion !== undefined && expectedVersion !== currentVersion) {
      throw this.validationError('La plantilla cambió desde que abriste el consentimiento. Vuelve a cargarlo.')
    }
  }

  private renderConsentHtml(
    context: ConsentDocumentContext,
    options: {
      kind: 'printed' | 'accepted'
      mode?: 'checkbox' | 'drawn_signature'
      signatureDataUrl?: string | null
      signerType?: string | null
      signerName?: string | null
      signerIdentification?: string | null
      signerRelationship?: string | null
      signerPhone?: string | null
    },
  ): string {
    const content = this.escapeHtml(context.template.content).replace(/\n/g, '<br>')
    const patientAge = context.patientAge === null ? 'No registrada' : `${context.patientAge} años`
    const acceptanceBlock = options.kind === 'accepted'
      ? `
        <section class="acceptance">
          <h3>Aceptación</h3>
          <p><strong>Método:</strong> ${options.mode === 'drawn_signature' ? 'Firma dibujada' : 'Checkbox de aceptación'}</p>
          <p><strong>Firmante:</strong> ${this.escapeHtml(options.signerName ?? '')}</p>
          ${options.signerIdentification ? `<p><strong>Identificación:</strong> ${this.escapeHtml(options.signerIdentification)}</p>` : ''}
          ${options.signerRelationship ? `<p><strong>Relación:</strong> ${this.escapeHtml(options.signerRelationship)}</p>` : ''}
          ${options.signerPhone ? `<p><strong>Teléfono:</strong> ${this.escapeHtml(options.signerPhone)}</p>` : ''}
          ${options.signerType ? `<p><strong>Tipo de firmante:</strong> ${this.escapeHtml(options.signerType)}</p>` : ''}
          ${options.signatureDataUrl ? `<div class="signer-signature"><img src="${options.signatureDataUrl}" alt="Firma del aceptante"></div>` : ''}
        </section>
      `
      : `
        <section class="acceptance">
          <h3>Firma del paciente o encargado</h3>
          <div class="blank-signature"></div>
          <p>Nombre: ______________________________________</p>
          <p>Identificación: ________________________________</p>
        </section>
      `

    const doctorAssets = context.signatureUrl && context.stampUrl
      ? `
        <div class="doctor-assets">
          <img src="${context.stampUrl}" alt="Sello del médico">
          <img src="${context.signatureUrl}" alt="Firma del médico">
        </div>
      `
      : ''

    return `
      <!doctype html>
      <html lang="es">
        <head>
          <meta charset="utf-8">
          <title>${this.escapeHtml(context.template.name)}</title>
          <style>
            @page { size: A4; margin: 14mm; }
            body { font-family: Arial, sans-serif; color: #101828; font-size: 12px; }
            .header { display: flex; align-items: center; justify-content: space-between; gap: 16px; border-bottom: 2px solid #0f766e; padding-bottom: 12px; }
            .header img { width: 110px; height: 80px; object-fit: contain; }
            .header h1 { margin: 0; font-size: 20px; }
            .header strong { display: block; font-size: 14px; margin-bottom: 4px; }
            .meta { margin: 18px 0; display: grid; grid-template-columns: 1fr 1fr; gap: 8px 18px; border: 1px solid #d0d5dd; padding: 12px; border-radius: 8px; }
            .meta span { display: block; }
            .body { white-space: normal; text-align: justify; line-height: 1.65; min-height: 260px; }
            .acceptance { margin-top: 22px; border-top: 1px solid #d0d5dd; padding-top: 12px; }
            .acceptance h3 { margin: 0 0 8px; }
            .blank-signature { height: 72px; border-bottom: 1px solid #344054; margin-bottom: 12px; }
            .signer-signature img { max-width: 240px; max-height: 120px; object-fit: contain; border-bottom: 1px solid #344054; }
            .doctor-section { margin-top: 30px; display: flex; align-items: flex-end; justify-content: space-between; gap: 24px; }
            .doctor-signature { flex: 1; text-align: center; }
            .doctor-line { border-top: 1px solid #344054; padding-top: 8px; }
            .doctor-assets { display: flex; gap: 16px; justify-content: center; margin-bottom: 10px; }
            .doctor-assets img { max-width: 120px; max-height: 70px; object-fit: contain; }
          </style>
        </head>
        <body>
          <header class="header">
            <img src="${context.logoUrl}" alt="Logo de la clínica">
            <div>
              <strong>${this.escapeHtml(context.clinicName)}</strong>
              <h1>${this.escapeHtml(context.template.name)}</h1>
            </div>
          </header>
          <section class="meta">
            <span><strong>Paciente:</strong> ${this.escapeHtml(context.patientName)}</span>
            <span><strong>Edad:</strong> ${patientAge}</span>
            <span><strong>Identificación:</strong> ${this.escapeHtml(context.patientIdentification ?? 'No registrada')}</span>
            <span><strong>Teléfono:</strong> ${this.escapeHtml(context.patientPhone ?? 'No registrado')}</span>
            <span><strong>Fecha:</strong> ${new Intl.DateTimeFormat('es-HN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(context.visitDate))}</span>
            <span><strong>No. visita:</strong> ${this.escapeHtml(context.visitId ?? 'Borrador')}</span>
          </section>
          <section class="body">${content}</section>
          ${acceptanceBlock}
          <section class="doctor-section">
            <div class="doctor-signature">
              ${doctorAssets}
              <div class="doctor-line">
                <strong>Dr(a). ${this.escapeHtml(context.doctorName)}</strong>
              </div>
            </div>
          </section>
        </body>
      </html>
    `
  }

  private calculateAge(birthDate: Date | null, at: Date): number | null {
    if (!birthDate) return null
    let years = at.getFullYear() - birthDate.getFullYear()
    const monthDelta = at.getMonth() - birthDate.getMonth()
    if (monthDelta < 0 || (monthDelta === 0 && at.getDate() < birthDate.getDate())) years -= 1
    return Math.max(0, years)
  }

  private fullName(firstName: string, lastName: string | null | undefined) {
    return `${firstName} ${lastName ?? ''}`.trim()
  }

  private publicUrl(objectPath: string) {
    return `https://storage.googleapis.com/${config.GCS_PUBLIC_BUCKET}/${objectPath}`
  }

  private escapeHtml(value: string) {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
  }

  private slug(value: string) {
    return value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'consentimiento'
  }

  private validationError(message: string) {
    const err: any = new Error(message)
    err.name = 'validation_errors'
    err.errors = [{ msg: message }]
    return err
  }

  private notFoundError(message: string) {
    return Object.assign(new Error(message), { name: 'not_found_error' })
  }
}
