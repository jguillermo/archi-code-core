# 0001. Discount every cheap course in one request

- Status: accepted
- Context: `learning`, use case `DiscountCheapCourses`
  (`src/contexts/learning/application/discount-cheap-courses/discount-cheap-courses.ts`)

## Context

An editor asks for "10% off every published course cheaper than a given price". The rule "one use
case changes one aggregate and saves it once" [IDDD ch. 10] would turn this into one request per
course, which the editor cannot do: they do not know which courses match.

## Decision

`DiscountCheapCourses` selects the courses with a `Criteria<Course>` (published, same currency,
price below the limit) through `CourseRepository.search`, in pages of 50 ordered by id (keyset:
`id > last id of the previous page`), and for each course calls `course.discountAsCheaperThan(limit)`,
saves it on its own and publishes its events. This is the batch case IDDD ch. 10 accepts: the
result is the same as discounting the courses one by one, each course still protects its own
invariants (only a published course under the limit is discounted, in the aggregate), and no
transaction spans two courses.

## Consequences

- Each course is saved atomically by itself; there is no all-or-nothing over the batch.
- The command is a relative change, so it never retries a `ConcurrencyException`: a conflict
  reaches the editor as a 409 and the courses already discounted stay discounted (their
  `course.discounted` events were published). Running the request again would discount those
  courses a second time if they are still under the limit; the editor checks the catalog first.
- The use case logs `cheap_courses_discounted` with the limit and the number of courses.
