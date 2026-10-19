export abstract class Specification<Candidate> {
  abstract isSatisfiedBy(candidate: Candidate): boolean;

  and(other: Specification<Candidate>): Specification<Candidate> {
    return new BothSpecification(this, other);
  }

  or(other: Specification<Candidate>): Specification<Candidate> {
    return new EitherSpecification(this, other);
  }

  not(): Specification<Candidate> {
    return new NegatedSpecification(this);
  }
}

class BothSpecification<Candidate> extends Specification<Candidate> {
  constructor(
    private readonly left: Specification<Candidate>,
    private readonly right: Specification<Candidate>,
  ) {
    super();
  }

  isSatisfiedBy(candidate: Candidate): boolean {
    return this.left.isSatisfiedBy(candidate) && this.right.isSatisfiedBy(candidate);
  }
}

class EitherSpecification<Candidate> extends Specification<Candidate> {
  constructor(
    private readonly left: Specification<Candidate>,
    private readonly right: Specification<Candidate>,
  ) {
    super();
  }

  isSatisfiedBy(candidate: Candidate): boolean {
    return this.left.isSatisfiedBy(candidate) || this.right.isSatisfiedBy(candidate);
  }
}

class NegatedSpecification<Candidate> extends Specification<Candidate> {
  constructor(private readonly negated: Specification<Candidate>) {
    super();
  }

  isSatisfiedBy(candidate: Candidate): boolean {
    return !this.negated.isSatisfiedBy(candidate);
  }
}
