import assert from "node:assert";
import { test } from "node:test";
import { evaluateAlerts, type AlertMemory } from "./limitAlerts.ts";

const L = (percent: number, resets = "12:09am (Europe/Madrid)") => [{ label: "Current session", percent, resets }];

test("each threshold fires once per window; reset is announced", () => {
  let mem: AlertMemory = {};
  const step = (p: number, r?: string) => {
    const out = evaluateAlerts(L(p, r), mem, [80, 95]);
    mem = out.memory;
    return out.alerts.map((a) => a.level);
  };
  assert.deepEqual(step(50), []);
  assert.deepEqual(step(82), ["warn"]);
  assert.deepEqual(step(85), [], "same window, same threshold: silent");
  assert.deepEqual(step(97), ["critical"]);
  assert.deepEqual(step(100), ["full"]);
  assert.deepEqual(step(100), []);
  assert.deepEqual(step(5, "5:09am (Europe/Madrid)"), ["reset"]);
  assert.deepEqual(step(81, "5:09am (Europe/Madrid)"), ["warn"], "new window warns again");
});

test("jumping straight past several thresholds raises only the highest", () => {
  const { alerts } = evaluateAlerts(L(96), {}, [80, 95]);
  assert.deepEqual(alerts.map((a) => a.level), ["critical"]);
});
