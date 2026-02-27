// src/app/api/kyc/submit/route.ts
// Debugged version — logs every step so you can trace Supabase issues

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  console.log('[/api/kyc/submit] Request received')

  try {
    const body = await request.json()
    console.log('[/api/kyc/submit] Body:', JSON.stringify(body, null, 2))

    const {
      token,
      kyc_request_id,
      document_front_url,
      document_back_url,
      selfie_url,
      face_match_score,
      ocr_data_json,
      document_type,
      country,
      verification_status,
    } = body

    // ── Validate required fields ─────────────────────────────────────────
    if (!token) {
      console.error('[/api/kyc/submit] Missing token')
      return NextResponse.json({ error: 'Missing token' }, { status: 400 })
    }
    if (!document_front_url) {
      console.error('[/api/kyc/submit] Missing document_front_url')
      return NextResponse.json({ error: 'Missing document image URL' }, { status: 400 })
    }
    if (!selfie_url) {
      console.error('[/api/kyc/submit] Missing selfie_url')
      return NextResponse.json({ error: 'Missing selfie URL' }, { status: 400 })
    }

    // ── Init Supabase with service role ──────────────────────────────────
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY

    console.log('[/api/kyc/submit] Supabase URL present:', !!supabaseUrl)
    console.log('[/api/kyc/submit] Service key present:', !!serviceKey)

    if (!supabaseUrl || !serviceKey) {
      console.error('[/api/kyc/submit] Missing Supabase env vars')
      return NextResponse.json(
        { error: 'Server configuration error — Supabase keys missing' },
        { status: 500 }
      )
    }

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    })

    // ── Find the KYC request by token ────────────────────────────────────
    console.log('[/api/kyc/submit] Looking up token:', token)

    const { data: kycRequest, error: findError } = await supabase
      .from('kyc_requests')
      .select('id, status, expires_at, email')
      .eq('token', token)
      .single()

    if (findError) {
      console.error('[/api/kyc/submit] Token lookup error:', findError)
      return NextResponse.json(
        { error: `Token not found: ${findError.message}` },
        { status: 404 }
      )
    }

    console.log('[/api/kyc/submit] Found request:', kycRequest)

    // ── Check expiry ─────────────────────────────────────────────────────
    if (kycRequest.expires_at && new Date(kycRequest.expires_at) < new Date()) {
      console.error('[/api/kyc/submit] Token expired')
      return NextResponse.json({ error: 'Verification link has expired' }, { status: 410 })
    }

    // ── Insert verification record ───────────────────────────────────────
    console.log('[/api/kyc/submit] Inserting verification record...')

    const insertPayload = {
      kyc_request_id:      kycRequest.id,
      document_front_url:  document_front_url,
      document_back_url:   document_back_url  || null,
      selfie_url:          selfie_url,
      face_match_score:    face_match_score   ?? null,
      ocr_data_json:       ocr_data_json      || null,
      document_type:       document_type      || null,
      country:             country            || null,
      verification_status: verification_status || 'pending',
    }

    console.log('[/api/kyc/submit] Insert payload:', JSON.stringify(insertPayload, null, 2))

    const { data: record, error: insertError } = await supabase
      .from('verification_records')
      .insert(insertPayload)
      .select()
      .single()

    if (insertError) {
      console.error('[/api/kyc/submit] Insert error:', insertError)
      return NextResponse.json(
        { error: `Failed to save record: ${insertError.message}` },
        { status: 500 }
      )
    }

    console.log('[/api/kyc/submit] Record inserted:', record)

    // ── Update KYC request status ────────────────────────────────────────
    console.log('[/api/kyc/submit] Updating kyc_requests status...')

    const { error: updateError } = await supabase
      .from('kyc_requests')
      .update({
        status:     'completed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', kycRequest.id)

    if (updateError) {
      // Non-fatal — record was saved, status update failed
      console.error('[/api/kyc/submit] Status update error (non-fatal):', updateError)
    } else {
      console.log('[/api/kyc/submit] Status updated to completed')
    }

    console.log('[/api/kyc/submit] ✓ Submission complete')

    return NextResponse.json({
      success:   true,
      record_id: record.id,
      message:   'Verification submitted successfully',
    })

  } catch (error: any) {
    console.error('[/api/kyc/submit] Unhandled error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
