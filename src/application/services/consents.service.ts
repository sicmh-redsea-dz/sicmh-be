import crypto from 'crypto'
import { fromBuffer } from 'file-type'
import sharp from 'sharp'
import { ConsentsRepository } from '../ports/consents.repository'
import { ConsentDocumentContext, ConsentTemplate } from '../../domain/entities/Consent'
import { ClinicalAttachmentsService } from './clinical-attachments.service'
import { PoolManager } from '../../infrastructure/database/PoolManager'
import { config } from '../../config/env'
import { renderPdfFromHtml } from '../../utils/pdfRenderer'

interface SignerPayload {
  mode: 'checkbox' | 'drawn_signature'
  signatureDataUrl?: string | null
  signerType: 'patient' | 'guardian'
  signerName?: string | null
  signerIdentification?: string | null
  signerRelationship?: string | null
  signerPhone?: string | null
  expectedTemplateVersion?: number | null
}

export class ConsentsService {
  constructor(
    private readonly repo: ConsentsRepository,
    private readonly attachments: ClinicalAttachmentsService
  ) {}

  listTemplates = (includeInactive = false) => this.repo.listTemplates(includeInactive)

  createTemplate = async (name: string, content: string, userId: number) => {
    const normalized = this.validateTemplate(name, content)
    const id = await this.repo.createTemplate({ ...normalized, createdBy: userId })
    return this.repo.findTemplate(id)
  }

  updateTemplate = async (id: number, name: string, content: string, userId: number) => {
    const normalized = this.validateTemplate(name, content)
    await this.repo.updateTemplate(id, normalized.name, normalized.content, userId)
    return this.repo.findTemplate(id)
  }

  setTemplateActive = async (id: number, active: boolean) => {
    if (!await this.repo.findTemplate(id)) this.notFound('Plantilla de consentimiento no encontrada.')
    await this.repo.setTemplateActive(id, active)
    return { updated: true }
  }

  listByVisit = (recordId: number) => this.repo.listByVisit(recordId)

  getContext = async (recordId: number, templateId: number, tenantCode: string): Promise<ConsentDocumentContext> => {
    const visit = await this.repo.getVisitContext(recordId)
    if (!visit) this.notFound('Visita no encontrada.')
    return this.buildContext(visit, templateId, tenantCode)
  }

  getDraftContext = async (patientId: number, doctorId: number, visitDate: string | null, templateId: number, tenantCode: string): Promise<ConsentDocumentContext> => {
    if (!patientId || !doctorId) this.validation('Selecciona el paciente y el médico antes de gestionar consentimientos.')
    const draft = await this.repo.getDraftContext(patientId, doctorId)
    if (!draft) this.notFound('No se encontraron el paciente o el médico seleccionados.')
    draft.visitDate = visitDate || new Date().toISOString()
    return this.buildContext(draft, templateId, tenantCode)
  }

  private buildContext = async (visit: any, templateId: number, tenantCode: string): Promise<ConsentDocumentContext> => {
    const [template, company] = await Promise.all([
      this.repo.findTemplate(templateId),
      PoolManager.resolveEmpresa(tenantCode),
    ])
    if (!template || !template.is_active) this.notFound('Plantilla de consentimiento no encontrada o inactiva.')

    const publicBase = `https://storage.googleapis.com/${config.GCS_PUBLIC_BUCKET}`
    const assets = visit.doctorUserId
      ? await this.attachments.hasPrescriptionAssets(tenantCode, Number(visit.doctorUserId))
      : { signature: false, stamp: false }
    const doctorBase = visit.doctorUserId ? `${publicBase}/${tenantCode}/users/${visit.doctorUserId}` : null

    return {
      ...visit,
      patientAge: this.calculateAge(visit.patientBirthDate, new Date()),
      clinicName: company.NombreEmpresa,
      logoUrl: `${publicBase}/${tenantCode}/logo.png`,
      signatureUrl: doctorBase && assets.signature ? `${doctorBase}/signature.png` : null,
      stampUrl: doctorBase && assets.stamp ? `${doctorBase}/stamp.png` : null,
      hasDoctorSignature: assets.signature,
      hasDoctorStamp: assets.stamp,
      template,
    }
  }

  previewDraft = async (patientId: number, doctorId: number, visitDate: string | null, templateId: number, tenantCode: string): Promise<Buffer> => {
    const context = await this.getDraftContext(patientId, doctorId, visitDate, templateId, tenantCode)
    return renderPdfFromHtml(this.buildDocumentHtml(context, null, true))
  }

  preview = async (recordId: number, templateId: number, tenantCode: string): Promise<Buffer> => {
    const context = await this.getContext(recordId, templateId, tenantCode)
    return renderPdfFromHtml(this.buildDocumentHtml(context, null, false))
  }

  markPrinted = async (recordId: number, templateId: number, tenantCode: string, userId: number, expectedTemplateVersion?: number | null) => {
    const context = await this.getContext(recordId, templateId, tenantCode)
    if (expectedTemplateVersion && Number(expectedTemplateVersion) !== Number(context.template.current_version)) {
      this.validation('La plantilla cambió después de ser impresa. Debe imprimirse nuevamente.')
    }
    const pdf = await renderPdfFromHtml(this.buildDocumentHtml(context, null, true))
    const id = await this.repo.createInstance({
      templateId: context.template.id,
      templateVersionId: Number((context.template as any).version_id),
      patientId: context.patientId,
      recordId,
      doctorId: context.doctorId,
      status: 'printed',
      snapshotJson: JSON.stringify(this.snapshot(context)),
      createdBy: userId,
    })
    return { id, pdf }
  }

  acceptElectronic = async (recordId: number, templateId: number, tenantCode: string, userId: number, signer: SignerPayload) => {
    const context = await this.getContext(recordId, templateId, tenantCode)
    if (signer.expectedTemplateVersion && Number(signer.expectedTemplateVersion) !== Number(context.template.current_version)) {
      this.validation('La plantilla cambió después de ser presentada. Revisa y acepta nuevamente el consentimiento.')
    }
    if (!context.hasDoctorSignature || !context.hasDoctorStamp) {
      this.validation('El médico no tiene firma y sello configurados. Utiliza la opción de impresión.')
    }
    this.validateSigner(context, signer)
    const acceptedAt = new Date()
    const html = this.buildDocumentHtml(context, { ...signer, acceptedAt }, false)
    const pdf = await renderPdfFromHtml(html)
    const hash = crypto.createHash('sha256').update(pdf).digest('hex')
    const attachment = await this.attachments.upload({
      tenantCode,
      patientId: context.patientId,
      recordId,
      label: `${context.template.name} - aceptado`,
      source: 'file_upload',
      buffer: pdf,
      originalName: `consentimiento-${context.template.id}.pdf`,
      declaredMime: 'application/pdf',
      uploadedBy: userId,
    })
    const signerName = signer.signerType === 'patient' ? context.patientName : signer.signerName!.trim()
    const signerIdentification = signer.signerType === 'patient'
      ? context.patientIdentification
      : signer.signerIdentification!.trim()
    const id = await this.repo.createInstance({
      templateId: context.template.id,
      templateVersionId: Number((context.template as any).version_id),
      patientId: context.patientId,
      recordId,
      doctorId: context.doctorId,
      status: 'accepted',
      acceptanceMethod: signer.mode,
      signerType: signer.signerType,
      signerName,
      signerIdentification,
      signerRelationship: signer.signerRelationship?.trim() || null,
      signerPhone: signer.signerPhone?.trim() || null,
      attachmentId: attachment.id,
      documentHash: hash,
      snapshotJson: JSON.stringify({ ...this.snapshot(context), acceptedAt: acceptedAt.toISOString() }),
      createdBy: userId,
    })
    return { id, attachmentId: attachment.id }
  }

  acceptPhysical = async (instanceId: number, tenantCode: string, userId: number, file: Express.Multer.File) => {
    const instance = await this.repo.findInstance(instanceId)
    if (!instance || instance.status !== 'printed') this.notFound('Consentimiento impreso pendiente no encontrado.')
    let pdf = file.buffer
    const detected = await fromBuffer(file.buffer)
    if (!detected) this.validation('No se pudo determinar el tipo del documento firmado.')
    if (detected!.mime !== 'application/pdf') {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(detected!.mime)) {
        this.validation('El documento firmado debe ser PDF, JPEG, PNG o WebP.')
      }
      const normalized = await sharp(file.buffer).rotate().jpeg({ quality: 88 }).toBuffer()
      const dataUrl = `data:image/jpeg;base64,${normalized.toString('base64')}`
      pdf = await renderPdfFromHtml(`<html><head><style>@page{size:A4;margin:12mm}body{margin:0;text-align:center}img{max-width:100%;max-height:273mm;object-fit:contain}</style></head><body><img src="${dataUrl}"></body></html>`)
    }
    const hash = crypto.createHash('sha256').update(pdf).digest('hex')
    const attachment = await this.attachments.upload({
      tenantCode,
      patientId: instance.patient_id,
      recordId: instance.record_id,
      label: `${instance.template_name} - firma física`,
      source: 'file_upload', buffer: pdf,
      originalName: `consentimiento-firmado-${instance.id}.pdf`,
      declaredMime: 'application/pdf', uploadedBy: userId,
    })
    await this.repo.acceptPhysicalInstance(instance.id, attachment.id, hash, userId)
    return { id: instance.id, attachmentId: attachment.id }
  }

  private validateTemplate(name: string, content: string) {
    const cleanName = String(name ?? '').trim()
    const cleanContent = String(content ?? '').trim()
    if (!cleanName) this.validation('El nombre del consentimiento es requerido.')
    if (cleanName.length > 160) this.validation('El nombre no puede exceder 160 caracteres.')
    if (!cleanContent) this.validation('El contenido del consentimiento es requerido.')
    if (cleanContent.length > 60000) this.validation('El contenido no puede exceder 60,000 caracteres.')
    return { name: cleanName, content: cleanContent }
  }

  private validateSigner(context: ConsentDocumentContext, signer: SignerPayload) {
    if (!['checkbox', 'drawn_signature'].includes(signer.mode)) this.validation('Selecciona checkbox o firma dibujada.')
    if (signer.mode === 'drawn_signature' && !/^data:image\/png;base64,/.test(signer.signatureDataUrl ?? '')) {
      this.validation('La firma dibujada es requerida.')
    }
    const isMinor = context.patientAge !== null && context.patientAge < 18
    if (isMinor && signer.signerType !== 'guardian') this.validation('Un encargado debe aceptar por el paciente menor de edad.')
    if (signer.signerType === 'guardian') {
      if (!signer.signerName?.trim() || !signer.signerIdentification?.trim() || !signer.signerRelationship?.trim() || !signer.signerPhone?.trim()) {
        this.validation('Completa nombre, identidad, parentesco y teléfono del encargado.')
      }
    }
  }

  private snapshot(context: ConsentDocumentContext) {
    const { template, signatureUrl, stampUrl, hasDoctorSignature, hasDoctorStamp, ...data } = context
    return { ...data, templateId: template.id, templateVersion: template.current_version, templateName: template.name, templateContent: template.content }
  }

  private buildDocumentHtml(context: ConsentDocumentContext, signer: (SignerPayload & { acceptedAt: Date }) | null, physical: boolean): string {
    const esc = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]!))
    const body = esc(context.template.content).replace(/\r?\n/g, '<br>')
    const date = new Intl.DateTimeFormat('es-HN', { dateStyle: 'long', timeStyle: signer ? 'short' : undefined, timeZone: 'America/Tegucigalpa' }).format(signer?.acceptedAt ?? new Date())
    const signerName = signer?.signerType === 'guardian' ? signer.signerName : context.patientName
    const signature = signer?.mode === 'drawn_signature'
      ? `<img class="patient-signature" src="${signer.signatureDataUrl}" alt="Firma del aceptante">`
      : signer ? '<div class="accepted-check">☑ Aceptación confirmada electrónicamente</div>' : '<div class="signature-line"></div>'
    const doctorAssets = !physical && context.signatureUrl && context.stampUrl
      ? `<div class="asset-box"><img src="${context.signatureUrl}" alt="Firma médica"><img src="${context.stampUrl}" alt="Sello médico"></div>`
      : '<div class="signature-line"></div>'
    const guardianBlock = context.patientAge !== null && context.patientAge < 18
      ? `<section class="guardian-data"><b>Encargado del menor</b><div>Nombre: ${esc(signer?.signerName || '________________________________')}</div><div>Identidad: ${esc(signer?.signerIdentification || '____________________________')}</div><div>Parentesco: ${esc(signer?.signerRelationship || '____________________________')}</div><div>Teléfono: ${esc(signer?.signerPhone || '____________________________')}</div></section>`
      : ''
    return `<!doctype html><html lang="es"><head><meta charset="utf-8"><style>
      @page{size:A4;margin:16mm}*{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#182230;font-size:12px;line-height:1.55;margin:0}
      header{text-align:center;margin-bottom:22px}.logo{width:150px;height:100px;object-fit:contain}.clinic{font-size:16px;font-weight:700}.title{font-size:21px;margin:12px 0;text-transform:uppercase}
      .patient{display:grid;grid-template-columns:1fr 1fr;gap:5px 24px;border:1px solid #d0d5dd;border-radius:8px;padding:12px;margin-bottom:22px}.body{text-align:justify;white-space:normal;min-height:280px}
      .acceptance{margin-top:28px;padding-top:18px;border-top:1px solid #d0d5dd}.guardian-data{display:grid;grid-template-columns:1fr 1fr;gap:6px 24px;margin-top:18px;padding:12px;background:#f8fafc;border-radius:8px}.guardian-data b{grid-column:1/-1}.signatures{display:grid;grid-template-columns:1fr 1fr;gap:44px;margin-top:32px;text-align:center}.signature-line{height:72px;border-bottom:1px solid #344054}.patient-signature{height:72px;max-width:230px;object-fit:contain;border-bottom:1px solid #344054}.accepted-check{height:72px;display:flex;align-items:flex-end;justify-content:center;border-bottom:1px solid #344054;font-weight:700}.asset-box{height:72px;border-bottom:1px solid #344054;position:relative}.asset-box img{max-width:130px;max-height:68px;object-fit:contain;margin:0 4px}.meta{font-size:10px;color:#667085;margin-top:24px}
    </style></head><body><header><img class="logo" src="${context.logoUrl}" alt="Logo"><div class="clinic">${esc(context.clinicName)}</div><div class="title">${esc(context.template.name)}</div></header>
    <section class="patient"><div><b>Paciente:</b> ${esc(context.patientName)}</div><div><b>Edad:</b> ${context.patientAge ?? 'No registrada'}</div><div><b>Identidad:</b> ${esc(context.patientIdentification || 'No registrada')}</div><div><b>Teléfono:</b> ${esc(context.patientPhone || 'No registrado')}</div><div><b>Fecha:</b> ${esc(date)}</div><div><b>No. visita:</b> ${context.visitId ?? 'Se asignará al guardar'}</div></section>
    <section class="body">${body}</section><section class="acceptance"><b>Declaración:</b> Declaro haber leído, comprendido y aceptado el contenido de este consentimiento.</section>${guardianBlock}
    <section class="signatures"><div>${signature}<div>${esc(signerName || 'Firma del paciente o encargado')}</div>${signer?.signerType === 'guardian' ? `<small>Encargado: ${esc(signer.signerRelationship)}</small>` : ''}</div><div>${doctorAssets}<div>${esc(context.doctorName)}</div><small>Firma y sello del médico</small></div></section>
    <div class="meta">Plantilla versión ${context.template.current_version}${signer ? ` · Aceptado ${esc(date)}` : ''}</div></body></html>`
  }

  private calculateAge(value: string | Date | null, at: Date): number | null {
    if (!value) return null
    const birth = new Date(value)
    if (Number.isNaN(birth.getTime())) return null
    let age = at.getFullYear() - birth.getFullYear()
    const beforeBirthday = at.getMonth() < birth.getMonth() || (at.getMonth() === birth.getMonth() && at.getDate() < birth.getDate())
    if (beforeBirthday) age -= 1
    return Math.max(0, age)
  }

  private validation(message: string): never {
    throw Object.assign(new Error('Validation error'), { name: 'validation_errors', errors: [{ msg: message }] })
  }

  private notFound(message: string): never {
    throw Object.assign(new Error(message), { name: 'not_found_error' })
  }
}
