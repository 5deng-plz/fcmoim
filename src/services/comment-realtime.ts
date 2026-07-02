import type { EventCommentRow } from '../types/domain';

export const COMMENT_CREATED_EVENT = 'comment.created.v1';

export type CommentRealtimePublisher = {
  publishCreated(comment: EventCommentRow): Promise<void>;
};

export function commentRealtimeTopic(targetId: string) {
  return `comments:feed_post:${targetId}`;
}

export const disabledCommentRealtimePublisher: CommentRealtimePublisher = {
  async publishCreated() {},
};
