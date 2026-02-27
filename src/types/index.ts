// src/types/index.ts

export type KYCStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'expired'

export interface KYCRequest {
  id: string
  token: string
  first_name: string
  last_name: string
  email: string
  status: KYCStatus
  created_at: string
  updated_at: string
  expires_at: string
}

export type DocumentType = 'id_card' | 'driver_license' | 'passport'

export interface VerificationRecord {
  id: string
  kyc_request_id: string
  document_front_url: string | null
  document_back_url: string | null
  selfie_url: string | null
  face_match_score: number | null
  verification_status: 'pending' | 'approved' | 'rejected'
  ocr_data_json: OCRData | null
  document_type: DocumentType | null
  country: string | null
  created_at: string
  updated_at: string
}

export interface OCRData {
  name?: string
  dob?: string
  document_number?: string
  raw_text?: string
}

export type KYCStep =
  | 'intro'
  | 'document_select'
  | 'document_upload'
  | 'ocr_confirm'
  | 'selfie'
  | 'liveness'
  | 'face_match'
  | 'complete'

export interface KYCState {
  step: KYCStep
  kycRequest: KYCRequest | null
  country: string
  documentType: DocumentType | null
  documentFrontFile: File | null
  documentBackFile: File | null
  selfieFile: File | null
  ocrData: OCRData | null
  faceMatchScore: number | null
  livenessPass: boolean
  error: string | null
}

export interface GenerateLinkPayload {
  first_name: string
  last_name: string
  email: string
}

export interface GenerateLinkResponse {
  token: string
  link: string
  kyc_request_id: string
}
