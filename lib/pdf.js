import PDFDocument from 'pdfkit';

export function orderPdf(order){
  const doc = new PDFDocument({ margin: 40 });
  doc.fontSize(18).text('DJSHOPRIGENERATO — Riepilogo Ordine', { align: 'center' });
  doc.moveDown();
  doc.fontSize(12).text(`Ordine #${order.order_no}`);
  doc.text(`Data: ${new Date(order.created_at).toLocaleString('it-IT')}`);
  doc.moveDown();

  const s = order.shipping || {};
  doc.text(`Cliente: ${order.name || ''}`);
  doc.text(`Email: ${order.email || ''}`);
  doc.text(`Telefono: ${order.phone || ''}`);
  doc.moveDown();
  doc.text('Indirizzo di spedizione:');
  doc.text(s.address || '');
  doc.text(`${s.zip || ''} ${s.city || ''} ${s.province || ''}`);
  doc.text(s.country || '');
  doc.moveDown();

  doc.text(`Corriere: ${order.courier || '-'}`);
  doc.text(`Tracking: ${order.tracking || '-'}`);
  doc.moveDown();

  doc.text('Articoli:');
  (order.items || []).forEach(i => {
    doc.text(`- ${i.title} x${i.qty}  € ${(i.price_cents/100).toFixed(2)}`);
  });
  doc.moveDown();
  if(order.discount_code){
    doc.text(`Sconto (${order.discount_code}): -€ ${(order.discount_amount_cents/100).toFixed(2)}`);
  }
  doc.text(`Totale: € ${(order.total_cents/100).toFixed(2)}`, { align: 'right' });
  doc.end();
  return doc;
}
