import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Check,
  Compass,
  Cpu,
  Flame,
  Gauge,
  HeartPulse,
  Mic,
  RotateCcw,
  Sparkles,
  Sun,
  Thermometer,
  Zap,
} from 'lucide-react';
import { CASE_STUDIES } from '../../data/cases';
import {
  CaseStudy,
  FeedbackMode,
  PidParameters,
  TransferFunctionModel,
} from '../../types/control';
import { formatPolynomial } from '../../services/controlMath';

interface CaseLibraryProps {
  onLoadCase: (caseStudy: CaseStudy) => void;
  activeFeedbackMode: FeedbackMode;
}

export const CaseLibrary: React.FC<CaseLibraryProps> = ({
  onLoadCase,
  activeFeedbackMode,
}) => {
  const [selectedCaseId, setSelectedCaseId] = useState<string>('greenhouse');
  const activeCase = CASE_STUDIES.find((c) => c.id === selectedCaseId) || CASE_STUDIES[0];

  const getCaseIcon = (id: string) => {
    switch (id) {
      case 'greenhouse':
        return <Sun className="w-5 h-5 text-amber-600" />;
      case 'audio_screech':
        return <Mic className="w-5 h-5 text-rose-600" />;
      case 'thermostat':
        return <Thermometer className="w-5 h-5 text-emerald-600" />;
      case 'glucose':
        return <HeartPulse className="w-5 h-5 text-indigo-600" />;
      default:
        return <Gauge className="w-5 h-5 text-slate-600" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Sliced Header */}
      <div className="p-6 rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-1">
              <span>经典工程与自然系统仿真</span>
              <span>·</span>
              <span>4 大正负反馈原型案例</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              经典案例库 (Case Library)
            </h2>
            <p className="text-sm text-slate-600 mt-1 max-w-3xl">
              理论与工程实践交汇。探索温室效应反照率融化雪崩、声学啸叫同相自激，以及恒温箱抗扰温控与人体血糖胰岛素自稳态。
            </p>
          </div>
        </div>
      </div>

      {/* Sliced Case Selection Tabs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {CASE_STUDIES.map((c) => {
          const isSelected = c.id === selectedCaseId;
          const isPos = c.type === 'positive';
          return (
            <div
              key={c.id}
              onClick={() => setSelectedCaseId(c.id)}
              className={`p-5 rounded-xl border cursor-pointer transition-all ${
                isSelected
                  ? isPos
                    ? 'border-rose-400 bg-rose-50/20 shadow-xs'
                    : 'border-emerald-400 bg-emerald-50/20 shadow-xs'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 rounded-lg bg-slate-100">{getCaseIcon(c.id)}</div>
                <span
                  className={`text-2xs font-bold px-2 py-0.5 rounded ${
                    isPos ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  {isPos ? '正反馈发散' : '负反馈稳态'}
                </span>
              </div>

              <h3 className="text-sm font-bold text-slate-900">{c.title}</h3>
              <p className="text-2xs text-slate-500 mt-1 line-clamp-2">{c.description}</p>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-2xs">
                <span className="text-slate-400 font-medium">{c.category.split('/')[0]}</span>
                <span className="font-semibold text-slate-700 flex items-center gap-1">
                  <span>查看详情</span>
                  <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Case Deep Dive Slice */}
      <div className="p-6 rounded-xl border border-slate-200 bg-white space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span
                className={`text-xs font-bold px-2 py-0.5 rounded ${
                  activeCase.type === 'positive'
                    ? 'bg-rose-100 text-rose-800'
                    : 'bg-emerald-100 text-emerald-800'
                }`}
              >
                {activeCase.type === 'positive' ? '正反馈雪崩机理' : '负反馈稳态调节'}
              </span>
              <span className="text-xs text-slate-400 font-mono">
                {activeCase.category}
              </span>
            </div>
            <h3 className="text-lg font-bold text-slate-900">{activeCase.title}</h3>
            <p className="text-xs text-slate-500 mt-0.5">{activeCase.subtitle}</p>
          </div>

          <button
            onClick={() => onLoadCase(activeCase)}
            className="px-4 py-2 text-xs font-bold rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition-all flex items-center gap-2 shadow-xs self-start"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>载入本案例至实验台 (Load into Lab)</span>
          </button>
        </div>

        {/* Mechanism & Mathematical Model */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Detailed Physics Mechanism */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-slate-800">系统动力学闭环机理解析</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              {activeCase.description}
            </p>

            <div className="space-y-2 pt-2">
              <span className="text-2xs font-semibold text-slate-500">关键演变链路：</span>
              {activeCase.mechanism.map((step, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 flex items-start gap-2"
                >
                  <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-2xs shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <span>{step}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Model Transfer Function & Physical Variables */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-slate-800">控制工程物理参数映射</h4>
            
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3 font-mono text-xs">
              <div>
                <span className="text-slate-500 text-2xs font-sans block mb-1">
                  受控对象传递函数 G(s):
                </span>
                <div className="p-2 bg-white rounded border border-slate-200 text-slate-900 font-bold">
                  {activeCase.forwardPlant.description}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 font-sans text-xs">
                <div className="p-2 bg-white rounded border border-slate-200">
                  <div className="text-2xs text-slate-400">参考设定值量纲:</div>
                  <div className="font-semibold text-slate-800 mt-0.5">
                    {activeCase.referenceLabel} ({activeCase.unit})
                  </div>
                </div>
                <div className="p-2 bg-white rounded border border-slate-200">
                  <div className="text-2xs text-slate-400">主要外部扰动源:</div>
                  <div className="font-semibold text-slate-800 mt-0.5">
                    {activeCase.disturbanceLabel}
                  </div>
                </div>
              </div>

              {activeCase.recommendedPid && (
                <div className="p-2.5 bg-white rounded border border-slate-200 text-2xs font-mono">
                  <span className="text-slate-500 font-sans block mb-1">
                    推荐 PID 整定参数:
                  </span>
                  <div className="flex gap-3 text-slate-900 font-bold">
                    <span>Kp = {activeCase.recommendedPid.kp}</span>
                    <span>Ki = {activeCase.recommendedPid.ki}</span>
                    <span>Kd = {activeCase.recommendedPid.kd}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-2xs text-slate-600 flex items-start gap-2">
              <Compass className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
              <div>
                <strong>实验指导：</strong>点击右上角“载入本案例至实验台”后，可在【时域分析】模块注入扰动测试系统的响应曲线，或在【正负对比】查看如果极性颠倒系统将如何演变。
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
