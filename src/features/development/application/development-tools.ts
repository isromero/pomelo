export type DevelopmentMomentFormat = 'question' | 'photo' | 'doodle';

export type DevelopmentMoment = {
  format: DevelopmentMomentFormat;
  localDate: string;
  promptKey: string;
};

export type DevelopmentToolsErrorCode =
  | 'firstMomentRequired'
  | 'momentInProgress'
  | 'network'
  | 'notAllowed'
  | 'promptUnavailable'
  | 'unexpected';

export class DevelopmentToolsError extends Error {
  constructor(public readonly code: DevelopmentToolsErrorCode) {
    super(code);
    this.name = 'DevelopmentToolsError';
  }
}

export interface DevelopmentToolsRepository {
  advanceDay(): Promise<DevelopmentMoment>;
}
