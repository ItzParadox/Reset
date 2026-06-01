import { Component, useEffect, useMemo, useRef, useState } from 'react';
import BottomNav from './components/BottomNav.jsx';
import Onboarding from './views/Onboarding.jsx';
import Home from './views/Home.jsx';
import Today from './views/Today.jsx';
import Water from './views/Water.jsx';
import Weight from './views/Weight.jsx';
import Food from './views/Food.jsx';
import Meds from './views/Meds.jsx';
import Settings from './views/Settings.jsx';
import GoalModal from './components/GoalModal.jsx';
import DayClock from './components/DayClock.jsx';
import {
  APP_BUILD,
  clearLocalState,
  cloneDefaultState,
  completeOnboardingState,
  createDailyLog,
  createFoodEntry,
  createMedicationLog,
  createWeightLog,
  loadState,
  localDateKey,
  normaliseState,
  queueMutation,
  saveState,
  structuredCloneSafe,
} from './lib/storage.js';
import { calculateMaintenance, calculatePlan } from './lib/calculations.js';
import { validateWeightKg } from './lib/validation.js';
import { getInstallContext, registerAppServiceWorker } from './lib/pwa.js';

function timerLabel(seconds) {
  const remaining = Math.max(0, seconds);
  const minutes = Math.floor(remaining / 60).toString().padStart(2, '0');
  const secs = (remaining % 60).toString().padStart(2, '0');
  return `${minutes}:${secs}`;
}

function resetViewportScroll() {
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
  window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
}


class AppErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('Reset render error:', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <main className="app errorFallback">
          <header>
            <div className="logoLockup siteLogoLockup"><img className="siteLogoImage" src="/brand/reset-transparent-logo-v7.png" alt="" aria-hidden="true" /><span className="wordmark wordmarkEset">ESET</span></div>
            <h1>Something<br />went wrong.</h1>
            <p>The app hit a render error instead of showing a blank screen.</p>
          </header>
          <div className="card">
            <div className="label">Error</div>
            <p className="note strong">{this.state.error?.message || 'Unknown error'}</p>
            <button className="main" type="button" onClick={() => window.location.reload()}>Reload app</button>
          </div>
        </main>
      );
    }
    return this.props.children;
  }
}

function AppContent() {

  const [state, setState] = useState(() => loadState());
  const [pwaStatus, setPwaStatus] = useState(() => getInstallContext());
  const [booting, setBooting] = useState(true);
  const [goalCelebration, setGoalCelebration] = useState(null);
  const [clockNow, setClockNow] = useState(() => new Date());
  const [timerRunning, setTimerRunning] = useState(false);
  const intervalRef = useRef(null);
  const todayKey = localDateKey(clockNow);
  const showMedicationTab = state.onboardingProfile.usesWeightLossMedication && state.onboardingProfile.medicationName !== 'none';

  const todayDailyLog = useMemo(
    () => state.dailyLogs[todayKey] || createDailyLog(todayKey),
    [state.dailyLogs, todayKey],
  );

  const currentMedicationLog = useMemo(
    () => state.medicationLogs[todayKey] || createMedicationLog(todayKey, state.onboardingProfile.medicationName),
    [state.medicationLogs, state.onboardingProfile.medicationName, todayKey],
  );

  useEffect(() => {
    saveState(normaliseState(state));
  }, [state]);

  useEffect(() => {
    if (state.ui.activeTab !== 'meds' || showMedicationTab) return;
    setState((previous) => {
      const draft = structuredCloneSafe(previous);
      draft.ui.activeTab = 'home';
      return normaliseState(draft);
    });
  }, [showMedicationTab, state.ui.activeTab]);

  useEffect(() => {
    if (window.requestAnimationFrame && window.cancelAnimationFrame) {
      const frame = window.requestAnimationFrame(resetViewportScroll);
      return () => window.cancelAnimationFrame(frame);
    }
    const timeout = window.setTimeout(resetViewportScroll, 0);
    return () => window.clearTimeout(timeout);
  }, [state.ui.activeTab]);

  useEffect(() => {
    const bootTimer = window.setTimeout(() => setBooting(false), 1700);
    return () => window.clearTimeout(bootTimer);
  }, []);

  useEffect(() => () => window.clearInterval(intervalRef.current), []);

  useEffect(() => {
    const tick = () => setClockNow(new Date());
    tick();
    const clock = window.setInterval(tick, 1000);
    return () => window.clearInterval(clock);
  }, []);

  useEffect(() => {
    let mounted = true;
    const updatePwaStatus = (nextStatus) => {
      if (mounted) setPwaStatus(nextStatus);
    };

    registerAppServiceWorker(updatePwaStatus);

    const updateConnection = () => {
      if (!mounted) return;
      setPwaStatus((current) => ({
        ...current,
        online: navigator.onLine,
        standalone: current.standalone || window.navigator.standalone === true || window.matchMedia?.('(display-mode: standalone)').matches === true,
      }));
    };

    window.addEventListener('online', updateConnection);
    window.addEventListener('offline', updateConnection);
    return () => {
      mounted = false;
      window.removeEventListener('online', updateConnection);
      window.removeEventListener('offline', updateConnection);
    };
  }, []);

  function commit(updater, mutation = null) {
    setState((previous) => {
      let next = updater(structuredCloneSafe(previous));
      if (mutation) next = queueMutation(next, mutation);
      return normaliseState(next);
    });
  }

  function completeOnboarding(form, selectedDeficitLevel, warningAcknowledged) {
    const next = completeOnboardingState(form, selectedDeficitLevel, warningAcknowledged);
    next.sync.pending = [
      {
        id: crypto.randomUUID?.() || `pending_${Date.now()}`,
        mutation: { table: 'onboarding_bundle', action: 'upsert', payloadKey: 'current_user' },
        queuedAt: new Date().toISOString(),
      },
    ];
    setState(next);
  }

  function setActiveTab(activeTab) {
    commit((draft) => {
      draft.ui.activeTab = activeTab;
      return draft;
    });
    resetViewportScroll();
  }

  function saveWeight(weightKg) {
    if (validateWeightKg(weightKg)) return;
    const log = createWeightLog(weightKg);
    const previousWeight = Number(state.onboardingProfile.currentWeightKg || currentWeightFromLogs(state) || 0);
    const targetWeight = Number(state.onboardingProfile.goalWeightKg || 0);
    const reachedGoal = targetWeight > 0 && previousWeight > targetWeight && log.weightKg <= targetWeight;

    commit((draft) => {
      draft.weightLogs = [log, ...draft.weightLogs].slice(0, 300);
      draft.onboardingProfile.currentWeightKg = log.weightKg;
      draft.healthPlan = calculatePlan(draft.onboardingProfile, draft.healthPlan.selectedDeficitLevel, draft.healthPlan.warningAcknowledged);
      draft.settings.calorieTarget = draft.healthPlan.calorieTarget;
      return draft;
    }, { table: 'weight_logs', action: 'upsert', payload: log });

    if (reachedGoal) {
      window.setTimeout(() => setGoalCelebration({ reachedWeight: log.weightKg, goalWeight: targetWeight }), 180);
    }
  }

  function deleteWeight(logId) {
    commit((draft) => {
      draft.weightLogs = draft.weightLogs.filter((log) => log.id !== logId);
      const latest = draft.weightLogs[0];
      if (latest) {
        draft.onboardingProfile.currentWeightKg = Number(latest.weightKg);
        draft.healthPlan = calculatePlan(draft.onboardingProfile, draft.healthPlan.selectedDeficitLevel, draft.healthPlan.warningAcknowledged);
        draft.settings.calorieTarget = draft.healthPlan.calorieTarget;
      }
      return draft;
    });
  }

  function saveSettings(nextSettings) {
    const updatedAt = new Date().toISOString();
    commit((draft) => {
      draft.settings = { ...draft.settings, ...nextSettings, updatedAt };
      if (Object.prototype.hasOwnProperty.call(nextSettings, 'walkMinutes')) {
        const minutes = Number(nextSettings.walkMinutes);
        draft.ui.timer.durationSeconds = Number.isFinite(minutes) && minutes > 0 ? minutes * 60 : 0;
        draft.ui.timer.remainingSeconds = draft.ui.timer.durationSeconds;
      }
      return draft;
    }, { table: 'settings', action: 'update', payload: { ...nextSettings, updatedAt } });
  }

  function updatePlan(deficitLevel, warningAcknowledged = false) {
    commit((draft) => {
      const baselineMaintenance = calculateMaintenance(draft.onboardingProfile) || draft.healthPlan.maintenanceCalories;
      const selectedPercentage = deficitPercentageFor(deficitLevel);
      draft.healthPlan = calculatePlan(draft.onboardingProfile, deficitLevel, warningAcknowledged);
      draft.healthPlan.maintenanceCalories = baselineMaintenance;
      draft.healthPlan.calorieTarget = baselineMaintenance ? Math.round(baselineMaintenance * (1 - selectedPercentage)) : draft.healthPlan.calorieTarget;
      draft.settings.calorieTarget = draft.healthPlan.calorieTarget;
      draft.settings.updatedAt = new Date().toISOString();
      return draft;
    }, { table: 'health_plans', action: 'upsert', payloadKey: 'current_user' });
  }

  function toggleDaily(key) {
    commit((draft) => {
      const log = draft.dailyLogs[todayKey] || createDailyLog(todayKey);
      log[key] = log[key] !== true;
      log.updatedAt = new Date().toISOString();
      draft.dailyLogs[todayKey] = log;
      return draft;
    }, { table: 'daily_logs', action: 'upsert', payloadKey: todayKey });
  }

  function saveFoodEntry(input) {
    const entry = createFoodEntry(input);
    if (!entry.calories) return;
    commit((draft) => {
      const log = draft.dailyLogs[todayKey] || createDailyLog(todayKey);
      log.foodEntries = [entry, ...(Array.isArray(log.foodEntries) ? log.foodEntries : [])].slice(0, 80);
      log.caloriesConsumed = sumFoodCalories(log.foodEntries);
      const target = Number(draft.settings.calorieTarget || draft.healthPlan.calorieTarget || 0);
      log.calorieTargetHit = target > 0 && log.caloriesConsumed > 0 && log.caloriesConsumed <= target;
      log.updatedAt = new Date().toISOString();
      draft.dailyLogs[todayKey] = log;
      return draft;
    }, { table: 'daily_logs', action: 'upsert', payloadKey: todayKey });
  }

  function deleteFoodEntry(entryId) {
    commit((draft) => {
      const log = draft.dailyLogs[todayKey] || createDailyLog(todayKey);
      log.foodEntries = (Array.isArray(log.foodEntries) ? log.foodEntries : []).filter((entry) => entry.id !== entryId);
      log.caloriesConsumed = sumFoodCalories(log.foodEntries);
      const target = Number(draft.settings.calorieTarget || draft.healthPlan.calorieTarget || 0);
      log.calorieTargetHit = target > 0 && log.caloriesConsumed > 0 && log.caloriesConsumed <= target;
      log.updatedAt = new Date().toISOString();
      draft.dailyLogs[todayKey] = log;
      return draft;
    }, { table: 'daily_logs', action: 'upsert', payloadKey: todayKey });
  }

  function addWater(amountMl) {
    const cleanAmount = Math.min(Math.max(Number.parseInt(amountMl, 10) || 250, 50), 2000);
    commit((draft) => {
      const log = draft.dailyLogs[todayKey] || createDailyLog(todayKey);
      const target = Number(draft.settings.hydrationTarget || 2000);
      log.waterMl = Math.min(Number(log.waterMl || 0) + cleanAmount, Math.max(target, 20000));
      log.hydrationDone = target > 0 && log.waterMl >= target;
      log.updatedAt = new Date().toISOString();
      draft.dailyLogs[todayKey] = log;
      return draft;
    }, { table: 'daily_logs', action: 'upsert', payloadKey: todayKey });
  }

  function resetWater() {
    commit((draft) => {
      const log = draft.dailyLogs[todayKey] || createDailyLog(todayKey);
      log.waterMl = 0;
      log.hydrationDone = false;
      log.updatedAt = new Date().toISOString();
      draft.dailyLogs[todayKey] = log;
      return draft;
    }, { table: 'daily_logs', action: 'upsert', payloadKey: todayKey });
  }

  function saveWaterStep(amountMl) {
    const cleanAmount = Math.min(Math.max(Number.parseInt(amountMl, 10) || 250, 50), 2000);
    saveSettings({ waterStepMl: cleanAmount });
  }

  function saveHydrationTarget(amountMl) {
    const cleanAmount = Math.min(Math.max(Number.parseInt(amountMl, 10) || 2000, 250), 10000);
    saveSettings({ hydrationTarget: cleanAmount });
  }

  function saveDailyNotes(notes) {
    commit((draft) => {
      const log = draft.dailyLogs[todayKey] || createDailyLog(todayKey);
      log.notes = notes;
      log.updatedAt = new Date().toISOString();
      draft.dailyLogs[todayKey] = log;
      return draft;
    }, { table: 'daily_logs', action: 'upsert', payloadKey: todayKey });
  }

  function saveMedicationLog(patch) {
    commit((draft) => {
      const log = draft.medicationLogs[todayKey] || createMedicationLog(todayKey, draft.onboardingProfile.medicationName);
      draft.medicationLogs[todayKey] = { ...log, ...patch, updatedAt: new Date().toISOString() };
      return draft;
    }, { table: 'medication_logs', action: 'upsert', payloadKey: todayKey });
  }

  function startTimer() {
    if (intervalRef.current) return;
    if (state.ui.timer.durationSeconds <= 0 || state.ui.timer.remainingSeconds <= 0) return;
    setTimerRunning(true);
    intervalRef.current = window.setInterval(() => {
      setState((previous) => {
        const draft = structuredCloneSafe(previous);
        if (draft.ui.timer.remainingSeconds <= 0) {
          window.clearInterval(intervalRef.current);
          intervalRef.current = null;
          setTimerRunning(false);
          return draft;
        }
        draft.ui.timer.remainingSeconds -= 1;
        return normaliseState(draft);
      });
    }, 1000);
  }

  function pauseTimer() {
    window.clearInterval(intervalRef.current);
    intervalRef.current = null;
    setTimerRunning(false);
  }

  function resetTimer() {
    pauseTimer();
    setTimerRunning(false);
    commit((draft) => {
      draft.ui.timer.remainingSeconds = draft.ui.timer.durationSeconds;
      return draft;
    });
  }

  function setNewGoalWeight(goalWeightKg) {
    commit((draft) => {
      draft.onboardingProfile.goalWeightKg = Number(goalWeightKg);
      draft.healthPlan = calculatePlan(draft.onboardingProfile, draft.healthPlan.selectedDeficitLevel, draft.healthPlan.warningAcknowledged);
      draft.settings.calorieTarget = draft.healthPlan.calorieTarget;
      draft.profile.updatedAt = new Date().toISOString();
      return draft;
    }, { table: 'onboarding_profiles', action: 'update', payload: { goalWeightKg: Number(goalWeightKg) } });
    setGoalCelebration(null);
  }

  function exportData() {
    return JSON.stringify({
      exportedAt: new Date().toISOString(),
      app: 'Reset',
      storageVersion: state.version,
      build: APP_BUILD,
      note: 'Phase 4A local-first generalised onboarding baseline. Supabase schema should consume this shape next.',
      pwa: pwaStatus,
      data: state,
    }, null, 2);
  }

  async function copyExport(output) {
    try {
      await navigator.clipboard.writeText(output);
      return 'Copied.';
    } catch {
      return 'Copy failed. Select the text manually.';
    }
  }

  function resetLocalData() {
    const confirmed = window.confirm('Reset local Reset data on this browser?');
    if (!confirmed) return;
    pauseTimer();
    clearLocalState();
    setState(cloneDefaultState());
  }

  if (booting) {
    return (
      <main className="splashScreen">
        <div className="splashInner">
          <img className="splashLogoImage" src="/brand/reset-transparent-logo-v7.png" alt="Reset logo" />
          <div className="splashTitle">Reset</div>
          <p>Small resets. Real momentum.</p>
          <div className="splashProgress" aria-hidden="true"><span /></div>
        </div>
      </main>
    );
  }

  if (!state.profile.onboardingComplete) {
    return <Onboarding onComplete={completeOnboarding} />;
  }

  const views = {
    home: <Home state={state} todayDailyLog={todayDailyLog} onChangeTab={setActiveTab} />,
    today: (
      <Today
        state={state}
        dailyLog={todayDailyLog}
        timerText={timerLabel(state.ui.timer.remainingSeconds)}
        onToggleDaily={toggleDaily}
        onSaveDailyNotes={saveDailyNotes}
        timerRunning={timerRunning}
        onTimerStart={startTimer}
        onTimerPause={pauseTimer}
        onTimerReset={resetTimer}
        onSaveTimerDuration={(minutes) => saveSettings({ walkMinutes: minutes })}
      />
    ),
    water: <Water state={state} dailyLog={todayDailyLog} onAddWater={addWater} onResetWater={resetWater} onSaveWaterStep={saveWaterStep} onSaveHydrationTarget={saveHydrationTarget} />,
    weight: <Weight state={state} logs={state.weightLogs} onSaveWeight={saveWeight} onDeleteWeight={deleteWeight} />,
    food: <Food state={state} dailyLog={todayDailyLog} onSaveFoodEntry={saveFoodEntry} onDeleteFoodEntry={deleteFoodEntry} />,
    meds: <Meds state={state} medicationLog={currentMedicationLog} onSaveMedicationLog={saveMedicationLog} />,
    settings: (
      <Settings
        state={state}
        onSaveSettings={saveSettings}
        onExportData={exportData}
        onCopyExport={copyExport}
        onResetLocalData={resetLocalData}
      />
    ),
  };

  return (
    <>
      <main className="app">
        <header className="appHeader">
          <div className="headerTop">
            <div className="logoLockup siteLogoLockup"><img className="siteLogoImage" src="/brand/reset-transparent-logo-v7.png" alt="" aria-hidden="true" /><span className="wordmark wordmarkEset">ESET</span></div>
            <DayClock now={clockNow} />
          </div>
          <h1>One day<br />at a time.</h1>
          <p>Your targets, your pace, your data — nothing else.</p>
        </header>

        <section className="view active animatedPage" key={state.ui.activeTab} aria-live="polite">
          {views[state.ui.activeTab] || views.home}
        </section>
      </main>

      <BottomNav activeTab={state.ui.activeTab} onChange={setActiveTab} showMeds={showMedicationTab} />
      {goalCelebration ? (
        <GoalModal
          state={state}
          reachedWeight={goalCelebration.reachedWeight}
          onClose={() => setGoalCelebration(null)}
          onSetNewGoal={setNewGoalWeight}
        />
      ) : null}
    </>
  );
}

export default function App() {
  return (
    <AppErrorBoundary>
      <AppContent />
    </AppErrorBoundary>
  );
}

function currentWeightFromLogs(state) {
  if (Array.isArray(state.weightLogs) && state.weightLogs.length) return Number(state.weightLogs[0].weightKg);
  return Number(state.onboardingProfile.currentWeightKg || state.onboardingProfile.startWeightKg || 0);
}

function deficitPercentageFor(deficitLevel) {
  if (deficitLevel === 'aggressive') return 0.25;
  if (deficitLevel === 'extreme') return 0.35;
  return 0.15;
}

function sumFoodCalories(entries) {
  return (Array.isArray(entries) ? entries : []).reduce((total, entry) => total + (Number.parseInt(entry.calories, 10) || 0), 0);
}
