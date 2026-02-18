# Stock Monitoring & Portfolio Suite

삼성전자(Samsung) 및 SK하이닉스(SK Hynix)를 포함한 주요 종목들에 대한 시장 데이터를 데이터베이스화하고, 실시간 모니터링 및 기술적 통계를 제공하는 시스템입니다.

## 주요 기능
- **실시간 시세 스트리밍**: WebSockets를 이용한 실시간 가격 및 변동률 업데이트.
- **데이터베이스화**: 일일 주가 데이터(OHLC, 거래량, ATR 등)를 SQLite에 기록 및 관리.
- **기술적 분석 지표**: ATR(14) 등의 변동성 지표 계산 및 시각화.
- **커스터마이징**: 사용자 가변 Watchlist 및 트레이딩 저널 기능 제공.

## 기술 스택
- **Backend**: Python, FastAPI, SQLModel, yfinance
- **Frontend**: Next.js, TypeScript, TailwindCSS, TradingView Widgets

## 실행 방법

### 백엔드 (Backend)
1. Python 가상환경 활성화 및 패키지 설치
2. 서버 실행:
   ```bash
   uvicorn backend.main:app --reload
   ```

### 프런트엔드 (Frontend)
1. 패키지 설치 (npm install)
2. 개발 서버 실행:
   ```bash
   npm run dev
   ```

---
*본 프로젝트는 시장 데이터를 체계적으로 관리하고 투자 결정을 돕기 위한 통계 시스템 구축을 목적으로 합니다.*
