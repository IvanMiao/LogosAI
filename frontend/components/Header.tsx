import { useNavigate } from 'react-router-dom';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Brain, Info, LogOut, Menu, Settings } from 'lucide-react';
import { useAuth } from '@/features/auth';

interface HeaderProps {
  mounted: boolean;
}

export function Header({ mounted }: HeaderProps) {
  const navigate = useNavigate();
  const auth = useAuth();

  const signOut = async () => {
    await auth.signOut();
    navigate('/');
  };

  return (
    <header className={`mb-6 transition-[opacity,transform] duration-300 motion-reduce:transition-none sm:mb-8 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
      <div className="border-2 border-border bg-card p-3 shadow-[4px_4px_0px_0px_var(--border)] sm:p-6">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate('/app')}
            className="group flex min-w-0 items-center gap-2 border-0 bg-transparent p-0 text-left transition-opacity hover:opacity-80 sm:gap-4"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center border-2 border-border bg-primary shadow-[2px_2px_0px_0px_var(--border)] sm:h-12 sm:w-12">
              <Brain className="h-6 w-6 text-primary-foreground sm:h-7 sm:w-7" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <span className="block truncate font-brand text-xl font-bold tracking-tight text-foreground sm:text-3xl">
                LogosAI
              </span>
              <p className="mt-0.5 hidden font-mono text-sm text-muted-foreground sm:block">
                DEEP_TEXT_ANALYSIS
              </p>
            </div>
          </button>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button type="button" aria-label="Open menu" className="flex h-9 w-9 items-center justify-center border-2 border-border bg-secondary shadow-[2px_2px_0px_0px_var(--border)] transition-colors hover:bg-secondary/80 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none">
                  <Menu className="h-5 w-5 text-foreground" aria-hidden="true" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 border-2 border-border shadow-[4px_4px_0px_0px_var(--border)] rounded-none">
                <DropdownMenuLabel className="truncate">
                  {auth.user?.name || auth.user?.email}
                  <span className="mt-0.5 block truncate font-normal">{auth.user?.email}</span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-border" />
                <DropdownMenuItem
                  onClick={() => navigate('/app/settings')}
                  className="gap-2 focus:bg-primary focus:text-primary-foreground rounded-none"
                >
                  <Settings className="w-4 h-4" />
                  <span>Settings</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-border" />
                <DropdownMenuItem
                  onClick={() => navigate('/app/about')}
                  className="gap-2 rounded-none focus:bg-primary focus:text-primary-foreground"
                >
                  <Info className="h-4 w-4" />
                  <span>About</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-border" />
                <DropdownMenuItem
                  onClick={() => void signOut()}
                  className="gap-2 rounded-none text-error-foreground focus:bg-destructive"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
}
