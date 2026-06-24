import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { SOURCE_KINDS, SourceKind, SourceMaterial } from '../domain/academic';
import { VaultService } from '../vault/vault.service';
import { SOURCES_REPOSITORY, SourcesRepository } from './sources.repository';
import { isVaultSourceId, noteToSource, pathFromVaultSourceId } from './vault-source';

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

function matches(source: SourceMaterial, q: string): boolean {
  return [source.title, source.abstract, source.body, ...(source.tags ?? [])]
    .filter((field): field is string => Boolean(field))
    .some((field) => field.toLowerCase().includes(q));
}

/**
 * Source Inbox (issue #28): bring papers, notes and links together, then search
 * and pick one to feed the Idea Lab / Draft Studio.
 *
 * Hybrid: manually-added sources (links/papers/notes) live in the repository,
 * while Obsidian vault notes are surfaced live and read-only — so the inbox
 * always reflects the current vault without copying. Vault-backed sources carry
 * a `vault_`-prefixed id and cannot be mutated through the inbox.
 */
@Injectable()
export class SourcesService {
  constructor(
    @Inject(SOURCES_REPOSITORY) private readonly repo: SourcesRepository,
    private readonly vault: VaultService,
  ) {}

  /** Manual sources plus live vault notes, newest first. */
  async list(): Promise<SourceMaterial[]> {
    const [manual, vault] = await Promise.all([this.repo.list(), this.vaultSources()]);
    return [...manual, ...vault].sort((a, b) => b.importedAt.localeCompare(a.importedAt));
  }

  async get(id: string): Promise<SourceMaterial> {
    if (isVaultSourceId(id)) {
      const note = await this.vault.getNote(pathFromVaultSourceId(id));
      if (!note) throw new NotFoundException(`Source ${id} not found`);
      return noteToSource(note);
    }
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

  /** Case-insensitive substring search over manual sources and vault notes. */
  async search(query: string): Promise<SourceMaterial[]> {
    const all = await this.list();
    const q = query.trim().toLowerCase();
    if (!q) return all;
    return all.filter((s) => matches(s, q));
  }

  /** Live vault notes mapped to sources; best-effort (never breaks the inbox). */
  private async vaultSources(): Promise<SourceMaterial[]> {
    try {
      const notes = await this.vault.listNotes();
      return notes.map(noteToSource);
    } catch {
      return [];
    }
  }
}
