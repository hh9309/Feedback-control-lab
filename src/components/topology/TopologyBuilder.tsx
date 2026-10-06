import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Check,
  Cpu,
  GitCommit,
  Info,
  Maximize2,
  Play,
  RotateCcw,
  Sliders,
  Sparkles,
  Zap,
} from 'lucide-react';
import {
  FeedbackMode,
  PidParameters,
  SimulationPoint,
  TransferFunctionModel,
} from '../../types/control';
import { formatPolynomial } from '../../services/controlMath';

interface TopologyBuilderProps {
  plant: TransferFunctionModel;
  setPlant: React.Dispatch<React.SetStateAction<TransferFunctionModel>>;
  controller: TransferFunctionModel;
  setController: React.Dispatch<React.SetStateAction<TransferFunctionModel>>;
  feedbackMode: FeedbackMode;
  setFeedbackMode: (mode: FeedbackMode) => void;
  pidParams: PidParameters;
  setPidParams: React.Dispatch<React.SetStateAction<PidParameters>>;
  feedbackGain: number;
  setFeedbackGain: (gain: number) => void;
  disturbanceMag: number;
  setDisturbanceMag: (d: number) => void;
  lastSimPoint?: SimulationPoint;
}

export const TopologyBuilder: React.FC<TopologyBuilderProps> = ({
  plant,
  setPlant,
  controller,
  setController,
  feedbackMode,
  setFeedbackMode,
  pidParams,
  setPidParams,
  feedbackGain,
  setFeedbackGain,
  disturbanceMag,
  setDisturbanceMag,
  lastSimPoint,
}) => {
  const [selectedBlock, setSelectedBlock] = useState<
    'input' | 'comparator' | 'controller' | 'plant' | 'disturbance' | 'feedback' | 'output'
  >('plant');

  const isPositive = feedbackMode === 'positive';
  const signalColor = isPositive ? '#f43f5e' : '#0284c7';

  return (
    <div className="space-y-6">
      {/* Sliced Header */}
      <div className="p-6 rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-1">
              <span>交互式闭环架构</span>
              <span>·</span>
              <span>可视化信号流向拓扑</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              系统拓扑构建器 (Topology Builder)
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              点击画布中的任一功能环节（输入、比较器、控制器、受控对象、扰动、反馈），可实时配置参数与反馈极性。
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setFeedbackMode(isPositive ? 'negative' : 'positive')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all flex items-center gap-2 ${
                isPositive
                  ? 'bg-rose-50 border-rose-300 text-rose-700'
                  : 'bg-emerald-50 border-emerald-300 text-emerald-800'
              }`}
            >
              <span>比较器符号:</span>
              <span className="font-mono text-sm font-bold">
                {isPositive ? 'Σ (+)' : 'Σ (-)'}
              </span>
              <span className="text-2xs text-slate-500 underline ml-1">点击切换</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Canvas & Inspector Slice Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Topology Interactive SVG Canvas (2 cols) */}
        <div className="lg:col-span-2 p-6 rounded-xl border border-slate-200 bg-white relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-4 pb-2 border-b border-slate-100">
            <span className="font-medium text-slate-700">实时闭环拓扑与动态信号流</span>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5">
                <span
                  className="w-2.5 h-2.5 rounded-full inline-block"
                  style={{ backgroundColor: signalColor }}
                />
                <span className="text-2xs">
                  {isPositive ? '正反馈发散流' : '负反馈稳态流'}
                </span>
              </span>
            </div>
          </div>

          {/* SVG Diagram Canvas */}
          <div className="w-full overflow-x-auto py-2">
            <svg
              viewBox="0 0 760 320"
              className="w-full min-w-[700px] h-auto select-none"
            >
              <defs>
                <marker
                  id="topo-arrow"
                  viewBox="0 0 10 10"
                  refX="6"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 8 5 L 0 9 z" fill="#64748b" />
                </marker>
                <marker
                  id="topo-arrow-colored"
                  viewBox="0 0 10 10"
                  refX="6"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 8 5 L 0 9 z" fill={signalColor} />
                </marker>
              </defs>

              {/* Grid Background Dots */}
              <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                <circle cx="2" cy="2" r="1" fill="#f1f5f9" />
              </pattern>
              <rect width="760" height="320" fill="url(#grid)" rx="8" />

              {/* 1. Forward Path Lines */}
              {/* Reference Input -> Comparator */}
              <line
                x1="40"
                y1="100"
                x2="100"
                y2="100"
                stroke="#64748b"
                strokeWidth="2.5"
                markerEnd="url(#topo-arrow)"
              />
              <text x="50" y="90" fontSize="11" fill="#475569" fontWeight="600">
                r(t) = 1.0
              </text>

              {/* Comparator -> Controller */}
              <line
                x1="130"
                y1="100"
                x2="200"
                y2="100"
                stroke={signalColor}
                strokeWidth="2.5"
                markerEnd="url(#topo-arrow-colored)"
              />
              <text x="145" y="90" fontSize="11" fill="#475569" fontWeight="600">
                e(t) = {lastSimPoint ? lastSimPoint.e.toFixed(2) : '1.00'}
              </text>

              {/* Controller -> Summing with Disturbance */}
              <line
                x1="310"
                y1="100"
                x2="370"
                y2="100"
                stroke={signalColor}
                strokeWidth="2.5"
                markerEnd="url(#topo-arrow-colored)"
              />
              <text x="325" y="90" fontSize="11" fill="#475569" fontWeight="600">
                u(t)
              </text>

              {/* Disturbance Input from Top */}
              <line
                x1="390"
                y1="30"
                x2="390"
                y2="80"
                stroke="#d97706"
                strokeWidth="2.5"
                markerEnd="url(#topo-arrow)"
              />
              <text x="400" y="55" fontSize="11" fill="#b45309" fontWeight="600">
                d(t) 扰动
              </text>

              {/* Summing -> Plant */}
              <line
                x1="410"
                y1="100"
                x2="460"
                y2="100"
                stroke={signalColor}
                strokeWidth="2.5"
                markerEnd="url(#topo-arrow-colored)"
              />

              {/* Plant -> Output */}
              <line
                x1="580"
                y1="100"
                x2="700"
                y2="100"
                stroke={signalColor}
                strokeWidth="2.5"
                markerEnd="url(#topo-arrow-colored)"
              />
              <text x="660" y="90" fontSize="12" fill="#0f172a" fontWeight="bold">
                y(t) 输出
              </text>

              {/* 2. Feedback Path Lines */}
              <circle cx="630" cy="100" r="4" fill="#0f172a" />
              <line x1="630" y1="100" x2="630" y2="230" stroke="#64748b" strokeWidth="2.5" />
              <line
                x1="630"
                y1="230"
                x2="530"
                y2="230"
                stroke="#64748b"
                strokeWidth="2.5"
                markerEnd="url(#topo-arrow)"
              />

              {/* Feedback Block -> back to Comparator */}
              <line
                x1="410"
                y1="230"
                x2="115"
                y2="230"
                stroke="#64748b"
                strokeWidth="2.5"
              />
              <line
                x1="115"
                y1="230"
                x2="115"
                y2="120"
                stroke="#64748b"
                strokeWidth="2.5"
                markerEnd="url(#topo-arrow)"
              />
              <text x="125" y="210" fontSize="11" fill="#64748b" fontWeight="600">
                b(t) 反馈量
              </text>

              {/* Animated pulses on lines */}
              <circle cx="70" cy="100" r="3.5" fill="#0284c7">
                <animate
                  attributeName="cx"
                  values="40;100"
                  dur="1.5s"
                  repeatCount="indefinite"
                />
              </circle>
              <circle cx="160" cy="100" r="3.5" fill={signalColor}>
                <animate
                  attributeName="cx"
                  values="130;200"
                  dur="1.2s"
                  repeatCount="indefinite"
                />
              </circle>
              <circle cx="340" cy="100" r="3.5" fill={signalColor}>
                <animate
                  attributeName="cx"
                  values="310;370"
                  dur="1.2s"
                  repeatCount="indefinite"
                />
              </circle>
              <circle cx="500" cy="230" r="3.5" fill="#64748b">
                <animate
                  attributeName="cx"
                  values="630;115"
                  dur="2.5s"
                  repeatCount="indefinite"
                />
              </circle>

              {/* 3. Interactive Blocks */}

              {/* Input Node R(s) */}
              <g
                onClick={() => setSelectedBlock('input')}
                className="cursor-pointer transition-all"
              >
                <rect
                  x="15"
                  y="75"
                  width="45"
                  height="50"
                  rx="6"
                  fill={selectedBlock === 'input' ? '#e2e8f0' : '#ffffff'}
                  stroke={selectedBlock === 'input' ? '#0f172a' : '#cbd5e1'}
                  strokeWidth="2"
                />
                <text x="37" y="105" fontSize="12" fontWeight="bold" textAnchor="middle" fill="#0f172a">
                  R(s)
                </text>
              </g>

              {/* Comparator Σ */}
              <g
                onClick={() => setSelectedBlock('comparator')}
                className="cursor-pointer transition-all"
              >
                <circle
                  cx="115"
                  cy="100"
                  r="22"
                  fill={selectedBlock === 'comparator' ? '#f1f5f9' : '#ffffff'}
                  stroke={isPositive ? '#e11d48' : '#0284c7'}
                  strokeWidth="2.5"
                />
                <line x1="105" y1="90" x2="125" y2="110" stroke="#cbd5e1" strokeWidth="1" />
                <line x1="105" y1="110" x2="125" y2="90" stroke="#cbd5e1" strokeWidth="1" />
                <text x="100" y="96" fontSize="12" fontWeight="bold" fill="#0f172a">
                  +
                </text>
                <text
                  x="110"
                  y="118"
                  fontSize="14"
                  fontWeight="bold"
                  fill={isPositive ? '#e11d48' : '#0284c7'}
                >
                  {isPositive ? '+' : '-'}
                </text>
              </g>

              {/* Controller Block C(s) */}
              <g
                onClick={() => setSelectedBlock('controller')}
                className="cursor-pointer transition-all"
              >
                <rect
                  x="200"
                  y="70"
                  width="110"
                  height="60"
                  rx="8"
                  fill={selectedBlock === 'controller' ? '#f8fafc' : '#ffffff'}
                  stroke={selectedBlock === 'controller' ? '#0f172a' : '#94a3b8'}
                  strokeWidth="2"
                />
                <text x="255" y="94" fontSize="12" fontWeight="bold" textAnchor="middle" fill="#0f172a">
                  控制器 C(s)
                </text>
                <text x="255" y="114" fontSize="10" fontFamily="monospace" textAnchor="middle" fill="#64748b">
                  PID (Kp={pidParams.kp})
                </text>
              </g>

              {/* Disturbance Summing Junction */}
              <g
                onClick={() => setSelectedBlock('disturbance')}
                className="cursor-pointer transition-all"
              >
                <circle
                  cx="390"
                  cy="100"
                  r="16"
                  fill={selectedBlock === 'disturbance' ? '#fef3c7' : '#ffffff'}
                  stroke="#d97706"
                  strokeWidth="2"
                />
                <text x="390" y="105" fontSize="14" fontWeight="bold" textAnchor="middle" fill="#b45309">
                  +
                </text>
              </g>

              {/* Plant Block G(s) */}
              <g
                onClick={() => setSelectedBlock('plant')}
                className="cursor-pointer transition-all"
              >
                <rect
                  x="460"
                  y="65"
                  width="120"
                  height="70"
                  rx="8"
                  fill={selectedBlock === 'plant' ? '#f8fafc' : '#ffffff'}
                  stroke={selectedBlock === 'plant' ? '#0f172a' : '#0284c7'}
                  strokeWidth="2"
                />
                <text x="520" y="92" fontSize="12" fontWeight="bold" textAnchor="middle" fill="#0f172a">
                  受控对象 G(s)
                </text>
                <text x="520" y="112" fontSize="9" fontFamily="monospace" textAnchor="middle" fill="#64748b">
                  {formatPolynomial(plant.numerator)} / {formatPolynomial(plant.denominator)}
                </text>
                {plant.delay > 0 && (
                  <text x="520" y="125" fontSize="8" fontFamily="monospace" textAnchor="middle" fill="#d97706">
                    e^(-{plant.delay}s) 纯迟延
                  </text>
                )}
              </g>

              {/* Feedback Block H(s) */}
              <g
                onClick={() => setSelectedBlock('feedback')}
                className="cursor-pointer transition-all"
              >
                <rect
                  x="410"
                  y="200"
                  width="120"
                  height="60"
                  rx="8"
                  fill={selectedBlock === 'feedback' ? '#f8fafc' : '#ffffff'}
                  stroke={selectedBlock === 'feedback' ? '#0f172a' : '#94a3b8'}
                  strokeWidth="2"
                />
                <text x="470" y="225" fontSize="12" fontWeight="bold" textAnchor="middle" fill="#0f172a">
                  反馈环节 H(s)
                </text>
                <text x="470" y="245" fontSize="10" fontFamily="monospace" textAnchor="middle" fill="#64748b">
                  增益 K_h = {feedbackGain}
                </text>
              </g>

              {/* Output Label */}
              <g
                onClick={() => setSelectedBlock('output')}
                className="cursor-pointer transition-all"
              >
                <rect
                  x="700"
                  y="75"
                  width="45"
                  height="50"
                  rx="6"
                  fill={selectedBlock === 'output' ? '#e2e8f0' : '#ffffff'}
                  stroke={selectedBlock === 'output' ? '#0f172a' : '#cbd5e1'}
                  strokeWidth="2"
                />
                <text x="722" y="105" fontSize="12" fontWeight="bold" textAnchor="middle" fill="#0f172a">
                  Y(s)
                </text>
              </g>
            </svg>
          </div>

          <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
            <span>💡 提示：点击画布中的任意环节，即可在右侧属性切片直接修改参数</span>
            <span className="font-mono text-2xs">SISO 闭环标准回路</span>
          </div>
        </div>

        {/* Block Inspector Tray Slice (1 col) */}
        <div className="p-6 rounded-xl border border-slate-200 bg-white space-y-5">
          <div className="border-b border-slate-100 pb-3">
            <span className="text-2xs font-semibold text-slate-500">属性配置切片</span>
            <h3 className="text-base font-bold text-slate-900 mt-0.5">
              {selectedBlock === 'plant' && '受控对象 G(s) 属性'}
              {selectedBlock === 'comparator' && '比较器与反馈极性'}
              {selectedBlock === 'controller' && '控制器 C(s) 参数'}
              {selectedBlock === 'feedback' && '反馈传感器通道 H(s)'}
              {selectedBlock === 'disturbance' && '外加扰动源 D(s)'}
              {selectedBlock === 'input' && '参考输入信号 R(s)'}
              {selectedBlock === 'output' && '输出信号测量 Y(s)'}
            </h3>
          </div>

          {/* Plant Block Inspector */}
          {selectedBlock === 'plant' && (
            <div className="space-y-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 font-mono text-center">
                G(s) = {formatPolynomial(plant.numerator)} / [{formatPolynomial(plant.denominator)}]
                {plant.delay > 0 && ` · e^(-${plant.delay}s)`}
              </div>

              <div>
                <label className="text-slate-700 font-medium block mb-1">预设对象类型:</label>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={() =>
                      setPlant({
                        numerator: [1],
                        denominator: [1, 2, 1], // (s+1)^2
                        delay: 0,
                        gain: 1,
                      })
                    }
                    className="p-2 text-left rounded border border-slate-200 hover:bg-slate-50 text-slate-700 text-2xs"
                  >
                    标准二阶 1/(s²+2s+1)
                  </button>
                  <button
                    onClick={() =>
                      setPlant({
                        numerator: [1],
                        denominator: [1, 1], // 1/(s+1)
                        delay: 0,
                        gain: 1,
                      })
                    }
                    className="p-2 text-left rounded border border-slate-200 hover:bg-slate-50 text-slate-700 text-2xs"
                  >
                    一阶惯性 1/(s+1)
                  </button>
                  <button
                    onClick={() =>
                      setPlant({
                        numerator: [1],
                        denominator: [1, 0.4, 4], // 谐振
                        delay: 0,
                        gain: 1,
                      })
                    }
                    className="p-2 text-left rounded border border-slate-200 hover:bg-slate-50 text-slate-700 text-2xs"
                  >
                    欠阻尼振荡 1/(s²+0.4s+4)
                  </button>
                  <button
                    onClick={() =>
                      setPlant({
                        numerator: [1],
                        denominator: [1, 1],
                        delay: 0.5,
                        gain: 1,
                      })
                    }
                    className="p-2 text-left rounded border border-slate-200 hover:bg-slate-50 text-slate-700 text-2xs"
                  >
                    大纯迟延 e^(-0.5s)/(s+1)
                  </button>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center text-slate-700 font-medium mb-1">
                  <span>纯迟延时间 (Delay τ):</span>
                  <span className="font-mono text-slate-900 font-bold">{plant.delay} s</span>
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
              </div>
            </div>
          )}

          {/* Comparator Inspector */}
          {selectedBlock === 'comparator' && (
            <div className="space-y-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-slate-700 space-y-2">
                <div className="font-medium">当前反馈方式:</div>
                <div className="font-mono font-bold text-sm text-slate-900">
                  {isPositive ? '正反馈 (Positive: e = r + b)' : '负反馈 (Negative: e = r - b)'}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setFeedbackMode('negative')}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    !isPositive
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-semibold shadow-xs'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <div className="font-bold text-xs">负反馈 (-)</div>
                  <div className="text-2xs text-slate-500 mt-1">
                    系统抵抗偏差，趋向稳定收敛
                  </div>
                </button>
                <button
                  onClick={() => setFeedbackMode('positive')}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    isPositive
                      ? 'bg-rose-50 border-rose-300 text-rose-900 font-semibold shadow-xs'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <div className="font-bold text-xs text-rose-700">正反馈 (+)</div>
                  <div className="text-2xs text-slate-500 mt-1">
                    偏差自我加倍放大，引发雪崩
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Controller Inspector */}
          {selectedBlock === 'controller' && (
            <div className="space-y-3 text-xs">
              <div>
                <div className="flex justify-between items-center text-slate-700 font-medium mb-1">
                  <span>比例增益 Kp:</span>
                  <span className="font-mono font-bold text-slate-900">{pidParams.kp}</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="10"
                  step="0.1"
                  value={pidParams.kp}
                  onChange={(e) =>
                    setPidParams((prev) => ({ ...prev, kp: parseFloat(e.target.value) }))
                  }
                  className="w-full accent-slate-900 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between items-center text-slate-700 font-medium mb-1">
                  <span>积分系数 Ki:</span>
                  <span className="font-mono font-bold text-slate-900">{pidParams.ki}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="5"
                  step="0.1"
                  value={pidParams.ki}
                  onChange={(e) =>
                    setPidParams((prev) => ({ ...prev, ki: parseFloat(e.target.value) }))
                  }
                  className="w-full accent-slate-900 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between items-center text-slate-700 font-medium mb-1">
                  <span>微分系数 Kd:</span>
                  <span className="font-mono font-bold text-slate-900">{pidParams.kd}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="3"
                  step="0.05"
                  value={pidParams.kd}
                  onChange={(e) =>
                    setPidParams((prev) => ({ ...prev, kd: parseFloat(e.target.value) }))
                  }
                  className="w-full accent-slate-900 cursor-pointer"
                />
              </div>
            </div>
          )}

          {/* Disturbance Inspector */}
          {selectedBlock === 'disturbance' && (
            <div className="space-y-4 text-xs">
              <div>
                <div className="flex justify-between items-center text-slate-700 font-medium mb-1">
                  <span>阶跃扰动幅度 d(t):</span>
                  <span className="font-mono font-bold text-slate-900">{disturbanceMag}</span>
                </div>
                <input
                  type="range"
                  min="-2"
                  max="2"
                  step="0.1"
                  value={disturbanceMag}
                  onChange={(e) => setDisturbanceMag(parseFloat(e.target.value))}
                  className="w-full accent-slate-900 cursor-pointer"
                />
                <div className="flex justify-between text-2xs text-slate-600 mt-1 font-mono">
                  <span>-2.0 (强负扰动)</span>
                  <span>0.0 (无扰动)</span>
                  <span>+2.0 (强正扰动)</span>
                </div>
              </div>
              <p className="text-2xs text-slate-500">
                扰动信号将在仿真时刻 $t=5.0s$ 瞬间注入被控对象输入端，检验负反馈环路抵消外界冲击的鲁棒性。
              </p>
            </div>
          )}

          {/* Feedback Block Inspector */}
          {selectedBlock === 'feedback' && (
            <div className="space-y-4 text-xs">
              <div>
                <div className="flex justify-between items-center text-slate-700 font-medium mb-1">
                  <span>反馈通路增益 K_h:</span>
                  <span className="font-mono font-bold text-slate-900">{feedbackGain}</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="2.5"
                  step="0.05"
                  value={feedbackGain}
                  onChange={(e) => setFeedbackGain(parseFloat(e.target.value))}
                  className="w-full accent-slate-900 cursor-pointer"
                />
              </div>
              <p className="text-2xs text-slate-500">
                默认单位反馈 $H(s) = 1.0$。调整此参数相当于改变反馈传感器灵敏度或衰减系数。
              </p>
            </div>
          )}

          {/* Input & Output Info */}
          {(selectedBlock === 'input' || selectedBlock === 'output') && (
            <div className="space-y-2 text-xs text-slate-600">
              <p>
                <strong>{selectedBlock === 'input' ? '参考输入通道' : '被控变量输出端'}</strong>
              </p>
              <p className="text-2xs leading-relaxed">
                当前设定基准信号 $r(t) = 1.0$ 阶跃信号。可在时域实验室 (Time-Domain Lab) 切换为冲激、斜坡或方波信号进行全工况测试。
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
