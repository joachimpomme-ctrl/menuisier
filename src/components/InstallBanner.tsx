import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'menuisier_install_dismissed';

function getInitialDismissed(): boolean {
  const dismissedAt = localStorage.getItem(DISMISS_KEY);
  return Boolean(
    dismissedAt &&
    Date.now() - Number(dismissedAt) < 7 * 24 * 60 * 60 * 1000,
  ) || window.matchMedia('(display-mode: standalone)').matches;
}

function isIosSafari(): boolean {
  const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.userAgent.includes('Mac') && 'ontouchend' in document);
  return isIos && /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
}

export default function InstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosTip, setShowIosTip] = useState(isIosSafari);
  const [dismissed, setDismissed] = useState(getInitialDismissed);

  useEffect(() => {
    // Android/Chrome: intercept install prompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);

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
    <div className="fixed bottom-0 left-0 right-0 z-50 safe-area-bottom">
      <div className="mx-4 mb-4 rounded-xl border border-amber-700/50 bg-white/95  shadow-xl shadow-stone-300/50 px-4 py-3 flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-amber-700">Installer l'app</div>
          {deferredPrompt ? (
            <div className="text-xs text-stone-500 mt-0.5">
              Ajoutez Menuisier sur votre écran d'accueil pour un accès rapide
            </div>
          ) : (
            <div className="text-xs text-stone-500 mt-0.5">
              Tapez <span className="inline-flex items-center mx-0.5 text-stone-400">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
              </span> puis « Sur l'écran d'accueil »
            </div>
          )}
        </div>
        {deferredPrompt && (
          <button
            onClick={install}
            className="text-xs px-4 py-2 rounded-lg bg-amber-600 text-white font-medium hover:bg-amber-500 transition-colors flex-shrink-0"
          >
            Installer
          </button>
        )}
        <button
          onClick={dismiss}
          className="text-stone-500 hover:text-stone-400 text-lg flex-shrink-0 px-1"
        >
          x
        </button>
      </div>
    </div>
  );
}
