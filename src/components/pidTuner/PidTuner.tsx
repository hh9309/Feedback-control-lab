import React, { useState } from 'react';
import {
  Activity,
  Check,
  Cpu,
  HelpCircle,
  RotateCcw,
  Sliders,
  Sparkles,
  Zap,
} from 'lucide-react';
import {
  PidParameters,
  SimulationPoint,
  TimeDomainMetrics,
} from '../../types/control';

interface PidTunerProps {
  pidParams: PidParameters;
  setPidParams: React.Dispatch<React.SetStateAction<PidParameters>>;
  points: SimulationPoint[];
  metrics: TimeDomainMetrics;
}

export const PidTuner: React.FC<PidTunerProps> = ({
  pidParams,
  setPidParams,
  points,
  metrics,
}) => {
  const { kp, ki, kd, filterCoeffN, antiWindup } = pidParams;

  // Chart layout
  const width = 680;
  const height = 200;
  const padding = { top: 20, right: 30, bottom: 30, left: 45 };
  const plotW = width - padding.left - padding.right;
  const plotH = height - padding.top - padding.bottom;
  const totalTime = points.length > 0 ? points[points.length - 1].t : 12;

  const scaleX = (t: number) => padding.left + (t / totalTime) * plotW;
  const scaleY = (y: number) => {
    const minY = -0.2;
    const maxY = 2.2;
    const clamped = Math.max(minY, Math.min(maxY, y));
    return padding.top + plotH - ((clamped - minY) / (maxY - minY)) * plotH;
  };

  const yPath = points
    .map((pt, idx) => `${idx === 0 ? 'M' : 'L'} ${scaleX(pt.t).toFixed(1)} ${scaleY(pt.y).toFixed(1)}`)
    .join(' ');

  const rPath = points
    .map((pt, idx) => `${idx === 0 ? 'M' : 'L'} ${scaleX(pt.t).toFixed(1)} ${scaleY(pt.r).toFixed(1)}`)
    .join(' ');

  // Actuator effort u(t) path
  const scaleEffortY = (u: number) => {
    const minU = -10;
    const maxU = 15;
    const clamped = Math.max(minU, Math.min(maxU, u));
    return padding.top + plotH - ((clamped - minU) / (maxU - minU)) * plotH;
  };

  const uPath = points
    .map((pt, idx) => `${idx === 0 ? 'M' : 'L'} ${scaleX(pt.t).toFixed(1)} ${scaleEffortY(pt.u).toFixed(1)}`)
    .join(' ');

  return (
    <div className="space-y-6">
      {/* Sliced Header */}
      <div className="p-6 rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-1">
              <span>经典三参数闭环调校</span>
              <span>·</span>
              <span>比例 / 积分 / 微分与抗饱和</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              PID 控制调校 (PID Tuner)
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              拖动 P、I、D 滑块，实时观察负反馈系统对设定目标跟踪与阶跃扰动抑制的动态效果。
            </p>
          </div>

          {/* Quick Presets Slices */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-lg border border-slate-200 bg-slate-100 self-start">
            <button
              onClick={() =>
                setPidParams({ kp: 1.5, ki: 0, kd: 0, filterCoeffN: 10, antiWindup: false })
              }
              className="px-2.5 py-1 text-xs font-medium rounded hover:bg-white text-slate-700 transition-colors"
            >
              纯比例 P
            </button>
            <button
              onClick={() =>
                setPidParams({ kp: 1.2, ki: 0.8, kd: 0, filterCoeffN: 10, antiWindup: true })
              }
              className="px-2.5 py-1 text-xs font-medium rounded hover:bg-white text-slate-700 transition-colors"
            >
              PI 消除静差
            </button>
            <button
              onClick={() =>
                setPidParams({ kp: 2.2, ki: 1.1, kd: 0.9, filterCoeffN: 10, antiWindup: true })
              }
              className="px-2.5 py-1 text-xs font-semibold rounded bg-white text-slate-900 shadow-xs"
            >
              标准平衡 PID
            </button>
            <button
              onClick={() =>
                setPidParams({ kp: 3.5, ki: 1.5, kd: 1.4, filterCoeffN: 12, antiWindup: true })
              }
              className="px-2.5 py-1 text-xs font-medium rounded hover:bg-white text-slate-700 transition-colors"
            >
              强抗扰工况
            </button>
            <button
              onClick={() =>
                setPidParams({ kp: 0.9, ki: 0.3, kd: 0.5, filterCoeffN: 10, antiWindup: true })
              }
              className="px-2.5 py-1 text-xs font-medium rounded hover:bg-white text-slate-700 transition-colors"
            >
              零超调平滑
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: PID Slider Controls (Left) & Real-time Dual Curves (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sliders Configuration Column */}
        <div className="p-6 rounded-xl border border-slate-200 bg-white space-y-6">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">控制器参数配置</h3>
            <span className="font-mono text-2xs text-slate-500">
              u(t) = Kp·e + Ki∫e dt + Kd·de/dt
            </span>
          </div>

          {/* Kp Slider */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-slate-800">比例系数 (Proportional Kp):</span>
              <span className="font-mono font-bold text-sm text-slate-900">{kp}</span>
            </div>
            <input
              type="range"
              min="0"
              max="8"
              step="0.1"
              value={kp}
              onChange={(e) =>
                setPidParams((prev) => ({ ...prev, kp: parseFloat(e.target.value) }))
              }
              className="w-full accent-slate-900 cursor-pointer"
            />
            <div className="flex justify-between text-2xs text-slate-400">
              <span>0 (无动作)</span>
              <span>增加Kp加速响应但加剧超调</span>
              <span>8.0</span>
            </div>
          </div>

          {/* Ki Slider */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-slate-800">积分系数 (Integral Ki):</span>
              <span className="font-mono font-bold text-sm text-slate-900">{ki}</span>
            </div>
            <input
              type="range"
              min="0"
              max="5"
              step="0.05"
              value={ki}
              onChange={(e) =>
                setPidParams((prev) => ({ ...prev, ki: parseFloat(e.target.value) }))
              }
              className="w-full accent-slate-900 cursor-pointer"
            />
            <div className="flex justify-between text-2xs text-slate-400">
              <span>0 (有静差)</span>
              <span>消除稳态误差但降低相位裕度</span>
              <span>5.0</span>
            </div>
          </div>

          {/* Kd Slider */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-slate-800">微分系数 (Derivative Kd):</span>
              <span className="font-mono font-bold text-sm text-slate-900">{kd}</span>
            </div>
            <input
              type="range"
              min="0"
              max="3"
              step="0.05"
              value={kd}
              onChange={(e) =>
                setPidParams((prev) => ({ ...prev, kd: parseFloat(e.target.value) }))
              }
              className="w-full accent-slate-900 cursor-pointer"
            />
            <div className="flex justify-between text-2xs text-slate-400">
              <span>0 (无预见)</span>
              <span>预测偏差趋势提供超前阻尼</span>
              <span>3.0</span>
            </div>
          </div>

          {/* Anti-Windup & Filter Switch */}
          <div className="pt-3 border-t border-slate-100 space-y-3">
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <span className="text-xs font-semibold text-slate-800 block">
                  抗积分饱和 (Anti-Windup)
                </span>
                <span className="text-2xs text-slate-500">
                  限制积分器过度累积，消除执行器饱和脱离延迟
                </span>
              </div>
              <input
                type="checkbox"
                checked={antiWindup}
                onChange={(e) =>
                  setPidParams((prev) => ({ ...prev, antiWindup: e.target.checked }))
                }
                className="w-4 h-4 accent-slate-900 cursor-pointer"
              />
            </label>

            <div>
              <div className="flex justify-between items-center text-xs text-slate-700 mb-1">
                <span>微分低通滤波系数 N:</span>
                <span className="font-mono font-bold text-slate-900">{filterCoeffN}</span>
              </div>
              <input
                type="range"
                min="3"
                max="25"
                step="1"
                value={filterCoeffN}
                onChange={(e) =>
                  setPidParams((prev) => ({ ...prev, filterCoeffN: parseInt(e.target.value) }))
                }
                className="w-full accent-slate-900 cursor-pointer"
              />
              <span className="text-2xs text-slate-400 block mt-0.5">
                高频滤波滤除测量噪声对微分项的毛刺放大
              </span>
            </div>
          </div>
        </div>

        {/* Real-time Response & Actuator Effort Charts (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          {/* Output Response Chart */}
          <div className="p-6 rounded-xl border border-slate-200 bg-white space-y-2">
            <div className="flex items-center justify-between text-xs pb-1 border-b border-slate-100">
              <span className="font-bold text-slate-800">输出响应曲线 y(t)</span>
              <div className="flex items-center gap-3 font-mono text-2xs text-slate-500">
                <span>超调: <strong className="text-slate-900">{metrics.overshoot}%</strong></span>
                <span>稳态误差: <strong className="text-slate-900">{metrics.steadyStateError}</strong></span>
                <span>调节时间: <strong className="text-slate-900">{metrics.settlingTime}s</strong></span>
              </div>
            </div>

            <div className="relative w-full bg-slate-50/50 rounded-xl border border-slate-200">
              <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto select-none">
                {/* Target line */}
                <line
                  x1={padding.left}
                  y1={scaleY(1.0)}
                  x2={width - padding.right}
                  y2={scaleY(1.0)}
                  stroke="#94a3b8"
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                />
                <text x="15" y={scaleY(1.0) + 4} fontSize="10" fill="#64748b" fontFamily="monospace">
                  1.0
                </text>
                <text x="15" y={scaleY(0.0) + 4} fontSize="10" fill="#64748b" fontFamily="monospace">
                  0.0
                </text>

                {/* y(t) curve */}
                <path d={yPath} fill="none" stroke="#0284c7" strokeWidth="2.5" />
              </svg>
            </div>
          </div>

          {/* Actuator Effort Chart */}
          <div className="p-6 rounded-xl border border-slate-200 bg-white space-y-2">
            <div className="flex items-center justify-between text-xs pb-1 border-b border-slate-100">
              <span className="font-bold text-slate-800">执行机构输出量 / 控制冲量 u(t)</span>
              <span className="text-2xs text-slate-500">
                观察执行器输出限幅与初始微分冲击 (Derivative Kick)
              </span>
            </div>

            <div className="relative w-full bg-slate-50/50 rounded-xl border border-slate-200">
              <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto select-none">
                {/* Zero line */}
                <line
                  x1={padding.left}
                  y1={scaleEffortY(0)}
                  x2={width - padding.right}
                  y2={scaleEffortY(0)}
                  stroke="#cbd5e1"
                  strokeWidth="1"
                />
                <text x="15" y={scaleEffortY(0) + 4} fontSize="9" fill="#94a3b8" fontFamily="monospace">
                  0.0
                </text>

                {/* u(t) curve */}
                <path d={uPath} fill="none" stroke="#8b5cf6" strokeWidth="2" strokeDasharray="3 2" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
