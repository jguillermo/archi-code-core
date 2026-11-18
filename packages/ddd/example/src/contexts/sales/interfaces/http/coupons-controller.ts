import type { Logger } from '../../../../ddd/application';
import { Http } from '../../../../platform/http/http';
import type { HttpRequest, HttpResponse } from '../../../../platform/http/http';
import type { RegisterCoupon } from '../../application/register-coupon/register-coupon';

export class CouponsController {
  private readonly http: Http;

  constructor(
    private readonly registerCoupon: RegisterCoupon,
    logger: Logger,
  ) {
    this.http = new Http(logger);
  }

  register(request: HttpRequest): Promise<HttpResponse> {
    return this.http.respond(async () => {
      const role = request.auth?.role;
      if (role === undefined) {
        return this.http.unauthenticated();
      }
      const body = this.http.jsonBody(request);
      if (body === null) {
        return this.http.badRequest('Send the coupon as a JSON object');
      }
      const id = await this.registerCoupon.execute({
        actorRole: role,
        code: body.code as string,
        discount: body.discount as number,
      });
      return { status: 201, body: { id } };
    });
  }
}
