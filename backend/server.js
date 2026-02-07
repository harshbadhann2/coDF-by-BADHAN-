const { app } = require('./src/app');
const { env } = require('./src/config/env');

const server = app.listen(env.port, () => {
  // eslint-disable-next-line no-console
  console.log(`coDF API running on port ${env.port}`);
});

function shutdown(signal) {
  // eslint-disable-next-line no-console
  console.log(`Received ${signal}. Shutting down coDF API.`);
  server.close(() => process.exit(0));
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
