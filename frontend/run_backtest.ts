import { runBacktest } from './app/utils/backtest';
// Simple fetch and write
async function fetchAndRun() {
    console.log("Fetching simulated data...");
    const res = await fetch('http://localhost:8000/stocks/simulation/1m/ES=F');
    const fullData = await res.json();
    console.log(`Fetched ${fullData.length} records`);
    
    // Only test 1 month of 1m candles for speed (~30,000 candles)
    const data = fullData.slice(-30000);
    console.log(`Running fast V5 backtest on ${data.length} 1-min candles...`);
    
    const results = await runBacktest(data, { FUTURES_MULTIPLIER: 50 });
    
    console.log("\n===== V5 ALPHA (1-MIN ES=F MONTHLY SIMULATION) =====");
    console.log(`Total Trades Executed: ${results.totalTrades}`);
    console.log(`Win Rate Strategy: ${results.winRate.toFixed(2)}%`);
    console.log(`Institutional Profit Factor: ${results.profitFactor.toFixed(2)}`);
    console.log(`Gross Premium Capture: $${results.netProfitAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2})}`);
    console.log(`Max Expected Drawdown: ${results.mdd.toFixed(2)}%`);
    console.log(`Avg Holding Duration: ${results.averageHoldTime.toFixed(2)} mins`);
    console.log(`Alpha Gen. vs Buy & Hold: ${results.alphaVsBenchmark.toFixed(2)}%`);
    console.log("====================================================");
}
fetchAndRun();
