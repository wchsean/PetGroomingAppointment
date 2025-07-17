import { type NextRequest, NextResponse } from "next/server"
import pool from "@/lib/db"
import type { ApiResponse, Customer } from "@/types"

// GET /api/customers/[id] - Get a specific customer with dogs and service history
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse<ApiResponse<any>>> {
  try {
    const id = params.id

    // Get customer details
    const customerResult = await pool.query("SELECT * FROM grooming.customers WHERE id = $1", [id])
    
    // Get customer phone
    const phoneResult = await pool.query(
      `SELECT phone, phone_type, is_primary FROM grooming.customer_phones WHERE customer_id = $1`,
      [id]
    )



    if (customerResult.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Customer not found",
        },
        { status: 404 },
      )
    }

    const customer = {
      ...customerResult.rows[0],
      phone: phoneResult.rows,
    }

    // Get dogs
    const dogsResult = await pool.query(
      `SELECT d.*, 
        (SELECT sh.services FROM grooming.service_history sh 
         WHERE sh.dog_id = d.id 
         ORDER BY sh.date DESC LIMIT 1) as previous_services,
        (SELECT sh.price FROM grooming.service_history sh 
         WHERE sh.dog_id = d.id 
         ORDER BY sh.date DESC LIMIT 1) as previous_price
       FROM grooming.dogs d
       WHERE d.customer_id = $1`,
      [id],
    )

    const dogs = dogsResult.rows

    // Get service history for each dog
    for (const dog of dogs) {
      const historyResult = await pool.query(
        "SELECT * FROM grooming.service_history WHERE dog_id = $1 ORDER BY date DESC",
        [dog.id],
      )
      dog.service_history = historyResult.rows
    }

    return NextResponse.json({
      success: true,
      data: {
        ...customer,
        dogs,
      },
    })
  } catch (error) {
    console.error("Error fetching customer:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch customer",
      },
      { status: 500 },
    )
  }
}

// PUT /api/customers/[id] - Update a customer
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse<ApiResponse<Customer>>> {
  try {
    const id = params.id
    const body = await request.json()
    const { customer_name, customer_note, phones } = body

    const result = await pool.query(
      `UPDATE grooming.customers 
      SET customer_name = COALESCE($1, customer_name), 
          customer_note = COALESCE($2, customer_note), 
          updated_at = CURRENT_TIMESTAMP 
      WHERE id = $3 
      RETURNING *`,
      [customer_name, customer_note, id],
    )
    // 更新電話（簡單做法：全部刪除重建）
    if (Array.isArray(phones)) {
      await pool.query("DELETE FROM grooming.customer_phones WHERE customer_id = $1", [id])
      for (const phone of phones) {
        await pool.query(
          `INSERT INTO grooming.customer_phones (customer_id, phone, phone_type, is_primary)
          VALUES ($1, $2, $3, $4)`,
          [id, phone.phone, phone.phone_type || null, phone.is_primary || false]
        )
      }
    }

    if (result.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Customer not found",
        },
        { status: 404 },
      )
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: "Customer updated successfully",
    })
  } catch (error) {
    console.error("Error updating customer:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update customer",
      },
      { status: 500 },
    )
  }
}

// DELETE /api/customers/[id] - Delete a customer
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse<ApiResponse<null>>> {
  try {
    const id = params.id

    const result = await pool.query("DELETE FROM grooming.customers WHERE id = $1 RETURNING id", [id])

    if (result.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Customer not found",
        },
        { status: 404 },
      )
    }

    return NextResponse.json({
      success: true,
      message: "Customer deleted successfully",
    })
  } catch (error) {
    console.error("Error deleting customer:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to delete customer",
      },
      { status: 500 },
    )
  }
}
