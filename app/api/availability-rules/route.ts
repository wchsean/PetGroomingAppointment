import { type NextRequest, NextResponse } from "next/server"
import pool from "@/lib/db"
import type { ApiResponse, AvailabilityRule } from "@/types"

// GET /api/availability-rules - Get all availability rules
export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<AvailabilityRule[]>>> {
  try {
    const result = await pool.query("SELECT * FROM grooming.availability_rules ORDER BY created_at DESC")

    return NextResponse.json({
      success: true,
      data: result.rows,
    })
  } catch (error) {
    console.error("Error fetching availability rules:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch availability rules",
      },
      { status: 500 },
    )
  }
}

// POST /api/availability-rules - Create a new availability rule
export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<AvailabilityRule>>> {
  try {
    const body = await request.json()
    const { type, day_of_week, specific_date, time, is_enabled, appointment_limit} = body

    // Validate required fields
    if (!type || !time) {
      return NextResponse.json(
        {
          success: false,
          error: "Type and time are required",
        },
        { status: 400 },
      )
    }

    // Validate type-specific fields
    if (type === "weekly" && day_of_week === undefined) {
      return NextResponse.json(
        {
          success: false,
          error: "Day of week is required for weekly rules",
        },
        { status: 400 },
      )
    }

    if (type === "specific" && !specific_date) {
      return NextResponse.json(
        {
          success: false,
          error: "Specific date is required for specific date rules",
        },
        { status: 400 },
      )
    }

    const result = await pool.query(
      `INSERT INTO grooming.availability_rules 
       (type, day_of_week, specific_date, time, is_enabled) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING *`,
      [
        type,
        type === "weekly" ? day_of_week : null,
        type === "specific" ? specific_date : null,
        time,
        is_enabled !== false,
      ],
    )

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: "Availability rule created successfully",
    })
  } catch (error) {
    console.error("Error creating availability rule:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to create availability rule",
      },
      { status: 500 },
    )
  }
}

// PUT /api/availability-rules - Update multiple availability rules
export async function PUT(request: NextRequest): Promise<NextResponse<ApiResponse<AvailabilityRule[]>>> {
  try {
    const body = await request.json()

    if (!Array.isArray(body)) {
      return NextResponse.json(
        {
          success: false,
          error: "Request body must be an array of rules",
        },
        { status: 400 },
      )
    }

    // Start a transaction
    const client = await pool.connect()
    try {
      await client.query("BEGIN")

      // Delete all existing rules
      await client.query("DELETE FROM grooming.availability_rules")

      // Insert new rules
      const insertPromises = body.map((rule) => {
        const { type, day_of_week, specific_date, time, is_enabled } = rule

        return client.query(
          `INSERT INTO grooming.availability_rules 
           (type, day_of_week, specific_date, time, is_enabled) 
           VALUES ($1, $2, $3, $4, $5) 
           RETURNING *`,
          [
            type,
            type === "weekly" ? day_of_week : null,
            type === "specific" ? specific_date : null,
            time,
            is_enabled !== false,
          ],
        )
      })

      const results = await Promise.all(insertPromises)
      const insertedRules = results.map((result) => result.rows[0])

      await client.query("COMMIT")

      return NextResponse.json({
        success: true,
        data: insertedRules,
        message: "Availability rules updated successfully",
      })
    } catch (error) {
      await client.query("ROLLBACK")
      throw error
    } finally {
      client.release()
    }
  } catch (error) {
    console.error("Error updating availability rules:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update availability rules",
      },
      { status: 500 },
    )
  }
}
