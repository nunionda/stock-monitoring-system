import yfinance as yf
import pandas as pd
import sys

try:
    ticker = yf.Ticker("ES=F")
    # Attempt to fetch 1 year of 1-minute data, which should fail or truncate
    hist = ticker.history(period="1y", interval="1m")
    print(f"Data shape for 1y, 1m: {hist.shape}")
    if not hist.empty:
        print(f"Earliest date: {hist.index[0]}")
        print(f"Latest date: {hist.index[-1]}")
    else:
        print("Empty dataset returned.")
except Exception as e:
    print(f"Error: {e}")
