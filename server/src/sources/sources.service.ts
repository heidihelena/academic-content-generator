import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { SOURCE_KINDS, SourceKind, SourceMaterial } from '../domain/academic';
import { SOURCES_REPOSITORY, SourcesRepository } from './sources.repository';

/** Fields a caller supplies to add a source; id + importedAt are assigned here. */
export interface CreateSourceInput {
  kind: SourceKind;
  title: string;
  authors?: string[];
  year?: number;
  doi?: string;
  url?: string;
  abstract?: string;
  body?: string;
  tags?: string[];
}

/**
 * Source Inbox (issue #28): bring papers, notes and links into the vault, then
 * search and pick one to feed the Idea Lab / Draft Studio.
 */
@Injectable()
export class SourcesService {
  constructor(
    @Inject(SOURCES_REPOSITORY) private readonly repo: SourcesRepository,
  ) {}

  list(): Promise<SourceMaterial[]> {
    return this.repo.list();
  }

  async get(id: string): Promise<SourceMaterial> {
    const found = await this.repo.findById(id);
    if (!found) throw new NotFoundException(`Source ${id} not found`);
    return found;
  }

  async create(input: CreateSourceInput): Promise<SourceMaterial> {
    if (!input?.title?.trim()) {
      throw new BadRequestException('title is required');
    }
    if (!SOURCE_KINDS.includes(input.kind)) {
      throw new BadRequestException(`kind must be one of: ${SOURCE_KINDS.join(', ')}`);
    }
    const source: SourceMaterial = {
      id: `src_${randomUUID()}`,
      kind: input.kind,
      title: input.title.trim(),
      authors: input.authors,
      year: input.year,
      doi: input.doi,
      url: input.url,
      abstract: input.abstract,
      body: input.body,
      tags: input.tags ?? [],
      importedAt: new Date().toISOString(),
    };
    return this.repo.upsert(source);
  }

  /** Case-insensitive substring search over title / abstract / body / tags. */
  async search(query: string): Promise<SourceMaterial[]> {
    const q = query.trim().toLowerCase();
    if (!q) return this.repo.list();
    const all = await this.repo.list();
    return all.filter((s) =>
      [s.title, s.abstract, s.body, ...(s.tags ?? [])]
        .filter((field): field is string => Boolean(field))
        .some((field) => field.toLowerCase().includes(q)),
    );
  }
}
