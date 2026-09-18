import dotenv from 'dotenv';
dotenv.config();

import app from './app.js';
import { connectDB } from './config/database.js';
import { seedDatabase } from './utils/seed.js';
import { Merchant } from './models/Merchant.js';

const PORT = process.env.PORT || 5000;

async function bootstrap() {
  try {
    await connectDB();

    // Auto-seed if database is freshly launched
    const merchantCount = await Merchant.countDocuments();
    if (merchantCount === 0) {
      console.log('[Server] Initializing fresh database with seed data...');
      await seedDatabase();
    }

    const server = app.listen(PORT, () => {
      console.log(`========================================================`);
      console.log(`🚀 VoxaFlow API Gateway running on http://localhost:${PORT}`);
      console.log(`📊 Healthcheck: http://localhost:${PORT}/health`);
      console.log(`========================================================`);
    });

    process.on('SIGTERM', () => {
      console.log('SIGTERM signal received. Closing server gracefully...');
      server.close(() => {
        console.log('Server closed.');
        process.exit(0);
      });
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

bootstrap();
