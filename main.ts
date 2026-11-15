// Breakout-momentum cbBTC bot, long only.
//
// The dev window is a slow grind down (-4% with an 8% range) in which
// dip-buying and EMA-cross riders all lose money: every baseline is
// negative on it, and so was the first version of this bot (-58.87 USDC
// on 65 whipsaw trades). What works here is the opposite posture: stay
// in cash through the grind and buy only a confirmed up-move, then get
// out fast. So this bot trades one setup only:
//   entry: the 24-bar return is at least +1.5% and the close is above
//     its 48-bar mean (a breakout, not a bounce);
//   exit: +1.0% take-profit, -1.0% stop, a fast/slow EMA cross back
//     down, or 240 bars held.
// A full round trip costs about 26 bps in fees, slippage and impact, so
// the 1% target clears costs roughly 4x over. Size is 100% of equity:
// with only a handful of high-conviction entries a year, half-size just
// halves the edge. A 5-bar cooldown after each exit stops it chasing
// the same leg twice.

import { BPS, runBars, type Bar, type BarsState, type BuyInput, type SellInput } from './vendor/makefun-bars.ts';

const SYMBOL = 'CBBTC';
const FAST_SPAN = 6;
const SLOW_SPAN = 24;
const MEAN_SPAN = 48;
const LOOKBACK = 24;
const BREAKOUT_BPS = 150; // +1.5% over 24 bars
const TAKE_BPS = 100; // +1.0%
const STOP_BPS = 100; // -1.0%
const SIZE_BPS = 10000; // 100% of equity per entry
const MAX_HOLD_BARS = 240;
const COOLDOWN_BARS = 5;
const MAX_SLIPPAGE_BPS = 100;

interface Ema {
  span: number;
  warm: number[];
  value: number | null;
}

const closes: number[] = [];
const fast: Ema = { span: FAST_SPAN, warm: [], value: null };
const slow: Ema = { span: SLOW_SPAN, warm: [], value: null };
let prevGap: number | null = null;
let heldBars = 0;
let cooldown = 0;

function stepEma(e: Ema, close: number): void {
  if (e.value !== null) {
    e.value += (2 / (e.span + 1)) * (close - e.value);
    return;
  }
  e.warm.push(close);
  if (e.warm.length === e.span) {
    e.value = e.warm.reduce((a, x) => a + x, 0) / e.span;
  }
}

await runBars({
  onBatch(state: BarsState, batch) {
    const bar: Bar | undefined = batch.bars.find((b) => b.symbol === SYMBOL);
    if (bar === undefined) return [];
    if (cooldown > 0) cooldown -= 1;

    const close = Number(bar.c);
    closes.push(close);
    if (closes.length > MEAN_SPAN) closes.shift();
    stepEma(fast, close);
    stepEma(slow, close);
    const gap = fast.value !== null && slow.value !== null ? fast.value - slow.value : null;

    if (state.warmingUp) {
      prevGap = gap;
      return [];
    }

    const held = state.positions.get(SYMBOL);
    const orders: (SellInput | BuyInput)[] = [];

    if (held !== undefined) {
      heldBars += 1;
      const value = state.value(SYMBOL, held.qty);
      const take = value * BPS >= held.cost * (BPS + BigInt(TAKE_BPS));
      const stop = value * BPS <= held.cost * (BPS - BigInt(STOP_BPS));
      const crossDown = prevGap !== null && gap !== null && prevGap >= 0 && gap < 0;
      const stale = heldBars >= MAX_HOLD_BARS;
      if (take || stop || crossDown || stale) {
        orders.push({ side: 'sell', symbol: SYMBOL, qty: held.qty, max_slippage_bps: MAX_SLIPPAGE_BPS });
        cooldown = COOLDOWN_BARS;
      }
      prevGap = gap;
      return orders;
    }

    // Flat: look for a confirmed breakout.
    heldBars = 0;
    if (cooldown > 0 || closes.length < MEAN_SPAN || fast.value === null || slow.value === null) {
      prevGap = gap;
      return [];
    }
    const mean = closes.reduce((a, x) => a + x, 0) / closes.length;
    const lookback = closes[closes.length - 1 - LOOKBACK] ?? closes[0];
    const breakout = close > mean && (close - lookback) * Number(BPS) >= lookback * BREAKOUT_BPS;
    if (breakout) {
      let slice = (state.equity * BigInt(SIZE_BPS)) / BPS;
      const byWeight = (BigInt(state.hello.caps.max_weight_bps) * state.equity) / BPS;
      if (slice > byWeight) slice = byWeight;
      if (slice > state.cash) slice = state.cash;
      if (slice >= BigInt(state.hello.fees.min_notional_quote_units)) {
        orders.push({ side: 'buy', symbol: SYMBOL, notional_quote_units: slice, max_slippage_bps: MAX_SLIPPAGE_BPS });
      }
    }
    prevGap = gap;
    return orders;
  },
});
