# Online course platform built with `@archi-code/ddd`

An application written only from the `archi-code-ddd` skill (`packages/ddd/SKILL.md`, its guide
suite in `ddd-skills/` and the package READMEs). Three bounded contexts integrate only through
events on one `InMemoryEventChannel`, started by `src/academy.ts`.

```
src/
  academy.ts                      opens one channel, starts learning, enrollments and billing, stops them in reverse
  platform/http/http.ts           protocol helper: ExceptionClassifier → status, business 404 codes
  contexts/
    shared-kernel/money/          Money, Cents, CentsAmount, MoneyCurrency (Currency enum), CurrencyMismatch
    learning/                     courses and lessons (browser, IndexedDB)
    enrollments/                  students enrolling in courses (in memory)
    billing/                      invoices and payments (in memory)
test/                             mirrors src/; support/ holds fixtures, doubles and repository contracts
docs/decisions/                   decision records of the multi-aggregate use cases
```

## Contexts

### learning (IndexedDB)

- Aggregate `Course` (`CourseId` chosen by the client, `CourseTitle` one line 1–120, `Money`
  price, `CourseStatusType` draft | published | archived, `createdAt`/`updatedAt`) with child
  entities `Lesson` (`LessonNumber`, `LessonTitle`, `LessonDuration` 1–600 min); 1..50 lessons
  with unique titles.
- User use cases, all for the role `editor` only (`NotAllowedException` otherwise):
  `CreateCourse` (`CourseAlreadyExists` when the id is taken), `RenameLesson`, `PublishCourse`
  (draft with ≥ 3 lessons), `RetireCourse` (`course.retire()` answers `CourseRetirement.DISCARDED`
  → `remove`, or `ARCHIVED` → `save`), `DiscountCheapCourses` (10% off every published course under a
  price, decision record 0001).
- Domain service `CourseFinder` (`find` → `CourseNotFound`, `assertDoesNotExist` →
  `CourseAlreadyExists`), shared by four use cases and built inside `handle`.
- Read model `course-views` (detail by id and the catalog of published courses under a price),
  fed by one reaction per own event, stored in IndexedDB.
- Adapters: `IndexedDbCourseRepository` (over `IndexedDbTable`, `search` with
  `toIndexedDbQuery`) and `IndexedDbCourseViewStore`.

### enrollments (in memory)

- Aggregate `Enrollment` (one per attempt: `EnrollmentId`, `StudentReference` from the token,
  `CourseReference`, fee `Money`, `EnrollmentStatusType` pending_payment | active | cancelled |
  completed, `CancellationReasonType`, timestamps).
- User use cases: `EnrollStudent` (the actor enrolls themself; `CourseNotOpen`,
  `AlreadyEnrolled`), `CancelEnrollment` (`enrollment.cancel(requester)`: only the owner,
  `NotTheStudentOfEnrollment`; only pending payment or active, `EnrollmentNotCancellable`),
  `CompleteEnrollment` (role `teacher`).
- Domain services: `EnrollmentFinder` (shared by cancel and complete), `EnrollmentAdmission`
  (several aggregates + the domain port `CourseCatalog`).
- Reactions: open-catalog read model (`AddOpenCourseOnCoursePublished`,
  `CloseOpenCourseOnCourseArchived`, `RepriceOpenCourseOnCourseDiscounted`),
  `CancelCourseEnrollmentsOnCourseArchived` (decision record 0002, logged),
  `ActivateEnrollmentOnInvoicePaid`, and the "my enrollments" read model (one reaction per own
  event).
- Adapters: `InMemoryEnrollmentRepository` (`search` with `searchMemory`), in-memory read-model
  stores, `ReadModelCourseCatalog implements CourseCatalog` over the open-catalog query port.

### billing (in memory)

- Aggregate `Invoice` (id derived from the enrollment, `InvoiceId.forEnrollment`; student, amount,
  `InvoiceStatusType` open | payment_requested | paid | refund_requested | refunded | voided,
  `GatewayChargeId`, `EnrollmentWithdrawn`).
- User use case `PayInvoice` (only the owning student, `NotTheStudentOfInvoice`; exact amount,
  `PaymentAmountMismatch`; open, `InvoiceNotPayable`): it only records the intent
  (`invoice.payment_requested`).
- Reactions: `IssueInvoiceOnEnrollmentCreated`, `SettleInvoiceOnEnrollmentCancelled` (void before
  payment, refund after, or `Invoice.createVoided` when the cancellation arrives first),
  `ChargeInvoiceOnInvoicePaymentRequested` and `RefundInvoiceOnInvoiceRefundRequested`, which call
  the domain port `PaymentGateway` through the domain service `InvoiceCharging` with the invoice id
  as idempotency key.
- Adapters: `InMemoryInvoiceRepository`, `InMemoryPaymentGateway`.

## Events between contexts

| Event (`eventName`)    | Producer    | Consumers (local copy → reaction)                                                         |
| ---------------------- | ----------- | ----------------------------------------------------------------------------------------- |
| `course.published`     | learning    | enrollments: `AddOpenCourseOnCoursePublished`                                             |
| `course.archived`      | learning    | enrollments: `CloseOpenCourseOnCourseArchived`, `CancelCourseEnrollmentsOnCourseArchived` |
| `course.discounted`    | learning    | enrollments: `RepriceOpenCourseOnCourseDiscounted`                                        |
| `enrollment.created`   | enrollments | billing: `IssueInvoiceOnEnrollmentCreated`                                                |
| `enrollment.cancelled` | enrollments | billing: `SettleInvoiceOnEnrollmentCancelled`                                             |
| `invoice.paid`         | billing     | enrollments: `ActivateEnrollmentOnInvoicePaid`                                            |

Every consumer declares its own copy of the event next to its first reaction (for example
`enrollments/application/open-catalog/close-open-course/course-archived-domain-event.ts`, shared by
both reactions to `course.archived`) and registers it once in its `composition.ts`.

## Where each rule of the skill shows up

| Rule                                                                                                                                          | Where                                                                                                                                               |
| --------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| One folder per context, domain by kind, application by business action                                                                        | `src/contexts/<context>/{domain/{aggregate,entity,value-object,event,exception,repository,service},application/<action>,infrastructure,interfaces}` |
| Contexts never import each other; only `shared-kernel/` is shared                                                                             | `shared-kernel/money/`; each context has its own `StudentReference`, `ActorRoleType`, `MoneyData`                                                   |
| Value objects always valid, `@Validations`, `Required(...)`, one class per file                                                               | `CourseTitle`, `LessonDuration`, `LessonNumber`, `EnrollmentWithdrawn`…                                                                             |
| One-line text through `StringSanitizer.singleLine` in `filter`                                                                                | `CourseTitle`, `LessonTitle`                                                                                                                        |
| Enum as `<Enum>Type.ts` with `<Enum>`, `<Enum>Option`, `<Enum>Type`                                                                           | `CourseStatusType`, `EnrollmentStatusType`, `InvoiceStatusType`, `MoneyCurrency`                                                                    |
| Money as `Composite` of `Cents` (custom `AbstractType`) and the `Currency` enum, discounts round down                                         | `shared-kernel/money/Money.ts` (`minusPercent`)                                                                                                     |
| Composite with a cross-field `custom` rule                                                                                                    | `billing/domain/value-object/ChargeOutcome.ts`                                                                                                      |
| Ids: `IdType<'X'>`, `generate()` in the use case, derived with `UuidType.fromValue`                                                           | `EnrollmentId.generate()` in `EnrollStudent`, `InvoiceId.forEnrollment`                                                                             |
| Aggregate: public assigning constructor, `create` with `CreatedAt.now()`, `fromPrimitives`/`toPrimitives`, getters, derived values as methods | `Course`, `Enrollment`, `Invoice`                                                                                                                   |
| Child entity changed only through its root                                                                                                    | `Lesson.rename` called by `Course.renameLesson`                                                                                                     |
| Outcome enum returned by an aggregate method, the use case acts on it                                                                         | `CourseRetirement` in `RetireCourse`                                                                                                                |
| A command can be refused, a fact cannot                                                                                                       | `Enrollment.cancel` throws; `cancelForArchivedCourse`/`activateAfterPayment` return silently                                                        |
| A rule on the aggregate's state lives in the aggregate ("only the owner cancels")                                                             | `Enrollment.cancel(requester)`, `Invoice.requestPayment(requester, offered)`                                                                        |
| Events `<Aggregate><PastAction>DomainEvent`, `'<aggregate>.<past_action>'`, primitives                                                        | `domain/event/` of each context                                                                                                                     |
| Business errors without `Exception`, code per context                                                                                         | `LRN001…LRN009`, `ENR001…ENR006`, `BIL001…BIL003`, `MNY001`                                                                                         |
| Abstract repository with only the needed verbs                                                                                                | `CourseRepository` (find, save, remove, search), `EnrollmentRepository` (find, save, search), `InvoiceRepository` (find, save)                      |
| Domain service only when shared or needing several aggregates/a port, built in `handle`                                                       | `CourseFinder`, `EnrollmentFinder`, `EnrollmentAdmission`, `InvoiceCharging`                                                                        |
| User use case: `toCommand` = `ValueObjectBuilder.build`, authorization first, one save, publish after save                                    | every `application/<action>/<action>.ts`                                                                                                            |
| A use case never uses another use case                                                                                                        | shared lookups go through the domain services above                                                                                                 |
| Multi-aggregate use case written down                                                                                                         | `docs/decisions/0001-…`, `docs/decisions/0002-…`                                                                                                    |
| Relative change never retries a conflict                                                                                                      | `DiscountCheapCourses` lets `ConcurrencyException` reach the entry point                                                                            |
| Criteria for `search` with a `limit`, paged                                                                                                   | `DiscountCheapCourses`, `CancelCourseEnrollmentsOnCourseArchived`, `EnrollStudent`                                                                  |
| Reaction use case `<Action>On<Event>` with `@ListensTo` and consumer `'<context>.<file>'`                                                     | every `*-on-*.ts`                                                                                                                                   |
| Reactions idempotent: derived id on create, silent methods, projections skip applied `eventId`s                                               | `IssueInvoiceOnEnrollmentCreated`, `Enrollment.activateAfterPayment`, the three projections                                                         |
| Closing fact before the creating one creates the aggregate already closed                                                                     | `Invoice.createVoided` in `SettleInvoiceOnEnrollmentCancelled`                                                                                      |
| External side effect never before `save` in a user use case                                                                                   | `PayInvoice` records the intent; `ChargeInvoiceOnInvoicePaymentRequested` charges with an idempotency key                                           |
| Read models: row, store port, query port, projection, one reaction per event, one flag per fact, late events never overwrite later facts      | `course-views/`, `open-catalog/`, `my-enrollments/` (`priceOn`, `lessonsOn` keep the newest value)                                                  |
| No query use case: controllers read the query port                                                                                            | `CoursesController.detail`/`catalog`, `EnrollmentsController.openCatalog`/`mine`                                                                    |
| Domain port with its own adapter, wrapping a read model                                                                                       | `ReadModelCourseCatalog implements CourseCatalog`; `InMemoryPaymentGateway implements PaymentGateway`                                               |
| Version check in every repository, `structuredClone` in memory, IndexedDB only through `IndexedDbTable` with check + write in one transaction | `infrastructure/persistence/`, `test/support/learning/in-memory-course-repository.ts`                                                               |
| In-memory repository in `infrastructure/` when the context runs in memory, else in `test/support/`                                            | enrollments and billing vs. learning                                                                                                                |
| One protocol helper maps `ExceptionClassifier`, business 404 codes in its table                                                               | `platform/http/http.ts` (`NOT_FOUND_CODES`)                                                                                                         |
| Controllers check actor (401) and shape (400), call one use case, never catch                                                                 | `interfaces/http/*-controller.ts`                                                                                                                   |
| `composition.ts` per context builds and subscribes everything; one entry file                                                                 | `<Context>Context.start/stop/registry`, `src/academy.ts`                                                                                            |
| Logging through the `Logger` port, stable snake_case messages, after publishing                                                               | `cheap_courses_discounted`, `course_enrollments_cancelled`, `invoice_charge_settled`, `http_request_failed`                                         |
| Time only through `CreatedAt.now()`/`UpdatedAt.now()`                                                                                         | the aggregates; nothing else reads the clock                                                                                                        |

## Tests

Vitest specs mirror `src/` under `test/`: aggregate round trips (`Course`, `Enrollment`,
`Invoice`), the cancel rule, `CourseFinder`/`EnrollmentFinder`/`EnrollmentAdmission` with
`vi.fn()` stubs, use cases over in-memory adapters and `channel.sent`, composition specs that send
the same event twice and in the wrong order, and one repository contract per aggregate in
`test/support/` run against every adapter. The IndexedDB contract
(`indexeddb-course-repository.browser.spec.ts`) needs Vitest browser mode on a real browser; the
other specs run in Node.
