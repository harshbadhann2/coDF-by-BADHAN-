const multer = require('multer');
const { AppError } = require('../utils/AppError');

function errorHandler(error, _req, res, _next) {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      res.status(413).json({
        success: false,
        message: 'File is too large. Please upload a smaller file.'
      });
      return;
    }

    res.status(400).json({
      success: false,
      message: error.message || 'Upload error occurred.'
    });
    return;
  }

  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      success: false,
      message: error.message
    });
    return;
  }

  const statusCode = error.statusCode || 500;

  res.status(statusCode).json({
    success: false,
    message: error.message || 'Internal server error'
  });
}

module.exports = {
  errorHandler
};
