import express from 'express';
import cors from 'cors';

import { userRoutes, authRoutes } from './routes/index';

const app = express();

app.use(express.json());
app.use(cors());

app.use('/api/users', userRoutes);
app.use('/auth', authRoutes);

export default app;