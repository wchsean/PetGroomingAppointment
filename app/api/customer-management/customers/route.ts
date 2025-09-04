import { type NextRequest, NextResponse } from "next/server"
import pool from "@/lib/db"

// GET /api/customer-management/customers - 獲取客戶列表
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get("search")
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "20")
    const offset = (page - 1) * limit

    let query = `
      SELECT 
        c.*,
        json_agg(
          DISTINCT jsonb_build_object(
            'id', cp.id,
            'phone_owner', cp.phone_owner,
            'phone', cp.phone,
            'phone_type', cp.phone_type,
            'is_primary', cp.is_primary
          )
        ) FILTER (WHERE cp.id IS NOT NULL) as phones,
        json_agg(
          DISTINCT jsonb_build_object(
            'id', d.id,
            'dog_name', d.dog_name,
            'dog_breed', d.dog_breed,
            'dog_active', d.dog_active
          )
        ) FILTER (WHERE d.id IS NOT NULL) as dogs,
        COUNT(DISTINCT d.id) as total_dogs,
        COUNT(DISTINCT CASE WHEN d.dog_active = true THEN d.id END) as active_dogs
      FROM grooming.customers c
      LEFT JOIN grooming.customer_phones cp ON c.id = cp.customer_id
      LEFT JOIN grooming.dogs d ON c.id = d.customer_id
      WHERE c.customer_active = true
    `

    const queryParams = []

    if (search && search.length >= 2) {
      query += ` AND (
        c.customer_name ILIKE $${queryParams.length + 1} OR
        cp.phone LIKE $${queryParams.length + 1} OR
        d.dog_name ILIKE $${queryParams.length + 1}
      )`
      queryParams.push(`%${search}%`)
    }

    query += `
      GROUP BY c.id
      ORDER BY c.updated_at DESC
      LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}
    `
    queryParams.push(limit, offset)

    const result = await pool.query(query, queryParams)

    // 獲取總數
    let countQuery = `
      SELECT
        COUNT(DISTINCT c.id) as total_customers,
        COUNT(DISTINCT d.id) AS total_dogs_across_customers
      FROM grooming.customers c
      LEFT JOIN grooming.customer_phones cp ON c.id = cp.customer_id
      LEFT JOIN grooming.dogs d ON c.id = d.customer_id
      WHERE c.customer_active = true
    `;

    const countParams = []
    if (search && search.length >= 2) {
      countQuery += ` AND (
        c.customer_name ILIKE $1 OR
        cp.phone LIKE $1 OR
        d.dog_name ILIKE $1
      )`
      countParams.push(`%${search}%`)
    }

    const countResult = await pool.query(countQuery, countParams)
    const total_customers = Number.parseInt(countResult.rows[0].total_customers)
    const total_dogs_across_customers = Number.parseInt(countResult.rows[0].total_dogs_across_customers)
    console.log("Total countResult:", countResult)
    console.log("result:",  result.rows)

    return NextResponse.json({
      success: true,
      data: {
        customers: result.rows,
        pagination: {
          page,
          limit,
          total_customers,
          total_dogs_across_customers,
          totalPages: Math.ceil(total_customers / limit),
        },
        countResult: countResult.rows[0],
      },
    })
  } catch (error) {
    console.error("Error fetching customers:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch customers" }, { status: 500 })
  }
}

// POST /api/customer-management/customers - 創建新客戶
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { customer_name, customer_note, phones, dogs } = body

    const client = await pool.connect()
    try {
      await client.query("BEGIN")

      // 創建客戶
      const customerResult = await client.query(
        `INSERT INTO grooming.customers (customer_name, customer_note)
         VALUES ($1, $2) RETURNING *`,
        [customer_name, customer_note],
      )

      const customer = customerResult.rows[0]

      // 添加電話
      if (phones && phones.length > 0) {
        for (const phone of phones) {
          await client.query(
            `INSERT INTO grooming.customer_phones 
             (customer_id, phone_owner, phone, phone_type, is_primary)
             VALUES ($1, $2, $3, $4, $5)`,
            [customer.id, phone.phone_owner, phone.phone, phone.phone_type, phone.is_primary],
          )
        }
      }

      // 添加狗
      if (dogs && dogs.length > 0) {
        for (const dog of dogs) {
          await client.query(
            `INSERT INTO grooming.dogs 
             (customer_id, dog_name, dog_breed, dog_note)
             VALUES ($1, $2, $3, $4)`,
            [customer.id, dog.dog_name, dog.dog_breed, dog.dog_note],
          )
        }
      }

      await client.query("COMMIT")

      return NextResponse.json({
        success: true,
        data: customer,
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
    return NextResponse.json({ success: false, error: "Failed to create customer" }, { status: 500 })
  }
}
