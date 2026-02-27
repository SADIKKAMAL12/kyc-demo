// src/app/api/admin/generate-link/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { GenerateLinkPayload } from '@/types'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  try {
    // Verify admin is authenticated
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: GenerateLinkPayload = await request.json()
    const { first_name, last_name, email } = body

    if (!first_name?.trim() || !last_name?.trim() || !email?.trim()) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 })
    }

    // Generate cryptographically secure token
    const token = crypto.randomBytes(32).toString('hex')

    // Set expiry to 7 days from now
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    const adminClient = createAdminClient()

    const { data, error } = await adminClient
      .from('kyc_requests')
      .insert({
        token,
        first_name: first_name.trim(),
        last_name: last_name.trim(),
        email: email.trim().toLowerCase(),
        status: 'pending',
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single()

    if (error) {
      console.error('DB error:', error)
      return NextResponse.json({ error: 'Failed to create KYC request' }, { status: 500 })
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const link = `${appUrl}/kyc/verify?token=${token}`

    return NextResponse.json({
      token,
      link,
      kyc_request_id: data.id,
    })
  } catch (error) {
    console.error('Generate link error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
