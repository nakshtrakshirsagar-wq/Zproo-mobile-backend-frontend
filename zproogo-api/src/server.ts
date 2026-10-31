import config from './config';
import app from './app';
import { pool } from './db';

const server = app.listen(config.port, '0.0.0.0', () => {
  console.log(`zproogo-api listening on http://localhost:${config.port}  (OTP mode: ${config.otpMode})`);
});

pool.query('select 1').then(
  () => console.log('Connected to PostgreSQL.'),
  (e: Error) => console.error('!! Cannot connect to PostgreSQL:', e.message, '\n   Check DATABASE_URL in .env and that PostgreSQL is running.'),
);

const stop = () => server.close(() => { void pool.end().then(() => process.exit(0)); });
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
