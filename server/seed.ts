import { db } from "./db";
import { 
  portfolio, 
  positions, 
  marketData, 
  technicalIndicators, 
  historicalData 
} from "@shared/schema";

async function seedDatabase() {
  console.log("🌱 Seeding database with sample data...");

  try {
    // Insert sample portfolio data
    const portfolioData = {
      totalValue: "127845.92",
      dayChange: "1234.56",
      dayChangePercent: "0.97",
      buyingPower: "125430.50",
    };
    
    await db.insert(portfolio).values(portfolioData).onConflictDoNothing();
    console.log("✓ Portfolio data inserted");

    // Insert sample positions
    const positionsData = [
      {
        symbol: "AAPL",
        quantity: 100,
        avgPrice: "192.33",
        currentPrice: "196.89",
        pnl: "456.78",
        pnlPercent: "2.37",
      },
      {
        symbol: "TSLA",
        quantity: 50,
        avgPrice: "412.89",
        currentPrice: "410.42",
        pnl: "-123.45",
        pnlPercent: "-0.60",
      }
    ];

    await db.insert(positions).values(positionsData).onConflictDoNothing();
    console.log("✓ Positions data inserted");

    // Insert sample market data
    const marketDataEntries = [
      {
        symbol: "SPY",
        price: "542.18",
        change: "2.47",
        changePercent: "0.46",
        volume: 45200000,
      },
      {
        symbol: "AAPL",
        price: "196.89",
        change: "2.47",
        changePercent: "1.27",
        volume: 45200000,
      }
    ];

    await db.insert(marketData).values(marketDataEntries).onConflictDoNothing();
    console.log("✓ Market data inserted");

    // Insert sample technical indicators
    const technicalData = {
      symbol: "AAPL",
      rsi: "67.42",
      macd: "1.23",
      macdSignal: "0.89",
      macdHistogram: "0.34",
      bollingerUpper: "201.45",
      bollingerMiddle: "196.89",
      bollingerLower: "192.33",
      volume: 45200000,
      avgVolume: 52100000,
    };

    await db.insert(technicalIndicators).values(technicalData).onConflictDoNothing();
    console.log("✓ Technical indicators inserted");

    // Generate sample historical data for AAPL
    const historicalDataEntries = [];
    const baseDate = new Date('2024-01-01');
    let basePrice = 190.00;
    
    for (let i = 0; i < 30; i++) { // Last 30 days
      const date = new Date(baseDate);
      date.setDate(baseDate.getDate() + i);
      
      // Generate realistic price movements
      const priceChange = (Math.random() - 0.5) * 8;
      const open = basePrice;
      const close = basePrice + priceChange;
      const high = Math.max(open, close) + Math.random() * 3;
      const low = Math.min(open, close) - Math.random() * 3;
      const volume = Math.floor(Math.random() * 50000000) + 30000000;
      
      historicalDataEntries.push({
        symbol: "AAPL",
        timestamp: date,
        open: open.toFixed(2),
        high: high.toFixed(2),
        low: low.toFixed(2),
        close: close.toFixed(2),
        volume,
        timeframe: "1D",
      });
      
      basePrice = close;
    }
    
    await db.insert(historicalData).values(historicalDataEntries).onConflictDoNothing();
    console.log("✓ Historical data inserted");

    console.log("🎉 Database seeding completed successfully!");
    
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    throw error;
  }
}

// Run if called directly
seedDatabase()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

export { seedDatabase };