import {createClient} from 'redis';
import dotenv from 'dotenv';

dotenv.config();

const redisClient = createClient({
    url: `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`,
    password: process.env.REDIS_PASSWORD,
})

redisClient.on('error', (err) => console.error('Redis Client Error', err));


export default redisClient;