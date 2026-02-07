const os = require('os');

function healthController(_req, res) {
  res.json({
    success: true,
    data: {
      service: 'coDF API',
      uptimeSeconds: Math.floor(process.uptime()),
      freeMemoryMB: Math.floor(os.freemem() / (1024 * 1024)),
      timestamp: new Date().toISOString()
    }
  });
}

module.exports = {
  healthController
};
