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
  const message = 1;
  const finished_workers: Array<number> = [];
  const worker = new Worker<number>("worker_test", async (n: number) => {
    finished_workers.push(n);
  });
  await sleep(1500);
  worker.push_message(message);
  await sleep(150);
  console.log(finished_workers);
  expect(finished_workers).toStrictEqual([1]);
  await worker.stop();
});
