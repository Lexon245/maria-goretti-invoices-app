import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      return (
        <div style={{
          padding: '32px',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          color: '#1a1a1a',
          maxWidth: '720px',
          margin: '40px auto',
        }}>
          <h1 style={{ color: '#dc2626' }}>Something went wrong</h1>
          <p>The application hit an unexpected error. Try recovering — your data is safe in the local database.</p>
          <pre style={{
            background: '#f3f4f6',
            padding: '12px',
            borderRadius: '6px',
            overflow: 'auto',
            fontSize: '13px',
          }}>
            {String(this.state.error?.stack || this.state.error)}
          </pre>
          <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
            <button onClick={this.handleReset} style={{
              padding: '10px 16px',
              background: '#16181D',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
            }}>Try again</button>
            <button onClick={this.handleReload} style={{
              padding: '10px 16px',
              background: '#fff',
              color: '#16181D',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              cursor: 'pointer',
            }}>Reload app</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
