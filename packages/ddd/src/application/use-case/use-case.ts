import { anyToString } from '@archi-code/validation';
import { AbstractException, InternalErrorException } from '../../exceptions/index';

export abstract class UseCase<Input, Output> {
  async execute(input: Input): Promise<Output> {
    try {
      return await this.handle(input);
    } catch (error) {
      if (error instanceof AbstractException) {
        throw error;
      }
      throw new InternalErrorException(`${this.constructor.name}: ${UseCase.describe(error)}`, {
        cause: error,
      });
    }
  }

  protected abstract handle(input: Input): Promise<Output> | Output;

  private static describe(error: unknown): string {
    return error instanceof Error ? error.message : anyToString(error);
  }
}
