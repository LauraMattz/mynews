import { useLocation, useNavigate } from "react-router-dom";
import { Inbox, FileText, BarChart3 } from "lucide-react";

const navItems = [
  { path: "/", label: "Triagem", icon: Inbox },
  { path: "/resumos", label: "Resumos", icon: FileText },
  { path: "/insights", label: "Insights", icon: BarChart3 },
];

export function DesktopNav() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="hidden sm:block sticky top-0 z-50 bg-background/95 backdrop-blur-xl border-b border-border">
      <div className="max-w-5xl mx-auto px-4 flex items-center justify-start h-12 gap-1">
        {navItems.map(({ path, label, icon: Icon }) => {
          const active = location.pathname === path;
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                active
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
