import { type NextRequest, NextResponse } from "next/server"
import pool from "@/lib/db"
import type { ApiResponse, AvailabilityRule } from "@/types"


// DELETE /api/date-marking/[id] - Delete a specific marking_date by ID
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse<ApiResponse<null>>> {
  try {
    const id = params.id

    const result = await pool.query("DELETE FROM grooming.date_marking WHERE id = $1 RETURNING id", [id])

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
