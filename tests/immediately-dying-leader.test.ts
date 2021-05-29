import { Worker } from "../src/worker";
import { sleep } from "../src/sleep";

async function immediately_dying_leader(leader_death: number) {
  const results = new Array<number>();
  const w1 = new Worker<number>(
    "imm_dying_leader_" + leader_death,
    async (data) => {
      await sleep(200);
      results.push(data);
    }
  );
  const w2 = new Worker<number>(
    "imm_dying_leader_" + leader_death,
    async (data) => {
      await sleep(200);
      results.push(data);
    }
  );
  w2.push_message(0);
  w2.push_message(1);
  w2.push_message(2);
  w2.push_message(3);
  w2.push_message(4);
  w2.push_message(5);
  if (leader_death > 0) {
    await sleep(leader_death);
  }
  await w1.stop();
  await sleep(5000 - leader_death);
  expect(results).toStrictEqual([0, 1, 2, 3, 4, 5]);
  await w2.stop();
}

test("Immediately dying leader 0", async () => {
  await immediately_dying_leader(0);
}, 10000);

test("Immediately dying leader 50", async () => {
  await immediately_dying_leader(50);
}, 10000);

test("Immediately dying leader 100", async () => {
  await immediately_dying_leader(100);
}, 10000);

test("Immediately dying leader 200", async () => {
  await immediately_dying_leader(200);
}, 10000);

test("Immediately dying leader 300", async () => {
  await immediately_dying_leader(300);
}, 10000);

test("Immediately dying leader 500", async () => {
  await immediately_dying_leader(500);
}, 10000);

test("Immediately dying leader 1000", async () => {
  await immediately_dying_leader(1000);
}, 10000);
