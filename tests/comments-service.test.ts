import { describe, expect, it, vi } from 'vitest';

async function loadService(repositories: {
  memberships: {
    findByAccountAndClub: ReturnType<typeof vi.fn>;
  };
  targets: {
    findClubId: ReturnType<typeof vi.fn>;
  };
  comments: {
    listForTarget: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
  };
}) {
  const { createCommentService } = await import('../src/services/comments');

  return createCommentService(repositories as unknown as Parameters<typeof createCommentService>[0]);
}

function createRepositories(options?: {
  targetClubId?: string | null;
  membershipStatus?: 'pending' | 'approved' | null;
}) {
  const membership = options?.membershipStatus === null ? null : {
    id: 'operator-membership',
    clubId: 'club-1',
    role: 'operator' as const,
    status: options?.membershipStatus ?? 'approved',
  };

  return {
    memberships: {
      findByAccountAndClub: vi.fn(async () => membership),
    },
    targets: {
      findClubId: vi.fn(async () => options?.targetClubId ?? 'club-1'),
    },
    comments: {
      listForTarget: vi.fn(async () => []),
      create: vi.fn(async (input) => ({
        id: 'comment-1',
        targetType: input.targetType,
        targetId: input.targetId,
        membershipId: input.membershipId,
        authorName: '운영자',
        content: input.content,
        createdAt: '2026-03-21T09:00:00.000Z',
      })),
    },
  };
}

describe('event comment service', () => {
  it('creates generic match comments with target type and target id', async () => {
    const repositories = createRepositories();
    const service = await loadService(repositories);

    await expect(
      service.createComment({
        auth: { user: { id: 'operator-auth-user', email: 'operator@example.com' } },
        clubId: 'club-1',
        targetType: 'match',
        targetId: 'match-1',
        content: '  결과 확인 완료  ',
      }),
    ).resolves.toMatchObject({
      targetType: 'match',
      targetId: 'match-1',
      content: '결과 확인 완료',
    });

    expect(repositories.comments.create).toHaveBeenCalledWith({
      targetType: 'match',
      targetId: 'match-1',
      membershipId: 'operator-membership',
      content: '결과 확인 완료',
    });
  });

  it('lists poll option comments without mixing target ids', async () => {
    const repositories = createRepositories();
    const service = await loadService(repositories);

    await service.listComments({
      auth: { user: { id: 'operator-auth-user', email: 'operator@example.com' } },
      clubId: 'club-1',
      targetType: 'schedule_poll_option',
      targetId: 'option-a',
    });

    expect(repositories.comments.listForTarget).toHaveBeenCalledWith({
      targetType: 'schedule_poll_option',
      targetId: 'option-a',
    });
  });

  it('rejects targets outside the active club', async () => {
    const repositories = createRepositories({ targetClubId: 'club-2' });
    const service = await loadService(repositories);

    await expect(
      service.listComments({
        auth: { user: { id: 'operator-auth-user', email: 'operator@example.com' } },
        clubId: 'club-1',
        targetType: 'match',
        targetId: 'match-1',
      }),
    ).rejects.toMatchObject({ code: 'not_found' });
  });

  it('rejects pending memberships before listing comments', async () => {
    const repositories = createRepositories({ membershipStatus: 'pending' });
    const service = await loadService(repositories);

    await expect(
      service.listComments({
        auth: { user: { id: 'operator-auth-user', email: 'operator@example.com' } },
        clubId: 'club-1',
        targetType: 'match',
        targetId: 'match-1',
      }),
    ).rejects.toMatchObject({ code: 'membership_not_approved', status: 403 });

    expect(repositories.targets.findClubId).not.toHaveBeenCalled();
    expect(repositories.comments.listForTarget).not.toHaveBeenCalled();
  });

  it('rejects missing memberships before creating comments', async () => {
    const repositories = createRepositories({ membershipStatus: null });
    const service = await loadService(repositories);

    await expect(
      service.createComment({
        auth: { user: { id: 'operator-auth-user', email: 'operator@example.com' } },
        clubId: 'club-1',
        targetType: 'match',
        targetId: 'match-1',
        content: '참석합니다',
      }),
    ).rejects.toMatchObject({ code: 'membership_not_approved', status: 403 });

    expect(repositories.targets.findClubId).not.toHaveBeenCalled();
    expect(repositories.comments.create).not.toHaveBeenCalled();
  });

  it('rejects invalid target types as bad requests', async () => {
    const repositories = createRepositories();
    const service = await loadService(repositories);

    await expect(
      service.listComments({
        auth: { user: { id: 'operator-auth-user', email: 'operator@example.com' } },
        clubId: 'club-1',
        targetType: 'training',
        targetId: 'match-1',
      }),
    ).rejects.toMatchObject({ code: 'bad_request', status: 400 });

    expect(repositories.memberships.findByAccountAndClub).not.toHaveBeenCalled();
    expect(repositories.targets.findClubId).not.toHaveBeenCalled();
  });

  it('rejects blank target ids as bad requests', async () => {
    const repositories = createRepositories();
    const service = await loadService(repositories);

    await expect(
      service.listComments({
        auth: { user: { id: 'operator-auth-user', email: 'operator@example.com' } },
        clubId: 'club-1',
        targetType: 'match',
        targetId: '   ',
      }),
    ).rejects.toMatchObject({ code: 'bad_request', status: 400 });

    expect(repositories.targets.findClubId).not.toHaveBeenCalled();
    expect(repositories.comments.listForTarget).not.toHaveBeenCalled();
  });

  it('rejects blank comment content as a bad request', async () => {
    const repositories = createRepositories();
    const service = await loadService(repositories);

    await expect(
      service.createComment({
        auth: { user: { id: 'operator-auth-user', email: 'operator@example.com' } },
        clubId: 'club-1',
        targetType: 'match',
        targetId: 'match-1',
        content: '   ',
      }),
    ).rejects.toMatchObject({ code: 'bad_request', status: 400 });

    expect(repositories.comments.create).not.toHaveBeenCalled();
  });

  it('rejects comment content longer than the database limit as a bad request', async () => {
    const repositories = createRepositories();
    const service = await loadService(repositories);

    await expect(
      service.createComment({
        auth: { user: { id: 'operator-auth-user', email: 'operator@example.com' } },
        clubId: 'club-1',
        targetType: 'match',
        targetId: 'match-1',
        content: 'a'.repeat(1001),
      }),
    ).rejects.toMatchObject({ code: 'bad_request', status: 400 });

    expect(repositories.comments.create).not.toHaveBeenCalled();
  });
});
