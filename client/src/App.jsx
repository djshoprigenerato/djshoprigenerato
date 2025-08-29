import { BrowserRouter, Routes, Route } from "react-router-dom"
import Navbar from "./components/Navbar"
import Footer from "./components/Footer"
import Home from "./pages/Home"
import Products from "./pages/Products"
import ProductDetails from "./pages/ProductDetails"  // <— questo file esiste ora
import CartPage from "./pages/CartPage"
import Checkout from "./pages/Checkout"
import Orders from "./pages/Orders"
import AdminDashboard from "./pages/AdminDashboard"
import Login from "./pages/Login"
import Register from "./pages/Register"
import Terms from "./pages/Terms"
import Success from "./pages/Success"     // <— presente
import Cancel from "./pages/Cancel"       // <— presente
import "./index.css"

export default function App(){
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
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/login" element={<Login />} />
        <Route path="/registrati" element={<Register />} />
        <Route path="/termini" element={<Terms />} />
        <Route path="/success" element={<Success />} />
        <Route path="/cancel" element={<Cancel />} />
      </Routes>
      <Footer />
    </BrowserRouter>
  )
}
