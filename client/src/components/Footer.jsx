// client/src/components/Footer.jsx
import { Link } from "react-router-dom";

const payLogos = [
  { src: "/brands/payments/visa.svg",        alt: "Visa" },
  { src: "/brands/payments/mastercard.svg",  alt: "Mastercard" },
  { src: "/brands/payments/amex.svg",        alt: "American Express" },
  { src: "/brands/payments/applepay.svg",    alt: "Apple Pay" },
  { src: "/brands/payments/googlepay.svg",   alt: "Google Pay" },
  { src: "/brands/payments/amazonpay.svg",   alt: "Amazon Pay" },
  { src: "/brands/payments/klarna.svg",      alt: "Klarna" },
  { src: "/brands/payments/revolut.svg",     alt: "Revolut Pay" },
  { src: "/brands/payments/satispay.svg",    alt: "Satispay" },
  { src: "/brands/payments/stripe.svg",      alt: "Stripe" },
];

const shipLogos = [
  { src: "/brands/shipping/sda.svg", alt: "SDA" },
  { src: "/brands/shipping/gls.svg", alt: "GLS" },
];

export default function Footer() {
  return (
    <footer
      className="footer"
      style={{
        marginTop: 32,
        padding: "24px 0",
        borderTop: "1px solid rgba(255,255,255,0.08)",
        background: "transparent",
      }}
    >
      <div className="container" style={{ display: "grid", gap: 16 }}>
        {/* Pagamenti */}
        <section>
          <div
            style={{
              fontSize: 14,
              opacity: 0.8,
              marginBottom: 8,
              fontWeight: 600,
            }}
          >
            Metodi di pagamento accettati
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(72px, 1fr))",
              gap: 12,
              alignItems: "center",
            }}
          >
            {payLogos.map((l) => (
              <img
                key={l.alt}
                src={l.src}
                alt={l.alt}
                title={l.alt}
                loading="lazy"
                style={{
                  height: 24,
                  width: "auto",
                  objectFit: "contain",
                  filter: "grayscale(0)",
                  opacity: 0.9,
                }}
                onError={(e) => {
                  // se manca un file, non rompere il layout
                  e.currentTarget.style.display = "none";
                }}
              />
            ))}
          </div>
        </section>

        {/* Corrieri */}
        <section>
          <div
            style={{
              fontSize: 14,
              opacity: 0.8,
              marginBottom: 8,
              fontWeight: 600,
            }}
          >
            Spedizioni con
          </div>
          <div
            style={{
              display: "flex",
              gap: 16,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            {shipLogos.map((l) => (
              <img
                key={l.alt}
                src={l.src}
                alt={l.alt}
                title={l.alt}
                loading="lazy"
                style={{ height: 22, width: "auto", objectFit: "contain", opacity: 0.9 }}
                onError={(e) => (e.currentTarget.style.display = "none")}
              />
            ))}
          </div>
        </section>

        {/* Link utili */}
        <section
          style={{
            display: "flex",
            gap: 16,
            flexWrap: "wrap",
            alignItems: "center",
            marginTop: 8,
            fontSize: 14,
          }}
        >
          <Link to="/termini">Termini e Condizioni</Link>
          <Link to="/chi-siamo">Chi siamo</Link>
          <span style={{ opacity: 0.7 }}>
            © {new Date().getFullYear()} DJ Shop Rigenerato!
          </span>
        </section>
      </div>
    </footer>
  );
}
