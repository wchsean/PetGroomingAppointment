import { type NextRequest, NextResponse } from "next/server"
import pool from "@/lib/db"
import type { ApiResponse, ServiceHistory } from "@/types"

// GET /api/service-history - Get service history (with optional dog_id filter)
export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<ServiceHistory[]>>> {
  try {
    const searchParams = request.nextUrl.searchParams
    const dogId = searchParams.get("dog_id")

    let baseQuery = `
      SELECT 
        s.*, 
        d.dog_name 
      FROM grooming.service_history s
      JOIN grooming.dogs d ON s.dog_id = d.id
    `
    const conditions: string[] = []
    const values: any[] = []

    if (dogId) {
      conditions.push("s.dog_id = $1")
      values.push(dogId)
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : ""
    const finalQuery = `${baseQuery} ${whereClause} ORDER BY s.service_date DESC`

    const result = await pool.query(finalQuery, values)

    return NextResponse.json({
      success: true,
      data: result.rows,
    })
  } catch (error) {
    console.error("Error fetching service history:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch service history",
      },
      { status: 500 },
    )
  }
}

// POST /api/service-history - Create a new service history entry
export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<ServiceHistory>>> {
  try {
    const body = await request.json()
    const { dog_id, date, services, price, note } = body

    // Validate required fields
    if (!dog_id || !date || !services) {
      return NextResponse.json(
        {
          success: false,
          error: "Dog ID, date, and services are required",
        },
        { status: 400 },
      )
    }

    // Check if dog exists
    const dogCheck = await pool.query("SELECT id FROM grooming.dogs WHERE id = $1", [dog_id])
    if (dogCheck.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Dog not found",
        },
        { status: 404 },
      )
    }

    const result = await pool.query(
      `INSERT INTO grooming.service_history 
      (dog_id, service_date, service, service_price, service_note) 
      VALUES ($1, $2, $3, $4, $5) 
      RETURNING *`,
      [dog_id, date, services, price, note],
    )

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: "Service history added successfully",
    })
  } catch (error) {
    console.error("Error creating service history:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to create service history",
      },
      { status: 500 },
    )
  }
}
