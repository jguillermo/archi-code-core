export interface SatisfiedBy<Candidate> {
  isSatisfiedBy(candidate: Candidate): boolean;
}

export abstract class Specification<Candidate> implements SatisfiedBy<Candidate> {
  abstract isSatisfiedBy(candidate: Candidate): boolean;

  and(other: SatisfiedBy<Candidate>): Specification<Candidate> {
    return new BothSpecification(this, other);
  }

  or(other: SatisfiedBy<Candidate>): Specification<Candidate> {
    return new EitherSpecification(this, other);
  }

  not(): Specification<Candidate> {
    return new NegatedSpecification(this);
  }
}

class BothSpecification<Candidate> extends Specification<Candidate> {
  constructor(
    private readonly left: SatisfiedBy<Candidate>,
    private readonly right: SatisfiedBy<Candidate>,
  ) {
    super();
  }

  isSatisfiedBy(candidate: Candidate): boolean {
    return this.left.isSatisfiedBy(candidate) && this.right.isSatisfiedBy(candidate);
  }
}

class EitherSpecification<Candidate> extends Specification<Candidate> {
  constructor(
    private readonly left: SatisfiedBy<Candidate>,
    private readonly right: SatisfiedBy<Candidate>,
  ) {
    super();
  }

  isSatisfiedBy(candidate: Candidate): boolean {
    return this.left.isSatisfiedBy(candidate) || this.right.isSatisfiedBy(candidate);
  }
}

class NegatedSpecification<Candidate> extends Specification<Candidate> {
  constructor(private readonly negated: SatisfiedBy<Candidate>) {
    super();
  }

  isSatisfiedBy(candidate: Candidate): boolean {
    return !this.negated.isSatisfiedBy(candidate);
  }
}
