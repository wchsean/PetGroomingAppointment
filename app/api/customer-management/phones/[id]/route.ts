import { type NextRequest, NextResponse } from "next/server"
import pool from "@/lib/db"

// PUT /api/customer-management/phones/[id] - 更新電話
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const phoneId = params.id
    const body = await request.json()
    const { phone_owner, phone, phone_type, is_primary, customer_id } = body

    // 如果設為主要電話，先將其他電話設為非主要
    if (is_primary && customer_id) {
      await pool.query("UPDATE grooming.customer_phones SET is_primary = false WHERE customer_id = $1 AND id != $2", [
        customer_id,
        phoneId,
      ])
    }

    const result = await pool.query(
      `UPDATE grooming.customer_phones 
       SET phone_owner = $1, phone = $2, phone_type = $3, is_primary = $4, updated_at = CURRENT_TIMESTAMP
       WHERE id = $5 RETURNING *`,
      [phone_owner, phone, phone_type, is_primary, phoneId],
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: "Phone not found" }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: "Phone updated successfully",
    })
  } catch (error) {
    console.error("Error updating phone:", error)
    return NextResponse.json({ success: false, error: "Failed to update phone" }, { status: 500 })
  }
}

// DELETE /api/customer-management/phones/[id] - 刪除電話
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const phoneId = params.id

    const result = await pool.query("DELETE FROM grooming.customer_phones WHERE id = $1 RETURNING id", [phoneId])

    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: "Phone not found" }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      message: "Phone deleted successfully",
    })
  } catch (error) {
    console.error("Error deleting phone:", error)
    return NextResponse.json({ success: false, error: "Failed to delete phone" }, { status: 500 })
  }
}
