// /app/api/daily-notes/route.ts
import { type NextRequest, NextResponse } from 'next/server'
import type { Daily_note } from '@/types'
import pool from '@/lib/db'

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')

    if (!date) {
      return NextResponse.json(
        { success: false, error: 'Missing date parameter' },
        { status: 400 }
      )
    }

    // 假設我們從資料庫中獲取每日筆記
    const result = await pool.query<Daily_note>(
      'SELECT * FROM grooming.daily_notes WHERE daily_note_date = $1',
      [date]
    )
    // 處理邏輯
    return NextResponse.json({
      success: true,
      data: result.rows[0] || {}, // 返回第一條記錄或空對象
      message: 'get daily note  successfully',
    })
  } catch (error) {
    console.error('Error fetching daily notes:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch daily notes' },
      { status: 500 }
    )
  }
}

// POST /api/daily-notes - Create or update daily notes
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json()
    const { date, note } = body

    if (!date || !note) {
      return NextResponse.json(
        { success: false, error: 'Date and note are required' },
        { status: 400 }
      )
    }

    const result = await pool.query(
      `INSERT INTO grooming.daily_notes (daily_note_date, daily_note)
       VALUES ($1, $2)
       ON CONFLICT (daily_note_date) DO UPDATE SET daily_note = EXCLUDED.daily_note
       RETURNING *`,
      [date, note]
    )

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: 'create or update daily note successfully',
    })
  } catch (error) {
    console.error('Error creating or updating daily notes:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// export async function POST(request: NextRequest): Promise<NextResponse> {
//     try {
//         const body = await request.json()
//         const { date, note } = body

//         if (!date || !note) {
//             return NextResponse.json({ success: false, error: "Date and note are required" }, { status: 400 })
//         }
//         const client = await pool.connect()
//         try {
//             await client.query("BEGIN")
//             const result = await client.query(
//                 `INSERT INTO grooming.daily_notes (date, note)
//                 VALUES ($1, $2)
//                 ON CONFLICT (date) DO UPDATE SET note = EXCLUDED.note
//                 RETURNING *`,
//                 [date, note]
//             )
//             await client.query("COMMIT")

//             return NextResponse.json({
//                 success: true,
//                 data: result.rows[0],
//                 message:'create or update daily note successfully',
//             })
//         } catch (error) {
//             await client.query("ROLLBACK")
//             console.error("Error creating or updating daily notes:", error)
//             return NextResponse.json({ success: false, error: "Failed to create or update daily notes" }, { status: 500 })
//         } finally {
//             client.release()
//         }
//     } catch (error) {
//         console.error("Error creating or updating daily notes:", error)
//         return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
//     }
// }
// 如果使用 ON CONFLICT 語句，則不需要手動檢查是否存在
// 這裡假設我們使用 ON CONFLICT 語句來處理插入或更新
// const pool = await getPool() // 獲取資料庫連接池
// const client = await pool.connect()
// await client.query("BEGIN")
// await client.query("COMMIT")
// client.release()

// 假設我們將每日筆記插入或更新到資料庫
//         const result = await pool.query(
//             `INSERT INTO grooming.daily_notes (date, note)
//              VALUES ($1, $2)
//              ON CONFLICT (date) DO UPDATE SET note = EXCLUDED.note
//              RETURNING *`,
//             [date, note]
//         )

//         return NextResponse.json({
//             success: true,
//             data: result.rows[0],
//             message:'create or update daily note successfully',
//         })
//     } catch (error) {
//         console.error("Error creating or updating daily notes:", error)
//         return NextResponse.json({ success: false, error: "Failed to create or update daily notes" }, { status: 500 })
//     }
// }
