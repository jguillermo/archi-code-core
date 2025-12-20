export abstract class Compare {
  abstract get regexp();

  abstract compare(value): boolean;
}
