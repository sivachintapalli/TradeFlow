import { db } from "./db";
import { historicalData, marketData, downloadJobs } from "@shared/schema";
import { eq, and, desc, sql } from "drizzle-orm";

export interface PolygonCandle {
  c: number; // close
  h: number; // high
  l: number; // low
  o: number; // open
  t: number; // timestamp
  v: number; // volume
}

export interface PolygonResponse {
  ticker: string;
  status: string;
  results: PolygonCandle[];
  resultsCount: number;
  count: number;
  next_url?: string;
}

export interface PolygonQuote {
  symbol: string;
  last: {
    price: number;
    size: number;
    exchange: number;
    timeframe: string;
    timestamp: number;
  };
  market_status: string;
  name: string;
}

export class PolygonService {
  private apiKey: string;
  private baseUrl = 'https://api.polygon.io';

  constructor() {
    if (!process.env.POLYGON_API_KEY) {
      throw new Error('POLYGON_API_KEY environment variable is required');
    }
    this.apiKey = process.env.POLYGON_API_KEY;
  }

  /**
   * Check if market is currently open (Mon-Fri, 9:30 AM - 4:00 PM ET)
   */
  isMarketOpen(): boolean {
    const now = new Date();
    const et = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}));
    const day = et.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const hour = et.getHours();
    const minute = et.getMinutes();
    
    // Weekend check
    if (day === 0 || day === 6) return false;
    
    // Time check: 9:30 AM - 4:00 PM ET
    const currentMinutes = hour * 60 + minute;
    const marketOpen = 9 * 60 + 30; // 9:30 AM
    const marketClose = 16 * 60; // 4:00 PM
    
    return currentMinutes >= marketOpen && currentMinutes <= marketClose;
  }

  /**
   * Get live market data (15-min delayed) from Polygon API for real-time display
   */
  async getLiveMarketData(symbol: string): Promise<any> {
    try {
      // First, get the 5-day range to find the current close and previous close
      const fiveDaysAgo = new Date();
      fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
      const today = new Date();
      
      const rangeUrl = `${this.baseUrl}/v2/aggs/ticker/${symbol}/range/1/day/${fiveDaysAgo.toISOString().split('T')[0]}/${today.toISOString().split('T')[0]}?adjusted=true&sort=desc&apikey=${this.apiKey}`;
      const rangeResponse = await fetch(rangeUrl);
      
      if (!rangeResponse.ok) {
        throw new Error(`Polygon API error: ${rangeResponse.status} ${rangeResponse.statusText}`);
      }
      
      const rangeData = await rangeResponse.json();
      console.log(`📊 [API RESPONSE] Status: ${rangeData.status}, Results count: ${rangeData.results?.length || 0}`);
      
      if ((rangeData.status === 'OK' || rangeData.status === 'DELAYED') && rangeData.results && rangeData.results.length >= 1) {
        const currentTradingDay = rangeData.results[0]; // Most recent trading day
        const currentPrice = currentTradingDay.c;
        const volume = currentTradingDay.v;
        
        // Get previous trading day's close for change calculation
        let previousClose = currentTradingDay.o; // fallback to today's open
        
        if (rangeData.results.length >= 2) {
          const previousTradingDay = rangeData.results[1];
          previousClose = previousTradingDay.c;
          const currentDate = new Date(currentTradingDay.t).toLocaleDateString();
          const prevDate = new Date(previousTradingDay.t).toLocaleDateString();
          console.log(`📊 [TRADING DAYS] Current: ${currentDate} ($${currentPrice.toFixed(2)}), Previous: ${prevDate} ($${previousClose.toFixed(2)})`);
        } else {
          console.log(`📊 [SINGLE DAY] Only one day of data available, using open as previous close`);
        }
        
        const change = currentPrice - previousClose;
        const changePercent = ((change / previousClose) * 100);
        
        console.log(`Fresh Polygon data for ${symbol}: $${currentPrice.toFixed(2)} (${change >= 0 ? '+' : ''}${change.toFixed(2)}, ${changePercent.toFixed(2)}%)`);
        console.log(`📊 [CALC] Previous: $${previousClose.toFixed(2)}, Current: $${currentPrice.toFixed(2)}, Change: ${change >= 0 ? '+' : ''}$${change.toFixed(2)}`);
        
        return {
          id: `live-${symbol}`,
          symbol: symbol.toUpperCase(),
          price: currentPrice.toFixed(2),
          change: change.toFixed(2),
          changePercent: changePercent.toFixed(2),
          volume: volume,
          lastUpdate: new Date()
        };
      }
      
      throw new Error('No market data available from Polygon');
    } catch (error) {
      console.error(`Error fetching live market data for ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Get real-time quote for a symbol (legacy method)
   */
  async getRealTimeQuote(symbol: string): Promise<{ price: number; change: number; changePercent: number } | null> {
    try {
      const url = `${this.baseUrl}/v1/last/stocks/${symbol}?apikey=${this.apiKey}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        console.log(`Failed to fetch real-time quote for ${symbol}: ${response.status}`);
        return null;
      }
      
      const data = await response.json();
      
      if (data.status === 'OK' && data.results) {
        const currentPrice = data.results.P || data.results.price;
        
        // Get previous close to calculate change
        const prevCloseUrl = `${this.baseUrl}/v1/open-close/${symbol}/${this.getPreviousBusinessDay()}?adjusted=true&apikey=${this.apiKey}`;
        const prevCloseResponse = await fetch(prevCloseUrl);
        
        let change = 0;
        let changePercent = 0;
        
        if (prevCloseResponse.ok) {
          const prevCloseData = await prevCloseResponse.json();
          if (prevCloseData.close) {
            change = currentPrice - prevCloseData.close;
            changePercent = (change / prevCloseData.close) * 100;
          }
        }
        
        return {
          price: currentPrice,
          change: parseFloat(change.toFixed(2)),
          changePercent: parseFloat(changePercent.toFixed(2))
        };
      }
      
      return null;
    } catch (error) {
      console.error(`Error fetching real-time quote for ${symbol}:`, error);
      return null;
    }
  }

  /**
   * Get previous business day in YYYY-MM-DD format
   */
  private getPreviousBusinessDay(): string {
    const date = new Date();
    date.setDate(date.getDate() - 1);
    
    // If it's Sunday (0) or Saturday (6), go back further
    while (date.getDay() === 0 || date.getDay() === 6) {
      date.setDate(date.getDate() - 1);
    }
    
    return date.toISOString().split('T')[0];
  }

  /**
   * Get the most recent trading day close time
   */
  getMostRecentMarketClose(): Date {
    // Use actual current date
    const now = new Date();
    const et = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}));
    const day = et.getDay();
    const hour = et.getHours();
    
    let targetDate = new Date(et);
    
    // If it's after market close today (after 4 PM ET), use today
    // If it's before market close or during market hours, use previous business day
    if (day >= 1 && day <= 5 && hour >= 16) {
      // After market close on weekday - use today
    } else {
      // Before market close or weekend - use previous business day
      targetDate.setDate(targetDate.getDate() - 1);
    }
    
    // Adjust for weekends
    while (targetDate.getDay() === 0 || targetDate.getDay() === 6) {
      targetDate.setDate(targetDate.getDate() - 1);
    }
    
    // Set to 4:00 PM ET
    targetDate.setHours(16, 0, 0, 0);
    console.log(`Most recent market close calculated as: ${targetDate.toISOString()}`);
    return targetDate;
  }

  /**
   * Get the latest data timestamp for a symbol from our database
   */
  async getLatestDataTimestamp(symbol: string): Promise<Date | null> {
    try {
      const [result] = await db
        .select({ timestamp: historicalData.timestamp })
        .from(historicalData)
        .where(eq(historicalData.symbol, symbol))
        .orderBy(desc(historicalData.timestamp))
        .limit(1);
      
      return result?.timestamp || null;
    } catch (error) {
      console.error('Error fetching latest timestamp:', error);
      return null;
    }
  }

  /**
   * Check if we need to sync data for a symbol
   */
  async needsDataSync(symbol: string): Promise<boolean> {
    const latestTimestamp = await this.getLatestDataTimestamp(symbol);
    const mostRecentClose = this.getMostRecentMarketClose();
    
    // If no data exists, we need sync
    if (!latestTimestamp) return true;
    
    // If our latest data is before the most recent market close, we need sync
    return latestTimestamp < mostRecentClose;
  }

  /**
   * Sync recent ticker data (typically for existing tickers)
   */
  async syncTickerData(symbol: string): Promise<void> {
    const latestTimestamp = await this.getLatestDataTimestamp(symbol);
    const mostRecentClose = this.getMostRecentMarketClose();
    
    if (!latestTimestamp) {
      throw new Error('No existing data found. Use downloadHistoricalData instead.');
    }
    
    // Fetch data from day after latest timestamp to most recent close
    const fromDate = new Date(latestTimestamp);
    fromDate.setDate(fromDate.getDate() + 1);
    
    const from = fromDate.toISOString().split('T')[0];
    const to = mostRecentClose.toISOString().split('T')[0];
    
    if (fromDate >= mostRecentClose) {
      console.log('Data is already up to date');
      return;
    }
    
    console.log(`Syncing ${symbol} from ${from} to ${to}`);
    const data = await this.fetchBars(symbol, 'minute', 1, from, to);
    if (data.length > 0) {
      await this.saveBarsToDatabase(symbol, data, '1M');
      console.log(`Successfully synced ${data.length} data points for ${symbol}`);
    } else {
      console.log(`No new data available for ${symbol}`);
    }
  }

  /**
   * Save bars to database with proper error handling
   */
  private async saveBarsToDatabase(symbol: string, candles: PolygonCandle[], timeframe: string): Promise<void> {
    if (candles.length === 0) return;
    
    const formattedData = candles.map(candle => 
      this.formatCandleForDB(candle, symbol, timeframe)
    );
    
    // Insert data in chunks to avoid memory issues
    const chunkSize = 1000;
    for (let i = 0; i < formattedData.length; i += chunkSize) {
      const chunk = formattedData.slice(i, i + chunkSize);
      await db.insert(historicalData).values(chunk).onConflictDoNothing();
    }
  }

  /**
   * Fetch aggregated bars from Polygon API
   */
  async fetchBars(
    symbol: string,
    timespan: 'minute' | 'hour' | 'day',
    multiplier: number = 1,
    from: string,
    to: string,
    limit: number = 50000
  ): Promise<PolygonCandle[]> {
    let allResults: PolygonCandle[] = [];
    let nextUrl: string | null = null;
    
    const initialUrl = `${this.baseUrl}/v2/aggs/ticker/${symbol}/range/${multiplier}/${timespan}/${from}/${to}?adjusted=true&sort=asc&limit=${limit}&apikey=${this.apiKey}`;
    
    try {
      let currentUrl = initialUrl;
      let requestCount = 0;
      const maxRequests = 50; // Safety limit for unlimited plan
      
      do {
        requestCount++;
        console.log(`📡 [API CALL ${requestCount}] Fetching ${symbol} ${timespan} data from Polygon...`);
        
        const response = await fetch(currentUrl);
        
        if (!response.ok) {
          throw new Error(`Polygon API error: ${response.status} ${response.statusText}`);
        }
        
        const data: PolygonResponse = await response.json();
        
        // Handle different API statuses
        if (data.status === 'ERROR') {
          throw new Error(`Polygon API error: ${data.error || 'Unknown error'}`);
        }
        
        if (data.status === 'DELAYED') {
          console.log(`⏳ [DELAYED] Delayed data returned for ${symbol}, continuing with available data`);
        }
        
        if (data.results && data.results.length > 0) {
          allResults.push(...data.results);
          console.log(`📈 [BATCH ${requestCount}] Retrieved ${data.results.length} records (Total: ${allResults.length})`);
        } else {
          console.log(`📭 [EMPTY] No data in batch ${requestCount} for ${symbol}`);
        }
        
        // Check for pagination with unlimited plan
        nextUrl = data.next_url || null;
        if (nextUrl) {
          currentUrl = `${nextUrl}&apikey=${this.apiKey}`;
          console.log(`🔄 [PAGINATION] More data available, fetching next batch...`);
          
          // Small delay to be respectful to API
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
      } while (nextUrl && requestCount < maxRequests);
      
      console.log(`✅ [COMPLETE] Total records retrieved for ${symbol} ${timespan}: ${allResults.length}`);
      return allResults;
      
    } catch (error) {
      console.error(`❌ [ERROR] Failed to fetch bars for ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Convert Polygon candle to our database format
   */
  private formatCandleForDB(candle: PolygonCandle, symbol: string, timeframe: string) {
    return {
      symbol,
      timestamp: new Date(candle.t),
      open: candle.o.toFixed(2),
      high: candle.h.toFixed(2),
      low: candle.l.toFixed(2),
      close: candle.c.toFixed(2),
      volume: candle.v,
      timeframe,
    };
  }



  /**
   * Update current market data for a symbol with live data when market is open
   */
  async updateMarketData(symbol: string): Promise<void> {
    try {
      let currentPrice: number;
      let previousClose: number;
      let volume: number = 0;
      let isLive = false;

      if (this.isMarketOpen()) {
        // Market is open - try to get live quote from Polygon
        try {
          const quote = await this.fetchLiveQuote(symbol);
          if (quote && quote.last && quote.last.price) {
            currentPrice = quote.last.price;
            volume = quote.last.size || 0;
            isLive = true;
            
            // Get previous close for change calculation
            const [prevData] = await db
              .select()
              .from(historicalData)
              .where(and(
                eq(historicalData.symbol, symbol),
                eq(historicalData.timeframe, '1D')
              ))
              .orderBy(desc(historicalData.timestamp))
              .limit(1);
            
            previousClose = prevData ? parseFloat(prevData.close.toString()) : currentPrice;
          } else {
            throw new Error('No live quote available');
          }
        } catch (error) {
          console.warn(`Live quote unavailable for ${symbol}, using latest historical data`);
          // Fallback to latest historical data
          const [latestData] = await db
            .select()
            .from(historicalData)
            .where(eq(historicalData.symbol, symbol))
            .orderBy(desc(historicalData.timestamp))
            .limit(1);
          
          if (!latestData) return;
          
          currentPrice = parseFloat(latestData.close.toString());
          previousClose = parseFloat(latestData.open.toString());
          volume = latestData.volume;
        }
      } else {
        // Market is closed - use most recent close
        const [latestData] = await db
          .select()
          .from(historicalData)
          .where(and(
            eq(historicalData.symbol, symbol),
            eq(historicalData.timeframe, '1D')
          ))
          .orderBy(desc(historicalData.timestamp))
          .limit(1);
        
        if (!latestData) return;
        
        currentPrice = parseFloat(latestData.close.toString());
        volume = latestData.volume;
        
        // Get previous day's close for change calculation
        const prevData = await db
          .select()
          .from(historicalData)
          .where(and(
            eq(historicalData.symbol, symbol),
            eq(historicalData.timeframe, '1D')
          ))
          .orderBy(desc(historicalData.timestamp))
          .limit(2);
        
        previousClose = prevData && prevData.length > 1 ? parseFloat(prevData[1].close.toString()) : parseFloat(latestData.open.toString());
      }

      // Calculate change and change percentage
      const change = currentPrice - previousClose;
      const changePercent = previousClose > 0 ? (change / previousClose) * 100 : 0;

      // Update or insert market data with calculated values
      await db.insert(marketData).values({
        symbol,
        price: currentPrice.toFixed(2),
        change: change.toFixed(2),
        changePercent: changePercent.toFixed(2),
        volume,
      }).onConflictDoUpdate({
        target: marketData.symbol,
        set: {
          price: currentPrice.toFixed(2),
          change: change.toFixed(2),
          changePercent: changePercent.toFixed(2),
          volume,
          lastUpdate: new Date()
        }
      });

      console.log(`Updated ${symbol}: $${currentPrice.toFixed(2)} (${change >= 0 ? '+' : ''}${change.toFixed(2)}, ${changePercent.toFixed(2)}%) ${isLive ? '[LIVE]' : '[CLOSE]'}`);

    } catch (error) {
      console.error(`Error updating market data for ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Fetch live quote from Polygon API
   */
  async fetchLiveQuote(symbol: string): Promise<PolygonQuote | null> {
    const url = `${this.baseUrl}/v2/last/trade/${symbol}?apikey=${this.apiKey}`;
    
    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Polygon quote API error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.status === 'OK' && data.results) {
        return {
          symbol,
          last: {
            price: data.results.p,
            size: data.results.s,
            exchange: data.results.x,
            timeframe: 'REAL-TIME',
            timestamp: data.results.t
          },
          market_status: 'open',
          name: symbol
        };
      }
      
      return null;
    } catch (error) {
      console.error(`Error fetching live quote for ${symbol}:`, error);
      return null;
    }
  }
  /**
   * Enhanced download historical data with timeframe support and market-aware date calculations
   */
  async downloadHistoricalData(
    symbol: string, 
    period: string, 
    progressCallback?: (progress: number, year?: number) => void,
    timeframe: string = '1M'
  ): Promise<void> {
    console.log(`\n🚀 [DOWNLOAD START] Initiating download for ${symbol}`);
    console.log(`📊 Parameters: Period=${period}, Timeframe=${timeframe}`);
    
    const isMarketOpen = this.isMarketOpen();
    const endDate = isMarketOpen ? this.getMostRecentMarketClose() : new Date();
    
    // Calculate start date based on period
    const startDate = this.calculateStartDate(endDate, period);
    
    console.log(`📅 Date Range: ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`);
    console.log(`🕰️ Market Status: ${isMarketOpen ? 'OPEN' : 'CLOSED'}`);
    
    // Convert timeframe to Polygon API parameters
    const { timespan, multiplier } = this.parseTimeframe(timeframe);
    
    // Display user-friendly timeframe (1M -> 1m for minute)
    const displayTimeframe = timeframe === '1M' ? '1m' : timeframe;
    console.log(`Downloading ${period} of ${displayTimeframe} data for ${symbol} from ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`);
    
    // Create or get existing download job
    const { jobId, isExisting } = await this.createDownloadJob(symbol, timeframe, period, startDate, endDate);
    
    if (isExisting) {
      console.log(`📋 [EXISTING JOB] Found existing download job for ${symbol} ${timeframe} ${period}, monitoring progress`);
      return;
    }
    
    const years = this.getYearRange(startDate, endDate);
    // For minute data with unlimited plan, download month by month for better coverage
    if (timeframe === '1M' && (endDate.getTime() - startDate.getTime()) > 90 * 24 * 60 * 60 * 1000) {
      console.log(`📅 [MONTHLY STRATEGY] Large minute data request - using monthly chunks for unlimited plan`);
      
      const months = [];
      let current = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
      const end = new Date(endDate.getFullYear(), endDate.getMonth() + 1, 0);
      
      while (current <= end) {
        months.push(new Date(current));
        current.setMonth(current.getMonth() + 1);
      }
      
      console.log(`📆 [MONTHLY RANGE] Processing ${months.length} months for comprehensive coverage`);
      
      let processedMonths = 0;
      let totalRecords = 0;
      
      for (const monthStart of months) {
        const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);
        const actualEnd = new Date(Math.min(monthEnd.getTime(), endDate.getTime()));
        
        if (progressCallback) {
          const progress = (processedMonths / months.length) * 100;
          const monthName = monthStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
          progressCallback(progress, monthName);
        }
        
        try {
          const from = monthStart.toISOString().split('T')[0];
          const to = actualEnd.toISOString().split('T')[0];
          
          console.log(`📅 [MONTHLY FETCH] ${monthStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}: ${from} to ${to}`);
          const data = await this.fetchBars(symbol, timespan, multiplier, from, to);
          
          if (data.length > 0) {
            console.log(`💾 [MONTHLY SAVE] Saving ${data.length} data points for ${monthStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`);
            await this.saveIntelligentData(symbol, data, timeframe);
            totalRecords += data.length;
            console.log(`✅ [MONTHLY COMPLETE] Month saved - running total: ${totalRecords} records`);
          } else {
            console.log(`⚠️ [NO MONTHLY DATA] No data for ${monthStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`);
          }
        } catch (error: any) {
          console.error(`Failed to download month ${monthStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}:`, error);
        }
        
        processedMonths++;
        
        // Small delay between months to be respectful
        if (processedMonths < months.length) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }
      
      console.log(`🎉 [MONTHLY COMPLETE] Total records downloaded: ${totalRecords} across ${months.length} months`);
      
    } else {
      // Original yearly strategy for smaller requests or non-minute data
      console.log(`📆 [YEAR RANGE] Processing years: ${years.join(', ')} (${years.length} total)`);
      
      let processedYears = 0;
      
      for (const year of years) {
        const yearStart = new Date(Math.max(startDate.getTime(), new Date(year, 0, 1).getTime()));
        const yearEnd = new Date(Math.min(endDate.getTime(), new Date(year, 11, 31).getTime()));
        
        if (progressCallback) {
          const progress = (processedYears / years.length) * 100;
          progressCallback(progress, year);
        }
        
        try {
          const from = yearStart.toISOString().split('T')[0];
          const to = yearEnd.toISOString().split('T')[0];
          
          console.log(`📅 [FETCH] Requesting ${symbol} ${timeframe} data for ${year}: ${from} to ${to}`);
          const data = await this.fetchBars(symbol, timespan, multiplier, from, to);
          
          if (data.length > 0) {
            console.log(`💾 [SAVE] Saving ${data.length} data points for ${symbol} ${timeframe} (${year})`);
            await this.saveIntelligentData(symbol, data, timeframe);
            console.log(`✅ [COMPLETE] Successfully saved ${data.length} ${timeframe} data points for ${symbol} (${year})`);
            
            // Log data coverage details
            const firstRecord = new Date(data[0].t);
            const lastRecord = new Date(data[data.length - 1].t);
            console.log(`📊 [COVERAGE] Data spans from ${firstRecord.toISOString().split('T')[0]} to ${lastRecord.toISOString().split('T')[0]}`);
          } else {
            console.log(`⚠️ [NO DATA] No data returned for ${symbol} ${timeframe} (${year})`);
          }
        } catch (error: any) {
          console.error(`Failed to download ${year} data for ${symbol}:`, error);
        }
        
        processedYears++;
      }
    }
    
    if (progressCallback) {
      progressCallback(100);
    }
    
    // Mark job as completed
    try {
      await db.update(downloadJobs)
        .set({ 
          status: 'completed',
          progressPercentage: "100",
          updatedAt: new Date()
        })
        .where(eq(downloadJobs.id, jobId));
    } catch (error: any) {
      console.warn('Error updating download job status:', error.message);
    }
  }

  /**
   * Intelligent data saving - only insert missing data based on timestamp+timeframe key
   */
  private async saveIntelligentData(symbol: string, candles: PolygonCandle[], timeframe: string): Promise<void> {
    if (candles.length === 0) {
      console.log(`📭 [SAVE] No candles to save for ${symbol} ${timeframe}`);
      return;
    }
    
    console.log(`🔍 [SAVE] Processing ${candles.length} candles for ${symbol} ${timeframe}`);
    
    // Get existing timestamps for this symbol and timeframe
    const existingData = await db
      .select({ timestamp: historicalData.timestamp })
      .from(historicalData)
      .where(and(
        eq(historicalData.symbol, symbol),
        eq(historicalData.timeframe, timeframe)
      ));
    
    const existingTimestamps = new Set(
      existingData.map(row => new Date(row.timestamp).getTime())
    );
    
    // Filter out existing data points
    const newCandles = candles.filter(candle => {
      const timestamp = new Date(candle.t).getTime();
      return !existingTimestamps.has(timestamp);
    });
    
    if (newCandles.length === 0) {
      console.log(`No new data to insert for ${symbol} ${timeframe}`);
      return;
    }
    
    console.log(`Inserting ${newCandles.length} new data points for ${symbol} ${timeframe}`);
    
    const formattedData = newCandles.map(candle => 
      this.formatCandleForDB(candle, symbol, timeframe)
    );
    
    // Insert data in chunks to avoid memory issues
    const chunkSize = 1000;
    for (let i = 0; i < formattedData.length; i += chunkSize) {
      const chunk = formattedData.slice(i, i + chunkSize);
      await db.insert(historicalData).values(chunk).onConflictDoNothing();
    }
  }

  /**
   * Parse timeframe string to Polygon API parameters
   */
  private parseTimeframe(timeframe: string): { timespan: 'minute' | 'hour' | 'day', multiplier: number } {
    const timeframeMap: Record<string, { timespan: 'minute' | 'hour' | 'day', multiplier: number }> = {
      '1M': { timespan: 'minute', multiplier: 1 },
      '5M': { timespan: 'minute', multiplier: 5 },
      '15M': { timespan: 'minute', multiplier: 15 },
      '30M': { timespan: 'minute', multiplier: 30 },
      '1H': { timespan: 'hour', multiplier: 1 },
      '1D': { timespan: 'day', multiplier: 1 }
    };
    
    return timeframeMap[timeframe] || { timespan: 'minute', multiplier: 1 };
  }

  /**
   * Calculate start date based on period
   */
  private calculateStartDate(endDate: Date, period: string): Date {
    const startDate = new Date(endDate);
    
    switch (period) {
      case '1M':
        startDate.setMonth(endDate.getMonth() - 1);
        break;
      case '3M':
        startDate.setMonth(endDate.getMonth() - 3);
        break;
      case '6M':
        startDate.setMonth(endDate.getMonth() - 6);
        break;
      case '1Y':
        startDate.setFullYear(endDate.getFullYear() - 1);
        break;
      case '2Y':
        startDate.setFullYear(endDate.getFullYear() - 2);
        break;
      case '5Y':
        startDate.setFullYear(endDate.getFullYear() - 5);
        break;
      case '10Y':
        startDate.setFullYear(endDate.getFullYear() - 10);
        break;
      case 'MAX':
        startDate.setFullYear(2010); // Go back to 2010 for max data
        break;
      default:
        startDate.setFullYear(endDate.getFullYear() - 1);
    }
    
    return startDate;
  }

  /**
   * Get array of years in date range
   */
  private getYearRange(startDate: Date, endDate: Date): number[] {
    const years: number[] = [];
    const currentYear = startDate.getFullYear();
    const endYear = endDate.getFullYear();
    
    for (let year = currentYear; year <= endYear; year++) {
      years.push(year);
    }
    
    return years;
  }

  /**
   * Get download progress based on active downloads and database records
   */
  async getDownloadProgress(symbol: string, timeframe?: string, period?: string): Promise<{ percentage: number; status: string; completed?: boolean; error?: string; year?: number }> {
    try {
      // Check for active download jobs
      let activeJobQuery = db.select().from(downloadJobs)
        .where(and(
          eq(downloadJobs.symbol, symbol.toUpperCase()),
          eq(downloadJobs.status, 'in_progress')
        ))
        .orderBy(desc(downloadJobs.createdAt))
        .limit(1);

      // Filter by timeframe and period if provided
      if (timeframe && period) {
        activeJobQuery = db.select().from(downloadJobs)
          .where(and(
            eq(downloadJobs.symbol, symbol.toUpperCase()),
            eq(downloadJobs.timeframe, timeframe),
            eq(downloadJobs.period, period),
            eq(downloadJobs.status, 'in_progress')
          ))
          .orderBy(desc(downloadJobs.createdAt))
          .limit(1);
      }

      const activeJobs = await activeJobQuery;
      
      if (activeJobs.length > 0) {
        const job = activeJobs[0];
        
        // Count current records in database for this job's parameters
        const currentCount = await db.select({ count: sql<number>`count(*)` })
          .from(historicalData)
          .where(and(
            eq(historicalData.symbol, job.symbol),
            eq(historicalData.timeframe, job.timeframe)
          ));

        const currentRecords = currentCount[0]?.count || 0;
        const expectedRecords = job.expectedRecords || 1;
        const percentage = Math.min(Math.round((currentRecords / expectedRecords) * 100), 100);

        // Update job progress
        await db.update(downloadJobs)
          .set({ 
            currentRecords: currentRecords,
            progressPercentage: percentage.toString(),
            updatedAt: new Date()
          })
          .where(eq(downloadJobs.id, job.id));

        // Check if download is complete
        if (currentRecords >= expectedRecords || percentage >= 100) {
          await db.update(downloadJobs)
            .set({ 
              status: 'completed',
              progressPercentage: "100",
              updatedAt: new Date()
            })
            .where(eq(downloadJobs.id, job.id));

          return {
            percentage: 100,
            status: 'Download completed',
            completed: true
          };
        }

        return {
          percentage,
          status: `Downloading ${job.timeframe} data... ${currentRecords}/${expectedRecords} records`,
          completed: false,
          year: job.startDate.getFullYear()
        };
      }

      return {
        percentage: 0,
        status: 'No active download',
        completed: true
      };
    } catch (error: any) {
      console.error('Error getting download progress:', error);
      return {
        percentage: 0,
        status: 'Error checking progress',
        completed: true,
        error: error.message
      };
    }
  }

  /**
   * Create or get existing download job
   */
  async createDownloadJob(symbol: string, timeframe: string, period: string, startDate: Date, endDate: Date): Promise<{ jobId: string; isExisting: boolean }> {
    try {
      // Check for existing job with same parameters
      const existingJobs = await db.select().from(downloadJobs)
        .where(and(
          eq(downloadJobs.symbol, symbol.toUpperCase()),
          eq(downloadJobs.timeframe, timeframe),
          eq(downloadJobs.period, period),
          eq(downloadJobs.status, 'in_progress')
        ))
        .limit(1);

      if (existingJobs.length > 0) {
        return { jobId: existingJobs[0].id, isExisting: true };
      }

      // Calculate expected records based on timeframe and period
      const expectedRecords = this.calculateExpectedRecords(timeframe, period, startDate, endDate);

      // Create new job
      const newJob = await db.insert(downloadJobs)
        .values({
          symbol: symbol.toUpperCase(),
          timeframe,
          period,
          status: 'in_progress',
          startDate,
          endDate,
          expectedRecords,
          currentRecords: 0,
          progressPercentage: "0"
        })
        .returning();

      return { jobId: newJob[0].id, isExisting: false };
    } catch (error: any) {
      console.error('Error creating download job:', error);
      throw error;
    }
  }

  /**
   * Calculate expected number of records based on timeframe and period
   */
  private calculateExpectedRecords(timeframe: string, period: string, startDate: Date, endDate: Date): number {
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    // Market is open ~252 days per year (excluding weekends and holidays)
    const marketDaysPerYear = 252;
    const marketDays = Math.ceil((diffDays / 365) * marketDaysPerYear);

    switch (timeframe) {
      case '1M':
        return marketDays * 390; // ~6.5 hours * 60 minutes
      case '5M':
        return marketDays * 78;  // ~6.5 hours * 12 (5-min intervals)
      case '15M':
        return marketDays * 26;  // ~6.5 hours * 4 (15-min intervals)
      case '30M':
        return marketDays * 13;  // ~6.5 hours * 2 (30-min intervals)
      case '1H':
        return marketDays * 7;   // ~6.5 hours
      case '1D':
        return marketDays;       // 1 per day
      default:
        return marketDays * 100; // Default estimate
    }
  }

  /**
   * Get previous business day in YYYY-MM-DD format
   */
  private getPreviousBusinessDay(): string {
    const today = new Date();
    let previousDay = new Date(today);
    
    // Go back 1 day initially
    previousDay.setDate(today.getDate() - 1);
    
    // If it's Monday, go back to Friday (3 days)
    if (previousDay.getDay() === 0) { // Sunday
      previousDay.setDate(previousDay.getDate() - 2);
    } else if (previousDay.getDay() === 6) { // Saturday
      previousDay.setDate(previousDay.getDate() - 1);
    }
    
    return previousDay.toISOString().split('T')[0];
  }
}

export const polygonService = new PolygonService();