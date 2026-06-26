import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { ChecklistItem } from '../domain/academic';
import { ContentService } from '../content/content.service';
import { CHECKLIST_REPOSITORY, ChecklistRepository } from './checklist.repository';

/**
 * Pre-publish checklist on a content item — the editorial QA gate. All operations
 * are scoped to the item's owner (via {@link ContentService.getItem}): you can
 * only see/edit the checklist of an item you can access (404 otherwise).
 */
@Injectable()
export class ChecklistService {
  constructor(
    @Inject(CHECKLIST_REPOSITORY) private readonly repo: ChecklistRepository,
    private readonly content: ContentService,
  ) {}

  async listForItem(itemId: string, scope?: string): Promise<ChecklistItem[]> {
    await this.content.getItem(itemId, scope); // 404 if missing or not owned
    return this.repo.listByItem(itemId);
  }

  async add(itemId: string, label: string, scope?: string, now: Date = new Date()): Promise<ChecklistItem> {
    await this.content.getItem(itemId, scope); // 404 if missing or not owned
    if (!label?.trim()) throw new BadRequestException('checklist label is required');
    return this.repo.upsert({
      id: `ck_${randomUUID()}`,
      itemId,
      label: label.trim(),
      done: false,
      createdAt: now.toISOString(),
    });
  }

  /** Toggle/set the done flag, scoped via the entry's parent item. */
  async setDone(itemId: string, checkId: string, done: boolean, scope?: string): Promise<ChecklistItem> {
    await this.content.getItem(itemId, scope); // 404 if missing or not owned
    const entry = await this.repo.findById(checkId);
    if (!entry || entry.itemId !== itemId) {
      throw new NotFoundException(`ChecklistItem ${checkId} not found`);
    }
    return this.repo.upsert({ ...entry, done });
  }

  async remove(itemId: string, checkId: string, scope?: string): Promise<void> {
    await this.content.getItem(itemId, scope); // 404 if missing or not owned
    const entry = await this.repo.findById(checkId);
    if (!entry || entry.itemId !== itemId) {
      throw new NotFoundException(`ChecklistItem ${checkId} not found`);
    }
    await this.repo.delete(checkId);
  }
}
