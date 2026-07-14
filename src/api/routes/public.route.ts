import { Router } from 'express';

const router = Router();

router.get('/ping', (req, res) => {
  res.status(200).json({ ok: true, timestamp: new Date().toISOString() })
})

export { router as publicRoutes };
