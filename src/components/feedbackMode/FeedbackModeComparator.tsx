import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  ArrowRightLeft,
  CheckCircle2,
  GitCompare,
  TrendingDown,
  TrendingUp,
  Zap,
} from 'lucide-react';
import {
  FeedbackMode,
  SimulationPoint,
  TransferFunctionModel,
} from '../../types/control';
import {
  simulateTimeDomain,
} from '../../services/controlMath';

interface FeedbackModeComparatorProps {
  plant: TransferFunctionModel;
  controller: TransferFunctionModel;
  feedbackMode: FeedbackMode;
  setFeedbackMode: (mode: FeedbackMode) => void;
  feedbackGain: number;
}

export const FeedbackModeComparator: React.FC<FeedbackModeComparatorProps> = ({
  plant,
  controller,
  feedbackMode,
  setFeedbackMode,
  feedbackGain,
}) => {
  // Simulate both negative and positive feedback simultaneously on the exact same plant
  const negativeSim = simulateTimeDomain({
    plant,
    controller,
    mode: 'negative',
    signalType: 'step',
    amplitude: 1.0,
    disturbanceMag: 0,
    disturbanceTime: 5,
    totalTime: 10,
    feedbackGain,
  });

  const positiveSim = simulateTimeDomain({
    plant,
    controller,
    mode: 'positive',
    signalType: 'step',
    amplitude: 1.0,
    disturbanceMag: 0,
    disturbanceTime: 5,
    totalTime: 10,
    feedbackGain,
  });

  const [compareView, setCompareView] = useState<'split' | 'overlay'>('split');

  // SVG dimensions
  const width = 500;
  const height = 240;

  const renderSimSvg = (points: SimulationPoint[], isPos: boolean) => {
    // Determine y limits
    const maxVal = isPos ? Math.min(25, Math.max(3, ...points.map((p) => p.y))) : 2.5;
    const minVal = -0.5;

    const scaleX = (t: number) => 40 + (t / 10) * (width - 60);
    const scaleY = (y: number) => {
      const clamped = Math.max(minVal, Math.min(maxVal, y));
      return height - 30 - ((clamped - minVal) / (maxVal - minVal)) * (height - 60);
    };

    const pathD = points
      .map((pt, idx) => `${idx === 0 ? 'M' : 'L'} ${scaleX(pt.t).toFixed(1)} ${scaleY(pt.y).toFixed(1)}`)
      .join(' ');

    const targetY = scaleY(1.0);

    return (
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible select-none">
        {/* Background Grid */}
        <line x1="40" y1="20" x2="40" y2={height - 30} stroke="#e2e8f0" strokeWidth="1.5" />
        <line x1="40" y1={height - 30} x2={width - 20} y2={height - 30} stroke="#e2e8f0" strokeWidth="1.5" />
        
        {/* Target Line r = 1.0 */}
        <line x1="40" y1={targetY} x2={width - 20} y2={targetY} stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="4 4" />
        <text x="15" y={targetY + 4} fontSize="10" fill="#64748b" fontFamily="monospace">1.0</text>
        <text x="15" y={height - 26} fontSize="10" fill="#64748b" fontFamily="monospace">0.0</text>
        {isPos && (
          <text x="15" y="30" fontSize="10" fill="#e11d48" fontFamily="monospace">+{maxVal.toFixed(0)}</text>
        )}

        {/* Response Curve */}
        <path
          d={pathD}
          fill="none"
          stroke={isPos ? '#e11d48' : '#0284c7'}
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </svg>
    );
  };

  return (
    <div className="space-y-6">
      {/* Sliced Header */}
      <div className="p-6 rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-1">
              <span>系统动力学对偶机理</span>
              <span>·</span>
              <span>发散爆发 vs 稳态平稳特性</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              正负反馈切换与对比器 (Feedback Mode)
            </h2>
            <p className="text-sm text-slate-600 mt-1 max-w-3xl">
              改变反馈求和符号是控制理论中最具决定性的物理操作。负反馈引入“自约束”阻尼维持平衡；正反馈产生“自强化”雪崩效应，将微小扰动推向极端。
            </p>
          </div>

          {/* Master One-Click Switch Slice */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setFeedbackMode(feedbackMode === 'negative' ? 'positive' : 'negative')}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 shadow-xs ${
                feedbackMode === 'negative'
                  ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                  : 'bg-rose-600 text-white hover:bg-rose-700'
              }`}
            >
              <ArrowRightLeft className="w-4 h-4" />
              <span>当前: {feedbackMode === 'negative' ? '负反馈 (-)' : '正反馈 (+)'} · 点击立即切换</span>
            </button>
          </div>
        </div>
      </div>

      {/* Dual Simulation Slices Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Slice: Negative Feedback Benchmark */}
        <div className="p-6 rounded-xl border border-emerald-200 bg-white shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
                -
              </span>
              <div>
                <h3 className="text-sm font-bold text-slate-900">负反馈系统 (Negative Feedback)</h3>
                <span className="text-2xs font-mono text-emerald-700">T(s) = G(s) / [ 1 + G(s)H(s) ]</span>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded text-2xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              渐近稳定 · 目标收敛
            </span>
          </div>

          {/* Chart */}
          <div className="bg-slate-50/50 p-3 rounded-lg border border-slate-200">
            {renderSimSvg(negativeSim.points, false)}
          </div>

          {/* Numerical Performance Slices */}
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
              <div className="text-2xs text-slate-500">超调量 (Overshoot)</div>
              <div className="font-mono font-bold text-slate-900 text-sm mt-0.5">
                {negativeSim.metrics.overshoot}%
              </div>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
              <div className="text-2xs text-slate-500">调节时间 (Ts)</div>
              <div className="font-mono font-bold text-slate-900 text-sm mt-0.5">
                {negativeSim.metrics.settlingTime} s
              </div>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
              <div className="text-2xs text-slate-500">稳态值 (y_ss)</div>
              <div className="font-mono font-bold text-slate-900 text-sm mt-0.5">
                {negativeSim.metrics.steadyStateValue}
              </div>
            </div>
          </div>

          <div className="text-xs text-slate-600 bg-emerald-50/40 p-3 rounded-lg border border-emerald-100 leading-relaxed">
            <strong>核心物理机理：</strong>输出越大，回送的负反馈信号越强，经比较器后偏差 $e(t) = r(t) - y(t)$ 自动减小，使执行机构功率回落。系统形成天然的负熵平衡态（自稳定吸引子）。
          </div>
        </div>

        {/* Right Slice: Positive Feedback Benchmark */}
        <div className="p-6 rounded-xl border border-rose-200 bg-white shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded bg-rose-100 text-rose-800 flex items-center justify-center font-bold text-xs">
                +
              </span>
              <div>
                <h3 className="text-sm font-bold text-slate-900">正反馈系统 (Positive Feedback)</h3>
                <span className="text-2xs font-mono text-rose-700">T(s) = G(s) / [ 1 - G(s)H(s) ]</span>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded text-2xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 animate-pulse">
              指数发散 · 雪崩爆发
            </span>
          </div>

          {/* Chart */}
          <div className="bg-slate-50/50 p-3 rounded-lg border border-slate-200">
            {renderSimSvg(positiveSim.points, true)}
          </div>

          {/* Numerical Performance Slices */}
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="p-2.5 rounded-lg bg-rose-50/50 border border-rose-200">
              <div className="text-2xs text-rose-700">动态趋势</div>
              <div className="font-mono font-bold text-rose-700 text-sm mt-0.5">
                指数级飙升
              </div>
            </div>
            <div className="p-2.5 rounded-lg bg-rose-50/50 border border-rose-200">
              <div className="text-2xs text-rose-700">稳态存在性</div>
              <div className="font-mono font-bold text-rose-700 text-sm mt-0.5">
                无有限稳态
              </div>
            </div>
            <div className="p-2.5 rounded-lg bg-rose-50/50 border border-rose-200">
              <div className="text-2xs text-rose-700">峰值响应</div>
              <div className="font-mono font-bold text-rose-700 text-sm mt-0.5">
                y &gt; 25.0+
              </div>
            </div>
          </div>

          <div className="text-xs text-slate-600 bg-rose-50/40 p-3 rounded-lg border border-rose-100 leading-relaxed">
            <strong>核心物理机理：</strong>分母特征多项式出现减号 1 - L(s) = 0。哪怕受控对象自身极为稳定，正反馈也会强行诱生右半平面极点 Re(p) &gt; 0。偏差自我累加驱动输出呈 e^(λt) 恶性暴走。
          </div>
        </div>
      </div>

      {/* Comparative Matrix Table */}
      <div className="p-6 rounded-xl border border-slate-200 bg-white">
        <h3 className="text-sm font-bold text-slate-900 mb-3">正负反馈动力学对偶矩阵</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-4">物理属性维</th>
                <th className="py-2.5 px-4 text-emerald-800">负反馈 (Negative Feedback)</th>
                <th className="py-2.5 px-4 text-rose-800">正反馈 (Positive Feedback)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              <tr>
                <td className="py-2.5 px-4 font-medium text-slate-900">综合点差分关系</td>
                <td className="py-2.5 px-4 font-mono">$e(t) = r(t) - y(t)$ (削减偏差)</td>
                <td className="py-2.5 px-4 font-mono">$e(t) = r(t) + y(t)$ (强化偏差)</td>
              </tr>
              <tr>
                <td className="py-2.5 px-4 font-medium text-slate-900">闭环特征根轨迹</td>
                <td className="py-2.5 px-4">极点向左半平面深处移动，阻尼增加</td>
                <td className="py-2.5 px-4 text-rose-700 font-medium">极点穿过虚轴进入右半平面，系统失稳</td>
              </tr>
              <tr>
                <td className="py-2.5 px-4 font-medium text-slate-900">抗外部扰动能力</td>
                <td className="py-2.5 px-4">高强鲁棒性，迅速将外加扰动抑制归零</td>
                <td className="py-2.5 px-4 text-rose-700">对微小扰动极度敏感，一触即发雪崩</td>
              </tr>
              <tr>
                <td className="py-2.5 px-4 font-medium text-slate-900">典型工程与自然系统</td>
                <td className="py-2.5 px-4">人体血糖/体温调节、恒温烤箱、四旋翼悬停</td>
                <td className="py-2.5 px-4">极地冰盖反照率融化、麦克风啸叫、激光受激辐射</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
