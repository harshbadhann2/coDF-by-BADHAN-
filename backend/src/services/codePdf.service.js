const fs = require('fs');
const path = require('path');
const os = require('os');
const PDFDocument = require('pdfkit');
const hljs = require('highlight.js');
const { v4: uuidv4 } = require('uuid');
const { env } = require('../config/env');
const { AppError } = require('../utils/AppError');
const { sanitizeBaseName } = require('../utils/sanitizeFilename');
const { parseHighlightedTokens, tokenColor } = require('../utils/codeTokens');

const PAGE_SIZE = 'LETTER';
const LEFT_MARGIN = 72;
const RIGHT_MARGIN = 72;
const TOP_MARGIN = 72;
const BOTTOM_MARGIN = 72;
const PANEL_PADDING_X = 18;
const PANEL_PADDING_Y = 16;
const PANEL_BG = '#f3f3f3';
const PANEL_BORDER = '#e5e7eb';
const TITLE_SIZE = 18;
const SECTION_SIZE = 12;
const LINE_HEIGHT = 15;
const FONT_SIZE = 10.5;

function resolveFontPath(candidates) {
  for (const candidate of candidates) {
    if (candidate && fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return '';
}

function resolveFontSet() {
  const fontDir = path.join(process.cwd(), 'assets', 'fonts');
  const homeFonts = path.join(os.homedir(), 'Library', 'Fonts');

  const regular = resolveFontPath([
    env.codePdfFontRegular,
    path.join(fontDir, 'JetBrainsMono-Regular.ttf'),
    path.join(homeFonts, 'JetBrainsMono-Regular.ttf'),
    '/Library/Fonts/JetBrainsMono-Regular.ttf'
  ]);

  const italic = resolveFontPath([
    env.codePdfFontItalic,
    path.join(fontDir, 'JetBrainsMono-Italic.ttf'),
    path.join(homeFonts, 'JetBrainsMono-Italic.ttf'),
    '/Library/Fonts/JetBrainsMono-Italic.ttf'
  ]);

  const bold = resolveFontPath([
    env.codePdfFontBold,
    path.join(fontDir, 'JetBrainsMono-Bold.ttf'),
    path.join(homeFonts, 'JetBrainsMono-Bold.ttf'),
    '/Library/Fonts/JetBrainsMono-Bold.ttf'
  ]);

  const boldItalic = resolveFontPath([
    env.codePdfFontBoldItalic,
    path.join(fontDir, 'JetBrainsMono-BoldItalic.ttf'),
    path.join(homeFonts, 'JetBrainsMono-BoldItalic.ttf'),
    '/Library/Fonts/JetBrainsMono-BoldItalic.ttf'
  ]);

  return {
    regular,
    italic,
    bold,
    boldItalic
  };
}

function registerFonts(doc) {
  const fonts = resolveFontSet();
  const hasJetBrains = Boolean(fonts.regular);

  if (hasJetBrains) {
    doc.registerFont('JetBrainsMono', fonts.regular);

    if (fonts.italic) {
      doc.registerFont('JetBrainsMono-Italic', fonts.italic);
    }

    if (fonts.bold) {
      doc.registerFont('JetBrainsMono-Bold', fonts.bold);
    }

    if (fonts.boldItalic) {
      doc.registerFont('JetBrainsMono-BoldItalic', fonts.boldItalic);
    }
  }

  return {
    base: hasJetBrains ? 'JetBrainsMono' : 'Courier',
    italic: hasJetBrains && fonts.italic ? 'JetBrainsMono-Italic' : (hasJetBrains ? 'JetBrainsMono' : 'Courier'),
    bold: hasJetBrains && fonts.bold ? 'JetBrainsMono-Bold' : (hasJetBrains ? 'JetBrainsMono' : 'Courier'),
    boldItalic: hasJetBrains && fonts.boldItalic ? 'JetBrainsMono-BoldItalic' : (hasJetBrains ? 'JetBrainsMono' : 'Courier')
  };
}

function drawHeadings(doc, title, section) {
  let cursorY = TOP_MARGIN;

  if (title) {
    doc.font('Helvetica-Bold').fontSize(TITLE_SIZE).fillColor('#111827').text(title, LEFT_MARGIN, cursorY);
    cursorY += TITLE_SIZE + 8;
  }

  if (section) {
    doc.font('Helvetica').fontSize(SECTION_SIZE).fillColor('#111827').text(section, LEFT_MARGIN, cursorY);
    cursorY += SECTION_SIZE + 8;
  }

  if (title || section) {
    cursorY += 10;
  }

  return cursorY;
}

function drawPanel(doc, panelY) {
  const panelX = LEFT_MARGIN;
  const panelWidth = doc.page.width - LEFT_MARGIN - RIGHT_MARGIN;
  const panelHeight = doc.page.height - BOTTOM_MARGIN - panelY;

  doc.save();
  doc.fillColor(PANEL_BG).rect(panelX, panelY, panelWidth, panelHeight).fill();
  doc.lineWidth(0.5).strokeColor(PANEL_BORDER).rect(panelX, panelY, panelWidth, panelHeight).stroke();
  doc.restore();

  return {
    x: panelX,
    y: panelY,
    width: panelWidth,
    height: panelHeight
  };
}

function createPage(doc, options, includeHeadings) {
  if (!includeHeadings) {
    doc.addPage({
      size: PAGE_SIZE,
      margins: {
        top: TOP_MARGIN,
        bottom: BOTTOM_MARGIN,
        left: LEFT_MARGIN,
        right: RIGHT_MARGIN
      }
    });
  }

  const panelStartY = includeHeadings ? drawHeadings(doc, options.title, options.section) : TOP_MARGIN;
  const panel = drawPanel(doc, panelStartY);

  return {
    panel,
    cursor: {
      x: panel.x + PANEL_PADDING_X,
      y: panel.y + PANEL_PADDING_Y
    },
    maxY: panel.y + panel.height - PANEL_PADDING_Y
  };
}

function newLine(state) {
  state.cursor.x = state.panel.x + PANEL_PADDING_X;
  state.cursor.y += LINE_HEIGHT;

  if (state.cursor.y > state.maxY) {
    const next = createPage(state.doc, state.options, false);
    state.panel = next.panel;
    state.cursor = next.cursor;
    state.maxY = next.maxY;
  }
}

function writeChunk(state, text, color, fontName) {
  if (!text) return;

  let pending = text;

  while (pending.length > 0) {
    const maxWidth = state.panel.x + state.panel.width - PANEL_PADDING_X - state.cursor.x;

    if (maxWidth <= 2) {
      newLine(state);
      continue;
    }

    let segment = pending;
    state.doc.font(fontName);

    if (state.doc.widthOfString(segment) > maxWidth) {
      let cutoff = Math.max(1, Math.floor((maxWidth / state.doc.widthOfString(segment)) * segment.length));

      while (cutoff > 1 && state.doc.widthOfString(segment.slice(0, cutoff)) > maxWidth) {
        cutoff -= 1;
      }

      while (cutoff < segment.length && state.doc.widthOfString(segment.slice(0, cutoff + 1)) <= maxWidth) {
        cutoff += 1;
      }

      segment = segment.slice(0, cutoff);
    }

    state.doc.fillColor(color).text(segment, state.cursor.x, state.cursor.y, { lineBreak: false });
    state.cursor.x += state.doc.widthOfString(segment);
    pending = pending.slice(segment.length);

    if (pending.length > 0) {
      newLine(state);
    }
  }
}

function writeToken(state, token, fonts) {
  const color = tokenColor(token.cssClass);
  const isComment = token.cssClass.includes('comment');
  const fontName = isComment ? fonts.italic : fonts.base;
  const parts = token.text.split(/(\n)/);

  parts.forEach((part) => {
    if (part === '\n') {
      newLine(state);
      return;
    }

    const chunks = part.match(/\S+|\s+/g) || [];

    chunks.forEach((chunk) => {
      writeChunk(state, chunk, color, fontName);
    });
  });
}

async function generateCodePdfService({ code, filename, language, title, section }) {
  if (!code || typeof code !== 'string') {
    throw new AppError(400, 'Code content is required.');
  }

  const safeName = sanitizeBaseName(filename || 'code_file');

  let detectedLanguage = 'plaintext';

  if (language && hljs.getLanguage(language)) {
    detectedLanguage = language;
  } else {
    const auto = hljs.highlightAuto(code);
    if (auto && auto.language) {
      detectedLanguage = auto.language;
    }
  }

  let highlightedHtml;

  try {
    highlightedHtml = hljs.highlight(code, {
      language: detectedLanguage,
      ignoreIllegals: true
    }).value;
  } catch (_error) {
    detectedLanguage = 'plaintext';
    highlightedHtml = hljs.highlight(code, {
      language: 'plaintext',
      ignoreIllegals: true
    }).value;
  }

  const tokens = parseHighlightedTokens(highlightedHtml);
  const outputFileName = `${uuidv4()}.pdf`;
  const outputPath = path.join(env.outputDir, outputFileName);

  await new Promise((resolve, reject) => {
    const stream = fs.createWriteStream(outputPath);

    const doc = new PDFDocument({
      size: PAGE_SIZE,
      margins: {
        top: TOP_MARGIN,
        bottom: BOTTOM_MARGIN,
        left: LEFT_MARGIN,
        right: RIGHT_MARGIN
      },
      info: {
        Title: `${safeName}.pdf`,
        Author: 'coDF',
        Creator: 'coDF'
      }
    });

    stream.on('finish', resolve);
    stream.on('error', reject);
    doc.on('error', reject);

    doc.pipe(stream);

    const options = {
      title: title && String(title).trim() ? String(title).trim() : '',
      section: section && String(section).trim() ? String(section).trim() : ''
    };

    const fonts = registerFonts(doc);
    const state = createPage(doc, options, true);
    state.doc = doc;
    state.options = options;
    doc.font(fonts.base).fontSize(FONT_SIZE);

    if (tokens.length === 0) {
      writeChunk(state, code, '#111827', fonts.base);
    } else {
      tokens.forEach((token) => {
        writeToken(state, token, fonts);
      });
    }

    doc.end();
  });

  return {
    outputPath,
    outputFileName,
    originalName: `${safeName}.pdf`,
    detectedLanguage
  };
}

module.exports = {
  generateCodePdfService
};
