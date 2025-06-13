import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PdfService } from './services/pdf';
import { ConfigModule } from '@nestjs/config';
import { TabelEntity } from 'src/entities/tabel.entity';
import { DataEntity } from 'src/entities/data.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatabaseModule } from 'src/config/database/database.module';

@Module({
  imports: [
    DatabaseModule,
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forFeature([DataEntity, TabelEntity]),
  ],
  controllers: [AppController],
  providers: [AppService, PdfService],
})
export class AppModule {}
