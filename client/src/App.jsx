import { BrowserRouter, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar.jsx";
import Toast from "./components/Toast.jsx";

// pages
import Home from "./pages/Home.jsx";
import Products from "./pages/Products.jsx";
import ProductDetails from "./pages/ProductDetails.jsx";
import CartPage from "./pages/CartPage.jsx";
import Checkout from "./pages/Checkout.jsx";
import Orders from "./pages/Orders.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Terms from "./pages/Terms.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";
import SuccessPage from "./pages/SuccessPage.jsx";
import CancelPage from "./pages/CancelPage.jsx";

export default function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/prodotti" element={<Products />} />
        <Route path="/prodotto/:id" element={<ProductDetails />} />
        <Route path="/carrello" element={<CartPage />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/ordini" element={<Orders />} />
        <Route path="/login" element={<Login />} />
        <Route path="/registrati" element={<Register />} />
        <Route path="/termini" element={<Terms />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/success" element={<SuccessPage />} />
        <Route path="/cancel" element={<CancelPage />} />
      </Routes>
      <Toast />
    </BrowserRouter>
  );
}
