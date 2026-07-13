import React from "react";
import { Outlet } from "react-router-dom";
import CollapsibleSidebar from "./CollapsibleSidebar";
import Toast from "./Toast";

const Layout = () => {
  const [toast, setToast] = React.useState(null);

  return (
    <div className="flex h-screen w-screen bg-[#f2f4f8] overflow-hidden">
      <CollapsibleSidebar />
      <main className="flex-1 overflow-y-auto">
        <Outlet context={{ setToast }} />
      </main>

      {toast && (
        <Toast toast={toast} onClose={() => setToast(null)} />
      )}
    </div>
  );
};

export default Layout;
