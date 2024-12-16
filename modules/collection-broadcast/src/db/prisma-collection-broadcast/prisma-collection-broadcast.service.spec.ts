import { Test, TestingModule } from '@nestjs/testing';
import { PrismaCollectionBroadcastService } from './prisma-collection-broadcast.service';

describe('PrismaCollectionBroadcastService', () => {
  let service: PrismaCollectionBroadcastService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PrismaCollectionBroadcastService]
    }).compile();

    service = module.get<PrismaCollectionBroadcastService>(PrismaCollectionBroadcastService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
