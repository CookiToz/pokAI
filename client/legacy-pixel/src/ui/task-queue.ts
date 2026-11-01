// Sequential async task runner used to animate event queues.
// Tasks never overlap; a failing task is logged and does not break the chain.

export type Task = () => Promise<void> | void;

export class TaskQueue {
  private chain: Promise<void> = Promise.resolve();
  private pending = 0;
  private idleWaiters: (() => void)[] = [];

  get busy(): boolean {
    return this.pending > 0;
  }

  get size(): number {
    return this.pending;
  }

  push(task: Task): Promise<void> {
    this.pending++;
    const run = this.chain.then(async () => {
      try {
        await task();
      } catch (err) {
        console.error('[TaskQueue] task failed', err);
      } finally {
        this.pending--;
        if (this.pending === 0) {
          const waiters = this.idleWaiters;
          this.idleWaiters = [];
          waiters.forEach((w) => w());
        }
      }
    });
    this.chain = run;
    return run;
  }

  pushAll(tasks: Task[]): Promise<void> {
    let last: Promise<void> = Promise.resolve();
    for (const t of tasks) last = this.push(t);
    return last;
  }

  /** Resolves when every queued task has finished. */
  idle(): Promise<void> {
    if (this.pending === 0) return Promise.resolve();
    return new Promise((res) => this.idleWaiters.push(res));
  }
}
