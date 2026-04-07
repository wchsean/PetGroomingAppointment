import { NextResponse } from 'next/server'
import pool from '@/lib/db'

// Slot data structure matching database
export interface TimeSlot {
  id: number
  time: string // HH:MM format
  slotType: string
  totalCapacity: number
  bookedCount: number
  availableCount: number
}

export interface DaySlots {
  date: string // ISO date string YYYY-MM-DD
  slots: TimeSlot[]
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const date = searchParams.get('date')
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')

  try {
    // Single date query
    if (date) {
      const slots = await getSlotsByDate(date)
      return NextResponse.json({
        date,
        slots,
      } as DaySlots)
    }

    // Date range query (for week view)
    if (startDate && endDate) {
      const result = await getSlotsForDateRange(startDate, endDate)
      return NextResponse.json(result)
    }

    return NextResponse.json(
      { error: 'Missing date parameter' },
      { status: 400 },
    )
  } catch (error) {
    console.error('Slots API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch slots' },
      { status: 500 },
    )
  }
}

async function getSlotsByDate(dateStr: string): Promise<TimeSlot[]> {
  // Query slots with their current booking counts
  const result = await pool.query(
    `
    SELECT
      s.id,
      s.slot_time,
      s.slot_type,
      s.capacity AS total_capacity,
      COALESCE(
        (
          SELECT SUM(a.capacity_units)
          FROM grooming.appointments a
          WHERE a.appointment_slot_id = s.id
          AND (a.appointment_status <> 'x')),0
      )::int AS booked_count
    FROM grooming.appointment_slots s
    WHERE s.slot_date = $1
      AND s.is_enabled = true
    ORDER BY s.slot_time, s.slot_type
    `,
    [dateStr], // startDate / endDate 都是 "YYYY-MM-DD" 字串
  )
  const slots = result.rows
  return slots.map((slot) => ({
    id: slot.id,
    time: slot.slot_time.substring(0, 5), // Convert HH:MM:SS to HH:MM
    slotType: slot.slot_type,
    totalCapacity: slot.total_capacity,
    bookedCount: slot.booked_count,
    availableCount: Math.max(0, slot.total_capacity - slot.booked_count),
  }))
}

async function getSlotsForDateRange(
  startDate: string,
  endDate: string,
): Promise<DaySlots[]> {
  // Query all slots in the date range
  let slots = await pool.query(
    `
    SELECT
      s.id,
      s.slot_date::text AS slot_date,
      s.slot_time,
      s.slot_type,
      s.capacity AS total_capacity,
      COALESCE(
        (SELECT SUM(a.capacity_units)
         FROM grooming.appointments a
         WHERE a.appointment_slot_id = s.id
          AND (a.appointment_status <> 'x')),0
      )::int AS booked_count
    FROM grooming.appointment_slots s
    WHERE s.slot_date BETWEEN $1 AND $2
      AND s.is_enabled = true
    ORDER BY s.slot_time, s.slot_type
    `,
    [startDate, endDate], // 這裡是參數化，安全又正確
  )

  // Group by date
  const slotsByDate = new Map<string, TimeSlot[]>()

  let slotsArray = slots.rows
  // Debug log
  for (const slot of slotsArray) {
    const dateKey = slot.slot_date
    if (!slotsByDate.has(dateKey)) {
      slotsByDate.set(dateKey, [])
    }
    slotsByDate.get(dateKey)!.push({
      id: slot.id,
      time: slot.slot_time.substring(0, 5),
      slotType: slot.slot_type,
      totalCapacity: slot.total_capacity,
      bookedCount: slot.booked_count,
      availableCount: Math.max(0, slot.total_capacity - slot.booked_count),
    })
  }

  // Fill in missing dates with empty arrays
  const result: DaySlots[] = []
  const current = new Date(startDate)
  const end = new Date(endDate)

  while (current <= end) {
    const dateStr = current.toISOString().split('T')[0]
    result.push({
      date: dateStr,
      slots: slotsByDate.get(dateStr) || [],
    })
    current.setDate(current.getDate() + 1)
  }

  return result
}
