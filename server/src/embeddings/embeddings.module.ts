import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EMBEDDINGS_SERVICE, type EmbeddingsService } from './embeddings.types';
import { MockEmbeddingsService } from './mock.embeddings';
import { VoyageEmbeddingsService } from './voyage.embeddings';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: EMBEDDINGS_SERVICE,
      inject: [ConfigService],
      useFactory: (config: ConfigService): EmbeddingsService => {
        const dimensions = config.get<number>('embeddings.dimensions')!;
        if (config.get<string>('embeddings.provider') === 'voyage') {
          const key = config.get<string>('embeddings.voyageApiKey');
          if (!key) throw new Error('VOYAGE_API_KEY is required for the voyage provider');
          return new VoyageEmbeddingsService(dimensions, key, config.get<string>('embeddings.voyageModel')!);
        }
        return new MockEmbeddingsService(dimensions);
      },
    },
  ],
  exports: [EMBEDDINGS_SERVICE],
})
export class EmbeddingsModule {}
