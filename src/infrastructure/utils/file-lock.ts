const locks = new Map<string, Promise<unknown>>()

/**
 * Serializes async tasks by key so a load->mutate->save sequence against the
 * same file can't interleave with another one and silently drop a write.
 */
export function withFileLock<T>(key: string, task: () => Promise<T>): Promise<T> {
  const previous = locks.get(key) ?? Promise.resolve()
  const settled = previous.catch(() => undefined)
  const run = settled.then(task)
  locks.set(key, run.catch(() => undefined))
  return run
}
