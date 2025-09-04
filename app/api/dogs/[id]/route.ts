import { type NextRequest, NextResponse } from "next/server"
import pool from "@/lib/db"
import type { ApiResponse, Dog } from "@/types"

// GET /api/dogs/[id] - Get a specific dog with service history
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse<ApiResponse<any>>> {
  try {
    const id = params.id

    // Get dog details with latest service info
    const dogResult = await pool.query(
      `SELECT d.*, 
        (SELECT sh.services FROM grooming.service_history sh 
         WHERE sh.dog_id = d.id 
         ORDER BY sh.date DESC LIMIT 1) as previous_services,
        (SELECT sh.price FROM grooming.service_history sh 
         WHERE sh.dog_id = d.id 
         ORDER BY sh.date DESC LIMIT 1) as previous_price
       FROM grooming.dog d
       WHERE d.id = $1`,
      [id],
    )

    if (dogResult.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Dog not found",
        },
        { status: 404 },
      )
    }

    const dog = dogResult.rows[0]

    // Get service history
    const historyResult = await pool.query(
      "SELECT * FROM grooming.service_history WHERE dog_id = $1 ORDER BY date DESC",
      [id],
    )

    // Get customer info
    const customerResult = await pool.query("SELECT * FROM grooming.customer WHERE id = $1", [dog.customer_id])

    return NextResponse.json({
      success: true,
      data: {
        ...dog,
        service_history: historyResult.rows,
        customer: customerResult.rows[0] || null,
      },
    })
  } catch (error) {
    console.error("Error fetching dog:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch dog",
      },
      { status: 500 },
    )
  }
}

// PUT /api/dogs/[id] - Update a dog
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse<ApiResponse<Dog>>> {
  try {
    const id = params.id
    const body = await request.json()
    const { name, breed, note } = body

    // Validate required fields
    if (!name) {
      return NextResponse.json(
        {
          success: false,
          error: "Dog name is required",
        },
        { status: 400 },
      )
    }

    const result = await pool.query(
      `UPDATE grooming.dog 
       SET name = $1, 
           breed = $2, 
           note = $3, 
           updated_at = CURRENT_TIMESTAMP 
       WHERE id = $4 
       RETURNING *`,
      [name, breed, note, id],
    )

    if (result.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Dog not found",
        },
        { status: 404 },
      )
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: "Dog updated successfully",
    })
  } catch (error) {
    console.error("Error updating dog:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update dog",
      },
      { status: 500 },
    )
  }
}

// DELETE /api/dogs/[id] - Delete a dog
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse<ApiResponse<null>>> {
  try {
    const id = params.id

    const result = await pool.query("DELETE FROM grooming.dogs WHERE id = $1 RETURNING id", [id])

    if (result.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Dog not found",
        },
        { status: 404 },
      )
    }

    return NextResponse.json({
      ok: true,
      success: true,
      message: "Dog deleted successfully",
    })
  } catch (error) {
    console.error("Error deleting dog:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to delete dog",
      },
      { status: 500 },
    )
  }
}
