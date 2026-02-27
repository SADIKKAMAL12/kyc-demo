// src/app/api/kyc/upload/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const token = formData.get('token') as string
    const fileType = formData.get('fileType') as string // 'front' | 'back' | 'selfie'

    if (!file || !token || !fileType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const adminClient = createAdminClient()

    // Verify token exists
    const { data: kycRequest } = await adminClient
      .from('kyc_requests')
      .select('id')
      .eq('token', token)
      .single()

    if (!kycRequest) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const ext = file.name.split('.').pop() || 'jpg'
    const fileName = `${kycRequest.id}/${fileType}_${Date.now()}.${ext}`

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const { data, error } = await adminClient.storage
      .from('kyc-documents')
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: true,
      })

    if (error) {
      console.error('Storage error:', error)
      return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 })
    }

    const { data: { publicUrl } } = adminClient.storage
      .from('kyc-documents')
      .getPublicUrl(fileName)

    return NextResponse.json({ url: publicUrl, path: data.path })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
