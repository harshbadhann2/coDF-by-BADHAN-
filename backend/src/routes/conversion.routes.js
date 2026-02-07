const express = require('express');
const { upload } = require('../config/multer');
const { validateUploadedFile } = require('../middleware/validateFile.middleware');
const {
  codeToPdfController,
  codeFileToPdfController,
  docxToPdfController,
  pdfToDocxController,
  imageConvertController
} = require('../controllers/conversion.controller');

const router = express.Router();

router.post('/code-to-pdf', codeToPdfController);
router.post('/code-file-to-pdf', upload.single('file'), validateUploadedFile('code'), codeFileToPdfController);
router.post('/docx-to-pdf', upload.single('file'), validateUploadedFile('docx'), docxToPdfController);
router.post('/pdf-to-docx', upload.single('file'), validateUploadedFile('pdf'), pdfToDocxController);
router.post('/image', upload.single('file'), validateUploadedFile('image'), imageConvertController);

module.exports = { conversionRouter: router };
