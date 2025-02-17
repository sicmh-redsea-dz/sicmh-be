import express from 'express';
import helmet from 'helmet';
import cors from 'cors';

import { errorHandler } from './api/middlewares/errorHandler'
import { dashboardRoutes } from './routes/index';
import { authRoutes } from './api/routes/auth.route'

const app = express();

app.use(helmet())
app.use(express.json());
app.use(cors());

app.use('/dashboard', dashboardRoutes);
app.use('/auth', authRoutes);

app.use( errorHandler )

export default app;