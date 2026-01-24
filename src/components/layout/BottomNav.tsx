import { Home, Clock, Mic2, User, Plus } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

interface NavItemProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
}

const NavItem = ({ to, icon, label, isActive }: NavItemProps) => (
  <Link
    to={to}
    className={cn(
      "flex flex-col items-center justify-center gap-1 py-2 px-3 transition-colors",
      isActive ? "text-primary" : "text-muted-foreground"
    )}
  >
    {icon}
    <span className="text-xs font-medium">{label}</span>
  </Link>
);

interface BottomNavProps {
  onCreateClick: () => void;
}

export const BottomNav = ({ onCreateClick }: BottomNavProps) => {
  const location = useLocation();

  const navItems = [
    { to: "/", icon: <Home className="h-6 w-6" />, label: "Home" },
    { to: "/history", icon: <Clock className="h-6 w-6" />, label: "History" },
    { to: "/voices", icon: <Mic2 className="h-6 w-6" />, label: "Voices" },
    { to: "/profile", icon: <User className="h-6 w-6" />, label: "Profile" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border safe-area-bottom z-50">
      <div className="relative flex items-center justify-around max-w-lg mx-auto">
        {/* Left nav items */}
        {navItems.slice(0, 2).map((item) => (
          <NavItem
            key={item.to}
            {...item}
            isActive={location.pathname === item.to}
          />
        ))}

        {/* FAB placeholder space */}
        <div className="w-16" />

        {/* Right nav items */}
        {navItems.slice(2).map((item) => (
          <NavItem
            key={item.to}
            {...item}
            isActive={location.pathname === item.to}
          />
        ))}

        {/* Floating Action Button */}
        <button
          onClick={onCreateClick}
          className="absolute left-1/2 -translate-x-1/2 -top-6 w-14 h-14 bg-primary rounded-full flex items-center justify-center shadow-lg hover:bg-primary/90 transition-colors active:scale-95"
          aria-label="Create new reminder"
        >
          <Plus className="h-7 w-7 text-primary-foreground" />
        </button>
      </div>
    </nav>
  );
};
