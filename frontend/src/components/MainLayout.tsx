import React from 'react';
import { Outlet } from 'react-router-dom';
import LayoutHeader from './LayoutHeader';

export const MainLayout: React.FC = () => {
  return (
    <div className="min-h-screen w-full bg-slate-100/80 dark:bg-[#030712] transition-colors duration-300 font-sans flex flex-col text-slate-900 dark:text-slate-200">
      <LayoutHeader />
      <main className="w-full min-h-[calc(100vh-4rem)] p-6 sm:p-8 flex flex-col max-w-7xl mx-auto">
        <Outlet />
      </main>
    </div>
  );
};

export default MainLayout;
