import type { Logger } from '@archi-code/ddd/application';
import { Http } from '../../../../platform/http/http';
import type { HttpRequest, HttpResponse } from '../../../../platform/http/http';
import type { MoneyData } from '../../application/pay-invoice/money-data';
import type { PayInvoice } from '../../application/pay-invoice/pay-invoice';

export class InvoicesController {
  private readonly http: Http;

  constructor(
    private readonly payInvoice: PayInvoice,
    logger: Logger,
  ) {
    this.http = new Http(logger);
  }

  pay(request: HttpRequest): Promise<HttpResponse> {
    return this.http.respond(async () => {
      const actorId = request.auth?.userId;
      if (actorId === undefined) {
        return this.http.unauthenticated();
      }
      const body = this.http.jsonBody(request);
      if (body === null) {
        return this.http.badRequest('Send the amount you pay as a JSON object');
      }
      await this.payInvoice.execute({
        actorId,
        invoiceId: request.params?.invoiceId as string,
        amount: body.amount as MoneyData,
      });
      return { status: 204 };
    });
  }
}
