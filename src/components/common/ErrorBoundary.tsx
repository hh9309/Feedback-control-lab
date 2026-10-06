import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Feedback Lab Uncaught Component Error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 rounded-xl border border-rose-200 bg-rose-50/50 text-slate-800 space-y-4 my-6">
          <div className="flex items-center gap-3 text-rose-700">
            <AlertTriangle className="w-6 h-6 text-rose-600" />
            <h3 className="text-base font-bold">
              {this.props.fallbackTitle || '模块加载异常已捕获'}
            </h3>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            模块在计算或渲染时遇到了异常。错误信息：
            <code className="mx-1 px-1.5 py-0.5 rounded bg-rose-100/70 font-mono text-rose-900">
              {this.state.error?.message || '未知错误'}
            </code>
          </p>
          <div className="pt-2">
            <button
              onClick={this.handleReset}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition-colors flex items-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>重新加载此模块</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
