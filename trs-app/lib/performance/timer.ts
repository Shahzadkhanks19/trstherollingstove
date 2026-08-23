export async function measureAsync<T>(
  label: string,
  operation: () => Promise<T>,
): Promise<{ value: T; durationMs: number }> {
  const startedAt = performance.now();

  try {
    const value = await operation();

    return {
      value,
      durationMs: Number((performance.now() - startedAt).toFixed(2)),
    };
  } catch (error) {
    const durationMs = Number((performance.now() - startedAt).toFixed(2));
    console.error(`[performance] ${label} failed after ${durationMs}ms`, error);
    throw error;
  }
}
