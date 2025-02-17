import { config } from './config/env'
import app from './app';
import { initializeDb } from './config/db';

const port = config.PORT;


const startServer = async () => {
  await initializeDb()
  app.listen(port, () => {
    console.log(`Server running on port: ${port}`);
  })
}

startServer()