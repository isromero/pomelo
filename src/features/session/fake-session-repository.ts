import {
  SessionRepository,
  SessionState,
  SignInCredentials,
  ViewerProfile,
} from './session-repository';

const defaultProfile: ViewerProfile = {
  id: '00000000-0000-4000-8000-000000000001',
  displayName: 'Alex',
  locale: 'es',
  appearance: 'system',
};

export class FakeSessionRepository implements SessionRepository {
  private state: SessionState;

  constructor(initialState: SessionState = { status: 'authenticated', profile: defaultProfile }) {
    this.state = initialState;
  }

  async restore(): Promise<SessionState> {
    return this.state;
  }

  async signIn(_credentials: SignInCredentials): Promise<SessionState> {
    this.state = { status: 'authenticated', profile: defaultProfile };
    return this.state;
  }

  async signOut(): Promise<void> {
    this.state = { status: 'signed-out' };
  }
}
