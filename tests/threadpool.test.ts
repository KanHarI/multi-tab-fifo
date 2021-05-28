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
