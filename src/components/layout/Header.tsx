import React from 'react';
import {
  Activity,
  ArrowRightLeft,
  BookOpen,
  Code2,
  Cpu,
  FileSpreadsheet,
  Gauge,
  GitFork,
  Radio,
  Sliders,
  Sparkles,
  Zap,
} from 'lucide-react';
import { FeedbackMode, TimeDomainMetrics } from '../../types/control';

export type ActiveTab =
  | 'wiki'
  | 'topology'
  | 'transferFunction'
  | 'feedbackMode'
  | 'timeDomain'
  | 'frequencyDomain'
  | 'pidTuner'
  | 'aiInsights'
  | 'codeEngine'
  | 'caseLibrary'
  | 'dataReport';

interface HeaderProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  feedbackMode: FeedbackMode;
  setFeedbackMode: (mode: FeedbackMode) => void;
  metrics: TimeDomainMetrics;
  onReset: () => void;
}

const TABS: { id: ActiveTab; label: string; icon: React.ElementType }[] = [
  { id: 'wiki', label: '知识导引', icon: BookOpen },
  { id: 'topology', label: '系统拓扑', icon: GitFork },
  { id: 'transferFunction', label: '传递函数', icon: Cpu },
  { id: 'feedbackMode', label: '正负对比', icon: ArrowRightLeft },
  { id: 'timeDomain', label: '时域分析', icon: Activity },
  { id: 'frequencyDomain', label: '频域裕度', icon: Radio },
  { id: 'pidTuner', label: 'PID 调校', icon: Sliders },
  { id: 'aiInsights', label: 'AI 洞察', icon: Sparkles },
  { id: 'codeEngine', label: 'Python 引擎', icon: Code2 },
  { id: 'caseLibrary', label: '经典案例', icon: Gauge },
  { id: 'dataReport', label: '数据报告', icon: FileSpreadsheet },
];

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  feedbackMode,
  setFeedbackMode,
  metrics,
  onReset,
}) => {
  const isStable = metrics.stability === 'stable';
  const isCritical = metrics.stability === 'critically_stable';

  return (
    <header className="border-b border-slate-200 bg-white/95 backdrop-blur-md sticky top-0 z-30">
      {/* Brand & Global Controls Slice */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-4">
        {/* Logo and Name */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-slate-900 text-white flex items-center justify-center font-mono font-bold text-base shadow-xs">
            FL
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-900 tracking-tight">
                Feedback Lab
              </h1>
              <span className="text-xs text-slate-500 font-medium">反馈系统控制实验室</span>
            </div>
            <p className="text-xs text-slate-500">
              系统动力学 · 闭环控制 · 正负反馈机理仿真
            </p>
          </div>
        </div>

        {/* Status Slices and Fast Mode Toggle */}
        <div className="flex items-center gap-3">
          {/* Stability Metric Slice */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50/80 text-xs">
            <span
              className={`w-2 h-2 rounded-full ${
                isStable
                  ? 'bg-emerald-500 animate-pulse'
                  : isCritical
                  ? 'bg-amber-500 animate-pulse'
                  : 'bg-rose-500 animate-ping'
              }`}
            />
            <span className="text-slate-500">闭环状态:</span>
            <span
              className={`font-semibold ${
                isStable
                  ? 'text-emerald-700'
                  : isCritical
                  ? 'text-amber-700'
                  : 'text-rose-700'
              }`}
            >
              {isStable
                ? '渐近稳定'
                : isCritical
                ? '临界等幅振荡'
                : '发散不稳定'}
            </span>
            <span className="text-slate-300">|</span>
            <span className="text-slate-500">超调:</span>
            <span className="font-mono text-slate-700">
              {metrics.overshoot > 500 ? '∞ (发散)' : `${metrics.overshoot}%`}
            </span>
          </div>

          {/* Feedback Mode Sliced Switch */}
          <div className="flex items-center p-1 rounded-lg border border-slate-200 bg-slate-100">
            <button
              onClick={() => setFeedbackMode('negative')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
                feedbackMode === 'negative'
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="负反馈：误差做差抑制，维持内环境自平衡"
            >
              <span className="font-mono text-xs text-emerald-600">(-)</span>
              负反馈 (稳定)
            </button>
            <button
              onClick={() => setFeedbackMode('positive')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
                feedbackMode === 'positive'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="正反馈：偏差自我累积放大，引发雪崩与发散"
            >
              <span className="font-mono text-xs font-bold text-rose-200">(+)</span>
              正反馈 (发散)
            </button>
          </div>

          {/* Fast Reset */}
          <button
            onClick={onReset}
            className="px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
            title="恢复基准二阶稳定系统"
          >
            重置基准
          </button>
        </div>
      </div>

      {/* Module Sliced Tabs Nav */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <nav className="flex space-x-1 overflow-x-auto no-scrollbar py-1">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-slate-200' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
