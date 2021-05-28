import { Worker } from "../src/worker";
import { sleep } from "../src/sleep";

for (const leader_death of [
  5,
  15,
  25,
  35,
  45,
  55,
  400,
  1000,
  1005,
  1015,
  1025,
  1035,
  1045,
  1055,
  1200,
  1800,
  2500,
]) {
  test(
    "Dying leader " + leader_death,
    async () => {
      const completed_callbacks: Array<number> = [];
      const w1 = new Worker<number>(
        "dying_leader_" + leader_death,
        async (x) => {
          await sleep(1000);
          completed_callbacks.push(x);
        }
      );
      await sleep(1500); // Wait for w1 to become leader
      const w2 = new Worker<number>(
        "dying_leader" + leader_death,
        async (x) => {
          await sleep(1000);
          completed_callbacks.push(x);
        }
      );
      w2.push_message(1);
      w2.push_message(2);
      w2.push_message(3);
      await sleep(leader_death);
      await w1.stop(); // Leader swap
      await sleep(4500 - leader_death);
      await w2.stop();
      console.log(completed_callbacks);
      expect(completed_callbacks).toStrictEqual([1, 2, 3]);
    },
    15000
  );
}
