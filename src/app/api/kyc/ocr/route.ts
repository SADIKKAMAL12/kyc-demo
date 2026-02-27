// src/app/api/kyc/ocr/route.ts
// Gemini Vision OCR — server-side so API key stays secret

import { NextRequest, NextResponse } from 'next/server'

const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent'

export async function POST(request: NextRequest) {
  try {
    const { imageBase64, imageUrl, documentType } = await request.json()

    if (!imageBase64 && !imageUrl) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 })
    }

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY not set in .env.local' }, { status: 500 })
    }

    // Build image part — convert URL to base64 server-side if needed
    let imagePart: any
    if (imageBase64) {
      imagePart = { inlineData: { mimeType: 'image/jpeg', data: imageBase64 } }
    } else {
      const imgRes = await fetch(imageUrl!)
      const buffer = await imgRes.arrayBuffer()
      const b64    = Buffer.from(buffer).toString('base64')
      const mime   = imgRes.headers.get('content-type') || 'image/jpeg'
      imagePart = { inlineData: { mimeType: mime, data: b64 } }
    }

    const docLabel = {
      id_card:        'National ID Card',
      driver_license: "Driver's License",
      passport:       'Passport',
    }[documentType as string] ?? 'identity document'

    const prompt = `You are an expert at reading ${docLabel} documents from any country.

Extract these fields from the document image:
1. Full Name — exactly as printed, including all name parts, surname first if shown
2. Date of Birth — convert to DD/MM/YYYY format
3. Document Number — the ID/passport/license number, include all letters and digits

IMPORTANT RULES:
- Return ONLY a raw JSON object. No markdown. No explanation. No code fences.
- If a field cannot be read, return empty string ""
- For name: use ALL CAPS exactly as shown on the document
- For document number: copy exactly including any letters

JSON structure to return:
{"name":"FULL NAME","dob":"DD/MM/YYYY","document_number":"XXXXXXXXX","raw_text":"one line summary of document"}`

    const geminiRes = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }, imagePart] }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 300 },
      }),
    })

    if (!geminiRes.ok) {
      const err = await geminiRes.text()
      console.error('Gemini error:', err)
      return NextResponse.json({ error: 'Gemini API error' }, { status: 502 })
    }

    const geminiData = await geminiRes.json()
    const rawText    = geminiData.candidates?.[0]?.content?.parts?.[0]?.text ?? ''

    let parsed: any = {}
    try {
      const clean = rawText.replace(/```json|```/gi, '').trim()
      parsed = JSON.parse(clean)
    } catch {
      console.error('Failed to parse Gemini JSON:', rawText)
      parsed = { name: '', dob: '', document_number: '', raw_text: rawText.slice(0, 200) }
    }

    return NextResponse.json({
      name:            String(parsed.name            || '').trim(),
      dob:             String(parsed.dob             || '').trim(),
      document_number: String(parsed.document_number || '').trim(),
      raw_text:        String(parsed.raw_text        || '').trim(),
    })
  } catch (error) {
    console.error('OCR route error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
