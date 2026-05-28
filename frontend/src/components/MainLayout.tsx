import React from 'react';
import { Outlet } from 'react-router-dom';
import LayoutHeader from './LayoutHeader';

export const MainLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 dark:bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] dark:from-slate-900 dark:via-slate-950 dark:to-black text-slate-900 dark:text-slate-200 font-sans flex flex-col transition-colors duration-300">
      <LayoutHeader />
      <main className="w-full min-h-[calc(100vh-4rem)] p-6 sm:p-8 flex flex-col max-w-7xl mx-auto">
        <Outlet />
      </main>
    </div>
  );
};

export default MainLayout;
