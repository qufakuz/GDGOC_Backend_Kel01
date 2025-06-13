import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { DataEntity } from './data.entity';

@Entity('tabel')
export class TabelEntity {
  constructor(data: Partial<TabelEntity>) {
    Object.assign(this, data);
  }

  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: number;

  @Column()
  nama: string;

  @Column()
  dansos: number;

  @Column()
  kas: number;

  @ManyToOne(() => DataEntity, (data) => data.id)
  @JoinColumn({ name: 'data_id' })
  data: Partial<DataEntity>;
}
