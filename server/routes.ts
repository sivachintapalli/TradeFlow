import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertOrderSchema, insertMarketDataSchema, insertTechnicalIndicatorsSchema, insertHistoricalDataSchema } from "@shared/schema";
import { polygonService } from "./polygon";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Portfolio endpoints
  app.get("/api/portfolio", async (req, res) => {
    try {
      const portfolio = await storage.getPortfolio();
      res.json(portfolio);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch portfolio" });
    }
  });

  // Positions endpoints
  app.get("/api/positions", async (req, res) => {
    try {
      const positions = await storage.getAllPositions();
      res.json(positions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch positions" });
    }
  });

  // Orders endpoints
  app.get("/api/orders", async (req, res) => {
    try {
      const orders = await storage.getAllOrders();
      res.json(orders);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch orders" });
    }
  });

  app.post("/api/orders", async (req, res) => {
    try {
      const orderData = insertOrderSchema.parse(req.body);
      const order = await storage.createOrder(orderData);
      
      // Simulate order processing
      setTimeout(async () => {
        await storage.updateOrderStatus(order.id, "filled", new Date());
      }, 2000);
      
      res.json(order);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid order data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create order" });
      }
    }
  });

  // Market data endpoints
  app.get("/api/market-data/:symbol", async (req, res) => {
    try {
      const { symbol } = req.params;
      const marketData = await storage.getMarketData(symbol.toUpperCase());
      
      if (!marketData) {
        res.status(404).json({ message: "Market data not found" });
        return;
      }
      
      res.json(marketData);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch market data" });
    }
  });

  app.post("/api/market-data", async (req, res) => {
    try {
      const marketData = insertMarketDataSchema.parse(req.body);
      const result = await storage.updateMarketData(marketData);
      res.json(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid market data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to update market data" });
      }
    }
  });

  // Technical indicators endpoints
  app.get("/api/technical-indicators/:symbol", async (req, res) => {
    try {
      const { symbol } = req.params;
      const indicators = await storage.getTechnicalIndicators(symbol.toUpperCase());
      
      if (!indicators) {
        res.status(404).json({ message: "Technical indicators not found" });
        return;
      }
      
      res.json(indicators);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch technical indicators" });
    }
  });

  app.post("/api/technical-indicators", async (req, res) => {
    try {
      const indicators = insertTechnicalIndicatorsSchema.parse(req.body);
      const result = await storage.updateTechnicalIndicators(indicators);
      res.json(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid technical indicators", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to update technical indicators" });
      }
    }
  });

  // Historical data endpoints
  app.get("/api/historical-data/:symbol", async (req, res) => {
    try {
      const { symbol } = req.params;
      const { timeframe = '1D', limit = '100', offset = '0' } = req.query;
      
      const historicalData = await storage.getHistoricalData(
        symbol.toUpperCase(), 
        timeframe as string, 
        parseInt(limit as string),
        parseInt(offset as string)
      );
      
      res.json(historicalData);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch historical data" });
    }
  });

  app.post("/api/historical-data", async (req, res) => {
    try {
      const data = insertHistoricalDataSchema.parse(req.body);
      const result = await storage.createHistoricalData(data);
      res.json(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid historical data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create historical data" });
      }
    }
  });

  // Polygon API endpoints for data synchronization
  app.post("/api/sync-ticker/:symbol", async (req, res) => {
    try {
      const { symbol } = req.params;
      const upperSymbol = symbol.toUpperCase();
      
      // Check if sync is needed
      const needsSync = await polygonService.needsDataSync(upperSymbol);
      if (!needsSync) {
        return res.json({ message: "Data is up to date", synced: false });
      }
      
      // Perform sync
      await polygonService.syncTickerData(upperSymbol);
      await polygonService.updateMarketData(upperSymbol);
      
      res.json({ message: "Data synchronized", synced: true });
    } catch (error: any) {
      console.error('Sync ticker error:', error);
      res.status(500).json({ 
        message: error.message || "Failed to sync ticker data",
        error: error.name 
      });
    }
  });

  app.post("/api/download-ticker", async (req, res) => {
    try {
      const { symbol, period } = req.body;
      
      if (!symbol || !period) {
        return res.status(400).json({ message: "Symbol and period are required" });
      }
      
      const upperSymbol = symbol.toUpperCase();
      const validPeriods = ['1Y', '5Y', '10Y', 'MAX'];
      
      if (!validPeriods.includes(period)) {
        return res.status(400).json({ message: "Invalid period. Use 1Y, 5Y, 10Y, or MAX" });
      }
      
      // Set up SSE for progress updates
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
      });
      
      let progress = 0;
      const sendProgress = (prog: number, year?: number) => {
        progress = prog;
        const data = JSON.stringify({ progress: Math.round(prog), year });
        res.write(`data: ${data}\n\n`);
      };
      
      try {
        await polygonService.downloadHistoricalData(upperSymbol, period, sendProgress);
        await polygonService.updateMarketData(upperSymbol);
        
        res.write(`data: ${JSON.stringify({ progress: 100, completed: true })}\n\n`);
        res.end();
      } catch (error: any) {
        const errorData = JSON.stringify({ 
          error: true, 
          message: error.message || "Download failed",
          progress 
        });
        res.write(`data: ${errorData}\n\n`);
        res.end();
      }
    } catch (error: any) {
      console.error('Download ticker error:', error);
      res.status(500).json({ 
        message: error.message || "Failed to download ticker data" 
      });
    }
  });

  app.get("/api/ticker-status/:symbol", async (req, res) => {
    try {
      const { symbol } = req.params;
      const upperSymbol = symbol.toUpperCase();
      
      const latestTimestamp = await polygonService.getLatestDataTimestamp(upperSymbol);
      const needsSync = await polygonService.needsDataSync(upperSymbol);
      const isMarketOpen = polygonService.isMarketOpen();
      const mostRecentClose = polygonService.getMostRecentMarketClose();
      
      res.json({
        symbol: upperSymbol,
        hasData: !!latestTimestamp,
        latestTimestamp,
        needsSync,
        isMarketOpen,
        mostRecentClose
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to get ticker status" });
    }
  });

  // Emergency stop endpoint
  app.post("/api/emergency-stop", async (req, res) => {
    try {
      // Cancel all pending orders
      const orders = await storage.getAllOrders();
      const pendingOrders = orders.filter(order => order.status === "pending");
      
      for (const order of pendingOrders) {
        await storage.updateOrderStatus(order.id, "cancelled");
      }
      
      res.json({ 
        message: "Emergency stop executed", 
        cancelledOrders: pendingOrders.length 
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to execute emergency stop" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
