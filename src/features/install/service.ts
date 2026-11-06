import { create } from "zustand";

type InstallPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};
interface InstallState {
  installed: boolean;
  available: boolean;
  prompting: boolean;
  accepted: boolean;
  offlineReady: boolean;
  open: boolean;
  error: string;
}
export const useInstall = create<InstallState>(() => ({
  installed: false,
  available: false,
  prompting: false,
  accepted: false,
  offlineReady: false,
  open: false,
  error: "",
}));
let deferredPrompt: InstallPrompt | undefined;
let started = false;

export function startInstallService() {
  if (started) return;
  started = true;
  const displayMode = window.matchMedia("(display-mode: standalone)");
  const minimalMode = window.matchMedia("(display-mode: minimal-ui)");
  const detectInstalled = () => {
    const standalone = (navigator as Navigator & { standalone?: boolean })
      .standalone;
    if (displayMode.matches || minimalMode.matches || standalone) {
      deferredPrompt = undefined;
      useInstall.setState({
        installed: true,
        available: false,
        prompting: false,
        open: false,
        error: "",
      });
    }
  };
  detectInstalled();
  // Capture once at startup, before lazy-loaded routes such as Settings mount.
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    if (useInstall.getState().installed) return;
    deferredPrompt = event as InstallPrompt;
    useInstall.setState({ available: true, accepted: false, error: "" });
  });
  window.addEventListener("appinstalled", () => {
    deferredPrompt = undefined;
    useInstall.setState({
      installed: true,
      available: false,
      prompting: false,
      accepted: false,
      open: false,
      error: "",
    });
  });
  for (const mode of [displayMode, minimalMode]) {
    if (mode.addEventListener) mode.addEventListener("change", detectInstalled);
    else mode.addListener(detectInstalled);
  }
  window.addEventListener("pageshow", detectInstalled);
  window.addEventListener("focus", detectInstalled);
  if (window.isSecureContext && "serviceWorker" in navigator) {
    navigator.serviceWorker.ready
      .then((registration) => {
        if (registration.active) useInstall.setState({ offlineReady: true });
      })
      .catch(() => {});
  }
}

export function openInstall() {
  useInstall.setState({ open: true });
}
export function closeInstall() {
  useInstall.setState({ open: false });
}

export async function installApp() {
  const state = useInstall.getState();
  if (state.installed || state.prompting) return;
  const event = deferredPrompt;
  if (!event) {
    openInstall();
    return;
  }
  // Browser prompts are single-use and must start directly from a user gesture.
  deferredPrompt = undefined;
  useInstall.setState({ available: false, prompting: true, error: "" });
  try {
    await event.prompt();
    const choice = await event.userChoice;
    if (!useInstall.getState().installed)
      useInstall.setState({ accepted: choice.outcome === "accepted" });
  } catch {
    useInstall.setState({
      open: true,
      error: "Installation could not start. Try the browser menu instead.",
    });
  } finally {
    useInstall.setState({ prompting: false });
  }
  // An accepted prompt is not proof that installation has completed.
  // Only appinstalled or standalone display mode marks the app as installed.
}
