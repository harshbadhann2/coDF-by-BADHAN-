import { useEffect, useMemo, useState } from 'react';
import api from './api/client';
import Spinner from './components/Spinner';
import ProgressBar from './components/ProgressBar';
import Dropzone from './components/Dropzone';
import { useTheme } from './hooks/useTheme';
import { bytesToMb, getDownloadUrl } from './utils/file';

const tabs = [
  { id: 'code', label: 'Code -> PDF' },
  { id: 'document', label: 'Word <-> PDF' },
  { id: 'image', label: 'JPG <-> PNG' }
];

const languageOptions = [
  { value: '', label: 'Auto detect' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'python', label: 'Python' },
  { value: 'java', label: 'Java' },
  { value: 'cpp', label: 'C++' },
  { value: 'c', label: 'C' },
  { value: 'go', label: 'Go' },
  { value: 'rust', label: 'Rust' },
  { value: 'html', label: 'HTML' },
  { value: 'css', label: 'CSS' },
  { value: 'json', label: 'JSON' },
  { value: 'bash', label: 'Shell' }
];

const MAX_FILE_SIZE_MB = Number(import.meta.env.VITE_MAX_FILE_SIZE_MB || 10);

export default function App() {
  const { theme, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState('code');
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const [codeForm, setCodeForm] = useState({
    filename: 'assignment_solution',
    title: 'Assignment 1',
    section: 'section 1',
    language: '',
    code: '',
    file: null
  });

  const [documentForm, setDocumentForm] = useState({
    mode: 'docx-to-pdf',
    file: null
  });

  const [imageForm, setImageForm] = useState({
    targetFormat: 'png',
    file: null
  });

  const selectedImagePreview = useMemo(() => {
    if (!imageForm.file) return '';
    return URL.createObjectURL(imageForm.file);
  }, [imageForm.file]);

  useEffect(() => {
    return () => {
      if (selectedImagePreview) URL.revokeObjectURL(selectedImagePreview);
    };
  }, [selectedImagePreview]);

  function resetFeedback() {
    setError('');
    setResult(null);
    setProgress(0);
  }

  function setApiError(err) {
    const message = err?.response?.data?.message || err.message || 'Conversion failed.';
    setError(message);
  }

  function validateFile(file, allowedExts) {
    if (!file) return 'Please choose a file.';

    const extension = `.${file.name.split('.').pop()?.toLowerCase() || ''}`;

    if (!allowedExts.includes(extension)) {
      return `Invalid file type: ${extension}. Allowed: ${allowedExts.join(', ')}`;
    }

    if (bytesToMb(file.size) > MAX_FILE_SIZE_MB) {
      return `File exceeds ${MAX_FILE_SIZE_MB}MB limit.`;
    }

    return '';
  }

  async function handleCodeToPdf(event) {
    event.preventDefault();
    resetFeedback();

    if (codeForm.file) {
      const validationError = validateFile(codeForm.file, ['.c', '.cpp', '.py', '.ipynb']);

      if (validationError) {
        setError(validationError);
        return;
      }

      await submitFileConversion({
        endpoint: '/convert/code-file-to-pdf',
        file: codeForm.file,
        extraFields: {
          filename: codeForm.filename,
          title: codeForm.title,
          section: codeForm.section,
          language: codeForm.language || ''
        },
        kind: 'document'
      });

      return;
    }

    if (!codeForm.code.trim()) {
      setError('Paste your code before generating a PDF.');
      return;
    }

    setIsLoading(true);

    try {
      const response = await api.post('/convert/code-to-pdf', {
        filename: codeForm.filename,
        title: codeForm.title,
        section: codeForm.section,
        language: codeForm.language || undefined,
        code: codeForm.code
      });

      setResult({
        ...response.data.data,
        kind: 'document'
      });
    } catch (err) {
      setApiError(err);
    } finally {
      setIsLoading(false);
    }
  }

  async function submitFileConversion({ endpoint, file, extraFields = {}, kind }) {
    const formData = new FormData();
    formData.append('file', file);

    Object.entries(extraFields).forEach(([key, value]) => {
      formData.append(key, value);
    });

    setIsLoading(true);

    try {
      const response = await api.post(endpoint, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress(uploadEvent) {
          if (!uploadEvent.total) return;
          setProgress((uploadEvent.loaded / uploadEvent.total) * 100);
        }
      });

      setResult({
        ...response.data.data,
        kind
      });
    } catch (err) {
      setApiError(err);
    } finally {
      setIsLoading(false);
      setProgress(0);
    }
  }

  async function handleDocumentSubmit(event) {
    event.preventDefault();
    resetFeedback();

    const isDocxToPdf = documentForm.mode === 'docx-to-pdf';
    const validationError = validateFile(documentForm.file, isDocxToPdf ? ['.docx'] : ['.pdf']);

    if (validationError) {
      setError(validationError);
      return;
    }

    await submitFileConversion({
      endpoint: `/convert/${documentForm.mode}`,
      file: documentForm.file,
      kind: 'document'
    });
  }

  async function handleImageSubmit(event) {
    event.preventDefault();
    resetFeedback();

    const validationError = validateFile(imageForm.file, ['.jpg', '.jpeg', '.png']);

    if (validationError) {
      setError(validationError);
      return;
    }

    await submitFileConversion({
      endpoint: '/convert/image',
      file: imageForm.file,
      extraFields: { targetFormat: imageForm.targetFormat },
      kind: 'image'
    });
  }

  const downloadUrl = result ? getDownloadUrl(result.downloadPath) : '';

  return (
    <div className="mx-auto min-h-full w-full max-w-6xl px-4 py-8 text-[var(--text-main)] sm:px-6 lg:px-8">
      <div className="codf-shell animate-rise rounded-3xl border border-[var(--line)] p-5 shadow-panel backdrop-blur md:p-8">
        <header className="flex flex-col gap-4 border-b border-[var(--line)] pb-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-600 dark:text-orange-300">Student Utility Platform</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight md:text-4xl">
              coDF <span className="ml-1 text-lg font-normal opacity-50 md:text-xl">by BADHAN</span>
            </h1>
            <p className="mt-2 max-w-xl text-sm text-[var(--text-muted)]">
              Convert code, documents, and images with secure uploads, lightweight processing, and instant downloads.
            </p>
          </div>

          <button
            type="button"
            onClick={toggleTheme}
            className="inline-flex items-center justify-center rounded-full border border-[var(--line)] px-4 py-2 text-sm font-semibold transition hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            {theme === 'dark' ? 'Switch to Light' : 'Switch to Dark'}
          </button>
        </header>

        <div className="mt-6 flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setActiveTab(tab.id);
                resetFeedback();
              }}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${activeTab === tab.id
                ? 'bg-teal-700 text-white dark:bg-teal-500 dark:text-slate-900'
                : 'border border-[var(--line)] bg-white/70 text-[var(--text-main)] hover:bg-white dark:bg-slate-900/40'
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <main className="mt-6 grid gap-6 lg:grid-cols-[1.45fr_1fr]">
          <section className="rounded-2xl border border-[var(--line)] bg-[var(--card)] p-4 md:p-6">
            {activeTab === 'code' && (
              <form className="space-y-4" onSubmit={handleCodeToPdf}>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="text-sm">
                    <span className="mb-1 block font-semibold">Filename</span>
                    <input
                      type="text"
                      value={codeForm.filename}
                      onChange={(event) => setCodeForm((current) => ({ ...current, filename: event.target.value }))}
                      className="w-full rounded-xl border border-[var(--line)] bg-white/70 px-3 py-2 text-sm outline-none ring-teal-500 focus:ring dark:bg-slate-900/50"
                      placeholder="example_assignment"
                      maxLength={60}
                    />
                  </label>

                  <label className="text-sm">
                    <span className="mb-1 block font-semibold">Language</span>
                    <select
                      value={codeForm.language}
                      onChange={(event) => setCodeForm((current) => ({ ...current, language: event.target.value }))}
                      className="w-full rounded-xl border border-[var(--line)] bg-white/70 px-3 py-2 text-sm outline-none ring-teal-500 focus:ring dark:bg-slate-900/50"
                    >
                      {languageOptions.map((option) => (
                        <option key={option.value || 'auto'} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="text-sm">
                    <span className="mb-1 block font-semibold">Title (optional)</span>
                    <input
                      type="text"
                      value={codeForm.title}
                      onChange={(event) => setCodeForm((current) => ({ ...current, title: event.target.value }))}
                      className="w-full rounded-xl border border-[var(--line)] bg-white/70 px-3 py-2 text-sm outline-none ring-teal-500 focus:ring dark:bg-slate-900/50"
                      placeholder="Assignment 1"
                      maxLength={80}
                    />
                  </label>

                  <label className="text-sm">
                    <span className="mb-1 block font-semibold">Section (optional)</span>
                    <input
                      type="text"
                      value={codeForm.section}
                      onChange={(event) => setCodeForm((current) => ({ ...current, section: event.target.value }))}
                      className="w-full rounded-xl border border-[var(--line)] bg-white/70 px-3 py-2 text-sm outline-none ring-teal-500 focus:ring dark:bg-slate-900/50"
                      placeholder="section 1"
                      maxLength={80}
                    />
                  </label>
                </div>

                <label className="block text-sm">
                  <span className="mb-1 block font-semibold">Paste code</span>
                  <textarea
                    value={codeForm.code}
                    onChange={(event) => setCodeForm((current) => ({ ...current, code: event.target.value }))}
                    className="h-80 w-full rounded-xl border border-[var(--line)] bg-slate-950 p-4 font-mono text-xs text-teal-200 outline-none ring-teal-500 focus:ring"
                    placeholder="Paste your code here"
                  />
                </label>

                <Dropzone
                  accept=".c,.cpp,.py,.ipynb"
                  file={codeForm.file}
                  onFileSelect={(file) =>
                    setCodeForm((current) => ({
                      ...current,
                      file,
                      filename: file?.name ? file.name.replace(/\.[^/.]+$/, '') : current.filename
                    }))
                  }
                  helpText={`Upload a code file (optional). Max ${MAX_FILE_SIZE_MB}MB. Supported: .c, .cpp, .py, .ipynb.`}
                />

                {codeForm.file && (
                  <button
                    type="button"
                    onClick={() => setCodeForm((current) => ({ ...current, file: null }))}
                    className="text-xs font-semibold text-orange-600 hover:text-orange-700 dark:text-orange-300"
                  >
                    Clear uploaded file and use pasted code
                  </button>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="rounded-xl bg-gradient-to-r from-orange-500 to-teal-600 px-5 py-2.5 text-sm font-bold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Generate PDF
                </button>
              </form>
            )}

            {activeTab === 'document' && (
              <form className="space-y-4" onSubmit={handleDocumentSubmit}>
                <div className="flex flex-wrap gap-2 text-sm">
                  <button
                    type="button"
                    onClick={() => setDocumentForm({ mode: 'docx-to-pdf', file: null })}
                    className={`rounded-full px-4 py-2 font-semibold ${documentForm.mode === 'docx-to-pdf'
                      ? 'bg-teal-700 text-white dark:bg-teal-500 dark:text-slate-900'
                      : 'border border-[var(--line)]'
                      }`}
                  >
                    Word (.docx) &rarr; PDF
                  </button>

                  <button
                    type="button"
                    onClick={() => setDocumentForm({ mode: 'pdf-to-docx', file: null })}
                    className={`rounded-full px-4 py-2 font-semibold ${documentForm.mode === 'pdf-to-docx'
                      ? 'bg-teal-700 text-white dark:bg-teal-500 dark:text-slate-900'
                      : 'border border-[var(--line)]'
                      }`}
                  >
                    PDF &rarr; Word (.docx)
                  </button>
                </div>

                <Dropzone
                  accept={documentForm.mode === 'docx-to-pdf' ? '.docx' : '.pdf'}
                  file={documentForm.file}
                  onFileSelect={(file) => setDocumentForm((current) => ({ ...current, file }))}
                  helpText={`Max ${MAX_FILE_SIZE_MB}MB. Only ${documentForm.mode === 'docx-to-pdf' ? '.docx' : '.pdf'} files.`}
                />

                <button
                  type="submit"
                  disabled={isLoading}
                  className="rounded-xl bg-gradient-to-r from-orange-500 to-teal-600 px-5 py-2.5 text-sm font-bold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Convert Document
                </button>
              </form>
            )}

            {activeTab === 'image' && (
              <form className="space-y-4" onSubmit={handleImageSubmit}>
                <label className="text-sm">
                  <span className="mb-1 block font-semibold">Output format</span>
                  <select
                    value={imageForm.targetFormat}
                    onChange={(event) => setImageForm((current) => ({ ...current, targetFormat: event.target.value }))}
                    className="w-full rounded-xl border border-[var(--line)] bg-white/70 px-3 py-2 text-sm outline-none ring-teal-500 focus:ring dark:bg-slate-900/50"
                  >
                    <option value="png">PNG</option>
                    <option value="jpg">JPG</option>
                  </select>
                </label>

                <Dropzone
                  accept=".png,.jpg,.jpeg"
                  file={imageForm.file}
                  onFileSelect={(file) => setImageForm((current) => ({ ...current, file }))}
                  helpText={`Max ${MAX_FILE_SIZE_MB}MB. Input can be JPG or PNG.`}
                />

                {selectedImagePreview && (
                  <img
                    src={selectedImagePreview}
                    alt="Selected preview"
                    className="max-h-64 w-full rounded-xl border border-[var(--line)] object-contain"
                  />
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="rounded-xl bg-gradient-to-r from-orange-500 to-teal-600 px-5 py-2.5 text-sm font-bold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Convert Image
                </button>
              </form>
            )}
          </section>

          <aside className="space-y-4 rounded-2xl border border-[var(--line)] bg-[var(--card)] p-4 md:p-6">
            <h2 className="text-lg font-bold">Conversion Status</h2>

            {isLoading && <Spinner label="Processing your file securely..." />}
            {isLoading && progress > 0 && <ProgressBar value={progress} />}

            {error && (
              <div className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-500/50 dark:bg-red-900/40 dark:text-red-100">
                {error}
              </div>
            )}

            {!isLoading && !error && !result && (
              <p className="text-sm text-[var(--text-muted)]">Run any conversion to see download details and preview here.</p>
            )}

            {result && (
              <div className="space-y-3 rounded-xl border border-[var(--line)] bg-white/80 p-4 dark:bg-slate-900/60">
                <p className="text-sm font-semibold">File ready: {result.originalName || result.outputFileName}</p>

                {'detectedLanguage' in result && (
                  <p className="text-xs text-[var(--text-muted)]">Detected language: {result.detectedLanguage}</p>
                )}

                {result.kind === 'image' && downloadUrl && (
                  <img
                    src={downloadUrl}
                    alt="Converted preview"
                    className="max-h-56 w-full rounded-xl border border-[var(--line)] object-contain"
                  />
                )}

                <a
                  href={downloadUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center rounded-xl bg-teal-700 px-4 py-2 text-sm font-bold text-white transition hover:bg-teal-600 dark:bg-teal-500 dark:text-slate-900"
                >
                  Download Converted File
                </a>

                <p className="text-xs text-[var(--text-muted)]">Download link expires automatically after a short period.</p>
              </div>
            )}

            <div className="rounded-xl border border-[var(--line)] bg-slate-100/70 p-4 text-xs text-[var(--text-muted)] dark:bg-slate-900/50">
              <p className="font-semibold text-[var(--text-main)]">Security defaults</p>
              <p className="mt-2">File type + signature checks, CORS control, rate limiting, and temporary-file auto cleanup are enabled by default.</p>
            </div>
          </aside>
        </main>
      </div>
    </div>
  );
}
