import { useLocation, useNavigate } from "react-router-dom";
import { Inbox, FileText, BarChart3, Newspaper } from "lucide-react";

const navItems = [
  { path: "/", label: "Triagem", icon: Inbox },
  { path: "/resumos", label: "Resumos", icon: FileText },
  { path: "/insights", label: "Insights", icon: BarChart3 },
];

export function DesktopNav() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="hidden sm:flex fixed left-0 top-0 bottom-0 z-50 w-48 flex-col bg-background/95 backdrop-blur-xl border-r border-border">
      <div className="flex items-center gap-2 px-4 py-4 border-b border-border">
        <div className="h-8 w-8 rounded-xl bg-primary flex items-center justify-center shadow-sm shrink-0">
          <Newspaper className="h-4 w-4 text-primary-foreground" />
        </div>
        <div className="min-w-0">
          <h1 className="text-sm font-bold tracking-tight truncate">NewsFlow</h1>
          <p className="text-[9px] text-muted-foreground leading-tight truncate">Curadoria inteligente</p>
        </div>
      </div>
      <div className="flex flex-col gap-1 p-2 flex-1">
        {navItems.map(({ path, label, icon: Icon }) => {
          const active = location.pathname === path;
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors w-full text-left ${
                active
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
