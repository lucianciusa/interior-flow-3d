"use client";

import { LogOut, Settings, User } from "lucide-react";
import { useState } from "react";

import { useAuthStore } from "@/lib/stores/auth";
import { supabase } from "@/lib/supabase";
import LoginModal from "@/components/auth/LoginModal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function AccountMenu() {
  const session = useAuthStore((s) => s.session);
  const [loginOpen, setLoginOpen] = useState(false);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  if (!session) {
    return (
      <>
        <button
          onClick={() => setLoginOpen(true)}
          className="flex h-8 items-center rounded-full bg-secondary pl-2 pr-3 text-xs font-semibold text-secondary-foreground transition-colors hover:bg-secondary/80"
        >
          <div className="mr-2 flex h-5 w-5 items-center justify-center rounded-full bg-background text-muted-foreground shadow-sm">
            <User size={12} />
          </div>
          Sign In
        </button>
        <LoginModal open={loginOpen} onOpenChange={setLoginOpen} />
      </>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex h-8 items-center rounded-full bg-secondary pl-2 pr-3 text-xs font-semibold text-secondary-foreground transition-colors hover:bg-secondary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <div className="mr-2 flex h-5 w-5 items-center justify-center rounded-full bg-background text-muted-foreground shadow-sm">
          <User size={12} />
        </div>
        Account
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none truncate">
              {session.user.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled>
          <Settings className="mr-2 h-4 w-4 text-muted-foreground" />
          Settings (Coming soon)
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleSignOut}
          className="text-red-600 focus:bg-red-50 focus:text-red-600 dark:text-red-500 dark:focus:bg-red-950/20 dark:focus:text-red-500"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}