import { describe, expect, it, vi } from 'vitest';

async function loadService(repositories = createRepositories()) {
  const { createFeedPostService } = await import('../src/services/feed-posts');
  return createFeedPostService(repositories);
}

function createRepositories() {
  return {
    memberships: {
      findByAccountAndClub: vi.fn(async () => ({
        id: 'member-1',
        clubId: 'club-1',
        role: 'member' as const,
        status: 'approved' as const,
      })),
    },
    matches: {
      findClubId: vi.fn(async () => 'club-1' as string | null),
    },
    posts: {
      list: vi.fn(async () => []),
      create: vi.fn(async (input) => ({
        id: 'post-1',
        clubId: input.clubId,
        membershipId: input.membershipId,
        authorName: '춘향',
        matchId: input.matchId,
        contentType: input.contentType,
        textContent: input.textContent,
        mediaUrl: input.mediaUrl,
        createdAt: '2026-06-22T00:00:00.000Z',
        updatedAt: '2026-06-22T00:00:00.000Z',
        reactionCounts: { fire: 0, laugh: 0, goat: 0, clap: 0 },
        myReactions: [],
        commentCount: 0,
      })),
      findById: vi.fn(async () => ({
        id: 'post-1',
        clubId: 'club-1',
        membershipId: 'member-1',
      })),
      delete: vi.fn(async () => undefined),
    },
    reactions: {
      toggle: vi.fn(async () => undefined),
    },
  };
}

const auth = {
  user: {
    id: 'auth-user-1',
    email: 'member@example.com',
  },
};

describe('feed post service', () => {
  it('creates text posts after validating the server-side payload combination', async () => {
    const repositories = createRepositories();
    const service = await loadService(repositories);

    await expect(service.createPost({
      auth,
      clubId: 'club-1',
      contentType: 'text',
      textContent: '오늘 경기 수고!',
      mediaUrl: null,
      matchId: null,
    })).resolves.toMatchObject({
      id: 'post-1',
      contentType: 'text',
      textContent: '오늘 경기 수고!',
    });

    expect(repositories.posts.create).toHaveBeenCalledWith(expect.objectContaining({
      clubId: 'club-1',
      membershipId: 'member-1',
      contentType: 'text',
      textContent: '오늘 경기 수고!',
      mediaUrl: null,
    }));
  });

  it('rejects image posts without mediaUrl on the API side', async () => {
    const repositories = createRepositories();
    const service = await loadService(repositories);

    await expect(service.createPost({
      auth,
      clubId: 'club-1',
      contentType: 'image',
      textContent: '사진',
      mediaUrl: null,
      matchId: null,
    })).rejects.toMatchObject({
      code: 'bad_request',
    });
    expect(repositories.posts.create).not.toHaveBeenCalled();
  });

  it('toggles reactions for a post in the same club', async () => {
    const repositories = createRepositories();
    const service = await loadService(repositories);

    await expect(service.toggleReaction({
      auth,
      clubId: 'club-1',
      postId: 'post-1',
      reactionType: 'fire',
    })).resolves.toEqual({
      postId: 'post-1',
      toggled: true,
    });

    expect(repositories.reactions.toggle).toHaveBeenCalledWith({
      postId: 'post-1',
      membershipId: 'member-1',
      reactionType: 'fire',
    });
  });
});
