// client/src/App.jsx
import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import Navbar from "./components/Navbar.jsx";

// Pagine (usa nomi file case-sensitive!)
import Home from "./pages/Home.jsx";
import Products from "./pages/Products.jsx";
import ProductDetails from "./pages/ProductDetails.jsx";
import CartPage from "./pages/CartPage.jsx";
import Checkout from "./pages/Checkout.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Terms from "./pages/Terms.jsx";
import Orders from "./pages/Orders.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";

// Queste due **come le hai in repo adesso**
import SuccessPage from "./pages/SuccessPage.jsx";
import CancelPage from "./pages/CancelPage.jsx";

/** ErrorBoundary di sicurezza per evitare la pagina nera */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: "" };
  }
  static getDerivedStateFromError(err) {
    return { hasError: true, message: err?.message || "Errore sconosciuto" };
  }
  componentDidCatch(err, info) {
    console.error("React boundary error:", err, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="container">
          <div className="card">
            <h2>Si è verificato un errore</h2>
            <p className="badge">{this.state.message}</p>
            <p>Ricarica la pagina o torna alla Home.</p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <ErrorBoundary>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/prodotti" element={<Products />} />
          <Route path="/prodotti/:id" element={<ProductDetails />} />
          <Route path="/carrello" element={<CartPage />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/checkout/success" element={<SuccessPage />} />
          <Route path="/checkout/cancel" element={<CancelPage />} />

          <Route path="/login" element={<Login />} />
          <Route path="/registrati" element={<Register />} />
          <Route path="/termini" element={<Terms />} />
          <Route path="/ordini" element={<Orders />} />

          <Route path="/admin" element={<AdminDashboard />} />

          {/* 404 di cortesia */}
          <Route
            path="*"
            element={
              <div className="container">
                <div className="card">
                  <h2>404</h2>
                  <p>Pagina non trovata.</p>
                </div>
              </div>
            }
          />
        </Routes>
      </ErrorBoundary>
    </BrowserRouter>
  );
}
