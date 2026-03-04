import os from 'os'
import { NextFunction, Request, Response } from 'express'
import QRCode from 'qrcode'
import { PatientsService } from '../../application/services/patients.service'
import { ServiceContainer } from '../../infrastructure/container/service.container'
import { config } from '../../config/env'

export class PatientsController {
    private patientsService: PatientsService
    private patientImagesService = ServiceContainer.getPatientImagesService()
    private patientImageCaptureService = ServiceContainer.getPatientImageCaptureService()

    constructor() {
        this.patientsService = ServiceContainer.getPatientsService()
    }

    getPatients = async (req:Request, res:Response, next:NextFunction) => {
        const limit = Number(req.query.limit) || 25
        const offset = Number(req.query.offset) || 0
        const term = String(req.query.term) || ''

        try {
            const { patients, totalRegistries } = await this.patientsService.findAllPatients({limit, offset, term})
            res.status( 202 ).json({
                data: {
                    patients,
                    totalRegistries
                }
            })
        } catch ( err ) {
            next( err )
        }
    }

    getPatient = async (req:Request, res:Response, next:NextFunction) => {
        const { id } = req.params 
        try {
            const patient = await this.patientsService.findOnePatient(+id)
            res.status( 200 ).json({
                data: { patient }
            })
        } catch ( err ) {
            next( err )
        }
    }

    insertPatient = async (req:Request, res:Response, next:NextFunction) => {
        const body = req.body

        try {
            const insertedPatient = await this.patientsService.insertPatient(body)
            res.status( 201 ).json({
                data: { patient: insertedPatient }
            })
        } catch ( err ) {
            next( err )
        }
    }

    updatePatient = async (req:Request, res:Response, next:NextFunction) => {
        const { id } = req.params
        const body = req.body
        try {
            const updatedPatient = await this.patientsService.updatedPatient(body, Number(id))
            res.status( 200 ).json({
                data: {
                    patient: updatedPatient
                }
            })
        } catch ( err ) {
            next( err )
        }
    }

    deletePatient = async (req:Request, res:Response, next:NextFunction) => {
        const { id } = req.params
        try {
            const [isPatientDeleted, patientId] = await this.patientsService.softDeletePatient( Number(id) )
            res.status(200).json({
                data: {
                  msg: 'ok',
                  status: isPatientDeleted && 'deleted',
                  patientId
                }
            })
        } catch ( err ) {
            next ( err )
        }
    }

    getPatientImage = async (req:Request, res:Response, next:NextFunction) => {
        const { id } = req.params
        try {
            const image = await this.patientImagesService.getImage(Number(id))
            if (!image) {
                const err = new Error(`No image found for patient ${id}`)
                ;(err as any).name = 'not_found_error'
                throw err
            }
            const dataUrl = `data:${image.contentType};base64,${image.data}`
            res.status(200).json({
                data: {
                    image: {
                        dataUrl,
                        updatedAt: image.updatedAt,
                        contentType: image.contentType,
                        size: image.size
                    }
                }
            })
        } catch ( err ) {
            next( err )
        }
    }

    uploadPatientImage = async (req:Request, res:Response, next:NextFunction) => {
        const { id } = req.params
        try {
            const image = await this.patientImagesService.saveImage(Number(id), req.body)
            res.status(200).json({
                data: {
                    image: {
                        updatedAt: image.updatedAt,
                        contentType: image.contentType,
                        size: image.size
                    }
                }
            })
        } catch ( err ) {
            next( err )
        }
    }

    deletePatientImage = async (req:Request, res:Response, next:NextFunction) => {
        const { id } = req.params
        try {
            const deleted = await this.patientImagesService.deleteImage(Number(id))
            res.status(200).json({
                data: { deleted }
            })
        } catch ( err ) {
            next( err )
        }
    }

    createImageCaptureSession = async (req:Request, res:Response, next:NextFunction) => {
        try {
            const session = await this.patientImageCaptureService.createSession()
            const captureUrl = this.buildCaptureUrl(req, session.token)
            const qrDataUrl = await QRCode.toDataURL(captureUrl, { width: 280, margin: 1 })
            console.log(`[patient-image-capture] token=${session.token} url=${captureUrl}`)
            res.status(201).json({
                data: {
                    token: session.token,
                    captureUrl,
                    qrDataUrl,
                    expiresAt: session.expiresAt
                }
            })
        } catch ( err ) {
            next( err )
        }
    }

    getImageCaptureStatus = async (req:Request, res:Response, next:NextFunction) => {
        const { token } = req.params
        try {
            const session = await this.patientImageCaptureService.getSession(token)
            if (!session) {
                const err = new Error(`No capture session found for token ${token}`)
                ;(err as any).name = 'not_found_error'
                throw err
            }
            const image = session.image
                ? {
                    dataUrl: `data:${session.image.contentType};base64,${session.image.data}`,
                    fileName: session.image.fileName
                }
                : undefined

            res.status(200).json({
                data: {
                    status: session.status,
                    image
                }
            })
        } catch ( err ) {
            next( err )
        }
    }

    deleteImageCaptureSession = async (req:Request, res:Response, next:NextFunction) => {
        const { token } = req.params
        try {
            const deleted = await this.patientImageCaptureService.deleteSession(token)
            res.status(200).json({
                data: { deleted }
            })
        } catch ( err ) {
            next( err )
        }
    }

    renderImageCapturePage = async (req:Request, res:Response, next:NextFunction) => {
        const { token } = req.params
        try {
            const session = await this.patientImageCaptureService.getSession(token)
            if (!session || session.status === 'expired') {
                res.status(410).send(this.buildExpiredCapturePage())
                return
            }
            res.setHeader(
                'Content-Security-Policy',
                "default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'"
            )
            res.status(200).send(this.buildCapturePageHtml(token, session.expiresAt))
        } catch ( err ) {
            next( err )
        }
    }

    uploadImageCapture = async (req:Request, res:Response, next:NextFunction) => {
        const { token } = req.params
        try {
            const session = await this.patientImageCaptureService.saveImage(token, req.body)
            res.status(200).json({
                data: {
                    status: session.status,
                    updatedAt: session.updatedAt
                }
            })
        } catch ( err ) {
            next( err )
        }
    }

    private buildCaptureUrl(req: Request, token: string) {
        const publicBase = (config.PUBLIC_BASE_URL || '').trim()
        const baseUrl = publicBase ? publicBase.replace(/\/$/, '') : this.resolveRequestBaseUrl(req)
        return `${baseUrl}/public/patients/image-capture/${token}`
    }

    private resolveRequestBaseUrl(req: Request) {
        const forwardedProto = req.headers['x-forwarded-proto']
        const forwardedHost = req.headers['x-forwarded-host']
        const protocol = this.pickForwardedValue(forwardedProto) || req.protocol
        const hostHeader = this.pickForwardedValue(forwardedHost) || req.get('host') || `localhost:${config.PORT}`
        const normalized = hostHeader.replace(/^https?:\/\//, '')
        const hostname = normalized.split(':')[0]
        if (this.isLocalHost(hostname)) {
            const lanIp = this.getLanIp()
            if (lanIp) {
                const port = normalized.includes(':') ? normalized.split(':')[1] : String(config.PORT)
                return `${protocol}://${lanIp}:${port}`
            }
        }
        return `${protocol}://${normalized}`
    }

    private pickForwardedValue(value: string | string[] | undefined) {
        if (!value) return ''
        if (Array.isArray(value)) return value[0] ?? ''
        return value.split(',')[0]?.trim() ?? ''
    }

    private isLocalHost(hostname: string) {
        const lower = hostname.toLowerCase()
        return lower === 'localhost' || lower === '127.0.0.1' || lower === '0.0.0.0' || lower === '::1' || lower === '::'
    }

    private getLanIp() {
        const interfaces = os.networkInterfaces()
        for (const list of Object.values(interfaces)) {
            for (const net of list ?? []) {
                if (net.family === 'IPv4' && !net.internal) {
                    return net.address
                }
            }
        }
        return null
    }

    private buildCapturePageHtml(token: string, expiresAt: string) {
        const safeToken = JSON.stringify(token)
        const safeExpires = JSON.stringify(expiresAt)
        return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Subir foto del paciente</title>
    <style>
      :root {
        color-scheme: light;
      }
      body {
        margin: 0;
        font-family: "Helvetica Neue", Arial, sans-serif;
        background: #f8fafc;
        color: #0f172a;
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
      }
      .card {
        width: min(520px, 100%);
        background: #ffffff;
        border-radius: 16px;
        padding: 24px;
        box-shadow: 0 12px 30px rgba(15, 23, 42, 0.12);
      }
      h1 {
        margin: 0 0 8px;
        font-size: 22px;
      }
      p {
        margin: 0 0 16px;
        color: #475569;
      }
      .meta {
        font-size: 12px;
        color: #64748b;
        margin-bottom: 16px;
      }
      .preview {
        width: 100%;
        max-height: 320px;
        object-fit: cover;
        border-radius: 12px;
        margin-top: 16px;
        display: none;
      }
      .actions {
        display: flex;
        gap: 12px;
        margin-top: 16px;
        flex-wrap: wrap;
      }
      button {
        border: none;
        border-radius: 10px;
        padding: 10px 16px;
        background: #14b8a6;
        color: white;
        font-weight: 600;
        cursor: pointer;
      }
      button:disabled {
        background: #cbd5f5;
        cursor: not-allowed;
      }
      input[type="file"] {
        width: 100%;
      }
      .status {
        margin-top: 12px;
        font-size: 14px;
        color: #0f172a;
      }
      .error {
        color: #b91c1c;
      }
      .success {
        color: #15803d;
      }
    </style>
  </head>
  <body>
    <main class="card">
      <h1>Sube la foto del paciente</h1>
      <p>Selecciona o toma una foto desde tu teléfono y envíala al sistema.</p>
      <div class="meta">Este enlace expira: <span id="expiresAt"></span></div>
      <input id="fileInput" type="file" accept="image/*" capture="environment" />
      <div class="actions">
        <button id="uploadBtn" disabled>Enviar foto</button>
      </div>
      <div id="status" class="status"></div>
      <img id="preview" class="preview" alt="Vista previa" />
    </main>
    <script>
      const token = ${safeToken};
      const expiresAt = ${safeExpires};
      const fileInput = document.getElementById('fileInput');
      const uploadBtn = document.getElementById('uploadBtn');
      const statusEl = document.getElementById('status');
      const previewEl = document.getElementById('preview');
      const expiresEl = document.getElementById('expiresAt');
      expiresEl.textContent = new Date(expiresAt).toLocaleString();
      let selectedFile = null;

      const setStatus = (message, type) => {
        statusEl.textContent = message || '';
        statusEl.className = 'status' + (type ? ' ' + type : '');
      };

      const readAsDataUrl = (file) => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('No se pudo leer el archivo'));
        reader.readAsDataURL(file);
      });

      const loadImage = (file) => new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('No se pudo cargar la imagen'));
        img.src = URL.createObjectURL(file);
      });

      const compressImage = async (file) => {
        const img = await loadImage(file);
        const maxDimension = 1024;
        let width = img.width;
        let height = img.height;
        if (width > maxDimension || height > maxDimension) {
          if (width >= height) {
            height = Math.round(height * (maxDimension / width));
            width = maxDimension;
          } else {
            width = Math.round(width * (maxDimension / height));
            height = maxDimension;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        return canvas.toDataURL('image/jpeg', 0.85);
      };

      fileInput.addEventListener('change', async (event) => {
        const file = event.target.files && event.target.files[0];
        if (!file) {
          selectedFile = null;
          uploadBtn.disabled = true;
          previewEl.style.display = 'none';
          return;
        }
        selectedFile = file;
        uploadBtn.disabled = false;
        setStatus('Foto lista para enviar.');
        const dataUrl = await readAsDataUrl(file);
        previewEl.src = dataUrl;
        previewEl.style.display = 'block';
      });

      uploadBtn.addEventListener('click', async () => {
        if (!selectedFile) return;
        uploadBtn.disabled = true;
        setStatus('Enviando foto...');
        try {
          const dataUrl = await compressImage(selectedFile);
          const response = await fetch(\`/public/patients/image-capture/\${token}\`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: dataUrl, fileName: selectedFile.name })
          });
          if (!response.ok) {
            const data = await response.json().catch(() => null);
            const message = data?.message?.[0]?.msg || data?.message || 'No se pudo subir la foto.';
            throw new Error(message);
          }
          setStatus('Foto enviada. Puedes cerrar esta ventana.', 'success');
          fileInput.disabled = true;
        } catch (err) {
          setStatus(err.message || 'Error al enviar la foto.', 'error');
          uploadBtn.disabled = false;
        }
      });
    </script>
  </body>
</html>`
    }

    private buildExpiredCapturePage() {
        return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>QR expirado</title>
    <style>
      body {
        margin: 0;
        font-family: "Helvetica Neue", Arial, sans-serif;
        background: #0f172a;
        color: #f8fafc;
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
      }
      .card {
        width: min(480px, 100%);
        background: #1e293b;
        border-radius: 16px;
        padding: 24px;
        text-align: center;
      }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>Este QR ya expiró</h1>
      <p>Vuelve al sistema y genera un nuevo QR.</p>
    </div>
  </body>
</html>`
    }
}
