import React from 'react';
import { Search, Bell, Moon, Sun, Mic } from 'lucide-react';

export default function TopNavigation({ onMenuClick }) {
  const [darkMode, setDarkMode] = React.useState(false);

  const toggleTheme = () => {
    setDarkMode(!darkMode);
    document.documentElement.classList.toggle('dark');
  };

  return (
    <header className="sticky top-0 z-30 h-20 px-4 md:px-8 flex items-center justify-between bg-background/80 backdrop-blur-xl border-b border-border/40 shadow-sm transition-colors duration-300">
      <div className="flex items-center gap-2 md:gap-4 flex-1 max-w-2xl">
        <button 
          onClick={onMenuClick}
          className="lg:hidden p-2 -ml-2 rounded-xl text-foreground/70 hover:bg-foreground/5 transition-colors"
          title="Open Menu"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
        </button>

        <div className="relative group w-full">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="h-[18px] w-[18px] text-foreground/40 group-focus-within:text-primary transition-colors" />
          </div>
          <input
            type="text"
            className="block w-full pl-11 pr-12 py-2.5 border border-border/50 rounded-full leading-5 bg-foreground/5 text-foreground placeholder-foreground/40 focus:outline-none focus:bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all duration-300 text-[15px]"
            placeholder="Search emails, contacts, or ask AI..."
          />
          <div className="absolute inset-y-0 right-0 pr-2 flex items-center">
            <button className="p-1.5 rounded-full hover:bg-primary/10 text-foreground/40 hover:text-primary transition-colors">
              <Mic className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="ml-6 flex items-center gap-4">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-success/10 text-success text-xs font-medium border border-success/20">
          <span className="w-2 h-2 rounded-full bg-success animate-pulse"></span>
          AI Active
        </div>
        
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-foreground/5 text-foreground/60 text-xs font-medium">
          Synced just now
        </div>

        <button 
          onClick={toggleTheme}
          className="p-2.5 rounded-full bg-foreground/5 hover:bg-foreground/10 text-foreground/70 transition-colors"
        >
          {darkMode ? <Sun className="w-[18px] h-[18px]" /> : <Moon className="w-[18px] h-[18px]" />}
        </button>

        <button className="relative p-2.5 rounded-full bg-foreground/5 hover:bg-foreground/10 text-foreground/70 transition-colors">
          <Bell className="w-[18px] h-[18px]" />
          <span className="absolute top-2 right-2.5 block h-2 w-2 rounded-full bg-danger ring-2 ring-background"></span>
        </button>
      </div>
    </header>
  );
}
