// client/src/App.jsx
import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Navbar from "./components/Navbar";
import Toast from "./components/Toast";

// Pagine (adatta i percorsi ai tuoi file reali)
import Home from "./pages/Home";
import Products from "./pages/Products";
import ProductDetail from "./pages/ProductDetail";
import CartPage from "./pages/CartPage";
import Checkout from "./pages/Checkout";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Terms from "./pages/Terms";
import Orders from "./pages/Orders";           // "I miei ordini"
import AdminDashboard from "./pages/AdminDashboard";
import SuccessPage from "./pages/SuccessPage"; // pagina "grazie per l'acquisto"
import CancelPage from "./pages/CancelPage";   // opzionale

function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />

        {/* Prodotti */}
        <Route path="/prodotti" element={<Products />} />
        <Route path="/prodotti/:id" element={<ProductDetail />} />

        {/* Carrello & Checkout */}
        <Route path="/carrello" element={<CartPage />} />
        <Route path="/checkout" element={<Checkout />} />

        {/* Auth */}
        <Route path="/login" element={<Login />} />
        <Route path="/registrati" element={<Register />} />

        {/* Varie */}
        <Route path="/termini" element={<Terms />} />
        <Route path="/ordini" element={<Orders />} />
        <Route path="/admin" element={<AdminDashboard />} />

        {/* Stripe return URLs */}
        <Route path="/success" element={<SuccessPage />} />
        <Route path="/cancel" element={<CancelPage />} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toast />
    </BrowserRouter>
  );
}

export default App;
