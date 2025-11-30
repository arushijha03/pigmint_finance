import { NavLink } from "@/components/NavLink";
import pigmintLogo from "@/assets/pigmint-logo.png";

export const Header = () => {
  return (
    <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src={pigmintLogo} alt="PigMint Finance Logo" className="w-12 h-12" />
          <h1 className="text-xl font-bold">PigMint Finance</h1>
        </div>
        
        <nav className="flex gap-6">
          <NavLink 
            to="/dashboard" 
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            activeClassName="text-primary font-semibold"
          >
            Dashboard
          </NavLink>
          <NavLink 
            to="/goals" 
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            activeClassName="text-primary font-semibold"
          >
            Goals
          </NavLink>
          <NavLink 
            to="/rules" 
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            activeClassName="text-primary font-semibold"
          >
            Rules
          </NavLink>
          <NavLink 
            to="/reports" 
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            activeClassName="text-primary font-semibold"
          >
            Reports
          </NavLink>
          <NavLink 
            to="/profile" 
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            activeClassName="text-primary font-semibold"
          >
            Profile
          </NavLink>
        </nav>
      </div>
    </header>
  );
};
