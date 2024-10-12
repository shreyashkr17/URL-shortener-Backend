import app from "./app";
import dotenv from "dotenv";
import { fork } from 'child_process';
import os from 'os';
import path from 'path';
import pool from './config/database'
import redisClient from "./config/redis";
// import logger from "./monitoring/logger";

dotenv.config();

const numCPUs = os.cpus().length;
const BASE_PORT = parseInt(process.env.BASE_PORT || '5000');
// const METRICS_PORT = parseInt(process.env.METRICS_PORT || '9090');

async function startServer(port: number) {
  try {
    await pool.connect();
    console.log('Database connected');

    await redisClient.connect();
    console.log('Redis Connected');

    app.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });

    
  } catch (error) {
    // logger.error('Failed to start server', { error });
    process.exit(1);
  }
}

if (process.env.NODE_ENV !== 'production') {
  // Development mode: Start a single instance
  startServer(BASE_PORT);
} else {
  // Production mode: Start multiple instances
  if (process.env.WORKER_ID === undefined) {
    // Master process
    // logger.info(`Primary ${process.pid} is running`);
    for (let i = 0; i < numCPUs; i++) {
      const workerPort = BASE_PORT + i;
      const worker = fork(__filename, [], {
        env: { ...process.env, WORKER_ID: i.toString(), PORT: workerPort.toString() }
      });
      // logger.info(`Started worker ${worker.pid} on port ${workerPort}`);
      worker.on('exit', (code, signal) => {
        // logger.warn(`Worker ${worker.pid} died. Restarting...`);
        fork(__filename, [], {
          env: { ...process.env, WORKER_ID: i.toString(), PORT: workerPort.toString() }
        });
      });
    }
  } else {
    // Worker process
    const PORT = parseInt(process.env.PORT || BASE_PORT.toString());
    startServer(PORT);
  }
}