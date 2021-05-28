import { Worker } from "./worker";

class TabSharedThreadpool {
  private readonly fifo_worker: Worker<() => Promise<unknown>>;
  constructor(threadpool_name: string) {
    this.fifo_worker = new Worker<() => Promise<unknown>>(
      threadpool_name + "_threadpool",
      TabSharedThreadpool.wrapped_callback
    );
  }

  private static async wrapped_callback(
    origin_callback: () => Promise<unknown>
  ): Promise<unknown> {
    return await origin_callback();
  }

  public async push_task(
    callback: () => Promise<unknown>
  ): Promise<Promise<unknown> | undefined> {
    return this.fifo_worker.push_message(callback);
  }

  public async push_task_and_await_completion<U>(
    callback: () => Promise<U>
  ): Promise<U | undefined> {
    const promise = await this.push_task(callback);
    if (promise == undefined) {
      return undefined;
    }
    return (await promise) as U;
  }

  public async stop(): Promise<void> {
    await this.fifo_worker.stop();
  }

  public set_num_workers(n: number): void {
    this.fifo_worker.set_max_concurrent_workers(n);
  }
}

export { TabSharedThreadpool };
