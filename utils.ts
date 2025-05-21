// Utility functions extracted from main.ts for testing

// Convert PostgreSQL column name to Rust snake_case field name
export function toRustFieldName(name: string): string {
  // First convert camelCase to snake_case
  const snakeCase = name
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .toLowerCase();

  // Then replace any non-alphanumeric characters with underscores
  return snakeCase.replace(/[^a-z0-9_]/g, "_");
}

// Convert PostgreSQL table name to Rust PascalCase struct name
export function toRustStructName(name: string): string {
  // Use special cases from mappings.json if available
  // Note: In the test environment, we don't use special cases

  // Convert to snake_case first (to handle camelCase)
  const snakeCase = name
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .toLowerCase();

  // Replace any non-alphanumeric characters with underscores
  const cleanName = snakeCase.replace(/[^a-z0-9_]/g, "_");

  // Convert to PascalCase
  return cleanName
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join("");
}

// Convert PostgreSQL type to Rust type
export function toRustType(
  pgType: string,
  isNullable: boolean,
  typeMap: Record<string, string>,
): string {
  // Get the Rust type from the mapping
  const rustType = typeMap[pgType] || "String";

  // Wrap in Option if nullable
  return isNullable ? `Option<${rustType}>` : rustType;
}
