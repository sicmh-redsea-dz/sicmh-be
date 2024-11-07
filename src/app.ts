import express from 'express';
import cors from 'cors';

import { dashboardRoutes, authRoutes } from './routes/index';

const app = express();

app.use(express.json());
app.use(cors());

app.use('/dashboard', dashboardRoutes);
app.use('/auth', authRoutes);

export default app;