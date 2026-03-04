import { config } from './config/env'
import app from './app';
import { initializeDb } from './config/db';

const port = config.PORT;
const host = config.HOST;


const startServer = async () => {
  await initializeDb()
  app.listen(port, host, () => {
    console.log(`Server running on http://${host}:${port}`);
  })
}

startServer()
