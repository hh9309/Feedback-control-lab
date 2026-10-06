import React, { useState } from 'react';
import {
  Activity,
  CheckCircle2,
  Compass,
  HelpCircle,
  Radio,
  Sliders,
  TrendingDown,
  XCircle,
} from 'lucide-react';
import {
  FrequencyDomainMetrics,
  FrequencyPoint,
  TransferFunctionModel,
} from '../../types/control';
import { calculateFrequencyResponse } from '../../services/controlMath';

interface FrequencyDomainLabProps {
  plant: TransferFunctionModel;
  controller: TransferFunctionModel;
  feedbackGain: number;
}

export const FrequencyDomainLab: React.FC<FrequencyDomainLabProps> = ({
  plant,
  controller,
  feedbackGain,
}) => {
  const [activeView, setActiveView] = useState<'bode' | 'nyquist'>('bode');
  const [hoverPoint, setHoverPoint] = useState<FrequencyPoint | null>(null);

  const { bodePoints, nyquistPoints, metrics } = calculateFrequencyResponse(
    plant,
    controller,
    feedbackGain
  );

  const isStable = metrics.isNyquistStable;

  // Bode SVG Dimensions
  const bW = 680;
  const bH = 170;
  const bPad = { top: 20, right: 30, bottom: 25, left: 50 };
  const bPlotW = bW - bPad.left - bPad.right;
  const bPlotH = bH - bPad.top - bPad.bottom;

  // Log omega from 10^-2 to 10^2.5
  const minDecade = -2;
  const maxDecade = 2.5;

  const scaleOmegaX = (w: number) => {
    const logW = Math.log10(Math.max(1e-4, w));
    return bPad.left + ((logW - minDecade) / (maxDecade - minDecade)) * bPlotW;
  };

  // Magnitude Plot: [-60 dB, +40 dB]
  const minDb = -60;
  const maxDb = 40;
  const scaleMagY = (db: number) => {
    const clamped = Math.max(minDb, Math.min(maxDb, db));
    return bPad.top + bPlotH - ((clamped - minDb) / (maxDb - minDb)) * bPlotH;
  };

  // Phase Plot: [-270 deg, 0 deg]
  const minPhase = -270;
  const maxPhase = 0;
  const scalePhaseY = (deg: number) => {
    const clamped = Math.max(minPhase, Math.min(maxPhase, deg));
    return bPad.top + bPlotH - ((clamped - minPhase) / (maxPhase - minPhase)) * bPlotH;
  };

  const magPath = bodePoints
    .map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${scaleOmegaX(p.omega).toFixed(1)} ${scaleMagY(p.magDb).toFixed(1)}`)
    .join(' ');

  const phasePath = bodePoints
    .map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${scaleOmegaX(p.omega).toFixed(1)} ${scalePhaseY(p.phaseDeg).toFixed(1)}`)
    .join(' ');

  // Nyquist SVG Setup: centered at (180, 180), scaling real and imag in [-3, 3]
  const nSize = 360;
  const nCenter = nSize / 2;
  const nRange = 3.0;
  const scaleNyquistX = (re: number) => nCenter + (re / nRange) * (nCenter - 30);
  const scaleNyquistY = (im: number) => nCenter - (im / nRange) * (nCenter - 30);

  const nyquistPath = nyquistPoints
    .map((p, idx) => {
      const cx = scaleNyquistX(p.real);
      const cy = scaleNyquistY(p.imag);
      return `${idx === 0 ? 'M' : 'L'} ${cx.toFixed(1)} ${cy.toFixed(1)}`;
    })
    .join(' ');

  return (
    <div className="space-y-6">
      {/* Sliced Header */}
      <div className="p-6 rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-1">
              <span>开环频率特性与奈氏判据</span>
              <span>·</span>
              <span>幅值裕度 (GM) / 相位裕度 (PM)</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              频域与稳定性分析 (Bode & Nyquist)
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              通过伯德幅相特性曲线与奈奎斯特极坐标轨迹，精确量化开环传递函数 $L(j\omega)$ 的稳定裕度储备与频带宽度。
            </p>
          </div>

          {/* Sliced View Switcher */}
          <div className="flex items-center p-1 rounded-lg border border-slate-200 bg-slate-100 self-start">
            <button
              onClick={() => setActiveView('bode')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                activeView === 'bode'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              伯德图 (Bode Plot)
            </button>
            <button
              onClick={() => setActiveView('nyquist')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                activeView === 'nyquist'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              奈奎斯特图 (Nyquist Plot)
            </button>
          </div>
        </div>
      </div>

      {/* Sliced Frequency Domain KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Phase Margin */}
        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs">
          <div className="text-2xs font-semibold text-slate-500">相位裕度 (Phase Margin Pm)</div>
          <div className="font-mono text-xl font-bold text-slate-900 mt-1">
            {metrics.phaseMarginDeg !== null ? `${metrics.phaseMarginDeg}°` : '无交点'}
          </div>
          <div className="text-2xs text-slate-400 mt-0.5">
            剪切频率: {metrics.gainCrossoverFreq ?? '-'} rad/s
          </div>
        </div>

        {/* Gain Margin */}
        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs">
          <div className="text-2xs font-semibold text-slate-500">幅值裕度 (Gain Margin Gm)</div>
          <div className="font-mono text-xl font-bold text-slate-900 mt-1">
            {metrics.gainMarginDb !== null ? `${metrics.gainMarginDb} dB` : '∞ (安全)'}
          </div>
          <div className="text-2xs text-slate-400 mt-0.5">
            穿越频率: {metrics.phaseCrossoverFreq ?? '-'} rad/s
          </div>
        </div>

        {/* Bandwidth */}
        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs">
          <div className="text-2xs font-semibold text-slate-500">闭环估计带宽 (Bandwidth)</div>
          <div className="font-mono text-xl font-bold text-slate-900 mt-1">
            {metrics.bandwidth ? `${metrics.bandwidth} rad/s` : '良好'}
          </div>
          <div className="text-2xs text-slate-400 mt-0.5">高频噪声衰减分界点</div>
        </div>

        {/* Nyquist Stability Verdict */}
        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs">
          <div className="text-2xs font-semibold text-slate-500">奈奎斯特准则判定</div>
          <div
            className={`text-base font-bold mt-1.5 flex items-center gap-1.5 ${
              isStable ? 'text-emerald-700' : 'text-rose-700'
            }`}
          >
            {isStable ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>闭环渐近稳定</span>
              </>
            ) : (
              <>
                <XCircle className="w-4 h-4 text-rose-600" />
                <span>闭环失稳不稳定</span>
              </>
            )}
          </div>
          <div className="text-2xs text-slate-400 mt-0.5">
            包围临界点 (-1, j0): N = {metrics.encirclements}
          </div>
        </div>
      </div>

      {/* Bode View */}
      {activeView === 'bode' && (
        <div className="p-6 rounded-xl border border-slate-200 bg-white space-y-6">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 text-xs">
            <span className="font-bold text-slate-800">对数频率特性曲线 (Bode Diagram)</span>
            <div className="flex items-center gap-4 text-slate-500">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-teal-600 inline-block" />
                <span>对数幅频 |L(jω)| (dB)</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-indigo-600 inline-block" />
                <span>相频特性 ∠L(jω) (°)</span>
              </span>
            </div>
          </div>

          {/* 1. Magnitude Plot */}
          <div className="space-y-1">
            <div className="text-2xs font-semibold text-slate-500 flex justify-between">
              <span>幅频特性曲线 (Magnitude vs Frequency)</span>
              <span className="font-mono text-slate-400">0 dB 基准线 (幅值等于1)</span>
            </div>
            <div className="relative w-full bg-slate-50/40 rounded-xl border border-slate-200">
              <svg viewBox={`0 0 ${bW} ${bH}`} className="w-full h-auto select-none">
                {/* 0 dB Crossover Line */}
                <line
                  x1={bPad.left}
                  y1={scaleMagY(0)}
                  x2={bW - bPad.right}
                  y2={scaleMagY(0)}
                  stroke="#ef4444"
                  strokeWidth="1.2"
                  strokeDasharray="4 4"
                />
                <text
                  x={bPad.left - 6}
                  y={scaleMagY(0) + 3}
                  fontSize="9"
                  textAnchor="end"
                  fill="#ef4444"
                  fontFamily="monospace"
                >
                  0 dB
                </text>

                {/* Magnitude curve */}
                <path d={magPath} fill="none" stroke="#0d9488" strokeWidth="2.5" />

                {/* Gain crossover point marker */}
                {metrics.gainCrossoverFreq && (
                  <circle
                    cx={scaleOmegaX(metrics.gainCrossoverFreq)}
                    cy={scaleMagY(0)}
                    r="4"
                    fill="#fff"
                    stroke="#ef4444"
                    strokeWidth="2"
                  />
                )}
              </svg>
            </div>
          </div>

          {/* 2. Phase Plot */}
          <div className="space-y-1">
            <div className="text-2xs font-semibold text-slate-500 flex justify-between">
              <span>相频特性曲线 (Phase vs Frequency)</span>
              <span className="font-mono text-slate-400">-180° 临界穿越线</span>
            </div>
            <div className="relative w-full bg-slate-50/40 rounded-xl border border-slate-200">
              <svg viewBox={`0 0 ${bW} ${bH}`} className="w-full h-auto select-none">
                {/* -180 deg Crossover Line */}
                <line
                  x1={bPad.left}
                  y1={scalePhaseY(-180)}
                  x2={bW - bPad.right}
                  y2={scalePhaseY(-180)}
                  stroke="#ef4444"
                  strokeWidth="1.2"
                  strokeDasharray="4 4"
                />
                <text
                  x={bPad.left - 6}
                  y={scalePhaseY(-180) + 3}
                  fontSize="9"
                  textAnchor="end"
                  fill="#ef4444"
                  fontFamily="monospace"
                >
                  -180°
                </text>

                {/* Phase curve */}
                <path d={phasePath} fill="none" stroke="#4f46e5" strokeWidth="2.5" />

                {/* Phase crossover point marker */}
                {metrics.phaseCrossoverFreq && (
                  <circle
                    cx={scaleOmegaX(metrics.phaseCrossoverFreq)}
                    cy={scalePhaseY(-180)}
                    r="4"
                    fill="#fff"
                    stroke="#ef4444"
                    strokeWidth="2"
                  />
                )}
              </svg>
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600 flex items-start gap-2">
            <HelpCircle className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <div>
              <strong>工程裕度经验法则：</strong>为确保闭环系统具有良好的阻尼品质和抗参数摄动能力，经典控制工程通常推荐：
              <span className="font-mono font-bold text-slate-900 mx-1">相位裕度 Pm ∈ [30°, 60°]</span>，
              <span className="font-mono font-bold text-slate-900 mx-1">幅值裕度 Gm &gt; 6 dB</span>。
            </div>
          </div>
        </div>
      )}

      {/* Nyquist View */}
      {activeView === 'nyquist' && (
        <div className="p-6 rounded-xl border border-slate-200 bg-white">
          <div className="flex flex-col md:flex-row gap-6 items-center">
            {/* Nyquist Diagram SVG */}
            <div className="relative w-full max-w-[380px] aspect-square bg-slate-50/50 rounded-xl border border-slate-200 select-none">
              <svg viewBox={`0 0 ${nSize} ${nSize}`} className="w-full h-full">
                {/* Axes */}
                <line x1="20" y1={nCenter} x2={nSize - 20} y2={nCenter} stroke="#94a3b8" strokeWidth="1.5" />
                <line x1={nCenter} y1="20" x2={nCenter} y2={nSize - 20} stroke="#94a3b8" strokeWidth="1.5" />

                <text x={nSize - 25} y={nCenter - 8} fontSize="10" fill="#64748b" fontFamily="monospace">
                  Re
                </text>
                <text x={nCenter + 8} y="30" fontSize="10" fill="#64748b" fontFamily="monospace">
                  Im
                </text>

                {/* Unit circle |L| = 1 */}
                <circle
                  cx={nCenter}
                  cy={nCenter}
                  r={(1.0 / nRange) * (nCenter - 30)}
                  fill="none"
                  stroke="#cbd5e1"
                  strokeWidth="1.2"
                  strokeDasharray="4 4"
                />

                {/* Critical Point (-1, j0) */}
                <circle
                  cx={scaleNyquistX(-1)}
                  cy={scaleNyquistY(0)}
                  r="5"
                  fill="#ef4444"
                />
                <text
                  x={scaleNyquistX(-1) - 10}
                  y={scaleNyquistY(0) - 10}
                  fontSize="11"
                  fontWeight="bold"
                  fill="#b91c1c"
                >
                  (-1, j0) 临界点
                </text>

                {/* Nyquist Trajectory */}
                <path d={nyquistPath} fill="none" stroke="#0d9488" strokeWidth="2.5" />
              </svg>
            </div>

            {/* Nyquist Stability Criterion Theory */}
            <div className="space-y-4 text-xs text-slate-600 flex-1">
              <div className="border-b border-slate-100 pb-2">
                <h3 className="text-sm font-bold text-slate-900">奈奎斯特稳定性判据 (Nyquist Criterion)</h3>
                <p className="text-2xs text-slate-500 mt-0.5">柯西辐角原理在复变函数反馈分析中的经典应用</p>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 font-mono text-center text-xs">
                闭环右半平面不稳定极点数 Z = P - 2N
              </div>

              <ul className="space-y-2 text-2xs leading-relaxed">
                <li>
                  • <strong>P:</strong> 开环传递函数在复平面右半平面的极点数（开环不稳定极点数）。当前系统 $P = 0$。
                </li>
                <li>
                  • <strong>N:</strong> 当 $\omega$ 从 $0 \rightarrow +\infty$ 变化时，奈奎斯特曲线正向（逆时针）包围 $(-1, j0)$ 临界点的净圈数。
                </li>
                <li>
                  • <strong>判据结论:</strong> 负反馈闭环系统渐近稳定的充要条件是：闭环不存在右半平面极点，即
                  <strong className="text-emerald-700 mx-1">Z = 0</strong>。当前轨迹未包围 $(-1, j0)$ 临界点，因此系统严格稳定！
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
