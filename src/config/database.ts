import {Pool} from 'pg'
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
    user: 'postgres',
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT || '5432'),
});


pool.on('error', (err) => {
    console.error('Database error:', err);
})

export default pool;