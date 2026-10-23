import { anyToString } from '@archi-code/validation';
import { AbstractException } from '../../shared/index';
import { UnexpectedErrorException } from '../exceptions/unexpected-error.exception';

export abstract class UseCase<Input, Command, Output> {
  async execute(input: Input): Promise<Output> {
    try {
      return await this.handle(this.toCommand(input));
    } catch (error) {
      if (error instanceof AbstractException) {
        throw error;
      }
      throw new UnexpectedErrorException(`${this.constructor.name}: ${UseCase.describe(error)}`, {
        cause: error,
      });
    }
  }

  protected abstract toCommand(input: Input): Command;

  protected abstract handle(command: Command): Promise<Output> | Output;

  private static describe(error: unknown): string {
    return error instanceof Error ? error.message : anyToString(error);
  }
}
