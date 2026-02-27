// src/components/kyc/types.ts
import type { KYCState, KYCStep } from '@/types'

export interface StepProps {
  state: KYCState
  updateState: (updates: Partial<KYCState>) => void
  goToStep: (step: KYCStep) => void
  token: string
}
