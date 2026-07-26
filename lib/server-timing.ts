/**
 * Server-side timing for Vercel function logs.
 * Compare `query:*` vs `page:*` to separate DB work from total request time.
 */
export async function timed<T>(
  label: string,
  fn: () => Promise<T>,
): Promise<T> {
  const key = `⏱ ${label}`;
  console.time(key);
  try {
    return await fn();
  } finally {
    console.timeEnd(key);
  }
}
