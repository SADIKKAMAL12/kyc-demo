// src/app/api/kyc/validate-token/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 })
    }

    const adminClient = createAdminClient()

    const { data, error } = await adminClient
      .from('kyc_requests')
      .select('*')
      .eq('token', token)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Invalid or expired link' }, { status: 404 })
    }

    // Check expiry
    if (new Date(data.expires_at) < new Date()) {
      await adminClient
        .from('kyc_requests')
        .update({ status: 'expired' })
        .eq('id', data.id)
      return NextResponse.json({ error: 'This link has expired' }, { status: 410 })
    }

    // Check if already completed
    if (data.status === 'completed') {
      return NextResponse.json({ error: 'This verification has already been completed' }, { status: 409 })
    }

    if (data.status === 'expired') {
      return NextResponse.json({ error: 'This link has expired' }, { status: 410 })
    }

    // Mark as in progress
    if (data.status === 'pending') {
      await adminClient
        .from('kyc_requests')
        .update({ status: 'in_progress' })
        .eq('id', data.id)
    }

    return NextResponse.json({
      id: data.id,
      first_name: data.first_name,
      last_name: data.last_name,
      email: data.email,
      status: data.status,
    })
  } catch (error) {
    console.error('Validate token error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
