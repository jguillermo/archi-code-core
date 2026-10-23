import type { Logger } from '../../../../ddd/application';
import { Http } from '../../../../platform/http/http';
import type { HttpRequest, HttpResponse } from '../../../../platform/http/http';
import type { ConfirmTransferReceived } from '../../application/confirm-transfer-received/confirm-transfer-received';
import type { MoneyData } from '../../domain/payment/payment-events';

export class PaymentsController {
  private readonly http: Http;

  constructor(
    private readonly confirmTransferReceived: ConfirmTransferReceived,
    logger: Logger,
  ) {
    this.http = new Http(logger);
  }

  confirmTransfer(request: HttpRequest): Promise<HttpResponse> {
    return this.http.respond(async () => {
      const role = request.auth?.role;
      if (role === undefined) {
        return this.http.unauthenticated();
      }
      const body = this.http.jsonBody(request);
      if (body === null) {
        return this.http.badRequest('Send the received amount as a JSON object');
      }
      await this.confirmTransferReceived.execute({
        actorRole: role,
        paymentId: request.params?.paymentId as string,
        received: body as unknown as MoneyData,
      });
      return { status: 204 };
    });
  }
}
