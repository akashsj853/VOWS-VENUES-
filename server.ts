import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { createServer as createViteServer } from 'vite';
import { initSchema } from './src/server/db.ts';
import { seedDatabase } from './src/server/seed.ts';
import { authRouter } from './src/server/routes/authRoutes.ts';
import { publicRouter } from './src/server/routes/publicRoutes.ts';
import { bookingRouter } from './src/server/routes/bookingRoutes.ts';
import { adminRouter } from './src/server/routes/adminRoutes.ts';

async function startServer() {
  initSchema();
  seedDatabase();

  const app = express();
  const PORT = Number(process.env.PORT || 3000);

  app.use(express.json({ limit: '2mb' }));

  // Health Check
  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, service: 'vows-and-venues' });
  });

  // API Routes
  app.use('/api/auth', authRouter);
  app.use('/api', publicRouter);
  app.use('/api', bookingRouter);
  app.use('/api/admin', adminRouter);

  // Serve Frontend (Vite middleware in dev, static dist in production)
  if (process.env.NODE_ENV === 'production') {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Vows & Venues server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
