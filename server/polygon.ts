import { db } from "./db";
import { historicalData, marketData } from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";

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
   * Get real-time quote for a symbol
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
    limit: number = 5000
  ): Promise<PolygonCandle[]> {
    const url = `${this.baseUrl}/v2/aggs/ticker/${symbol}/range/${multiplier}/${timespan}/${from}/${to}?adjusted=true&sort=asc&limit=${limit}&apikey=${this.apiKey}`;
    
    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Polygon API error: ${response.status} ${response.statusText}`);
      }
      
      const data: PolygonResponse = await response.json();
      
      // Handle different API statuses
      if (!data.results) {
        console.warn(`No data returned for ${symbol} from ${from} to ${to}`);
        return [];
      }
      
      if (data.status === 'DELAYED') {
        console.warn(`Delayed data returned for ${symbol}, continuing with available data`);
        return data.results;
      }
      
      if (data.status !== 'OK') {
        throw new Error(`Polygon API returned status: ${data.status}`);
      }
      
      return data.results;
    } catch (error) {
      console.error('Error fetching data from Polygon:', error);
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
   * Update current market data for a symbol
   */
  async updateMarketData(symbol: string): Promise<void> {
    try {
      // Get the latest historical data point to use as current market data
      const [latestData] = await db
        .select()
        .from(historicalData)
        .where(eq(historicalData.symbol, symbol))
        .orderBy(desc(historicalData.timestamp))
        .limit(1);

      if (latestData) {
        // Update or insert market data
        await db.insert(marketData).values({
          symbol,
          price: latestData.close,
          change: "0.00", 
          changePercent: "0.00", 
          volume: latestData.volume,
        }).onConflictDoUpdate({
          target: marketData.symbol,
          set: {
            price: latestData.close,
            volume: latestData.volume,
            change: "0.00",
            changePercent: "0.00",
          }
        });
      }
    } catch (error) {
      console.error(`Error updating market data for ${symbol}:`, error);
      throw error;
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
    const isMarketOpen = this.isMarketOpen();
    const endDate = isMarketOpen ? this.getMostRecentMarketClose() : new Date();
    
    // Calculate start date based on period
    const startDate = this.calculateStartDate(endDate, period);
    
    // Convert timeframe to Polygon API parameters
    const { timespan, multiplier } = this.parseTimeframe(timeframe);
    
    console.log(`Downloading ${period} of ${timeframe} data for ${symbol} from ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`);
    
    const years = this.getYearRange(startDate, endDate);
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
        
        const data = await this.fetchBars(symbol, timespan, multiplier, from, to);
        
        if (data.length > 0) {
          await this.saveIntelligentData(symbol, data, timeframe);
          console.log(`Downloaded ${data.length} ${timeframe} data points for ${symbol} (${year})`);
        }
      } catch (error: any) {
        console.error(`Failed to download ${year} data for ${symbol}:`, error);
      }
      
      processedYears++;
    }
    
    if (progressCallback) {
      progressCallback(100);
    }
  }

  /**
   * Intelligent data saving - only insert missing data based on timestamp+timeframe key
   */
  private async saveIntelligentData(symbol: string, candles: PolygonCandle[], timeframe: string): Promise<void> {
    if (candles.length === 0) return;
    
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
   * Get download progress (mock implementation for now)
   */
  async getDownloadProgress(symbol: string): Promise<{ percentage: number; status: string; completed?: boolean; error?: string }> {
    // This would typically check a cache or database for actual progress
    // For now, return a default response
    return {
      percentage: 0,
      status: 'No active download',
      completed: true
    };
  }
}

export const polygonService = new PolygonService();