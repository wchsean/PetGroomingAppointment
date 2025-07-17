// test-db-connection.ts
import pool from "@/lib/db"

async function testDbConnection() {
  try {
    const result = await pool.query("SELECT NOW()")
    console.log("DB connection successful:", result.rows[0])
  } catch (error) {
    console.error("DB connection failed:", error)
  } finally {
    await pool.end?.() // 如果有支援，結束連線
  }
}

testDbConnection()