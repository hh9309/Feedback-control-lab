import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Bot,
  Check,
  CheckCircle2,
  Copy,
  Cpu,
  Eye,
  EyeOff,
  HelpCircle,
  Key,
  Layers,
  Loader2,
  MessageSquare,
  RefreshCw,
  Send,
  Settings,
  Sliders,
  Sparkles,
  Trash2,
  User,
  X,
  Zap,
} from 'lucide-react';
import {
  FeedbackMode,
  PidParameters,
  TimeDomainMetrics,
  TransferFunctionModel,
} from '../../types/control';
import { formatPolynomial, poly } from '../../services/controlMath';

export type LlmModelType = 'gemini-3-flash' | 'deepseek-v4-pro';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  model?: string;
}

interface AiInsightsPanelProps {
  plant: TransferFunctionModel;
  closedLoopTf: TransferFunctionModel;
  feedbackMode: FeedbackMode;
  pidParams: PidParameters;
  setPidParams: React.Dispatch<React.SetStateAction<PidParameters>>;
  metrics: TimeDomainMetrics;
}

export const AiInsightsPanel: React.FC<AiInsightsPanelProps> = ({
  plant,
  closedLoopTf,
  feedbackMode,
  pidParams,
  setPidParams,
  metrics,
}) => {
  // Model & API Key state with persistent storage
  const [apiKey, setApiKey] = useState<string>(() => {
    return localStorage.getItem('feedback_lab_api_key') || '';
  });
  const [selectedModel, setSelectedModel] = useState<LlmModelType>(() => {
    const saved = localStorage.getItem('feedback_lab_model');
    return (saved as LlmModelType) || 'gemini-3-flash';
  });

  // Settings modal visibility
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [tempApiKey, setTempApiKey] = useState(apiKey);
  const [tempModel, setTempModel] = useState<LlmModelType>(selectedModel);
  const [showKeyPassword, setShowKeyPassword] = useState(false);
  const [settingsNotice, setSettingsNotice] = useState<string | null>(null);

  // Diagnosis report state
  const [loading, setLoading] = useState(false);
  const [insightsMarkdown, setInsightsMarkdown] = useState<string | null>(null);
  const [reportError, setReportError] = useState<string | null>(null);
  const [activeSource, setActiveSource] = useState<string>('');

  // Interactive Q&A chat dialog state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 'init-1',
      role: 'assistant',
      content:
        '您好！我是控制工程与系统动力学 AI 专家顾问。您可以向我咨询关于当前系统稳定性判据、超调量消除、频域裕度提升或 PID 参数整定的任何疑问。请在右上角齿轮设置您的 API-Key 后即可开始问答。',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      model: selectedModel,
    },
  ]);
  const [inputQuestion, setInputQuestion] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const poles = poly.findRoots(closedLoopTf.denominator);
  const zeros = poly.findRoots(closedLoopTf.numerator);

  const isKeyConfigured = apiKey.trim().length > 0;

  // Save settings handler
  const handleSaveSettings = () => {
    if (!tempApiKey.trim()) {
      setSettingsNotice('请输入有效的 API-Key 后再确认保存');
      return;
    }
    setApiKey(tempApiKey.trim());
    setSelectedModel(tempModel);
    localStorage.setItem('feedback_lab_api_key', tempApiKey.trim());
    localStorage.setItem('feedback_lab_model', tempModel);
    setSettingsNotice(null);
    setShowSettingsModal(false);
  };

  // Build current system engineering context string
  const buildSystemContext = () => {
    return `
【系统闭环参数矩阵】
- 选用模型: ${selectedModel}
- 反馈极性: ${feedbackMode === 'positive' ? '正反馈 (Positive)' : '负反馈 (Negative)'}
- 被控对象 G(s): ${formatPolynomial(plant.numerator)} / [${formatPolynomial(plant.denominator)}]
- 闭环传递函数 T(s): ${formatPolynomial(closedLoopTf.numerator)} / [${formatPolynomial(closedLoopTf.denominator)}]
- 闭环极点 Poles: ${JSON.stringify(poles)}
- 闭环零点 Zeros: ${JSON.stringify(zeros)}
- 纯迟延时间 Delay: ${plant.delay} 秒
- 控制器 PID 参数: Kp=${pidParams.kp}, Ki=${pidParams.ki}, Kd=${pidParams.kd}, N=${pidParams.filterCoeffN}
- 动态指标: 稳定性=${metrics.stability}, 超调量=${metrics.overshoot}%, 上升时间=${metrics.riseTime}s, 调节时间=${metrics.settlingTime}s, 稳态误差=${metrics.steadyStateError}
    `.trim();
  };

  // Run AI Diagnostic Report
  const fetchInsights = async () => {
    if (!isKeyConfigured) {
      setSettingsNotice('调用大模型前必须先手工输入并确认 API-Key');
      setShowSettingsModal(true);
      return;
    }

    setLoading(true);
    setReportError(null);
    try {
      const res = await fetch('/api/ai/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: selectedModel,
          apiKey: apiKey.trim(),
          feedbackMode,
          transferFunction: `${formatPolynomial(plant.numerator)} / [${formatPolynomial(plant.denominator)}]`,
          closedLoopTf: `${formatPolynomial(closedLoopTf.numerator)} / [${formatPolynomial(closedLoopTf.denominator)}]`,
          poles,
          zeros,
          pidParams,
          metrics,
          delay: plant.delay,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || '诊断请求失败');
      }

      setInsightsMarkdown(data.markdown);
      setActiveSource(data.source || selectedModel);
    } catch (err: any) {
      console.error(err);
      setReportError(err.message || '网络连接或模型响应异常');
    } finally {
      setLoading(false);
    }
  };

  // Send question in Q&A chat dialog
  const handleSendMessage = async (textToSend?: string) => {
    const q = (textToSend || inputQuestion).trim();
    if (!q) return;

    if (!isKeyConfigured) {
      setSettingsNotice('调用大模型回答问题必须先手工输入并确认 API-Key');
      setShowSettingsModal(true);
      return;
    }

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: q,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const newMessages = [...chatMessages, userMsg];
    setChatMessages(newMessages);
    setInputQuestion('');
    setChatLoading(true);
    setChatError(null);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: selectedModel,
          apiKey: apiKey.trim(),
          systemContext: buildSystemContext(),
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || '大模型应答失败');
      }

      const botReply: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        model: selectedModel,
      };

      setChatMessages((prev) => [...prev, botReply]);
    } catch (err: any) {
      console.error(err);
      setChatError(err.message || '模型连接异常');
    } finally {
      setChatLoading(false);
    }
  };

  // Quick prompt questions
  const quickPrompts = [
    '为什么当前系统会发生超调？如何通过调参抑制振荡？',
    '如果把负反馈改成正反馈，闭环极点会如何向右半平面迁移？',
    '当前纯迟延 τ 会造成多大的相位滞后？如何提高相位裕度？',
    '请为当前被控对象推荐一套最佳工程 PID 参数。',
  ];

  // Apply suggested PID tuning
  const handleApplyRecommendedTuning = () => {
    if (metrics.overshoot > 20) {
      setPidParams((prev) => ({
        ...prev,
        kp: Math.max(0.8, Number((prev.kp * 0.7).toFixed(2))),
        kd: Math.min(2.5, Number((prev.kd * 1.5 + 0.3).toFixed(2))),
      }));
    } else if (metrics.steadyStateError > 0.05) {
      setPidParams((prev) => ({
        ...prev,
        ki: Number((prev.ki + 0.5).toFixed(2)),
      }));
    } else {
      setPidParams({
        kp: 1.8,
        ki: 0.8,
        kd: 0.9,
        filterCoeffN: 10,
        antiWindup: true,
      });
    }
  };

  const copyMessageContent = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Sliced Header with Settings Gear Icon on Far Right */}
      <div className="p-6 rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-1">
              <span>系统动力学与大模型推理</span>
              <span>·</span>
              <span>多维稳定性诊断与交互问答</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                AI 智能洞察 (AI Insights)
              </h2>
            </div>
            <p className="text-sm text-slate-600 mt-1 max-w-3xl">
              结合实时传递函数矩阵、零极点几何分布及当前动态响应指标，提供全方位工程诊断报告及大模型交互问答对话。
            </p>
          </div>

          {/* Right Controls: Model Status & Settings Gear Icon */}
          <div className="flex items-center gap-3">
            {/* Model Badge */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-xs">
              <Bot className="w-3.5 h-3.5 text-slate-600" />
              <span className="text-slate-500">模型:</span>
              <span className="font-mono font-semibold text-slate-900">
                {selectedModel === 'gemini-3-flash' ? 'gemini 3 flash' : 'deepseek-v4-pro'}
              </span>
              <span className="text-slate-300">|</span>
              <span
                className={`font-semibold flex items-center gap-1 ${
                  isKeyConfigured ? 'text-emerald-700' : 'text-amber-700'
                }`}
              >
                {isKeyConfigured ? (
                  <>
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>已就绪</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-3 h-3 text-amber-600" />
                    <span>未设 Key</span>
                  </>
                )}
              </span>
            </div>

            {/* Run Diagnostic Button */}
            <button
              onClick={fetchInsights}
              disabled={loading}
              className="px-4 py-2 text-xs font-bold rounded-lg bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50 transition-all flex items-center gap-2 shadow-xs cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>正在深度推理...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>一键启动 AI 诊断</span>
                </>
              )}
            </button>

            {/* Small Gear Settings Icon on Far Right */}
            <button
              onClick={() => {
                setTempApiKey(apiKey);
                setTempModel(selectedModel);
                setShowSettingsModal(true);
              }}
              className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-900 transition-colors shadow-2xs cursor-pointer"
              title="大模型设置：手工输入 API-Key 与选择模型 (Gemini 3 Flash / DeepSeek-V4 Pro)"
              aria-label="设置大模型"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Snapshot Metrics Slice */}
      <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/80 flex flex-wrap items-center justify-between gap-4 text-xs font-mono">
        <div className="flex items-center gap-2">
          <span className="text-slate-500 font-sans">当前大模型:</span>
          <span className="text-slate-900 font-bold bg-white px-2 py-0.5 rounded border border-slate-200">
            {selectedModel}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-slate-500 font-sans">闭环极点:</span>
          <span className="text-slate-800">
            {poles.map((p) => `${p.real > 0 ? '+' : ''}${p.real}`).join(', ')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-slate-500 font-sans">超调量:</span>
          <span className="text-slate-800 font-bold">{metrics.overshoot}%</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-slate-500 font-sans">PID:</span>
          <span className="text-slate-800">
            Kp={pidParams.kp}, Ki={pidParams.ki}, Kd={pidParams.kd}
          </span>
        </div>
      </div>

      {/* Main 2-Column Layout: Diagnostic Report (Left) & Q&A Chat Dialog (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: AI Diagnosis Report (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {reportError && (
            <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/50 text-rose-800 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>诊断报告生成异常: {reportError}</span>
            </div>
          )}

          {insightsMarkdown ? (
            <div className="p-6 rounded-xl border border-slate-200 bg-white space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 text-xs">
                <div className="flex items-center gap-2">
                  <Bot className="w-4 h-4 text-slate-700" />
                  <span className="font-bold text-slate-900">控制理论专家诊断报告</span>
                  <span className="text-2xs text-slate-400 font-mono">({activeSource})</span>
                </div>

                <button
                  onClick={handleApplyRecommendedTuning}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-50 border border-emerald-300 text-emerald-800 hover:bg-emerald-100 transition-colors flex items-center gap-1.5 shadow-2xs"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>采纳 AI 调优建议参数</span>
                </button>
              </div>

              {/* Markdown Content */}
              <div className="prose prose-slate max-w-none text-xs leading-relaxed space-y-4">
                {insightsMarkdown.split('\n\n').map((paragraph, idx) => {
                  if (paragraph.startsWith('###') || paragraph.startsWith('####')) {
                    return (
                      <h4 key={idx} className="text-sm font-bold text-slate-900 pt-2 border-b border-slate-100 pb-1">
                        {paragraph.replace(/^[#]+\s*/, '')}
                      </h4>
                    );
                  }
                  if (paragraph.startsWith('- ') || paragraph.startsWith('* ')) {
                    const items = paragraph.split('\n');
                    return (
                      <ul key={idx} className="space-y-1.5 pl-4 list-disc text-slate-700">
                        {items.map((it, iIdx) => (
                          <li key={iIdx}>{it.replace(/^[-*]\s*/, '')}</li>
                        ))}
                      </ul>
                    );
                  }
                  return (
                    <p key={idx} className="text-slate-700">
                      {paragraph}
                    </p>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="p-10 rounded-xl border border-dashed border-slate-300 bg-white text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mx-auto">
                <Sparkles className="w-6 h-6 text-slate-400" />
              </div>
              <div className="text-sm font-bold text-slate-800">暂未生成全景诊断报告</div>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                点击上方“一键启动 AI 诊断”按钮，大模型将自动读取当前零极点坐标、反馈极性、时域裕度并输出深度结构化分析与调优参数。
              </p>
              <button
                onClick={fetchInsights}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition-colors inline-block"
              >
                立即生成系统诊断
              </button>
            </div>
          )}
        </div>

        {/* Right: Interactive Q&A Chat Dialog (5 cols) */}
        <div className="lg:col-span-5 p-6 rounded-xl border border-slate-200 bg-white flex flex-col justify-between space-y-4">
          {/* Dialog Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-slate-700" />
              <h3 className="text-sm font-bold text-slate-900">大模型回答问题对话框</h3>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() =>
                  setChatMessages([
                    {
                      id: `init-${Date.now()}`,
                      role: 'assistant',
                      content: '对话记录已清空。您可以继续针对当前闭环系统提出新的控制理论问题。',
                      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                      model: selectedModel,
                    },
                  ])
                }
                className="text-2xs text-slate-500 hover:text-slate-800 flex items-center gap-1"
                title="清空对话记录"
              >
                <Trash2 className="w-3 h-3" />
                <span>清空</span>
              </button>
            </div>
          </div>

          {/* Chat Messages Stream */}
          <div className="flex-1 space-y-3 overflow-y-auto max-h-[460px] pr-1 select-text">
            {chatMessages.map((msg) => {
              const isUser = msg.role === 'user';
              return (
                <div
                  key={msg.id}
                  className={`flex gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  {!isUser && (
                    <div className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold">
                      AI
                    </div>
                  )}

                  <div
                    className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-xs leading-relaxed ${
                      isUser
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-800 border border-slate-200'
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{msg.content}</div>

                    <div
                      className={`flex items-center justify-between gap-3 text-3xs mt-1.5 pt-1 border-t ${
                        isUser ? 'border-slate-800 text-slate-400' : 'border-slate-200 text-slate-500'
                      }`}
                    >
                      <span>{msg.timestamp}</span>
                      {!isUser && (
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono">{msg.model || selectedModel}</span>
                          <button
                            onClick={() => copyMessageContent(msg.id, msg.content)}
                            className="hover:text-slate-900"
                            title="复制内容"
                          >
                            {copiedId === msg.id ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {isUser && (
                    <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold">
                      <User className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>
              );
            })}

            {chatLoading && (
              <div className="flex gap-2.5 items-center text-xs text-slate-500 py-1">
                <Loader2 className="w-4 h-4 animate-spin text-slate-700" />
                <span>正在组织专业控制理论答复...</span>
              </div>
            )}

            {chatError && (
              <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-2xs flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-rose-600" />
                <span>{chatError}</span>
              </div>
            )}
          </div>

          {/* Quick Prompts Chips */}
          <div className="space-y-1.5 pt-2 border-t border-slate-100">
            <span className="text-3xs font-semibold text-slate-400 block">快捷提问建议:</span>
            <div className="flex flex-wrap gap-1.5">
              {quickPrompts.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(p)}
                  disabled={chatLoading}
                  className="px-2 py-1 rounded bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-3xs transition-colors text-left truncate max-w-full"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Input Box & Submit Button */}
          <div className="relative flex items-center gap-2 pt-1">
            <textarea
              rows={2}
              value={inputQuestion}
              onChange={(e) => setInputQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder={
                isKeyConfigured
                  ? '输入控制理论或调参问题 (按 Enter 发送)...'
                  : '请先在右上角 ⚙️ 输入并确认 API-Key 后提问'
              }
              className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-1 focus:ring-slate-900 resize-none leading-relaxed"
            />
            <button
              onClick={() => handleSendMessage()}
              disabled={chatLoading || !inputQuestion.trim()}
              className="h-14 px-4 rounded-xl bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-40 transition-colors flex items-center justify-center shrink-0 shadow-xs cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Modal: 大模型设置与 API-Key 手工输入 */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-white border border-slate-200 shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-slate-800" />
                <h3 className="text-base font-bold text-slate-900">大模型与 API-Key 设置</h3>
              </div>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Error or Alert Notice */}
            {settingsNotice && (
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>{settingsNotice}</span>
              </div>
            )}

            {/* Step 1: 手工输入 API-Key */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-800">
                1. 手工输入 API-Key:
              </label>
              <div className="relative">
                <input
                  type={showKeyPassword ? 'text' : 'password'}
                  value={tempApiKey}
                  onChange={(e) => {
                    setTempApiKey(e.target.value);
                    if (settingsNotice) setSettingsNotice(null);
                  }}
                  placeholder="在此输入您的 API 密钥 (如 AIzaSy... 或 sk-...)"
                  className="w-full pl-9 pr-10 py-2.5 text-xs font-mono rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
                <Key className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <button
                  type="button"
                  onClick={() => setShowKeyPassword(!showKeyPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-700"
                >
                  {showKeyPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-3xs text-slate-500 leading-relaxed">
                💡 部署提示：项目部署至 GitHub 静态托管后，所有大模型调用均由浏览器直接携带您在此处输入的 API-Key 调用，数据仅留存于本地 LocalStorage。
              </p>
            </div>

            {/* Step 2: 选择两个大模型 */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-800">
                2. 选择大模型 (支持两种高性能模型):
              </label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setTempModel('gemini-3-flash')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    tempModel === 'gemini-3-flash'
                      ? 'border-slate-900 bg-slate-50 font-bold shadow-xs'
                      : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="font-mono text-sm text-slate-900">gemini 3 flash</div>
                  <div className="text-3xs text-slate-500 mt-1">Google 高性能控制推理</div>
                </button>

                <button
                  type="button"
                  onClick={() => setTempModel('deepseek-v4-pro')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    tempModel === 'deepseek-v4-pro'
                      ? 'border-slate-900 bg-slate-50 font-bold shadow-xs'
                      : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="font-mono text-sm text-slate-900">deepseek-v4-pro</div>
                  <div className="text-3xs text-slate-500 mt-1">DeepSeek 深度逻辑诊断</div>
                </button>
              </div>
            </div>

            {/* Step 3: 确认大模型与保存 */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className="px-3 py-2 text-xs font-medium rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleSaveSettings}
                className="px-4 py-2 text-xs font-bold rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition-all flex items-center gap-1.5 shadow-xs"
              >
                <Check className="w-3.5 h-3.5" />
                <span>3. 确认大模型与保存配置</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
