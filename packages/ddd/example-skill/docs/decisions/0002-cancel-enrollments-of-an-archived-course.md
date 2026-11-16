# 0002. Cancel every open enrollment of an archived course in one reaction

- Status: accepted
- Context: `enrollments`, reaction use case `CancelCourseEnrollmentsOnCourseArchived`
  (`src/contexts/enrollments/application/cancel-course-enrollments/cancel-course-enrollments-on-course-archived.ts`)

## Context

When `learning` archives a course (`course.archived`), every enrollment of that course that is
still pending payment or active must be cancelled. One event touches many `Enrollment`
aggregates, while a reaction normally changes one aggregate [IDDD ch. 8, ch. 10].

## Decision

One reaction selects the enrollments with a `Criteria<Enrollment>` (the course, status
`pending_payment` or `active`) in pages of 50 ordered by id (keyset), and for each one calls the
silent reaction method `enrollment.cancelForArchivedCourse()`, saves it on its own and publishes
its `enrollment.cancelled` event. It is the batch case IDDD ch. 10 accepts: the outcome equals
cancelling them one by one, and no transaction spans two enrollments.

## Consequences

- The reaction is idempotent: a redelivered `course.archived` finds no open enrollment and
  records nothing; a late one cancels whatever is still open.
- A failure in the middle (a `ConcurrencyException` because the student cancelled at the same
  time) propagates; `DomainEventBus` logs it and the channel redelivers the event, which resumes
  with the enrollments still open.
- Billing hears each `enrollment.cancelled` and voids or refunds the invoice.
- It logs `course_enrollments_cancelled` only when it cancelled something.
