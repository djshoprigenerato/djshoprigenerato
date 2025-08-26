// lib/mailer.js — invio email via SMTP
import nodemailer from 'nodemailer';
import { htmlToText } from 'html-to-text';

const host = process.env.SMTP_HOST;
const port = Number(process.env.SMTP_PORT || 587);
const secure = process.env.SMTP_SECURE === '1'; // 1 = porta 465
const user = process.env.SMTP_USER || null;
const pass = process.env.SMTP_PASS || null;
const from = process.env.SMTP_FROM || 'DJSHOPRIGENERATO <no-reply@djshoprigenerato.eu>';

let transporter = null;
if (host) {
  transporter = nodemailer.createTransport({
    host, port, secure,
    auth: user && pass ? { user, pass } : undefined,
  });
}

export async function sendMail({ to, subject, html, attachments = [] }) {
  if (!transporter) {
    console.warn('SMTP non configurato: email non inviata.');
    return false;
  }
  const text = htmlToText(html);
  await transporter.sendMail({ from, to, subject, html, text, attachments });
  return true;
}

// email base
export function tplOrderConfirmation({ orderId, totalEUR }) {
  return {
    subject: `Conferma ordine #${orderId} – DJSHOPRIGENERATO`,
    html: `
      <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#111">
        <h2>Grazie per l'ordine #${orderId}</h2>
        <p>Abbiamo ricevuto il tuo pagamento. In allegato trovi il riepilogo in PDF.</p>
        <p><strong>Totale:</strong> € ${totalEUR.toFixed(2)} · <strong>Spedizione gratuita</strong> (SDA & GLS)</p>
        <p>Ti aggiorneremo via email quando la spedizione sarà affidata al corriere.</p>
        <p style="color:#6b7280">DJSHOPRIGENERATO · Re-Mix. Re-Fix. Re-Use.</p>
      </div>`
  };
}

export function tplShipment({ orderId, provider, tracking }) {
  return {
    subject: `Ordine #${orderId} spedito – ${provider}`,
    html: `
      <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#111">
        <h2>Ordine #${orderId} in spedizione</h2>
        <p>Il tuo pacco è stato affidato a <strong>${provider}</strong>.</p>
        ${tracking ? `<p><strong>Tracking:</strong> ${tracking}</p>` : ''}
        <p>Grazie per aver scelto DJSHOPRIGENERATO!</p>
      </div>`
  };
}
