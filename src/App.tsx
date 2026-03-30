import { useMemo, useState } from 'react';

type ConversionOption = {
  id: string;
  label: string;
  from: string[];
  to: string;
};

type HistoryItem = {
  id: string;
  fileName: string;
  conversion: string;
  outputName: string;
  timestamp: string;
};

const acceptedFormats = ['pdf', 'docx', 'jpg', 'png', 'xlsx', 'pptx', 'txt'] as const;

const conversionOptions: ConversionOption[] = [
  { id: 'pdf-docx', label: 'PDF → Word', from: ['pdf'], to: 'docx' },
  { id: 'pdf-jpg', label: 'PDF → JPG', from: ['pdf'], to: 'jpg' },
  { id: 'pdf-txt', label: 'PDF → TXT', from: ['pdf'], to: 'txt' },
  { id: 'docx-pdf', label: 'Word → PDF', from: ['docx'], to: 'pdf' },
  { id: 'img-pdf', label: 'Image → PDF', from: ['jpg', 'png'], to: 'pdf' },
  { id: 'img-docx', label: 'Image → Word', from: ['jpg', 'png'], to: 'docx' },
  { id: 'xlsx-pdf', label: 'Excel → PDF', from: ['xlsx'], to: 'pdf' },
  { id: 'pptx-pdf', label: 'PowerPoint → PDF', from: ['pptx'], to: 'pdf' },
];

const getExtension = (name: string) => {
  const parts = name.split('.');
  return parts.length > 1 ? parts.at(-1)!.toLowerCase() : '';
};

const storageKey = 'fileflex-history';

export function App() {
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedConversion, setSelectedConversion] = useState<string>('');
  const [processing, setProcessing] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string>('');
  const [downloadName, setDownloadName] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>(() => {
    const raw = localStorage.getItem(storageKey);
    return raw ? (JSON.parse(raw) as HistoryItem[]) : [];
  });

  const availableConversions = useMemo(() => {
    if (!file) return [];
    const ext = getExtension(file.name);
    return conversionOptions.filter((option) => option.from.includes(ext));
  }, [file]);

  const handleFile = (nextFile: File) => {
    const ext = getExtension(nextFile.name);
    if (!acceptedFormats.includes(ext as (typeof acceptedFormats)[number])) {
      alert(`Unsupported format. Please upload: ${acceptedFormats.join(', ').toUpperCase()}`);
      return;
    }

    setDownloadUrl('');
    setDownloadName('');
    setSelectedConversion('');
    setFile(nextFile);

    let progress = 0;
    const interval = window.setInterval(() => {
      progress += 14;
      setUploadProgress(Math.min(progress, 100));
      if (progress >= 100) {
        window.clearInterval(interval);
      }
    }, 60);
  };

  const onDrop: React.DragEventHandler<HTMLDivElement> = (event) => {
    event.preventDefault();
    setDragOver(false);
    const nextFile = event.dataTransfer.files.item(0);
    if (nextFile) handleFile(nextFile);
  };

  const runConversion = async () => {
    if (!file || !selectedConversion) return;
    setProcessing(true);

    await new Promise((resolve) => setTimeout(resolve, 1700));

    const option = conversionOptions.find((item) => item.id === selectedConversion);
    if (!option) return;

    const baseName = file.name.replace(/\.[^.]+$/, '');
    const outputName = `${baseName}.${option.to}`;
    const blob = new Blob(
      [
        `FileFlex mock conversion\nOriginal: ${file.name}\nConverted to: ${option.label}\nTime: ${new Date().toISOString()}`,
      ],
      { type: 'text/plain' },
    );

    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    const url = URL.createObjectURL(blob);
    setDownloadUrl(url);
    setDownloadName(outputName);

    if (isLoggedIn) {
      const nextHistory: HistoryItem[] = [
        {
          id: crypto.randomUUID(),
          fileName: file.name,
          conversion: option.label,
          outputName,
          timestamp: new Date().toLocaleString(),
        },
        ...history,
      ];
      setHistory(nextHistory);
      localStorage.setItem(storageKey, JSON.stringify(nextHistory));
    }

    setProcessing(false);

    window.setTimeout(() => {
      setFile(null);
      setUploadProgress(0);
    }, 900);
  };

  const toggleAuth = () => {
    setIsLoggedIn((prev) => !prev);
  };

  return (
    <div className="page-shell">
      <div className="blur-orb orb-1" />
      <div className="blur-orb orb-2" />
      <nav className="nav glass-panel">
        <div className="brand">FileFlex Converter</div>
        <button className="button ghost" onClick={toggleAuth}>
          {isLoggedIn ? 'Logout' : 'Login / Signup'}
        </button>
      </nav>

      <main className="container">
        <section className="hero glass-panel">
          <h1>Convert Any File Instantly</h1>
          <p>Fast, Simple, Secure File Conversion</p>

          <div
            className={`dropzone ${dragOver ? 'active' : ''}`}
            onDragOver={(event) => {
              event.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
          >
            <input
              id="file-uploader"
              type="file"
              onChange={(event) => {
                const nextFile = event.target.files?.item(0);
                if (nextFile) handleFile(nextFile);
              }}
              hidden
            />
            <p>{file ? `Selected: ${file.name}` : 'Drag and drop your file here'}</p>
            <label className="button" htmlFor="file-uploader">
              Upload File
            </label>
          </div>

          {file ? (
            <div className="flow card-animate">
              <div className="progress-wrap">
                <span>Upload Progress</span>
                <div className="progress-track">
                  <div className="progress-bar" style={{ width: `${uploadProgress}%` }} />
                </div>
              </div>

              <div className="control-row">
                <label htmlFor="conversion">Choose output</label>
                <select
                  id="conversion"
                  value={selectedConversion}
                  onChange={(event) => setSelectedConversion(event.target.value)}
                >
                  <option value="">Select conversion</option>
                  {availableConversions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <button className="button" disabled={!selectedConversion || processing} onClick={runConversion}>
                {processing ? 'Converting...' : 'Convert'}
              </button>

              {processing ? (
                <div className="loader" aria-live="polite">
                  <div className="spinner" />
                  <span>Processing securely. Files are auto-deleted after conversion.</span>
                </div>
              ) : null}

              {downloadUrl ? (
                <div className="success pop-in">
                  <span>✓ Conversion Complete</span>
                  <a href={downloadUrl} download={downloadName} className="button">
                    Download
                  </a>
                </div>
              ) : null}
            </div>
          ) : null}

          <p className="supported">
            Supported: PDF, DOCX, JPG, PNG, XLSX, PPTX, TXT — no account required.
          </p>
        </section>

        {isLoggedIn ? (
          <section className="history glass-panel">
            <h2>Conversion History</h2>
            {history.length ? (
              <ul>
                {history.map((item) => (
                  <li key={item.id}>
                    <div>
                      <strong>{item.conversion}</strong>
                      <p>
                        {item.fileName} → {item.outputName}
                      </p>
                      <small>{item.timestamp}</small>
                    </div>
                    <button className="button tiny">Re-download</button>
                  </li>
                ))}
              </ul>
            ) : (
              <p>No conversions yet.</p>
            )}
          </section>
        ) : null}
      </main>
    </div>
  );
}
