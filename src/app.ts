import express, { Response, Request, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';

import { errorHandler } from './api/middlewares/errorHandler'
import { dashboardRoutes } from './routes/index';
import { authRoutes } from './api/routes/auth.route'
import { appRoutes } from './api/routes/app.route'

const app = express();

app.use(helmet())
app.use(express.json());
app.use(cors());

app.use('/dashboard', dashboardRoutes);
app.use('/app', appRoutes)
app.use('/auth', authRoutes);

app.use((err: any, req:Request, res:Response, next:NextFunction) => {
    errorHandler(err, res, next);
});

export default app;