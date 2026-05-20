const idPattern = /^[a-z][A-Za-z0-9]*$/;

export function validateIdGroup(location: string, ids: string[], errors: string[]): void {
  for (const id of ids) {
    if (!idPattern.test(id)) {
      errors.push(`${location} contains invalid id "${id}"; expected camelCase matching ${idPattern.toString()}`);
    }
  }
}
