import type { Logger } from '../../../../ddd/application';
import { Http } from '../../../../platform/http/http';
import type { HttpRequest, HttpResponse } from '../../../../platform/http/http';
import type { CancelOrder } from '../../application/cancel-order/cancel-order';
import type { ChangeOrderLineQuantity } from '../../application/change-order-line-quantity/change-order-line-quantity';
import type { ChangeShippingAddress } from '../../application/change-shipping-address/change-shipping-address';
import type { DiscardCancelledOrder } from '../../application/discard-cancelled-order/discard-cancelled-order';
import type { OrderSummaries } from '../../application/order-summaries/order-summaries';
import type { PlaceOrder, PlaceOrderInput } from '../../application/place-order/place-order';
import type { AddressData } from '../../domain/order/order-events';

export interface OrdersUseCases {
  placeOrder: PlaceOrder;
  changeOrderLineQuantity: ChangeOrderLineQuantity;
  changeShippingAddress: ChangeShippingAddress;
  cancelOrder: CancelOrder;
  discardCancelledOrder: DiscardCancelledOrder;
}

export class OrdersController {
  private readonly http: Http;

  constructor(
    private readonly useCases: OrdersUseCases,
    private readonly summaries: OrderSummaries,
    logger: Logger,
  ) {
    this.http = new Http(logger);
  }

  placeOrder(request: HttpRequest): Promise<HttpResponse> {
    return this.http.respond(async () => {
      const userId = request.auth?.userId;
      if (userId === undefined) {
        return this.http.unauthenticated();
      }
      const body = this.http.jsonBody(request);
      if (body === null || !Array.isArray(body.lines) || !Array.isArray(body.couponCodes ?? [])) {
        return this.http.badRequest('Send a JSON object with a list of lines');
      }
      const id = await this.useCases.placeOrder.execute({
        actorId: userId,
        customerId: body.customerId,
        lines: body.lines,
        shippingAddress: body.shippingAddress,
        couponCodes: body.couponCodes ?? [],
        giftWrap: body.giftWrap ?? false,
        paymentMethod: body.paymentMethod,
      } as PlaceOrderInput);
      return { status: 201, body: { id } };
    });
  }

  changeLineQuantity(request: HttpRequest): Promise<HttpResponse> {
    return this.http.respond(async () => {
      const body = this.http.jsonBody(request);
      if (body === null) {
        return this.http.badRequest('Send a JSON object with the quantity');
      }
      await this.useCases.changeOrderLineQuantity.execute({
        orderId: request.params?.orderId as string,
        lineNumber: Number(request.params?.lineNumber),
        quantity: body.quantity as number,
      });
      return { status: 204 };
    });
  }

  changeShippingAddress(request: HttpRequest): Promise<HttpResponse> {
    return this.http.respond(async () => {
      const body = this.http.jsonBody(request);
      if (body === null) {
        return this.http.badRequest('Send the new address as a JSON object');
      }
      await this.useCases.changeShippingAddress.execute({
        orderId: request.params?.orderId as string,
        shippingAddress: body as unknown as AddressData,
      });
      return { status: 204 };
    });
  }

  cancelOrder(request: HttpRequest): Promise<HttpResponse> {
    return this.http.respond(async () => {
      const userId = request.auth?.userId;
      if (userId === undefined) {
        return this.http.unauthenticated();
      }
      await this.useCases.cancelOrder.execute({
        actorId: userId,
        orderId: request.params?.orderId as string,
      });
      return { status: 204 };
    });
  }

  discardOrder(request: HttpRequest): Promise<HttpResponse> {
    return this.http.respond(async () => {
      const role = request.auth?.role;
      if (role === undefined) {
        return this.http.unauthenticated();
      }
      await this.useCases.discardCancelledOrder.execute({
        actorRole: role,
        orderId: request.params?.orderId as string,
      });
      return { status: 204 };
    });
  }

  getOrder(request: HttpRequest): Promise<HttpResponse> {
    return this.http.respond(async () => {
      const summary = await this.summaries.byId(request.params?.orderId as string);
      return summary === null
        ? { status: 404, body: { code: 'NOT_FOUND', message: 'Order not found' } }
        : { status: 200, body: summary };
    });
  }

  listMyOrders(request: HttpRequest): Promise<HttpResponse> {
    return this.http.respond(async () => {
      const userId = request.auth?.userId;
      if (userId === undefined) {
        return this.http.unauthenticated();
      }
      return { status: 200, body: await this.summaries.ofCustomer(userId) };
    });
  }
}
