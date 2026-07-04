import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import TopNavigation from '../components/TopNavigation';

export default function DashboardLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-background selection:bg-primary/20">
      {/* Background ambient gradients */}
      <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/5 blur-[120px] pointer-events-none z-0" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-secondary/5 blur-[120px] pointer-events-none z-0" />
      
      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm transition-opacity duration-300"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
      
      <div className="flex-1 flex flex-col min-h-screen ml-0 lg:ml-[260px] relative z-10 transition-all min-w-0 w-full">
        <TopNavigation onMenuClick={() => setIsSidebarOpen(true)} />
        
        <main className="flex-1 overflow-x-hidden p-4 md:p-6 lg:p-8 flex justify-center">
          <div className="w-full max-w-7xl h-full min-w-0">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
