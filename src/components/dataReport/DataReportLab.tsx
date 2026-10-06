import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowDownToLine,
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  Copy,
  Cpu,
  Download,
  Eye,
  FileCode,
  FileSpreadsheet,
  FileText,
  Flame,
  Gauge,
  HeartPulse,
  Layers,
  Mic,
  Printer,
  RotateCcw,
  Sparkles,
  Sun,
  Table as TableIcon,
  Thermometer,
  Zap,
} from 'lucide-react';
import { CASE_STUDIES } from '../../data/cases';
import {
  CaseStudy,
  FeedbackMode,
  SimulationPoint,
  TransferFunctionModel,
} from '../../types/control';
import {
  calculateFrequencyResponse,
  formatPolynomial,
  pidToTf,
  poly,
  simulateTimeDomain,
} from '../../services/controlMath';

interface DataReportLabProps {
  onLoadCase: (caseStudy: CaseStudy) => void;
}

export const DataReportLab: React.FC<DataReportLabProps> = ({ onLoadCase }) => {
  const [selectedCaseId, setSelectedCaseId] = useState<string>('greenhouse');
  const [previewMode, setPreviewMode] = useState<'formatted' | 'markdown'>('formatted');
  const [copied, setCopied] = useState(false);

  const activeCase = useMemo(() => {
    return CASE_STUDIES.find((c) => c.id === selectedCaseId) || CASE_STUDIES[0];
  }, [selectedCaseId]);

  // Compute simulation and frequency data for the selected case
  const caseSimulation = useMemo(() => {
    const plantTf: TransferFunctionModel = {
      numerator: activeCase.forwardPlant.numerator,
      denominator: activeCase.forwardPlant.denominator,
      delay: activeCase.forwardPlant.delay,
      gain: 1,
    };

    const pid = activeCase.recommendedPid || {
      kp: 1.0,
      ki: 0,
      kd: 0,
      filterCoeffN: 10,
      antiWindup: false,
    };
    const controllerTf = pidToTf(pid);

    const sim = simulateTimeDomain({
      plant: plantTf,
      controller: controllerTf,
      mode: activeCase.type,
      signalType: 'step',
      amplitude: activeCase.defaultRef,
      disturbanceMag: activeCase.defaultDisturbance,
      disturbanceTime: 5.0,
      totalTime: 12.0,
      timeStep: 0.02,
      feedbackGain: activeCase.feedbackGain,
    });

    const freq = calculateFrequencyResponse(plantTf, controllerTf, activeCase.feedbackGain);
    const poles = poly.findRoots(sim.closedLoopTf.denominator);
    const zeros = poly.findRoots(sim.closedLoopTf.numerator);

    return {
      plantTf,
      controllerTf,
      pid,
      sim,
      freq,
      poles,
      zeros,
    };
  }, [activeCase]);

  // Download raw CSV data
  const handleDownloadCsv = () => {
    const { points, metrics } = caseSimulation.sim;
    const metaHeader = [
      `# Feedback Lab Raw Simulation Dataset`,
      `# Case ID: ${activeCase.id}`,
      `# Case Title: ${activeCase.title}`,
      `# Feedback Mode: ${activeCase.type}`,
      `# Reference Unit: ${activeCase.unit}`,
      `# Overshoot (%): ${metrics.overshoot}`,
      `# Settling Time (s): ${metrics.settlingTime}`,
      `# Steady-State Error: ${metrics.steadyStateError}`,
      `# Export Date: ${new Date().toISOString()}`,
      `time_s,reference_r,output_y,error_e,control_u,disturbance_d`,
    ].join('\n');

    const rows = points.map(
      (p) => `${p.t},${p.r},${p.y},${p.e},${p.u},${p.d}`
    );

    const csvContent = `${metaHeader}\n${rows.join('\n')}`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `feedback_lab_raw_${activeCase.id}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Download raw JSON data
  const handleDownloadJson = () => {
    const fullDataset = {
      metadata: {
        exportTimestamp: new Date().toISOString(),
        labName: 'Feedback Lab (反馈系统控制实验室)',
        caseId: activeCase.id,
        caseTitle: activeCase.title,
        category: activeCase.category,
        feedbackMode: activeCase.type,
        physicalUnit: activeCase.unit,
      },
      systemModel: {
        forwardPlant: activeCase.forwardPlant,
        feedbackGain: activeCase.feedbackGain,
        recommendedPid: caseSimulation.pid,
        closedLoopTransferFunction: {
          numerator: caseSimulation.sim.closedLoopTf.numerator,
          denominator: caseSimulation.sim.closedLoopTf.denominator,
        },
        poles: caseSimulation.poles,
        zeros: caseSimulation.zeros,
      },
      performanceMetrics: {
        timeDomain: caseSimulation.sim.metrics,
        frequencyDomain: caseSimulation.freq.metrics,
      },
      timeSeriesPoints: caseSimulation.sim.points,
      bodeCurvePoints: caseSimulation.freq.bodePoints,
    };

    const jsonStr = JSON.stringify(fullDataset, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `feedback_lab_dataset_${activeCase.id}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Generate 6-section analytical Markdown report
  const reportMarkdown = useMemo(() => {
    const { plantTf, pid, sim, freq, poles, zeros } = caseSimulation;
    const isPos = activeCase.type === 'positive';
    const isStable = sim.metrics.stability === 'stable';

    return `# ${activeCase.title} · 控制系统实验数据分析报告

**系统类别**：${activeCase.category}  
**反馈极性**：${isPos ? '正反馈 (Positive Feedback / 偏差自我强化发散)' : '负反馈 (Negative Feedback / 偏差自纠偏稳态平衡)'}  
**评定结论**：${isStable ? '渐近稳定 (Asymptotically Stable)' : '失稳发散 (Unstable / Exponential Runaway)'}  
**报告生成日期**：${new Date().toLocaleDateString('zh-CN')}

---

## 第 1 部分：系统概述与物理工程背景 (Executive Summary & Physical Background)
- **物理现象描述**：${activeCase.description}
- **核心控制机理**：
${activeCase.mechanism.map((m, i) => `  ${i + 1}. ${m}`).join('\n')}
- **物理量纲对照**：
  - 基准设定量：${activeCase.referenceLabel}（目标值: ${activeCase.defaultRef} ${activeCase.unit}）
  - 被控输出量：${activeCase.outputLabel}
  - 外部扰动源：${activeCase.disturbanceLabel}（额定扰动量: ${activeCase.defaultDisturbance} ${activeCase.unit}）

---

## 第 2 部分：系统动力学与数学建模 (System Dynamics & Mathematical Model)
- **受控对象开环传递函数 G(s)**：
  $$G(s) = \\frac{${formatPolynomial(plantTf.numerator)}}{${formatPolynomial(plantTf.denominator)}} \\cdot e^{-${plantTf.delay}s}$$
- **控制器 C(s)**：
  PID 参数整定值：$K_p = ${pid.kp}$， $K_i = ${pid.ki}$， $K_d = ${pid.kd}$，微分滤波系数 $N = ${pid.filterCoeffN}$。
- **反馈通道 H(s)**：增益 $K_h = ${activeCase.feedbackGain}$
- **闭环特征传递函数 T(s)**：
  $$T(s) = \\frac{C(s)G(s)}{1 ${isPos ? '-' : '+'} C(s)G(s)H(s)} = \\frac{${formatPolynomial(sim.closedLoopTf.numerator)}}{${formatPolynomial(sim.closedLoopTf.denominator)}}$$

---

## 第 3 部分：零极点分布与稳定性严谨判据 (Poles-Zeros Distribution & Stability Criteria)
- **闭环极点分布 (Closed-Loop Poles)**：
${poles.map((p, idx) => `  - 极点 $s_${idx + 1} = ${p.real >= 0 ? '+' : ''}${p.real}${p.imag !== 0 ? ` ${p.imag >= 0 ? '+' : '-'} ${Math.abs(p.imag)}j` : ''}$ (${p.real < 0 ? '位于左半平面 LHP · 衰减收敛' : '位于右半平面 RHP · 发散失稳'})`).join('\n')}
- **李雅普诺夫第一法判据**：
  ${
    isPos
      ? '由于反馈综合点为同相相加（减号特征方程 $1 - L(s) = 0$），闭环极点被牵引穿过虚轴，落入复平面右半平面（RHP），系统在平衡点处不具备李雅普诺夫渐近稳定性，微小扰动即引发雪崩式发散。'
      : '所有闭环极点实部均严格小于零（$\\text{Re}(p_i) < 0$），完全落入复平面左半平面（LHP），满足李雅普诺夫渐近稳定充要条件。'
  }

---

## 第 4 部分：时域动态品质与抗扰能力分析 (Time-Domain Transient & Disturbance Analysis)
- **阶跃响应瞬态性能指标**：
  - **最大超调量 (Overshoot $\\sigma\\%$)**：${sim.metrics.overshoot > 500 ? '∞ (发散无峰值)' : `${sim.metrics.overshoot}%`}
  - **上升时间 (Rise Time $T_r$)**：${sim.metrics.riseTime} 秒
  - **调节时间 (Settling Time $T_s$, $\\pm 2\\%$)**：${sim.metrics.settlingTime} 秒
  - **峰值时间 (Peak Time $T_p$)**：${sim.metrics.peakTime} 秒
  - **稳态静差 (Steady-State Error $e_{ss}$)**：${sim.metrics.steadyStateError}
- **抗外加扰动恢复能力**：
  在 $t = 5.0\\text{s}$ 注入幅度为 $d = ${activeCase.defaultDisturbance}$ 的阶跃扰动。${
    isPos
      ? '正反馈回路对扰动产生自增强雪崩效应，扰动被同相持续放大，无法自我复归。'
      : '负反馈环路通过误差反向抵消作用，迅速抵抗外界冲击并将偏差抑制归零，展现出优良的动态刚度。'
  }

---

## 第 5 部分：频域特性与稳定裕度评估 (Frequency-Domain Bode & Stability Margins)
- **相位裕度 (Phase Margin $P_m$)**：${freq.metrics.phaseMarginDeg !== null ? `${freq.metrics.phaseMarginDeg}°` : '无有效穿越 (失稳)'}
- **幅值裕度 (Gain Margin $G_m$)**：${freq.metrics.gainMarginDb !== null ? `${freq.metrics.gainMarginDb} dB` : '∞ (无限裕度)'}
- **剪切交越频率 (Gain Crossover $\\omega_{cg}$)**：${freq.metrics.gainCrossoverFreq !== null ? `${freq.metrics.gainCrossoverFreq} rad/s` : 'N/A'}
- **相位交越频率 (Phase Crossover $\\omega_{cp}$)**：${freq.metrics.phaseCrossoverFreq !== null ? `${freq.metrics.phaseCrossoverFreq} rad/s` : 'N/A'}
- **闭环估计频宽**：${freq.metrics.bandwidth ? `${freq.metrics.bandwidth} rad/s` : '优良'}

---

## 第 6 部分：工程安全规范与调优策略建议 (Engineering Safety Standards & Tuning Guidelines)
1. **执行机构物理限幅与抗积分饱和 (Anti-Windup)**：
   物理执行器（如加热器功率、音频功放电压、生物激素分泌速率）存在饱和极限。积分项必须配置限幅钳位，防止大阶跃下严重滞后拖尾。
2. **纯迟延裕度保护**：
   当前纯迟延 $\\tau = ${plantTf.delay}\\text{s}$ 会引入负相移 $\\Delta\\phi = -\\omega\\tau$。在提高控制器增益时，必须保证相位裕度 $P_m \\ge 45^\\circ$ 以防诱发极限环自激啸叫。
3. **微分高频滤波规范**：
   必须配置微分滤波系数 $N = ${pid.filterCoeffN}$，有效隔离传感器高频量化与电磁白噪声，杜绝执行机构高频磨损抖动。
`;
  }, [activeCase, caseSimulation]);

  // Copy full report
  const handleCopyReport = () => {
    navigator.clipboard.writeText(reportMarkdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Download Markdown report
  const handleDownloadReport = () => {
    const blob = new Blob([reportMarkdown], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `feedback_lab_report_${activeCase.id}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const getCaseIcon = (id: string) => {
    switch (id) {
      case 'greenhouse':
        return <Sun className="w-4 h-4 text-amber-600" />;
      case 'audio_screech':
        return <Mic className="w-4 h-4 text-rose-600" />;
      case 'thermostat':
        return <Thermometer className="w-4 h-4 text-emerald-600" />;
      case 'glucose':
        return <HeartPulse className="w-4 h-4 text-indigo-600" />;
      default:
        return <Gauge className="w-4 h-4 text-slate-600" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Sliced Header */}
      <div className="p-6 rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-1">
              <span>实验成果报告与原始数据</span>
              <span>·</span>
              <span>4 大案例数据下载与 6 部分专业报告预览</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              数据报告 (Data Report)
            </h2>
            <p className="text-sm text-slate-600 mt-1 max-w-3xl">
              提供 4 大经典案例（温室效应、声学啸叫、恒温箱、血糖自稳态）的全流程实验数据导出。支持 CSV/JSON 原始时序下载，并提供包含最少 6 个核心部分的专业学术级实验报告预览与导出。
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyReport}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-1.5 shadow-2xs"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? '已复制' : '复制完整报告'}</span>
            </button>
            <button
              onClick={handleDownloadReport}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-1.5 shadow-2xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>下载报告 (.md)</span>
            </button>
            <button
              onClick={() => window.print()}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition-colors flex items-center gap-1.5 shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>打印 / 导出 PDF</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4 Cases Sliced Selection Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {CASE_STUDIES.map((c) => {
          const isSelected = c.id === selectedCaseId;
          const isPos = c.type === 'positive';
          return (
            <div
              key={c.id}
              onClick={() => setSelectedCaseId(c.id)}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                isSelected
                  ? isPos
                    ? 'border-rose-400 bg-rose-50/20 shadow-xs'
                    : 'border-emerald-400 bg-emerald-50/20 shadow-xs'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-slate-100">{getCaseIcon(c.id)}</div>
                  <span className="text-xs font-bold text-slate-900">{c.title.split('·')[0]}</span>
                </div>
                <span
                  className={`text-3xs font-bold px-1.5 py-0.5 rounded ${
                    isPos ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  {isPos ? '正反馈' : '负反馈'}
                </span>
              </div>
              <p className="text-2xs text-slate-500 line-clamp-1">{c.subtitle}</p>
            </div>
          );
        })}
      </div>

      {/* Raw Data Downloads & Report Tools Slice */}
      <div className="p-6 rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold text-slate-900">{activeCase.title}</span>
              <span className="text-2xs text-slate-400 font-mono">({activeCase.category})</span>
            </div>
            <p className="text-xs text-slate-500">
              对应原始仿真时序采样共 600+ 离散采样点，包含基准值、输出量、偏差值、控制冲量及外加扰动。
            </p>
          </div>

          {/* Raw Data Download Options */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleDownloadCsv}
              className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-emerald-50 border border-emerald-300 text-emerald-800 hover:bg-emerald-100 transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
              title="下载标准 CSV 格式时序数据，支持 Excel, Origin, Python Pandas 读取"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>下载原始数据 (.csv)</span>
            </button>

            <button
              onClick={handleDownloadJson}
              className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-indigo-50 border border-indigo-300 text-indigo-800 hover:bg-indigo-100 transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
              title="下载完整 JSON 格式工程数据集，包含模型结构与零极点"
            >
              <FileCode className="w-4 h-4 text-indigo-600" />
              <span>下载结构化数据集 (.json)</span>
            </button>

            <button
              onClick={() => onLoadCase(activeCase)}
              className="px-3.5 py-2 text-xs font-semibold rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>载入此案例至工作台</span>
            </button>
          </div>
        </div>

        {/* Report Preview Switcher (Formatted Preview vs Markdown Source) */}
        <div className="flex items-center justify-between pt-4 pb-2">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-900" />
            <h3 className="text-sm font-bold text-slate-900">
              案例数据报告预览（共 6 个核心部分）
            </h3>
          </div>

          <div className="flex items-center p-1 rounded-lg border border-slate-200 bg-slate-100 text-xs">
            <button
              onClick={() => setPreviewMode('formatted')}
              className={`px-3 py-1 font-medium rounded-md transition-all flex items-center gap-1.5 ${
                previewMode === 'formatted'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>报告排版预览</span>
            </button>
            <button
              onClick={() => setPreviewMode('markdown')}
              className={`px-3 py-1 font-medium rounded-md transition-all flex items-center gap-1.5 ${
                previewMode === 'markdown'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Markdown 源码</span>
            </button>
          </div>
        </div>

        {/* Report Preview Content */}
        {previewMode === 'formatted' ? (
          <div className="mt-4 p-8 rounded-2xl border border-slate-200 bg-white space-y-8 select-text text-slate-800">
            {/* Title Block */}
            <div className="border-b border-slate-200 pb-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <span className="text-2xs font-mono font-bold uppercase tracking-wider text-slate-400">
                    Feedback Lab Official Technical Report
                  </span>
                  <h1 className="text-2xl font-bold text-slate-900 mt-1">
                    {activeCase.title} · 控制系统实验数据分析报告
                  </h1>
                  <p className="text-xs text-slate-500 mt-1 font-medium">
                    {activeCase.subtitle} · 仿真域时间步长: dt = 0.02s
                  </p>
                </div>

                <div className="text-right font-mono text-2xs text-slate-400 space-y-0.5">
                  <div>报告编号: FL-RPT-{activeCase.id.toUpperCase()}</div>
                  <div>归档状态: 实验仿真有效</div>
                </div>
              </div>
            </div>

            {/* Section 1: Executive Summary */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                <span className="w-6 h-6 rounded-md bg-slate-100 text-slate-800 flex items-center justify-center font-bold text-xs">
                  1
                </span>
                <h2 className="text-base font-bold text-slate-900">
                  第 1 部分：系统概述与物理工程背景 (Executive Summary & Physical Background)
                </h2>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed">
                {activeCase.description}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2 text-xs">
                  <span className="font-bold text-slate-800 block text-2xs">物理演变链条：</span>
                  {activeCase.mechanism.map((m, i) => (
                    <div key={i} className="flex items-start gap-2 text-2xs text-slate-600">
                      <span className="font-mono font-bold text-slate-400">{i + 1}.</span>
                      <span>{m}</span>
                    </div>
                  ))}
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2 text-xs">
                  <span className="font-bold text-slate-800 block text-2xs">工程物理量纲映射：</span>
                  <div className="space-y-1.5 text-2xs text-slate-600">
                    <div>• <strong>基准设定量:</strong> {activeCase.referenceLabel} ({activeCase.defaultRef} {activeCase.unit})</div>
                    <div>• <strong>被控输出端:</strong> {activeCase.outputLabel} ({activeCase.unit})</div>
                    <div>• <strong>外部扰动输入:</strong> {activeCase.disturbanceLabel} (幅值: {activeCase.defaultDisturbance})</div>
                    <div>• <strong>反馈极性:</strong> {activeCase.type === 'positive' ? '正反馈 (放大偏差引发雪崩)' : '负反馈 (抑制偏差维持稳态)'}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: Mathematical Model */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                <span className="w-6 h-6 rounded-md bg-slate-100 text-slate-800 flex items-center justify-center font-bold text-xs">
                  2
                </span>
                <h2 className="text-base font-bold text-slate-900">
                  第 2 部分：系统动力学与数学建模 (System Dynamics & Mathematical Model)
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2">
                  <span className="font-sans font-bold text-slate-800 text-2xs block">
                    受控对象开环传递函数 G(s):
                  </span>
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200 font-bold text-slate-900 text-center">
                    G(s) = {formatPolynomial(caseSimulation.plantTf.numerator)} / [{formatPolynomial(caseSimulation.plantTf.denominator)}]
                    {caseSimulation.plantTf.delay > 0 && ` · e^(-${caseSimulation.plantTf.delay}s)`}
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2">
                  <span className="font-sans font-bold text-slate-800 text-2xs block">
                    闭环系统传递函数 T(s):
                  </span>
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200 font-bold text-slate-900 text-center">
                    T(s) = {formatPolynomial(caseSimulation.sim.closedLoopTf.numerator)} / [{formatPolynomial(caseSimulation.sim.closedLoopTf.denominator)}]
                  </div>
                </div>
              </div>
            </div>

            {/* Section 3: Poles-Zeros & Stability */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                <span className="w-6 h-6 rounded-md bg-slate-100 text-slate-800 flex items-center justify-center font-bold text-xs">
                  3
                </span>
                <h2 className="text-base font-bold text-slate-900">
                  第 3 部分：零极点分布与稳定性严谨判据 (Poles-Zeros Distribution & Stability Criteria)
                </h2>
              </div>
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-left text-2xs font-mono">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-3">极点序号</th>
                      <th className="py-2 px-3">复坐标 s = σ ± jω</th>
                      <th className="py-2 px-3 font-sans">分布区域</th>
                      <th className="py-2 px-3 font-sans">李雅普诺夫判据结论</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {caseSimulation.poles.map((p, idx) => (
                      <tr key={idx}>
                        <td className="py-2 px-3 font-bold text-slate-900">Pole s_{idx + 1}</td>
                        <td className="py-2 px-3 font-bold">
                          {p.real >= 0 ? '+' : ''}{p.real} {p.imag !== 0 ? `${p.imag >= 0 ? '+' : '-'} ${Math.abs(p.imag)}j` : ''}
                        </td>
                        <td className="py-2 px-3 font-sans">
                          <span className={`px-2 py-0.5 rounded font-semibold ${p.real < 0 ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'}`}>
                            {p.real < 0 ? '左半平面 (LHP)' : '右半平面 (RHP)'}
                          </span>
                        </td>
                        <td className="py-2 px-3 font-sans">
                          {p.real < 0 ? '渐近稳定衰减模态' : '指数爆炸发散失稳'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Section 4: Time-Domain Metrics */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                <span className="w-6 h-6 rounded-md bg-slate-100 text-slate-800 flex items-center justify-center font-bold text-xs">
                  4
                </span>
                <h2 className="text-base font-bold text-slate-900">
                  第 4 部分：时域动态品质与抗扰能力分析 (Time-Domain Transient & Disturbance Analysis)
                </h2>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
                <div className="p-3 rounded-xl border border-slate-200 bg-slate-50">
                  <div className="text-3xs text-slate-500">超调量 (Overshoot)</div>
                  <div className="font-mono text-base font-bold text-slate-900 mt-0.5">
                    {caseSimulation.sim.metrics.overshoot > 500 ? '∞ (发散)' : `${caseSimulation.sim.metrics.overshoot}%`}
                  </div>
                </div>
                <div className="p-3 rounded-xl border border-slate-200 bg-slate-50">
                  <div className="text-3xs text-slate-500">上升时间 (Tr)</div>
                  <div className="font-mono text-base font-bold text-slate-900 mt-0.5">
                    {caseSimulation.sim.metrics.riseTime} s
                  </div>
                </div>
                <div className="p-3 rounded-xl border border-slate-200 bg-slate-50">
                  <div className="text-3xs text-slate-500">调节时间 (Ts)</div>
                  <div className="font-mono text-base font-bold text-slate-900 mt-0.5">
                    {caseSimulation.sim.metrics.settlingTime} s
                  </div>
                </div>
                <div className="p-3 rounded-xl border border-slate-200 bg-slate-50">
                  <div className="text-3xs text-slate-500">稳态误差 (Ess)</div>
                  <div className="font-mono text-base font-bold text-slate-900 mt-0.5">
                    {caseSimulation.sim.metrics.steadyStateError}
                  </div>
                </div>
                <div className="p-3 rounded-xl border border-slate-200 bg-slate-50">
                  <div className="text-3xs text-slate-500">峰值时间 (Tp)</div>
                  <div className="font-mono text-base font-bold text-slate-900 mt-0.5">
                    {caseSimulation.sim.metrics.peakTime} s
                  </div>
                </div>
              </div>
            </div>

            {/* Section 5: Frequency-Domain Margins */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                <span className="w-6 h-6 rounded-md bg-slate-100 text-slate-800 flex items-center justify-center font-bold text-xs">
                  5
                </span>
                <h2 className="text-base font-bold text-slate-900">
                  第 5 部分：频域特性与稳定裕度评估 (Frequency-Domain Bode & Stability Margins)
                </h2>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="p-3 rounded-xl border border-slate-200 bg-slate-50">
                  <div className="text-3xs text-slate-500">相位裕度 (Pm)</div>
                  <div className="font-mono text-base font-bold text-slate-900 mt-0.5">
                    {caseSimulation.freq.metrics.phaseMarginDeg !== null ? `${caseSimulation.freq.metrics.phaseMarginDeg}°` : '无穿越'}
                  </div>
                </div>
                <div className="p-3 rounded-xl border border-slate-200 bg-slate-50">
                  <div className="text-3xs text-slate-500">幅值裕度 (Gm)</div>
                  <div className="font-mono text-base font-bold text-slate-900 mt-0.5">
                    {caseSimulation.freq.metrics.gainMarginDb !== null ? `${caseSimulation.freq.metrics.gainMarginDb} dB` : '∞'}
                  </div>
                </div>
                <div className="p-3 rounded-xl border border-slate-200 bg-slate-50">
                  <div className="text-3xs text-slate-500">剪切频率 (ωcg)</div>
                  <div className="font-mono text-base font-bold text-slate-900 mt-0.5">
                    {caseSimulation.freq.metrics.gainCrossoverFreq ? `${caseSimulation.freq.metrics.gainCrossoverFreq} rad/s` : 'N/A'}
                  </div>
                </div>
                <div className="p-3 rounded-xl border border-slate-200 bg-slate-50">
                  <div className="text-3xs text-slate-500">闭环带宽估计</div>
                  <div className="font-mono text-base font-bold text-slate-900 mt-0.5">
                    {caseSimulation.freq.metrics.bandwidth ? `${caseSimulation.freq.metrics.bandwidth} rad/s` : 'N/A'}
                  </div>
                </div>
              </div>
            </div>

            {/* Section 6: Engineering Safety Standards */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                <span className="w-6 h-6 rounded-md bg-slate-100 text-slate-800 flex items-center justify-center font-bold text-xs">
                  6
                </span>
                <h2 className="text-base font-bold text-slate-900">
                  第 6 部分：工程安全规范与调优策略建议 (Engineering Safety Standards & Tuning Guidelines)
                </h2>
              </div>
              <div className="space-y-2 text-xs text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-200">
                <p>
                  1. <strong>执行机构物理限幅与抗积分饱和 (Anti-Windup)</strong>：大信号阶跃会导致阀门或功率放大器达到物理输出极值。必须配置积分限幅或反算跟踪，防止积分器超额累积导致脱饱和拖尾。
                </p>
                <p>
                  2. <strong>纯迟延保护界限</strong>：系统包含纯迟延 τ = {caseSimulation.plantTf.delay} 秒。在提高控制器增益时，必须保证相位裕度 Pm ≥ 45°，避免负相移诱发剧烈极限环自激震荡。
                </p>
                <p>
                  3. <strong>微分高频滤波规范</strong>：必须配合一阶低通滤波使用（$N = {caseSimulation.pid.filterCoeffN}$），切断传感器高频测量噪声对执行机构的冲击。
                </p>
              </div>
            </div>
          </div>
        ) : (
          /* Markdown Raw Source View */
          <div className="mt-4">
            <textarea
              readOnly
              value={reportMarkdown}
              rows={24}
              className="w-full font-mono text-xs p-4 rounded-xl border border-slate-200 bg-slate-950 text-slate-200 leading-relaxed focus:outline-none resize-y selection:bg-slate-700"
            />
          </div>
        )}
      </div>
    </div>
  );
};
