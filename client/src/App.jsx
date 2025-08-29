// client/src/App.jsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect } from "react";

// Layout
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import Toast from "./components/Toast";

// Pagine
import Home from "./pages/Home";
import Products from "./pages/Products";
import ProductDetail from "./pages/ProductDetail";
import CartPage from "./pages/CartPage";
import Checkout from "./pages/Checkout";
import Orders from "./pages/Orders";
import AdminDashboard from "./pages/AdminDashboard";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Terms from "./pages/Terms";

// ⚠️ Questi due file DEVONO esistere con questi nomi:
import Success from "./pages/Success";        // file: client/src/pages/Success.jsx
import CancelPage from "./pages/CancelPage";  // file: client/src/pages/CancelPage.jsx

/** Error boundary molto semplice per evitare “schermo nero” */
function ErrorBoundary({ children }) {
  useEffect(() => {
    const handler = (event) => {
      console.error("Global error:", event.error || event.message);
    };
    window.addEventListener("error", handler);
    window.addEventListener("unhandledrejection", handler);
    return () => {
      window.removeEventListener("error", handler);
      window.removeEventListener("unhandledrejection", handler);
    };
  }, []);
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <Toast />
      <ErrorBoundary>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/prodotti" element={<Products />} />
          <Route path="/prodotti/:id" element={<ProductDetail />} />
          <Route path="/carrello" element={<CartPage />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/ordini" element={<Orders />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/login" element={<Login />} />
          <Route path="/registrati" element={<Register />} />
          <Route path="/termini" element={<Terms />} />
          {/* Stripe return URLs */}
          <Route path="/success" element={<Success />} />
          <Route path="/cancel" element={<CancelPage />} />
          {/* fallback  */}
          <Route path="*" element={<Home />} />
        </Routes>
      </ErrorBoundary>
      <Footer />
    </BrowserRouter>
  );
}
