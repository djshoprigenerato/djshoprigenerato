import { BrowserRouter, Routes, Route } from "react-router-dom"
import Navbar from "./components/Navbar"

import Home from "./pages/Home"
import Products from "./pages/Products"
import ProductDetail from "./pages/ProductDetail"
import CartPage from "./pages/CartPage"
import Checkout from "./pages/Checkout"
import Orders from "./pages/Orders"
import AdminDashboard from "./pages/AdminDashboard"
import About from "./pages/About"
import Terms from "./pages/Terms"
import Payments from "./pages/Payments"
import Shipping from "./pages/Shipping"
import Login from "./pages/Login"
import Register from "./pages/Register"

function Footer() {
  return (
    <footer className="footer container" style={{textAlign:'center', marginTop:24}}>
      <p><strong>DJ Shop Rigenerato!</strong> — Re-mix, re-fix, re-use</p>
      <p className="badge free">Consegna sempre gratuita con SDA e GLS</p>
    </footer>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <main style={{minHeight: "70vh"}}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/prodotti" element={<Products />} />
          <Route path="/prodotti/:id" element={<ProductDetail />} />
          <Route path="/carrello" element={<CartPage />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/ordini" element={<Orders />} />
          <Route path="/chi-siamo" element={<About />} />
          <Route path="/termini" element={<Terms />} />
          <Route path="/pagamenti" element={<Payments />} />
          <Route path="/spedizione" element={<Shipping />} />
          <Route path="/login" element={<Login />} />
          <Route path="/registrati" element={<Register />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="*" element={<div className="container"><h1>404</h1><p>Pagina non trovata</p></div>} />
        </Routes>
      </main>
      <Footer />
    </BrowserRouter>
  )
}
