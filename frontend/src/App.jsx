import { useState, useEffect } from 'react';
import AudioRecorder from './components/AudioRecorder';
import TranscriptDisplay from './components/TranscriptDisplay';
import StatusMessage from './components/StatusMessage';
import TranscriptHistory from './components/TranscriptHistory';

function App() {
  const [audioBlob, setAudioBlob] = useState(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);
  const [transcripts, setTranscripts] = useState(null);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    loadHistory();
  }, []);

  async function loadHistory() {
    try {
      const res = await fetch('/api/history');
      if (res.ok) setHistory(await res.json());
    } catch {
      // history is non-critical
    }
  }

  const handleRecordingComplete = (blob) => {
    setAudioBlob(blob);
    setTranscripts(null);
    setError(null);
  };

  const handleTranscribe = async () => {
    if (!audioBlob) {
      setError('No audio recorded. Please record audio first.');
      return;
    }

    setIsTranscribing(true);
    setError(null);
    setStatus('Uploading audio...');

    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');

      setStatus('Transcribing with Whisper...');

      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Transcription failed');
      }

      setTranscripts({
        raw: data.raw_transcript,
        cleaned: data.cleaned_transcript
      });
      setStatus(null);
      loadHistory();

    } catch (err) {
      setError(err.message || 'Transcription failed. Please try again.');
      setStatus(null);
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleDeleteHistory = async (id) => {
    try {
      await fetch(`/api/history/${id}`, { method: 'DELETE' });
      setHistory(h => h.filter(item => item.id !== id));
    } catch {
      // ignore
    }
  };

  const handleClearAll = async () => {
    try {
      await fetch('/api/history/all', { method: 'DELETE' });
      setHistory([]);
    } catch {
      // ignore
    }
  };

  return (
    <div className="container">
      <header>
        <h1>AI Transcript</h1>
        <p className="subtitle">Local speech-to-text with AI-powered cleaning</p>
      </header>

      <main>
        <AudioRecorder
          onRecordingComplete={handleRecordingComplete}
          onTranscribe={handleTranscribe}
          isTranscribing={isTranscribing}
          hasAudio={!!audioBlob}
        />

        {status && <StatusMessage message={status} type="loading" />}

        {error && (
          <StatusMessage
            message={error}
            type="error"
            onDismiss={() => setError(null)}
          />
        )}

        {transcripts && (
          <TranscriptDisplay
            rawTranscript={transcripts.raw}
            cleanedTranscript={transcripts.cleaned}
          />
        )}

        <TranscriptHistory
          items={history}
          onDelete={handleDeleteHistory}
          onClearAll={handleClearAll}
        />
      </main>

      <footer>
        <p>Powered by Whisper & Ollama</p>
      </footer>
    </div>
  );
}

export default App;
