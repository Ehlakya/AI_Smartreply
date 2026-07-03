import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  Inbox, 
  Star, 
  Send, 
  Archive, 
  Trash2, 
  ShieldAlert, 
  Settings, 
  Clock, 
  MessageSquare,
  Users,
  Bot
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', icon: Inbox, path: '/dashboard' },
  { name: 'Inbox', icon: Inbox, path: '/inbox', count: 12 },
  { name: 'Priority Mail', icon: Star, path: '/priority', count: 3 },
  { name: 'Team Mail', icon: Users, path: '/team' },
  { name: 'Other Mail', icon: Archive, path: '/others' },
  { name: 'Spam', icon: ShieldAlert, path: '/spam', count: 45 },
  { name: 'Sent', icon: Send, path: '/sent' },
  { name: 'Drafts', icon: Clock, path: '/drafts', count: 2 },
  { name: 'Starred', icon: Star, path: '/starred' },
  { name: 'Trash', icon: Trash2, path: '/trash' },
];

const secondaryNav = [
  { name: 'AI Assistant', icon: Bot, path: '/ai' },
  { name: 'History', icon: MessageSquare, path: '/history' },
  { name: 'Contacts', icon: Users, path: '/contacts' },
  { name: 'Settings', icon: Settings, path: '/settings' },
];

export default function Sidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 w-[240px] lg:w-[280px] h-[100vh] flex flex-col justify-between overflow-hidden bg-background/60 backdrop-blur-xl border-r border-border/40 shadow-[4px_0_24px_rgba(0,0,0,0.02)] dark:shadow-[4px_0_24px_rgba(0,0,0,0.2)] rounded-r-2xl z-50">
      <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col pt-6 pb-2">
        <div className="flex items-center gap-3 mb-8 px-6">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-primary to-accent flex items-center justify-center shrink-0 shadow-lg shadow-primary/20">
            <Bot className="text-white w-6 h-6" />
          </div>
          <h1 className="font-bold text-lg whitespace-nowrap bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">
            Smart Reply
          </h1>
        </div>

        <div className="px-3 mb-2">
          <p className="px-3 text-xs font-semibold text-foreground/40 uppercase tracking-wider mb-2">Mailbox</p>
          <nav className="space-y-1">
            {navigation.map((item) => (
              <NavLink
                key={item.name}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg transition-colors duration-200 ${
                    isActive 
                      ? 'bg-primary/10 text-primary font-medium border-l-2 border-primary' 
                      : 'text-foreground/70 hover:bg-foreground/5 hover:text-foreground border-l-2 border-transparent'
                  }`
                }
              >
                <div className="flex items-center gap-3">
                  <item.icon className="w-[18px] h-[18px] shrink-0" />
                  <span className="text-[15px]">{item.name}</span>
                </div>
                {item.count && (
                  <span className="bg-primary/10 text-primary text-xs font-semibold px-2 py-0.5 rounded-full">
                    {item.count}
                  </span>
                )}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="px-3 mt-6 mb-4">
          <p className="px-3 text-xs font-semibold text-foreground/40 uppercase tracking-wider mb-2">Intelligence</p>
          <nav className="space-y-1">
            {secondaryNav.map((item) => (
              <NavLink
                key={item.name}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors duration-200 ${
                    isActive 
                      ? 'bg-primary/10 text-primary font-medium border-l-2 border-primary' 
                      : 'text-foreground/70 hover:bg-foreground/5 hover:text-foreground border-l-2 border-transparent'
                  }`
                }
              >
                <item.icon className="w-[18px] h-[18px] shrink-0" />
                <span className="text-[15px]">{item.name}</span>
              </NavLink>
            ))}
          </nav>
        </div>
      </div>

      <div className="p-4 border-t border-border/20 bg-background/40">
        <div className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-foreground/5 transition-colors cursor-pointer">
          <div className="w-9 h-9 rounded-full overflow-hidden shrink-0 border border-border">
            <img 
              src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" 
              alt="Profile" 
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">Admin User</p>
            <p className="text-xs text-foreground/50 truncate">admin@company.com</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
