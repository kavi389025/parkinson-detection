import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/auth/callback")({
  head: () => ({ meta: [{ title: "Confirming email — NeuroTrack" }] }),
  component: AuthCallbackPage,
});

function AuthCallbackPage() {
  const navigate = useNavigate();
  const [message, setMessage] = useState("Confirming your email…");

  useEffect(() => {
    let cancelled = false;

    async function finishAuth() {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const errorDesc = params.get("error_description") ?? hashParams.get("error_description");

      if (errorDesc) {
        if (!cancelled) {
          setMessage("Confirmation link expired or invalid.");
          toast.error(decodeURIComponent(errorDesc.replace(/\+/g, " ")));
          setTimeout(() => navigate({ to: "/login" }), 2000);
        }
        return;
      }

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          if (!cancelled) {
            setMessage("Could not complete sign-in.");
            toast.error(error.message);
            setTimeout(() => navigate({ to: "/login" }), 2000);
          }
          return;
        }
      } else {
        await supabase.auth.getSession();
      }

      const { data } = await supabase.auth.getSession();
      if (!cancelled) {
        if (data.session) {
          toast.success("Email confirmed. Welcome!");
          navigate({ to: "/dashboard" });
        } else {
          setMessage("No active session. Try logging in.");
          setTimeout(() => navigate({ to: "/login" }), 2000);
        }
      }
    }

    finishAuth();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
