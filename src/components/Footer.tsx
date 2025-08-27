import React from "react";

export default function Footer() {
  return (
    <footer className="bg-dark text-white py-4">
      <div className="container mx-auto text-center px-4">
        <p>&copy; {new Date().getFullYear()} DJ Shop Rigenerato. Tutti i diritti riservati.</p>
      </div>
    </footer>
  );
}
