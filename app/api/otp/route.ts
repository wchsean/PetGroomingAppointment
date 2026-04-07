import { NextResponse } from 'next/server'
import pool from '@/lib/db'
import { sendSMS } from '@/lib/mobileMessageApi'
import { Console } from 'console'

export interface OtpSendRequest {
  phone: string
  action: 'send'
}

export interface OtpVerifyRequest {
  phone: string
  code: string
  action: 'verify'
}

const OTP_EXPIRY_MINUTES = 5
const MAX_ATTEMPTS = 5
const RATE_LIMIT_SECONDS = 60

export async function GET(request: Request) {
  const url = new URL(request.url)
  const phone = url.searchParams.get('phone')?.replace(/\s/g, '')
  if (!phone) {
    return NextResponse.json({ error: 'Missing phone number' }, { status: 400 })
  }

  try {
    const result = await pool.query(
      `
      SELECT ch.id
      FROM grooming.customer_phones cp
      JOIN grooming.dogs d ON d.customer_id = cp.customer_id
      JOIN grooming.service_history ch ON ch.dog_id = d.id
      WHERE cp.phone = $1
      LIMIT 1
    `,
      [phone],
    )

    const skipOtp = result.rows.length > 0
    return NextResponse.json({ skipOtp })
  } catch (err: any) {
    console.error(err)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    // Debug log
    const action = body.action as 'send' | 'verify'

    if (action === 'send') {
      return handleSendOtp(body)
    } else if (action === 'verify') {
      return handleVerifyOtp(body)
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('OTP error:', error)
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 },
    )
  }
}

async function handleSendOtp(body: OtpSendRequest) {
  const { phone } = body

  if (!phone) {
    return NextResponse.json({ error: 'Missing phone number' }, { status: 400 })
  }

  // Validate Australian mobile format
  const cleanPhone = phone.replace(/\s/g, '')
  if (!/^04\d{8}$/.test(cleanPhone)) {
    return NextResponse.json(
      { error: 'Invalid Australian mobile number' },
      { status: 400 },
    )
  }

  // Check rate limiting - get the most recent OTP for this phone
  const recentOtp = await pool.query(
    `
    SELECT created_at 
    FROM grooming.otp_verifications
    WHERE phone = $1
      AND created_at > NOW() - INTERVAL '60 seconds'
    ORDER BY created_at DESC
    LIMIT 1
  `,
    [cleanPhone],
  )

  if (recentOtp.rows.length > 0) {
    const createdAt = new Date(recentOtp.rows[0].created_at)
    const waitTime = Math.ceil(
      RATE_LIMIT_SECONDS - (Date.now() - createdAt.getTime()) / 1000,
    )
    return NextResponse.json(
      {
        error: `Please wait ${waitTime} seconds before requesting a new code`,
        waitTime,
      },
      { status: 429 },
    )
  }

  // Generate 6-digit OTP
  const code = Math.floor(100000 + Math.random() * 900000).toString()
  // Debug log

  // Store OTP in database
  await pool.query(
    `
    INSERT INTO grooming.otp_verifications (
      phone,
      otp_code,
      expires_at,
      max_attempts
    ) VALUES (
      $1,
      $2,
      NOW() + INTERVAL '10 minutes',
      $3
    )
  `,
    [cleanPhone, code, MAX_ATTEMPTS],
  )

  // === SEND SMS ===

  try {
    await sendSMS([
      {
        to: cleanPhone,
        message: `Hello from PetsrPeople2! Use ${code} as your verification code. It’s valid for 10 minutes.`,
        sender: process.env.MOBILE_MESSAGE_SENDER || '',
      },
    ])
  } catch (err) {
    console.error('Failed to send OTP SMS:', err)
    return NextResponse.json({ error: 'Failed to send OTP' }, { status: 500 })
  }

  return NextResponse.json({ success: true, message: 'OTP sent successfully' })
}

async function handleVerifyOtp(body: OtpVerifyRequest) {
  // Debug log
  const { phone, code } = body

  if (!phone || !code) {
    return NextResponse.json(
      { error: 'Missing required fields' },
      { status: 400 },
    )
  }

  const cleanPhone = phone.replace(/\s/g, '')
  // Debug log

  // Get the most recent non-expired, non-verified OTP for this phone
  const otpRecord = await pool.query(
    `
    SELECT id, otp_code, attempts, max_attempts
    FROM grooming.otp_verifications
    WHERE phone = $1
      AND expires_at > NOW()
      AND verified = false
    ORDER BY created_at DESC
    LIMIT 1
  `,
    [cleanPhone],
  )
  // Debug log

  if (otpRecord.rows.length === 0) {
    return NextResponse.json(
      { error: 'No OTP found. Please request a new code.' },
      { status: 400 },
    )
  }

  const otp = otpRecord.rows[0]
  // Debug log

  // Check attempts
  if (otp.attempts >= otp.max_attempts) {
    // Mark as verified to prevent further attempts
    await pool.query(
      `
      UPDATE grooming.otp_verifications
      SET verified = true
      WHERE id = $1
    `,
      [otp.id],
    )
    return NextResponse.json(
      { error: 'Too many failed attempts. Please request a new code.' },
      { status: 400 },
    )
  }

  // Verify code
  if (otp.otp_code !== code) {
    // Increment attempts
    await pool.query(
      `

      UPDATE grooming.otp_verifications
      SET attempts = attempts + 1
      WHERE id = $1
    `,
      [otp.id],
    )

    const remainingAttempts = otp.max_attempts - otp.attempts - 1
    return NextResponse.json(
      {
        error: `Invalid code. ${remainingAttempts} attempt${remainingAttempts !== 1 ? 's' : ''} remaining.`,
        remainingAttempts,
      },
      { status: 400 },
    )
  }

  // Success - mark as verified
  await pool.query(
    `
    UPDATE grooming.otp_verifications
    SET verified = true
    WHERE id = $1
  `,
    [otp.id],
  )

  return NextResponse.json({
    success: true,
    message: 'Phone verified successfully',
  })
}
