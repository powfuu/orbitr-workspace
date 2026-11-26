import assert from "node:assert";
import { test } from "node:test";
import { formatContext, formatPrice, isMajorLab, parseModels } from "./modelsParse.ts";

test("parses catalog, drops aliases and :free twins", () => {
  const json = JSON.stringify({
    data: [
      { id: "anthropic/claude-opus-5.5", name: "Anthropic: Claude Opus 5.5", created: 1795000000, context_length: 1000000, description: "Most capable. Second sentence.", pricing: { prompt: "0.000015", completion: "0.000075" } },
      { id: "~anthropic/claude-opus-latest", name: "alias" },
      { id: "deepseek/deepseek-v4:free", name: "free twin" },
    ],
  });
  const m = parseModels(json);
  assert.equal(m.length, 1);
  assert.equal(m[0]!.name, "Claude Opus 5.5");
  assert.equal(m[0]!.lab, "Anthropic");
  assert.equal(m[0]!.priceIn, 15);
  assert.equal(m[0]!.blurb, "Most capable.");
  assert.ok(isMajorLab("openai/gpt-6") && !isMajorLab("upstage/solar"));
  assert.equal(formatContext(1_048_576), "1M");
  assert.equal(formatPrice(0.075), "$0.07");
});
