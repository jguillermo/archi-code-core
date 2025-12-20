// ExceptionCode.ts
export enum ExceptionCode {
  // Errores de Dominio
  DomainException = 'DOM000',
  ValidationFailed = 'DOM001',
  AggregateNotFound = 'DOM002',
  TypeFailed = 'DOM003',
  // BusinessRuleViolation = "DOM003",
  // EntityAlreadyExists = "DOM004",
  // OperationNotAllowed = "DOM005",
  // ConcurrencyConflict = "DOM006",

  // Errores de Aplicación
  ApplicationException = 'APP000',
  // NotificationFailure = "APP002",
  // ServiceCommunicationError = "APP003",
  // InternalLogicError = "APP004",
  // UnauthorizedAccess = "APP005",

  // Errores de Infraestructura
  InfrastructureException = 'INF000',
  InternalError = 'INF001',
  // NetworkIssues = "INF002",

  // Errores de Seguridad
  // SecurityException = "SEC000",
  // AuthenticationFailed = "SEC001",
  // AuthorizationFailed = "SEC002"

  // Errores por defecto
  ErrorException = 'E000',
  // AuthenticationFailed = "SEC001",
  // AuthorizationFailed = "SEC002"
}
