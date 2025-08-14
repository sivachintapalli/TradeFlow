#!/usr/bin/env node

/**
 * Validation script to verify download record counts
 * Usage: node server/validation.js
 */

import pkg from 'pg';
const { Client } = pkg;

// Database connection
const client = new Client({
  connectionString: process.env.DATABASE_URL
});

async function validateDownloadCounts() {
  console.log('🔍 [VALIDATION] Starting download count validation...\n');
  
  try {
    await client.connect();
    
    // Get all download jobs
    const jobsResult = await client.query(`
      SELECT symbol, timeframe, period, expected_records, current_records, status, start_date, end_date
      FROM download_jobs 
      ORDER BY created_at DESC 
      LIMIT 10
    `);
    
    console.log('📊 Recent Download Jobs:');
    console.log('─'.repeat(120));
    console.log('Symbol | Timeframe | Period | Expected | Actual | Status | Start → End');
    console.log('─'.repeat(120));
    
    for (const job of jobsResult.rows) {
      // Calculate actual records in database
      const actualResult = await client.query(`
        SELECT COUNT(*) as count 
        FROM historical_data 
        WHERE symbol = $1 AND timeframe = $2
      `, [job.symbol, job.timeframe]);
      
      const actualCount = parseInt(actualResult.rows[0].count);
      const expectedCount = parseInt(job.expected_records);
      const efficiency = expectedCount > 0 ? ((actualCount / expectedCount) * 100).toFixed(1) : 0;
      
      const status = efficiency > 80 ? '✅ GOOD' : efficiency > 50 ? '⚠️ LOW' : '❌ POOR';
      
      console.log(`${job.symbol.padEnd(6)} | ${job.timeframe.padEnd(9)} | ${job.period.padEnd(6)} | ${expectedCount.toLocaleString().padStart(8)} | ${actualCount.toLocaleString().padStart(6)} | ${status.padEnd(8)} | ${job.start_date.toISOString().split('T')[0]} → ${job.end_date.toISOString().split('T')[0]}`);
    }
    
    console.log('─'.repeat(120));
    
    // Market day calculations for 1-minute data
    console.log('\n📈 Expected Records Calculation (1-minute data):');
    console.log('• Market hours: 9:30 AM - 4:00 PM ET = 6.5 hours = 390 minutes/day');
    console.log('• Trading days/year: ~252 days (excluding weekends & holidays)');
    console.log('• 1 Year 1-minute: 252 × 390 = 98,280 records (theoretical max)');
    console.log('• Actual data may be less due to holidays, early closes, etc.\n');
    
    // Polygon API rate limits
    console.log('🔌 Polygon API Considerations:');
    console.log('• Free tier: 5 calls/minute limit');
    console.log('• Each year requires multiple API calls for minute data');
    console.log('• Large datasets may be chunked and take time to complete');
    console.log('• Some historical periods may have gaps or missing data\n');
    
  } catch (error) {
    console.error('❌ Validation error:', error.message);
  } finally {
    await client.end();
  }
}

// Run validation
validateDownloadCounts().catch(console.error);