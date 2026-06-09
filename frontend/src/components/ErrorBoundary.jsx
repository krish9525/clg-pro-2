import React from "react";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("[ErrorBoundary]", error, info.componentStack);
    // TODO Phase 4: send to Sentry → Sentry.captureException(error, { extra: info })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center",
          justifyContent: "center", minHeight: "100vh", padding: "2rem",
          background: "var(--bg-main, #fafbfc)", color: "var(--text-primary, #1a202c)",
          textAlign: "center",
        }}>
          <span style={{ fontSize: "4rem" }}>⚠️</span>
          <h2 style={{ marginTop: "1rem" }}>Something went wrong</h2>
          <p style={{ color: "var(--text-muted, #64748b)", maxWidth: 400 }}>
            An unexpected error occurred. Please refresh the page or go back to the home page.
          </p>
          {process.env.NODE_ENV !== "production" && this.state.error && (
            <pre style={{
              marginTop: "1rem", padding: "1rem", borderRadius: 8,
              background: "var(--bg-card, #fff)", border: "1px solid #e2e8f0",
              fontSize: "0.75rem", textAlign: "left", maxWidth: "100%", overflow: "auto",
            }}>
              {this.state.error.toString()}
            </pre>
          )}
          <div style={{ display: "flex", gap: "1rem", marginTop: "1.5rem" }}>
            <button
              className="common-btn"
              onClick={() => window.location.reload()}
            >
              🔄 Refresh Page
            </button>
            <button
              className="common-btn"
              style={{ background: "var(--bg-card)", color: "var(--text-primary)", border: "1px solid var(--border-light)" }}
              onClick={() => { this.setState({ hasError: false }); window.location.href = "/"; }}
            >
              🏠 Go Home
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
