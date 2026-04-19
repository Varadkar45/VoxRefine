import { useState } from 'react';

function TranscriptDisplay({ rawTranscript, cleanedTranscript }) {
  const [copiedField, setCopiedField] = useState(null);

  const copyToClipboard = async (text, field) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (error) {
      console.error('Copy failed:', error);
    }
  };

  const exportTxt = () => {
    const content = `AI Transcript Export\n${'='.repeat(40)}\nDate: ${new Date().toLocaleString()}\n\nRAW TRANSCRIPT\n${'-'.repeat(40)}\n${rawTranscript}\n\nCLEANED TRANSCRIPT\n${'-'.repeat(40)}\n${cleanedTranscript}`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transcript-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="results-section">
      <div className="results-toolbar">
        <button className="btn btn-small btn-secondary" onClick={exportTxt}>
          Export .txt
        </button>
      </div>

      <div className="result-card">
        <div className="result-header">
          <h2>Raw Transcript</h2>
          <button
            className={`btn btn-small copy-btn ${copiedField === 'raw' ? 'copied' : ''}`}
            onClick={() => copyToClipboard(rawTranscript, 'raw')}
          >
            {copiedField === 'raw' ? 'Copied!' : 'Copy'}
          </button>
        </div>
        <div className="transcript-text">{rawTranscript}</div>
      </div>

      <div className="result-card">
        <div className="result-header">
          <h2>Cleaned Transcript</h2>
          <button
            className={`btn btn-small copy-btn ${copiedField === 'cleaned' ? 'copied' : ''}`}
            onClick={() => copyToClipboard(cleanedTranscript, 'cleaned')}
          >
            {copiedField === 'cleaned' ? 'Copied!' : 'Copy'}
          </button>
        </div>
        <div className="transcript-text">{cleanedTranscript}</div>
      </div>
    </section>
  );
}

export default TranscriptDisplay;
