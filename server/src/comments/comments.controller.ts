import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CurrentUserId } from '../auth/current-user.decorator';
import { CommentsService } from './comments.service';

/** Collaboration thread, hung off the content item it belongs to. */
@Controller('content-items')
export class CommentsController {
  constructor(private readonly comments: CommentsService) {}

  /** GET /api/content-items/:id/comments — the item's notes/comments, oldest first. */
  @Get(':id/comments')
  list(@CurrentUserId() userId: string, @Param('id') id: string) {
    return this.comments.listForItem(id, userId);
  }

  /** POST /api/content-items/:id/comments — add a comment. */
  @Post(':id/comments')
  add(@CurrentUserId() userId: string, @Param('id') id: string, @Body('body') body: string) {
    return this.comments.add(id, body, userId);
  }
}
