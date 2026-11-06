import { Check, Download, Smartphone, WifiOff } from "lucide-react";
import { Modal } from "../../components/ui";
import { closeInstall, installApp, openInstall, useInstall } from "./service";

export function InstallButton({
  iconOnly = false,
  className = "button secondary",
}: {
  iconOnly?: boolean;
  className?: string;
}) {
  const installed = useInstall((s) => s.installed);
  const prompting = useInstall((s) => s.prompting);
  if (installed) return null;
  return (
    <button
      type="button"
      className={className + (iconOnly ? " install-trigger" : "")}
      aria-label={prompting ? "Opening installer…" : "Install app"}
      title="Install app"
      disabled={prompting}
      aria-busy={prompting}
      onClick={() => void installApp()}
    >
      <Download size={18} aria-hidden="true" />
      {!iconOnly && (prompting ? "Opening installer…" : "Install app")}
    </button>
  );
}
export function InstallSection() {
  const installed = useInstall((s) => s.installed);
  const offlineReady = useInstall((s) => s.offlineReady);
  return (
    <section
      className="card settings-card install-card"
      aria-label="App installation"
    >
      <h3>
        <Smartphone size={19} aria-hidden="true" />
        Install on your device
      </h3>
      {installed ? (
        <>
          <p className="install-status">
            <Check size={17} aria-hidden="true" />
            Installed on this device
          </p>
          <p className="muted">
            Open FORM from your Home Screen or app launcher.
          </p>
        </>
      ) : (
        <>
          <p className="muted">
            Add FORM to your Home Screen for quick access.
          </p>
          <InstallButton />
          <button type="button" className="text-link" onClick={openInstall}>
            Installation help
          </button>
        </>
      )}
      <p className="hint">
        {offlineReady
          ? "Offline access is ready."
          : "Keep FORM open online once to finish its offline download."}
      </p>
    </section>
  );
}
export default function InstallDialog() {
  const state = useInstall();
  if (!state.open || state.installed) return null;
  const secure = window.isSecureContext;
  const supported = "serviceWorker" in navigator;
  const ios =
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const android = /Android/.test(navigator.userAgent);
  const embedded = /(FBAN|FBAV|Instagram|; wv\)|Line\/)/i.test(
    navigator.userAgent,
  );
  return (
    <Modal title="Install FORM" onClose={closeInstall}>
      <div className="install-intro">
        <img src="/icon-192.png" width="64" height="64" alt="" />
        <div>
          <h3>Your fitness, on your Home Screen</h3>
          <p className="hint">
            No account needed. Your records stay on this device.
          </p>
        </div>
      </div>
      {state.error && (
        <p role="alert" className="notice">
          {state.error}
        </p>
      )}
      {!secure ? (
        <div className="install-instructions">
          <h3>Open an HTTPS website to install</h3>
          <p>
            A plain HTTP local-IP address cannot install this app on your phone.
            Open the deployed HTTPS address instead.
          </p>
          <details>
            <summary>Using a development server?</summary>
            <p>
              Use HTTPS with a certificate your phone trusts. Computer localhost
              is trusted only on that computer. Export a backup before switching
              website addresses; each address has separate browser storage.
            </p>
          </details>
        </div>
      ) : !supported ? (
        <div className="install-instructions">
          <h3>Use a supported browser</h3>
          <p>
            Open this site in an up-to-date Chrome, Edge or Safari browser to
            install it and use it offline.
          </p>
        </div>
      ) : state.available ? (
        <div className="install-instructions">
          <p>Install FORM to open it in its own app window.</p>
          <InstallButton className="button" />
        </div>
      ) : (
        <div className="install-instructions">
          {state.accepted && (
            <p role="status" className="notice">
              Your install request was accepted. Finish any browser confirmation
              to add FORM to your device.
            </p>
          )}
          <h3>
            {ios
              ? "On iPhone or iPad"
              : android
                ? "On Android"
                : "On your computer"}
          </h3>
          {embedded && (
            <p>
              First open this page in your main browser using “Open in browser”.
            </p>
          )}
          {ios ? (
            <ol>
              <li>
                Open this website in <strong>Safari</strong>.
              </li>
              <li>
                Tap <strong>Share</strong>, then{" "}
                <strong>Add to Home Screen</strong>.
              </li>
              <li>
                Keep <strong>Open as Web App</strong> enabled if shown, then tap{" "}
                <strong>Add</strong>.
              </li>
            </ol>
          ) : android ? (
            <ol>
              <li>
                Open this website in <strong>Chrome</strong> or another browser
                that supports web apps.
              </li>
              <li>
                Open the browser menu <strong>⋮</strong>.
              </li>
              <li>
                Choose <strong>Install app</strong> or{" "}
                <strong>Add to Home screen → Install</strong>.
              </li>
            </ol>
          ) : (
            <ol>
              <li>
                Open this website in <strong>Chrome</strong> or{" "}
                <strong>Edge</strong>.
              </li>
              <li>
                Choose the <strong>Install</strong> icon in the address bar, or{" "}
                <strong>Install app</strong> in the browser menu.
              </li>
              <li>
                On Mac Safari, choose <strong>File → Add to Dock</strong> where
                supported.
              </li>
            </ol>
          )}
          <p className="hint">
            If Install is missing, try a regular browser window after the page
            finishes loading. If FORM is already installed, open it from your
            Home Screen or app launcher.
          </p>
        </div>
      )}
      {secure && supported && (
        <p className="install-offline">
          <WifiOff size={17} aria-hidden="true" />
          {state.offlineReady
            ? "Ready to use offline."
            : "Keep this page open online until the first offline download finishes."}
        </p>
      )}
    </Modal>
  );
}
