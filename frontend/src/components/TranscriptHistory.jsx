import { useState } from 'react';

function formatDate(dateStr) {
  // SQLite CURRENT_TIMESTAMP is UTC but has no 'Z' suffix — add it so JS treats it as UTC
  const utc = dateStr.endsWith('Z') ? dateStr : dateStr + 'Z';
  return new Date(utc).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
}

function wordCount(text) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function HistoryItem({ item, onDelete, query }) {
  const [expanded, setExpanded] = useState(false);

  const highlight = (text) => {
    if (!query) return text;
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === query.toLowerCase()
        ? <mark key={i} className="search-highlight">{part}</mark>
        : part
    );
  };

  const preview = item.cleaned_transcript.slice(0, 120) + (item.cleaned_transcript.length > 120 ? '…' : '');

  return (
    <div className="history-item">
      <div className="history-item-header">
        <div className="history-meta">
          <span className="history-date">{formatDate(item.created_at)}</span>
          <span className="history-wordcount">{wordCount(item.cleaned_transcript)} words</span>
        </div>
        <button className="btn btn-small btn-danger" onClick={() => onDelete(item.id)}>Delete</button>
      </div>
      <p className="history-preview">
        {highlight(expanded ? item.cleaned_transcript : preview)}
      </p>
      {item.cleaned_transcript.length > 120 && (
        <button className="btn-link" onClick={() => setExpanded(e => !e)}>
          {expanded ? 'Show less' : 'Show more'}
        </button>
      )}
    </div>
  );
}

function TranscriptHistory({ items, onDelete, onClearAll }) {
  const [query, setQuery] = useState('');

  const filtered = query
    ? items.filter(item =>
        item.cleaned_transcript.toLowerCase().includes(query.toLowerCase()) ||
        item.raw_transcript.toLowerCase().includes(query.toLowerCase())
      )
    : items;

  return (
    <section className="history-section">
      <div className="history-header">
        <h2>History {items.length > 0 && <span className="history-count">{items.length}</span>}</h2>
        {items.length > 0 && (
          <button className="btn btn-small btn-secondary" onClick={onClearAll}>Clear All</button>
        )}
      </div>

      {items.length > 0 && (
        <div className="history-search">
          <input
            type="text"
            className="search-input"
            placeholder="Search transcripts..."
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
        </div>
      )}

      {items.length === 0 ? (
        <p className="history-empty">No transcripts yet. Record something to get started.</p>
      ) : filtered.length === 0 ? (
        <p className="history-empty">No results for "{query}"</p>
      ) : (
        <div className="history-list">
          {filtered.map(item => (
            <HistoryItem key={item.id} item={item} onDelete={onDelete} query={query} />
          ))}
        </div>
      )}
    </section>
  );
}

export default TranscriptHistory;
