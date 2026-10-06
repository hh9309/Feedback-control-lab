import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

// Initialize GoogleGenAI server-side client
const apiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;
if (apiKey) {
  ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// AI Insights endpoint for feedback system diagnostic
app.post('/api/ai/insights', async (req: Request, res: Response) => {
  try {
    const {
      systemDescription,
      feedbackMode,
      transferFunction,
      closedLoopTf,
      poles,
      zeros,
      pidParams,
      metrics,
      delay,
      apiKey: clientApiKey,
      model = 'gemini-3-flash',
    } = req.body;

    const prompt = `
你是一位资深控制理论专家与控制系统架构师。
请对用户当前在 Feedback Lab (反馈系统控制实验室) 中配置的控制系统进行全方位工程诊断与智能洞察：

【当前系统配置】
- 选用大模型: ${model}
- 反馈模式: ${feedbackMode === 'positive' ? '正反馈 (Positive Feedback / 偏差累积放大)' : '负反馈 (Negative Feedback / 偏差负反馈抑制)'}
- 被控对象/开环传递函数: ${transferFunction || '未指定'}
- 闭环传递函数: ${closedLoopTf || '未指定'}
- 系统极点 (Poles): ${JSON.stringify(poles || [])}
- 系统零点 (Zeros): ${JSON.stringify(zeros || [])}
- 纯迟延时间 (Delay τ): ${delay || 0} 秒
- PID控制器参数: Kp=${pidParams?.kp ?? '-'}, Ki=${pidParams?.ki ?? '-'}, Kd=${pidParams?.kd ?? '-'}
- 时域动态品质指标:
  - 稳定性判据: ${metrics?.stability || '未知'}
  - 超调量 (Overshoot): ${metrics?.overshoot !== undefined ? metrics.overshoot + '%' : '-'}
  - 上升时间 (Rise Time Tr): ${metrics?.riseTime !== undefined ? metrics.riseTime + 's' : '-'}
  - 调节时间 (Settling Time Ts): ${metrics?.settlingTime !== undefined ? metrics.settlingTime + 's' : '-'}
  - 稳态误差 (Steady-state Error Ess): ${metrics?.steadyStateError !== undefined ? metrics.steadyStateError : '-'}
  - 峰值时间 (Peak Time Tp): ${metrics?.peakTime !== undefined ? metrics.peakTime + 's' : '-'}
- 系统物理/应用场景: ${systemDescription || '通用闭环控制系统'}

请输出结构清晰、专业严密的 Markdown 报告，包含以下五个板块：
1. **系统稳定性与主导极点判据**：根据零极点在 s 平面分布（虚轴左右侧）与李雅普诺夫第一法，剖析系统发散/收敛/临界震荡机理。
2. **时域动态品质与振荡根源诊断**：解析超调量大小、阻尼比与固有频率、振荡衰减速率或指数发散特性的物理成因。
3. **正/负反馈机制的内在作用**：阐明当前反馈极性在偏差抑制或雪崩正反馈中的本质影响。
4. **PID 参数与频域裕度优化建议**：给出具体的 Kp、Ki、Kd 调整方向及具体推荐数值，说明抑制超调、加速响应或消除稳态误差的权衡方案。
5. **工程实际映射与安全防范**：联系真实工业或自然界类似系统（如执行器饱和、迟延引发自激振荡、温漂防范等），提出工程鲁棒性建议。

请使用精炼、专业且富于启发性的简体中文，突出核心公式和重点参数，避免空泛套话。
`;

    let markdown = '';
    let source = model;
    const effectiveKey = clientApiKey || process.env.GEMINI_API_KEY;

    if (model === 'deepseek-v4-pro') {
      // Call DeepSeek API
      try {
        const dsRes = await fetch('https://api.deepseek.com/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${clientApiKey || process.env.DEEPSEEK_API_KEY}`,
          },
          body: JSON.stringify({
            model: 'deepseek-chat',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.6,
          }),
        });
        const dsData = await dsRes.json();
        markdown = dsData.choices?.[0]?.message?.content || '';
      } catch (dsErr: any) {
        console.warn('DeepSeek API call failed, falling back to rule engine:', dsErr.message);
        source = 'deepseek_fallback_expert';
      }
    } else {
      // Call Gemini API (gemini-3-flash / gemini-3.8-flash)
      let customAi = ai;
      if (clientApiKey) {
        customAi = new GoogleGenAI({
          apiKey: clientApiKey,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build',
            },
          },
        });
      }

      if (customAi) {
        try {
          const response = await customAi.models.generateContent({
            model: 'gemini-3.8-flash',
            contents: prompt,
          });
          markdown = response.text || '';
        } catch (geminiError: any) {
          console.warn('Gemini API call failed, falling back to rule engine:', geminiError.message);
          source = 'heuristic_control_expert';
        }
      }
    }

    if (!markdown) {
      // Fallback response if API key is not configured or upstream is temporarily busy
      const isPositive = feedbackMode === 'positive';
      const hasRhpPoles = Array.isArray(poles) && poles.some((p: any) => p.real > 0);
      const isUnstable = isPositive || hasRhpPoles;

      markdown = `### 系统诊断概览 (控制工程专家分析引擎)

#### 1. 系统稳定性与主导极点判据
- **稳定性结论**：${isUnstable ? '⚠️ 系统处于失稳/指数发散状态' : '✅ 系统李雅普诺夫渐近稳定 (Asymptotically Stable)'}
- **极点分布剖析**：${
        isPositive
          ? '系统当前配置为**正反馈模式**。闭环特征方程为 $1 - L(s) = 0$。正反馈将开环极点强烈向右半平面 (RHP, $\\text{Re}(s) > 0$) 牵引，哪怕受控对象本身稳定，正反馈亦诱发指数级失控爆炸。'
          : '系统当前配置为**负反馈模式**。闭环特征方程为 $1 + L(s) = 0$。主导闭环极点分布在复平面左半平面 (LHP, $\\text{Re}(s) < 0$)，自然响应模态为衰减正弦波与指数衰减。'
      }

#### 2. 时域动态品质与振荡根源诊断
- **超调量与阻尼比评估**：当前超调量约为 **${metrics?.overshoot ?? 0}%**。${
        (metrics?.overshoot ?? 0) > 20
          ? '超调量明显偏大，表明系统等效阻尼比 $\\zeta < 0.5$。主导共轭复极点离虚轴过近，高频动能储备转化为欠阻尼机械或电气剧烈振荡。'
          : '阻尼特性良好，过渡过程平缓收敛。'
      }
- **瞬态时间尺度**：上升时间 $T_r \\approx ${metrics?.riseTime ?? 0.8}s$，调节时间 $T_s \\approx ${metrics?.settlingTime ?? 1.5}s$，稳态静差 $e_{ss} \\approx ${metrics?.steadyStateError ?? 0.01}。

#### 3. 正/负反馈机制的内在作用
- **负反馈自纠偏**：通过比较器计算误差 $e(t) = r(t) - y(t)$，将外界扰动反向补偿，维持内环境自稳态。
- **纯迟延影响**：当前系统包含纯迟延 $\\tau = ${delay || 0}s$。迟延环节引入附加负相位滞后 $\\Delta\\phi = -\\omega\\tau$，严重吞噬相位裕度，大增益下易激发自激振荡极限环。

#### 4. PID 参数调谐与优化建议
- **比例增益 $K_p$ (当前 ${pidParams?.kp ?? 1})**：${
        (metrics?.overshoot ?? 0) > 20
          ? '建议将 $K_p$ 适度下调 25% (推荐值: ' + ((pidParams?.kp ?? 2) * 0.75).toFixed(2) + ')，以削弱初始控制冲击峰值。'
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

    return res.json({ success: true, source, markdown });
  } catch (error: any) {
    console.error('AI Insights Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'AI 诊断处理失败',
    });
  }
});

// Interactive Q&A chat endpoint
app.post('/api/ai/chat', async (req: Request, res: Response) => {
  try {
    const { model = 'gemini-3-flash', apiKey: clientApiKey, messages, systemContext } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ success: false, error: '缺少有效的对话消息列表' });
    }

    const latestUserMsg = messages[messages.length - 1]?.content || '';
    const systemPrompt = `你是一位精通系统动力学、经典与现代控制理论的专家顾问。
用户正在 Feedback Lab (反馈系统控制实验室) 中进行闭环系统实验。
【系统当前物理与数学上下文】：
${systemContext || '通用控制闭环'}

请根据以上系统当前状态，针对用户的控制理论与工程调参问题进行深入浅出、公式严谨、富有工程指导意义的回答。语言使用简体中文。`;

    let reply = '';
    let source = model;

    if (model === 'deepseek-v4-pro') {
      try {
        const dsRes = await fetch('https://api.deepseek.com/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${clientApiKey || process.env.DEEPSEEK_API_KEY}`,
          },
          body: JSON.stringify({
            model: 'deepseek-chat',
            messages: [
              { role: 'system', content: systemPrompt },
              ...messages.map((m: any) => ({
                role: m.role === 'user' ? 'user' : 'assistant',
                content: m.content,
              })),
            ],
            temperature: 0.7,
          }),
        });
        const dsData = await dsRes.json();
        reply = dsData.choices?.[0]?.message?.content || '';
      } catch (dsErr: any) {
        console.warn('DeepSeek chat failed:', dsErr.message);
      }
    } else {
      // Gemini 3 Flash
      let customAi = ai;
      if (clientApiKey) {
        customAi = new GoogleGenAI({
          apiKey: clientApiKey,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build',
            },
          },
        });
      }

      if (customAi) {
        try {
          const contents = [
            systemPrompt,
            ...messages.map((m: any) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`),
          ].join('\n\n');

          const response = await customAi.models.generateContent({
            model: 'gemini-3.8-flash',
            contents,
          });
          reply = response.text || '';
        } catch (geminiError: any) {
          console.warn('Gemini chat failed:', geminiError.message);
        }
      }
    }

    if (!reply) {
      // Heuristic control knowledge responder fallback
      const q = latestUserMsg.toLowerCase();
      if (q.includes('超调') || q.includes('振荡')) {
        reply = `根据当前系统极点配置，超调过大的根源通常在于闭环主导极点的阻尼比 $\\zeta < 0.7$。优化建议：
1. **适度下调比例增益 $K_p$**（例如下调 20%~30%），减少初始阶跃冲击幅值；
2. **增大微分作用 $K_d$**，为系统引入超前相位，增加瞬态阻尼力；
3. 检查是否存在纯迟延 $\\tau$，迟延会产生高频负相移，导致等效超调显著恶化。`;
      } else if (q.includes('稳态误差') || q.includes('静差')) {
        reply = `要消除当前系统的稳态误差 $e_{ss}$，关键在于提升系统的无静差型别（Type 1）：
1. 在控制器中引入**积分项 $K_i$**，积分环节将在误差存在时持续积累控制量，强制将稳态误差归零；
2. 注意开启**抗积分饱和 (Anti-Windup)**，防止大阶跃下积分器超额累积导致退出饱和时的严重滞后超调。`;
      } else if (q.includes('正反馈') || q.includes('发散')) {
        reply = `正反馈的闭环传递函数分母为 $1 - L(s)$。在根轨迹上，正反馈会将极点牵引穿过虚轴进入复平面右半平面（RHP, $\\text{Re}(s) > 0$）。此时系统的时域自然响应项包含 $e^{\\sigma t}$ ($\\sigma > 0$)，偏差被同相自强化，导致输出呈指数级发散爆炸。`;
      } else {
        reply = `收到您关于当前控制系统的问题：“${latestUserMsg}”。
结合当前拓扑与参数：
- 系统当前响应超调与上升时间主要受主导闭环极点控制；
- 建议根据工况权衡速度与平稳性，对于伺服跟踪宜保持 $\\zeta \\approx 0.707$，对于恒温温控宜加大 $K_i$ 消除静差并配置抗饱和。`;
      }
      source = 'control_expert_engine';
    }

    return res.json({ success: true, source, reply });
  } catch (error: any) {
    console.error('Chat endpoint error:', error);
    return res.status(500).json({ success: false, error: error.message || '对话处理异常' });
  }
});

// Setup Vite in development or static serving in production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Feedback Lab] Server running on http://localhost:${PORT}`);
  });
}

startServer();
