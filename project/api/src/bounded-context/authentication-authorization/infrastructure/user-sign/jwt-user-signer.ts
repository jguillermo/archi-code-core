import { SignPayload, UserSigner } from '@bounded-context/authentication-authorization';
import { JWTDataSigner } from '@code-core/cypto-tools';

export class JwtUserSigner extends UserSigner {
  private signer: JWTDataSigner;

  constructor(secret: string) {
    super();

    this.signer = new JWTDataSigner(secret);
  }

  data(signedData: string): object {
    return this.signer.data(signedData);
  }

  sign(payload: SignPayload): string {
    //todo:mejorar el object, actualmente admito doto, y asi hay un potencial error, [p string]:string
    return this.signer.sign(payload.toJson());
  }

  verify(token: string): SignPayload {
    return this.signer.verify(token) as SignPayload;
  }
}
