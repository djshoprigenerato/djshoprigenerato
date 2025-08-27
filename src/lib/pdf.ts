import PDFDocument from "pdfkit";
import { Readable } from "stream";

export function generateOrderPDF(order: any, items: any[]) {
  const doc = new PDFDocument({ margin: 30 });
  doc.fontSize(20).text(`Ordine #${order.id}`, { align: "center" });
  doc.moveDown();

  items.forEach((it) => {
    doc.fontSize(12).text(`${it.name} x${it.quantity} — €${it.price}`, { continued: false });
  });

  doc.moveDown();
  doc.fontSize(14).text(`Totale: €${order.total}`, { align: "right" });

  doc.end();
  const stream = Readable.from(doc);
  return stream;
}
