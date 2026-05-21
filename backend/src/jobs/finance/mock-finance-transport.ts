export interface FinanceTransportCommand {
  scheduleId: number;
  attemptNumber: number;
  channel: string;
  destination: string;
  message: string;
}

export class MockFinanceTransport {
  async send(command: FinanceTransportCommand) {
    return {
      providerMessageId: `finance-msg-${command.scheduleId}-${command.attemptNumber}`,
      acceptedAt: new Date().toISOString(),
      providerPayload: {
        transport: 'mock',
        channel: command.channel,
        destination: command.destination,
      },
    };
  }
}
