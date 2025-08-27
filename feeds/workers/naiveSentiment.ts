export function naiveSentimentWithNegation(text: string): number {
  const tokens = text.toLowerCase().match(/\b[\p{L}\p{N}']+\b/gu) ?? [];
  const pos = new Set([
    "good",
    "great",
    "gain",
    "improve",
    "success",
    "benefit",
    "positive",
    "growth",
  ]);
  const neg = new Set([
    "bad",
    "worse",
    "loss",
    "decline",
    "risk",
    "fail",
    "negative",
    "drop",
  ]);
  const negators = new Set(["not", "no", "never", "hardly", "scarcely"]);
  const intensifiers = new Set(["very", "extremely", "highly", "strongly"]);

  let score = 0,
    flip = false,
    boost = 1;
  for (const tok of tokens) {
    if (negators.has(tok)) {
      flip = !flip;
      continue;
    }
    if (intensifiers.has(tok)) {
      boost = 1.5;
      continue;
    }

    let delta = 0;
    if (pos.has(tok)) delta = 1;
    else if (neg.has(tok)) delta = -1;

    if (delta !== 0) {
      score += (flip ? -delta : delta) * boost;
      flip = false;
      boost = 1;
    }
  }
  return Math.max(-1, Math.min(1, Math.tanh(score / 5)));
}
