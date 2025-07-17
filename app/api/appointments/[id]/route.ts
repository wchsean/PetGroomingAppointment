import { type NextRequest, NextResponse } from "next/server"
import pool from "@/lib/db"
import type { ApiResponse } from "@/types"

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
  { params }: { params: { id: string } },
): Promise<NextResponse<ApiResponse<any>>> {
  try {
    const {id:appointment_id} = await params

    const appointmentResult = await pool.query(
      "SELECT * FROM grooming.appointments WHERE id = $1",
      [appointment_id],
    )
    if (appointmentResult.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Appointment not found",
        },
        { status: 404 },
      )
    }
    const appointmentRow = appointmentResult.rows[0]

    let dogRow = {}
    let customerRow = {}
    let phoneNumbers: string[] = []
    let serviceRows = {}
    console.log("appointmentRow",appointmentRow)
    if (appointmentRow.dog_id) {
      
      // Fetch dog and customer details
      const dogResult = await pool.query(
        "SELECT * FROM grooming.dogs WHERE id = $1",
        [appointmentRow.dog_id],
      )
      dogRow = dogResult.rows[0]
      console.log("Fetched dog row:", dogRow)

      const customerResult = await pool.query(
        "SELECT * FROM grooming.customers WHERE id = $1",
        [dogRow.customer_id],
      )
      customerRow = customerResult.rows[0]
      console.log("Fetched customer row:", customerRow)

      // 取客戶所有電話
      const phoneResult = await pool.query(
        "SELECT phone FROM grooming.customer_phones WHERE customer_id = $1",
        [dogRow.customer_id],
      )
      phoneNumbers = phoneResult.rows.map(r => r.phone)
    


      // Fetch service history for the dog
      const serviceResult = await pool.query(
        `
        SELECT s.*, d.dog_name
        FROM grooming.service_history s
        JOIN grooming.dogs d ON s.dog_id = d.id
        WHERE s.dog_id = $1
        ORDER BY s.service_date DESC, s.created_at DESC
        `,
        [appointmentRow.dog_id],
      )
      serviceRows = serviceResult.rows
      // Format the data for frontend
    }
    const data:any = {
      appointment:appointmentRow,
      dog: dogRow || {},
      customer: { ...customerRow, phones: phoneNumbers },
      serviceHistory: serviceRows  || [],
    }
    console.log("Formatted appointment data:", data)

    return NextResponse.json({
      success: true,
      data,
    })
  } catch (error) {
    console.error("Error fetching appointment:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch appointment",
      },
      { status: 500 },
    )
  }
}

// PUT /api/appointments/[id] - Update an appointment
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const {id} = await params// ✅ 正確取得 id
    const body = await request.json()
    const { customerName, dog_id , dogName, phone, customerNote, todaysNote, todaysServices, todaysPrice, status, breed} = body

    // Start a transaction
    const client = await pool.connect()
    try {
      await client.query("BEGIN")

      // Get the current appointment
      const appointmentResult = await client.query("SELECT * FROM grooming.appointments WHERE id = $1", [id])

      console.log("Current body:", body)
      console.log("Current appointment:", appointmentResult.rows)
      if (appointmentResult.rows.length === 0) {
        await client.query("ROLLBACK")
        return NextResponse.json(
          {
            success: false,
            error: "Appointment not found",
          },
          { status: 404 },
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
          [dogId],
        )
        let customerId = customerResult.rows.length > 0 ? customerResult.rows[0].customer_id : null
        console.log("Customer ID found:", customerId)
        console.log("customerNote:", customerNote)

      }

            // Update the appointment
      const updateAppointmentResult = await client.query(
        `UPDATE grooming.appointments
         SET appointment_phone = COALESCE($1, appointment_phone),
             dog_id = COALESCE($2, dog_id),
             today_services = COALESCE($3, today_services),
             today_price = COALESCE($4, today_price),
             today_note = COALESCE($5, today_note),
             appointment_status = COALESCE($6, appointment_status),
             customer_note = COALESCE($7, customer_note),
             appointment_dog_breed = COALESCE($9, appointment_dog_breed),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $8
         RETURNING *`,
        [body.phone || null, dog_id || dogId || null, todaysServices || null, todaysPrice || null, todaysNote || null, status || appointment.appointment_status, customerNote || appointment.customer_note, id, breed || null]
      )


      if (status === "P") {
        // 1. 更新 appointment 狀態
        await client.query(
          `UPDATE grooming.appointments 
          SET appointment_active = FALSE,
              appointment_status = $1,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $2`,
          [status, id]
        )
        console.log("Appointment status updated to:", status)

        // 2. 再從 appointments 讀回當前資料（以確認資料是已更新過的）
        const { rows: [appointmentAfterUpdate] } = await client.query(
          `SELECT dog_id, appointment_date, today_services, today_price, today_note, customer_note
          FROM grooming.appointments
          WHERE id = $1`,
          [id]
        )
        const { dog_id, appointment_date, today_services, today_price, today_note, customer_note } = appointmentAfterUpdate

        //檢查是否需要更新 grooming.customers.customer_note
        const { rows: [customerData] } = await client.query(
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
          console.log("Updated customer_note for customer_id:", customerData.customer_id)
        }

        // 3. 根據 appointment 的內容，決定要 insert 或 update services 表


        const existingService = await client.query(
          `SELECT id FROM grooming.service_history WHERE dog_id = $1 AND service_date = $2`,
          [dog_id, appointment_date]
        )
        console.log("Existing service record found:", existingService)

        if (existingService.rowCount > 0) {
          await client.query(
            `UPDATE grooming.service_history
            SET service = $1,
                service_price = $2,
                service_note = $3,
                updated_at = CURRENT_TIMESTAMP
            WHERE dog_id = $4 AND service_date = $5`,
            [today_services || null, today_price || null, today_note || null, dog_id, appointment_date]
          )
        } else {
          await client.query(
            `INSERT INTO grooming.service_history 
            (dog_id, service_date, service, service_price, service_note, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
            [dog_id, appointment_date, today_services || null, today_price || null, today_note || null]
          )
          console.log("Inserted new service record for dog_id:", dog_id)
        }
      }

      await client.query("COMMIT")

      return NextResponse.json({
        success: true,
        data: updateAppointmentResult.rows[0],
        message: "Appointment updated successfully",
      })
    } catch (error) {
      await client.query("ROLLBACK")
      throw error
    } finally {
      client.release()
    }
  } catch (error) {
    console.error("Error updating appointment:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update appointment",
      },
      { status: 500 },
    )
  }
}

// DELETE /api/appointments/[id] - Delete an appointment
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse<ApiResponse<null>>> {
  try {
    const {id} = await params

    const result = await pool.query("DELETE FROM grooming.appointments WHERE id = $1 RETURNING id", [id])

    if (result.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Appointment not found",
        },
        { status: 404 },
      )
    }

    return NextResponse.json({
      success: true,
      message: "Appointment deleted successfully",
    })
  } catch (error) {
    console.error("Error deleting appointment:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to delete appointment",
      },
      { status: 500 },
    )
  }
}
