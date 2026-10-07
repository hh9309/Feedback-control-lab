/**
 * Client-Side LLM Service for Browser & GitHub Pages Deployment
 * Directly calls Google Gemini REST API & DeepSeek API from the browser
 * with graceful fallback and strict Content-Type checking to prevent
 * "Unexpected token '<', '<!DOCTYPE '... is not valid JSON" errors.
 */

export type LlmModelType = 'gemini-3-flash' | 'deepseek-v4-pro';

export interface DiagnosticRequestParams {
  model: LlmModelType;
  apiKey: string;
  feedbackMode: 'negative' | 'positive';
  transferFunction: string;
  closedLoopTf: string;
  poles: { real: number; imag: number }[];
  zeros: { real: number; imag: number }[];
  pidParams: { kp: number; ki: number; kd: number; filterCoeffN?: number };
  metrics: {
    stability: string;
    overshoot: number;
    riseTime: number;
    settlingTime: number;
    steadyStateError: number;
  };
  delay?: number;
}

export interface ChatMessageParam {
  role: 'user' | 'assistant';
  content: string;
}

// Build standard diagnostic prompt for control system
export function buildDiagnosticPrompt(params: DiagnosticRequestParams): string {
  const {
    model,
    feedbackMode,
    transferFunction,
    closedLoopTf,
    poles,
    zeros,
    pidParams,
    metrics,
    delay = 0,
  } = params;

  return `你是一位资深控制理论专家与控制系统架构师。
请对用户当前在 Feedback Lab (反馈系统控制实验室) 中配置的控制系统进行全方位工程诊断与智能洞察：

【当前系统配置】
- 选用大模型: ${model}
- 反馈模式: ${feedbackMode === 'positive' ? '正反馈 (Positive Feedback / 偏差累积放大)' : '负反馈 (Negative Feedback / 偏差负反馈抑制)'}
- 被控对象 G(s): ${transferFunction || '未指定'}
- 闭环传递函数 T(s): ${closedLoopTf || '未指定'}
- 系统极点 (Poles): ${JSON.stringify(poles || [])}
- 系统零点 (Zeros): ${JSON.stringify(zeros || [])}
- 纯迟延时间 (Delay τ): ${delay} 秒
- PID 控制器参数: Kp=${pidParams?.kp ?? '-'}, Ki=${pidParams?.ki ?? '-'}, Kd=${pidParams?.kd ?? '-'}
- 时域动态品质指标:
  - 稳定性判据: ${metrics?.stability || '未知'}
  - 超调量 (Overshoot): ${metrics?.overshoot !== undefined ? metrics.overshoot + '%' : '-'}
  - 上升时间 (Rise Time Tr): ${metrics?.riseTime !== undefined ? metrics.riseTime + 's' : '-'}
  - 调节时间 (Settling Time Ts): ${metrics?.settlingTime !== undefined ? metrics.settlingTime + 's' : '-'}
  - 稳态误差 (Steady-state Error Ess): ${metrics?.steadyStateError !== undefined ? metrics.steadyStateError : '-'}

请输出结构清晰、专业严密的 Markdown 报告，包含以下五个板块：
1. **系统稳定性与主导极点判据**：根据零极点在 s 平面分布（虚轴左右侧）与李雅普诺夫第一法，剖析系统发散/收敛/临界震荡机理。
2. **时域动态品质与振荡根源诊断**：解析超调量大小、阻尼比与固有频率、振荡衰减速率或指数发散特性的物理成因。
3. **正/负反馈机制的内在作用**：阐明当前反馈极性在偏差抑制或雪崩正反馈中的本质影响。
4. **PID 参数与频域裕度优化建议**：给出具体的 Kp、Ki、Kd 调整方向及推荐数值，说明抑制超调、加速响应或消除稳态误差的权衡方案。
5. **工程实际映射与安全防范**：联系真实工业或自然界类似系统（如执行器饱和、迟延引发自激振荡、温漂防范等），提出工程鲁棒性建议。

请使用精炼、专业且富于启发性的简体中文，突出核心公式和重点参数。`;
}

// Direct client-side call to Google Gemini REST API
async function callGeminiDirect(prompt: string, apiKey: string): Promise<string> {
  const cleanKey = apiKey.trim();
  // Models to try in order of preference
  const candidateModels = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];
  let lastError = '';

  for (const modelName of candidateModels) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${encodeURIComponent(cleanKey)}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature: 0.6,
            maxOutputTokens: 2500,
          },
        }),
      });

      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        const text = await res.text();
        throw new Error(`Google API 返回非 JSON 数据: ${text.slice(0, 100)}`);
      }

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || `HTTP ${res.status}: 请求失败`);
      }

      const generated = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (generated) {
        return generated;
      }
    } catch (err: any) {
      lastError = err.message || String(err);
      console.warn(`[Gemini API] ${modelName} 调用重试:`, lastError);
    }
  }

  throw new Error(`Gemini API 响应异常: ${lastError}`);
}

// Direct client-side call to DeepSeek API
async function callDeepSeekDirect(
  messages: { role: string; content: string }[],
  apiKey: string
): Promise<string> {
  const cleanKey = apiKey.trim();
  const url = 'https://api.deepseek.com/chat/completions';

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${cleanKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages,
        temperature: 0.6,
      }),
    });

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      const text = await res.text();
      throw new Error(`DeepSeek API 返回非 JSON 数据: ${text.slice(0, 100)}`);
    }

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error?.message || data.message || `HTTP ${res.status}`);
    }

    const reply = data.choices?.[0]?.message?.content;
    if (reply) return reply;
    throw new Error('DeepSeek 未返回有效文本');
  } catch (err: any) {
    if (err.message?.includes('Failed to fetch') || err.name === 'TypeError') {
      throw new Error(
        'DeepSeek API 受到浏览器 CORS 限制或网络不可达。若在纯静态环境运行，建议切换为 Gemini 3 Flash 模型直接调用。'
      );
    }
    throw err;
  }
}

// Attempt local backend proxy safely (returns null if not available or returns HTML)
async function callBackendProxySafe(
  endpoint: string,
  payload: any
): Promise<{ success: boolean; data?: any; error?: string } | null> {
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const contentType = res.headers.get('content-type') || '';
    // If it's HTML (e.g. GitHub Pages fallback or Vite SPA fallback), DO NOT parse JSON!
    if (!contentType.includes('application/json')) {
      return null;
    }

    const json = await res.json();
    if (res.ok && json.success) {
      return { success: true, data: json };
    }
    return { success: false, error: json.error };
  } catch {
    return null;
  }
}

// Rule-based heuristic expert diagnostic fallback (guaranteed to never fail)
export function generateHeuristicDiagnosis(params: DiagnosticRequestParams): string {
  const { feedbackMode, poles, metrics, pidParams, delay = 0 } = params;
  const isPositive = feedbackMode === 'positive';
  const hasRhpPoles = Array.isArray(poles) && poles.some((p) => p.real > 0.001);
  const isUnstable = isPositive || hasRhpPoles;

  return `### 控制理论专家诊断报告 (智能工程引擎)

#### 1. 系统稳定性与主导极点判据
- **稳定性结论**：${isUnstable ? '⚠️ 系统处于失稳 / 指数发散状态' : '✅ 系统李雅普诺夫渐近稳定 (Asymptotically Stable)'}
- **极点分布剖析**：${
    isPositive
      ? '系统当前配置为**正反馈模式**。闭环特征方程为 $1 - L(s) = 0$。特征多项式出现减号，消除了固有阻尼，将开环极点强烈牵引进入右半复平面 (RHP, $\\text{Re}(s) > 0$)，时域响应受 $e^{+\\sigma t}$ 支配，发生自激雪崩式发散。'
      : '系统当前配置为**负反馈模式**。闭环特征方程为 $1 + L(s) = 0$。主导闭环极点分布在复平面左半平面 (LHP, $\\text{Re}(s) < 0$)，自然响应模态为衰减正弦波与指数衰减，形成稳态吸引子。'
  }

#### 2. 时域动态品质与振荡根源诊断
- **超调量与阻尼比评估**：当前超调量实测约为 **${metrics?.overshoot ?? 0}%**。${
    (metrics?.overshoot ?? 0) > 20
      ? '超调量明显偏大，表明系统等效阻尼比 $\\zeta < 0.5$。共轭复极点距虚轴过近，储备能量转化为欠阻尼机械或电气剧烈振荡。'
      : '阻尼特性良好，过渡过程平缓收敛。'
  }
- **瞬态时间尺度**：上升时间 $T_r \\approx ${metrics?.riseTime ?? 0.8}s$，调节时间 $T_s \\approx ${metrics?.settlingTime ?? 1.5}s$，稳态静差 $e_{ss} \\approx ${metrics?.steadyStateError ?? 0.01}。

#### 3. 正/负反馈机制的内在作用
- **负反馈自纠偏**：通过比较器计算偏差 $e(t) = r(t) - y(t)$，将外界扰动反向补偿，维持内环境自稳态。
- **纯迟延影响**：当前系统包含纯迟延 $\\tau = ${delay}s$。迟延环节引入附加负相位滞后 $\\Delta\\phi = -\\omega\\tau$，严重吞噬相位裕度，大增益下易激发自激振荡极限环。

#### 4. PID 参数调谐与优化建议
- **比例增益 $K_p$ (当前 ${pidParams?.kp ?? 1})**：${
    (metrics?.overshoot ?? 0) > 20
      ? '建议将 $K_p$ 适度下调 20%~30% (推荐值: ' + ((pidParams?.kp ?? 2) * 0.75).toFixed(2) + ')，以削弱初始冲击峰值。'
      : '当前比例增益处于合理区间，兼顾了快速性与平稳性。'
  }
- **积分环节 $K_i$ (当前 ${pidParams?.ki ?? 0})**：${
    (metrics?.steadyStateError ?? 0) > 0.05
      ? '存在显著静差，应将 $K_i$ 提升至 0.8 ~ 1.2 以彻底消除稳态残差，并开启抗积分饱和 (Anti-Windup)。'
      : '积分作用充分，稳态误差已被抑制在极低水平。'
  }
- **微分环节 $K_d$ (当前 ${pidParams?.kd ?? 0})**：建议将 $K_d$ 调谐至 0.8 ~ 1.2，提供超前相位校正，增加系统瞬态阻尼。

#### 5. 现实工程物理映射与安全防范
- 在真实伺服电机、热工炉膛或飞行器姿态控制中，执行器受供电电压与机械行程限制，必定存在**执行机构物理饱和限幅**。
- 工程应用中务必启用微分低通滤波 ($N = 10$)，防止高频传感器测量白噪声被微分器放大成高频毛刺破坏执行器寿命。`;
}

// Unified client-side execution for Diagnostic Report
export async function executeDiagnosticReport(
  params: DiagnosticRequestParams
): Promise<{ source: string; markdown: string }> {
  const { model, apiKey } = params;
  const prompt = buildDiagnosticPrompt(params);

  // 1. Try local backend proxy first if available (and responds with JSON)
  const proxyResult = await callBackendProxySafe('/api/ai/insights', {
    ...params,
    transferFunction: params.transferFunction,
    closedLoopTf: params.closedLoopTf,
  });

  if (proxyResult && proxyResult.success && proxyResult.data?.markdown) {
    return {
      source: proxyResult.data.source || model,
      markdown: proxyResult.data.markdown,
    };
  }

  // 2. Direct browser call (GitHub Pages / Static Deployment)
  if (apiKey && apiKey.trim().length > 0) {
    try {
      if (model === 'gemini-3-flash') {
        const text = await callGeminiDirect(prompt, apiKey);
        return { source: 'gemini-3-flash (浏览器直接调用)', markdown: text };
      } else {
        const text = await callDeepSeekDirect(
          [
            { role: 'system', content: '你是一位精通控制理论与系统动力学的专家顾问。' },
            { role: 'user', content: prompt },
          ],
          apiKey
        );
        return { source: 'deepseek-v4-pro (浏览器直接调用)', markdown: text };
      }
    } catch (directErr: any) {
      console.warn('Direct LLM API call error:', directErr);
      // If direct call fails (e.g. invalid key or CORS), fallback with clear notice
      const fallbackMarkdown = generateHeuristicDiagnosis(params);
      return {
        source: `${model} (智能工程兜底引擎)`,
        markdown: `> ⚠️ **API 调用提示**：${directErr.message || '大模型未能返回有效内容'}。已自动切换至本地控制理论工程诊断引擎生成报告：\n\n${fallbackMarkdown}`,
      };
    }
  }

  // 3. Fallback to heuristic expert engine if no API key
  return {
    source: '控制工程专家分析引擎',
    markdown: generateHeuristicDiagnosis(params),
  };
}

// Unified client-side execution for Q&A Chat
export async function executeChatQuery(options: {
  model: LlmModelType;
  apiKey: string;
  systemContext: string;
  messages: ChatMessageParam[];
}): Promise<{ source: string; reply: string }> {
  const { model, apiKey, systemContext, messages } = options;

  // 1. Try backend proxy safely first
  const proxyResult = await callBackendProxySafe('/api/ai/chat', {
    model,
    apiKey,
    systemContext,
    messages,
  });

  if (proxyResult && proxyResult.success && proxyResult.data?.reply) {
    return {
      source: proxyResult.data.source || model,
      reply: proxyResult.data.reply,
    };
  }

  // 2. Direct client-side invocation for GitHub Pages
  if (apiKey && apiKey.trim().length > 0) {
    const systemPrompt = `你是一位精通系统动力学、经典与现代控制理论的专家顾问。
用户正在 Feedback Lab (反馈系统控制实验室) 中进行闭环系统实验。
【系统当前物理与数学上下文】：
${systemContext || '通用控制闭环'}

请根据以上系统当前状态，针对用户的控制理论与工程调参问题进行深入浅出、公式严谨、富有工程指导意义的回答。语言使用简体中文。`;

    try {
      if (model === 'gemini-3-flash') {
        const fullPrompt = [
          systemPrompt,
          ...messages.map((m) => `${m.role === 'user' ? '用户提问' : '专家回答'}: ${m.content}`),
        ].join('\n\n');
        const reply = await callGeminiDirect(fullPrompt, apiKey);
        return { source: 'gemini-3-flash (浏览器直接调用)', reply };
      } else {
        const fullMessages = [
          { role: 'system', content: systemPrompt },
          ...messages.map((m) => ({ role: m.role, content: m.content })),
        ];
        const reply = await callDeepSeekDirect(fullMessages, apiKey);
        return { source: 'deepseek-v4-pro (浏览器直接调用)', reply };
      }
    } catch (err: any) {
      console.warn('Direct chat error:', err);
      // Rule-based fallback responder on network error
      const lastQ = messages[messages.length - 1]?.content.toLowerCase() || '';
      let heuristicReply = '';
      if (lastQ.includes('超调') || lastQ.includes('振荡')) {
        heuristicReply = `根据当前系统配置，超调过大的根源通常在于闭环主导极点的阻尼比 $\\zeta < 0.7$。优化建议：
1. **适度下调比例增益 $K_p$**（例如下调 20%~30%），减少初始阶跃冲击峰值；
2. **增大微分作用 $K_d$**，为系统引入超前相位，增加瞬态阻尼力；
3. 检查是否存在纯迟延 $\\tau$，迟延会产生高频负相移，导致等效超调显著恶化。`;
      } else if (lastQ.includes('稳态误差') || lastQ.includes('静差')) {
        heuristicReply = `要消除当前系统的稳态误差 $e_{ss}$，关键在于提升系统的无静差型别（Type 1）：
1. 在控制器中引入**积分项 $K_i$**，积分环节将在误差存在时持续积累控制量，强制将稳态误差归零；
2. 注意开启**抗积分饱和 (Anti-Windup)**，防止大阶跃下积分器超额累积导致退出饱和时的严重滞后超调。`;
      } else if (lastQ.includes('正反馈') || lastQ.includes('发散')) {
        heuristicReply = `正反馈的闭环传递函数分母为 $1 - L(s)$。在根轨迹上，正反馈会将极点牵引穿过虚轴进入复平面右半平面（RHP, $\\text{Re}(s) > 0$）。此时系统的时域自然响应项包含 $e^{\\sigma t}$ ($\\sigma > 0$)，偏差被同相自强化，导致输出呈指数级发散爆炸。`;
      } else {
        heuristicReply = `结合当前拓扑与参数：
- 系统响应主要受主导闭环极点控制；
- 建议根据工况权衡速度与平稳性，对于伺服跟踪宜保持 $\\zeta \\approx 0.707$，对于恒温温控宜加大 $K_i$ 消除静差并配置抗饱和。`;
      }

      return {
        source: '控制工程专家引擎 (兜底)',
        reply: `⚠️ [网络/接口提示: ${err.message}]\n\n${heuristicReply}`,
      };
    }
  }

  throw new Error('请先在右上角齿轮设置中手工输入并确认 API-Key 后再进行提问。');
}
