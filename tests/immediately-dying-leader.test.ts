import { Worker } from "../src/worker";
import { sleep } from "../src/sleep";

for (let leader_death = 0; leader_death < 1000; leader_death += 100) {
  test(
    "Immediately dying leader " + leader_death,
    async () => {
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
      await sleep(2000);
      await w2.stop();
      expect(results).toStrictEqual([0, 1, 2, 3, 4, 5]);
    },
    10000
  );
}
