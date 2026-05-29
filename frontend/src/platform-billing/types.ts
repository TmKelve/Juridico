export type PlatformBillingSummary = {
  companyId: number;
  subscriptionId: number;
  planName: string;
  status: string;
  periodEnd?: string | null;
};
