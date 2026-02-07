const { env } = require('./env');

const corsOptions = {
  origin(origin, callback) {
    if (!origin) {
      callback(null, true);
      return;
    }

    if (env.allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    const error = new Error('Request blocked by CORS policy.');
    error.statusCode = 403;
    callback(error);
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  optionsSuccessStatus: 204
};

module.exports = { corsOptions };
