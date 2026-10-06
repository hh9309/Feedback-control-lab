import React, { useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  HelpCircle,
  Layers,
  Maximize2,
  RefreshCw,
  Scale,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';

export const WikiNavigation: React.FC = () => {
  const [activeTopic, setActiveTopic] = useState<'principles' | 'tf' | 'stability' | 'secondOrder'>('principles');
  const [demoZeta, setDemoZeta] = useState(0.4); // Damping ratio for live interactive explorer
  const [demoFeedbackMode, setDemoFeedbackMode] = useState<'negative' | 'positive'>('negative');

  // Second-order step response points generator: y(t) = 1 - e^(-zeta*w*t) / sqrt(1-zeta^2) * sin(wd*t + phi)
  const generateSecondOrderCurve = (zeta: number) => {
    const wn = 2; // Natural frequency 2 rad/s
    const points: { t: number; y: number }[] = [];
    const dt = 0.05;
    const tMax = 6;

    for (let t = 0; t <= tMax; t += dt) {
      let y = 0;
      if (zeta < 0) {
        // Unstable exponential growth
        y = 1 - Math.exp(-zeta * wn * t) * Math.cos(wn * t);
      } else if (Math.abs(zeta - 1.0) < 0.01) {
        // Critical damping
        y = 1 - (1 + wn * t) * Math.exp(-wn * t);
      } else if (zeta < 1.0) {
        // Underdamped
        const wd = wn * Math.sqrt(1 - zeta * zeta);
        const phi = Math.atan(Math.sqrt(1 - zeta * zeta) / zeta);
        y = 1 - (Math.exp(-zeta * wn * t) / Math.sqrt(1 - zeta * zeta)) * Math.sin(wd * t + phi);
      } else {
        // Overdamped
        const s1 = -wn * (zeta - Math.sqrt(zeta * zeta - 1));
        const s2 = -wn * (zeta + Math.sqrt(zeta * zeta - 1));
        y = 1 - (s2 * Math.exp(s1 * t) - s1 * Math.exp(s2 * t)) / (s2 - s1);
      }
      points.push({ t, y: Math.max(-0.5, Math.min(2.5, y)) });
    }
    return points;
  };

  const curveData = generateSecondOrderCurve(demoZeta);

  return (
    <div className="space-y-6">
      {/* Sliced Section Header */}
      <div className="p-6 rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-1">
              <span>控制工程核心通识</span>
              <span>·</span>
              <span>反馈理论交互图解</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              知识导引 (Wiki Navigation)
            </h2>
            <p className="text-sm text-slate-600 mt-1 max-w-3xl">
              系统动力学的精髓在于反馈环路的极性：负反馈通过自检偏差实现自我纠偏与动态平衡；正反馈则强化微小偏差，导致雪崩式的发散爆发或双稳态跃迁。
            </p>
          </div>

          {/* Sliced Topic Tabs */}
          <div className="flex flex-wrap p-1 rounded-lg border border-slate-200 bg-slate-100 self-start">
            <button
              onClick={() => setActiveTopic('principles')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                activeTopic === 'principles'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              正负反馈机理
            </button>
            <button
              onClick={() => setActiveTopic('tf')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                activeTopic === 'tf'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              传递函数推导
            </button>
            <button
              onClick={() => setActiveTopic('stability')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                activeTopic === 'stability'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              稳定性与极点
            </button>
            <button
              onClick={() => setActiveTopic('secondOrder')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                activeTopic === 'secondOrder'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              阻尼比交互演练
            </button>
          </div>
        </div>
      </div>

      {/* Chapter 1: Positive vs Negative Feedback */}
      {activeTopic === 'principles' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Negative Feedback Card */}
          <div className="p-6 rounded-xl border border-emerald-200 bg-white shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-md bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
                  -
                </span>
                <h3 className="text-base font-bold text-slate-900">负反馈 (Negative Feedback)</h3>
              </div>
              <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                抑制偏差 · 维持稳态
              </span>
            </div>

            <div className="space-y-4 text-sm text-slate-600">
              <p>
                <strong>控制法则：</strong>输出量 $y(t)$ 经测量变换后，反相回送至输入端，与期望目标 $r(t)$ <strong>做差求和</strong>：
              </p>
              <div className="p-3 bg-slate-50 rounded-lg font-mono text-center text-xs text-slate-800 border border-slate-200">
                误差信号 e(t) = r(t) - H · y(t)
              </div>
              <ul className="space-y-2 text-xs text-slate-600">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span><strong>自纠错特性：</strong>当输出因扰动偏高时，偏差 $e(t)$ 减小，促使控制器减少驱动量，强制拉回基准。</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span><strong>现实映射：</strong>人体体温调节、空调恒温控制、瓦特离心调速器、瓦逊运放深度负反馈。</span>
                </li>
              </ul>

              {/* Schematic mini loop */}
              <div className="pt-2">
                <div className="p-3 bg-emerald-50/50 rounded-lg border border-emerald-100 flex items-center justify-around text-xs font-mono text-emerald-900">
                  <div className="p-2 bg-white rounded border border-emerald-200 text-center">输入 r</div>
                  <ArrowRight className="w-3.5 h-3.5 text-emerald-600" />
                  <div className="p-2 bg-emerald-100 rounded border border-emerald-300 font-bold text-center">Σ (-)</div>
                  <ArrowRight className="w-3.5 h-3.5 text-emerald-600" />
                  <div className="p-2 bg-white rounded border border-emerald-200 text-center">控制器 C·G</div>
                  <ArrowRight className="w-3.5 h-3.5 text-emerald-600" />
                  <div className="p-2 bg-white rounded border border-emerald-200 text-center">输出 y</div>
                </div>
              </div>
            </div>
          </div>

          {/* Positive Feedback Card */}
          <div className="p-6 rounded-xl border border-rose-200 bg-white shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-md bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-xs">
                  +
                </span>
                <h3 className="text-base font-bold text-slate-900">正反馈 (Positive Feedback)</h3>
              </div>
              <span className="text-xs font-medium text-rose-700 bg-rose-50 px-2 py-0.5 rounded">
                放大偏差 · 发散与突变
              </span>
            </div>

            <div className="space-y-4 text-sm text-slate-600">
              <p>
                <strong>控制法则：</strong>输出量 $y(t)$ 同相回送叠加至输入端，偏差不被抑制反而<strong>被动滚雪球放大</strong>：
              </p>
              <div className="p-3 bg-slate-50 rounded-lg font-mono text-center text-xs text-rose-900 border border-rose-200">
                等效激励 e(t) = r(t) + H · y(t)
              </div>
              <ul className="space-y-2 text-xs text-slate-600">
                <li className="flex items-start gap-2">
                  <TrendingUp className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span><strong>雪崩爆发效应：</strong>即使没有外部输入，微小的初始噪声扰动也会迅速自我激励成指数级爆炸发散。</span>
                </li>
                <li className="flex items-start gap-2">
                  <TrendingUp className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span><strong>现实映射：</strong>极地冰雪反照率融化雪崩、麦克风对着音箱的刺耳哮鸣、金融市场恐慌性踩踏、核裂变链式反应。</span>
                </li>
              </ul>

              {/* Schematic mini loop */}
              <div className="pt-2">
                <div className="p-3 bg-rose-50/50 rounded-lg border border-rose-100 flex items-center justify-around text-xs font-mono text-rose-900">
                  <div className="p-2 bg-white rounded border border-rose-200 text-center">扰动 δ</div>
                  <ArrowRight className="w-3.5 h-3.5 text-rose-600" />
                  <div className="p-2 bg-rose-100 rounded border border-rose-300 font-bold text-center">Σ (+)</div>
                  <ArrowRight className="w-3.5 h-3.5 text-rose-600" />
                  <div className="p-2 bg-white rounded border border-rose-200 text-center">增益环路</div>
                  <ArrowRight className="w-3.5 h-3.5 text-rose-600" />
                  <div className="p-2 bg-white rounded border border-rose-200 text-rose-600 font-bold text-center">发散 y→∞</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Chapter 2: Transfer Function Derivation */}
      {activeTopic === 'tf' && (
        <div className="p-6 rounded-xl border border-slate-200 bg-white space-y-6">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-base font-bold text-slate-900">闭环传递函数 (Closed-Loop Transfer Function)</h3>
            <p className="text-xs text-slate-500 mt-0.5">拉普拉斯变换下经典单输入单输出 (SISO) 闭环数学解析</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            <div className="space-y-4 text-sm text-slate-600">
              <p>设前向通道传递函数为 $G_f(s) = C(s)G(s)$，反馈通道传递函数为 $H(s)$：</p>
              
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3 font-mono text-xs">
                <div className="text-slate-500">1. 输出方程:</div>
                <div className="font-semibold text-slate-800">Y(s) = G_f(s) · E(s)</div>
                <div className="text-slate-500">2. 综合点偏差方程:</div>
                <div className="font-semibold text-slate-800">E(s) = R(s) ∓ H(s) · Y(s)</div>
                <div className="text-slate-500">3. 联立代入解得系统闭环传递函数 T(s):</div>
                <div className="p-3 rounded-lg bg-white border border-slate-300 text-sm font-bold text-center text-slate-900">
                  T(s) = Y(s) / R(s) = G_f(s) / [ 1 ∓ G_f(s) · H(s) ]
                </div>
              </div>

              <div className="text-xs text-slate-500 space-y-1">
                <p>• <strong>负反馈 (Negative)</strong>：分母为 $1 + G_f(s)H(s)$，增加极点模长与阻尼。</p>
                <p>• <strong>正反馈 (Positive)</strong>：分母为 $1 - G_f(s)H(s)$，易产生位于实轴正半轴的实数极点，引发指数爆炸。</p>
              </div>
            </div>

            {/* Block Diagram Illustration */}
            <div className="p-5 rounded-xl border border-slate-200 bg-slate-50/60 flex flex-col items-center justify-center">
              <div className="text-xs font-semibold text-slate-500 mb-3">SISO 标准闭环框图结构</div>
              <svg viewBox="0 0 460 160" className="w-full max-w-md h-auto">
                <defs>
                  <marker id="arr" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 1 L 8 5 L 0 9 z" fill="#475569" />
                  </marker>
                </defs>

                {/* Input line */}
                <line x1="20" y1="50" x2="70" y2="50" stroke="#475569" strokeWidth="2" markerEnd="url(#arr)" />
                <text x="25" y="42" fontSize="11" fill="#475569" fontFamily="monospace">R(s)</text>

                {/* Summing junction */}
                <circle cx="90" cy="50" r="16" fill="#fff" stroke="#0f172a" strokeWidth="2" />
                <line x1="82" y1="42" x2="98" y2="58" stroke="#cbd5e1" strokeWidth="1" />
                <line x1="82" y1="58" x2="98" y2="42" stroke="#cbd5e1" strokeWidth="1" />
                <text x="76" y="46" fontSize="12" fontWeight="bold" fill="#0f172a">+</text>
                <text x="86" y="66" fontSize="13" fontWeight="bold" fill="#0f172a">∓</text>

                {/* To Controller line */}
                <line x1="106" y1="50" x2="140" y2="50" stroke="#475569" strokeWidth="2" markerEnd="url(#arr)" />
                <text x="110" y="42" fontSize="11" fill="#475569" fontFamily="monospace">E(s)</text>

                {/* Controller block */}
                <rect x="140" y="32" width="70" height="36" rx="4" fill="#fff" stroke="#0f172a" strokeWidth="1.5" />
                <text x="175" y="54" fontSize="11" textAnchor="middle" fontWeight="bold" fill="#0f172a">C(s)</text>

                {/* Between C and G */}
                <line x1="210" y1="50" x2="250" y2="50" stroke="#475569" strokeWidth="2" markerEnd="url(#arr)" />
                <text x="218" y="42" fontSize="10" fill="#475569" fontFamily="monospace">U(s)</text>

                {/* Plant block */}
                <rect x="250" y="32" width="80" height="36" rx="4" fill="#fff" stroke="#0f172a" strokeWidth="1.5" />
                <text x="290" y="54" fontSize="11" textAnchor="middle" fontWeight="bold" fill="#0f172a">G(s)</text>

                {/* Output line */}
                <line x1="330" y1="50" x2="430" y2="50" stroke="#475569" strokeWidth="2" markerEnd="url(#arr)" />
                <text x="400" y="42" fontSize="11" fill="#475569" fontFamily="monospace">Y(s)</text>

                {/* Feedback line branch */}
                <circle cx="370" cy="50" r="3" fill="#0f172a" />
                <line x1="370" y1="50" x2="370" y2="120" stroke="#475569" strokeWidth="2" />
                <line x1="370" y1="120" x2="290" y2="120" stroke="#475569" strokeWidth="2" markerEnd="url(#arr)" />

                {/* Feedback block H(s) */}
                <rect x="210" y="102" width="80" height="36" rx="4" fill="#fff" stroke="#0f172a" strokeWidth="1.5" />
                <text x="250" y="124" fontSize="11" textAnchor="middle" fontWeight="bold" fill="#0f172a">H(s)</text>

                {/* Feedback back to summing junction */}
                <line x1="210" y1="120" x2="90" y2="120" stroke="#475569" strokeWidth="2" />
                <line x1="90" y1="120" x2="90" y2="66" stroke="#475569" strokeWidth="2" markerEnd="url(#arr)" />
                <text x="96" y="105" fontSize="10" fill="#475569" fontFamily="monospace">B(s)</text>
              </svg>
            </div>
          </div>
        </div>
      )}

      {/* Chapter 3: Stability & s-plane */}
      {activeTopic === 'stability' && (
        <div className="p-6 rounded-xl border border-slate-200 bg-white space-y-6">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-base font-bold text-slate-900">系统稳定性条件与 s 平面虚轴分界</h3>
            <p className="text-xs text-slate-500 mt-0.5">李雅普诺夫第一法与零极点复平面几何解析</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/30 space-y-2">
              <div className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-600" />
                渐近稳定 (LHP 极点)
              </div>
              <p className="text-xs text-slate-600">
                所有闭环极点均满足实部 Re(p_i) &lt; 0，位于复平面<strong>左半平面 (LHP)</strong>。系统的自然脉冲响应包含衰减项 e^(σt) (σ &lt; 0)，随时间平稳衰减至零。
              </p>
            </div>

            <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/30 space-y-2">
              <div className="text-xs font-bold text-amber-800 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-600" />
                临界稳定 (虚轴无重极点)
              </div>
              <p className="text-xs text-slate-600">
                闭环极点落在<strong>虚轴 jω</strong> 上 (σ = 0) 且无重根。系统表现为等幅不衰减的正弦自激振荡，如同理想无摩擦弹簧摆子或 LC 谐振回路。
              </p>
            </div>

            <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/30 space-y-2">
              <div className="text-xs font-bold text-rose-800 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-600" />
                发散不稳定 (RHP 极点)
              </div>
              <p className="text-xs text-slate-600">
                只要存在至少一个极点满足 Re(p_k) &gt; 0，位于<strong>右半平面 (RHP)</strong>，系统的时域响应项包含 e^(σt) (σ &gt; 0)，引发指数级爆发失控。
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Chapter 4: Interactive Damping Ratio Explorer */}
      {activeTopic === 'secondOrder' && (
        <div className="p-6 rounded-xl border border-slate-200 bg-white space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base font-bold text-slate-900">经典二阶系统时域响应交互演练</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                典型二阶系统传递函数 Φ(s) = ωn² / (s² + 2ζωn s + ωn²)，拖动滑块直观查看阻尼比 ζ 对瞬态曲线的决定性塑造
              </p>
            </div>

            {/* Quick Presets */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-lg">
              <button
                onClick={() => setDemoZeta(0.2)}
                className={`px-2.5 py-1 text-xs font-medium rounded ${
                  demoZeta === 0.2 ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                欠阻尼 (0.2)
              </button>
              <button
                onClick={() => setDemoZeta(0.707)}
                className={`px-2.5 py-1 text-xs font-medium rounded ${
                  demoZeta === 0.707 ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                最佳工程阻尼 (0.707)
              </button>
              <button
                onClick={() => setDemoZeta(1.0)}
                className={`px-2.5 py-1 text-xs font-medium rounded ${
                  demoZeta === 1.0 ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                临界阻尼 (1.0)
              </button>
              <button
                onClick={() => setDemoZeta(1.8)}
                className={`px-2.5 py-1 text-xs font-medium rounded ${
                  demoZeta === 1.8 ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                过阻尼 (1.8)
              </button>
              <button
                onClick={() => setDemoZeta(-0.15)}
                className={`px-2.5 py-1 text-xs font-medium rounded ${
                  demoZeta === -0.15 ? 'bg-rose-600 text-white shadow-xs' : 'text-rose-600 hover:text-rose-900'
                }`}
              >
                负阻尼 (发散)
              </button>
            </div>
          </div>

          {/* Interactive Slider & Live SVG Plot */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            {/* Control Slider Pane */}
            <div className="space-y-5 p-4 rounded-xl border border-slate-200 bg-slate-50">
              <div>
                <div className="flex justify-between items-center text-xs font-medium text-slate-700 mb-1.5">
                  <span>阻尼比 (Damping Ratio ζ):</span>
                  <span className="font-mono text-sm font-bold text-slate-900">{demoZeta.toFixed(3)}</span>
                </div>
                <input
                  type="range"
                  min="-0.3"
                  max="2.5"
                  step="0.02"
                  value={demoZeta}
                  onChange={(e) => setDemoZeta(parseFloat(e.target.value))}
                  className="w-full accent-slate-900 cursor-pointer"
                />
                <div className="flex justify-between text-2xs text-slate-600 mt-1 font-mono">
                  <span>-0.3 (发散)</span>
                  <span>0.0 (等幅)</span>
                  <span>0.707 (最优)</span>
                  <span>1.0 (临界)</span>
                  <span>2.5 (迟缓)</span>
                </div>
              </div>

              {/* Status explanation */}
              <div className="p-3 rounded-lg bg-white border border-slate-200 text-xs space-y-1.5">
                <div className="font-semibold text-slate-800">
                  {demoZeta < 0
                    ? '⚠️ 负阻尼 (负反馈失效或正反馈): 振幅指数发散'
                    : demoZeta === 0
                    ? '⚡ 无阻尼 (临界振荡): 纯虚轴共轭极点'
                    : demoZeta < 1
                    ? '🌊 欠阻尼 (Underdamped): 快速响应伴随超调衰减'
                    : demoZeta === 1
                    ? '🎯 临界阻尼 (Critically Damped): 最快单调到达稳态'
                    : '🐢 过阻尼 (Overdamped): 极度平缓、动作迟缓无超调'}
                </div>
                <p className="text-slate-500 text-2xs leading-relaxed">
                  在工业自动控制中，通常将阻尼比设计在 ζ ∈ [0.6, 0.8] 之间，兼顾较短的上升时间与低于 10% 的微小超调量。
                </p>
              </div>
            </div>

            {/* SVG Plot */}
            <div className="md:col-span-2 p-4 rounded-xl border border-slate-200 bg-white">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                <span>实时阶跃响应曲线 y(t)</span>
                <span className="font-mono">目标值 r(t) = 1.0</span>
              </div>

              <div className="relative h-60 w-full">
                <svg viewBox="0 0 500 240" className="w-full h-full overflow-visible">
                  {/* Grid lines */}
                  <line x1="40" y1="40" x2="480" y2="40" stroke="#f1f5f9" strokeWidth="1" />
                  <line x1="40" y1="100" x2="480" y2="100" stroke="#f1f5f9" strokeWidth="1" />
                  <line x1="40" y1="160" x2="480" y2="160" stroke="#f1f5f9" strokeWidth="1" />
                  <line x1="40" y1="200" x2="480" y2="200" stroke="#e2e8f0" strokeWidth="1.5" />
                  <line x1="40" y1="20" x2="40" y2="200" stroke="#e2e8f0" strokeWidth="1.5" />

                  {/* Target line y = 1.0 at y=100 */}
                  <line x1="40" y1="100" x2="480" y2="100" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="4 4" />
                  <text x="15" y="104" fontSize="10" fill="#64748b" fontFamily="monospace">1.0</text>
                  <text x="15" y="204" fontSize="10" fill="#64748b" fontFamily="monospace">0.0</text>
                  <text x="15" y="44" fontSize="10" fill="#64748b" fontFamily="monospace">2.0</text>

                  {/* Curve polyline */}
                  <path
                    d={curveData
                      .map((pt, idx) => {
                        const px = 40 + (pt.t / 6) * 440;
                        const py = 200 - pt.y * 100;
                        return `${idx === 0 ? 'M' : 'L'} ${px.toFixed(1)} ${py.toFixed(1)}`;
                      })
                      .join(' ')}
                    fill="none"
                    stroke={demoZeta < 0 ? '#e11d48' : '#0284c7'}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
