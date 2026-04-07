
import { NextResponse, type NextRequest } from "next/server"



interface GenerateSlotsRequest {
  start_date: string // YYYY-MM-DD
  end_date: string // YYYY-MM-DD
  time_slots: string[] // Array of times like ["09:00", "10:00", "14:00"]
  slot_configs: {
    slot_type: "small" | "large" | "any"
    appointment_limit: number
  }[]
  exclude_days?: number[] // Days of week to exclude (0 = Sunday, 6 = Saturday)
  exclude_dates?: string[] // Specific dates to exclude
}

// POST - Generate slots for a date range
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as GenerateSlotsRequest

    const { start_date, end_date, time_slots, slot_configs, exclude_days = [], exclude_dates = [] } = body

    // Validation
    if (!start_date || !end_date || !time_slots || !slot_configs) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: start_date, end_date, time_slots, slot_configs" },
        { status: 400 },
      )
    }

    if (time_slots.length === 0) {
      return NextResponse.json({ success: false, error: "At least one time_slot is required" }, { status: 400 })
    }

    if (slot_configs.length === 0) {
      return NextResponse.json({ success: false, error: "At least one slot_config is required" }, { status: 400 })
    }

    // Validate slot configs
    for (const config of slot_configs) {
      if (!["small", "large", "any"].includes(config.slot_type)) {
        return NextResponse.json(
          { success: false, error: "Invalid slot_type. Must be 'small', 'large', or 'any'" },
          { status: 400 },
        )
      }
      if (config.appointment_limit < 1) {
        return NextResponse.json({ success: false, error: "appointment_limit must be at least 1" }, { status: 400 })
      }
    }

    const startDateObj = new Date(start_date)
    const endDateObj = new Date(end_date)

    if (startDateObj > endDateObj) {
      return NextResponse.json({ success: false, error: "start_date must be before or equal to end_date" }, { status: 400 })
    }

    // Calculate max days (limit to 90 days)
    const diffTime = Math.abs(endDateObj.getTime() - startDateObj.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1

    if (diffDays > 90) {
      return NextResponse.json(
        { success: false, error: "Date range cannot exceed 90 days" },
        { status: 400 },
      )
    }

    // Generate all slots
    const slotsToCreate: {
      slot_date: string
      slot_time: string
      slot_type: string
      appointment_limit: number
    }[] = []

    const excludeDatesSet = new Set(exclude_dates)

    for (let d = new Date(startDateObj); d <= endDateObj; d.setDate(d.getDate() + 1)) {
      const dayOfWeek = d.getDay()
      const dateStr = d.toISOString().split("T")[0]

      // Skip excluded days of week
      if (exclude_days.includes(dayOfWeek)) {
        continue
      }

      // Skip excluded specific dates
      if (excludeDatesSet.has(dateStr)) {
        continue
      }

      // Create slots for each time and config
      for (const time of time_slots) {
        for (const config of slot_configs) {
          slotsToCreate.push({
            slot_date: dateStr,
            slot_time: time,
            slot_type: config.slot_type,
            appointment_limit: config.appointment_limit,
          })
        }
      }
    }

    if (slotsToCreate.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        message: "No slots to create (all dates were excluded)",
      })
    }

    if (slotsToCreate.length > 1000) {
      return NextResponse.json(
        { success: false, error: `Too many slots to create (${slotsToCreate.length}). Maximum is 1000. Reduce date range or time slots.` },
        { status: 400 },
      )
    }

    // Build values for batch insert
    const values = slotsToCreate
      .map(
        (s) =>
          `('${s.slot_date}', '${s.slot_time}', '${s.slot_type}', ${s.appointment_limit}, true)`,
      )
      .join(", ")

    const result = await sql(`
      INSERT INTO grooming.appointment_slots (slot_date, slot_time, slot_type, appointment_limit, is_enabled)
      VALUES ${values}
      ON CONFLICT (slot_date, slot_time, slot_type) DO UPDATE SET
        appointment_limit = EXCLUDED.appointment_limit,
        is_enabled = true,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `)

    return NextResponse.json({
      success: true,
      data: {
        total_created: result.length,
        date_range: { start: start_date, end: end_date },
        time_slots,
        slot_configs,
      },
      message: `${result.length} slots created/updated successfully`,
    })
  } catch (error) {
    console.error("Error generating slots:", error)
    return NextResponse.json({ success: false, error: "Failed to generate slots" }, { status: 500 })
  }
}
