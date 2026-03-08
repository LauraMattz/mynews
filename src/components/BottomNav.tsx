import { useLocation, useNavigate } from "react-router-dom";
import { Inbox, FileText, BarChart3 } from "lucide-react";

const navItems = [
  { path: "/", label: "Triagem", icon: Inbox },
  { path: "/resumos", label: "Resumos", icon: FileText },
  { path: "/insights", label: "Insights", icon: BarChart3 },
];

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-xl border-t border-border sm:hidden">
      <div className="flex items-center justify-around h-14">
        {navItems.map(({ path, label, icon: Icon }) => {
          const active = location.pathname === path;
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-colors ${
                active
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className={`h-5 w-5 ${active ? "stroke-[2.5]" : ""}`} />
              <span className={`text-[10px] ${active ? "font-semibold" : "font-medium"}`}>
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
