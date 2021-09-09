import { Worker } from "../src/worker";
import { sleep } from "../src/sleep";

test("Test worker creation quick", async () => {
  const worker = new Worker<number>(
    "worker_test_1",
    async () => {
      return;
    },
    globalThis
  );
  await worker.stop();
});

test("Test worker creation long", async () => {
  const worker = new Worker<number>(
    "worker_test_2",
    async () => {
      return;
    },
    globalThis
  );
  await sleep(1500);
  await worker.stop();
});

test("Test simple worker", async () => {
  const messages = [1, 2, 3];
  const finished_workers: Array<number> = [];
  const worker = new Worker<number>(
    "worker_test_3",
    async (n: number) => {
      finished_workers.push(n);
    },
    globalThis
  );
  await sleep(1500);
  for (const message of messages) {
    worker.push_message(message);
  }
  await sleep(70);
  await worker.stop();
  expect(finished_workers).toStrictEqual([1, 2, 3]);
});

test("Test simple worker no extra messages", async () => {
  const messages = [1, 2, 3];
  const finished_workers: Array<number> = [];
  const worker = new Worker<number>(
    "worker_test_3",
    async (n: number) => {
      finished_workers.push(n);
    },
    globalThis
  );
  await sleep(1500);
  for (const message of messages) {
    worker.push_message(message);
  }
  await sleep(500);
  await worker.stop();
  expect(finished_workers).toStrictEqual([1, 2, 3]);
});

test("Test simple parallel workers", async () => {
  const finished_workers: Array<number> = [];
  const worker = new Worker<number>(
    "worker_test_4",
    async (n: number) => {
      await sleep(1000);
      finished_workers.push(n);
    },
    globalThis
  );
  worker.set_max_concurrent_workers(20);
  await sleep(1500);
  for (let i = 0; i < 100; ++i) {
    worker.push_message(i);
  }
  await sleep(6500);
  await worker.stop();
  expect(finished_workers.length).toBe(100);
}, 15000);
