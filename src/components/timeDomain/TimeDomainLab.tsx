import React, { useState } from 'react';
import {
  Activity,
  AlertCircle,
  ArrowDownToLine,
  BarChart2,
  Clock,
  Crosshair,
  Gauge,
  HelpCircle,
  Layers,
  Play,
  RotateCcw,
  Sliders,
  TrendingUp,
  Zap,
} from 'lucide-react';
import {
  FeedbackMode,
  InputSignalType,
  SimulationPoint,
  TimeDomainMetrics,
} from '../../types/control';

interface TimeDomainLabProps {
  points: SimulationPoint[];
  metrics: TimeDomainMetrics;
  signalType: InputSignalType;
  setSignalType: (sig: InputSignalType) => void;
  amplitude: number;
  setAmplitude: (amp: number) => void;
  disturbanceMag: number;
  setDisturbanceMag: (d: number) => void;
  disturbanceTime: number;
  setDisturbanceTime: (t: number) => void;
  feedbackMode: FeedbackMode;
}

export const TimeDomainLab: React.FC<TimeDomainLabProps> = ({
  points,
  metrics,
  signalType,
  setSignalType,
  amplitude,
  setAmplitude,
  disturbanceMag,
  setDisturbanceMag,
  disturbanceTime,
  setDisturbanceTime,
  feedbackMode,
}) => {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [showErrorCurve, setShowErrorCurve] = useState(false);
  const [showEffortCurve, setShowEffortCurve] = useState(false);

  const isPositive = feedbackMode === 'positive';
  const totalTime = points.length > 0 ? points[points.length - 1].t : 12;

  // Compute chart coordinates
  const width = 720;
  const height = 340;
  const padding = { top: 30, right: 30, bottom: 40, left: 50 };

  const plotW = width - padding.left - padding.right;
  const plotH = height - padding.top - padding.bottom;

  // Find min/max bounds with safety limits
  let maxY = Math.max(1.5 * amplitude, ...points.map((p) => p.y));
  let minY = Math.min(-0.2, ...points.map((p) => p.y));
  if (isPositive) {
    maxY = Math.min(25, Math.max(3, maxY));
    minY = Math.max(-10, minY);
  } else {
    maxY = Math.max(1.8, Math.min(6, maxY));
    minY = Math.min(-0.5, minY);
  }

  const scaleX = (t: number) => padding.left + (t / totalTime) * plotW;
  const scaleY = (y: number) => {
    const clamped = Math.max(minY, Math.min(maxY, y));
    return padding.top + plotH - ((clamped - minY) / (maxY - minY)) * plotH;
  };

  // Build SVG Paths
  const yPath = points
    .map((pt, idx) => `${idx === 0 ? 'M' : 'L'} ${scaleX(pt.t).toFixed(1)} ${scaleY(pt.y).toFixed(1)}`)
    .join(' ');

  const rPath = points
    .map((pt, idx) => `${idx === 0 ? 'M' : 'L'} ${scaleX(pt.t).toFixed(1)} ${scaleY(pt.r).toFixed(1)}`)
    .join(' ');

  const ePath = points
    .map((pt, idx) => `${idx === 0 ? 'M' : 'L'} ${scaleX(pt.t).toFixed(1)} ${scaleY(pt.e).toFixed(1)}`)
    .join(' ');

  const uPath = points
    .map((pt, idx) => `${idx === 0 ? 'M' : 'L'} ${scaleX(pt.t).toFixed(1)} ${scaleY(pt.u * 0.2).toFixed(1)}`)
    .join(' ');

  const activePt = hoverIndex !== null ? points[hoverIndex] : points[points.length - 1];

  return (
    <div className="space-y-6">
      {/* Sliced Header */}
      <div className="p-6 rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-1">
              <span>瞬态与稳态响应评测</span>
              <span>·</span>
              <span>超调量 / 调节时间 / 稳态误差</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              时域响应分析器 (Time-Domain Lab)
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              观察控制系统在不同激励信号（阶跃、冲激、斜坡、方波）以及突发外界扰动冲击下的动态时域轨迹。
            </p>
          </div>

          {/* Sliced Input Signal Buttons */}
          <div className="flex items-center p-1 rounded-lg border border-slate-200 bg-slate-100 self-start">
            <button
              onClick={() => setSignalType('step')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                signalType === 'step'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              阶跃响应 (Step)
            </button>
            <button
              onClick={() => setSignalType('impulse')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                signalType === 'impulse'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              冲激响应 (Impulse)
            </button>
            <button
              onClick={() => setSignalType('ramp')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                signalType === 'ramp'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              斜坡跟踪 (Ramp)
            </button>
            <button
              onClick={() => setSignalType('square')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                signalType === 'square'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              周期方波 (Square)
            </button>
          </div>
        </div>
      </div>

      {/* Numerical Metrics Slices Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs">
          <div className="text-2xs font-semibold text-slate-500">超调量 (Overshoot σ)</div>
          <div className="font-mono text-lg font-bold text-slate-900 mt-1">
            {metrics.overshoot > 500 ? '∞ (发散)' : `${metrics.overshoot}%`}
          </div>
          <div className="text-2xs text-slate-400 mt-0.5">峰值相比稳态增加率</div>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs">
          <div className="text-2xs font-semibold text-slate-500">上升时间 (Tr 10%-90%)</div>
          <div className="font-mono text-lg font-bold text-slate-900 mt-1">
            {metrics.riseTime} s
          </div>
          <div className="text-2xs text-slate-400 mt-0.5">响应敏捷度指标</div>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs">
          <div className="text-2xs font-semibold text-slate-500">调节时间 (Ts ±2%带)</div>
          <div className="font-mono text-lg font-bold text-slate-900 mt-1">
            {metrics.settlingTime} s
          </div>
          <div className="text-2xs text-slate-400 mt-0.5">进入误差带所需时间</div>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs">
          <div className="text-2xs font-semibold text-slate-500">稳态误差 (Ess)</div>
          <div className="font-mono text-lg font-bold text-slate-900 mt-1">
            {metrics.steadyStateError}
          </div>
          <div className="text-2xs text-slate-400 mt-0.5">目标与终值偏差</div>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs">
          <div className="text-2xs font-semibold text-slate-500">峰值时间 (Tp)</div>
          <div className="font-mono text-lg font-bold text-slate-900 mt-1">
            {metrics.peakTime} s
          </div>
          <div className="text-2xs text-slate-400 mt-0.5">到达最大振幅时刻</div>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs">
          <div className="text-2xs font-semibold text-slate-500">稳定性评级</div>
          <div
            className={`text-sm font-bold mt-1.5 ${
              metrics.stability === 'stable'
                ? 'text-emerald-700'
                : metrics.stability === 'critically_stable'
                ? 'text-amber-700'
                : 'text-rose-700'
            }`}
          >
            {metrics.stability === 'stable'
              ? '渐近稳定'
              : metrics.stability === 'critically_stable'
              ? '临界等幅'
              : '失稳发散'}
          </div>
          <div className="text-2xs text-slate-400 mt-0.5">极点实部与反馈判定</div>
        </div>
      </div>

      {/* Main Simulation Canvas Chart */}
      <div className="p-6 rounded-xl border border-slate-200 bg-white space-y-4">
        {/* Chart Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Curve Toggles */}
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 font-medium text-slate-800">
              <span className="w-3 h-0.5 bg-sky-600 inline-block" />
              <span>输出响应 y(t)</span>
            </span>
            <span className="flex items-center gap-1.5 text-slate-500">
              <span className="w-3 h-0.5 bg-slate-400 border-dashed inline-block" />
              <span>目标基准 r(t)</span>
            </span>
            <label className="flex items-center gap-1.5 cursor-pointer text-slate-600 hover:text-slate-900">
              <input
                type="checkbox"
                checked={showErrorCurve}
                onChange={(e) => setShowErrorCurve(e.target.checked)}
                className="accent-slate-900"
              />
              <span>偏差 e(t)</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer text-slate-600 hover:text-slate-900">
              <input
                type="checkbox"
                checked={showEffortCurve}
                onChange={(e) => setShowEffortCurve(e.target.checked)}
                className="accent-slate-900"
              />
              <span>控制量 u(t)</span>
            </label>
          </div>

          {/* Real-time Cursor Reading */}
          {activePt && (
            <div className="flex items-center gap-3 font-mono text-2xs bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
              <span>t: <strong className="text-slate-900">{activePt.t.toFixed(2)}s</strong></span>
              <span>y: <strong className="text-sky-700">{activePt.y.toFixed(3)}</strong></span>
              <span>r: <strong className="text-slate-700">{activePt.r.toFixed(2)}</strong></span>
              <span>e: <strong className="text-amber-700">{activePt.e.toFixed(3)}</strong></span>
              {activePt.d !== 0 && <span>扰动 d: <strong className="text-rose-700">{activePt.d}</strong></span>}
            </div>
          )}
        </div>

        {/* SVG Chart Plot */}
        <div className="relative w-full overflow-hidden bg-slate-50/40 rounded-xl border border-slate-200">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-auto cursor-crosshair select-none"
            onMouseMove={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const mx = ((e.clientX - rect.left) / rect.width) * width;
              const tMouse = ((mx - padding.left) / plotW) * totalTime;
              const idx = Math.max(
                0,
                Math.min(points.length - 1, Math.round((tMouse / totalTime) * (points.length - 1)))
              );
              setHoverIndex(idx);
            }}
            onMouseLeave={() => setHoverIndex(null)}
          >
            {/* Grid Lines */}
            {[0, 0.25, 0.5, 0.75, 1.0].map((frac) => {
              const gy = padding.top + frac * plotH;
              const val = maxY - frac * (maxY - minY);
              return (
                <g key={frac}>
                  <line
                    x1={padding.left}
                    y1={gy}
                    x2={width - padding.right}
                    y2={gy}
                    stroke="#f1f5f9"
                    strokeWidth="1"
                  />
                  <text
                    x={padding.left - 8}
                    y={gy + 3}
                    fontSize="9"
                    textAnchor="end"
                    fill="#94a3b8"
                    fontFamily="monospace"
                  >
                    {val.toFixed(1)}
                  </text>
                </g>
              );
            })}

            {/* Time Ticks */}
            {[0, 2, 4, 6, 8, 10, 12].map((tv) => {
              if (tv > totalTime) return null;
              const gx = scaleX(tv);
              return (
                <g key={tv}>
                  <line
                    x1={gx}
                    y1={padding.top}
                    x2={gx}
                    y2={height - padding.bottom}
                    stroke="#f1f5f9"
                    strokeWidth="1"
                  />
                  <text
                    x={gx}
                    y={height - padding.bottom + 16}
                    fontSize="9"
                    textAnchor="middle"
                    fill="#94a3b8"
                    fontFamily="monospace"
                  >
                    {tv}s
                  </text>
                </g>
              );
            })}

            {/* Axis Lines */}
            <line
              x1={padding.left}
              y1={padding.top}
              x2={padding.left}
              y2={height - padding.bottom}
              stroke="#cbd5e1"
              strokeWidth="1.5"
            />
            <line
              x1={padding.left}
              y1={height - padding.bottom}
              x2={width - padding.right}
              y2={height - padding.bottom}
              stroke="#cbd5e1"
              strokeWidth="1.5"
            />

            {/* Disturbance Marker Line if active */}
            {disturbanceMag !== 0 && (
              <g>
                <line
                  x1={scaleX(disturbanceTime)}
                  y1={padding.top}
                  x2={scaleX(disturbanceTime)}
                  y2={height - padding.bottom}
                  stroke="#f59e0b"
                  strokeWidth="1.5"
                  strokeDasharray="3 3"
                />
                <text
                  x={scaleX(disturbanceTime) + 4}
                  y={padding.top + 12}
                  fontSize="9"
                  fill="#b45309"
                  fontWeight="bold"
                >
                  扰动注入 (d={disturbanceMag})
                </text>
              </g>
            )}

            {/* Curves */}
            {/* Target Reference r(t) */}
            <path
              d={rPath}
              fill="none"
              stroke="#94a3b8"
              strokeWidth="1.5"
              strokeDasharray="4 4"
            />

            {/* Error Curve e(t) if enabled */}
            {showErrorCurve && (
              <path
                d={ePath}
                fill="none"
                stroke="#f59e0b"
                strokeWidth="1.5"
                strokeDasharray="2 2"
              />
            )}

            {/* Control Effort u(t) if enabled */}
            {showEffortCurve && (
              <path
                d={uPath}
                fill="none"
                stroke="#8b5cf6"
                strokeWidth="1.5"
              />
            )}

            {/* Main Output Curve y(t) */}
            <path
              d={yPath}
              fill="none"
              stroke={isPositive ? '#e11d48' : '#0284c7'}
              strokeWidth="2.5"
              strokeLinecap="round"
            />

            {/* Crosshair Cursor on Hover */}
            {activePt && (
              <g>
                <line
                  x1={scaleX(activePt.t)}
                  y1={padding.top}
                  x2={scaleX(activePt.t)}
                  y2={height - padding.bottom}
                  stroke="#64748b"
                  strokeWidth="1"
                  strokeDasharray="3 3"
                />
                <circle
                  cx={scaleX(activePt.t)}
                  cy={scaleY(activePt.y)}
                  r="5"
                  fill="#fff"
                  stroke={isPositive ? '#e11d48' : '#0284c7'}
                  strokeWidth="2.5"
                />
              </g>
            )}
          </svg>
        </div>

        {/* Disturbance Injection Controls Slice */}
        <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <div>
              <span className="text-xs font-bold text-slate-800">外加负载/环境突发扰动 (Disturbance Injection):</span>
              <p className="text-2xs text-slate-500">模拟真实工况中遭遇的大风、负载突变或温降扰动</p>
            </div>
          </div>

          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-600">幅值:</span>
              <input
                type="range"
                min="-1.5"
                max="1.5"
                step="0.1"
                value={disturbanceMag}
                onChange={(e) => setDisturbanceMag(parseFloat(e.target.value))}
                className="w-28 accent-amber-600 cursor-pointer"
              />
              <span className="font-mono font-bold text-slate-900 w-8">{disturbanceMag}</span>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-600">发生时刻:</span>
              <input
                type="range"
                min="1"
                max="8"
                step="0.5"
                value={disturbanceTime}
                onChange={(e) => setDisturbanceTime(parseFloat(e.target.value))}
                className="w-24 accent-amber-600 cursor-pointer"
              />
              <span className="font-mono font-bold text-slate-900 w-8">{disturbanceTime}s</span>
            </div>

            <button
              onClick={() => setDisturbanceMag(disturbanceMag !== 0 ? 0 : 0.6)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                disturbanceMag !== 0
                  ? 'bg-amber-100 border-amber-300 text-amber-900'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              {disturbanceMag !== 0 ? '清除扰动' : '一键注入扰动 (+0.6)'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
