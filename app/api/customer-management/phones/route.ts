import { type NextRequest, NextResponse } from "next/server"
import pool from "@/lib/db"

// POST /api/customer-management/phones - 新增電話
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { customer_id, phone_owner, phone, phone_type, is_primary } = body

    // 如果設為主要電話，先將其他電話設為非主要
    if (is_primary) {
      await pool.query("UPDATE grooming.customer_phones SET is_primary = false WHERE customer_id = $1", [customer_id])
    }

    const result = await pool.query(
      `INSERT INTO grooming.customer_phones 
       (customer_id, phone_owner, phone, phone_type, is_primary)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [customer_id, phone_owner, phone, phone_type, is_primary],
    )

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: "Phone added successfully",
    })
  } catch (error) {
    console.error("Error adding phone:", error)
    return NextResponse.json({ success: false, error: "Failed to add phone" }, { status: 500 })
  }
}
