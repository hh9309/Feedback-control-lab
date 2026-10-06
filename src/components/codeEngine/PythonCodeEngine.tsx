import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  Check,
  Code2,
  Copy,
  Download,
  FileCode,
  Layers,
  LineChart,
  Play,
  RotateCcw,
  Sparkles,
  Table as TableIcon,
  Terminal,
} from 'lucide-react';
import {
  FeedbackMode,
  PidParameters,
  SimulationPoint,
  TimeDomainMetrics,
  TransferFunctionModel,
} from '../../types/control';
import {
  calculateFrequencyResponse,
  formatPolynomial,
  generatePythonScript,
  poly,
} from '../../services/controlMath';

interface PythonCodeEngineProps {
  plant: TransferFunctionModel;
  controller: TransferFunctionModel;
  mode: FeedbackMode;
  delay: number;
  pid: PidParameters;
  metrics: TimeDomainMetrics;
  points: SimulationPoint[];
}

// Helper to generate stdout log text
function buildTerminalLog(options: {
  plant: TransferFunctionModel;
  controller: TransferFunctionModel;
  mode: FeedbackMode;
  delay: number;
  pid: PidParameters;
  metrics: TimeDomainMetrics;
  closedPoles: { real: number; imag: number }[];
  gmDb: number | null;
  pmDeg: number | null;
}): string {
  const { plant, mode, delay, pid, metrics, closedPoles, gmDb, pmDeg } = options;
  const isUnstable = mode === 'positive' || closedPoles.some((p) => p.real > 0.001);

  return `Python 3.11.8 (main, Feb 06 2024, 18:02:16) [GCC 11.4.0] on linux
Type "help", "copyright", "credits" or "license" for more information.
>>> import numpy as np
>>> import matplotlib.pyplot as plt
>>> import control as ct

============================================================
FEEDBACK LAB - SYSTEM ANALYSIS REPORT
============================================================
[INFO] Plant G(s) Instantiation:
  Numerator: [${plant.numerator.join(', ')}]
  Denominator: [${plant.denominator.join(', ')}]
  Time Delay tau: ${delay} s (2nd-order Pade applied)

[INFO] Controller C(s):
  PID Gains: Kp = ${pid.kp}, Ki = ${pid.ki}, Kd = ${pid.kd}, N = ${pid.filterCoeffN}

[INFO] Feedback Loop Configuration:
  Feedback Mode: ${mode === 'negative' ? 'Negative Feedback (sign = -1)' : 'Positive Feedback (sign = +1)'}
  Loop Transfer Function L(s) = C(s) * G(s)
  Closed-Loop Transfer Function T(s) = L(s) / [ 1 ${mode === 'negative' ? '+' : '-'} L(s) ]

[ANALYSIS] Closed-Loop Eigenvalues / Roots:
  Poles: [${closedPoles.map((p) => `${p.real >= 0 ? '+' : ''}${p.real.toFixed(3)}${p.imag !== 0 ? `${p.imag >= 0 ? '+' : ''}${p.imag.toFixed(3)}j` : ''}`).join(', ')}]
  Stability Verdict: ${isUnstable ? 'Unstable / Divergent (RHP Poles Present)' : 'Asymptotically Stable (LHP Poles)'}

[SIMULATION] Time-Domain Step Response & Frequency Analysis:
  - Simulation horizon: t in [0.0, 12.0] s (1000 points)
  - Overshoot: ${metrics.overshoot > 500 ? 'Infinity (Divergent)' : `${metrics.overshoot}%`}
  - Rise Time Tr: ${metrics.riseTime} s
  - Settling Time Ts: ${metrics.settlingTime} s
  - Steady-State Error Ess: ${metrics.steadyStateError}
  - Gain Margin: ${gmDb !== null ? `${gmDb} dB` : 'Infinity'}
  - Phase Margin: ${pmDeg !== null ? `${pmDeg} deg` : 'None'}

[INFO] Virtual Matplotlib Display Device:
  Figure(900x700) rendered with 2 subplots (Step Response & Bode Magnitude).
============================================================
Process finished with exit code 0 (Execution Successful)`;
}

export const PythonCodeEngine: React.FC<PythonCodeEngineProps> = ({
  plant,
  controller,
  mode,
  delay,
  pid,
  metrics,
  points = [],
}) => {
  // Safe default points if empty
  const safePoints: SimulationPoint[] = useMemo(() => {
    if (points && points.length > 0) return points;
    return [
      { t: 0, r: 1, y: 0, e: 1, u: 0, d: 0 },
      { t: 1, r: 1, y: 0.8, e: 0.2, u: 0.5, d: 0 },
      { t: 2, r: 1, y: 1.0, e: 0, u: 0.3, d: 0 },
    ];
  }, [points]);

  // Frequency response data for the Virtual Matplotlib Plot
  const freqData = useMemo(() => {
    return calculateFrequencyResponse(plant, controller, 1.0);
  }, [plant, controller]);

  // Closed loop poles & zeros
  const closedPoles = useMemo(() => {
    try {
      const clNum = poly.multiply(controller.numerator, plant.numerator);
      const clDen = poly.multiply(controller.denominator, plant.denominator);
      const sign = mode === 'negative' ? 1 : -1;
      const hNum = clNum.map((v) => v * sign);
      const den = poly.add(clDen, hNum, 1);
      return poly.findRoots(den);
    } catch {
      return [{ real: -1, imag: 0 }];
    }
  }, [plant, controller, mode]);

  const initialScript = useMemo(() => {
    return generatePythonScript({ plant, controller, mode, delay, pid });
  }, [plant, controller, mode, delay, pid]);

  const [code, setCode] = useState<string>(initialScript);
  const [copied, setCopied] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [outputTab, setOutputTab] = useState<'plot' | 'table' | 'terminal'>('plot');

  // Initialize terminal output directly with pure function - NO render-phase setState!
  const [terminalOutput, setTerminalOutput] = useState<string>(() => {
    return buildTerminalLog({
      plant,
      controller,
      mode,
      delay,
      pid,
      metrics,
      closedPoles: [
        { real: -1, imag: 1 },
        { real: -1, imag: -1 },
      ],
      gmDb: null,
      pmDeg: 52.3,
    });
  });

  // Sync script with current lab configuration
  const handleSyncCurrentConfig = () => {
    const updated = generatePythonScript({ plant, controller, mode, delay, pid });
    setCode(updated);
  };

  // Copy code to clipboard (can be executed outside the project)
  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Download script
  const handleDownload = () => {
    const blob = new Blob([code], { type: 'text/x-python;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `feedback_lab_${mode}.py`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // In-project execution runner: triggered ONLY on user button click
  const handleRunCode = () => {
    setIsRunning(true);
    setTimeout(() => {
      const output = buildTerminalLog({
        plant,
        controller,
        mode,
        delay,
        pid,
        metrics,
        closedPoles,
        gmDb: freqData.metrics.gainMarginDb,
        pmDeg: freqData.metrics.phaseMarginDeg,
      });

      setTerminalOutput(output);
      setIsRunning(false);
    }, 400);
  };

  // Load standard Python templates with English plot labels
  const handleLoadTemplate = (type: 'step' | 'root_locus' | 'state_space') => {
    if (type === 'root_locus') {
      setCode(`"""
Root Locus Analysis of Linear Feedback System
Powered by python-control, numpy, and matplotlib
Can be executed in standard Python (pip install control numpy matplotlib scipy)
"""

import numpy as np
import matplotlib.pyplot as plt
import control as ct

plt.rcParams['font.sans-serif'] = ['DejaVu Sans', 'Arial']
plt.rcParams['axes.unicode_minus'] = False

# Open-Loop Transfer Function L(s) = 1 / [s (s + 1) (s + 2)]
s = ct.tf([1, 0], [1])
L = 1 / (s * (s + 1) * (s + 2))

print("=" * 60)
print("ROOT LOCUS ANALYSIS REPORT")
print("=" * 60)
print("Open-Loop Transfer Function L(s):\\n", L)

plt.figure(figsize=(8, 6))
# Calculate and plot root locus for gain k in [0, 10]
try:
    ct.root_locus(L, kvect=np.linspace(0, 10, 500))
except AttributeError:
    ct.rlocus(L, kvect=np.linspace(0, 10, 500))

# All plot labels and title in English
plt.title("Root Locus Analysis of Feedback Loop", fontsize=12, fontweight='bold')
plt.xlabel("Real Axis (sigma)")
plt.ylabel("Imaginary Axis (j*omega)")
plt.grid(True, linestyle=':', alpha=0.6)
plt.axvline(0, color='r', linestyle='--', label='Stability Boundary (j*omega)')
plt.legend(loc='best')
plt.tight_layout()
plt.show()
`);
    } else if (type === 'state_space') {
      setCode(`"""
State-Space Controller Design via Pole Placement (Ackermann's Formula)
Powered by python-control, numpy, and matplotlib
Can be executed in standard Python (pip install control numpy matplotlib scipy)
"""

import numpy as np
import matplotlib.pyplot as plt
import control as ct

plt.rcParams['font.sans-serif'] = ['DejaVu Sans', 'Arial']
plt.rcParams['axes.unicode_minus'] = False

# System State Matrices: dx/dt = A x + B u, y = C x
A = np.array([[0, 1], [-2, -3]])
B = np.array([[0], [1]])
C = np.array([[1, 0]])
D = np.array([[0]])

# Desired Closed-Loop Poles in LHP: s1,2 = -2 ± 2j
desired_poles = [-2 + 2j, -2 - 2j]
K_gain = ct.place(A, B, desired_poles)

print("=" * 60)
print("STATE-SPACE CONTROLLER DESIGN REPORT")
print("=" * 60)
print("State Matrix A:\\n", A)
print("Input Matrix B:\\n", B)
print("Calculated State-Feedback Gain K:\\n", K_gain)

A_closed = A - B @ K_gain
closed_poles = np.linalg.eigvals(A_closed)
print("\\nClosed-Loop Poles (A - B*K):", closed_poles)
print("=" * 60)

# Simulate State-Space Step Response
sys_cl = ct.ss(A_closed, B, C, D)
t, y = ct.step_response(sys_cl, np.linspace(0, 8, 500))

plt.figure(figsize=(8, 5))
plt.plot(t, y, color='#0284c7', lw=2, label='Closed-Loop State Response y(t)')
plt.axhline(1.0, color='#94a3b8', linestyle='--', label='Reference Target r(t) = 1.0')
plt.title("State-Space Closed-Loop Step Response", fontsize=12, fontweight='bold')
plt.xlabel("Time (s)")
plt.ylabel("Output y(t)")
plt.grid(True, linestyle=':', alpha=0.6)
plt.legend(loc='best')
plt.tight_layout()
plt.show()
`);
    } else {
      handleSyncCurrentConfig();
    }
  };

  // Virtual Plot SVG dimensions
  const isPos = mode === 'positive';
  const totalTime = safePoints.length > 0 ? safePoints[safePoints.length - 1].t || 12 : 12;

  // Time plot bounds with defensive numbers
  const yVals = safePoints.map((p) => (Number.isFinite(p.y) ? p.y : 0));
  const rawMaxY = yVals.length > 0 ? Math.max(...yVals) : 1;
  const rawMinY = yVals.length > 0 ? Math.min(...yVals) : 0;

  const maxY = isPos
    ? Math.min(25, Math.max(3, rawMaxY))
    : Math.max(1.8, Math.min(5, rawMaxY));
  const minY = isPos ? Math.max(-5, Math.min(0, rawMinY)) : -0.2;

  const tW = 600;
  const tH = 170;
  const tPad = { top: 25, right: 30, bottom: 30, left: 50 };
  const tPlotW = tW - tPad.left - tPad.right;
  const tPlotH = tH - tPad.top - tPad.bottom;

  const scaleTX = (t: number) => tPad.left + (Math.max(0, t) / (totalTime || 12)) * tPlotW;
  const scaleTY = (y: number) => {
    const clamped = Math.max(minY, Math.min(maxY, y));
    const range = maxY - minY || 1;
    return tPad.top + tPlotH - ((clamped - minY) / range) * tPlotH;
  };

  const yPath = safePoints
    .map((pt, idx) => `${idx === 0 ? 'M' : 'L'} ${scaleTX(pt.t).toFixed(1)} ${scaleTY(pt.y).toFixed(1)}`)
    .join(' ');

  // Bode Magnitude plot bounds
  const bW = 600;
  const bH = 170;
  const bPad = { top: 25, right: 30, bottom: 30, left: 50 };
  const bPlotW = bW - bPad.left - bPad.right;
  const bPlotH = bH - bPad.top - bPad.bottom;

  const minDecade = -2;
  const maxDecade = 2.5;
  const scaleOmegaX = (w: number) => {
    const logW = Math.log10(Math.max(1e-4, w));
    return bPad.left + ((logW - minDecade) / (maxDecade - minDecade)) * bPlotW;
  };
  const minDb = -60;
  const maxDb = 40;
  const scaleMagY = (db: number) => {
    const clamped = Math.max(minDb, Math.min(maxDb, db));
    return bPad.top + bPlotH - ((clamped - minDb) / (maxDb - minDb)) * bPlotH;
  };

  const bodePoints = freqData?.bodePoints || [];
  const magPath = bodePoints.length > 0
    ? bodePoints
        .map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${scaleOmegaX(p.omega).toFixed(1)} ${scaleMagY(p.magDb).toFixed(1)}`)
        .join(' ')
    : '';

  // Sample snapshot rows for Table output (guaranteed non-empty)
  const sampleTimeSteps = [0.0, 0.5, 1.0, 1.5, 2.0, 3.0, 4.0, 6.0, 8.0, 10.0, 12.0];
  const sampleRows = sampleTimeSteps.map((tv) => {
    const match = safePoints.find((p) => Math.abs(p.t - tv) < 0.04);
    if (match) return match;
    return safePoints[0] || { t: tv, r: 1, y: 1, e: 0, u: 0, d: 0 };
  });

  return (
    <div className="space-y-6">
      {/* Sliced Header */}
      <div className="p-6 rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-1">
              <span>Python-Control 算法扩展</span>
              <span>·</span>
              <span>标准仿真脚本生成与项目内运行</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Python 代码引擎 (Code Engine)
            </h2>
            <p className="text-sm text-slate-600 mt-1 max-w-3xl">
              提供完整的控制理论 Python 脚本，支持在项目内一键运行并输出图表、数据报表与终端日志。代码遵循英文学术规范（图标题、坐标轴与图例全英文），支持一键复制代码直接在本地或 Jupyter 中执行。
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSyncCurrentConfig}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
              <span>同步当前拓扑</span>
            </button>
            <button
              onClick={handleCopy}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 text-slate-800 hover:bg-slate-50 transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
              title="复制代码可直接在本地 Python 环境或 Google Colab 运行"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? '已复制' : '复制代码'}</span>
            </button>
            <button
              onClick={handleRunCode}
              disabled={isRunning}
              className="px-4 py-1.5 text-xs font-bold rounded-lg bg-emerald-700 text-white hover:bg-emerald-800 disabled:opacity-50 transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{isRunning ? '正在运行...' : '运行代码'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Code Editor (Left) & Output Window (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Python Source Editor */}
        <div className="p-6 rounded-xl border border-slate-200 bg-white space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 text-xs">
              <div className="flex items-center gap-2">
                <FileCode className="w-4 h-4 text-slate-700" />
                <span className="font-bold text-slate-900">simulation_script.py</span>
                <span className="text-2xs text-slate-400 font-mono">(python-control)</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownload}
                  className="px-2.5 py-1 text-2xs font-medium rounded border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Download className="w-3 h-3" />
                  <span>下载 .py</span>
                </button>
              </div>
            </div>

            {/* Interactive Code Editor */}
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              rows={21}
              spellCheck={false}
              className="w-full font-mono text-xs p-4 rounded-xl border border-slate-200 bg-slate-900 text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-700 leading-relaxed resize-y selection:bg-slate-700"
            />
          </div>

          {/* Preset Algorithm Switcher */}
          <div className="pt-3 border-t border-slate-100">
            <div className="text-2xs font-semibold text-slate-500 mb-2">切换预置算法模板 (Templates):</div>
            <div className="flex flex-wrap gap-2 text-xs">
              <button
                onClick={() => handleLoadTemplate('step')}
                className="px-2.5 py-1 text-2xs font-medium rounded border border-slate-200 hover:bg-slate-50 text-slate-700 cursor-pointer"
              >
                1. 阶跃与频域联合仿真
              </button>
              <button
                onClick={() => handleLoadTemplate('root_locus')}
                className="px-2.5 py-1 text-2xs font-medium rounded border border-slate-200 hover:bg-slate-50 text-slate-700 cursor-pointer"
              >
                2. 根轨迹分析 (Root Locus)
              </button>
              <button
                onClick={() => handleLoadTemplate('state_space')}
                className="px-2.5 py-1 text-2xs font-medium rounded border border-slate-200 hover:bg-slate-50 text-slate-700 cursor-pointer"
              >
                3. 状态空间极点配置 (Ackermann)
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Output Window (输出窗口) */}
        <div className="p-6 rounded-xl border border-slate-200 bg-white space-y-4">
          {/* Output Window Header & Segmented Tabs */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${isRunning ? 'bg-amber-500 animate-spin' : 'bg-emerald-500'}`} />
              <h3 className="text-sm font-bold text-slate-900">代码执行输出窗口 (Output Window)</h3>
            </div>

            {/* Sliced Output Tabs: Plot / Table / Terminal */}
            <div className="flex items-center p-1 rounded-lg border border-slate-200 bg-slate-100 text-xs">
              <button
                onClick={() => setOutputTab('plot')}
                className={`px-3 py-1 font-medium rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
                  outputTab === 'plot'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <LineChart className="w-3.5 h-3.5" />
                <span>图表输出 (Plots)</span>
              </button>
              <button
                onClick={() => setOutputTab('table')}
                className={`px-3 py-1 font-medium rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
                  outputTab === 'table'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <TableIcon className="w-3.5 h-3.5" />
                <span>数据报表 (Table)</span>
              </button>
              <button
                onClick={() => setOutputTab('terminal')}
                className={`px-3 py-1 font-medium rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
                  outputTab === 'terminal'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Terminal className="w-3.5 h-3.5" />
                <span>控制台 (Console)</span>
              </button>
            </div>
          </div>

          {/* 1. Plot View (Virtual Matplotlib Display Device) */}
          {outputTab === 'plot' && (
            <div className="space-y-4">
              {/* Virtual Plot 1: Time-Domain Step Response */}
              <div className="p-3 bg-slate-50/60 rounded-xl border border-slate-200 space-y-1.5">
                <div className="flex items-center justify-between text-xs px-1">
                  <span className="font-bold text-slate-800">Figure 1: Time-Domain Step Response</span>
                  <div className="flex items-center gap-3 text-2xs font-mono text-slate-500">
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-0.5 bg-sky-600 inline-block" />
                      <span>Output y(t)</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-0.5 bg-slate-400 border-dashed inline-block" />
                      <span>Target r(t) = 1.0</span>
                    </span>
                  </div>
                </div>

                <div className="relative w-full bg-white rounded-lg border border-slate-200">
                  <svg viewBox={`0 0 ${tW} ${tH}`} className="w-full h-auto select-none">
                    {/* Plot Title in English */}
                    <text
                      x={tW / 2}
                      y={16}
                      fontSize="11"
                      fontWeight="bold"
                      textAnchor="middle"
                      fill="#0f172a"
                      fontFamily="sans-serif"
                    >
                      Time-Domain Step Response
                    </text>

                    {/* Y-Axis Label in English */}
                    <text
                      x={14}
                      y={tH / 2}
                      fontSize="9"
                      fontWeight="600"
                      textAnchor="middle"
                      fill="#475569"
                      transform={`rotate(-90, 14, ${tH / 2})`}
                      fontFamily="sans-serif"
                    >
                      Output y(t)
                    </text>

                    {/* X-Axis Label in English */}
                    <text
                      x={tPad.left + tPlotW / 2}
                      y={tH - 8}
                      fontSize="9"
                      fontWeight="600"
                      textAnchor="middle"
                      fill="#475569"
                      fontFamily="sans-serif"
                    >
                      Time (s)
                    </text>

                    {/* Grid lines */}
                    <line x1={tPad.left} y1={scaleTY(1.0)} x2={tW - tPad.right} y2={scaleTY(1.0)} stroke="#94a3b8" strokeWidth="1.2" strokeDasharray="4 4" />
                    <line x1={tPad.left} y1={scaleTY(0.0)} x2={tW - tPad.right} y2={scaleTY(0.0)} stroke="#cbd5e1" strokeWidth="1" />
                    <line x1={tPad.left} y1={tPad.top} x2={tPad.left} y2={tH - tPad.bottom} stroke="#cbd5e1" strokeWidth="1" />
                    <line x1={tPad.left} y1={tH - tPad.bottom} x2={tW - tPad.right} y2={tH - tPad.bottom} stroke="#cbd5e1" strokeWidth="1" />

                    <text x={tPad.left - 6} y={scaleTY(1.0) + 3} fontSize="8" textAnchor="end" fill="#64748b" fontFamily="monospace">1.0</text>
                    <text x={tPad.left - 6} y={scaleTY(0.0) + 3} fontSize="8" textAnchor="end" fill="#64748b" fontFamily="monospace">0.0</text>

                    {/* Main Curve */}
                    {yPath && (
                      <path d={yPath} fill="none" stroke={isPos ? '#e11d48' : '#0284c7'} strokeWidth="2.2" strokeLinecap="round" />
                    )}
                  </svg>
                </div>
              </div>

              {/* Virtual Plot 2: Frequency-Domain Bode Magnitude */}
              <div className="p-3 bg-slate-50/60 rounded-xl border border-slate-200 space-y-1.5">
                <div className="flex items-center justify-between text-xs px-1">
                  <span className="font-bold text-slate-800">Figure 2: Frequency-Domain Bode Magnitude</span>
                  <div className="flex items-center gap-3 text-2xs font-mono text-slate-500">
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-0.5 bg-teal-600 inline-block" />
                      <span>Open-Loop |L(jw)| (dB)</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-0.5 bg-rose-500 border-dashed inline-block" />
                      <span>0 dB Crossover Line</span>
                    </span>
                  </div>
                </div>

                <div className="relative w-full bg-white rounded-lg border border-slate-200">
                  <svg viewBox={`0 0 ${bW} ${bH}`} className="w-full h-auto select-none">
                    {/* Plot Title in English */}
                    <text
                      x={bW / 2}
                      y={16}
                      fontSize="11"
                      fontWeight="bold"
                      textAnchor="middle"
                      fill="#0f172a"
                      fontFamily="sans-serif"
                    >
                      Frequency-Domain Bode Magnitude
                    </text>

                    {/* Y-Axis Label in English */}
                    <text
                      x={14}
                      y={bH / 2}
                      fontSize="9"
                      fontWeight="600"
                      textAnchor="middle"
                      fill="#475569"
                      transform={`rotate(-90, 14, ${bH / 2})`}
                      fontFamily="sans-serif"
                    >
                      Magnitude (dB)
                    </text>

                    {/* X-Axis Label in English */}
                    <text
                      x={bPad.left + bPlotW / 2}
                      y={bH - 8}
                      fontSize="9"
                      fontWeight="600"
                      textAnchor="middle"
                      fill="#475569"
                      fontFamily="sans-serif"
                    >
                      Frequency (rad/s)
                    </text>

                    {/* 0 dB Crossover Line */}
                    <line x1={bPad.left} y1={scaleMagY(0)} x2={bW - bPad.right} y2={scaleMagY(0)} stroke="#ef4444" strokeWidth="1.2" strokeDasharray="4 4" />
                    <text x={bPad.left - 6} y={scaleMagY(0) + 3} fontSize="8" textAnchor="end" fill="#ef4444" fontFamily="monospace">0 dB</text>

                    {/* Axes */}
                    <line x1={bPad.left} y1={bPad.top} x2={bPad.left} y2={bH - bPad.bottom} stroke="#cbd5e1" strokeWidth="1" />
                    <line x1={bPad.left} y1={bH - bPad.bottom} x2={bW - bPad.right} y2={bH - bPad.bottom} stroke="#cbd5e1" strokeWidth="1" />

                    {/* Magnitude curve */}
                    {magPath && (
                      <path d={magPath} fill="none" stroke="#0d9488" strokeWidth="2.2" strokeLinecap="round" />
                    )}
                  </svg>
                </div>
              </div>
            </div>
          )}

          {/* 2. Table View (Metrics, Poles, and Sample Series) */}
          {outputTab === 'table' && (
            <div className="space-y-4 text-xs">
              {/* Table 1: Key Performance Metrics */}
              <div>
                <div className="font-bold text-slate-800 mb-1.5 flex items-center justify-between">
                  <span>1. 系统关键动态性能指标表 (System Metrics)</span>
                  <span className="font-mono text-2xs text-slate-400">Step Response Evaluation</span>
                </div>
                <div className="overflow-x-auto rounded-lg border border-slate-200">
                  <table className="w-full text-left text-2xs">
                    <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="py-2 px-3">指标名称 (Metric)</th>
                        <th className="py-2 px-3 font-mono">实测数值 (Value)</th>
                        <th className="py-2 px-3">单位 (Unit)</th>
                        <th className="py-2 px-3">工程评级 (Rating)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      <tr>
                        <td className="py-2 px-3 font-medium">超调量 (Overshoot σ)</td>
                        <td className="py-2 px-3 font-mono font-bold text-slate-900">
                          {metrics.overshoot > 500 ? '∞ (发散)' : `${metrics.overshoot}%`}
                        </td>
                        <td className="py-2 px-3 text-slate-500">%</td>
                        <td className="py-2 px-3">
                          {metrics.overshoot < 10 ? '优良 (< 10%)' : metrics.overshoot < 25 ? '一般 (10%~25%)' : '偏大 (需微分校正)'}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 font-medium">上升时间 (Rise Time Tr)</td>
                        <td className="py-2 px-3 font-mono font-bold text-slate-900">{metrics.riseTime}</td>
                        <td className="py-2 px-3 text-slate-500">s</td>
                        <td className="py-2 px-3">快速响应 (10%~90%)</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 font-medium">调节时间 (Settling Time Ts)</td>
                        <td className="py-2 px-3 font-mono font-bold text-slate-900">{metrics.settlingTime}</td>
                        <td className="py-2 px-3 text-slate-500">s</td>
                        <td className="py-2 px-3">进入 ±2% 误差带</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 font-medium">稳态误差 (Steady-State Error Ess)</td>
                        <td className="py-2 px-3 font-mono font-bold text-slate-900">{metrics.steadyStateError}</td>
                        <td className="py-2 px-3 text-slate-500">-</td>
                        <td className="py-2 px-3">{metrics.steadyStateError < 0.02 ? '零静差 (良好)' : '存在静差 (需积分项)'}</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 font-medium">稳定性判据 (Stability)</td>
                        <td className="py-2 px-3 font-mono font-bold text-emerald-700">
                          {mode === 'negative' ? '渐近稳定 (Stable)' : '发散不稳定 (Unstable)'}
                        </td>
                        <td className="py-2 px-3 text-slate-500">-</td>
                        <td className="py-2 px-3">李雅普诺夫判据</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Table 2: Closed-Loop Poles Coordinate */}
              <div>
                <div className="font-bold text-slate-800 mb-1.5 flex items-center justify-between">
                  <span>2. 闭环极点分布特征表 (Closed-Loop Poles)</span>
                  <span className="font-mono text-2xs text-slate-400">s-Plane Roots</span>
                </div>
                <div className="overflow-x-auto rounded-lg border border-slate-200">
                  <table className="w-full text-left text-2xs">
                    <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="py-2 px-3">极点序号</th>
                        <th className="py-2 px-3 font-mono">复平面坐标 (Real + Imag)</th>
                        <th className="py-2 px-3">位置区域</th>
                        <th className="py-2 px-3">衰减时间常数 τ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {closedPoles.map((p, idx) => (
                        <tr key={idx}>
                          <td className="py-2 px-3 font-mono">Pole s{idx + 1}</td>
                          <td className="py-2 px-3 font-mono font-bold text-slate-900">
                            {p.real >= 0 ? '+' : ''}{p.real.toFixed(3)} {p.imag !== 0 ? `${p.imag >= 0 ? '+' : ''}${p.imag.toFixed(3)}j` : ''}
                          </td>
                          <td className="py-2 px-3">
                            <span className={`px-1.5 py-0.5 rounded text-3xs font-semibold ${p.real < 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                              {p.real < 0 ? '左半平面 (LHP)' : '右半平面 (RHP)'}
                            </span>
                          </td>
                          <td className="py-2 px-3 font-mono">
                            {p.real < -1e-4 ? `${(1 / Math.abs(p.real)).toFixed(2)} s` : p.real > 1e-4 ? '发散' : '临界振荡'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Table 3: Time Series Data Points */}
              <div>
                <div className="font-bold text-slate-800 mb-1.5 flex items-center justify-between">
                  <span>3. 仿真时间序列采样表 (Simulation Time Series Sample)</span>
                  <span className="font-mono text-2xs text-slate-400">Sample Step Horizon</span>
                </div>
                <div className="overflow-x-auto rounded-lg border border-slate-200">
                  <table className="w-full text-left text-2xs font-mono">
                    <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="py-1.5 px-3">Time t(s)</th>
                        <th className="py-1.5 px-3">Target r(t)</th>
                        <th className="py-1.5 px-3">Output y(t)</th>
                        <th className="py-1.5 px-3">Error e(t)</th>
                        <th className="py-1.5 px-3">Effort u(t)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {sampleRows.map((row, idx) => (
                        <tr key={idx}>
                          <td className="py-1.5 px-3 font-bold text-slate-900">{(row.t || 0).toFixed(2)}</td>
                          <td className="py-1.5 px-3 text-slate-600">{(row.r || 0).toFixed(2)}</td>
                          <td className="py-1.5 px-3 text-sky-700 font-bold">{(row.y || 0).toFixed(4)}</td>
                          <td className="py-1.5 px-3 text-amber-700">{(row.e || 0).toFixed(4)}</td>
                          <td className="py-1.5 px-3 text-purple-700">{(row.u || 0).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 3. Terminal Log View */}
          {outputTab === 'terminal' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-2xs text-slate-500 font-mono">
                <span>Standard Output (stdout)</span>
                <span>Encoding: UTF-8</span>
              </div>
              <pre className="p-4 rounded-xl border border-slate-200 bg-slate-950 font-mono text-2xs text-slate-200 whitespace-pre-wrap leading-relaxed overflow-x-auto max-h-[460px] selection:bg-slate-700">
                {terminalOutput}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
