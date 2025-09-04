import { type NextRequest, NextResponse } from "next/server"
import pool from "@/lib/db"
import type { ApiResponse, Appointment } from "@/types"
import { getLatestServiceHistory } from "@/lib/db"

// GET /api/appointments - Get appointments for a specific date
export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<any[]>>> {
  try {
    const searchParams = request.nextUrl.searchParams
    const date = searchParams.get("date")

    if (!date) {
      return NextResponse.json(
        {
          success: false,
          error: "Date parameter is required",
        },
        { status: 400 },
      )
    }

    // Get appointments for the specified date with dog and customer info
    const appointmentsResult = await pool.query(
      `SELECT a.id AS appointment_id, a.created_at AS appointment_created_at, a.appointment_time,
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
      WHERE a.appointment_date = $1 
      ORDER BY a.appointment_time ASC`,
      [date],
    )
    console.log("Appointments result:", appointmentsResult.rows)
    if (appointmentsResult.rows.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        message: "No appointments found for this date",
      })
    }
    const dogIds = [...new Set(appointmentsResult.rows.map(a => a.dog_id))]

    // 3. 查所有 services，先照日期降序排好
    const servicesResult = await pool.query(`
      SELECT s.*, d.dog_name
      FROM grooming.service_history s
      JOIN grooming.dogs d ON s.dog_id = d.id
      WHERE dog_id = ANY($1)
      ORDER BY dog_id, service_date DESC
    `, [dogIds])
    const services = servicesResult.rows

    // 4. 整理 service 給每個 dog_id 分組
    const servicesByDog = services.reduce((acc, service) => {
      if (!acc[service.dog_id]) acc[service.dog_id] = []
      acc[service.dog_id].push(service)
      return acc
    }, {} as Record<number, Service[]>)


    const customerIds = appointmentsResult.rows.map(r => r.customer_id).filter(Boolean)
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
        id: row.appointment_id.toString(),
        time: row.appointment_time,
        quickDetails: row.quick_details,
        appointmentCustomerName: row.appointment_customer_name || "",
        appointmentDogName: row.appointment_dog_name || "",
        customerName: row.customer_name || "",
        customerId: row.customer_id || null,
        dogId: row.dog_id || null,
        dogName: row.dog_name || "",
        breed:row.appointment_dog_breed || "",
        phone: row.appointment_phone || "",
        customerPhone: phoneMap[row.customer_id] || [],
        dogNote: row.dog_note || "",
        customerNote: row.customer_note || "",
        todaysNote: row.today_note || "",
        previousServices: latestService?.service || "",
        previousPrice: latestService?.service_price || "",
        serviceHistory: dogServices || [],
        todaysServices: row.today_services || "",
        todaysPrice: row.today_price || "",
        status: row.appointment_status,
      }
    })

    return NextResponse.json({
      success: true,
      data: appointments,
    })
  } catch (error) {
    console.error("Error fetching appointments:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch appointments",
      },
      { status: 500 },
    )
  }
}

// POST /api/appointments - Create a new appointment
export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<Appointment>>> {
  try {
    const body = await request.json()
    console.log("Received body:", body)
    const {
      date,
      time,
      customerName,
      dogId,
      dogName,
      breed,
      phone,
      dogNote,
      customerNote,
      todaysNote,
      todaysServices,
      todaysPrice,
      status,
    } = body

    // Validate required fields
    if (!date || !time || !dogName ) {
      return NextResponse.json(
        {
          success: false,
          error: "Date, time, and dog name are required",
        },
        { status: 400 },
      )
    }

    // Start a transaction
    const client = await pool.connect()
    try {
      await client.query("BEGIN")

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
      //       console.log("Found existing customer by phone:", row.customer_id)

      //       customerId = row.customer_id
      //       console.log("Found existing customer by phone:", customerId)

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
      // Create the appointment
      const appointmentResult = await client.query(
        `INSERT INTO grooming.appointments 
        (appointment_dog_name, appointment_customer_name, dog_id, appointment_date, appointment_time, appointment_phone, today_services, today_price, today_note, customer_note, appointment_status,  appointment_dog_breed) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *`,
        [
          dogName || null,
          customerName || null,
          dogId || null,
          date,
          time,
          phone,
          todaysServices || null,
          todaysPrice || null,
          todaysNote || null,
          customerNote || null,
          status || "no-status",
          breed|| null,
        ],
      )

      await client.query("COMMIT")
      console.log("Appointment created successfully:", appointmentResult.rows[0])
      return NextResponse.json({
        success: true,
        data: appointmentResult.rows[0],
        message: "Appointment created successfully",
      })
    } catch (error) {
      await client.query("ROLLBACK")
      throw error
    } finally {
      client.release()
    }
  } catch (error) {
    console.error("Error creating appointment:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to create appointment",
      },
      { status: 500 },
    )
  }
}
