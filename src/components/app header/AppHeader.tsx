import { Link, useNavigate } from "@tanstack/react-router";
import { Activity, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export function AppHeader({ authed }: { authed?: boolean }) {
  const navigate = useNavigate();
  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur supports-[padding:max(0px)]:pt-[env(safe-area-inset-top)]">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2 font-semibold text-foreground">
          <Activity className="h-5 w-5 text-primary" />
          <span className="text-sm sm:text-base">NeuroTrack</span>
        </Link>
        {authed ? (
          <div className="flex items-center gap-2">
            <Link to="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">Dashboard</Link>
            <Link to="/profile" className="text-sm text-muted-foreground hover:text-foreground">Profile</Link>
            <Button
              size="sm"
              variant="ghost"
              onClick={async () => {
                await supabase.auth.signOut();
                navigate({ to: "/login" });
              }}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Link to="/login"><Button size="sm" variant="ghost">Log in</Button></Link>
            <Link to="/signup"><Button size="sm">Sign up</Button></Link>
          </div>
        )}
      </div>
    </header>
  );
}