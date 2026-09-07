export class UsersError extends Error {
  constructor(message: string, readonly code: string) {
    super(message);
    this.name = "UsersError";
  }
}

export class UserNotFoundError extends UsersError {
  constructor() { super("Utilisateur introuvable.", "USER_NOT_FOUND"); }
}

export class UserVersionConflictError extends UsersError {
  constructor() { super("La fiche utilisateur a été modifiée par une autre opération. Rechargez puis réessayez.", "VERSION_CONFLICT"); }
}

export class CannotModifyTargetUserError extends UsersError {
  constructor() { super("Cette opération n'est pas autorisée sur cet utilisateur.", "TARGET_NOT_MANAGEABLE"); }
}

export class InvalidUserRoleError extends UsersError {
  constructor() { super("La configuration RBAC demandée est introuvable ou inactive.", "INVALID_ROLE_CONFIG"); }
}

export class UserAlreadyBlockedError extends UsersError {
  constructor() { super("L'utilisateur est déjà bloqué.", "ALREADY_BLOCKED"); }
}

export class UserNotBlockedError extends UsersError {
  constructor() { super("L'utilisateur n'est pas bloqué.", "NOT_BLOCKED"); }
}
