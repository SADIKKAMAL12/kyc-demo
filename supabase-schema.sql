-- ============================================================
-- KYC Demo System - Supabase SQL Schema
-- Run this in your Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- Table: kyc_requests
-- Stores admin-generated KYC links
-- ============================================================
CREATE TABLE IF NOT EXISTS kyc_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT UNIQUE NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'in_progress', 'completed', 'failed', 'expired')),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast token lookups
CREATE INDEX IF NOT EXISTS idx_kyc_requests_token ON kyc_requests(token);
CREATE INDEX IF NOT EXISTS idx_kyc_requests_email ON kyc_requests(email);
CREATE INDEX IF NOT EXISTS idx_kyc_requests_status ON kyc_requests(status);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_kyc_requests_updated_at
  BEFORE UPDATE ON kyc_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- Table: verification_records
-- Stores completed KYC verification data
-- ============================================================
CREATE TABLE IF NOT EXISTS verification_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kyc_request_id UUID NOT NULL REFERENCES kyc_requests(id) ON DELETE CASCADE,
  document_front_url TEXT,
  document_back_url TEXT,
  selfie_url TEXT,
  face_match_score FLOAT,
  verification_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (verification_status IN ('pending', 'approved', 'rejected')),
  ocr_data_json JSONB,
  document_type TEXT
    CHECK (document_type IN ('id_card', 'driver_license', 'passport', NULL)),
  country TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_verification_records_kyc_request_id ON verification_records(kyc_request_id);
CREATE INDEX IF NOT EXISTS idx_verification_records_status ON verification_records(verification_status);

CREATE TRIGGER update_verification_records_updated_at
  BEFORE UPDATE ON verification_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- Row Level Security
-- ============================================================

-- Enable RLS
ALTER TABLE kyc_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_records ENABLE ROW LEVEL SECURITY;

-- Service role has full access (used in API routes with admin client)
-- No policies needed for service_role - it bypasses RLS

-- Authenticated users (admins) can read all
CREATE POLICY "Authenticated users can read kyc_requests"
  ON kyc_requests FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert kyc_requests"
  ON kyc_requests FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update kyc_requests"
  ON kyc_requests FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can read verification_records"
  ON verification_records FOR SELECT
  TO authenticated
  USING (true);

-- ============================================================
-- Storage: kyc-documents bucket
-- ============================================================

-- Run this in Supabase Dashboard > Storage > New Bucket
-- Or via SQL:
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'kyc-documents',
  'kyc-documents',
  true,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Service role can upload"
  ON storage.objects FOR INSERT
  TO service_role
  WITH CHECK (bucket_id = 'kyc-documents');

CREATE POLICY "Service role can read"
  ON storage.objects FOR SELECT
  TO service_role
  USING (bucket_id = 'kyc-documents');

CREATE POLICY "Public can read kyc documents"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'kyc-documents');
