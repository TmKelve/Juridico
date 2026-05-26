import { randomUUID } from 'crypto';

export type BiExportRecord = {
  id: string;
  dashboardKey: string;
  format: 'csv' | 'xlsx' | 'pdf';
  status: 'generated';
  artifactPath: string;
  requestedBy: string;
  createdAt: string;
};

export class BiExportService {
  async generate(input: {
    dashboardKey: string;
    format: 'csv' | 'xlsx' | 'pdf';
    requestedBy: string;
  }): Promise<BiExportRecord> {
    const createdAt = new Date().toISOString();
    return {
      id: randomUUID(),
      dashboardKey: input.dashboardKey,
      format: input.format,
      status: 'generated',
      artifactPath: `exports/bi/${input.dashboardKey}-${createdAt}.${input.format}`,
      requestedBy: input.requestedBy,
      createdAt,
    };
  }
}
