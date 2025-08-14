import { db } from "./db";
import { portfolio, positions } from "@shared/schema";

async function seedDatabase() {
  console.log("🌱 Seeding database with user portfolio data...");

  try {
    // Insert sample portfolio data (user-specific, not market data)
    const portfolioData = {
      totalValue: "127845.92",
      dayChange: "1234.56",
      dayChangePercent: "0.97",
      buyingPower: "125430.50",
    };
    
    await db.insert(portfolio).values(portfolioData).onConflictDoNothing();
    console.log("✓ Portfolio data inserted");

    // Insert sample positions (user's holdings, not market data)
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

    console.log("🎉 Database seeding completed successfully!");
    console.log("📊 All market data, technical indicators, and historical data will be sourced from Polygon API");
    
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