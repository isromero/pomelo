export function hasNewMemory(
  previousIds: ReadonlySet<string> | null,
  memories: { id: string }[],
) {
  return previousIds !== null && memories.some((memory) => !previousIds.has(memory.id));
}
