import express from 'express';
import cors from 'cors';

import { patientsRoutes, authRoutes } from './routes/index';

const app = express();

app.use(express.json());
app.use(cors());

app.use('/dashboard', patientsRoutes);
app.use('/auth', authRoutes);

export default app;