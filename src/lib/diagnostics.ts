export type DiagnosticArea =
  | 'configuration'
  | 'network'
  | 'session'
  | 'storage'
  | 'widget';

export type DiagnosticEvent = {
  area: DiagnosticArea;
  code: string;
  recoverable: boolean;
};

export function captureDiagnostic(event: DiagnosticEvent): void {
  console.error('[pomelo-diagnostic]', event.area, event.code, event.recoverable);
}
