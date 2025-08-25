// lib/pdf.js — genera PDF riepilogo ordine
import PDFDocument from 'pdfkit';
import dayjs from 'dayjs';

export function buildOrderPdfBuffer(order, items) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks = [];
    doc.on('data', c => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // header
    doc.fontSize(18).text('DJSHOPRIGENERATO');
    doc.moveDown(0.2).fontSize(10).fillColor('#555')
      .text('Re-Mix. Re-Fix. Re-Use. · Spedizione gratuita con SDA & GLS');
    doc.moveDown().fillColor('#000');

    // dati ordine
    const created = order.created_at ? dayjs(order.created_at).format('DD/MM/YYYY HH:mm') : '';
    doc.fontSize(14).text(`Ordine #${order.id}`);
    doc.fontSize(10).text(`Data: ${created}`);
    doc.text(`Cliente: ${order.email || ''}`);
    if (order.shipping_provider && order.tracking_code) {
      doc.text(`Spedizione: ${order.shipping_provider} · Tracking: ${order.tracking_code}`);
    }
    doc.moveDown();

    // tabella
    doc.fontSize(10).text('Prodotto', 50, doc.y, { continued: true })
      .text('Qtà', 300, doc.y, { continued: true })
      .text('Prezzo', 350, doc.y, { continued: true })
      .text('Totale', 430);
    doc.moveTo(50, doc.y + 2).lineTo(550, doc.y + 2).strokeColor('#ddd').stroke();
    doc.moveDown(0.5);

    (items || []).forEach(i => {
      const tot = (i.unit_price_cents * i.quantity) / 100;
      doc.fillColor('#000').text(i.title, 50, doc.y, { continued: true })
        .text(String(i.quantity), 300, doc.y, { continued: true })
        .text((i.unit_price_cents / 100).toFixed(2) + ' €', 350, doc.y, { continued: true })
        .text(tot.toFixed(2) + ' €', 430);
    });

    doc.moveDown();
    doc.fontSize(12).text('Totale ordine: ' + (order.total_cents / 100).toFixed(2) + ' €', { align: 'right' });

    doc.end();
  });
}
