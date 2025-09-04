import { type NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import type { ApiResponse } from '@/types'

interface Appointment {
  id: number
  dog_id: number | null
  appointment_date: string
  appointment_dog_name: string | null
  appointment_customer_name: string | null
  appointment_phone: string | null
  todays_services: string | null
  todays_price: string | null
  todays_note: string | null
  customer_note: string | null
  appointment_status: string | null
  created_at: string
  updated_at: string
}

// GET /api/appointments/[id] - Get a specific appointment
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse<ApiResponse<any>>> {
  try {
    const { id: appointment_id } = await params

    const appointmentsResult = await pool.query(
      `SELECT a.created_at AS appointment_created_at, a.appointment_time,
        a.appointment_date, a.appointment_status,
        a.appointment_dog_name, a.appointment_customer_name,
        a.appointment_phone,
        a.today_services, a.today_price,
        a.today_note, a.updated_at AS appointment_updated_at,
        a.appointment_dog_breed, a.customer_note,
        d.id AS dog_id, d.dog_name, d.dog_note, d.dog_breed,
        c.id AS customer_id, c.customer_name
      FROM grooming.appointments a 
      LEFT JOIN grooming.dogs d ON a.dog_id = d.id 
      LEFT JOIN grooming.customers c ON d.customer_id = c.id
      WHERE a.id = $1 `,
      [appointment_id]
    )
    console.log('Appointments result:', appointmentsResult.rows)
    if (appointmentsResult.rows.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        message: 'No appointments found for this date',
      })
    }
    const dogIds = [...new Set(appointmentsResult.rows.map((a) => a.dog_id))]

    // 3. 查所有 services，先照日期降序排好
    const servicesResult = await pool.query(
      `
      SELECT s.*, d.dog_name
      FROM grooming.service_history s
      JOIN grooming.dogs d ON s.dog_id = d.id
      WHERE dog_id = ANY($1)
      ORDER BY dog_id, service_date DESC
    `,
      [dogIds]
    )
    const services = servicesResult.rows

    // 4. 整理 service 給每個 dog_id 分組
    const servicesByDog = services.reduce((acc, service) => {
      if (!acc[service.dog_id]) acc[service.dog_id] = []
      acc[service.dog_id].push(service)
      return acc
    }, {} as Record<number, Service[]>)

    const customerIds = appointmentsResult.rows
      .map((r) => r.customer_id)
      .filter(Boolean)
    const phoneResult = await pool.query(
      `SELECT customer_id, phone FROM grooming.customer_phones WHERE customer_id = ANY($1)`,
      [customerIds]
    )
    const phoneMap = phoneResult.rows.reduce((acc, row) => {
      if (!acc[row.customer_id]) acc[row.customer_id] = []
      acc[row.customer_id].push(row.phone)
      return acc
    }, {} as Record<number, string[]>)

    const appointments = appointmentsResult.rows.map((row) => {
      const dogServices = servicesByDog[row.dog_id] || []
      const latestService = dogServices[0] || null

      return {
        id: appointment_id.toString(),
        time: row.appointment_time,
        quickDetails: row.quick_details,
        appointmentCustomerName: row.appointment_customer_name || '',
        appointmentDogName: row.appointment_dog_name || '',
        customerName: row.customer_name || '',
        customerId: row.customer_id || null,
        dogId: row.dog_id || null,
        dogName: row.dog_name || '',
        breed: row.appointment_dog_breed || '',
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
      { status: 500 }
    )
  }
}

// PUT /api/appointments/[id] - Update an appointment
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const { id } = await params // ✅ 正確取得 id
    const body = await request.json()
    const {
      customerName,
      dog_id,
      dogName,
      phone,
      customerNote,
      todaysNote,
      todaysServices,
      todaysPrice,
      status,
      breed,
      appointment_date,
      appointment_time,
    } = body
    console.log('Received body for update:', body)

    // Start a transaction
    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      // Get the current appointment
      const appointmentResult = await client.query(
        'SELECT * FROM grooming.appointments WHERE id = $1',
        [id]
      )

      console.log('Current body:', body)
      console.log('Current appointment:', appointmentResult.rows)
      if (appointmentResult.rows.length === 0) {
        await client.query('ROLLBACK')
        return NextResponse.json(
          {
            success: false,
            error: 'Appointment not found',
          },
          { status: 404 }
        )
      }

      const appointment = appointmentResult.rows[0]
      let dogId = appointment.dog_id
      let date = appointment.date

      // If we have customer details and dogName is provided, update or create customer

      if (customerName || phone || customerNote) {
        // Check if customer exists
        const customerResult = await client.query(
          `SELECT customer_id FROM grooming.dogs WHERE id = $1`,
          [dogId]
        )
        let customerId =
          customerResult.rows.length > 0
            ? customerResult.rows[0].customer_id
            : null
        console.log('Customer ID found:', customerId)
        console.log('customerNote:', customerNote)
      }

      // Update the appointment
      const updateAppointmentResult = await client.query(
        `UPDATE grooming.appointments
         SET appointment_phone = COALESCE($1, appointment_phone),
             appointment_customer_name = COALESCE($2, appointment_customer_name),
             appointment_dog_name = COALESCE($3, appointment_dog_name),
             dog_id = COALESCE($4, dog_id),
             today_services = COALESCE($5, today_services),
             today_price = COALESCE($6, today_price),
             today_note = COALESCE($7, today_note),
             appointment_status = COALESCE($8, appointment_status),
             customer_note = COALESCE($9, customer_note),
             appointment_dog_breed = COALESCE($10, appointment_dog_breed),
             appointment_date = COALESCE($11, appointment_date),
             appointment_time = COALESCE($12, appointment_time),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $13
         RETURNING *`,
        [
          body.phone || null,
          customerName || null,
          dogName || null,
          dog_id || dogId || null,
          todaysServices || null,
          todaysPrice || null,
          todaysNote || null,
          status || appointment.appointment_status,
          customerNote || appointment.customer_note,
          breed || null,
          appointment_date || null,
          appointment_time || null,
          id,
        ]
      )

      if (status === 'P') {
        // 1. 更新 appointment 狀態
        await client.query(
          `UPDATE grooming.appointments 
          SET appointment_active = FALSE,
              appointment_status = $1,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $2`,
          [status, id]
        )
        console.log('Appointment status updated to:', status)

        // 2. 再從 appointments 讀回當前資料（以確認資料是已更新過的）
        const {
          rows: [appointmentAfterUpdate],
        } = await client.query(
          `SELECT dog_id, appointment_date, today_services, today_price, today_note, customer_note
          FROM grooming.appointments
          WHERE id = $1`,
          [id]
        )
        const {
          dog_id,
          appointment_date,
          today_services,
          today_price,
          today_note,
          customer_note,
        } = appointmentAfterUpdate

        //檢查是否需要更新 grooming.customers.customer_note
        const {
          rows: [customerData],
        } = await client.query(
          `SELECT c.id AS customer_id, c.customer_note
          FROM grooming.dogs d
          JOIN grooming.customers c ON d.customer_id = c.id
          WHERE d.id = $1`,
          [dog_id]
        )

        if (customerData && customer_note !== customerData.customer_note) {
          await client.query(
            `UPDATE grooming.customers 
            SET customer_note = $1, updated_at = CURRENT_TIMESTAMP
            WHERE id = $2`,
            [customer_note || null, customerData.customer_id]
          )
          console.log(
            'Updated customer_note for customer_id:',
            customerData.customer_id
          )
        }

        // 3. 根據 appointment 的內容，決定要 insert 或 update services 表

        const existingService = await client.query(
          `SELECT id FROM grooming.service_history WHERE dog_id = $1 AND service_date = $2`,
          [dog_id, appointment_date]
        )
        console.log('Existing service record found:', existingService)

        if (existingService.rowCount > 0) {
          await client.query(
            `UPDATE grooming.service_history
            SET service = $1,
                service_price = $2,
                service_note = $3,
                updated_at = CURRENT_TIMESTAMP
            WHERE dog_id = $4 AND service_date = $5`,
            [
              today_services || null,
              today_price || null,
              today_note || null,
              dog_id,
              appointment_date,
            ]
          )
        } else {
          await client.query(
            `INSERT INTO grooming.service_history 
            (dog_id, service_date, service, service_price, service_note, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
            [
              dog_id,
              appointment_date,
              today_services || null,
              today_price || null,
              today_note || null,
            ]
          )
          console.log('Inserted new service record for dog_id:', dog_id)
        }
      }

      await client.query('COMMIT')

      return NextResponse.json({
        success: true,
        data: updateAppointmentResult.rows[0],
        message: 'Appointment updated successfully',
      })
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  } catch (error) {
    console.error('Error updating appointment:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update appointment',
      },
      { status: 500 }
    )
  }
}

// DELETE /api/appointments/[id] - Delete an appointment
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse<ApiResponse<null>>> {
  try {
    const { id } = await params

    const result = await pool.query(
      'DELETE FROM grooming.appointments WHERE id = $1 RETURNING id',
      [id]
    )

    if (result.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Appointment not found',
        },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Appointment deleted successfully',
    })
  } catch (error) {
    console.error('Error deleting appointment:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete appointment',
      },
      { status: 500 }
    )
  }
}
