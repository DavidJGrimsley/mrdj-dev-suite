import React, { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Play, Square, RefreshCw, AlertTriangle, Clock, ShieldAlert } from "lucide-react";
import { DeviceClientProvider, DeviceScreen, useDeviceScreenClient } from "@expo/hub-client";
import { assetUrl } from "../assetUrl";

function HubDeviceScreen({ borderRadius = 0 }: { borderRadius?: number }) {
  const client = useDeviceScreenClient();
  if (!client) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4 text-center text-[#555]">
        <RefreshCw size={20} className="animate-spin text-[#abefa3] mb-2" />
        <span className="text-[11px]">Connecting to remote Android device stream...</span>
      </div>
    );
  }
  return <DeviceScreen client={client} borderRadius={borderRadius} />;
}

export interface SimulatorSessionData {
  id: string;
  projectId: string;
  platform: string;
  status: "starting" | "active" | "stopping" | "stopped" | "failed" | "expired" | "uncertain";
  durationSeconds: number;
  remainingSeconds: number;
  createdAt?: string;
  expiresAt?: string;
  webPreviewUrl?: string | null;
  previewApiUrl?: string | null;
  webPreviewToken?: string | null;
  errorCode?: string;
}

export interface SimulatorBudgetStatus {
  monthlyBudgetSeconds: number;
  maxSessionSeconds: number;
  usedSeconds: number;
  reservedSeconds: number;
  remainingSeconds: number;
  exhausted: boolean;
  month?: string;
}

export interface SimulatorProviderStatus {
  available: boolean;
  simulated?: boolean;
  name?: string;
  reason?: string;
  message?: string;
}

export interface SimulatorPreviewProps {
  projectId?: string;
  platform?: string;
  device?: string;
  initialMode?: "auto" | "simulated" | "eas";
  initialLoading?: boolean;
  initialSession?: SimulatorSessionData | null;
  initialProvider?: SimulatorProviderStatus;
  initialBudget?: SimulatorBudgetStatus | null;
  initialSimulatedFallbackActive?: boolean;
  initialError?: string | null;
  initialUncertainNotice?: string | null;
  initialTimeRemaining?: number;
  controlsTarget?: HTMLElement | null;
  onLiveChange?: (live: boolean) => void;
}

export function createClientFallbackSession({
  projectId = "pet-show-and-tell",
  platform = "android",
  durationSeconds = 300,
}: {
  projectId?: string;
  platform?: string;
  durationSeconds?: number;
} = {}): SimulatorSessionData {
  return {
    id: "sim_client_" + Date.now(),
    projectId,
    platform,
    status: "active",
    durationSeconds,
    remainingSeconds: durationSeconds,
  };
}

// Self-contained, secure inline simulated interface for Pet Show and Tell Android Preview.
// Renders seamlessly without duplicate status bars or navigation bars since the parent
// DeviceFrame already renders native emulator top chrome and bottom navigation bars.
export const SIMULATED_PREVIEW_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Pet Show and Tell · Simulated Android Preview</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background: #f7f5ef;
      color: #1a1a1a;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      display: flex;
      flex-direction: column;
      height: 100vh;
      box-sizing: border-box;
      user-select: none;
    }
    .banner {
      background: #eab308;
      color: #000;
      font-size: 10px;
      font-weight: 700;
      padding: 4px 10px;
      text-align: center;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      flex-shrink: 0;
    }
    .app-header {
      background: #ffffff;
      padding: 14px 16px;
      border-bottom: 1px solid #e0dfd5;
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-shrink: 0;
    }
    .app-title {
      font-size: 17px;
      font-weight: 700;
      color: #234e38;
      margin: 0;
    }
    .badge {
      font-size: 11px;
      background: #e5eee3;
      color: #234e38;
      padding: 3px 7px;
      border-radius: 5px;
      font-weight: 600;
    }
    .feed-container {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .card {
      background: #ffffff;
      border-radius: 12px;
      border: 1px solid #e0dfd5;
      padding: 14px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.04);
    }
    .card-author {
      font-size: 13px;
      font-weight: 600;
      margin-bottom: 8px;
      color: #333;
    }
    .card-image-placeholder {
      width: 100%;
      height: 170px;
      background: #e5eee3;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 40px;
    }
    .card-caption {
      font-size: 12px;
      color: #555;
      margin-top: 10px;
      line-height: 1.4;
    }
    .action-bar {
      padding: 10px 16px;
      background: #ffffff;
      border-top: 1px solid #e0dfd5;
      display: flex;
      justify-content: space-around;
      flex-shrink: 0;
    }
    .action-btn {
      background: #234e38;
      color: #fff;
      border: none;
      padding: 8px 18px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
    }
  </style>
</head>
<body>
  <div class="banner">Simulated Preview · Not a Live EAS Simulator</div>
  <div class="app-header">
    <h1 class="app-title">🐾 Pet Show and Tell</h1>
    <span class="badge">Time-Limited Session</span>
  </div>
  <div class="feed-container">
    <div class="card">
      <div class="card-author">🐶 Buster the Golden Retriever</div>
      <div class="card-image-placeholder">🐕</div>
      <div class="card-caption">First day at the dog park learning fetch! Ready for show and tell!</div>
    </div>
    <div class="card">
      <div class="card-author">🐱 Mochi the Calico</div>
      <div class="card-image-placeholder">🐈</div>
      <div class="card-caption">Sunbeam nap champion 2026. Living her best life.</div>
    </div>
  </div>
  <div class="action-bar">
    <button class="action-btn" type="button">+ Add Pet Photo</button>
  </div>
</body>
</html>`;

export function SimulatorPreview({
  projectId = "pet-show-and-tell",
  platform = "android",
  device = "Pixel 7 Pro",
  initialLoading = true,
  initialSession = null,
  initialProvider = { available: true, simulated: true },
  initialBudget = null,
  initialSimulatedFallbackActive = false,
  initialError = null,
  initialUncertainNotice = null,
  initialTimeRemaining = 0,
  controlsTarget = null,
  onLiveChange,
}: SimulatorPreviewProps) {
  const [loading, setLoading] = useState(initialLoading);
  const [actionInFlight, setActionInFlight] = useState(false);
  const [provider, setProvider] = useState<SimulatorProviderStatus>(initialProvider);
  const [budget, setBudget] = useState<SimulatorBudgetStatus | null>(initialBudget);
  const [session, setSession] = useState<SimulatorSessionData | null>(initialSession);
  const [csrfToken, setCsrfToken] = useState<string>("");
  const [error, setError] = useState<string | null>(initialError);
  const [uncertainNotice, setUncertainNotice] = useState<string | null>(initialUncertainNotice);
  const [timeRemaining, setTimeRemaining] = useState<number>(initialTimeRemaining);
  const [simulatedFallbackActive, setSimulatedFallbackActive] = useState<boolean>(initialSimulatedFallbackActive);

  // Poll / check session status
  const fetchStatus = useCallback(async () => {
    try {
      const url = assetUrl("api/simulator/session");
      const res = await fetch(url, {
        method: "GET",
        headers: { Accept: "application/json" },
        credentials: "same-origin",
      });

      if (!res.ok) {
        if (res.status === 401) {
          setError("Private beta session required. Sign in with access code to use simulator preview.");
        } else {
          setError(`Simulator status check returned HTTP ${res.status}`);
        }
        setLoading(false);
        return;
      }

      const data = await res.json();
      if (data.csrfToken) setCsrfToken(data.csrfToken);
      if (data.provider) setProvider(data.provider);
      if (data.budget) setBudget(data.budget);

      if (data.session) {
        setSession(data.session);
        const rem = data.session.remainingSeconds ?? 0;
        setTimeRemaining(rem);
        if (data.session.status === "uncertain") {
          setUncertainNotice("Session start is pending reconciliation. Budget remains reserved.");
        } else {
          setUncertainNotice(null);
        }
      } else {
        setSession(null);
        setTimeRemaining(0);
        setUncertainNotice(null);
      }
      setError(null);
    } catch {
      // Backend not running (e.g. standalone Vite dev server) -> Enable labeled client-side simulated fallback
      setSimulatedFallbackActive(true);
      setProvider({
        available: true,
        simulated: true,
        name: "simulated_standalone",
        message: "Running in client-side simulated fallback mode.",
      });
      setBudget(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!initialLoading) return;
    fetchStatus();
  }, [fetchStatus, initialLoading]);

  useEffect(() => {
    if (session?.status !== "starting" && !(session?.status === "active" && !provider.simulated && !simulatedFallbackActive && (!session.previewApiUrl || !session.webPreviewToken))) return;
    const timer = window.setInterval(fetchStatus, 5000);
    return () => window.clearInterval(timer);
  }, [session?.status, session?.previewApiUrl, session?.webPreviewToken, provider.simulated, simulatedFallbackActive, fetchStatus]);

  const live = session?.status === "active" && !provider.simulated && !simulatedFallbackActive &&
    !session.id.startsWith("sim_client_") && Boolean(session.previewApiUrl && session.webPreviewToken);
  useEffect(() => { onLiveChange?.(Boolean(live)); return () => onLiveChange?.(false); }, [live, onLiveChange]);

  // Countdown timer for active session
  useEffect(() => {
    if (!session || session.status !== "active" || timeRemaining <= 0) return;
    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setSession((s) => (s ? { ...s, status: "expired" } : null));
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [session, timeRemaining]);

  const handleStart = async () => {
    setActionInFlight(true);
    setError(null);

    // If live provider is disabled or running in client-side fallback mode,
    // start client-side preview immediately without calling a disabled real endpoint
    if (!provider.available || simulatedFallbackActive) {
      const mockSession = createClientFallbackSession({
        projectId,
        platform,
        durationSeconds: 300,
      });
      setSession(mockSession);
      setTimeRemaining(300);
      setSimulatedFallbackActive(true);
      setActionInFlight(false);
      return;
    }

    try {
      const url = assetUrl("api/simulator/start");
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfToken,
        },
        credentials: "same-origin",
        body: JSON.stringify({
          projectId,
          platform,
          durationMinutes: 5,
        }),
      });

      if (res.status === 201) {
        const data = await res.json();
        setSession(data.session);
        setTimeRemaining(data.session.durationSeconds || 300);
        setUncertainNotice(null);
        await fetchStatus();
      } else if (res.status === 202) {
        const data = await res.json();
        setUncertainNotice(data.message || "Start outcome is uncertain. Budget remains reserved.");
        await fetchStatus();
      } else if (res.status === 409) {
        setError("Another simulator session is already active or starting.");
        await fetchStatus();
      } else if (res.status === 429) {
        setError("Monthly preview safety budget exhausted.");
        await fetchStatus();
      } else if (res.status === 503) {
        setError("EAS Android Simulator is disabled. Live provider requires explicit setup.");
        await fetchStatus();
      } else {
        const text = await res.text();
        setError(`Failed to start simulator: ${text}`);
      }
    } catch {
      setError("The start response was lost. Check the session status before trying again.");
      await fetchStatus();
    } finally {
      setActionInFlight(false);
    }
  };

  const handleStop = async () => {
    if (!session) return;
    setActionInFlight(true);

    if (session.id.startsWith("sim_client_")) {
      setSession(null);
      setTimeRemaining(0);
      setActionInFlight(false);
      return;
    }

    try {
      const url = assetUrl("api/simulator/stop");
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfToken,
        },
        credentials: "same-origin",
        body: JSON.stringify({ sessionId: session.id }),
      });
      if (!response.ok) throw new Error("Stop could not be confirmed");
      await fetchStatus();
    } catch {
      setError("Could not confirm that the preview stopped. Check its status before starting another.");
    } finally {
      setActionInFlight(false);
    }
  };

  const handleReconcile = async () => {
    if (!session) return;
    setActionInFlight(true);

    if (session.id.startsWith("sim_client_")) {
      setSession(null);
      setUncertainNotice(null);
      setActionInFlight(false);
      return;
    }

    try {
      const url = assetUrl("api/simulator/reconcile");
      await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfToken,
        },
        credentials: "same-origin",
        body: JSON.stringify({ sessionId: session.id }),
      });
      await fetchStatus();
    } catch (err: any) {
      setError(`Reconciliation failed: ${err.message}`);
    } finally {
      setActionInFlight(false);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const remainingBudgetMins = budget ? Math.floor(budget.remainingSeconds / 60) : null;

  // 1. Loading state
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center bg-[#0d0d0d] text-white">
        <RefreshCw size={24} className="animate-spin text-[#abefa3] mb-3" />
        <p className="font-['Rounded_Mplus_1c',sans-serif] text-[13px] text-[#ccc]">
          Checking simulator foundation status...
        </p>
      </div>
    );
  }

  // 2. Provider Unavailable State (Live EAS disabled by default)
  if (!provider.available && !provider.simulated && !simulatedFallbackActive) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center bg-[#0d0d0d] text-white select-none">
        <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-3">
          <ShieldAlert size={24} className="text-amber-400" />
        </div>
        <span className="inline-block px-2.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 uppercase tracking-wider mb-2">
          Provider Disabled by Default
        </span>
        <h3 className="font-['Rounded_Mplus_1c',sans-serif] text-[14px] font-bold mb-1">
          EAS Cloud Simulator Unavailable
        </h3>
        <p className="text-[12px] text-[#888] max-w-[280px] mb-4 leading-relaxed">
          Official EAS Android Simulator requires an Expo account, project linkage, and explicit operator authorization.
        </p>
        <button
          onClick={() => setSimulatedFallbackActive(true)}
          className="px-4 py-2 bg-[#234e38] hover:bg-[#2d6347] text-[#abefa3] rounded-lg text-[12px] font-medium transition-colors"
        >
          Use Labeled Simulated Fallback
        </button>
      </div>
    );
  }

  if (session?.status === "starting" || session?.status === "stopping") {
    return <div className="flex flex-col items-center justify-center h-full p-6 text-center bg-[#0d0d0d] text-white">
      <RefreshCw size={24} className="animate-spin text-[#abefa3] mb-3" />
      <p>{session.status === "starting" ? "Starting Android preview…" : "Stopping Android preview…"}</p>
    </div>;
  }

  // 3. Active Session State
  if (session && session.status === "active") {
    if (!provider.simulated && !simulatedFallbackActive && !session.id.startsWith("sim_client_") && (!session.previewApiUrl || !session.webPreviewToken)) {
      return <div className="flex flex-col items-center justify-center h-full p-6 text-center bg-[#0d0d0d] text-white">
        <RefreshCw size={24} className="animate-spin text-[#abefa3] mb-3" />
        <p>Connecting to Android preview…</p>
      </div>;
    }
    const isLiveEas =
      !provider.simulated &&
      !simulatedFallbackActive &&
      !session.id.startsWith("sim_client_") &&
      Boolean(session.previewApiUrl && session.webPreviewToken);
    const isSimulated = !isLiveEas;

    return (
      <div className="flex flex-col h-full w-full bg-[#0d0d0d] overflow-hidden select-none">
        {controlsTarget && createPortal(<div className="flex items-center justify-between gap-2 px-3 py-1.5 bg-[#171616] shrink-0">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded text-[9px] font-bold tracking-wide">
              {isSimulated ? "SIMULATED PREVIEW" : "LIVE EAS SIMULATOR"}
            </span>
            <span className="text-[11px] font-medium text-white">{projectId}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-[11px] text-[#abefa3] font-mono font-medium">
              <Clock size={11} />
              <span>{formatTime(timeRemaining)}</span>
            </div>
            <button
              onClick={handleStop}
              disabled={actionInFlight}
              className="flex items-center gap-1 px-2 py-0.5 bg-red-900/30 hover:bg-red-900/50 text-red-300 border border-red-700/40 rounded text-[10px] font-medium transition-colors"
              title="Stop simulator session"
            >
              <Square size={10} /> Stop
            </button>
          </div>
        </div>, controlsTarget)}

        {/* Viewport: live device or labeled simulated fallback */}
        <div className="flex-1 w-full bg-[#f7f5ef] relative overflow-hidden flex items-center justify-center">
          {isLiveEas ? (
            <DeviceClientProvider
              platform="android"
              options={{
                baseUrl: session.previewApiUrl!.replace(/\/+$/, "") + "/vendor/serve-emu",
                token: session.webPreviewToken,
                streamMode: "webrtc",
              }}
            >
              <HubDeviceScreen borderRadius={0} />
            </DeviceClientProvider>
          ) : (
            <iframe
              srcDoc={SIMULATED_PREVIEW_HTML}
              title="Pet Show and Tell Android Simulator (Simulated Preview)"
              sandbox="allow-scripts allow-same-origin allow-forms"
              referrerPolicy="no-referrer"
              className="w-full h-full border-0"
            />
          )}
        </div>

      </div>
    );
  }

  // 4. Uncertain Start State (needs reconciliation)
  if (session && session.status === "uncertain") {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center bg-[#0d0d0d] text-white select-none">
        <div className="w-12 h-12 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center mb-3">
          <AlertTriangle size={24} className="text-orange-400" />
        </div>
        <span className="inline-block px-2.5 py-0.5 rounded text-[10px] font-bold bg-orange-500/20 text-orange-300 uppercase tracking-wider mb-2">
          Start Uncertain
        </span>
        <h3 className="font-['Rounded_Mplus_1c',sans-serif] text-[14px] font-bold mb-1">
          Lost Start Response
        </h3>
        <p className="text-[12px] text-[#aaa] max-w-[280px] mb-2 leading-relaxed">
          Connection timed out during session start.
        </p>
        <p className="text-[11px] text-[#777] max-w-[280px] mb-4">
          The preview is being checked. Please try again when its status is confirmed.
        </p>
        <button
          onClick={handleReconcile}
          disabled={actionInFlight}
          className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-[12px] font-semibold transition-colors disabled:opacity-50"
        >
          <RefreshCw size={12} className={actionInFlight ? "animate-spin" : ""} />
          Reconcile with Provider
        </button>
      </div>
    );
  }

  // 5. Expired State
  if (session && session.status === "expired") {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center bg-[#0d0d0d] text-white select-none">
        <div className="w-12 h-12 rounded-xl bg-neutral-800 border border-white/10 flex items-center justify-center mb-3">
          <Clock size={24} className="text-neutral-400" />
        </div>
        <span className="inline-block px-2.5 py-0.5 rounded text-[10px] font-bold bg-neutral-800 text-neutral-300 uppercase tracking-wider mb-2">
          Session Expired
        </span>
        <h3 className="font-['Rounded_Mplus_1c',sans-serif] text-[14px] font-bold mb-1">
          Preview Session Limit Reached
        </h3>
        <p className="text-[12px] text-[#888] max-w-[280px] mb-4">
          Preview sessions are time-limited to protect monthly budget. Start a new session to continue.
        </p>
        <button
          onClick={handleStart}
          disabled={actionInFlight || (budget ? budget.exhausted : false)}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#234e38] hover:bg-[#2d6347] text-[#abefa3] rounded-lg text-[12px] font-semibold transition-colors disabled:opacity-50"
        >
          <Play size={12} /> Start New Session
        </button>
      </div>
    );
  }

  // 6. Budget Exhausted State
  if (budget && budget.exhausted && !simulatedFallbackActive) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center bg-[#0d0d0d] text-white select-none">
        <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-3">
          <ShieldAlert size={24} className="text-red-400" />
        </div>
        <span className="inline-block px-2.5 py-0.5 rounded text-[10px] font-bold bg-red-500/20 text-red-300 uppercase tracking-wider mb-2">
          Budget Cap Reached
        </span>
        <h3 className="font-['Rounded_Mplus_1c',sans-serif] text-[14px] font-bold mb-1">
          Monthly Simulator Budget Exhausted
        </h3>
        <p className="text-[12px] text-[#888] max-w-[280px] mb-2 leading-relaxed">
          The monthly safety budget for this private beta environment has been reached.
        </p>
        <p className="text-[11px] text-[#666] max-w-[280px]">
          Budget resets at the beginning of each calendar month.
        </p>
        <button onClick={() => setSimulatedFallbackActive(true)} className="mt-3 px-4 py-2 bg-[#234e38] text-[#abefa3] rounded-lg text-[12px]">
          Use simulated preview
        </button>
      </div>
    );
  }

  // 7. Idle / Ready to Start State
  return (
    <div className="flex flex-col items-center justify-center h-full p-6 text-center bg-[#0d0d0d] text-white select-none">
      <div className="w-14 h-14 rounded-2xl bg-[#1d1b20] border border-white/10 flex items-center justify-center mb-3 shadow-lg">
        <span className="text-2xl">🐾</span>
      </div>

      <div className="flex items-center gap-2 mb-2">
        <span className="inline-block px-2.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase tracking-wider">
          {provider.simulated || simulatedFallbackActive ? "Simulated Fallback Mode" : "EAS Android Mode"}
        </span>
      </div>

      <h3 className="font-['Rounded_Mplus_1c',sans-serif] text-[15px] font-bold text-white mb-1">
        Pet Show and Tell
      </h3>
      <p className="text-[11px] text-[#777] mb-3">
        Android Preview · {device}
      </p>

      {error && (
        <div className="mb-3 px-3 py-1.5 bg-red-950/40 border border-red-800/50 rounded text-red-300 text-[11px] max-w-[280px]">
          {error}
        </div>
      )}

      {uncertainNotice && (
        <div className="mb-3 px-3 py-1.5 bg-orange-950/40 border border-orange-800/50 rounded text-orange-300 text-[11px] max-w-[280px]">
          {uncertainNotice}
        </div>
      )}

      <button
        onClick={handleStart}
        disabled={actionInFlight}
        className="flex items-center gap-2 px-5 py-2.5 bg-[#234e38] hover:bg-[#2d6347] active:bg-[#1b3d2b] text-[#abefa3] font-semibold text-[13px] rounded-xl shadow-md transition-all disabled:opacity-50 mb-3"
      >
        {actionInFlight ? (
          <>
            <RefreshCw size={14} className="animate-spin" />
            <span>Starting session...</span>
          </>
        ) : (
          <>
            <Play size={14} />
            <span>Start Preview (5 min max)</span>
          </>
        )}
      </button>

      <div className="flex items-center gap-3 text-[10px] text-[#666]">
        <span>Max session: 5 min</span>
        <span>•</span>
        <span>{remainingBudgetMins !== null ? `Monthly budget: ${remainingBudgetMins}m left` : "Monthly budget active"}</span>
      </div>
    </div>
  );
}
