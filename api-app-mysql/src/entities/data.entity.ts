import { TabelEntity } from 'src/entities/tabel.entity';
import { Column, Entity, OneToMany, PrimaryColumn } from 'typeorm';

@Entity('data')
export class DataEntity {
  constructor(data: Partial<DataEntity>) {
    Object.assign(this, data);
  }

  @PrimaryColumn()
  id: number;

  @Column()
  judul: string;

  @Column()
  keterangan: string;

  @OneToMany(() => TabelEntity, (tabel) => tabel.data)
  tabel: TabelEntity[];
}
