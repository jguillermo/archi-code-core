export function codeOf(action: () => unknown): string {
  try {
    action();
  } catch (error) {
    return error instanceof Error && 'code' in error ? String(error.code) : `THROWN ${error}`;
  }
  return 'NO_ERROR';
}
