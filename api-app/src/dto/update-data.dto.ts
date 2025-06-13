import { z } from 'zod';

export const UpdateDataSchema = z.object({
  judul: z.string(),
  keterangan: z.string(),
});

export type UpdateDataDto = z.infer<typeof UpdateDataSchema>;
