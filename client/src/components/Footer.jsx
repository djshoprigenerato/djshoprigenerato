// client/src/components/Footer.jsx
import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer style={{
      marginTop: "40px",
      padding: "30px 20px",
      background: "#111",
      color: "#ccc",
      fontSize: "14px"
    }}>
      <div className="container" style={{ textAlign: "center" }}>
        
        <div style={{ marginBottom: "15px" }}>
          <strong>Metodi di pagamento accettati</strong>
          <div style={{
            marginTop: "10px",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: "14px",              // meno spazio
            flexWrap: "wrap"
          }}>
            <img src="/brands/payments/visa.svg" alt="Visa" style={{ height: "40px" }} />
            <img src="/brands/payments/mastercard.svg" alt="Mastercard" style={{ height: "40px" }} />
            <img src="/brands/payments/amex.svg" alt="Amex" style={{ height: "40px" }} />
            <img src="/brands/payments/applepay.svg" alt="Apple Pay" style={{ height: "40px" }} />
            <img src="/brands/payments/googlepay.svg" alt="Google Pay" style={{ height: "40px" }} />
            <img src="/brands/payments/amazonpay.svg" alt="Amazon Pay" style={{ height: "40px" }} />
            <img src="/brands/payments/satispay.svg" alt="Satispay" style={{ height: "40px" }} />
            <img src="/brands/payments/klarna.svg" alt="Klarna" style={{ height: "40px" }} />
            <img src="/brands/payments/revolut.svg" alt="Revolut" style={{ height: "40px" }} />
            <img src="/brands/payments/stripe.svg" alt="Stripe" style={{ height: "40px" }} />
          </div>
        </div>

        <div style={{ marginBottom: "15px" }}>
          <strong>Spedizioni con</strong>
          <div style={{
            marginTop: "10px",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: "20px"
          }}>
            <img src="/brands/shipping/sda.svg" alt="SDA" style={{ height: "40px" }} />
            <img src="/brands/shipping/gls.svg" alt="GLS" style={{ height: "40px" }} />
          </div>
        </div>

        <div style={{ marginTop: "20px" }}>
          <Link to="/termini" style={{ color: "#f90", marginRight: "10px" }}>Termini e Condizioni</Link>
          <Link to="/chi-siamo" style={{ color: "#f90", marginRight: "10px" }}>Chi siamo</Link>
          <span style={{ color: "#777" }}>© 2025 DJ Shop Rigenerato!</span>
        </div>
      </div>
    </footer>
  );
}
