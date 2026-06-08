export class WriteQueue {
  private tail: Promise<unknown> = Promise.resolve();

  enqueue<T>(task: () => Promise<T> | T): Promise<T> {
    const runTask = this.tail.then(task, task);
    this.tail = runTask.catch(() => undefined);
    return runTask;
  }
}
