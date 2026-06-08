import React from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import Toast from "./Toast";

const Layout = () => {
  const [toast, setToast] = React.useState(null);

  return (
    <div className="h-screen w-screen bg-background text-slate-100 flex">
      <div className="hidden md:flex w-60 border-r border-border bg-surface/90 backdrop-blur-sm">
        <Sidebar />
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        <Topbar />

        <main className="flex-1 overflow-y-auto px-3 pb-16 md:px-6 md:pb-6 pt-3 md:pt-4">
          <Outlet context={{ setToast }} />
        </main>

        <div className="md:hidden fixed bottom-0 inset-x-0 border-t border-border bg-surface/95 backdrop-blur-sm">
          <Sidebar isMobile />
        </div>
      </div>

      {toast && (
        <Toast toast={toast} onClose={() => setToast(null)} />
      )}
    </div>
  );
};

export default Layout;
