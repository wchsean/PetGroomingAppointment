import { type NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import type { ApiResponse, Appointment } from '@/types'
import { getServiceHistoryByDogIds } from '@/lib/db/serviceHistory'

// GET /api/appointments - Get appointments for a specific date
export async function GET(
  request: NextRequest,
): Promise<NextResponse<ApiResponse<any[]>>> {
  try {
    const searchParams = request.nextUrl.searchParams
    const date = searchParams.get('date')

    if (!date) {
      return NextResponse.json(
        {
          success: false,
          error: 'Date parameter is required',
        },
        { status: 400 },
      )
    }

    // Get appointments for the specified date with dog and customer info
    const appointmentsResult = await pool.query(
      `SELECT a.id AS appointment_id, a.created_at AS appointment_created_at, to_char(a.appointment_time, 'HH24:MI') AS appointment_time,
        a.appointment_date, a.appointment_status, a.appointment_slot_id, 
        a.appointment_dog_name, a.appointment_customer_name,
        a.appointment_phone, a.customer_email, a.appointment_dog_weight, a.behavioral_issues,
        a.appointment_dog_appearance,
        a.today_services, a.today_price,
        a.today_note, a.updated_at AS appointment_updated_at,
        a.appointment_dog_breed, a.customer_note,
        d.id AS dog_id, d.dog_name, d.dog_note, d.dog_breed, d.dog_weight, d.dog_appearance, d.behavior_profile,
        c.id AS customer_id, c.customer_name
      FROM grooming.appointments a 
      LEFT JOIN grooming.dogs d ON a.dog_id = d.id 
      LEFT JOIN grooming.customers c ON d.customer_id = c.id
      WHERE a.appointment_date = $1 
      ORDER BY a.appointment_time ASC`,
      [date],
    )

    if (appointmentsResult.rows.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        message: 'No appointments found for this date',
      })
    }
    const dogIds = [...new Set(appointmentsResult.rows.map((a) => a.dog_id))]

    const servicesByDog = await getServiceHistoryByDogIds(dogIds)

    const customerIds = appointmentsResult.rows
      .map((r) => r.customer_id)
      .filter(Boolean)
    const phoneResult = await pool.query(
      `SELECT customer_id, phone FROM grooming.customer_phones WHERE customer_id = ANY($1)`,
      [customerIds],
    )
    const phoneMap = phoneResult.rows.reduce(
      (acc, row) => {
        if (!acc[row.customer_id]) acc[row.customer_id] = []
        acc[row.customer_id].push(row.phone)
        return acc
      },
      {} as Record<number, string[]>,
    )
    const appointments = appointmentsResult.rows.map((row) => {
      const dogServices = servicesByDog[row.dog_id] || []
      const latestService = dogServices[0] || null

      return {
        id: row.appointment_id.toString(),
        appointmentslotId: row.appointment_slot_id,
        time: row.appointment_time,
        quickDetails: row.quick_details,
        appointmentCustomerName: row.appointment_customer_name || '',
        appointmentDogName: row.appointment_dog_name || '',
        customerName: row.customer_name || '',
        customerId: row.customer_id || null,
        customerEmail: row.customer_email || '',
        dogId: row.dog_id || null,
        dogName: row.dog_name || '',
        breed: row.appointment_dog_breed || '',
        dogAppearance:
          row.appointment_dog_appearance || row.dog_appearance || '',
        phone: row.appointment_phone || '',
        customerPhone: phoneMap[row.customer_id] || [],
        dogNote: row.dog_note || '',
        customerNote: row.customer_note || '',
        todaysNote: row.today_note || '',
        previousServices: latestService?.service || '',
        previousPrice: latestService?.service_price || '',
        serviceHistory: dogServices || [],
        todaysServices: row.today_services || '',
        todaysPrice: row.today_price || '',
        dogWeight: row.appointment_dog_weight || row.dog_weight || null,
        behavioralIssues: row.behavioral_issues || [],
        status: row.appointment_status,
      }
    })

    return NextResponse.json({
      success: true,
      data: appointments,
    })
  } catch (error) {
    console.error('Error fetching appointments:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch appointments',
      },
      { status: 500 },
    )
  }
}

// POST /api/appointments - Create a new appointment
export async function POST(
  request: NextRequest,
): Promise<NextResponse<ApiResponse<Appointment>>> {
  try {
    const body = await request.json()

    const {
      date,
      appointmentSlotId,
      time,
      customerName,
      dogId,
      dogName,
      breed,
      dogAppearance,
      phone,
      dogNote,
      customerNote,
      todaysNote,
      todaysServices,
      todaysPrice,
      dogWeight,
      behavioralIssues,
      status,
    } = body

    // Validate required fields
    if (!date || !time || !dogName || !appointmentSlotId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Date, time, dog name, and appointment slot ID are required',
        },
        { status: 400 },
      )
    }

    // Start a transaction
    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      // let customerId = null
      // let dogId = null

      // let customerResult = null
      // let dogResult = null
      // let targetDog = null
      // // Try to find existing customer by phone
      // if (phone) {
      //   customerResult = await client.query(
      //     "SELECT customer_id FROM grooming.customer_phones WHERE phone =$1",
      //     [phone]
      //   )

      //   if (customerResult.rows.length > 0) {
      //     // If customer exists and have mutilpale, get their ID by dog name
      //     for (const row of customerResult.rows) {
      //

      //       customerId = row.customer_id
      //

      //       dogResult = await client.query(
      //         "SELECT id, dog_name FROM grooming.dogs WHERE customer_id = $1",
      //         [customerId]
      //       )

      //       if (dogResult.rows.length > 0) {
      //         targetDog = dogResult.rows.find(
      //           (dog) => dog.dog_name.toLowerCase() === dogName.toLowerCase()
      //         )

      //         if (targetDog) {
      //           dogId = targetDog.id|| ""
      //           continue
      //         }
      //       }
      //     }
      //   }
      // }
      // Ensure there is an appointment_slot for this date/time. If not, create one.
      let slotId: number
      if (appointmentSlotId === '0') {
        const createdSlot = await client.query(
          `INSERT INTO grooming.appointment_slots (slot_date, slot_time, slot_type, capacity, is_enabled)
          VALUES ($1, $2, $3, $4, $5) RETURNING *`,
          [date, time, 'local', 1, true],
        )
        slotId = createdSlot.rows[0].id
      } else {
        slotId = appointmentSlotId
      }

      // Create the appointment (linked to slot)
      const appointmentResult = await client.query(
        `INSERT INTO grooming.appointments 
        (appointment_dog_name, appointment_customer_name, dog_id, appointment_date, appointment_time, appointment_phone, appointment_dog_weight, appointment_dog_appearance, behavioral_issues, today_services, today_price, today_note, customer_note, appointment_status, appointment_dog_breed, appointment_slot_id) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        RETURNING *`,
        [
          dogName || null,
          customerName || null,
          dogId || null,
          date,
          time,
          phone,
          dogWeight || null,
          dogAppearance || null,
          behavioralIssues
            ? JSON.stringify(behavioralIssues)
            : JSON.stringify([]),
          todaysServices || null,
          todaysPrice || null,
          todaysNote || null,
          customerNote || null,
          status || 'no-status',
          breed || null,
          slotId,
        ],
      )

      await client.query('COMMIT')

      return NextResponse.json({
        success: true,
        data: appointmentResult.rows[0],
        message: 'Appointment created successfully',
      })
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  } catch (error) {
    console.error('Error creating appointment:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create appointment',
      },
      { status: 500 },
    )
  }
}
