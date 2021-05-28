import { TabSharedThreadpool } from "../src/tab-shared-threadpool";
import { sleep } from "../lib/sleep";

test("Test tab shared threadpool", async () => {
  const threadpool = new TabSharedThreadpool("threadpool");
  const results: Array<number> = [];
  threadpool.push_task(async () => {
    results.push(0);
  });
  await sleep(2000);
  await threadpool.stop();
  expect(results).toStrictEqual([0]);
});

test("Test tab shared threadpool detect completion", async () => {
  const threadpool = new TabSharedThreadpool("threadpool");
  const res = await threadpool.push_task_and_await_completion<number>(
    async () => {
      return 1;
    }
  );
  expect(res).toBe(1);
});
