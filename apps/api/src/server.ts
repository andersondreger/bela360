import { app } from './app';
import { env, logger, connectDatabase, connectRedis } from './config';
import { initAutomationWorkers } from './modules/automation';
import { initWaitlistWorkers } from './modules/waitlist';
import { initMarketingWorkers } from './modules/marketing';
import { initMarketplaceJobs } from './modules/marketplace';

const PORT = env.PORT;

async function bootstrap(): Promise<void> {
  try {
    logger.info('🚀 Starting bela360 API...');

    // Connect to database
    await connectDatabase();

    // Connect to Redis
    await connectRedis();

    // Initialize all workers
    initAutomationWorkers();
    initWaitlistWorkers();
    initMarketingWorkers();
    initMarketplaceJobs();
    logger.info('✅ All workers initialized (automation, waitlist, marketing)');

    // Start server
    app.listen(PORT, () => {
      logger.info(`✅ Server running on port ${PORT}`);
      logger.info(`📍 Environment: ${env.NODE_ENV}`);
      logger.info(`🔗 Health check: http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    logger.fatal({ error }, '❌ Failed to start server');
    process.exit(1);
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', error => {
  logger.fatal({ error }, 'Uncaught exception');
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error({ reason, promise }, 'Unhandled rejection');
});

// Handle shutdown signals
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Start the server
bootstrap();
