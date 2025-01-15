import Queue from "bull";
import dotenv from "dotenv"

dotenv.config();

const REDIS_CONFIG = {
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
    }
};

export const urlQueue = new Queue('url-operations', REDIS_CONFIG);
export const authQueue = new Queue('auth-operations', REDIS_CONFIG);
export const apiQueue = new Queue('api-operations', REDIS_CONFIG);

const queues = [urlQueue, authQueue, apiQueue];

queues.forEach(queue => {
    queue.on('error', (error) => {
        console.error(`Queue ${queue.name} error:`, error)
    });

    queue.on('failed', (job, error) => {
        console.error(`Job ${job.id} in ${queue.name} failed:`, error);
    });
});

export const queueOptions = {
    removeOnComplete: true,
    attempts: 3,
    backoff: {
        type: 'exponential',
        delay: 2000 
    }
}