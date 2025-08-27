import "../styles/globals.css";
import type { AppProps } from "next/app";
import Layout from "../components/Layout";
import { CartProvider } from "../context/CartContext";

export default function MyApp({ Component, pageProps }: AppProps) {
  return (
    <CartProvider>
      <Layout>
        <Component {...pageProps} />
      </Layout>
    </CartProvider>
  );
}
