import type { MembershipRole } from '@/platform-admin/memberships/types'

export interface InvitationDraft {
  email: string
  role: MembershipRole
  scope: 'platform' | 'tenant'
}

export interface InvitationValidationResult {
  valid: boolean
  errors: string[]
}

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function validateInvitationDraft(draft: InvitationDraft): InvitationValidationResult {
  const errors: string[] = []

  if (!emailRegex.test(draft.email.trim())) {
    errors.push('Email inválido para convite')
  }

  if (!draft.role) {
    errors.push('Perfil obrigatório para convite')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}
