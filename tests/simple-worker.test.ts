import { Worker } from "../src/worker";
import { sleep } from "../src/sleep";

test("Test simple worker", async () => {
  const message = 1;
  const finishe_workers: Array<number> = [];
  const worker = new Worker<number>("worker_test", async (n: number) => {
    finishe_workers.push(n);
  });
  await sleep(1500);
  worker.push_message(message);
  await sleep(150);
  console.log(finishe_workers);
  expect(finishe_workers).toStrictEqual([1]);
  await worker.stop();
});
