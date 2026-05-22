/**
 * Error thrown when a domain invariant or business rule is violated.
 */
export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = DomainError.name;
  }
}
