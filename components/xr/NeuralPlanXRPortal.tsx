import React, { useEffect, useState } from 'react';
import {
  CognitivePerformanceReport,
  DemoProfileId,
  TrackingMode,
  XRViewMode
} from '../../services/xr/xrTypes';
import { NeuralPlanXRLanding } from './NeuralPlanXRLanding';
import { SimulationStageManager } from './SimulationStageManager';
import { CognitiveResultsDashboard } from './CognitiveResultsDashboard';

interface NeuralPlanXRPortalProps {
  onClosePortal: () => void;
  onSessionComplete?: () => void;
}

const XR_LAST_REPORT_STORAGE_KEY = 'neuralplan_xr_last_report_v1';

export const NeuralPlanXRPortal: React.FC<NeuralPlanXRPortalProps> = ({
  onClosePortal,
  onSessionComplete
}) => {
  const [viewMode, setViewMode] = useState<XRViewMode>('landing');
  const [trackingMode, setTrackingMode] = useState<TrackingMode>('interactive_cursor');
  const [demoProfileId, setDemoProfileId] = useState<DemoProfileId>('profile_b');
  const [reducedMotion, setReducedMotion] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
    return false;
  });
  const [soundEnabled, setSoundEnabled] = useState<boolean>(false); // Muted by default
  const [sessionKey, setSessionKey] = useState<number>(1);
  const [activeReport, setActiveReport] = useState<CognitivePerformanceReport | null>(() => {
    try {
      const saved = localStorage.getItem(XR_LAST_REPORT_STORAGE_KEY);
      return saved ? (JSON.parse(saved) as CognitivePerformanceReport) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (activeReport) {
      try {
        localStorage.setItem(XR_LAST_REPORT_STORAGE_KEY, JSON.stringify(activeReport));
      } catch {
        // Ignore quota limits
      }
    }
  }, [activeReport]);

  const handleStartInteractive = () => {
    setTrackingMode('interactive_cursor');
    setSessionKey((k) => k + 1);
    setViewMode('simulation');
  };

  const handleStartDemo = (profileId: DemoProfileId) => {
    setTrackingMode('investor_demo_synthetic');
    setDemoProfileId(profileId);
    setSessionKey((k) => k + 1);
    setViewMode('simulation');
  };

  const handleCompleteReport = (report: CognitivePerformanceReport) => {
    setActiveReport(report);
    setViewMode('results');
    onSessionComplete?.();
  };

  if (viewMode === 'simulation') {
    return (
      <SimulationStageManager
        key={sessionKey}
        initialTrackingMode={trackingMode}
        initialDemoProfileId={demoProfileId}
        reducedMotion={reducedMotion}
        onToggleReducedMotion={() => setReducedMotion((v) => !v)}
        soundEnabled={soundEnabled}
        onToggleSound={() => setSoundEnabled((v) => !v)}
        onCompleteReport={handleCompleteReport}
        onExitToLanding={() => setViewMode('landing')}
      />
    );
  }

  if (viewMode === 'results' && activeReport) {
    return (
      <CognitiveResultsDashboard
        report={activeReport}
        onRetakeInteractive={handleStartInteractive}
        onRunDemoProfile={handleStartDemo}
        onBackToXRLanding={() => setViewMode('landing')}
        onReturnToNeuralPlan={onClosePortal}
      />
    );
  }

  return (
    <NeuralPlanXRLanding
      onStartInteractive={handleStartInteractive}
      onStartDemo={handleStartDemo}
      onBackToDashboard={onClosePortal}
      reducedMotion={reducedMotion}
      onToggleReducedMotion={() => setReducedMotion((v) => !v)}
      soundEnabled={soundEnabled}
      onToggleSound={() => setSoundEnabled((v) => !v)}
      lastReportAvailable={!!activeReport}
      onViewLastReport={() => {
        if (activeReport) setViewMode('results');
      }}
    />
  );
};
