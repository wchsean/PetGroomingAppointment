import { type NextRequest, NextResponse } from "next/server"
import pool from "@/lib/db"
import type { ApiResponse, Customer, Dog } from "@/types"



// GET /api/customers - Search customers by name, dog name, or phone
export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<Customer[]>>> {
  try {
    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get("search")

    if (!search || search.length < 2) {
      return NextResponse.json(
        {
          success: false,
          error: "Search term must be at least 2 characters",
        },
        { status: 400 },
      )
    }

    // Search for customers by name, dog name, or phone
    const result = await pool.query(
      `
      SELECT 
        c.*, 
        COALESCE(
          ARRAY_AGG(DISTINCT p.phone) FILTER (WHERE p.phone IS NOT NULL),
          '{}'
        ) AS phone
      FROM grooming.customers c
      LEFT JOIN grooming.dogs d ON c.id = d.customer_id
      LEFT JOIN grooming.customer_phones p ON c.id = p.customer_id
      WHERE 
        c.customer_name ILIKE $1 OR 
        EXISTS (
          SELECT 1 FROM grooming.customer_phones cp 
          WHERE cp.customer_id = c.id AND cp.phone ILIKE $2
        ) OR 
        d.dog_name ILIKE $3
      GROUP BY c.id
      ORDER BY c.updated_at DESC
      LIMIT 20
      `,
      [`%${search}%`, `%${search}%`, `%${search}%`],
    )

    // Get dogs for each customer
    const customers = result.rows
    const customerIds = customers.map((c) => c.id)

    if (customerIds.length > 0) {
      const dogsResult = await pool.query(
      `
        SELECT 
          d.*,
          COALESCE(
            JSON_AGG(
              jsonb_build_object(
                'service_date', s.service_date,
                'service', s.service,
                'service_price', s.service_price,
                'service_note', s.service_note
              )
              ORDER BY s.service_date DESC
            ) FILTER (WHERE s.id IS NOT NULL),
            '[]'
          ) AS services
        FROM grooming.dogs d
        LEFT JOIN grooming.service_history s ON s.dog_id = d.id
        WHERE d.customer_id = ANY($1)
        GROUP BY d.id
        ORDER BY d.dog_name
        `,
        [customerIds],
      )

      // Group dogs by customer_id
      const dogsByCustomer = dogsResult.rows.reduce((acc: Record<number, Dog[]>, dog: Dog) => {
        if (!acc[dog.customer_id]) {
          acc[dog.customer_id] = []
        }


        dog.previous_service = dog.services.length > 0 ?dog.services[0].service_date + dog.services[0].service : null
        dog.previous_price = dog.services.length > 0 ? dog.services[0].service_price : null
        console.log("dog.services.length", dog.previous_service)
        acc[dog.customer_id].push(dog)
        return acc
      }, {})

      // Add dogs to each customer
      customers.forEach((customer: Customer) => {
        customer.dogs = dogsByCustomer[customer.id] || []
      })
    }
    console.log("Customers found:", customers, customers.dogs)
    console.log("Dogs found:", customers.map(c => c.dogs))
    return NextResponse.json({
      success: true,
      data: customers,
    })
  } catch (error) {
    console.error("Error searching customers:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to search customers",
      },
      { status: 500 },
    )
  }
}

// POST /api/customers - Create a new customer
export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<Customer>>> {
  try {
    const body = await request.json()
    const { name, phone, customerNote, dogs } = body

    // Start a transaction
    const client = await pool.connect()
    try {
      await client.query("BEGIN")

      // Create customer
      const customerResult = await client.query(
        `INSERT INTO grooming.customers 
        (customer_name, customer_active, customer_note, updated_at) 
        VALUES ($1, TRUE, $2, CURRENT_TIMESTAMP) 
        RETURNING *`,
        [name, customerNote || ""],
      )
      
      const customer = customerResult.rows[0]

      if (Array.isArray(phone) && phone.length > 0) {
        for (const number of phone) {
          await client.query(
            `INSERT INTO grooming.customer_phones (customer_id, phone) VALUES ($1, $2)`,
            [customer.id, number],
          )
        }
      }


      // Create dogs if provided
      if (dogs && Array.isArray(dogs) && dogs.length > 0) {
        for (const dog of dogs) {
          await client.query(
            `INSERT INTO grooming.dogs 
            (customer_id, dog_name, dog_breed, dog_note) 
            VALUES ($1, $2, $3, $4)`,
            [customer.id, dog.name, dog.breed, dog.note],
          )
        }
      }

      await client.query("COMMIT")

      // Get the complete customer with dogs
      const result = await pool.query(
        `
        SELECT c.*, 
              COALESCE(ARRAY_AGG(p.phone) FILTER (WHERE p.phone IS NOT NULL), '{}') AS phone,
              COALESCE(JSON_AGG(d.*) FILTER (WHERE d.id IS NOT NULL), '[]') AS dogs
        FROM grooming.customers c
        LEFT JOIN grooming.customer_phones p ON c.id = p.customer_id
        LEFT JOIN grooming.dogs d ON c.id = d.customer_id
        WHERE c.id = $1
        GROUP BY c.id
        `,
        [customer.id],
      )

      return NextResponse.json({
        success: true,
        data: result.rows[0],
        message: "Customer created successfully",
      })
    } catch (error) {
      await client.query("ROLLBACK")
      throw error
    } finally {
      client.release()
    }
  } catch (error) {
    console.error("Error creating customer:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to create customer",
      },
      { status: 500 },
    )
  }
}
