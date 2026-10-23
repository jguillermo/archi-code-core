import type { Logger } from '../../../../ddd/application';
import { Http } from '../../../../platform/http/http';
import type { HttpRequest, HttpResponse } from '../../../../platform/http/http';
import type { DeliverShipment } from '../../application/deliver-shipment/deliver-shipment';
import type { DispatchShipment } from '../../application/dispatch-shipment/dispatch-shipment';

export class ShipmentsController {
  private readonly http: Http;

  constructor(
    private readonly dispatchShipment: DispatchShipment,
    private readonly deliverShipment: DeliverShipment,
    logger: Logger,
  ) {
    this.http = new Http(logger);
  }

  dispatch(request: HttpRequest): Promise<HttpResponse> {
    return this.http.respond(async () => {
      const role = request.auth?.role;
      if (role === undefined) {
        return this.http.unauthenticated();
      }
      const body = this.http.jsonBody(request);
      if (body === null) {
        return this.http.badRequest('Send a JSON object with the tracking number');
      }
      await this.dispatchShipment.execute({
        actorRole: role,
        shipmentId: request.params?.shipmentId as string,
        trackingNumber: body.trackingNumber as string | undefined,
      });
      return { status: 204 };
    });
  }

  deliver(request: HttpRequest): Promise<HttpResponse> {
    return this.http.respond(async () => {
      const role = request.auth?.role;
      if (role === undefined) {
        return this.http.unauthenticated();
      }
      await this.deliverShipment.execute({
        actorRole: role,
        shipmentId: request.params?.shipmentId as string,
      });
      return { status: 204 };
    });
  }
}
