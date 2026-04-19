# VoxRefine

A fully **local** voice transcription tool. Record audio in the browser, transcribe it using Whisper, and refine it with a local LLM — no data ever leaves your machine.

![Recording](output/recording.png)
![Transcript Result](output/transcript.png)
![History Panel](output/history.png)

---

## Features

- **In-browser recording** — record directly from your microphone
- **Live waveform visualizer** — scrolling amplitude bars react to your voice in real time
- **Local speech-to-text** — Whisper (via faster-whisper) runs entirely on your machine
- **AI transcript cleaning** — removes filler words, fixes grammar using a local LLM (Ollama)
- **Persistent history** — every transcript saved to SQLite, survives page refresh
- **Search history** — live keyword search with highlighted matches
- **Export to .txt** — one-click download of raw + cleaned transcript
- **Zero cloud dependencies** — fully offline after initial model download

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite |
| Backend | Node.js + Express |
| Speech-to-text | Python + faster-whisper (Whisper medium) |
| LLM cleaning | Ollama (gpt-oss:20b) |
| Database | SQLite (better-sqlite3) |
| Audio capture | MediaRecorder API + Web Audio API |

---

## Architecture

```
Browser (React)
  └─ POST /api/transcribe (audio file)
       └─ Node.js (Express)
            ├─ child_process.spawn → Python (faster-whisper) → raw transcript
            ├─ fetch → Ollama LLM → cleaned transcript
            └─ better-sqlite3 → transcripts.db
```

---

## Prerequisites

- **Node.js** 20+
- **Python** 3.10+
- **Ollama** installed and running — [ollama.com](https://ollama.com)

### Hardware

| | Minimum | Recommended |
|---|---|---|
| RAM | 8 GB | 16 GB+ |
| GPU | None (CPU works) | NVIDIA 8 GB+ VRAM |
| Storage | 5 GB free | 15 GB free |

---

## Setup

### 1. Clone the repo

```bash
git clone https://github.com/your-username/voxrefine.git
cd voxrefine
```

### 2. Set up the Python environment (Whisper)

```bash
cd whisper-service
python -m venv venv

# Windows
venv\Scripts\pip install -r requirements.txt

# macOS / Linux
source venv/bin/activate && pip install -r requirements.txt
```

> First transcription downloads the Whisper medium model (~1.5 GB).

### 3. Pull the LLM model

```bash
ollama pull gpt-oss:20b
```

### 4. Set up the backend

```bash
cd backend
npm install
copy .env.example .env   # Windows
# cp .env.example .env   # macOS / Linux
```

### 5. Set up the frontend

```bash
cd frontend
npm install
```

---

## Running

Open **3 terminals**:

```bash
# Terminal 1 — LLM server
ollama serve

# Terminal 2 — Backend (port 8000)
cd backend && npm start

# Terminal 3 — Frontend (port 5173)
cd frontend && npm run dev
```

Open **http://localhost:5173** in your browser.

---

## Usage

1. Click **Record** — allow microphone access when prompted
2. Speak — watch the waveform visualizer respond in real time
3. Click **Stop**
4. Click **Transcribe** — wait for Whisper + LLM to process
5. View **Raw** and **Cleaned** transcripts side by side
6. Click **Export .txt** to download
7. Past transcripts appear in the **History** panel below — searchable and deletable

---

## Configuration

Edit `backend/.env`:

| Variable | Default | Description |
|---|---|---|
| `PORT` | `8000` | Backend port |
| `OLLAMA_BASE_URL` | `http://localhost:11434` | Ollama endpoint |
| `LLM_MODEL` | `gpt-oss:20b` | Model for cleaning |
| `WHISPER_MODEL_SIZE` | `medium` | Whisper model size |
| `WHISPER_DEVICE` | `auto` | `auto` / `cuda` / `cpu` |
| `WHISPER_TIMEOUT` | `300000` | Transcription timeout (ms) |

**Whisper model options** (trade-off: speed vs accuracy):
`tiny` → `base` → `small` → `medium` → `large-v3`

---

## Project Structure

```
ai-transcript-app/
├── backend/
│   ├── src/
│   │   ├── server.js               # Express server entry point
│   │   ├── routes/
│   │   │   ├── transcribe.js       # POST /api/transcribe
│   │   │   └── history.js          # GET/DELETE /api/history
│   │   ├── services/
│   │   │   ├── whisperService.js   # Node → Python bridge
│   │   │   ├── llmService.js       # Ollama API calls
│   │   │   └── dbService.js        # SQLite read/write
│   │   └── config/
│   │       └── ollama.js           # Ollama config + health checks
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── App.jsx                 # Root component, state management
│   │   ├── components/
│   │   │   ├── AudioRecorder.jsx   # Mic capture + waveform visualizer
│   │   │   ├── TranscriptDisplay.jsx # Show + export transcripts
│   │   │   ├── TranscriptHistory.jsx # History panel + search
│   │   │   └── StatusMessage.jsx   # Loading / error messages
│   │   └── index.css
│   └── vite.config.js
├── whisper-service/
│   ├── transcribe.py               # Whisper inference script
│   └── requirements.txt
└── output/                         # Screenshots for README
```

---

## Troubleshooting

**"Python environment not found"**
```bash
cd whisper-service && python -m venv venv
venv\Scripts\pip install -r requirements.txt
```

**"Ollama not reachable"**
```bash
ollama serve
```

**Waveform not appearing**
Make sure your browser has microphone permission. Check the browser console for errors.

**Transcription is slow**
- Set `WHISPER_MODEL_SIZE=small` in `.env` for faster results
- Set `WHISPER_DEVICE=cuda` if you have an NVIDIA GPU

---

## License

MIT
