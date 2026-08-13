import os from 'os'
import { NextFunction, Request, Response } from 'express'
import QRCode from 'qrcode'
import { attachmentCaptureService } from '../../application/services/attachment-capture.service'
import { config } from '../../config/env'
import { TokenPayload } from '../../utils/jwtUtils'

export class AttachmentCaptureController {
  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as any).user as TokenPayload
      const session = attachmentCaptureService.createSession(user.codigoEmpresa)
      const captureUrl = `${this.resolveBaseUrl(req)}/public/attachment-capture/${session.token}`
      const qrDataUrl = await QRCode.toDataURL(captureUrl, { width: 320, margin: 1 })
      res.status(201).json({
        data: { token: session.token, captureUrl, qrDataUrl, expiresAt: session.expiresAt },
      })
    } catch (err) { next(err) }
  }

  status = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as any).user as TokenPayload
      const session = attachmentCaptureService.getSession(req.params.token, user.codigoEmpresa)
      if (!session) throw Object.assign(new Error('Sesión de captura no encontrada.'), { name: 'not_found_error' })
      res.json({
        data: {
          status: session.status,
          image: session.image ? {
            dataUrl: `data:${session.image.contentType};base64,${session.image.data}`,
            fileName: session.image.fileName,
          } : undefined,
        },
      })
    } catch (err) { next(err) }
  }

  remove = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as any).user as TokenPayload
      const deleted = attachmentCaptureService.deleteSession(req.params.token, user.codigoEmpresa)
      res.json({ data: { deleted } })
    } catch (err) { next(err) }
  }

  page = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const session = attachmentCaptureService.getSession(req.params.token)
      if (!session || session.status === 'expired') {
        res.status(410).send(this.expiredPage())
        return
      }
      res.setHeader('Content-Security-Policy', "default-src 'self'; img-src 'self' data: blob:; style-src 'unsafe-inline'; script-src 'unsafe-inline'")
      res.status(200).send(this.capturePage(req.params.token, session.expiresAt))
    } catch (err) { next(err) }
  }

  upload = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const session = await attachmentCaptureService.saveImage(req.params.token, req.body ?? {})
      res.json({ data: { status: session.status, updatedAt: session.updatedAt } })
    } catch (err) { next(err) }
  }

  private resolveBaseUrl(req: Request): string {
    const configured = config.PUBLIC_BASE_URL.trim().replace(/\/$/, '')
    if (configured) return configured
    const protocol = String(req.headers['x-forwarded-proto'] ?? req.protocol).split(',')[0].trim()
    const rawHost = String(req.headers['x-forwarded-host'] ?? req.get('host') ?? `localhost:${config.PORT}`).split(',')[0].trim()
    const host = rawHost.replace(/^https?:\/\//, '')
    const hostname = host.split(':')[0].toLowerCase()
    if (['localhost', '127.0.0.1', '0.0.0.0', '::1', '::'].includes(hostname)) {
      const lanIp = this.lanIp()
      if (lanIp) return `${protocol}://${lanIp}:${host.split(':')[1] ?? config.PORT}`
    }
    return `${protocol}://${host}`
  }

  private lanIp(): string | null {
    for (const addresses of Object.values(os.networkInterfaces())) {
      for (const address of addresses ?? []) {
        if (address.family === 'IPv4' && !address.internal) return address.address
      }
    }
    return null
  }

  private capturePage(token: string, expiresAt: string): string {
    return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Foto para expediente</title><style>
body{margin:0;padding:20px;min-height:100vh;box-sizing:border-box;display:grid;place-items:center;background:#f1f5f9;color:#0f172a;font-family:Arial,sans-serif}.card{width:min(520px,100%);box-sizing:border-box;background:white;padding:24px;border-radius:18px;box-shadow:0 12px 32px #0f172a20}h1{font-size:23px;margin:0 0 8px}p{color:#475569}.preview{display:none;width:100%;max-height:420px;object-fit:contain;border-radius:12px;margin:16px 0}.file{display:block;padding:14px;border:1px dashed #94a3b8;border-radius:12px}button{width:100%;border:0;border-radius:10px;padding:13px;background:#0f766e;color:white;font-weight:700;font-size:16px}button:disabled{opacity:.5}.status{margin-top:12px}.error{color:#b91c1c}.success{color:#15803d}.meta{font-size:12px;color:#64748b}</style></head><body><main class="card"><h1>Agregar foto al expediente</h1><p>Toma una foto o selecciónala desde tu teléfono.</p><div class="meta">El enlace vence: <span id="expires"></span></div><label class="file">Seleccionar o tomar foto<input id="file" type="file" accept="image/*" capture="environment"></label><img id="preview" class="preview" alt="Vista previa"><button id="send" disabled>Enviar foto</button><div id="status" class="status"></div></main><script>
const token=${JSON.stringify(token)},expiresAt=${JSON.stringify(expiresAt)},input=document.getElementById('file'),preview=document.getElementById('preview'),send=document.getElementById('send'),status=document.getElementById('status');document.getElementById('expires').textContent=new Date(expiresAt).toLocaleString();let selected=null;
const message=(text,type='')=>{status.textContent=text;status.className='status '+type};
const dataUrl=file=>new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(file)});
const compressed=async file=>{const url=URL.createObjectURL(file),img=new Image();await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;img.src=url});URL.revokeObjectURL(url);const max=1600,scale=Math.min(1,max/Math.max(img.width,img.height)),canvas=document.createElement('canvas');canvas.width=Math.round(img.width*scale);canvas.height=Math.round(img.height*scale);canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);return canvas.toDataURL('image/jpeg',.85)};
input.addEventListener('change',async()=>{selected=input.files&&input.files[0];send.disabled=!selected;if(!selected)return;preview.src=await dataUrl(selected);preview.style.display='block';message('Foto lista para enviar.')});
send.addEventListener('click',async()=>{if(!selected)return;send.disabled=true;message('Enviando foto...');try{const response=await fetch('/public/attachment-capture/'+token,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({image:await compressed(selected),fileName:selected.name})});if(!response.ok){const body=await response.json().catch(()=>null);throw new Error(body?.message?.[0]?.msg||body?.message||'No se pudo enviar la foto.')}message('Foto enviada. Ya puedes cerrar esta página.','success');input.disabled=true}catch(error){message(error.message||'No se pudo enviar la foto.','error');send.disabled=false}});
</script></body></html>`
  }

  private expiredPage(): string {
    return '<!doctype html><html lang="es"><meta name="viewport" content="width=device-width,initial-scale=1"><body style="font-family:Arial;text-align:center;padding:3rem"><h1>Este QR ya expiró</h1><p>Genera uno nuevo desde el sistema.</p></body></html>'
  }
}
