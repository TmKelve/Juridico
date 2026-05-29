export type PlatformCompanyRole = 'platform_admin' | 'platform_billing' | 'platform_support';

export type PlatformCompanyActor = {
  userId?: number | null;
  email?: string | null;
  role: string;
};

export type PlatformCompanySummary = {
  plan: string | null;
  subscription: string | null;
  status: string;
  activationDate: string | null;
  responsible: {
    userId: number | null;
    email: string | null;
    role: string | null;
  } | null;
};

export type PlatformCompanyListItem = {
  id: number;
  name: string;
  slug: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  summary: PlatformCompanySummary;
};

export type PlatformCompanyDetail = PlatformCompanyListItem;

export type PlatformCompanyAction =
  | 'list'
  | 'detail'
  | 'summary'
  | 'activate'
  | 'block'
  | 'cancel'
  | 'reactivate';

export type PlatformCompanyActionName = Exclude<PlatformCompanyAction, 'list' | 'detail' | 'summary'>;

export type PlatformCompanyAuditEvent = {
  companyId: number;
  action: string;
  actorUserId?: number | null;
  actorEmail?: string | null;
  reason?: string | null;
  previousStatus?: string | null;
  nextStatus?: string | null;
  metadata?: Record<string, unknown> | null;
};

export type PlatformCompanyAuditSink = {
  record(event: PlatformCompanyAuditEvent): Promise<void>;
};

