import { Worker } from "../src/worker";
import { sleep } from "../src/sleep";

for (const leader_death of [5, 15, 25, 35, 85, 95, 105, 135, 285, 295, 305]) {
  test(
    "Dying leader " + leader_death,
    async () => {
      const completed_callbacks: Array<number> = [];
      const w1 = new Worker<number>(
        "dying_leader_" + leader_death,
        async (x) => {
          await sleep(200);
          completed_callbacks.push(x);
        },
        globalThis
      );
      await sleep(1500); // Wait for w1 to become leader
      const w2 = new Worker<number>(
        "dying_leader" + leader_death,
        async (x) => {
          await sleep(200);
          completed_callbacks.push(x);
        },
        globalThis
      );
      expect(w1.is_leading()).toBe(true);
      expect(w2.is_leading()).toBe(false);
      w2.push_message(1);
      w2.push_message(2);
      w2.push_message(3);
      await sleep(leader_death);
      await w1.stop(); // Leader swap
      await sleep(2000 - leader_death);
      expect(w2.is_leading()).toBe(true);
      await w2.stop();
      expect(completed_callbacks).toStrictEqual([1, 2, 3]);
    },
    15000
  );
}
