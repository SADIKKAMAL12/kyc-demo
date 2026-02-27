// src/app/api/kyc/upload/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  console.log('[/api/kyc/upload] Request received')

  try {
    const formData = await request.formData()
    const file     = formData.get('file')     as File
    const token    = formData.get('token')    as string
    const fileType = formData.get('fileType') as string

    console.log('[/api/kyc/upload] fileType:', fileType, '| fileSize:', file?.size, '| token present:', !!token)

    if (!file || !token || !fileType) {
      console.error('[/api/kyc/upload] Missing fields — file:', !!file, 'token:', !!token, 'fileType:', !!fileType)
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY
    console.log('[/api/kyc/upload] Supabase URL present:', !!supabaseUrl, '| Service key present:', !!serviceKey)

    const adminClient = createAdminClient()

    // Verify token exists
    const { data: kycRequest, error: tokenError } = await adminClient
      .from('kyc_requests')
      .select('id')
      .eq('token', token)
      .single()

    if (tokenError) {
      console.error('[/api/kyc/upload] Token lookup error:', tokenError)
      return NextResponse.json({ error: 'Token lookup failed: ' + tokenError.message }, { status: 401 })
    }
    if (!kycRequest) {
      console.error('[/api/kyc/upload] Token not found')
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    console.log('[/api/kyc/upload] Token valid, kycRequest.id:', kycRequest.id)

    const ext      = file.name.split('.').pop() || 'jpg'
    const fileName = `${kycRequest.id}/${fileType}_${Date.now()}.${ext}`

    const arrayBuffer = await file.arrayBuffer()
    const buffer      = Buffer.from(arrayBuffer)

    console.log('[/api/kyc/upload] Uploading to storage bucket kyc-documents, path:', fileName)

    const { data, error } = await adminClient.storage
      .from('kyc-documents')
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: true,
      })

    if (error) {
      console.error('[/api/kyc/upload] Storage upload error:', error)
      return NextResponse.json({ error: 'Storage upload failed: ' + error.message }, { status: 500 })
    }

    const { data: { publicUrl } } = adminClient.storage
      .from('kyc-documents')
      .getPublicUrl(fileName)

    console.log('[/api/kyc/upload] ✓ Upload complete, publicUrl:', publicUrl)

    return NextResponse.json({ url: publicUrl, path: data.path })
  } catch (error: any) {
    console.error('[/api/kyc/upload] Unhandled error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
