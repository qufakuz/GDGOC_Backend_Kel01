import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PdfService } from './services/pdf';

@Module({
  imports: [],
  controllers: [AppController],
  providers: [AppService, PdfService],
})
export class AppModule {}
