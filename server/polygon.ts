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
   * Get the most recent trading day close time
   */
  getMostRecentMarketClose(): Date {
    // Force current date to 2025
    const now = new Date('2025-08-14T12:00:00Z'); // Use current actual date
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
   * Download and store historical data for a new ticker
   */
  async downloadHistoricalData(
    symbol: string,
    period: '1Y' | '5Y' | '10Y' | 'MAX',
    onProgress?: (progress: number, year?: number) => void
  ): Promise<void> {
    // Use current date (2025)
    const now = new Date('2025-08-14T12:00:00Z');
    let startDate: Date;
    
    switch (period) {
      case '1Y':
        startDate = new Date(2024, 7, 14); // August 14, 2024 (1 year ago)
        break;
      case '5Y':
        startDate = new Date(2020, 7, 14); // August 14, 2020 (5 years ago)
        break;
      case '10Y':
        startDate = new Date(2015, 7, 14); // August 14, 2015 (10 years ago)
        break;
      case 'MAX':
        startDate = new Date(2010, 0, 1); // Start from 2010
        break;
    }
    
    console.log(`Downloading ${symbol} data from ${startDate.toISOString()} to ${now.toISOString()}`);
    
    const endDate = this.getMostRecentMarketClose();
    
    console.log(`Downloading ${symbol} from ${startDate.toISOString()} to ${endDate.toISOString()}`);
    
    // Download data year by year for better progress tracking and API limits
    const startYear = startDate.getFullYear();
    const endYear = endDate.getFullYear();
    const totalYears = endYear - startYear + 1;
    
    for (let year = startYear; year <= endYear; year++) {
      const yearStart = new Date(Math.max(startDate.getTime(), new Date(year, 0, 1).getTime()));
      const yearEnd = new Date(Math.min(endDate.getTime(), new Date(year, 11, 31).getTime()));
      
      const fromStr = yearStart.toISOString().split('T')[0];
      const toStr = yearEnd.toISOString().split('T')[0];
      
      try {
        // Download 1-minute data
        const candles = await this.fetchBars(symbol, 'minute', 1, fromStr, toStr);
        
        if (candles.length > 0) {
          const formattedData = candles.map(candle => 
            this.formatCandleForDB(candle, symbol, '1M')
          );
          
          // Insert data in chunks to avoid memory issues
          const chunkSize = 1000;
          for (let i = 0; i < formattedData.length; i += chunkSize) {
            const chunk = formattedData.slice(i, i + chunkSize);
            await db.insert(historicalData).values(chunk).onConflictDoNothing();
          }
        }
        
        // Update progress
        const progress = ((year - startYear + 1) / totalYears) * 100;
        onProgress?.(progress, year);
        
        // Rate limiting - wait 100ms between requests
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.error(`Error downloading data for ${symbol} year ${year}:`, error);
        throw error;
      }
    }
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
}

export const polygonService = new PolygonService();