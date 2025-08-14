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
    const now = new Date();
    const et = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}));
    const day = et.getDay();
    const hour = et.getHours();
    const minute = et.getMinutes();
    
    let targetDate = new Date(et);
    
    // If it's currently market hours, use previous day's close
    if (this.isMarketOpen()) {
      targetDate.setDate(targetDate.getDate() - 1);
    }
    
    // If it's weekend, go back to Friday
    if (day === 0) { // Sunday
      targetDate.setDate(targetDate.getDate() - 2);
    } else if (day === 6) { // Saturday
      targetDate.setDate(targetDate.getDate() - 1);
    }
    
    // Set to 4:00 PM ET
    targetDate.setHours(16, 0, 0, 0);
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
    await this.saveBarsToDatabase(symbol, data, '1M');
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
      
      if (data.status !== 'OK' || !data.results) {
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
    const now = new Date();
    let startDate: Date;
    
    switch (period) {
      case '1Y':
        startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        break;
      case '5Y':
        startDate = new Date(now.getFullYear() - 5, now.getMonth(), now.getDate());
        break;
      case '10Y':
        startDate = new Date(now.getFullYear() - 10, now.getMonth(), now.getDate());
        break;
      case 'MAX':
        startDate = new Date(2010, 0, 1); // Start from 2010
        break;
    }
    
    const endDate = this.getMostRecentMarketClose();
    
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
          change: "0.00", // Calculate change if needed
          changePercent: "0.00%",
          volume: latestData.volume,
          high: latestData.high,
          low: latestData.low,
          previousClose: latestData.close,
        }).onConflictDoUpdate({
          target: marketData.symbol,
          set: {
            price: latestData.close,
            volume: latestData.volume,
            high: latestData.high,
            low: latestData.low,
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