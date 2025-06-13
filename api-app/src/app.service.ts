import { Injectable } from '@nestjs/common';
import { DataDto } from './dto/data.dto';
import { UpdateDataDto } from './dto/update-data.dto';
import { TabelDto } from './dto/tabel.dto';
import { Response } from 'express';
import { PdfService } from './services/pdf';

@Injectable()
export class AppService {
  private data: DataDto = {
    judul: '',
    tabel: [],
    keterangan: '',
  };

  constructor(private readonly pdfService: PdfService) {
    // const filePath = path.join(__dirname, 'inject-data.json');
    // const raw = fs.readFileSync(filePath, 'utf-8');
    // this.data = JSON.parse(raw) as DataDto;
  }

  find() {
    return this.data;
  }

  update(updateDataDto: UpdateDataDto) {
    this.data['judul'] = updateDataDto['judul'];
    this.data['keterangan'] = updateDataDto['keterangan'];
  }

  createTabel(tabel: TabelDto) {
    tabel['id'] = 1;

    const lastIdTabel = this.data['tabel'][this.data['tabel'].length - 1];
    if (lastIdTabel) tabel['id'] = lastIdTabel.id + 1;

    this.data['tabel'] = [...this.data['tabel'], tabel];
  }

  updateTabel(id: number, tabel: TabelDto) {
    this.data['tabel'] = this.data['tabel'].map((row) =>
      row.id == id ? tabel : row,
    );
  }

  deleteTabel(id: number) {
    this.data['tabel'] = this.data['tabel'].filter((row) => row.id != id);
  }

  async generatePDF(res: Response) {
    const buffer = await this.pdfService.generatePdf(this.data);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'inline; filename=laporan.pdf',
    });

    return res.send(buffer);
  }

  import(data: DataDto) {
    this.data['judul'] = data.judul;
    this.data['keterangan'] = data.keterangan;
    this.data['tabel'] = [...this.data['tabel'], ...data.tabel];
  }
}
