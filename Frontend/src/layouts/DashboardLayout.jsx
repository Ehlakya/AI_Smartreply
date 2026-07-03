import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import TopNavigation from '../components/TopNavigation';

export default function DashboardLayout() {
  return (
    <div className="flex min-h-screen bg-background selection:bg-primary/20">
      {/* Background ambient gradients */}
      <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/5 blur-[120px] pointer-events-none z-0" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-secondary/5 blur-[120px] pointer-events-none z-0" />
      
      <Sidebar />
      
      <div className="flex-1 flex flex-col min-h-screen ml-[240px] lg:ml-[280px] relative z-10 transition-all">
        <TopNavigation />
        
        <main className="flex-1 overflow-x-hidden p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
