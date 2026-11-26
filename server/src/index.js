import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { connectDB } from './config/db.js';
import repoRoutes from './routes/repoRoutes.js';
import authRoutes from './routes/authRoutes.js';

const app = express();
const PORT = process.env.PORT || 5000;

// ── Security & Middleware ─────────────────────────
app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);
app.use(express.json());

// ── Health Check ─────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'RepoMap Server Telemetry',
    timestamp: new Date().toISOString(),
  });
});

// ── API Routes ───────────────────────────────────
app.use('/api', repoRoutes);
app.use('/api/auth', authRoutes);

// ── Start Server ─────────────────────────────────
async function bootstrap() {
  await connectDB();

  app.listen(PORT, () => {
    console.log(`🚀 [RepoMap Server] listening on http://localhost:${PORT}`);
  });
}

bootstrap().catch((err) => {
  console.error('Fatal initialization error:', err);
  process.exit(1);
});
