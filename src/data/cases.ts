import { CaseStudy } from '../types/control';

export const CASE_STUDIES: CaseStudy[] = [
  {
    id: 'greenhouse',
    title: '气候变暖 · 冰川反照率正反馈',
    subtitle: '冰雪融化 → 地表反照率骤降 → 吸收更多热量',
    type: 'positive',
    category: '地球系统动力学 / 正反馈发散',
    description:
      '地球极地冰雪能反射高达 80% 的太阳辐射。当全球温室气体导致温度微小升高，冰川融化裸露出深色海洋与陆地（反射率降至 10%），吸收海量太阳辐射，形成剧烈的正反馈自放大循环（气候引爆点 Tipping Point），导致温度呈指数级加速失控。',
    mechanism: [
      '初始微小扰动：工业碳排放温室效应使气温升高 ΔT',
      '物理相变：极地冰盖与永久冻土融化面积增大',
      '反照率雪崩：地表平均反照率 Albedo 骤降，由镜面反射变为吸热黑体',
      '正反馈强化：地表吸热量 Qin 剧增，驱动气温进一步恶性飙升',
    ],
    forwardPlant: {
      numerator: [0.8],
      denominator: [1.5, 1], // 热惯性滞后环节 1.5s + 1
      delay: 0.4,
      description: '地球表层大气与海洋热容量系统 G(s) = 0.8 / (1.5s + 1)',
    },
    feedbackGain: 0.95, // 接近1的强正反馈，极易发散
    recommendedPid: {
      kp: 1.2,
      ki: 0,
      kd: 0,
      filterCoeffN: 10,
      antiWindup: false,
    },
    disturbanceLabel: '温室气体碳排放脉冲 (CO2 浓度跳变)',
    referenceLabel: '基准工业前平衡温度',
    outputLabel: '全球地表平均增温幅度',
    unit: '°C',
    defaultRef: 1.0,
    defaultDisturbance: 0.6,
  },
  {
    id: 'audio_screech',
    title: '声学啸叫 · 话筒功放自激振荡',
    subtitle: '拾音 → 功放放大 → 扬声器回放 → 再次拾音叠加',
    type: 'positive',
    category: '声学与信号处理 / 极限环振荡',
    description:
      '在舞台或会议室中，当麦克风拾取微弱环境声，经大功率音频功放驱动扬声器播出；若扬声器声音通过空气声波延迟传输重新进入麦克风，且环路增益大于 1 且相位满足同相正反馈条件（拉森效应 Larsen Effect），微小白噪声会在极短时间内演变为高分贝刺耳的音频尖啸。',
    mechanism: [
      '微小激励：环境空气热噪声或人声微弱输入',
      '前向放大：调音台与大功率功放大倍数电压电流驱动',
      '声学延迟反馈：声波以 340 m/s 在空气中传播 τ = d/c，作为反馈通路进入话筒',
      '正反馈共振：当环路增益 |Aβ| ≥ 1 且相位延迟刚好为 2kπ 时，剧烈自激啸叫爆发',
    ],
    forwardPlant: {
      numerator: [2.5],
      denominator: [0.05, 0.4, 1], // 高频谐振系统
      delay: 0.25, // 声程延迟
      description: '音频放大器与扬声器频响谐振环节 G(s) = 2.5 / (0.05s² + 0.4s + 1)',
    },
    feedbackGain: 1.2, // 环路增益大于1，导致失稳尖叫
    recommendedPid: {
      kp: 1.0,
      ki: 0,
      kd: 0.1,
      filterCoeffN: 15,
      antiWindup: false,
    },
    disturbanceLabel: '麦克风环境突发声响',
    referenceLabel: '原始输入音频信号',
    outputLabel: '扬声器声压级 (SPL)',
    unit: 'dB',
    defaultRef: 1.0,
    defaultDisturbance: 0.5,
  },
  {
    id: 'thermostat',
    title: '恒温箱控制 · 工业闭环温控系统',
    subtitle: '温度传感器实时采样 → 偏差负反馈 → 抵抗箱门开合散热扰动',
    type: 'negative',
    category: '热工过程控制 / 稳态负反馈',
    description:
      '精密半导体工业或生物培养恒温箱要求箱内温度恒定在目标值（例如 200°C 或 37°C）。电加热丝加热存在热传导大惯性与滞后，外界环境降温或突然开门会造成剧烈热量流失。通过热电偶传感器测温与设定温度比较产生偏差 e(t) = R - Y，PID 控制器负反馈动态调整加热功率，将超调抑制在极低水平并彻底消除稳态误差。',
    mechanism: [
      '目标设定：工艺设定期望恒定温度 R(s)',
      '误差检测：传感器测得实际箱温 Y(s)，与设定值做差计算偏差 e(t) = R - Y',
      '负反馈调节：当箱温低于设定值时全力加热，高于设定值时降低或关闭功率',
      '抗外界扰动：突然开启箱门造成冷空气灌入，负反馈控制器迅速察觉温降并大幅加大加热功率补偿',
    ],
    forwardPlant: {
      numerator: [1.2],
      denominator: [2.0, 1.0], // 一阶大惯性热系统
      delay: 0.5, // 热阻与热电偶传导纯迟延
      description: '恒温炉加热热力学环节 G(s) = 1.2 / (2.0s + 1) · e^(-0.5s)',
    },
    feedbackGain: 1.0, // 单位负反馈
    recommendedPid: {
      kp: 2.4,
      ki: 0.8,
      kd: 1.1,
      filterCoeffN: 10,
      antiWindup: true,
    },
    disturbanceLabel: '箱门打开散热 / 环境骤降冷风',
    referenceLabel: '恒温箱设定工艺温度',
    outputLabel: '炉膛实时测量温度',
    unit: '°C',
    defaultRef: 1.0,
    defaultDisturbance: -0.4,
  },
  {
    id: 'glucose',
    title: '血糖稳态 · 人体神经体液双向负反馈',
    subtitle: '进食升糖 → 胰岛素降糖；禁食降糖 → 胰高血糖素升糖',
    type: 'negative',
    category: '生理医学控制论 / 生物体内环境自稳',
    description:
      '人体血液中葡萄糖浓度必须精密维系在 3.9 ~ 6.1 mmol/L 狭窄安全区间。进食后碳水化合物分解使血糖飙升（相当于大幅正阶跃扰动），胰岛 β 细胞感知高血糖后立即分泌胰岛素促使组织吸收与肝糖原合成；饥饿时胰岛 α 细胞分泌胰高血糖素加速糖原分解，这一精妙的双向负反馈系统保证了中枢神经系统的能量供应与机体代谢平衡。',
    mechanism: [
      '设定基线：下丘脑与机体代谢设定的血糖稳态设定点 (约 5.0 mmol/L)',
      '扰动冲击：餐后食物消化吸收导致葡萄糖大量涌入血液循环 (外加扰动 d(t))',
      '胰岛感知与负反馈：胰岛感受器感知偏差，加速分泌胰岛素促使细胞摄取降糖',
      '反向缓冲机制：当血糖过低时负反馈减弱并启动升糖激素，避免致命性低血糖昏迷',
    ],
    forwardPlant: {
      numerator: [1.0],
      denominator: [1.2, 1.8, 1.0], // 二阶人体代谢吸收与胰岛素代谢消除动力学
      delay: 0.2, // 激素血液循环延迟
      description: '人体葡萄糖代谢动力学模型 G(s) = 1.0 / (1.2s² + 1.8s + 1)',
    },
    feedbackGain: 1.0,
    recommendedPid: {
      kp: 1.8,
      ki: 0.6,
      kd: 0.9,
      filterCoeffN: 8,
      antiWindup: true,
    },
    disturbanceLabel: '进食高糖餐饮 / 剧烈消耗扰动',
    referenceLabel: '健康基线空腹血糖目标',
    outputLabel: '血液实时葡萄糖浓度',
    unit: 'mmol/L',
    defaultRef: 1.0,
    defaultDisturbance: 0.8,
  },
];
