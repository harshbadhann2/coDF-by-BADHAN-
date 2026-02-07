function sanitizeBaseName(input = '') {
  const normalized = String(input)
    .replace(/[^a-zA-Z0-9-_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 60);

  return normalized || 'converted_file';
}

module.exports = { sanitizeBaseName };
