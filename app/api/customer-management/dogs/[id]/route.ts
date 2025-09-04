import { type NextRequest, NextResponse } from "next/server"
import pool from "@/lib/db"

// GET /api/customer-management/dogs/[id] - 獲取狗的完整資料
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const dogId = params.id

    // 獲取狗的基本資料
    const dogResult = await pool.query(
      `SELECT d.*, c.customer_name 
       FROM grooming.dogs d
       JOIN grooming.customers c ON d.customer_id = c.id
       WHERE d.id = $1 AND d.dog_active = true`,
      [dogId],
    )

    if (dogResult.rows.length === 0) {
      return NextResponse.json({ success: false, error: "Dog not found" }, { status: 404 })
    }

    const dog = dogResult.rows[0]

    // 獲取所有服務記錄
    const servicesResult = await pool.query(
      `SELECT * FROM grooming.service_history 
       WHERE dog_id = $1 
       ORDER BY service_date DESC`,
      [dogId],
    )

    // 獲取未來預約
    const appointmentsResult = await pool.query(
      `SELECT * FROM grooming.appointments 
       WHERE dog_id = $1 AND appointment_date >= CURRENT_DATE AND appointment_active = true
       ORDER BY appointment_date ASC, appointment_time ASC`,
      [dogId],
    )

    return NextResponse.json({
      success: true,
      data: {
        ...dog,
        service_history: servicesResult.rows,
        upcoming_appointments: appointmentsResult.rows,
      },
    })
  } catch (error) {
    console.error("Error fetching dog details:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch dog details" }, { status: 500 })
  }
}

// PUT /api/customer-management/dogs/[id] - 更新狗的資料
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const dogId = params.id
    const body = await request.json()
    const { dog_name, dog_breed, dog_note } = body

    const result = await pool.query(
      `UPDATE grooming.dogs 
       SET dog_name = $1, dog_breed = $2, dog_note = $3, updated_at = CURRENT_TIMESTAMP
       WHERE id = $4 AND dog_active = true
       RETURNING *`,
      [dog_name, dog_breed, dog_note, dogId],
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: "Dog not found" }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: "Dog updated successfully",
    })
  } catch (error) {
    console.error("Error updating dog:", error)
    return NextResponse.json({ success: false, error: "Failed to update dog" }, { status: 500 })
  }
}

// DELETE /api/customer-management/dogs/[id] - 軟刪除狗
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const dogId = params.id

    const result = await pool.query(
      `UPDATE grooming.dogs 
       SET dog_active = false, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND dog_active = true
       RETURNING id`,
      [dogId],
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: "Dog not found" }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      message: "Dog deleted successfully",
    })
  } catch (error) {
    console.error("Error deleting dog:", error)
    return NextResponse.json({ success: false, error: "Failed to delete dog" }, { status: 500 })
  }
}
