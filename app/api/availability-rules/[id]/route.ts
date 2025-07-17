import { type NextRequest, NextResponse } from "next/server"
import pool from "@/lib/db"
import type { ApiResponse, AvailabilityRule } from "@/types"



// DELETE /api/availability-rules/[id] - Delete a specific availability rule
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse<ApiResponse<null>>> {
  try {
    const id = params.id

    const result = await pool.query("DELETE FROM availability_rules WHERE id = $1 RETURNING id", [id])

    if (result.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Availability rule not found",
        },
        { status: 404 },
      )
    }

    return NextResponse.json({
      success: true,
      message: "Availability rule deleted successfully",
    })
  } catch (error) {
    console.error("Error deleting availability rule:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to delete availability rule",
      },
      { status: 500 },
    )
  }
}
