import { runBacktest } from './app/utils/backtest';
import { AntiGravityStrategy } from './app/utils/strategy';

const API_BASE = 'http://localhost:8000';
const SYMBOL = 'ES=F';
const PERIOD = '1mo';

const TIMEFRAMES = [
    { label: '1 Hour (1h)', interval: '1h' },
    { label: '30 Min (30m)', interval: '30m' }
];

async function main() {
    console.log(`Starting ULTRA-REALISTIC Multi-Timeframe Backtest for ${SYMBOL} (${PERIOD})`);
    console.log("Parameters: $13,500 Margin | 1 Tick Slippage ($12.50) | $5.00 Commission");
    console.log("=======================================================================");

    const config = {
        SLIPPAGE_TICKS: 1,      // 1 tick slippage entry/exit
        TICK_VALUE: 12.50,      // ES tick value
        TICK_SIZE: 0.25,        // ES point size
        TRANSACTION_FEE: 5.0,   // $5 per contract
        INITIAL_MARGIN: 13500,  // CME Maintenance
        FUTURES_MULTIPLIER: 50  // $50 per pt
    };

    for (const tf of TIMEFRAMES) {
        try {
            const url = `${API_BASE}/stocks/candles/${SYMBOL}?period=${PERIOD}&interval=${tf.interval}`;
            const res = await fetch(url);
            const data = await res.json();

            console.log(`\n--- RESULTS: ${tf.label} ---`);
            console.log(`>> Received ${data.length} candles.`);

            const results = await runBacktest(data, config);

            console.log(`Trades: ${results.totalTrades} | Win Rate: ${results.winRate.toFixed(1)}% | Profit Factor: ${results.profitFactor.toFixed(2)}`);
            console.log(`Gross Profit (est): $${(results.netProfitAmount + results.totalCosts).toFixed(2)}`);
            console.log(`Total Costs (Fees + Slippage Drag): -$${results.totalCosts.toFixed(2)}`);
            console.log(`TRUE NET PROFIT: $${results.netProfitAmount.toFixed(2)}`);
            console.log(`Max Expected Drawdown: ${results.mdd.toFixed(1)}%`);
            if (results.totalTrades > 0) {
                console.log(`Average Cost Per Trade: $${(results.totalCosts / results.totalTrades).toFixed(2)}`);
            }
        } catch (e: any) {
            console.error(`Error processing ${tf.label}:`, e.message);
        }
    }
}

main().catch(console.error);
