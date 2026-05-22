import { useEffect, useState } from "react";
import { Smartphone, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isMobileDevice, isStandaloneApp } from "@/lib/register-pwa";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function InstallAppBanner() {
  const [hidden, setHidden] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setIsIos(/iPhone|iPad|iPod/i.test(navigator.userAgent));
    if (sessionStorage.getItem("install-banner-dismissed") === "1") {
      setHidden(true);
    }

    const onBip = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onBip);
    return () => window.removeEventListener("beforeinstallprompt", onBip);
  }, []);

  if (hidden || isStandaloneApp() || !isMobileDevice()) return null;

  function dismiss() {
    sessionStorage.setItem("install-banner-dismissed", "1");
    setHidden(true);
  }

  async function installAndroid() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    dismiss();
  }

  return (
    <div className="mx-4 mb-4 rounded-xl border border-primary/30 bg-primary/5 p-4 sm:mx-auto sm:max-w-5xl">
      <div className="flex items-start gap-3">
        <Smartphone className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          <p className="font-medium text-foreground">Install on your phone</p>
          {isIos ? (
            <p className="mt-1 text-sm text-muted-foreground">
              iOS: tap <strong>Share</strong> → <strong>Add to Home Screen</strong>, then open NeuroTrack from your home screen.
            </p>
          ) : deferredPrompt ? (
            <p className="mt-1 text-sm text-muted-foreground">
              Android: install this app for full-screen access and easier camera tests.
            </p>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">
              Android: open the browser menu (⋮) → <strong>Install app</strong> or <strong>Add to Home screen</strong>.
            </p>
          )}
          {!isIos && deferredPrompt && (
            <Button size="sm" className="mt-3" onClick={installAndroid}>
              Install app
            </Button>
          )}
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="shrink-0 rounded p-1 text-muted-foreground hover:bg-muted"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
