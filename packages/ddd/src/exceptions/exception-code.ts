export enum ExceptionCode {
  DomainException = 'DOM000',
  ValidationFailed = 'DOM001',
  TypeFailed = 'DOM003',
  RequiredValue = 'DOM004',
  ApplicationException = 'APP000',
  ConcurrencyConflict = 'APP001',
  AggregateNotFound = 'APP002',
  NotAllowed = 'APP003',
  InfrastructureException = 'INF000',
  InternalError = 'INF001',
  UnknownEvent = 'INF002',
  ErrorException = 'E000',
}
