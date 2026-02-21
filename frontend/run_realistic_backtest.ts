import { runBacktest } from './app/utils/backtest';
import { AntiGravityStrategy } from './app/utils/strategy';
import * as fs from 'fs';

const API_BASE = 'http://localhost:8000';
const SYMBOL = 'ES=F';
const PERIOD = '1mo';

async function main() {
    console.log(`Starting ULTRA-REALISTIC Backtest for ${SYMBOL} (Last ${PERIOD} - 1H Interval)`);
    console.log("Parameters: $13,500 Margin | 1 Tick Slippage | $5.00 Commission");
    console.log("=================================================================");

    const url = `${API_BASE}/stocks/candles/${SYMBOL}?period=${PERIOD}&interval=1h`;
    const res = await fetch(url);
    const data = await res.json();
    console.log(`>> Received ${data.length} 1H candles.`);

    // Run Backtest with New V6 Config
    const config = {
        SLIPPAGE_TICKS: 1,      // 1 tick slippage entry/exit
        TICK_VALUE: 12.50,      // ES tick value
        TICK_SIZE: 0.25,        // ES point size
        TRANSACTION_FEE: 5.0,   // $5 per contract
        INITIAL_MARGIN: 13500,  // CME Maintenance
        FUTURES_MULTIPLIER: 50  // $50 per pt
    };

    const results = await runBacktest(data, config);

    console.log("\n--- NET PNL (1 CONTRACT STATIC) ---");
    console.log(`Executed Trades: ${results.totalTrades}`);
    console.log(`Raw Win Rate: ${results.winRate.toFixed(1)}%`);
    console.log(`Net Profit (After Fees/Slippage): $${results.netProfitAmount.toFixed(2)}`);
    console.log(`Total Costs (Fees + Drag): $${results.totalCosts.toFixed(2)}`);
    console.log(`Max Expected Drawdown: ${results.mdd.toFixed(1)}%`);
    console.log(`Profit Factor: ${results.profitFactor.toFixed(2)}`);
}

main().catch(console.error);
