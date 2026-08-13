import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import sharp from 'sharp'
import { AttachmentCaptureService } from '../application/services/attachment-capture.service'

describe('QR attachment capture handoff', () => {
  test('keeps sessions tenant-scoped and accepts a real camera image', async () => {
    const service = new AttachmentCaptureService()
    const session = service.createSession('TENANT_A')
    const jpeg = await sharp({ create: { width: 2, height: 2, channels: 3, background: 'white' } })
      .jpeg()
      .toBuffer()

    assert.equal(service.getSession(session.token, 'TENANT_B'), null)

    const uploaded = await service.saveImage(session.token, {
      image: `data:image/jpeg;base64,${jpeg.toString('base64')}`,
      fileName: 'foto paciente.jpg',
    })

    assert.equal(uploaded.status, 'uploaded')
    assert.equal(uploaded.image?.contentType, 'image/jpeg')
    assert.equal(service.getSession(session.token, 'TENANT_A')?.image?.size, jpeg.length)
  })

  test('rejects content disguised as an image', async () => {
    const service = new AttachmentCaptureService()
    const session = service.createSession('TENANT_A')
    await assert.rejects(
      service.saveImage(session.token, {
        image: `data:image/jpeg;base64,${Buffer.from('not an image').toString('base64')}`,
      }),
      (error: any) => error?.name === 'validation_errors'
    )
  })
})
