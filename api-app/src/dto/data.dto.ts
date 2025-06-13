import { z } from 'zod';

export const DataSchema = z.object({
  judul: z.string(),
  tabel: z.array(
    z.object({
      id: z.number(),
      nama: z.string(),
      dansos: z.number(),
      kas: z.number(),
    }),
  ),
  keterangan: z.string(),
});

export type DataDto = z.infer<typeof DataSchema>;
