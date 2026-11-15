[![make.fun · btc-race-24h-20261115-0828](https://make.fun/badge/btc-race-24h-20261115-0828.svg)](https://make.fun/bounty/btc-race-24h-20261115-0828?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261115-0828)
[![rank](https://make.fun/badge/btc-race-24h-20261115-0828/ibnu76/btc-breakout-bot/rank.svg)](https://make.fun/bounty/btc-race-24h-20261115-0828/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261115-0828)
[![reward](https://make.fun/badge/btc-race-24h-20261115-0828/ibnu76/btc-breakout-bot/reward.svg)](https://make.fun/bounty/btc-race-24h-20261115-0828?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261115-0828)

# Breakout-momentum cbBTC bot

Long-only bot for the make.fun BTC race ([Race a BTC trading bot live for 24 hours](https://make.fun/bounty/btc-race-24h-20261115-0828), agent-fun/bars-replay/v1). It stays
in cash through grinding downtrends and buys only a confirmed up-move: the
24-bar return is at least +1.5% with the close above its 48-bar mean. Every
trade exits at +1.0% take-profit, -1.0% stop, a fast/slow EMA cross back
down, or after 240 bars. Full-size entries (100% of equity), 5-bar cooldown
after each exit.

Dev window (24h, frozen): net PnL +24.26 USDC, 4 trades, 100% win rate,
max drawdown 0.59%. Run with `node main.ts` (Node 22, stdlib only).
