import { runBacktest } from './app/utils/backtest';
import { AntiGravityStrategy } from './app/utils/strategy';
import * as fs from 'fs';

const API_BASE = 'http://localhost:8000';
const SYMBOL = 'ES=F';
const PERIOD = '1mo';

// Note: yfinance might not natively support '4h', so we might get an error.
// We'll test '1d', '60m' (and assume it's 1h), '30m'. If 4h is needed, we'll see if it works or error handling catches it.
const TIMEFRAMES = [
    { label: '1 Day (1d)', interval: '1d' },
    { label: '1 Hour (1h)', interval: '1h' }, // or 60m
    { label: '30 Min (30m)', interval: '30m' }
];

async function fetchCandles(interval: string) {
    const url = `${API_BASE}/stocks/candles/${SYMBOL}?period=${PERIOD}&interval=${interval}`;
    const res = await fetch(url);
    if (!res.ok) {
        throw new Error(`Failed to fetch ${interval}: ${res.statusText}`);
    }
    return await res.json();
}

async function main() {
    console.log(`Starting Multi-Timeframe Backtest for ${SYMBOL} (${PERIOD})`);
    console.log("=====================================================");

    for (const tf of TIMEFRAMES) {
        try {
            console.log(`\nFetching data for ${tf.label}...`);
            let data = await fetchCandles(tf.interval);
            console.log(`>> Received ${data.length} candles.`);

            const results = await runBacktest(data, { FUTURES_MULTIPLIER: 50 });

            console.log(`--- RESULTS: ${tf.label} ---`);
            console.log(`Trades: ${results.totalTrades} | Win Rate: ${results.winRate.toFixed(1)}% | Profit Factor: ${results.profitFactor.toFixed(2)}`);
            console.log(`Net Profit: $${results.netProfitAmount.toFixed(2)} | Max Drawdown: ${results.mdd.toFixed(1)}%`);

        } catch (e: any) {
            console.error(`Error processing ${tf.label}:`, e.message);
        }
    }

    console.log("\nTrying to fetch 4h data (if supported by yfinance)...");
    try {
        let data4h = await fetchCandles('1h');
        // Let's resample 1h to 4h manually if we have to, but first just let's see if '1h' works.
        // Wait, if we want 4H we can just group every 4 candles.
        let data_grouped = [];
        for (let i = 0; i < data4h.length; i += 4) {
            let chunk = data4h.slice(i, i + 4);
            let merged = {
                date: chunk[0].date,
                open: chunk[0].open,
                high: Math.max(...chunk.map((c: any) => c.high)),
                low: Math.min(...chunk.map((c: any) => c.low)),
                close: chunk[chunk.length - 1].close,
                volume: chunk.reduce((sum: number, c: any) => sum + c.volume, 0)
            };
            data_grouped.push(merged);
        }
        console.log(`>> Resampled 1h to 4h: ${data_grouped.length} candles.`);
        const results4h = await runBacktest(data_grouped, { FUTURES_MULTIPLIER: 50 });
        console.log(`--- RESULTS: 4 Hour (4h) resampled ---`);
        console.log(`Trades: ${results4h.totalTrades} | Win Rate: ${results4h.winRate.toFixed(1)}% | Profit Factor: ${results4h.profitFactor.toFixed(2)}`);
        console.log(`Net Profit: $${results4h.netProfitAmount.toFixed(2)} | Max Drawdown: ${results4h.mdd.toFixed(1)}%`);
    } catch (e: any) {
        console.error("4h resampling failed:", e.message);
    }
}

main().catch(console.error);
