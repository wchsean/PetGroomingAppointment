// /app/api/daily-notes/route.ts
import { type NextRequest, NextResponse } from 'next/server'
import type { Daily_note } from '@/types'
import pool from '@/lib/db'
import { sendSMS } from '@/lib/mobileMessageApi'

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

// types
type TimeSlotMinimal = {
  time: string
  slotType: 'any' | 'for_online_small' | 'for_online_large'
  availableCount: number
}

type DaySlotsMinimal = {
  date: string // 'YYYY-MM-DD'
  slots: TimeSlotMinimal[]
}

// 取得單日可用時段
async function getSlotsByDate(dateStr: string): Promise<TimeSlotMinimal[]> {
  const result = await pool.query(
    `
    SELECT
      s.slot_time,
      s.slot_type,
      s.capacity AS total_capacity,
      COALESCE(
        (
          SELECT SUM(a.capacity_units)
          FROM grooming.appointments a
          WHERE a.appointment_slot_id = s.id
            AND (a.appointment_status <> 'x')
        ), 0
      )::int AS booked_count
    FROM grooming.appointment_slots s
    WHERE s.slot_date = $1
      AND s.is_enabled = true
      AND s.slot_type IN ('any', 'for_online_small', 'for_online_large')
    ORDER BY s.slot_time, s.slot_type
    `,
    [dateStr],
  )

  return result.rows.map((slot) => ({
    time: slot.slot_time.substring(0, 5),
    slotType: slot.slot_type,
    availableCount: Math.max(0, slot.total_capacity - slot.booked_count),
  }))
}

// 取得日期範圍內可用時段
async function getSlotsForDateRange(
  startDate: string,
  endDate: string,
): Promise<DaySlotsMinimal[]> {
  const result = await pool.query(
    `
    SELECT
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
      AND s.slot_type IN ('any', 'for_online_small', 'for_online_large')
    ORDER BY s.slot_date, s.slot_time, s.slot_type
    `,
    [startDate, endDate],
  )

  // group by date
  const slotsByDate = new Map<string, TimeSlotMinimal[]>()
  for (const slot of result.rows) {
    const dateKey = slot.slot_date
    if (!slotsByDate.has(dateKey)) slotsByDate.set(dateKey, [])
    slotsByDate.get(dateKey)!.push({
      time: slot.slot_time.substring(0, 5),
      slotType: slot.slot_type,
      availableCount: Math.max(0, slot.total_capacity - slot.booked_count),
    })
  }

  // 填補缺失日期
  const output: DaySlotsMinimal[] = []
  const current = new Date(startDate)
  const end = new Date(endDate)
  while (current <= end) {
    const dateStr = current.toISOString().split('T')[0]
    output.push({
      date: dateStr,
      slots: slotsByDate.get(dateStr) || [],
    })
    current.setDate(current.getDate() + 1)
  }

  return output
}

// Booking request structure
export interface BookingRequest {
  coatType: 'single' | 'double'
  slotType: 'any' | 'for_online_small' | 'for_online_large'
  selectedDate: string // YYYY-MM-DD
  selectedTime: string // HH:MM
  customerFirstName: string
  customerLastName?: string
  customerPhone: string
  customerEmail: string
  dogName: string
  dogBreed: string
  dogWeight: string
  doubleCoatBreed?: string
  doubleCoatBreedOther?: string
  service?: string
  weightRange?: string
  estimatedPrice?: number
  specialNotes?: string
  behaviorIssues?: Record<string, any>
  policyAgreedAt?: string
  requestId: string
}

export interface BookingResponse {
  success: boolean
  bookingRef?: string
  appointmentId?: number
  message?: string
  error?: string
}

export async function POST(request: Request) {
  try {
    const body: BookingRequest = await request.json()

    // Required fields
    const requiredFields = [
      'coatType',
      'slotType',
      'selectedDate',
      'selectedTime',
      'customerFirstName',
      'customerPhone',
      'dogName',
      'dogBreed',
      'dogWeight',
      'requestId',
      'policyAgreedAt',
    ]

    for (const field of requiredFields) {
      if (!body[field as keyof BookingRequest]) {
        return NextResponse.json(
          { success: false, error: `Missing required field: ${field}` },
          { status: 400 },
        )
      }
    }

    // Check if OTP was verified
    // if (!body.otpVerified) {
    //   return NextResponse.json(
    //     { success: false, error: 'Phone number must be verified' },
    //     { status: 400 },
    //   )
    // }

    // Validate coat type specific fields
    if (body.coatType === 'single' && (!body.service || !body.weightRange)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Service and weight range required for single coat',
        },
        { status: 400 },
      )
    }
    if (body.coatType === 'double' && !body.doubleCoatBreed) {
      return NextResponse.json(
        { success: false, error: 'Breed selection required for double coat' },
        { status: 400 },
      )
    }

    // Validate phone
    const phoneRegex = /^04\d{8}$/
    const cleanPhone = body.customerPhone.replace(/\s/g, '')
    if (!phoneRegex.test(cleanPhone)) {
      return NextResponse.json(
        { success: false, error: 'Invalid Australian mobile number' },
        { status: 400 },
      )
    }

    // Validate email
    if (body.customerEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(body.customerEmail)) {
        return NextResponse.json(
          { success: false, error: 'Invalid email address' },
          { status: 400 },
        )
      }
    }

    // Prevent duplicate submissions
    const existingBooking = await pool.query(
      `SELECT id FROM grooming.appointments WHERE request_id = $1 LIMIT 1`,
      [body.requestId],
    )
    if (existingBooking.rows.length > 0) {
      return NextResponse.json(
        { success: false, error: 'This booking has already been submitted' },
        { status: 409 },
      )
    }

    // Check slot availability using date + time + type
    const slotCheck = await pool.query(
      `
      SELECT id, capacity, slot_type,
        COALESCE((
          SELECT SUM(a.capacity_units)
          FROM grooming.appointments a
          WHERE a.appointment_slot_id = s.id
            AND (a.appointment_status <> 'x')
        ), 0)::int AS booked_count
      FROM grooming.appointment_slots s
      WHERE s.slot_date = $1
        AND s.slot_time = $2
        AND s.slot_type = $3
        AND s.is_enabled = true
      FOR UPDATE
    `,
      [body.selectedDate, body.selectedTime, body.slotType],
    )

    if (slotCheck.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid or unavailable slot' },
        { status: 400 },
      )
    }

    const slot = slotCheck.rows.find((s) => s.capacity - s.booked_count > 0)

    const availableCount = slot.capacity - slot.booked_count
    if (availableCount <= 0) {
      return NextResponse.json(
        {
          success: false,
          error:
            'This slot is no longer available. Please select another time.',
        },
        { status: 400 },
      )
    }

    // Slot type compatibility (small/large)
    const isLargeBooking = body.estimatedPrice && body.estimatedPrice >= 120
    if (slot.slot_type === 'for_online_small' && isLargeBooking) {
      return NextResponse.json(
        {
          success: false,
          error: 'This slot is only available for smaller dogs',
        },
        { status: 400 },
      )
    }
    if (slot.slot_type === 'for_online_large' && !isLargeBooking) {
      return NextResponse.json(
        {
          success: false,
          error: 'This slot is only available for larger dogs',
        },
        { status: 400 },
      )
    }

    // Build service description
    const todayServices =
      body.coatType === 'double'
        ? `Double-Coat De-Shedding (${body.doubleCoatBreed === 'other' ? body.doubleCoatBreedOther : body.doubleCoatBreed})`
        : `${body.service} (${body.weightRange})`

    // Find or create customer & dog
    const firstName = (body.customerFirstName || '').trim()
    const lastName = (body.customerLastName || '').trim()
    const fullName = [firstName, lastName].filter(Boolean).join(' ')

    let customerId: number | null = null
    let dogId: number | null = null

    const existingCustomer = await pool.query(
      `
      SELECT c.id
      FROM grooming.customers c
      JOIN grooming.customer_phones p ON p.customer_id = c.id
      WHERE p.phone = $1
      LIMIT 1
      `,
      [cleanPhone],
    )

    if (existingCustomer.rows.length > 0) {
      customerId = existingCustomer.rows[0].id

      const existingDog = await pool.query(
        `SELECT id FROM grooming.dogs WHERE customer_id = $1 AND LOWER(dog_name) = LOWER($2) LIMIT 1`,
        [customerId, body.dogName.trim()],
      )

      if (existingDog.rows.length > 0) dogId = existingDog.rows[0].id
    }

    // Insert appointment
    const result = await pool.query(
      `
      INSERT INTO grooming.appointments (
        appointment_slot_id,
        customer_id,
        dog_id,
        appointment_customer_first_name,
        appointment_customer_last_name,
        appointment_customer_name,
        appointment_dog_name,
        appointment_dog_breed,
        appointment_dog_weight,
        appointment_phone,
        appointment_date,
        appointment_time,
        today_services,
        today_price,
        customer_note,
        customer_email,
        behavioral_issues,
        appointment_status,
        booking_source,
        phone_verified,
        policy_agreed_at,
        request_id,
        capacity_units
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
        $11::date,$12::time,$13,$14,$15,$16,$17,
        'confirmed','online',true,$18::timestamptz,$19,1
      )
      RETURNING id
      `,
      [
        slot.id,
        customerId,
        dogId,
        firstName,
        lastName,
        fullName,
        body.dogName,
        body.dogBreed,
        parseFloat(body.dogWeight) || null,
        cleanPhone,
        body.selectedDate,
        body.selectedTime,
        todayServices,
        body.estimatedPrice || null,
        body.specialNotes || null,
        body.customerEmail,
        JSON.stringify(body.behaviorIssues),
        body.policyAgreedAt || new Date(),
        body.requestId,
      ],
    )

    const appointmentId = result.rows[0].id
    const bookingRef = `PG-${appointmentId.toString().padStart(6, '0')}`

    try {
      const dateObj = new Date(body.selectedDate)
      const formattedDate = dateObj.toLocaleDateString('en-US', {
        day: '2-digit',
        month: 'short', // 會顯示 "Mar"
      })

      // 生成訊息
      const message = `Hello from PetsrPeople2\n
      your booking on ${formattedDate} ${body.selectedTime}\n
      To change time, call (03) 9836 7081\n
      Our address: 902 Riversdale Road, Camberwell, VIC 3124\n
      Thank you!`
      await sendSMS([
        {
          to: cleanPhone,
          message,
          sender: process.env.MOBILE_MESSAGE_SENDER || '',
        },
      ])
    } catch (smsErr) {
      console.error('Failed to send booking SMS:', smsErr)
      // 可以選擇不阻斷預約成功
    }

    return NextResponse.json({
      success: true,
      bookingRef,
      appointmentId,
      message: 'Booking confirmed successfully',
    } as BookingResponse)
  } catch (error) {
    console.error('Booking error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to process booking' },
      { status: 500 },
    )
  }
}
