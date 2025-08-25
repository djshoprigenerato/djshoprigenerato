// lib/pdf.js – genera il PDF ordine completo (intestazione, spedizione, telefono, articoli)
import PDFDocument from 'pdfkit';

function euro(cents) {
  return (Number(cents || 0) / 100).toFixed(2).replace('.', ',');
}

export async function buildOrderPdfBuffer(order, items = []) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 42 });
      const chunks = [];
      doc.on('data', (c) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));

      // Header
      doc
        .fontSize(16)
        .text('DJSHOPRIGENERATO - Riepilogo Ordine', { align: 'left' })
        .moveDown(0.5);

      doc.fontSize(11).text(`Ordine #${order.id}`);
      doc.text(`Data: ${new Date(order.created_at).toLocaleString('it-IT')}`);
      doc.text(`Stato: ${order.status}`);
      doc.text(`Email cliente: ${order.email || '-'}`);
      doc.moveDown();

      // Spedizione (nuovi campi)
      const fullName =
        order.shipping_fullname || order.fullname || order.name || '-';
      const addr1 = order.shipping_address || order.address || '-';
      const zip = order.shipping_zip || order.zip || '';
      const city = order.shipping_city || order.city || '';
      const province = order.shipping_state || order.state || '';
      const country = order.shipping_country || order.country || 'IT';
      const phone = order.phone || order.shipping_phone || '-';

      doc
        .fontSize(13)
        .text('Dati di spedizione', { underline: true })
        .moveDown(0.3);
      doc.fontSize(11).text(fullName);
      doc.text(addr1);
      doc.text(`${zip} ${city} ${province} (${country})`);
      doc.text(`Telefono: ${phone}`);
      doc.moveDown();

      // Corriere
      if (order.shipping_provider || order.tracking_code) {
        doc.fontSize(13).text('Spedizione', { underline: true }).moveDown(0.3);
        if (order.shipping_provider) doc.fontSize(11).text(`Corriere: ${order.shipping_provider}`);
        if (order.tracking_code) doc.text(`Tracking: ${order.tracking_code}`);
        if (order.shipped_at) doc.text(`Spedito il: ${new Date(order.shipped_at).toLocaleString('it-IT')}`);
        doc.moveDown();
      }

      // Articoli
      doc.fontSize(13).text('Articoli', { underline: true }).moveDown(0.3);
      doc.fontSize(11);
      const tableTop = doc.y;
      const col = [42, 320, 380, 460];
      doc.text('Prodotto', col[0], tableTop);
      doc.text('Q.tà', col[1], tableTop);
      doc.text('Prezzo €', col[2], tableTop);
      doc.text('Subtotale €', col[3], tableTop);
      doc.moveTo(42, tableTop + 14).lineTo(553, tableTop + 14).stroke();

      let y = tableTop + 20;
      (items || []).forEach((it) => {
        const sub = (Number(it.unit_price_cents || 0) * Number(it.quantity || 1));
        doc.text(it.title || '-', col[0], y, { width: 260 });
        doc.text(String(it.quantity || 1), col[1], y);
        doc.text(euro(it.unit_price_cents), col[2], y);
        doc.text(euro(sub), col[3], y);
        y += 18;
      });

      doc.moveDown(1.5);
      doc.fontSize(12).text(`Totale ordine: € ${euro(order.total_cents)}`, { align: 'right' });

      doc.end();
    } catch (e) { reject(e); }
  });
}
