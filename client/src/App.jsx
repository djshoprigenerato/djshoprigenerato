
import { BrowserRouter, Routes, Route } from "react-router-dom"
import Navbar from "./components/Navbar"
import Footer from "./components/Footer"
import Home from "./pages/Home"
import Products from "./pages/Products"
import ProductDetail from "./pages/ProductDetail"
import CartPage from "./pages/CartPage"
import Checkout from "./pages/Checkout"
import CheckoutSuccess from "./pages/CheckoutSuccess"
import CheckoutCancelled from "./pages/CheckoutCancelled"
import Orders from "./pages/Orders"
import Login from "./pages/Login"
import Signup from "./pages/Signup"
import Terms from "./pages/Terms"
import Payments from "./pages/Payments"
import Shipping from "./pages/Shipping"
import About from "./pages/About"
import AdminDashboard from "./pages/AdminDashboard"
import AdminGuard from "./components/AdminGuard"
import "./styles.css"

export default function App(){
  return (
    <BrowserRouter>
      <Navbar/>
      <Routes>
        <Route path="/" element={<Home/>} />
        <Route path="/prodotti" element={<Products/>} />
        <Route path="/prodotto/:id" element={<ProductDetail/>} />
        <Route path="/carrello" element={<CartPage/>} />
        <Route path="/checkout" element={<Checkout/>} />
        <Route path="/checkout-success" element={<CheckoutSuccess/>} />
        <Route path="/checkout-cancelled" element={<CheckoutCancelled/>} />
        <Route path="/ordini" element={<Orders/>} />
        <Route path="/login" element={<Login/>} />
        <Route path="/registrati" element={<Signup/>} />
        <Route path="/termini" element={<Terms/>} />
        <Route path="/pagamenti" element={<Payments/>} />
        <Route path="/spedizione" element={<Shipping/>} />
        <Route path="/chi-siamo" element={<About/>} />
        <Route path="/admin" element={<AdminGuard><AdminDashboard/></AdminGuard>} />
        <Route path="*" element={<div className='container'><h1>404</h1><p>Pagina non trovata</p></div>} />
      </Routes>
      <Footer/>
    </BrowserRouter>
  )
}
