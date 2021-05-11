import { Worker } from "../src/worker";
import { sleep } from "../src/sleep";

test("Test worker creation quick", async () => {
  const worker = new Worker<number>("worker_test", async () => {
    return;
  });
  await worker.stop();
});

test("Test worker creation long", async () => {
  const worker = new Worker<number>("worker_test", async () => {
    return;
  });
  await sleep(1500);
  await worker.stop();
});

test("Test simple worker", async () => {
  const messages = [1, 2, 3];
  const finished_workers: Array<number> = [];
  const worker = new Worker<number>("worker_test", async (n: number) => {
    finished_workers.push(n);
  });
  await sleep(1500);
  for (const message of messages) {
    worker.push_message(message);
  }
  await sleep(250);
  await worker.stop();
  expect(finished_workers).toStrictEqual([1, 2, 3]);
});

test("Test simple parallel workers", async () => {
  const finished_workers: Array<number> = [];
  const worker = new Worker<number>("worker_test", async (n: number) => {
    await sleep(1000);
    finished_workers.push(n);
  });
  worker.set_max_concurrent_workers(20);
  await sleep(1500);
  for (let i = 0; i < 100; ++i) {
    worker.push_message(i);
  }
  await sleep(5500);
  await worker.stop();
  expect(finished_workers.length).toBe(100);
}, 15000);
