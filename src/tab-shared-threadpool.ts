import { Deferred } from "ts-deferred";
import { Worker } from "./worker";

class TabSharedThreadpool {
  private readonly fifo_worker: Worker<() => Promise<unknown>>;
  constructor(threadpool_name: string, _global_this: Record<string, unknown>) {
    this.fifo_worker = new Worker<() => Promise<unknown>>(
      threadpool_name + "_threadpool",
      TabSharedThreadpool.wrapped_callback,
      _global_this
    );
  }

  private static async wrapped_callback(
    origin_callback: () => Promise<unknown>
  ): Promise<unknown> {
    return await origin_callback();
  }

  public async push_task(
    callback: () => Promise<unknown>,
    priority = 0
  ): Promise<Deferred<unknown> | undefined> {
    return this.fifo_worker.push_message(callback, priority);
  }

  public async push_task_and_await_completion<U>(
    callback: () => Promise<U>,
    priority = 0
  ): Promise<U | undefined> {
    const deferred = await this.push_task(callback, priority);
    if (deferred == undefined) {
      return undefined;
    }
    return (await deferred.promise) as U;
  }

  public is_leading(): boolean {
    return this.fifo_worker.is_leading();
  }

  public async stop(): Promise<void> {
    await this.fifo_worker.stop();
  }

  public set_num_workers(n: number): void {
    this.fifo_worker.set_max_concurrent_workers(n);
  }
}

function create_tab_shared_threadpool_with_global_this(
  threadpool_name: string
): TabSharedThreadpool {
  return new TabSharedThreadpool(threadpool_name, globalThis);
}

function create_tab_shared_threadpool_for_browser(
  threadpool_name: string
): TabSharedThreadpool {
  // @ts-ignore
  return new TabSharedThreadpool(threadpool_name, window);
}

export {
  TabSharedThreadpool,
  create_tab_shared_threadpool_with_global_this,
  create_tab_shared_threadpool_for_browser,
};
