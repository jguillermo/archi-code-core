import type { Logger } from '@archi-code/ddd/application';
import { InMemoryEventChannel } from '@archi-code/ddd/infrastructure';
import { BillingContext } from './contexts/billing/composition';
import { EnrollmentsContext } from './contexts/enrollments/composition';
import { LearningContext } from './contexts/learning/composition';

export interface AcademySettings {
  logger: Logger;
  declineAboveCents: number | null;
}

export class Academy {
  private constructor(
    readonly learning: LearningContext,
    readonly enrollments: EnrollmentsContext,
    readonly billing: BillingContext,
  ) {}

  static async start({ logger, declineAboveCents }: AcademySettings): Promise<Academy> {
    const channel = new InMemoryEventChannel({ delivery: 'serial' });
    const learning = await LearningContext.start({ channel, logger });
    const enrollments = await EnrollmentsContext.start({ channel, logger });
    const billing = await BillingContext.start({ channel, logger, declineAboveCents });
    return new Academy(learning, enrollments, billing);
  }

  async stop(): Promise<void> {
    await this.billing.stop();
    await this.enrollments.stop();
    await this.learning.stop();
  }
}
