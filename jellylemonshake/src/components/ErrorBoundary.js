import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error to console
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({
      error: error,
      errorInfo: errorInfo || null
    });
  }

  render() {
    try {
      if (this.state.hasError) {
        // Fallback UI
        return (
          <div style={{
            padding: '20px',
            margin: '20px',
            border: '1px solid #ff6b6b',
            borderRadius: '8px',
            backgroundColor: '#ffe0e0',
            color: '#d63031'
          }}>
            <h2>Something went wrong</h2>
            <p>An error occurred while rendering this component.</p>
            <details style={{ whiteSpace: 'pre-wrap', marginTop: '10px' }}>
              <summary>Error Details</summary>
              <div>
                <strong>Error:</strong> {this.state.error ? this.state.error.toString() : 'Unknown error'}
              </div>
              {this.state.errorInfo && this.state.errorInfo.componentStack && (
                <div style={{ marginTop: '10px' }}>
                  <strong>Component Stack:</strong>
                  <pre style={{ fontSize: '12px', marginTop: '5px' }}>
                    {this.state.errorInfo.componentStack}
                  </pre>
                </div>
              )}
            </details>
            <button 
              onClick={() => window.location.reload()} 
              style={{
                marginTop: '10px',
                padding: '8px 16px',
                backgroundColor: '#ff6b6b',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Reload Page
            </button>
          </div>
        );
      }

      return this.props.children;
    } catch (renderError) {
      // If the render method itself throws an error, show a simple fallback
      console.error('ErrorBoundary render method failed:', renderError);
      return (
        <div style={{
          padding: '20px',
          margin: '20px',
          border: '1px solid #ff6b6b',
          borderRadius: '8px',
          backgroundColor: '#ffe0e0',
          color: '#d63031'
        }}>
          <h2>Critical Error</h2>
          <p>The error boundary itself encountered an error.</p>
          <button 
            onClick={() => window.location.reload()} 
            style={{
              marginTop: '10px',
              padding: '8px 16px',
              backgroundColor: '#ff6b6b',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Reload Page
          </button>
        </div>
      );
    }
  }
}

export default ErrorBoundary;
