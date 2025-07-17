import { type NextRequest, NextResponse } from "next/server"
import pool from "@/lib/db"
import type { ApiResponse, Dog } from "@/types"

// GET /api/dogs - Get dogs (with optional customer_id filter)
export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<Dog[]>>> {
  try {
    const searchParams = request.nextUrl.searchParams
    const customerId = searchParams.get("customer_id")
    const search = searchParams.get("search")

    let query = `
      SELECT d.*, 
        (SELECT sh.services FROM grooming.services sh 
         WHERE sh.dog_id = d.id 
         ORDER BY sh.date DESC LIMIT 1) as previous_services,
        (SELECT sh.price FROM grooming.services sh 
         WHERE sh.dog_id = d.id 
         ORDER BY sh.date DESC LIMIT 1) as previous_price
      FROM grooming.dog d
    `

    const queryParams = []
    let whereClause = ""

    if (customerId) {
      whereClause = "WHERE d.customer_id = $1"
      queryParams.push(customerId)
    } else if (search) {
      whereClause = "WHERE d.name ILIKE $1"
      queryParams.push(`%${search}%`)
    }

    query += whereClause + " ORDER BY d.name ASC"

    const result = await pool.query(query, queryParams)

    return NextResponse.json({
      success: true,
      data: result.rows,
    })
  } catch (error) {
    console.error("Error fetching dogs:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch dogs",
      },
      { status: 500 },
    )
  }
}

// POST /api/dogs - Create a new dog
export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<Dog>>> {
  try {
    const body = await request.json()
    console.log("Create a new dog",body)
    const { customer_id, dog_name, dog_breed, dog_note } = body

    // Validate required fields
    if (!customer_id || !dog_name) {
      return NextResponse.json(
        {
          success: false,
          error: "Customer ID and dog name are required",
        },
        { status: 400 },
      )
    }

    // Check if customer exists
    const customerCheck = await pool.query("SELECT id FROM grooming.customers WHERE id = $1", [customer_id])
    if (customerCheck.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Customer not found",
        },
        { status: 404 },
      )
    }

    const result = await pool.query(
      `INSERT INTO grooming.dogs 
       (customer_id, dog_name, dog_breed, dog_note) 
       VALUES ($1, $2, $3, $4) 
       RETURNING *`,
      [customer_id, dog_name, dog_breed, dog_note],
    )

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: "Dog added successfully",
    })
  } catch (error) {
    console.error("Error creating dog:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to create dog",
      },
      { status: 500 },
    )
  }
}
