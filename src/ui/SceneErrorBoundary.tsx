import { Component, type ReactNode } from 'react';
import { showLoaderError } from './loader';

// Catches errors while the 3D scene starts up, for example when the browser
// can't create a WebGL context (old hardware, hardware acceleration turned
// off). Instead of a blank page, the loading screen then explains the problem.
//
// Error boundaries are the one thing React still writes as classes: there is
// no hook for catching errors thrown while rendering child components.
export class SceneErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.error(error);
    showLoaderError();
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}
