import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 40, maxWidth: 600, margin: '40px auto', fontFamily: 'sans-serif' }}>
          <h1 style={{ color: '#ef4444', fontSize: 20 }}>⚠ 应用加载错误</h1>
          <pre style={{ background: '#fef2f2', padding: 16, borderRadius: 8, fontSize: 13, overflow: 'auto', marginTop: 12 }}>
            {this.state.error.message}
          </pre>
          <p style={{ marginTop: 12, color: '#6b7280', fontSize: 13 }}>
            {this.state.error.stack?.split('\n').slice(0, 5).join('\n')}
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}