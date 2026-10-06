import React, { useState } from 'react';
import {
  ComplexNumber,
  FeedbackMode,
  TransferFunctionModel,
} from '../../types/control';
import {
  formatPolynomial,
  poly,
} from '../../services/controlMath';
import {
  AlertTriangle,
  CheckCircle2,
  Cpu,
  Layers,
  Move,
  Plus,
  RefreshCw,
  Trash2,
} from 'lucide-react';

interface TransferFunctionConfigProps {
  plant: TransferFunctionModel;
  setPlant: React.Dispatch<React.SetStateAction<TransferFunctionModel>>;
  closedLoopTf: TransferFunctionModel;
  feedbackMode: FeedbackMode;
}

export const TransferFunctionConfig: React.FC<TransferFunctionConfigProps> = ({
  plant,
  setPlant,
  closedLoopTf,
  feedbackMode,
}) => {
  const [configMode, setConfigMode] = useState<'polynomial' | 'zeropole'>('polynomial');
  const [numInput, setNumInput] = useState(plant.numerator.join(', '));
  const [denInput, setDenInput] = useState(plant.denominator.join(', '));
  const [inputError, setInputError] = useState<string | null>(null);

  // Compute poles and zeros of open-loop plant and closed-loop system
  const openPoles = poly.findRoots(plant.denominator);
  const openZeros = poly.findRoots(plant.numerator);
  const closedPoles = poly.findRoots(closedLoopTf.denominator);
  const closedZeros = poly.findRoots(closedLoopTf.numerator);

  // Apply polynomial string change
  const handleApplyPolynomial = () => {
    try {
      const num = numInput
        .split(',')
        .map((s) => parseFloat(s.trim()))
        .filter((n) => !isNaN(n));
      const den = denInput
        .split(',')
        .map((s) => parseFloat(s.trim()))
        .filter((n) => !isNaN(n));

      if (num.length === 0 || den.length === 0) {
        setInputError('分子或分母系数不能为空');
        return;
      }
      if (den.length < num.length) {
        setInputError('受控对象分母阶数必须大于或等于分子阶数 (严合格物理可实现)');
        return;
      }
      setInputError(null);
      setPlant((prev) => ({
        ...prev,
        numerator: num,
        denominator: den,
      }));
    } catch (e: any) {
      setInputError('系数解析失败，请输入以逗号分隔的数字，如: 1, 2, 1');
    }
  };

  // Dragging pole logic on s-plane
  const [draggedPoleIdx, setDraggedPoleIdx] = useState<number | null>(null);

  // Map complex s coordinate (real in [-5, 5], imag in [-5, 5]) to SVG (x, y in [0, 400])
  const sToSvg = (c: ComplexNumber) => {
    const x = 200 + (c.real / 5) * 180;
    const y = 200 - (c.imag / 5) * 180;
    return { x, y };
  };

  const svgToS = (px: number, py: number): ComplexNumber => {
    const real = ((px - 200) / 180) * 5;
    const imag = -((py - 200) / 180) * 5;
    return {
      real: Number(real.toFixed(2)),
      imag: Number(imag.toFixed(2)),
    };
  };

  const handleSvgMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (draggedPoleIdx === null) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * 400;
    const py = ((e.clientY - rect.top) / rect.height) * 400;
    const newS = svgToS(px, py);

    // Reconstruct denominator from poles:
    // If pole has imaginary part, pair with conjugate
    const updatedPoles = [...openPoles];
    updatedPoles[draggedPoleIdx] = newS;

    // Expand polynomial from roots: prod (s - p_i)
    let expandedDen = [1];
    for (const p of updatedPoles) {
      if (Math.abs(p.imag) < 0.05) {
        // Real root (s - p.real)
        expandedDen = poly.multiply(expandedDen, [1, -p.real]);
      } else {
        // Complex conjugate pair (s - (r + j i))(s - (r - j i)) = s^2 - 2r s + (r^2 + i^2)
        const quad = [1, -2 * p.real, p.real * p.real + p.imag * p.imag];
        expandedDen = poly.multiply(expandedDen, quad);
      }
    }

    setPlant((prev) => ({
      ...prev,
      denominator: poly.clean(expandedDen.map((c) => Number(c.toFixed(3)))),
    }));
    setDenInput(poly.clean(expandedDen.map((c) => Number(c.toFixed(3)))).join(', '));
  };

  const hasRhpClosedPole = closedPoles.some((p) => p.real > 0.001);

  return (
    <div className="space-y-6">
      {/* Sliced Header */}
      <div className="p-6 rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-1">
              <span>系统数学建模</span>
              <span>·</span>
              <span>零极点复平面与纯迟延环节</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              传递函数配置 (Transfer Function)
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              定义开环被控对象 $G(s)$ 并在复平面 (s-Plane) 观察闭环极点分布。可直接拖拽极点越过虚轴体验稳定性相变。
            </p>
          </div>

          {/* Sliced Input Mode Switch */}
          <div className="flex items-center p-1 rounded-lg border border-slate-200 bg-slate-100 self-start">
            <button
              onClick={() => setConfigMode('polynomial')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                configMode === 'polynomial'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              多项式系数模式
            </button>
            <button
              onClick={() => setConfigMode('zeropole')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                configMode === 'zeropole'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              零极点交互模式
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Equation Editor (Left) & S-Plane Complex Plane (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Transfer Function Expressions & Presets */}
        <div className="space-y-6">
          {/* Current Expressions Slice */}
          <div className="p-6 rounded-xl border border-slate-200 bg-white space-y-4">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">开环与闭环数学解析式</h3>
              <span
                className={`text-2xs px-2 py-0.5 rounded font-semibold ${
                  hasRhpClosedPole
                    ? 'bg-rose-50 text-rose-700 border border-rose-200'
                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                }`}
              >
                {hasRhpClosedPole ? '闭环不稳定 (存在 RHP 极点)' : '闭环渐近稳定 (全 LHP 极点)'}
              </span>
            </div>

            {/* Display Formula */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3 font-mono text-xs">
              <div>
                <span className="text-slate-500 font-sans text-2xs block mb-1">
                  1. 开环被控对象 G(s):
                </span>
                <div className="text-slate-900 font-bold text-sm bg-white p-2.5 rounded border border-slate-200 text-center">
                  G(s) = {formatPolynomial(plant.numerator)} / [{formatPolynomial(plant.denominator)}]
                  {plant.delay > 0 && ` · e^(-${plant.delay}s)`}
                </div>
              </div>

              <div>
                <span className="text-slate-500 font-sans text-2xs block mb-1">
                  2. 闭环系统传递函数 T(s) ({feedbackMode === 'negative' ? '负反馈' : '正反馈'}):
                </span>
                <div className="text-slate-900 font-bold text-sm bg-white p-2.5 rounded border border-slate-200 text-center">
                  T(s) = {formatPolynomial(closedLoopTf.numerator)} / [{formatPolynomial(closedLoopTf.denominator)}]
                </div>
              </div>
            </div>

            {/* Polynomial Editing Form */}
            {configMode === 'polynomial' && (
              <div className="space-y-3 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    分子多项式系数 Num(s) (高阶到常数项，逗号分隔):
                  </label>
                  <input
                    type="text"
                    value={numInput}
                    onChange={(e) => setNumInput(e.target.value)}
                    placeholder="例如: 1"
                    className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    分母多项式系数 Den(s) (高阶到常数项，逗号分隔):
                  </label>
                  <input
                    type="text"
                    value={denInput}
                    onChange={(e) => setDenInput(e.target.value)}
                    placeholder="例如: 1, 2, 1 对应 s² + 2s + 1"
                    className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-slate-900"
                  />
                </div>

                {inputError && (
                  <div className="text-xs text-rose-600 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>{inputError}</span>
                  </div>
                )}

                <div className="flex items-center gap-3 pt-1">
                  <button
                    onClick={handleApplyPolynomial}
                    className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition-colors shadow-xs"
                  >
                    更新传递函数
                  </button>
                  <button
                    onClick={() => {
                      setNumInput('1');
                      setDenInput('1, 2, 1');
                      setPlant({
                        numerator: [1],
                        denominator: [1, 2, 1],
                        delay: 0,
                        gain: 1,
                      });
                      setInputError(null);
                    }}
                    className="px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    恢复基准二阶 1/(s²+2s+1)
                  </button>
                </div>
              </div>
            )}

            {/* Delay Slider */}
            <div className="pt-3 border-t border-slate-100">
              <div className="flex justify-between items-center text-xs font-medium text-slate-700 mb-1">
                <span>纯迟延时间 (Dead Time τ):</span>
                <span className="font-mono font-bold text-slate-900">{plant.delay} 秒</span>
              </div>
              <input
                type="range"
                min="0"
                max="1.5"
                step="0.05"
                value={plant.delay}
                onChange={(e) =>
                  setPlant((prev) => ({ ...prev, delay: parseFloat(e.target.value) }))
                }
                className="w-full accent-slate-900 cursor-pointer"
              />
              <p className="text-2xs text-slate-500 mt-1">
                纯迟延引入额外负相移 $\Delta \phi = -\omega \tau$，严重压缩相位裕度并可能导致原本稳定的负反馈系统诱发自激振荡。
              </p>
            </div>
          </div>

          {/* Quick Benchmark Model Presets */}
          <div className="p-6 rounded-xl border border-slate-200 bg-white">
            <h3 className="text-xs font-bold text-slate-700 mb-3">经典受控对象工程原型库</h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                onClick={() => {
                  setPlant({ numerator: [1], denominator: [1, 1], delay: 0, gain: 1 });
                  setNumInput('1');
                  setDenInput('1, 1');
                }}
                className="p-3 text-left rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-colors"
              >
                <div className="font-semibold text-slate-900">一阶惯性系统</div>
                <div className="font-mono text-2xs text-slate-500 mt-0.5">1 / (s + 1)</div>
                <div className="text-2xs text-slate-600 mt-1">RC低通滤波、单容水箱</div>
              </button>

              <button
                onClick={() => {
                  setPlant({ numerator: [1], denominator: [1, 1.4, 1], delay: 0, gain: 1 });
                  setNumInput('1');
                  setDenInput('1, 1.4, 1');
                }}
                className="p-3 text-left rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-colors"
              >
                <div className="font-semibold text-slate-900">最佳阻尼二阶系统</div>
                <div className="font-mono text-2xs text-slate-500 mt-0.5">1 / (s² + 1.4s + 1)</div>
                <div className="text-2xs text-slate-600 mt-1">ζ = 0.707, 超调约 4.3%</div>
              </button>

              <button
                onClick={() => {
                  setPlant({ numerator: [1], denominator: [1, 0.2, 4], delay: 0, gain: 1 });
                  setNumInput('1');
                  setDenInput('1, 0.2, 4');
                }}
                className="p-3 text-left rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-colors"
              >
                <div className="font-semibold text-slate-900">高谐振机械臂系统</div>
                <div className="font-mono text-2xs text-slate-500 mt-0.5">1 / (s² + 0.2s + 4)</div>
                <div className="text-2xs text-slate-600 mt-1">轻质柔性关节、欠阻尼剧烈震荡</div>
              </button>

              <button
                onClick={() => {
                  setPlant({ numerator: [1], denominator: [1, 0], delay: 0, gain: 1 });
                  setNumInput('1');
                  setDenInput('1, 0');
                }}
                className="p-3 text-left rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-colors"
              >
                <div className="font-semibold text-slate-900">无静差积分环节</div>
                <div className="font-mono text-2xs text-slate-500 mt-0.5">1 / s</div>
                <div className="text-2xs text-slate-600 mt-1">直流伺服电机角位置输出</div>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Interactive S-Plane Complex Plane Map */}
        <div className="p-6 rounded-xl border border-slate-200 bg-white flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">复平面零极点图 (s-Plane Root Map)</h3>
                <p className="text-2xs text-slate-500">实轴 $\sigma$ · 虚轴 $j\omega$ · 稳定性分界线</p>
              </div>
              <div className="flex items-center gap-3 text-2xs font-mono">
                <span className="flex items-center gap-1 text-slate-700">
                  <span className="font-bold text-xs text-rose-600">✕</span> 极点 (Poles)
                </span>
                <span className="flex items-center gap-1 text-slate-700">
                  <span className="font-bold text-xs text-sky-600">○</span> 零点 (Zeros)
                </span>
              </div>
            </div>

            {/* SVG S-Plane */}
            <div className="relative w-full aspect-square max-w-[420px] mx-auto bg-white rounded-xl border border-slate-200 overflow-hidden select-none">
              <svg
                viewBox="0 0 400 400"
                className="w-full h-full cursor-crosshair"
                onMouseMove={handleSvgMouseMove}
                onMouseUp={() => setDraggedPoleIdx(null)}
                onMouseLeave={() => setDraggedPoleIdx(null)}
              >
                {/* Left Half Plane (LHP - Stable Area) Background */}
                <rect x="0" y="0" width="200" height="400" fill="#ecfdf5" opacity="0.6" />
                {/* Right Half Plane (RHP - Unstable Area) Background */}
                <rect x="200" y="0" width="200" height="400" fill="#fff1f2" opacity="0.6" />

                {/* Subdued Grid Lines */}
                {[-4, -3, -2, -1, 1, 2, 3, 4].map((v) => {
                  const x = 200 + (v / 5) * 180;
                  const y = 200 - (v / 5) * 180;
                  return (
                    <g key={v}>
                      <line x1={x} y1="0" x2={x} y2="400" stroke="#f1f5f9" strokeWidth="1" />
                      <line x1="0" y1={y} x2="400" y2={y} stroke="#f1f5f9" strokeWidth="1" />
                    </g>
                  );
                })}

                {/* Real Axis Sigma */}
                <line x1="10" y1="200" x2="390" y2="200" stroke="#94a3b8" strokeWidth="1.5" />
                {/* Imaginary Axis jw (Stability Boundary) */}
                <line x1="200" y1="10" x2="200" y2="390" stroke="#0f172a" strokeWidth="2.5" />

                {/* Axis Labels */}
                <text x="375" y="192" fontSize="11" fontWeight="bold" fill="#64748b" fontFamily="monospace">
                  σ
                </text>
                <text x="208" y="25" fontSize="11" fontWeight="bold" fill="#0f172a" fontFamily="monospace">
                  jω (虚轴)
                </text>

                {/* LHP / RHP Text Watermarks */}
                <text x="30" y="40" fontSize="10" fontWeight="bold" fill="#059669">
                  左半平面 LHP (稳定收敛区)
                </text>
                <text x="220" y="40" fontSize="10" fontWeight="bold" fill="#e11d48">
                  右半平面 RHP (发散爆炸区)
                </text>

                {/* Origin Circle */}
                <circle cx="200" cy="200" r="3" fill="#0f172a" />

                {/* Draw Open Loop Zeros */}
                {openZeros.map((z, idx) => {
                  const pt = sToSvg(z);
                  return (
                    <circle
                      key={`zero-${idx}`}
                      cx={pt.x}
                      cy={pt.y}
                      r="6"
                      fill="#fff"
                      stroke="#0284c7"
                      strokeWidth="2"
                    />
                  );
                })}

                {/* Draw Open Loop Poles (Draggable) */}
                {openPoles.map((p, idx) => {
                  const pt = sToSvg(p);
                  return (
                    <g
                      key={`pole-${idx}`}
                      onMouseDown={() => setDraggedPoleIdx(idx)}
                      className="cursor-move group"
                    >
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r="12"
                        fill="transparent"
                        className="hover:fill-rose-100/50"
                      />
                      <line
                        x1={pt.x - 7}
                        y1={pt.y - 7}
                        x2={pt.x + 7}
                        y2={pt.y + 7}
                        stroke="#e11d48"
                        strokeWidth="2.5"
                      />
                      <line
                        x1={pt.x - 7}
                        y1={pt.y + 7}
                        x2={pt.x + 7}
                        y2={pt.y - 7}
                        stroke="#e11d48"
                        strokeWidth="2.5"
                      />
                      <text
                        x={pt.x + 8}
                        y={pt.y - 8}
                        fontSize="9"
                        fill="#b91c1c"
                        fontFamily="monospace"
                        fontWeight="bold"
                      >
                        p{idx + 1}({p.real.toFixed(1)}, {p.imag.toFixed(1)}j)
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>

          {/* S-Plane Pole Coordinates List */}
          <div className="mt-4 pt-3 border-t border-slate-100">
            <div className="text-2xs font-semibold text-slate-500 mb-2">闭环系统极点精算值列表 (Closed-Loop Roots):</div>
            <div className="flex flex-wrap gap-2 font-mono text-2xs">
              {closedPoles.map((p, idx) => {
                const isRhp = p.real > 0.001;
                return (
                  <span
                    key={idx}
                    className={`px-2 py-1 rounded border font-semibold ${
                      isRhp
                        ? 'bg-rose-50 border-rose-200 text-rose-700'
                        : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  >
                    s{idx + 1} = {p.real >= 0 ? '+' : ''}
                    {p.real} {p.imag !== 0 ? `${p.imag >= 0 ? '+ ' : '- '}${Math.abs(p.imag)}j` : ''}
                    {isRhp && ' (发散)'}
                  </span>
                );
              })}
            </div>
            <p className="text-2xs text-slate-400 mt-2">
              💡 交互提示：按住鼠标拖拽红色的 ✕ 极点，即可即时在复平面移动极点位置并改变系统物理动态。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
