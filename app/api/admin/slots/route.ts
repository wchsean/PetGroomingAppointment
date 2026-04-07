import { NextResponse, type NextRequest } from "next/server"
import pool from "@/lib/db"

// Slot type array - contains filtering categories like 'ONLINE', 'SMALL_DOG', 'LARGE_DOG', etc.
export type SlotTypeArray = string[]

interface CreateSlotRequest {
  slot_date: string // YYYY-MM-DD
  slot_time: string // HH:MM
  slot_type: string[] // Array of filtering categories (e.g., ['ONLINE', 'SMALL_DOG'])
  capacity: number
  is_enabled?: boolean
}

interface UpdateSlotRequest {
  id: number
  slot_type?: string[]
  capacity?: number
  is_enabled?: boolean
}

interface BulkCreateSlotRequest {
  slots: CreateSlotRequest[]
}

// GET - List slots with optional filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get("start_date")
    const endDate = searchParams.get("end_date")
    const slotType = searchParams.get("slot_type")
    const isEnabled = searchParams.get("is_enabled")

    let query = `
      SELECT 
        s.id,
        s.slot_date,
        s.slot_time,
        s.slot_type,
        s.capacity,
        s.is_enabled,
        s.created_at,
        s.updated_at,
        COALESCE(
          (SELECT SUM(a.capacity_units) 
           FROM grooming.appointments a 
           WHERE a.appointment_slot_id = s.id 
           AND a.appointment_active = true),
          0
        ) as booked_count
      FROM grooming.appointment_slots s
      WHERE 1=1
    `

    const params: (string | boolean)[] = []
    let paramIndex = 1

    if (startDate) {
      query += ` AND s.slot_date >= $${paramIndex}`
      params.push(startDate)
      paramIndex++
    }

    if (endDate) {
      query += ` AND s.slot_date <= $${paramIndex}`
      params.push(endDate)
      paramIndex++
    }

    if (slotType) {
      query += ` AND s.slot_type @> ARRAY[$${paramIndex}::TEXT]`
      params.push(slotType)
      paramIndex++
    }

    if (isEnabled !== null && isEnabled !== undefined) {
      query += ` AND s.is_enabled = $${paramIndex}`
      params.push(isEnabled === "true")
      paramIndex++
    }

    query += ` ORDER BY s.slot_date ASC, s.slot_time ASC`

    const slots = await pool.query(query, params)

    return NextResponse.json({
      success: true,
      data: slots.rows.map((slot) => ({
        ...slot,
        available_count: Math.max(0, slot.capacity - Number(slot.booked_count)),
      })),
    })
  } catch (error) {
    console.error("Error fetching slots:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch slots" }, { status: 500 })
  }
}

// POST - Create single or bulk slots
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Check if it's a bulk create request
    if (body.slots && Array.isArray(body.slots)) {
      return handleBulkCreate(body as BulkCreateSlotRequest)
    }

    // Single slot creation
    const { slot_date, slot_time, slot_type, capacity, is_enabled = true } = body as CreateSlotRequest

    // Validation
    if (!slot_date || !slot_time || !slot_type || !capacity) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: slot_date, slot_time, slot_type, capacity" },
        { status: 400 },
      )
    }

    if (!["small", "large", "any", "for_online_small", "for_online_large"].includes(slot_type)) {
      return NextResponse.json(
        { success: false, error: "Invalid slot_type. Must be 'small', 'large', 'any', 'for_online_small', or 'for_online_large'" },
        { status: 400 },
      )
    }

    if (capacity < 1) {
      return NextResponse.json({ success: false, error: "capacity must be at least 1" }, { status: 400 })
    }

    // Check for duplicate
    const existing = await pool.query(
      `
      SELECT id
      FROM grooming.appointment_slots
      WHERE slot_date = $1
        AND slot_time = $2
      `,
      [slot_date, slot_time]
    )


    if (existing.length > 0) {
      return NextResponse.json(
        { success: false, error: "A slot with this date, time, and type already exists" },
        { status: 409 },
      )
    }

    // Create slot
    const result = await pool.query(
      `
      INSERT INTO grooming.appointment_slots
        (slot_date, slot_time, slot_type, capacity, is_enabled)
      VALUES
        ($1, $2, $3, $4, $5)
      RETURNING *
      `,
      [
        slot_date,
        slot_time,
        slot_type,
        capacity,
        is_enabled,
      ]
    )


    return NextResponse.json({
      success: true,
      data: result[0],
      message: "Slot created successfully",
    })
  } catch (error) {
    console.error("Error creating slot:", error)
    return NextResponse.json({ success: false, error: "Failed to create slot" }, { status: 500 })
  }
}

// Bulk create handler
async function handleBulkCreate(body: BulkCreateSlotRequest) {
  const { slots } = body

  if (slots.length === 0) {
    return NextResponse.json({ success: false, error: "No slots provided" }, { status: 400 })
  }

  if (slots.length > 100) {
    return NextResponse.json({ success: false, error: "Maximum 100 slots per request" }, { status: 400 })
  }

  // Validate all slots
  for (const slot of slots) {
    if (!slot.slot_date || !slot.slot_time || !slot.slot_type || !slot.capacity) {
      return NextResponse.json(
        { success: false, error: "Each slot must have slot_date, slot_time, slot_type, capacity" },
        { status: 400 },
      )
    }
    if (!["small", "large", "any"].includes(slot.slot_type)) {
      return NextResponse.json(
        { success: false, error: "Invalid slot_type. Must be 'small', 'large', or 'any'" },
        { status: 400 },
      )
    }
  }

  try {
    // Use INSERT ... ON CONFLICT to handle duplicates gracefully
    const values = slots
      .map(
        (s) =>
          `('${s.slot_date}', '${s.slot_time}', '${s.slot_type}', ${s.capacity}, ${s.is_enabled !== false})`,
      )
      .join(", ")

    const result = await pool.query(`
      INSERT INTO grooming.appointment_slots (slot_date, slot_time, slot_type, capacity, is_enabled)
      VALUES ${values}
      ON CONFLICT (slot_date, slot_time, slot_type) DO UPDATE SET
        capacity = EXCLUDED.capacity,
        is_enabled = EXCLUDED.is_enabled,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `)

    return NextResponse.json({
      success: true,
      data: result,
      message: `${result.length} slots created/updated successfully`,
    })
  } catch (error) {
    console.error("Error bulk creating slots:", error)
    return NextResponse.json({ success: false, error: "Failed to bulk create slots" }, { status: 500 })
  }
}

// PUT - Update a slot
export async function PUT(request: NextRequest) {
  try {
    const body = (await request.json()) as UpdateSlotRequest

    const { id, slot_type, capacity, is_enabled } = body

    if (!id) {
      return NextResponse.json({ success: false, error: "Missing required field: id" }, { status: 400 })
    }

    // Check if slot exists
    const existing = await pool.query(`
      SELECT 
        s.*,
        COALESCE(
          (SELECT SUM(a.capacity_units) 
           FROM grooming.appointments a 
           WHERE a.appointment_slot_id = s.id 
           AND a.appointment_active = true),
          0
        ) as booked_count
      FROM grooming.appointment_slots s
      WHERE s.id = ${id}
    `)

    if (existing.length === 0) {
      return NextResponse.json({ success: false, error: "Slot not found" }, { status: 404 })
    }

    const currentSlot = existing[0]

    // Validate slot_type if provided
    if (slot_type && !["small", "large", "any"].includes(slot_type)) {
      return NextResponse.json(
        { success: false, error: "Invalid slot_type. Must be 'small', 'large', or 'any'" },
        { status: 400 },
      )
    }

    // Validate capacity if provided
    if (capacity !== undefined) {
      if (capacity < 1) {
        return NextResponse.json({ success: false, error: "capacity must be at least 1" }, { status: 400 })
      }
      // Can't reduce below current bookings
      if (capacity < Number(currentSlot.booked_count)) {
        return NextResponse.json(
          {
            success: false,
            error: `Cannot reduce capacity below current bookings (${currentSlot.booked_count})`,
          },
          { status: 400 },
        )
      }
    }

    // Build update query dynamically
    const updates: string[] = []
    const params: (string | number | boolean)[] = []
    let paramIndex = 1

    if (slot_type !== undefined) {
      updates.push(`slot_type = $${paramIndex}`)
      params.push(slot_type)
      paramIndex++
    }

    if (capacity !== undefined) {
      updates.push(`capacity = $${paramIndex}`)
      params.push(capacity)
      paramIndex++
    }

    if (is_enabled !== undefined) {
      updates.push(`is_enabled = $${paramIndex}`)
      params.push(is_enabled)
      paramIndex++
    }

    if (updates.length === 0) {
      return NextResponse.json({ success: false, error: "No fields to update" }, { status: 400 })
    }

    params.push(id)

    const result = await pool.query(
      `
      UPDATE grooming.appointment_slots
      SET ${updates.join(", ")}
      WHERE id = $${paramIndex}
      RETURNING *
    `,
      params,
    )

    return NextResponse.json({
      success: true,
      data: result[0],
      message: "Slot updated successfully",
    })
  } catch (error) {
    console.error("Error updating slot:", error)
    return NextResponse.json({ success: false, error: "Failed to update slot" }, { status: 500 })
  }
}

