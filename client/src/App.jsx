// client/src/App.jsx
import { BrowserRouter, Routes, Route } from "react-router-dom"
import Navbar from "./components/Navbar"
import Home from "./pages/Home"
import Products from "./pages/Products"
import ProductDetails from "./pages/ProductDetails"
import CartPage from "./pages/CartPage"
import Checkout from "./pages/Checkout"
import Orders from "./pages/Orders"
import Login from "./pages/Login"
import Register from "./pages/Register"
import Terms from "./pages/Terms"
import AdminDashboard from "./pages/AdminDashboard"
import SuccessPage from "./pages/SuccessPage"
import Toast from "./components/Toast"

export default function App(){
  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/prodotti" element={<Products />} />
        <Route path="/prodotti/:id" element={<ProductDetails />} />
        <Route path="/carrello" element={<CartPage />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/ordini" element={<Orders />} />
        <Route path="/login" element={<Login />} />
        <Route path="/registrati" element={<Register />} />
        <Route path="/termini" element={<Terms />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/success" element={<SuccessPage />} />
        <Route path="*" element={<Home />} />
      </Routes>
      <Toast />
    </BrowserRouter>
  )
}
