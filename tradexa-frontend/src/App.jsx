import React from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminRoute from "./components/AdminRoute";
import Markets from "./pages/Markets";
import MarketDetail from "./pages/MarketDetail";
import Portfolio from "./pages/Portfolio";
import Leaderboard from "./pages/Leaderboard";
import Activity from "./pages/Activity";
import News from "./pages/News";
import Admin from "./pages/Admin";
import { PermissionProvider } from "./context/PermissionContext";

const RouteTransition = ({ children }) => (
  <motion.div
    className="h-full"
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -6 }}
    transition={{ duration: 0.18, ease: "easeOut" }}
  >
    {children}
  </motion.div>
);

const AnimatedRoutes = () => {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route
          path="/"
          element={
            <RouteTransition>
              <Navigate to="/markets" replace />
            </RouteTransition>
          }
        />

        <Route
          path="/login"
          element={
            <RouteTransition>
              <Login />
            </RouteTransition>
          }
        />

        <Route
          path="/register"
          element={
            <RouteTransition>
              <Register />
            </RouteTransition>
          }
        />

        <Route
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route
            path="/markets"
            element={
              <RouteTransition>
                <Markets />
              </RouteTransition>
            }
          />
          <Route
            path="/markets/:id"
            element={
              <RouteTransition>
                <MarketDetail />
              </RouteTransition>
            }
          />
          <Route
            path="/portfolio"
            element={
              <RouteTransition>
                <Portfolio />
              </RouteTransition>
            }
          />
          <Route
            path="/leaderboard"
            element={
              <RouteTransition>
                <Leaderboard />
              </RouteTransition>
            }
          />
          <Route
            path="/activity"
            element={
              <RouteTransition>
                <Activity />
              </RouteTransition>
            }
          />
          <Route
            path="/news"
            element={
              <RouteTransition>
                <News />
              </RouteTransition>
            }
          />
        </Route>

        <Route
          element={
            <AdminRoute>
              <Layout />
            </AdminRoute>
          }
        >
          <Route
            path="/admin"
            element={
              <RouteTransition>
                <Admin />
              </RouteTransition>
            }
          />
        </Route>

        <Route path="*" element={<Navigate to="/markets" replace />} />
      </Routes>
    </AnimatePresence>
  );
};

const App = () => {
  return (
    <div className="h-screen w-screen bg-background text-slate-100 font-sans">
      <PermissionProvider>
        <AnimatedRoutes />
      </PermissionProvider>
    </div>
  );
};

export default App;
