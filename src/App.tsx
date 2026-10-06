import React, { useMemo, useState } from 'react';
import { Header, ActiveTab } from './components/layout/Header';
import { WikiNavigation } from './components/wiki/WikiNavigation';
import { TopologyBuilder } from './components/topology/TopologyBuilder';
import { TransferFunctionConfig } from './components/transferFunction/TransferFunctionConfig';
import { FeedbackModeComparator } from './components/feedbackMode/FeedbackModeComparator';
import { TimeDomainLab } from './components/timeDomain/TimeDomainLab';
import { FrequencyDomainLab } from './components/frequencyDomain/FrequencyDomainLab';
import { PidTuner } from './components/pidTuner/PidTuner';
import { AiInsightsPanel } from './components/aiInsights/AiInsightsPanel';
import { PythonCodeEngine } from './components/codeEngine/PythonCodeEngine';
import { CaseLibrary } from './components/caseLibrary/CaseLibrary';
import { DataReportLab } from './components/dataReport/DataReportLab';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import {
  CaseStudy,
  FeedbackMode,
  InputSignalType,
  PidParameters,
  TransferFunctionModel,
} from './types/control';
import {
  pidToTf,
  simulateTimeDomain,
} from './services/controlMath';
import { CheckCircle2, RotateCcw } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('topology');
  const [feedbackMode, setFeedbackMode] = useState<FeedbackMode>('negative');

  // Plant G(s) model: Default 1 / (s^2 + 2s + 1)
  const [plant, setPlant] = useState<TransferFunctionModel>({
    numerator: [1],
    denominator: [1, 2, 1],
    delay: 0,
    gain: 1,
  });

  // PID Parameters
  const [pidParams, setPidParams] = useState<PidParameters>({
    kp: 2.0,
    ki: 0.6,
    kd: 0.8,
    filterCoeffN: 10,
    antiWindup: true,
  });

  const [feedbackGain, setFeedbackGain] = useState<number>(1.0);
  const [signalType, setSignalType] = useState<InputSignalType>('step');
  const [amplitude, setAmplitude] = useState<number>(1.0);
  const [disturbanceMag, setDisturbanceMag] = useState<number>(0);
  const [disturbanceTime, setDisturbanceTime] = useState<number>(5.0);

  // Toast notification
  const [notification, setNotification] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  // Convert PID to controller transfer function
  const controller = useMemo(() => pidToTf(pidParams), [pidParams]);

  // Run full simulation
  const simResult = useMemo(() => {
    return simulateTimeDomain({
      plant,
      controller,
      mode: feedbackMode,
      signalType,
      amplitude,
      disturbanceMag,
      disturbanceTime,
      totalTime: 12,
      timeStep: 0.02,
      feedbackGain,
      antiWindup: pidParams.antiWindup,
    });
  }, [
    plant,
    controller,
    feedbackMode,
    signalType,
    amplitude,
    disturbanceMag,
    disturbanceTime,
    feedbackGain,
    pidParams.antiWindup,
  ]);

  // Load from Case Library
  const handleLoadCase = (c: CaseStudy) => {
    setFeedbackMode(c.type);
    setPlant({
      numerator: [...c.forwardPlant.numerator],
      denominator: [...c.forwardPlant.denominator],
      delay: c.forwardPlant.delay,
      gain: 1,
    });
    setFeedbackGain(c.feedbackGain);
    if (c.recommendedPid) {
      setPidParams({ ...c.recommendedPid });
    }
    setDisturbanceMag(c.defaultDisturbance);
    setDisturbanceTime(5.0);
    setActiveTab('timeDomain');
    showToast(`已成功载入案例：${c.title} (${c.type === 'positive' ? '正反馈' : '负反馈'})`);
  };

  // Reset to clean benchmark system
  const handleReset = () => {
    setFeedbackMode('negative');
    setPlant({
      numerator: [1],
      denominator: [1, 2, 1],
      delay: 0,
      gain: 1,
    });
    setPidParams({
      kp: 2.0,
      ki: 0.6,
      kd: 0.8,
      filterCoeffN: 10,
      antiWindup: true,
    });
    setFeedbackGain(1.0);
    setDisturbanceMag(0);
    setSignalType('step');
    showToast('已重置为标准二阶稳定负反馈基准系统');
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f8f9fa] text-slate-800 font-sans">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-4 right-4 z-50 bg-slate-900 text-white text-xs px-4 py-2.5 rounded-lg shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{notification}</span>
        </div>
      )}

      {/* Global Header & Nav Slices */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        feedbackMode={feedbackMode}
        setFeedbackMode={setFeedbackMode}
        metrics={simResult.metrics}
        onReset={handleReset}
      />

      {/* Main Workspace Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        <ErrorBoundary fallbackTitle="系统模块加载异常" onReset={handleReset}>
          {activeTab === 'wiki' && <WikiNavigation />}

          {activeTab === 'topology' && (
            <TopologyBuilder
              plant={plant}
              setPlant={setPlant}
              controller={controller}
              setController={setPlant}
              feedbackMode={feedbackMode}
              setFeedbackMode={setFeedbackMode}
              pidParams={pidParams}
              setPidParams={setPidParams}
              feedbackGain={feedbackGain}
              setFeedbackGain={setFeedbackGain}
              disturbanceMag={disturbanceMag}
              setDisturbanceMag={setDisturbanceMag}
              lastSimPoint={simResult.points[simResult.points.length - 1]}
            />
          )}

          {activeTab === 'transferFunction' && (
            <TransferFunctionConfig
              plant={plant}
              setPlant={setPlant}
              closedLoopTf={simResult.closedLoopTf}
              feedbackMode={feedbackMode}
            />
          )}

          {activeTab === 'feedbackMode' && (
            <FeedbackModeComparator
              plant={plant}
              controller={controller}
              feedbackMode={feedbackMode}
              setFeedbackMode={setFeedbackMode}
              feedbackGain={feedbackGain}
            />
          )}

          {activeTab === 'timeDomain' && (
            <TimeDomainLab
              points={simResult.points}
              metrics={simResult.metrics}
              signalType={signalType}
              setSignalType={setSignalType}
              amplitude={amplitude}
              setAmplitude={setAmplitude}
              disturbanceMag={disturbanceMag}
              setDisturbanceMag={setDisturbanceMag}
              disturbanceTime={disturbanceTime}
              setDisturbanceTime={setDisturbanceTime}
              feedbackMode={feedbackMode}
            />
          )}

          {activeTab === 'frequencyDomain' && (
            <FrequencyDomainLab
              plant={plant}
              controller={controller}
              feedbackGain={feedbackGain}
            />
          )}

          {activeTab === 'pidTuner' && (
            <PidTuner
              pidParams={pidParams}
              setPidParams={setPidParams}
              points={simResult.points}
              metrics={simResult.metrics}
            />
          )}

          {activeTab === 'aiInsights' && (
            <AiInsightsPanel
              plant={plant}
              closedLoopTf={simResult.closedLoopTf}
              feedbackMode={feedbackMode}
              pidParams={pidParams}
              setPidParams={setPidParams}
              metrics={simResult.metrics}
            />
          )}

          {activeTab === 'codeEngine' && (
            <PythonCodeEngine
              plant={plant}
              controller={controller}
              mode={feedbackMode}
              delay={plant.delay}
              pid={pidParams}
              metrics={simResult.metrics}
              points={simResult.points}
            />
          )}

          {activeTab === 'caseLibrary' && (
            <CaseLibrary
              onLoadCase={handleLoadCase}
              activeFeedbackMode={feedbackMode}
            />
          )}

          {activeTab === 'dataReport' && (
            <DataReportLab onLoadCase={handleLoadCase} />
          )}
        </ErrorBoundary>
      </main>

      {/* Quiet Refined Footer */}
      <footer className="border-t border-slate-200 bg-white/70 py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-800">Feedback Lab</span>
            <span>·</span>
            <span>反馈系统控制实验室</span>
          </div>
          <div>
            基于现代控制理论与系统动力学 · 纯客户端数值积分与频域分析
          </div>
        </div>
      </footer>
    </div>
  );
}
