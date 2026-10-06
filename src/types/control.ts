export type FeedbackMode = 'negative' | 'positive';

export type InputSignalType = 'step' | 'impulse' | 'ramp' | 'square';

export interface ComplexNumber {
  real: number;
  imag: number;
}

export interface TransferFunctionModel {
  numerator: number[];     // e.g. [1] or [2, 1]
  denominator: number[];   // e.g. [1, 2, 1]
  delay: number;           // delay in seconds
  gain: number;            // static gain multiplier K
}

export interface ZeroPoleModel {
  gain: number;
  zeros: ComplexNumber[];
  poles: ComplexNumber[];
  delay: number;
}

export interface PidParameters {
  kp: number;
  ki: number;
  kd: number;
  filterCoeffN: number;    // derivative low-pass filter
  antiWindup: boolean;
}

export interface TimeDomainMetrics {
  stability: 'stable' | 'critically_stable' | 'unstable';
  overshoot: number;          // in %
  riseTime: number;           // 10% to 90% in s
  settlingTime: number;       // within 2% in s
  peakTime: number;           // peak time in s
  peakValue: number;          // max y
  steadyStateValue: number;   // final y
  steadyStateError: number;   // |target - y_ss|
  dampingRatio?: number;      // zeta if 2nd order
  naturalFrequency?: number;  // omega_n if 2nd order
}

export interface FrequencyDomainMetrics {
  gainCrossoverFreq: number | null; // omega_cg (rad/s) where |L(jw)| = 1
  phaseCrossoverFreq: number | null; // omega_cp (rad/s) where phase = -180 deg
  gainMarginDb: number | null;       // Gm in dB
  phaseMarginDeg: number | null;     // Pm in degrees
  bandwidth: number | null;          // closed-loop -3dB frequency
  isNyquistStable: boolean;
  encirclements: number;             // N: clockwise encirclements of -1+j0
}

export interface SimulationPoint {
  t: number;
  r: number; // reference
  y: number; // output
  e: number; // error = r - y
  u: number; // control effort
  d: number; // disturbance
}

export interface FrequencyPoint {
  omega: number;
  magDb: number;
  phaseDeg: number;
  real: number;
  imag: number;
}

export interface TopologyNode {
  id: string;
  name: string;
  type: 'input' | 'comparator' | 'controller' | 'plant' | 'sensor' | 'output' | 'disturbance';
  x: number;
  y: number;
  value?: number;
  config?: any;
}

export interface TopologyLink {
  from: string;
  to: string;
  label?: string;
  isFeedback?: boolean;
}

export interface CaseStudy {
  id: string;
  title: string;
  subtitle: string;
  type: 'positive' | 'negative';
  category: string;
  description: string;
  mechanism: string[];
  forwardPlant: {
    numerator: number[];
    denominator: number[];
    delay: number;
    description: string;
  };
  feedbackGain: number;
  recommendedPid?: PidParameters;
  disturbanceLabel: string;
  referenceLabel: string;
  outputLabel: string;
  unit: string;
  defaultRef: number;
  defaultDisturbance: number;
}
