# coDF

coDF is a production-ready Student Utility Converter Platform built with React + Vite and Node.js + Express.

## Features

- Code -> PDF with syntax highlighting and language auto-detection
- Word (.docx) -> PDF
- PDF -> Word (.docx)
- Image conversion: JPG -> PNG and PNG -> JPG
- Drag-and-drop uploads
- File preview and download links
- Upload progress bars and loading states
- Dark mode + responsive UI
- Rate limiting, CORS, file validation, and auto cleanup
- Stateless architecture with low memory usage

## Tech Stack

### Frontend

- React + Vite
- TailwindCSS
- Axios

### Backend

- Node.js + Express (REST API)
- Multer (disk-based uploads)
- PDFKit + highlight.js (code to PDF)
- Sharp (image conversion)
- LibreOffice CLI (docx/pdf conversions)

## Architecture

```
coDF/
  backend/
    src/
      config/
      controllers/
      middleware/
      routes/
      services/
      utils/
    uploads/
    outputs/
    public/
    server.js
  frontend/
    src/
      api/
      components/
      hooks/
      utils/
    index.html
  Dockerfile
  README.md
```

## API Endpoints

- `GET /api/health`
- `POST /api/convert/code-to-pdf`
  - JSON: `{ "filename": "example", "language": "javascript", "code": "..." }`
- `POST /api/convert/code-file-to-pdf`
  - `multipart/form-data`: `file`, optional `filename`, `language`, `title`, `section`
- `POST /api/convert/docx-to-pdf`
  - `multipart/form-data`: `file`
- `POST /api/convert/pdf-to-docx`
  - `multipart/form-data`: `file`
- `POST /api/convert/image`
  - `multipart/form-data`: `file`, `targetFormat` (`png` or `jpg`)
- `GET /api/files/:fileName`

## Local Setup

### Prerequisites

- Node.js 20+
- LibreOffice CLI installed and available as `soffice`

### 1) Configure environment

- Copy `.env.example` values into:
  - `backend/.env`
  - `frontend/.env` (only `VITE_` keys)

### 2) Install dependencies

```bash
cd backend && npm install
cd ../frontend && npm install
```

### 3) Run in development

Terminal 1:

```bash
cd backend
npm run dev
```

Terminal 2:

```bash
cd frontend
npm run dev
```

Frontend runs at `http://localhost:3000`, backend at `http://localhost:3030`.

## Production Build

Build frontend:

```bash
cd frontend
npm run build
```

Copy `frontend/dist` into `backend/public` (Dockerfile handles this automatically), then:

```bash
cd backend
npm start
```

## Docker Deployment

Build:

```bash
docker build -t codf:latest .
```

Run:

```bash
docker run -p 3030:3030 --env-file .env codf:latest
```

## CI Pipeline

GitHub Actions workflow file: `.github/workflows/ci.yml`

The pipeline runs automatically on every push and pull request:

- `Lint` job:
  - Installs backend and frontend dependencies
  - Runs `npm run lint` in both projects
- `Build` job:
  - Builds the frontend with `npm run build`
- `API Health Check` job:
  - Starts the backend server
  - Calls `GET /api/health` until it succeeds or times out

## Render / Railway Deployment

1. Connect repository.
2. Use root `Dockerfile`.
3. Set environment variables from `.env.example`.
4. Set service port to `3030`.

## Vercel Deployment

Recommended split deployment:

1. Deploy `frontend` on Vercel.
2. Deploy `backend` on Render/Railway (LibreOffice is needed for doc conversions).
3. Set frontend env:
   - `VITE_API_BASE_URL=https://your-backend-domain`
   - `VITE_DOWNLOAD_BASE_URL=https://your-backend-domain`
4. Set backend `CLIENT_ORIGIN=https://your-frontend-domain`.

## Performance + Security Notes

- Disk-based uploads via Multer (no large in-memory buffers)
- Streamed file downloads (`fs.createReadStream`)
- Sharp cache disabled and concurrency reduced
- Automatic temporary-file cleanup with TTL
- File extension + signature checks
- Rate-limited API and strict CORS

## Code PDF Font (JetBrains Mono)

The code-to-PDF generator uses JetBrains Mono if it can find it on your system.
It searches in this order:

- `CODE_PDF_FONT_REGULAR` / `CODE_PDF_FONT_ITALIC` / `CODE_PDF_FONT_BOLD` / `CODE_PDF_FONT_BOLD_ITALIC`
- `backend/assets/fonts/JetBrainsMono-*.ttf`
- `~/Library/Fonts/JetBrainsMono-*.ttf` (macOS)
- `/Library/Fonts/JetBrainsMono-*.ttf` (macOS)

If the font is not found, it falls back to `Courier`.

## Important Limitations

- `PDF -> DOCX` quality depends on LibreOffice parser and source PDF structure.
- Complex layouts may not convert perfectly.
