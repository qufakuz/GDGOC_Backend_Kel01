import { Test, TestingModule } from '@nestjs/testing';
import { Pdf } from './pdf';

describe('Pdf', () => {
  let provider: Pdf;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [Pdf],
    }).compile();

    provider = module.get<Pdf>(Pdf);
  });

  it('should be defined', () => {
    expect(provider).toBeDefined();
  });
});
