import { TabSharedThreadpool } from "../src";
import { Worker } from "../src/worker";
import { sleep } from "../src/sleep";

test("Test worker priority", async () => {
  const results = new Array<number>();
  const worker = new Worker<number>("worker_priority", async (data) => {
    await sleep(1500);
    results.push(data);
  });
  await sleep(1500);
  await worker.push_message(0, 0);
  await worker.push_message(1, 1);
  await worker.push_message(2, 0);
  await sleep(3200);
  expect(results).toStrictEqual([0, 2]);
  await worker.stop();
}, 10000);

test("Test threadpool priority", async () => {
  const threadpool = new TabSharedThreadpool("threadpool_priority");
  const results = new Array<number>();
  await sleep(1500);
  threadpool.push_task(async () => {
    await sleep(500);
    results.push(1);
  }, 1);
  threadpool.push_task(async () => {
    await sleep(500);
    results.push(2);
  }, 1);
  threadpool.push_task(async () => {
    await sleep(500);
    results.push(3);
  }, 0);
  await sleep(1100);
  expect(results).toStrictEqual([1, 3]);
  await threadpool.stop();
});
