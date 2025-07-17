import pkg from "pg"
const { Pool } = pkg

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

export default pool

// Helper function to get the most recent service history for a dog
export async function getLatestServiceHistory(dogId: number) {
  const result = await pool.query(
    `SELECT * FROM grooming.services 
     WHERE dog_id = $1 
     ORDER BY date DESC 
     LIMIT 1`,
    [dogId],
  )

  return result.rows[0] || null
}
