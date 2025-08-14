# Production Requirements Specification: Sprint 2.6
## Feature: Advanced Historical Analysis Chart
Document Version: 2.0  
Date: August 7, 2025  
Author: Gemini AI

## 1. Introduction & Scope

### 1.1. Purpose
This document provides a detailed specification for the development and implementation of the "Historical Analysis" chart feature. It is intended for use by all project stakeholders, including developers, QA engineers, and project managers, to ensure a common understanding of the feature's requirements, behavior, and quality standards.

### 1.2. Scope
This sprint focuses exclusively on creating a high-performance, analysis-only charting tool. The scope includes:

**IN SCOPE:** UI configuration, backend-driven data management with intelligent sync logic, advanced chart navigation (infinite panning, dynamic zoom/pan), visual session shading, and foundational architecture for future indicators.

**OUT OF SCOPE:** Real-time trading from the chart, implementation of specific indicators/oscillators (architecture support only), user account settings for chart preferences.

## 2. System Architecture & Design Principles

**Modularity:** The chart component will be built as a self-contained module. Indicator and drawing tool functionalities will be designed as plug-ins to this core module to ensure future extensibility.

**Performance First:** Every design decision must prioritize performance. This includes efficient data chunking from the backend, optimized rendering on the frontend, and minimizing UI blocking operations.

**Single Source of Truth:** The backend database is the definitive source for all historical data. The frontend will never store its own version of history, though it may cache data for performance.

## 3. Detailed Functional Requirements

### 3.1. User Interface (UI)

**FR-3.1.1: Default View:**
Upon navigating to the "Historical Analysis" tab, the "Order Entry" and "Order Book - SPY" components must be hidden by default. A smooth transition (e.g., a quick fade or slide) is preferred.

**FR-3.1.2: Ticker Input:**
A dedicated, prominent text input field for the ticker symbol must be present. It should include a "Search" or "Load" button. Pressing "Enter" within the field will also trigger the load action.

### 3.2. Data Management & Synchronization

**FR-3.2.1: Data Source:**
All OHLCV (Open, High, Low, Close, Volume) data rendered on the chart must be fetched exclusively from the designated backend database via a secure API endpoint.

**FR-3.2.2: Intelligent Sync Logic:**
- **Trigger:** This logic is triggered when a user loads a ticker.
- **Step 1 - Timestamp Comparison:** The system must fetch the latest data timestamp for the requested symbol from the backend (SELECT MAX(timestamp) FROM ticker_data WHERE symbol = ?).
- **Step 2 - Market Status Check:** The system must determine the current market status based on Eastern Time (ET). This check must account for US stock market holidays and weekends.
  - **Market OPEN (Mon-Fri, 9:30 AM - 4:00 PM ET):** If the latest database timestamp is before the previous trading day's close, initiate a data download from Polygon.io.
  - **Market CLOSED (All other times):** If the latest database timestamp is before the most recent market close, initiate a data download from Polygon.io for the missing period.
- **Step 3 - API Integration:** The Polygon.io API key must be retrieved securely from the .env file on the backend. API calls must include robust error handling for timeouts, invalid keys, and rate limiting.

**FR-3.2.3: New Ticker Onboarding:**
- **Detection:** If a ticker symbol entered by the user yields no results from the database, the "New Ticker" UI must be displayed.
- **UI Components:**
  - A dropdown menu labeled "Select History:" with options: "1 Year," "5 Years," "10 Years," and "Max Available."
  - A "Download Data" button, which is disabled until a selection is made.
  - A dynamic progress bar that provides real-time feedback on the download progress (e.g., "Fetching 2018 data... 25%").
- **Process:** Upon clicking "Download," the backend initiates a batch download from Polygon.io. The UI must remain responsive, and the user should be able to cancel the operation.

### 3.3. Chart Functionality & UX

**FR-3.3.1: Default State:** The chart will load with a 1-minute candle interval by default.

**FR-3.3.2: Session Shading:**
The chart background must be shaded to clearly delineate market phases. Colors should be subtle and not interfere with chart readability.
- **Pre-Market (4:00 - 9:30 ET):** Light blue shade.
- **Regular Session (9:30 - 16:00 ET):** Default background (e.g., white/dark grey).
- **Post-Market (16:00 - 20:00 ET):** Light grey shade.

**FR-3.3.3: Infinite Panning:**
When the user pans left past the currently loaded data, a request must be sent to the backend to fetch the next "chunk" of historical data (e.g., the previous 6 months of 1-minute data). This should be triggered when the user is ~80% through the available data history to ensure a seamless experience.

**FR-3.3.4: Advanced Scrolling & Zoom:**
- **Zoom:** Standard mouse wheel scrolling over the chart will zoom in and out, centered on the cursor's position.
- **Threshold-Based Pan:** A "readability threshold" must be defined (e.g., when 1-minute candles are less than 2 pixels wide). Once the user zooms out past this threshold, the mouse wheel's function will change from zooming to panning the chart horizontally. Scrolling down pans left, scrolling up pans right.

**FR-3.3.5: Crosshair & Data Tooltip:**
- A vertical and horizontal crosshair must follow the mouse cursor's position on the chart.
- A data tooltip must be displayed, showing the O, H, L, C, and Volume values for the candle directly under the cursor. The date/time of that candle must also be clearly visible.

## 4. Non-Functional Requirements

**NFR-4.1: Performance:**
- **Initial Load:** A chart with one year of 1-minute data should render in under 2 seconds.
- **Panning:** Fetching and rendering the next chunk of data during an infinite pan should complete in under 500ms.

**NFR-4.2: Reliability:** The application must gracefully handle API failures from Polygon.io (e.g., display a "Could not retrieve data" message) without crashing.

**NFR-4.3: Security:** All API keys and sensitive configuration must remain on the backend and never be exposed to the client.

## 5. Test Cases Summary

Key test cases include:
- **TC-UI-101:** Verify default state and UI layout
- **TC-DATA-101-103:** Data synchronization during market hours and after close
- **TC-DATA-201-202:** New ticker download flow and cancellation
- **TC-NAV-101-104:** Chart navigation, panning, zooming, and crosshair functionality
- **TC-VIS-101:** Session shading verification
- **TC-ERR-101-102:** Error handling for invalid tickers and API failures

## Implementation Status

**Current State (August 14, 2025):**
- ✅ Basic chart structure implemented with ECharts
- ✅ PostgreSQL database integration with historical data storage
- ✅ Polygon API integration for real market data
- ✅ Alpaca API integration for paper trading
- ⚠️ Chart visualization issues: showing only volume bars, missing candlesticks
- ⚠️ Data timeframe compression: all 1-minute data from single day
- 🔄 Session shading and crosshair functionality pending
- 🔄 Infinite panning and advanced zoom features pending

**Next Priorities:**
1. Fix candlestick chart rendering to show both candlesticks and volume
2. Implement proper timeframe selection (1D, 1W, 1M data aggregation)
3. Add session shading for pre-market, regular, and post-market hours
4. Implement crosshair and data tooltip functionality