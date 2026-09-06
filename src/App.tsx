import { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { AuthProvider } from "./context/AuthContext";
import { ToastProvider } from "./context/ToastContext";
import { ProtectedRoute } from "./routes/ProtectedRoute";
import { AdminLayout } from "./components/layout/AdminLayout";

const Login = lazy(() => import("./pages/Login"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Products = lazy(() => import("./pages/Products"));
const Customers = lazy(() => import("./pages/Customers"));
const Expenses = lazy(() => import("./pages/Expenses"));
const Purchases = lazy(() => import("./pages/Purchases"));
const Inventory = lazy(() => import("./pages/Inventory"));
const Credits = lazy(() => import("./pages/Credits"));
const Reports = lazy(() => import("./pages/Reports"));
const History = lazy(() => import("./pages/History"));
const Sessions = lazy(() => import("./pages/Sessions"));
const Cashiers = lazy(() => import("./pages/Cashiers"));
const Settings = lazy(() => import("./pages/Settings"));
const Profile = lazy(() => import("./pages/Profile"));
const NotFound = lazy(() => import("./pages/NotFound"));

function PageFallback() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center" role="status" aria-label="Loading page">
      <Loader2 className="animate-spin text-yolk-500" size={26} />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Suspense fallback={<PageFallback />}>
            <Routes>
              <Route path="/" element={<Navigate to="/admin/dashboard" replace />} />
              <Route path="/admin/login" element={<Login />} />

              <Route
                path="/admin"
                element={
                  <ProtectedRoute>
                    <AdminLayout />
                  </ProtectedRoute>
                }
              >
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="products" element={<Products />} />
                <Route path="customers" element={<Customers />} />
                <Route path="expenses" element={<Expenses />} />
                <Route path="purchases" element={<Purchases />} />
                <Route path="inventory" element={<Inventory />} />
                <Route path="credits" element={<Credits />} />
                <Route path="reports" element={<Reports />} />
                <Route path="history" element={<History />} />
                <Route path="sessions" element={<Sessions />} />
                <Route path="cashiers" element={<Cashiers />} />
                <Route path="settings" element={<Settings />} />
                <Route path="profile" element={<Profile />} />
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
