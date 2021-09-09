import { create_tab_shared_threadpool_with_global_this } from "../lib/tab-shared-threadpool";
import { sleep } from "../lib/sleep";

test("Test tab shared threadpool", async () => {
  const threadpool = create_tab_shared_threadpool_with_global_this(
    "threadpool"
  );
  const results: Array<number> = [];
  threadpool.push_task(async () => {
    results.push(0);
  });
  await sleep(2000);
  await threadpool.stop();
  expect(results).toStrictEqual([0]);
});

test("Test tab shared threadpool detect completion", async () => {
  const threadpool = create_tab_shared_threadpool_with_global_this(
    "threadpool"
  );
  const res = await threadpool.push_task_and_await_completion<number>(
    async () => {
      return 1;
    }
  );
  await threadpool.stop();
  expect(res).toBe(1);
});
