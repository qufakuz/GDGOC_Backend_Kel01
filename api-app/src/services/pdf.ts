import { Injectable } from '@nestjs/common';
import * as PDFDocument from 'pdfkit';
import { Parser } from 'htmlparser2';
import { DataDto } from '../dto/data.dto';

@Injectable()
export class PdfService {
  async generatePdf(data: DataDto): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        margin: 30,
        bufferPages: true, // Enable multi-page handling
      });

      const buffers: Buffer[] = [];

      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      // Header Document
      doc.font('Helvetica-Bold').fontSize(18);
      doc.moveDown(2);
      this.renderCenteredText(doc, data.judul, doc.page.margins.top);
      doc.moveDown(2);

      // Generate tabel dengan multi-page support
      this.generateTable(doc, data.tabel);

      // Keterangan setelah tabel
      doc.x = 300; // Reset X ke margin kiri
      doc.moveDown(2);
      doc.moveDown();
      this.renderHtmlContent(doc, data.keterangan);

      doc.end();
    });
  }

  private generateTable(doc: typeof PDFDocument, items: DataDto['tabel']) {
    const initialY = doc.y;
    const pageHeight = doc.page.height;
    const rowHeight = 25;
    const pageWidth = doc.page.width;

    // 1. KONFIGURASI UTAMA (Sesuaikan nilai ini saja)
    const TABLE_WIDTH_PERCENTAGE = 0.8; // 0-1 (80% dari lebar halaman)
    const COLUMN_RATIOS = [0.05, 0.5, 0.25, 0.25]; // Pastikan total = 1

    // 2. Hitung dimensi tabel
    const margin = 30;
    const availableWidth = pageWidth - 2 * margin;
    const totalTableWidth = availableWidth * TABLE_WIDTH_PERCENTAGE;
    const leftMargin = margin + (availableWidth - totalTableWidth) / 2;
    const columnWidths = COLUMN_RATIOS.map((ratio) => totalTableWidth * ratio);

    const headers = ['ID', 'Nama', 'Dansos', 'Kas'];
    let currentY = initialY;
    let rowCount = 0;
    let currentPageStartY = initialY;

    // 3. Hitung posisi garis vertikal
    const columnPositions = [leftMargin];
    columnWidths.reduce((acc, width) => {
      const pos = acc + width;
      columnPositions.push(leftMargin + pos);
      return pos;
    }, 0);

    // Fungsi untuk menggambar garis vertikal
    const drawVerticalLines = () => {
      doc.strokeColor('black');
      columnPositions.forEach((x) => {
        doc.moveTo(x, currentPageStartY).lineTo(x, currentY).stroke();
      });
    };

    // Fungsi header dengan alignment center
    const addHeader = () => {
      currentPageStartY = currentY;
      doc.font('Helvetica-Bold');

      columnWidths.forEach((width, i) => {
        doc.text(
          headers[i],
          leftMargin + columnWidths.slice(0, i).reduce((a, b) => a + b, 0),
          currentY,
          {
            width: columnWidths[i],
            align: 'center',
          },
        );
      });

      currentY += rowHeight;
      doc
        .moveTo(leftMargin, currentY)
        .lineTo(leftMargin + totalTableWidth, currentY)
        .stroke();
      currentY += 10;
    };

    // Fungsi baris dengan alignment center
    const addRow = (item: DataDto['tabel'][0]) => {
      if (currentY + rowHeight > pageHeight - 50) {
        drawVerticalLines();
        doc.addPage();
        currentY = doc.page.margins.top;
        addHeader();
        rowCount = 0;
      }

      if (rowCount % 2 === 0) {
        doc
          .rect(leftMargin, currentY - 5, totalTableWidth, rowHeight)
          .fill('#f8fafc')
          .fillColor('black');
      }

      const values = [
        item.id.toString(),
        item.nama,
        this.formatCurrency(item.dansos),
        this.formatCurrency(item.kas),
      ];

      values.forEach((value, i) => {
        doc
          .font('Helvetica')
          .fontSize(10)
          .text(
            value,
            leftMargin + columnWidths.slice(0, i).reduce((a, b) => a + b, 0),
            currentY,
            {
              width: columnWidths[i],
              align: 'center',
            },
          );
      });

      currentY += rowHeight;
      rowCount++;
    };

    // Mulai membuat tabel
    doc.font('Helvetica-Bold').fontSize(10);
    addHeader();
    items.forEach((item) => addRow(item));

    drawVerticalLines();
    doc.y = currentY + 10;
  }
  private renderHtmlContent(doc: typeof PDFDocument, html: string) {
    let currentText = '';
    const styles = {
      bold: false,
      italic: false,
      underline: false,
    };

    const flushText = () => {
      if (!currentText.trim()) return;

      let font = 'Helvetica';
      if (styles.bold && styles.italic) font = 'Helvetica-BoldOblique';
      else if (styles.bold) font = 'Helvetica-Bold';
      else if (styles.italic) font = 'Helvetica-Oblique';

      doc
        .font(font)
        .text(currentText, { underline: styles.underline })
        .fillColor('black');

      currentText = '';
    };

    const parser = new Parser({
      onopentag(name) {
        switch (name.toLowerCase()) {
          case 'b':
          case 'strong':
            flushText();
            styles.bold = true;
            break;
          case 'i':
          case 'em':
            flushText();
            styles.italic = true;
            break;
          case 'u':
            flushText();
            styles.underline = true;
            break;
          case 'br':
            flushText();
            doc.moveDown();
            break;
        }
      },
      ontext(text) {
        currentText += text;
      },
      onclosetag(name) {
        switch (name.toLowerCase()) {
          case 'p':
            flushText();
            doc.moveDown(0.8);
            break;
          case 'b':
          case 'strong':
          case 'i':
          case 'em':
          case 'u':
            flushText();
            styles[
              name === 'u'
                ? 'underline'
                : name === 'b' || name === 'strong'
                  ? 'bold'
                  : 'italic'
            ] = false;
            break;
        }
      },
    });

    parser.write(html);
    parser.end();
    flushText();
  }

  private renderCenteredText(doc: typeof PDFDocument, text: string, y: number) {
    const textWidth = doc.widthOfString(text);
    const x = (doc.page.width - textWidth) / 2;
    doc.text(text, x, y);
  }

  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  }
}
