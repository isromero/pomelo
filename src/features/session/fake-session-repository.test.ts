import { FakeSessionRepository } from './fake-session-repository';

describe('FakeSessionRepository', () => {
  it('provides a deterministic authenticated UI seam', async () => {
    const repository = new FakeSessionRepository({ status: 'signed-out' });

    expect(await repository.restore()).toEqual({ status: 'signed-out' });
    await expect(repository.signIn({ email: 'test@example.com', password: 'password' })).resolves.toMatchObject({
      status: 'authenticated',
      profile: { displayName: 'Alex' },
    });
    await repository.signOut();
    expect(await repository.restore()).toEqual({ status: 'signed-out' });
  });
});
