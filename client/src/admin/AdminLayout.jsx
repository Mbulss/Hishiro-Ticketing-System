import { Sidebar } from './components/sidebar';
import { Header } from './components/header';
import { useState } from 'react';

export default function AdminLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen w-full bg-background flex flex-col font-sans" style={{ minHeight: '100vh', height: 'auto', overflowX: 'hidden' }}>
      {/* Header with hamburger menu for mobile */}
      <Header onMenuClick={() => setSidebarOpen(true)} />
      {/* Main content area with sidebar and overlay */}
      <div className="flex-1 flex flex-row w-full relative">
        {/* Overlay for mobile sidebar */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-30 z-40 xl:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
        {/* Sidebar */}
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        {/* Main content */}
        <main className="flex-1 flex flex-col min-h-0 w-full xl:ml-6 p-4 xl:p-6">
          {children}
        </main>
      </div>
    </div>
  );
} 