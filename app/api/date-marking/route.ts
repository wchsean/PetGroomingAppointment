import { type NextRequest, NextResponse } from "next/server"
import pool from "@/lib/db"
import type { ApiResponse, AvailabilityRule } from "@/types"

// GET /api/availability-rules - Get all marking_date
export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<AvailabilityRule[]>>> {
  try {
    const result = await pool.query("SELECT * FROM grooming.date_marking ORDER BY created_at DESC")

    return NextResponse.json({
      success: true,
      data: result.rows,
    })
  } catch (error) {
    console.error("Error fetching date_marking", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch date_marking",
      },
      { status: 500 },
    )
  }
}

// POST /api/availability-rules - Create a new marking_date
export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<AvailabilityRule>>> {
  try {
    const body = await request.json()
    const { type, marking_day_of_week, marking_date, color} = body
    console.log("availability-rules",body)

    // Validate required fields
    if (!type ) {
      return NextResponse.json(
        {
          success: false,
          error: "Type are required",
        },
        { status: 400 },
      )
    }

    // Validate type-specific fields
    if (type === "weekly" && marking_day_of_week === undefined) {
      return NextResponse.json(
        {
          success: false,
          error: "Day of week is required for weekly rules",
        },
        { status: 400 },
      )
    }

    if (type === "specific" && !marking_date) {
      return NextResponse.json(
        {
          success: false,
          error: "Specific date is required for specific date rules",
        },
        { status: 400 },
      )
    }

    const result = await pool.query(
      `INSERT INTO grooming.date_marking 
       (type, marking_day_of_week, marking_date, color) 
       VALUES ($1, $2, $3, $4) 
       RETURNING *`,
      [
        type,
        type === "weekly" ? marking_day_of_week : null,
        type === "specific" ? marking_date : null,
        color || "yellow", // Default color if not provided
      ],
    )

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: "marking_date created successfully",
    })
  } catch (error) {
    console.error("Error creating marking_date:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to create marking_date",
      },
      { status: 500 },
    )
  }
}

// DELETE /api/date-marking - Delete a specific marking_date
export async function DELETE(
  request: NextRequest,
): Promise<NextResponse<ApiResponse<null>>> {
  console.log("unction DELETE",request)
  try {
    const body = await request.json()
    const {date} = body 

    const result = await pool.query("DELETE FROM grooming.date_marking WHERE marking_date = $1 RETURNING date_marking", [date])

    if (result.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "marking_date not found",
        },
        { status: 404 },
      )
    }

    return NextResponse.json({
      success: true,
      message: "marking_date deleted successfully",
    })
  } catch (error) {
    console.error("Error deleting marking_date:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to delete marking_date",
      },
      { status: 500 },
    )
  }
}
