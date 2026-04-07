import { NextResponse, type NextRequest } from "next/server"
import pool from "@/lib/db"

// DELETE - Delete a slot (soft delete by disabling, or hard delete if no bookings)
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id: slotId } = await params
    const hardDelete = req.nextUrl.searchParams.get('hard') === 'true'

    if (!slotId) {
      return NextResponse.json({ success: false, error: 'Missing required parameter: id' }, { status: 400 })
    }

    // 查詢 slot 是否存在及活躍預約數
    const result = await pool.query(
      `
      SELECT s.*,
        COALESCE(
          (SELECT COUNT(*) 
           FROM grooming.appointments a 
           WHERE a.appointment_slot_id = s.id 
           AND a.appointment_active = true),
          0
        ) AS booking_count
      FROM grooming.appointment_slots s
      WHERE s.id = $1
      `,
      [slotId]
    )

    const existing = result.rows
    if (existing.length === 0) {
      return NextResponse.json({ success: false, error: 'Slot not found' }, { status: 404 })
    }

    const slot = existing[0]

    // 硬刪除
    if (hardDelete) {
      if (Number(slot.booking_count) > 0) {
        return NextResponse.json(
          {
            success: false,
            error: `Cannot hard delete slot with active bookings (${slot.booking_count}). Cancel bookings first or use soft delete.`,
          },
          { status: 400 }
        )
      }

      await pool.query(`DELETE FROM grooming.appointment_slots WHERE id = $1`, [slotId])
      return NextResponse.json({ success: true, message: 'Slot permanently deleted' })
    }

    // 軟刪除：禁用 slot
    await pool.query(`UPDATE grooming.appointment_slots SET is_enabled = false WHERE id = $1`, [slotId])

    return NextResponse.json({
      success: true,
      message: 'Slot disabled successfully',
      note: Number(slot.booking_count) > 0 ? `Slot has ${slot.booking_count} active bookings` : undefined,
    })
  } catch (error) {
    console.error('Error deleting slot:', error)
    return NextResponse.json({ success: false, error: 'Failed to delete slot' }, { status: 500 })
  }
}

