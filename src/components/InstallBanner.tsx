import { useState, useEffect } from 'react';
import { ToolbarButton } from '../ui-system';

/**
 * Bandeau d'installation PWA.
 *
 * Style strictement conforme au design system :
 *   - fond `--bg-panel`, filet supérieur 1px, pas d'ombre, pas de radius
 *   - typographie 12px technique, pas de pastel ambré SaaS
 *   - boutons via `<ToolbarButton>`
 *
 * Positionné via CSS position fixed au-dessus de la zone safe-area bas.
 */

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'menuisier_install_dismissed';

export default function InstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosTip, setShowIosTip] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Already dismissed recently?
    const dismissedAt = localStorage.getItem(DISMISS_KEY);
    if (dismissedAt && Date.now() - Number(dismissedAt) < 7 * 24 * 60 * 60 * 1000) {
      setDismissed(true);
      return;
    }

    // Already installed as PWA?
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setDismissed(true);
      return;
    }

    // Android/Chrome: intercept install prompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);

    // iOS Safari: show manual tip
    const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.userAgent.includes('Mac') && 'ontouchend' in document);
    const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
    if (isIos && isSafari) {
      setShowIosTip(true);
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const dismiss = () => {
    setDismissed(true);
    setDeferredPrompt(null);
    setShowIosTip(false);
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
  };

  const install = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const result = await deferredPrompt.userChoice;
    if (result.outcome === 'accepted') {
      setDismissed(true);
    }
    setDeferredPrompt(null);
  };

  if (dismissed || (!deferredPrompt && !showIosTip)) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 safe-area-bottom bg-[color:var(--bg-panel)] rule-t"
      role="region"
      aria-label="Installer l'application"
    >
      <div className="flex items-center gap-3 px-3 py-2">
        <div className="flex-1 min-w-0 leading-tight">
          <div className="text-[12px] font-semibold text-[color:var(--fg)]">
            Installer l'app
          </div>
          {deferredPrompt ? (
            <div className="text-[11px] text-[color:var(--fg-muted)]">
              Ajoutez Menuisier sur l'écran d'accueil pour un accès rapide.
            </div>
          ) : (
            <div className="text-[11px] text-[color:var(--fg-muted)] flex items-center gap-1">
              <span>Tapez l'icône de partage</span>
              <svg
                className="w-3.5 h-3.5 inline-block shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                />
              </svg>
              <span>puis « Sur l'écran d'accueil ».</span>
            </div>
          )}
        </div>
        {deferredPrompt && (
          <ToolbarButton variant="primary" onClick={install}>
            Installer
          </ToolbarButton>
        )}
        <ToolbarButton variant="ghost" onClick={dismiss} aria-label="Fermer">
          ×
        </ToolbarButton>
      </div>
    </div>
  );
}
