import { type NextRequest, NextResponse } from "next/server"
import pool from "@/lib/db"

// GET /api/customer-management/customers/[id] - 獲取客戶詳細資料
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const {id:customerId} = await params

    // 獲取客戶基本資料
    const customerResult = await pool.query(
      "SELECT * FROM grooming.customers WHERE id = $1 AND customer_active = true",
      [customerId],
    )

    if (customerResult.rows.length === 0) {
      return NextResponse.json({ success: false, error: "Customer not found" }, { status: 404 })
    }

    const customer = customerResult.rows[0]

    // 獲取電話
    const phonesResult = await pool.query(
      `SELECT * FROM grooming.customer_phones 
       WHERE customer_id = $1 
       ORDER BY is_primary DESC, created_at ASC`,
      [customerId],
    )

    // 獲取狗的資料
    const dogsResult = await pool.query(
      `SELECT * FROM grooming.dogs 
       WHERE customer_id = $1 AND dog_active = true
       ORDER BY created_at ASC`,
      [customerId],
    )

    const dogs = dogsResult.rows

    // 為每隻狗獲取最近3筆服務記錄和未來預約
    for (const dog of dogs) {
      // 最近3筆服務記錄
      const servicesResult = await pool.query(
        `SELECT * FROM grooming.service_history 
         WHERE dog_id = $1 
         ORDER BY service_date DESC 
         LIMIT 3`,
        [dog.id],
      )

      // 未來預約
      const appointmentsResult = await pool.query(
        `SELECT * FROM grooming.appointments 
         WHERE dog_id = $1 AND appointment_date >= CURRENT_DATE AND appointment_active = true
         ORDER BY appointment_date ASC, appointment_time ASC`,
        [dog.id],
      )

      dog.recent_services = servicesResult.rows
      dog.upcoming_appointments = appointmentsResult.rows
    }

    return NextResponse.json({
      success: true,
      data: {
        ...customer,
        phones: phonesResult.rows,
        dogs,
      },
    })
  } catch (error) {
    console.error("Error fetching customer details:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch customer details" }, { status: 500 })
  }
}

// PUT /api/customer-management/customers/[id] - 更新客戶資料
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const customerId = params.id
    const body = await request.json()
    const { customer_name, customer_note } = body

    const result = await pool.query(
      `UPDATE grooming.customers 
       SET customer_name = $1, customer_note = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3 AND customer_active = true
       RETURNING *`,
      [customer_name, customer_note, customerId],
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: "Customer not found" }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: "Customer updated successfully",
    })
  } catch (error) {
    console.error("Error updating customer:", error)
    return NextResponse.json({ success: false, error: "Failed to update customer" }, { status: 500 })
  }
}

// DELETE /api/customer-management/customers/[id] - 軟刪除客戶
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const customerId = params.id

    const result = await pool.query(
      `UPDATE grooming.customers 
       SET customer_active = false, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND customer_active = true
       RETURNING id`,
      [customerId],
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: "Customer not found" }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      message: "Customer deleted successfully",
    })
  } catch (error) {
    console.error("Error deleting customer:", error)
    return NextResponse.json({ success: false, error: "Failed to delete customer" }, { status: 500 })
  }
}
