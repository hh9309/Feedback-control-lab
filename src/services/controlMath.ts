import {
  ComplexNumber,
  FeedbackMode,
  FrequencyDomainMetrics,
  FrequencyPoint,
  InputSignalType,
  PidParameters,
  SimulationPoint,
  TimeDomainMetrics,
  TransferFunctionModel,
} from '../types/control';

// Complex Number Operations
export const complex = {
  make: (real: number, imag = 0): ComplexNumber => ({ real, imag }),
  add: (a: ComplexNumber, b: ComplexNumber): ComplexNumber => ({
    real: a.real + b.real,
    imag: a.imag + b.imag,
  }),
  sub: (a: ComplexNumber, b: ComplexNumber): ComplexNumber => ({
    real: a.real - b.real,
    imag: a.imag - b.imag,
  }),
  mul: (a: ComplexNumber, b: ComplexNumber): ComplexNumber => ({
    real: a.real * b.real - a.imag * b.imag,
    imag: a.real * b.imag + a.imag * b.real,
  }),
  div: (a: ComplexNumber, b: ComplexNumber): ComplexNumber => {
    const denom = b.real * b.real + b.imag * b.imag;
    if (Math.abs(denom) < 1e-12) return { real: 1e9, imag: 1e9 };
    return {
      real: (a.real * b.real + a.imag * b.imag) / denom,
      imag: (a.imag * b.real - a.real * b.imag) / denom,
    };
  },
  abs: (a: ComplexNumber): number => Math.sqrt(a.real * a.real + a.imag * a.imag),
  arg: (a: ComplexNumber): number => Math.atan2(a.imag, a.real),
  exp: (a: ComplexNumber): ComplexNumber => {
    const r = Math.exp(a.real);
    return {
      real: r * Math.cos(a.imag),
      imag: r * Math.sin(a.imag),
    };
  },
};

// Polynomial Utilities
export const poly = {
  // Multiply two polynomials (convolution)
  multiply: (p1: number[], p2: number[]): number[] => {
    const res = new Array(p1.length + p2.length - 1).fill(0);
    for (let i = 0; i < p1.length; i++) {
      for (let j = 0; j < p2.length; j++) {
        res[i + j] += p1[i] * p2[j];
      }
    }
    return poly.clean(res);
  },

  // Add two polynomials
  add: (p1: number[], p2: number[], sign = 1): number[] => {
    const maxLen = Math.max(p1.length, p2.length);
    const a1 = poly.padLeft(p1, maxLen);
    const a2 = poly.padLeft(p2, maxLen);
    const res = a1.map((val, idx) => val + sign * a2[idx]);
    return poly.clean(res);
  },

  padLeft: (p: number[], targetLen: number): number[] => {
    const diff = targetLen - p.length;
    if (diff <= 0) return [...p];
    return [...new Array(diff).fill(0), ...p];
  },

  clean: (p: number[]): number[] => {
    // Remove leading near-zeros
    let start = 0;
    while (start < p.length - 1 && Math.abs(p[start]) < 1e-9) {
      start++;
    }
    return p.slice(start);
  },

  // Evaluate polynomial at complex s: P(s) = a_n s^n + ... + a_0
  evaluate: (p: number[], s: ComplexNumber): ComplexNumber => {
    let result = complex.make(0, 0);
    const n = p.length;
    for (let i = 0; i < n; i++) {
      const power = n - 1 - i;
      // compute s^power
      let sPow = complex.make(1, 0);
      for (let k = 0; k < power; k++) {
        sPow = complex.mul(sPow, s);
      }
      const term = complex.mul(complex.make(p[i], 0), sPow);
      result = complex.add(result, term);
    }
    return result;
  },

  // Numerical roots of polynomial using Durand-Kerner (Weierstrass) method
  findRoots: (coeffs: number[]): ComplexNumber[] => {
    const cleaned = poly.clean(coeffs);
    const n = cleaned.length - 1;
    if (n <= 0) return [];

    // Normalize so leading coefficient is 1
    const a0 = cleaned[0];
    const monic = cleaned.map((c) => c / a0);

    if (n === 1) {
      // s + b = 0 => s = -b
      return [{ real: -monic[1], imag: 0 }];
    }

    if (n === 2) {
      // s^2 + b s + c = 0
      const b = monic[1];
      const c = monic[2];
      const disc = b * b - 4 * c;
      if (disc >= 0) {
        return [
          { real: (-b + Math.sqrt(disc)) / 2, imag: 0 },
          { real: (-b - Math.sqrt(disc)) / 2, imag: 0 },
        ];
      } else {
        const real = -b / 2;
        const imag = Math.sqrt(-disc) / 2;
        return [
          { real, imag },
          { real, imag: -imag },
        ];
      }
    }

    // For degree >= 3, use Durand-Kerner iterative root finder
    const roots: ComplexNumber[] = [];
    const r0 = 0.4;
    const theta = 0.7; // arbitrary angle to avoid symmetry
    for (let i = 0; i < n; i++) {
      const angle = (2 * Math.PI * i) / n + theta;
      roots.push({
        real: Math.pow(r0, i) * Math.cos(angle),
        imag: Math.pow(r0, i) * Math.sin(angle),
      });
    }

    const maxIter = 80;
    for (let iter = 0; iter < maxIter; iter++) {
      let maxChange = 0;
      for (let i = 0; i < n; i++) {
        const zi = roots[i];
        const pz = poly.evaluate(monic, zi);

        // product (zi - zj) for j != i
        let denom = complex.make(1, 0);
        for (let j = 0; j < n; j++) {
          if (i !== j) {
            denom = complex.mul(denom, complex.sub(zi, roots[j]));
          }
        }

        const delta = complex.div(pz, denom);
        roots[i] = complex.sub(zi, delta);
        const change = complex.abs(delta);
        if (change > maxChange) maxChange = change;
      }
      if (maxChange < 1e-7) break;
    }

    // Clean up small imaginary parts (e.g. |imag| < 1e-5)
    return roots.map((r) => ({
      real: Math.abs(r.real) < 1e-5 ? 0 : Number(r.real.toFixed(4)),
      imag: Math.abs(r.imag) < 1e-5 ? 0 : Number(r.imag.toFixed(4)),
    }));
  },
};

// Format a polynomial as LaTeX/readable string
export function formatPolynomial(coeffs: number[], variable = 's'): string {
  const p = poly.clean(coeffs);
  const n = p.length - 1;
  if (n === 0) return `${p[0]}`;

  const terms: string[] = [];
  for (let i = 0; i < p.length; i++) {
    const coef = p[i];
    const power = n - i;
    if (Math.abs(coef) < 1e-6) continue;

    let term = '';
    const sign = coef > 0 ? (terms.length > 0 ? '+ ' : '') : '- ';
    const absVal = Math.abs(coef);
    const absValStr = Math.abs(absVal - 1) < 1e-6 && power > 0 ? '' : `${Number(absVal.toFixed(3))}`;

    if (power === 0) {
      term = `${sign}${Number(absVal.toFixed(3))}`;
    } else if (power === 1) {
      term = `${sign}${absValStr}${variable}`;
    } else {
      term = `${sign}${absValStr}${variable}^${power}`;
    }
    terms.push(term);
  }

  return terms.length > 0 ? terms.join(' ') : '0';
}

// Convert PID parameters to Transfer Function:
// C(s) = Kp + Ki/s + Kd*s / (1 + s/(N)) = [ (Kp*N + Kd*N)*s^2 + (Ki*N + Kp)*s + Ki ] / [ s^2/N + s ]
export function pidToTf(pid: PidParameters): TransferFunctionModel {
  const { kp, ki, kd, filterCoeffN } = pid;
  const N = Math.max(filterCoeffN, 1);

  if (ki === 0 && kd === 0) {
    return {
      numerator: [kp],
      denominator: [1],
      delay: 0,
      gain: 1,
    };
  }

  // C(s) = Kp + Ki/s + (Kd * s) / (1 + s/N)
  // Let s/N + 1 be denominator factor for derivative
  // Common denominator: s * (s + N)
  // Numerator: Kp * s * (s + N) + Ki * (s + N) + Kd * N * s^2
  // = (Kp + Kd*N) s^2 + (Kp*N + Ki) s + Ki*N
  const num2 = kp + kd * N;
  const num1 = kp * N + ki;
  const num0 = ki * N;

  const den2 = 1;
  const den1 = N;
  const den0 = 0;

  return {
    numerator: [num2, num1, num0],
    denominator: [den2, den1, den0],
    delay: 0,
    gain: 1,
  };
}

// Compute closed-loop transfer function:
// Forward path G_f(s) = C(s) * G(s)
// Feedback path H(s) = [1] / [1] (unity feedback by default)
// For negative feedback: T(s) = G_f(s) / [ 1 + G_f(s) * H(s) ]
// For positive feedback: T(s) = G_f(s) / [ 1 - G_f(s) * H(s) ]
export function computeClosedLoop(
  plant: TransferFunctionModel,
  controller: TransferFunctionModel,
  mode: FeedbackMode,
  feedbackGain = 1
): TransferFunctionModel {
  // G_f = controller * plant
  const gfNum = poly.multiply(controller.numerator, plant.numerator);
  const gfDen = poly.multiply(controller.denominator, plant.denominator);

  // Closed loop:
  // T_num = gfNum * 1
  // T_den = gfDen + (sign * feedbackGain * gfNum)
  // For negative feedback: sign is +1
  // For positive feedback: sign is -1
  const sign = mode === 'negative' ? 1 : -1;
  const hNum = gfNum.map((v) => v * feedbackGain * sign);
  const clDen = poly.add(gfDen, hNum, 1);

  return {
    numerator: gfNum,
    denominator: clDen,
    delay: plant.delay + controller.delay,
    gain: 1,
  };
}

// Time-domain simulation using State-Space Direct Canonical Form & Runge-Kutta 4 (RK4)
export function simulateTimeDomain(options: {
  plant: TransferFunctionModel;
  controller: TransferFunctionModel;
  mode: FeedbackMode;
  signalType: InputSignalType;
  amplitude: number;
  disturbanceMag: number;
  disturbanceTime: number;
  totalTime?: number;
  timeStep?: number;
  feedbackGain?: number;
  saturationLimit?: number;
  antiWindup?: boolean;
}): {
  points: SimulationPoint[];
  metrics: TimeDomainMetrics;
  closedLoopTf: TransferFunctionModel;
} {
  const {
    plant,
    controller,
    mode,
    signalType,
    amplitude = 1,
    disturbanceMag = 0,
    disturbanceTime = 5,
    totalTime = 12,
    timeStep = 0.02,
    feedbackGain = 1,
  } = options;

  const closedLoop = computeClosedLoop(plant, controller, mode, feedbackGain);

  // Let's simulate the loop explicitly to capture internal states, error, actuator effort u(t), and disturbance
  // Controller: PID in parallel discrete simulation or Transfer Function
  // Plant: Controllable canonical form dx/dt = A x + B (u + d), y = C x + D (u + d)
  const pDen = poly.clean(plant.denominator);
  const pNum = poly.clean(plant.numerator);
  const order = pDen.length - 1;

  // Normalize plant denominator so leading coeff is 1
  const a0 = pDen[0] || 1;
  const a = pDen.map((c) => c / a0);
  const bPadded = poly.padLeft(pNum.map((c) => c / a0), pDen.length);

  // Controllable canonical form:
  // dx/dt: x_k' = x_{k+1}, x_n' = -a_n x_1 - a_{n-1} x_2 ... + u_in
  // y = sum (b_k - a_k * b_0) * x_k + b_0 * u_in
  const D = bPadded[0];
  const C = [];
  for (let i = 1; i <= order; i++) {
    C.push(bPadded[i] - a[i] * D);
  }

  const steps = Math.ceil(totalTime / timeStep);
  const points: SimulationPoint[] = [];

  // Plant state vector
  let x = new Array(order).fill(0);

  // Controller states (for PID integration and derivative filter)
  let integratorState = 0;
  let prevError = 0;
  let filteredDeriv = 0;

  // Pure delay buffer
  const delaySteps = Math.max(0, Math.round(plant.delay / timeStep));
  const delayBuffer: number[] = new Array(delaySteps + 1).fill(0);

  // Reference signal generator
  const getReference = (t: number): number => {
    switch (signalType) {
      case 'step':
        return t >= 0.1 ? amplitude : 0;
      case 'impulse':
        return t >= 0.1 && t <= 0.25 ? amplitude / 0.15 : 0;
      case 'ramp':
        return t >= 0.1 ? (t - 0.1) * amplitude * 0.4 : 0;
      case 'square':
        return t >= 0.1 ? ((Math.floor((t - 0.1) / 2) % 2 === 0) ? amplitude : 0) : 0;
      default:
        return amplitude;
    }
  };

  let maxOutput = -Infinity;
  let peakTime = 0;
  let isDivergent = false;

  for (let k = 0; k <= steps; k++) {
    const t = Number((k * timeStep).toFixed(3));
    const r = getReference(t);
    const dist = t >= disturbanceTime ? disturbanceMag : 0;

    // Delayed output from plant
    const yDelayed = delayBuffer.shift() || 0;

    // Feedback sign:
    // Negative feedback: error = r - y
    // Positive feedback: error = r + y (reinforces discrepancy)
    const fbValue = yDelayed * feedbackGain;
    const error = mode === 'negative' ? r - fbValue : r + fbValue;

    // PID controller logic
    // Extract PID from controller if possible
    let u = 0;
    if (controller.numerator.length === 1 && controller.denominator.length === 1) {
      // Pure gain K
      u = controller.numerator[0] * error;
    } else {
      // General PID or transfer function
      // Numerical integration for I:
      integratorState += error * timeStep;
      if (options.antiWindup) {
        // Clamping integrator
        integratorState = Math.max(-5, Math.min(5, integratorState));
      }
      // Filtered derivative:
      const dRaw = (error - prevError) / timeStep;
      const alpha = 0.3; // Low pass filter factor
      filteredDeriv = alpha * dRaw + (1 - alpha) * filteredDeriv;
      prevError = error;

      // Extract PID coeffs from controller numerator/den
      const kp = controller.numerator[1] || 1;
      const ki = controller.numerator[2] || 0;
      const kd = controller.numerator[0] || 0;
      u = kp * error + ki * integratorState + kd * filteredDeriv;
    }

    // Actuator limits: prevent unrealistic infinite explosion on screen, but indicate divergence
    const saturatedU = Math.max(-200, Math.min(200, u));
    const plantInput = saturatedU + dist;

    // Compute Plant instantaneous output y before RK4 integration
    let yNow = D * plantInput;
    for (let i = 0; i < order; i++) {
      yNow += C[i] * x[order - 1 - i];
    }

    // Store in delay buffer
    delayBuffer.push(yNow);

    // Save simulation sample
    points.push({
      t,
      r,
      y: Number(yNow.toFixed(4)),
      e: Number(error.toFixed(4)),
      u: Number(saturatedU.toFixed(4)),
      d: dist,
    });

    if (Math.abs(yNow) > 1e4 || isNaN(yNow)) {
      isDivergent = true;
    }
    if (yNow > maxOutput) {
      maxOutput = yNow;
      peakTime = t;
    }

    // RK4 step for plant state x
    // dx/dt = f(x, u_in)
    const deriv = (st: number[], inp: number): number[] => {
      const dxdt = new Array(order).fill(0);
      let xDotLast = inp;
      for (let i = 1; i <= order; i++) {
        xDotLast -= a[i] * st[order - i];
      }
      for (let i = 0; i < order - 1; i++) {
        dxdt[i] = st[i + 1];
      }
      dxdt[order - 1] = xDotLast;
      return dxdt;
    };

    const k1 = deriv(x, plantInput);
    const xK2 = x.map((xi, idx) => xi + 0.5 * timeStep * k1[idx]);
    const k2 = deriv(xK2, plantInput);
    const xK3 = x.map((xi, idx) => xi + 0.5 * timeStep * k2[idx]);
    const k3 = deriv(xK3, plantInput);
    const xK4 = x.map((xi, idx) => xi + timeStep * k3[idx]);
    const k4 = deriv(xK4, plantInput);

    for (let i = 0; i < order; i++) {
      x[i] += (timeStep / 6) * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]);
    }
  }

  // Calculate Time-domain Performance Metrics
  const finalR = getReference(totalTime);
  const finalY = points[points.length - 1].y;
  const steadyError = Math.abs(finalR - finalY);

  // Check poles for stability
  const clPoles = poly.findRoots(closedLoop.denominator);
  const hasRhpPole = clPoles.some((p) => p.real > 0.001);
  const hasImagPole = clPoles.some((p) => Math.abs(p.real) <= 0.001 && Math.abs(p.imag) > 0.01);

  let stability: TimeDomainMetrics['stability'] = 'stable';
  if (isDivergent || hasRhpPole || mode === 'positive') {
    stability = 'unstable';
  } else if (hasImagPole) {
    stability = 'critically_stable';
  }

  // Overshoot:
  let overshoot = 0;
  if (stability === 'stable' && finalY > 0.01) {
    overshoot = Math.max(0, ((maxOutput - finalY) / finalY) * 100);
  } else if (stability === 'unstable') {
    overshoot = Infinity;
  }

  // Rise time (10% to 90% of final value)
  let t10 = -1;
  let t90 = -1;
  const target10 = 0.1 * finalY;
  const target90 = 0.9 * finalY;
  for (const pt of points) {
    if (t10 < 0 && pt.y >= target10 && pt.t >= 0.1) t10 = pt.t;
    if (t90 < 0 && pt.y >= target90 && pt.t >= 0.1) t90 = pt.t;
  }
  const riseTime = t10 >= 0 && t90 >= t10 ? Number((t90 - t10).toFixed(2)) : 0.8;

  // Settling time (within ±2% band of steady-state value)
  let settlingTime = totalTime;
  if (stability === 'stable') {
    const band = 0.02 * (Math.abs(finalY) || 1);
    for (let i = points.length - 1; i >= 0; i--) {
      if (Math.abs(points[i].y - finalY) > band) {
        settlingTime = points[i].t;
        break;
      }
    }
  }

  return {
    points,
    metrics: {
      stability,
      overshoot: Number(isFinite(overshoot) ? overshoot.toFixed(1) : 999),
      riseTime,
      settlingTime: Number(settlingTime.toFixed(2)),
      peakTime: Number(peakTime.toFixed(2)),
      peakValue: Number(maxOutput.toFixed(3)),
      steadyStateValue: Number(finalY.toFixed(3)),
      steadyStateError: Number(steadyError.toFixed(4)),
    },
    closedLoopTf: closedLoop,
  };
}

// Frequency Domain: Bode & Nyquist calculations
export function calculateFrequencyResponse(
  plant: TransferFunctionModel,
  controller: TransferFunctionModel,
  feedbackGain = 1
): {
  bodePoints: FrequencyPoint[];
  nyquistPoints: FrequencyPoint[];
  metrics: FrequencyDomainMetrics;
} {
  // Open loop L(s) = C(s) * G(s) * H
  const num = poly.multiply(controller.numerator, plant.numerator).map((v) => v * feedbackGain);
  const den = poly.multiply(controller.denominator, plant.denominator);
  const delay = plant.delay + controller.delay;

  // Generate frequency grid: 10^-2 to 10^2 (4 decades, 160 points)
  const minDecade = -2;
  const maxDecade = 2.5;
  const numPoints = 160;
  const bodePoints: FrequencyPoint[] = [];
  const nyquistPoints: FrequencyPoint[] = [];

  let prevPhaseUnwrapped = 0;
  let gainCrossoverFreq: number | null = null;
  let phaseCrossoverFreq: number | null = null;
  let pmAtGainCross: number | null = null;
  let gmAtPhaseCrossDb: number | null = null;

  for (let i = 0; i < numPoints; i++) {
    const decade = minDecade + (i / (numPoints - 1)) * (maxDecade - minDecade);
    const omega = Math.pow(10, decade);

    // Evaluate L(j*omega)
    const s = complex.make(0, omega);
    const numVal = poly.evaluate(num, s);
    const denVal = poly.evaluate(den, s);
    const lVal = complex.div(numVal, denVal);

    // Apply delay: L_delay(j*w) = L(j*w) * e^(-j * w * tau)
    const delayAngle = -omega * delay;
    const delayFactor = complex.make(Math.cos(delayAngle), Math.sin(delayAngle));
    const lTotal = complex.mul(lVal, delayFactor);

    const mag = complex.abs(lTotal);
    const magDb = 20 * Math.log10(Math.max(1e-6, mag));

    let phaseRad = complex.arg(lTotal);
    // Unwrap phase smoothly
    let phaseDeg = (phaseRad * 180) / Math.PI;
    while (phaseDeg - prevPhaseUnwrapped > 180) phaseDeg -= 360;
    while (phaseDeg - prevPhaseUnwrapped < -180) phaseDeg += 360;
    prevPhaseUnwrapped = phaseDeg;

    const pt: FrequencyPoint = {
      omega: Number(omega.toFixed(4)),
      magDb: Number(magDb.toFixed(2)),
      phaseDeg: Number(phaseDeg.toFixed(2)),
      real: Number(lTotal.real.toFixed(4)),
      imag: Number(lTotal.imag.toFixed(4)),
    };
    bodePoints.push(pt);
    nyquistPoints.push(pt);

    // Check gain crossover (0 dB crossing)
    if (bodePoints.length > 1) {
      const prev = bodePoints[bodePoints.length - 2];
      if ((prev.magDb >= 0 && pt.magDb < 0) || (prev.magDb <= 0 && pt.magDb > 0)) {
        if (!gainCrossoverFreq) {
          gainCrossoverFreq = omega;
          // PM = 180 + phase
          pmAtGainCross = 180 + pt.phaseDeg;
        }
      }

      // Check phase crossover (-180 deg crossing)
      const prevPhaseNorm = ((prev.phaseDeg % 360) + 360) % 360;
      const currPhaseNorm = ((pt.phaseDeg % 360) + 360) % 360;
      if (
        (prev.phaseDeg >= -180 && pt.phaseDeg < -180) ||
        (prevPhaseNorm >= 180 && currPhaseNorm < 180)
      ) {
        if (!phaseCrossoverFreq) {
          phaseCrossoverFreq = omega;
          // GM = -magDb
          gmAtPhaseCrossDb = -pt.magDb;
        }
      }
    }
  }

  // Open-loop poles for Nyquist stability criterion Z = P - 2N
  const openLoopPoles = poly.findRoots(den);
  const rhpPolesCount = openLoopPoles.filter((p) => p.real > 0.001).length;

  const isNyquistStable =
    rhpPolesCount === 0 &&
    (pmAtGainCross === null || pmAtGainCross > 0) &&
    (gmAtPhaseCrossDb === null || gmAtPhaseCrossDb > 0);

  return {
    bodePoints,
    nyquistPoints,
    metrics: {
      gainCrossoverFreq: gainCrossoverFreq ? Number(gainCrossoverFreq.toFixed(3)) : null,
      phaseCrossoverFreq: phaseCrossoverFreq ? Number(phaseCrossoverFreq.toFixed(3)) : null,
      gainMarginDb: gmAtPhaseCrossDb !== null ? Number(gmAtPhaseCrossDb.toFixed(1)) : null,
      phaseMarginDeg: pmAtGainCross !== null ? Number(pmAtGainCross.toFixed(1)) : null,
      bandwidth: gainCrossoverFreq ? Number((gainCrossoverFreq * 1.4).toFixed(2)) : null,
      isNyquistStable,
      encirclements: 0,
    },
  };
}

// Generate complete python-control script for the current system
export function generatePythonScript(options: {
  plant: TransferFunctionModel;
  controller: TransferFunctionModel;
  mode: FeedbackMode;
  delay: number;
  pid: PidParameters;
}): string {
  const { plant, controller, mode, delay, pid } = options;
  const numStr = `[${plant.numerator.join(', ')}]`;
  const denStr = `[${plant.denominator.join(', ')}]`;
  const fbSign = mode === 'negative' ? -1 : 1;
  const filterN = Math.max(1, pid.filterCoeffN || 10);
  const modeLabel = mode === 'negative' ? 'NEGATIVE' : 'POSITIVE';

  return `"""
Feedback Lab - Control System Simulation Script
Powered by python-control, numpy, and matplotlib
Can be executed in standard Python (pip install control numpy matplotlib scipy)
"""

import numpy as np
import matplotlib.pyplot as plt
import control as ct

plt.rcParams['font.sans-serif'] = ['DejaVu Sans', 'Arial']
plt.rcParams['axes.unicode_minus'] = False

# 1. Define Feedback Mode & System Configuration
# mode is explicitly defined so it can be evaluated in standard Python
mode = "${mode}"  # 'negative' or 'positive'
feedback_sign = ${fbSign}  # -1 for negative feedback, +1 for positive feedback

# 2. Define Plant Transfer Function G(s) and Time Delay tau
num_plant = ${numStr}
den_plant = ${denStr}
tau = ${delay}

G_plant = ct.tf(num_plant, den_plant)
if tau > 0:
    # 2nd-order Pade approximation for dead-time e^(-tau * s)
    num_pade, den_pade = ct.pade(tau, 2)
    G_delay = ct.tf(num_pade, den_pade)
    G_plant = G_plant * G_delay

# 3. Define PID Controller C(s)
# Kp=${pid.kp}, Ki=${pid.ki}, Kd=${pid.kd}, Filter N=${filterN}
s = ct.tf([1, 0], [1])  # Laplace variable s
C_pid = ${pid.kp} + ${pid.ki} / (s + 1e-6) + (${pid.kd} * s) / (1 + s / ${filterN})

# 4. Form Open-Loop L(s) and Closed-Loop T(s)
L_open = C_pid * G_plant
T_closed = ct.feedback(L_open, 1, sign=feedback_sign)

print("=" * 60)
print("FEEDBACK LAB - SYSTEM ANALYSIS REPORT")
print("=" * 60)
print(f"Feedback Mode: {mode.upper()} (sign = {feedback_sign})")
print("Closed-Loop Transfer Function T(s):\\n", T_closed)

# Closed-loop poles and zeros (compatible with all python-control & NumPy versions)
def get_system_poles(sys):
    if hasattr(sys, 'poles'):
        try:
            return sys.poles()
        except TypeError:
            return sys.poles
    if hasattr(sys, 'pole'):
        try:
            return sys.pole()
        except TypeError:
            return sys.pole
    if hasattr(ct, 'pole'):
        return ct.pole(sys)
    if hasattr(ct, 'poles'):
        return ct.poles(sys)
    try:
        den = np.squeeze(sys.den)
        return np.roots(den)
    except Exception:
        return np.array([])

def get_system_zeros(sys):
    if hasattr(sys, 'zeros'):
        try:
            return sys.zeros()
        except TypeError:
            return sys.zeros
    if hasattr(sys, 'zero'):
        try:
            return sys.zero()
        except TypeError:
            return sys.zero
    if hasattr(ct, 'zero'):
        return ct.zero(sys)
    if hasattr(ct, 'zeros'):
        return ct.zeros(sys)
    try:
        num = np.squeeze(sys.num)
        return np.roots(num)
    except Exception:
        return np.array([])

poles = get_system_poles(T_closed)
zeros = get_system_zeros(T_closed)
print("\\nClosed-Loop Poles:", poles)
print("Closed-Loop Zeros:", zeros)

# Stability verification via Lyapunov criterion (poles in LHP)
if len(poles) > 0:
    is_stable = bool(np.all(np.real(poles) < 0))
    stability_verdict = "Asymptotically Stable (LHP Poles)" if is_stable else "Unstable / Divergent (RHP Poles)"
else:
    is_stable = False
    stability_verdict = "Undetermined"
print("\\nStability Verdict:", stability_verdict)
print("=" * 60)

# 5. Time-Domain Step Response
t = np.linspace(0, 12, 1000)
try:
    t_out, y_out = ct.step_response(T_closed, t)
except Exception:
    resp = ct.step_response(T_closed, t)
    t_out = resp.time
    y_out = resp.outputs
y_out = np.squeeze(y_out)

# 6. Frequency-Domain Bode Analysis
fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(9, 7))

# Plot Step Response (All labels, titles, and legends in English)
ax1.plot(t_out, y_out, label='Step Response (${modeLabel})', color='#0284c7', lw=2)
ax1.axhline(1.0, color='#94a3b8', linestyle='--', label='Target r(t) = 1.0')
ax1.set_title("Time-Domain Step Response", fontsize=12, fontweight='bold')
ax1.set_xlabel("Time (s)")
ax1.set_ylabel("Output y(t)")
ax1.grid(True, linestyle=':', alpha=0.6)
ax1.legend(loc='best')

# Plot Bode Magnitude (compatible with all python-control versions)
try:
    mag, phase, omega = ct.bode(L_open, omega=np.logspace(-2, 2, 200), plot=False)
except Exception:
    try:
        resp = ct.frequency_response(L_open, omega=np.logspace(-2, 2, 200))
        mag = resp.magnitude
        omega = resp.omega
    except Exception:
        omega = np.logspace(-2, 2, 200)
        s_mesh = 1j * omega
        num_v = np.polyval(num_plant, s_mesh)
        den_v = np.polyval(den_plant, s_mesh)
        mag = np.abs(num_v / den_v)

ax2.semilogx(omega, 20 * np.log10(np.squeeze(mag)), color='#0d9488', lw=2, label='Open-Loop |L(jw)| (dB)')
ax2.axhline(0, color='#ef4444', linestyle='--', alpha=0.7, label='0 dB Crossover Line')
ax2.set_title("Frequency-Domain Bode Magnitude", fontsize=12, fontweight='bold')
ax2.set_xlabel("Frequency (rad/s)")
ax2.set_ylabel("Magnitude (dB)")
ax2.grid(True, which='both', linestyle=':', alpha=0.6)
ax2.legend(loc='best')

plt.tight_layout()
plt.show()
`;
}
