// client/src/App.jsx
import { BrowserRouter, Routes, Route } from "react-router-dom"
import Navbar from "./components/Navbar"
import Footer from "./components/Footer"          // ⟵ nuovo
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
import About from "./pages/About.jsx"

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
        <Route path="/chi-siamo" element={<About />} />
        <Route path="*" element={<Home />} />       {/* wildcard SEMPRE per ultima */}
      </Routes>
      <Footer />                                    {/* ⟵ visibile su tutte le pagine */}
      <Toast />
    </BrowserRouter>
  )
}
