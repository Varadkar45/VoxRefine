function StatusMessage({ message, type, onDismiss }) {
  if (type === 'loading') {
    return (
      <section className="status-section">
        <div className="status-content">
          <div className="spinner"></div>
          <p>{message}</p>
        </div>
      </section>
    );
  }

  if (type === 'error') {
    return (
      <section className="error-section">
        <div className="error-content">
          <span className="error-icon">!</span>
          <p>{message}</p>
          {onDismiss && (
            <button className="btn btn-small" onClick={onDismiss}>
              Dismiss
            </button>
          )}
        </div>
      </section>
    );
  }

  return null;
}

export default StatusMessage;
