import { load } from "https://deno.land/std@0.220.1/dotenv/mod.ts";
import { Client } from "https://deno.land/x/postgres@v0.17.0/mod.ts";
import { join } from "https://deno.land/std@0.220.1/path/mod.ts";
import { parse } from "https://deno.land/std@0.220.1/flags/mod.ts";

// Parse command-line arguments
// Remove the '--' separator that Deno adds when using 'deno task start -- --arg value'
const cleanArgs = Deno.args.filter((arg) => arg !== "--");

const args = parse(cleanArgs, {
  string: ["output", "dir", "name"],
  boolean: ["help", "sqlx"],
  alias: {
    o: "output", // Full output path
    d: "dir", // Output directory
    n: "name", // Output filename
    h: "help", // Help flag
    s: "sqlx", // Use SQLx rename attributes instead of Serde
  },
  default: {
    dir: Deno.cwd(), // Default to current directory
    sqlx: false, // Default to using Serde rename attributes
  },
});

console.log("Command-line arguments:", args);

// Show help if requested
if (args.help) {
  // Detect if running as a compiled binary
  let isCompiledBinary = false;
  try {
    // Check if this is a compiled executable
    isCompiledBinary = !Deno.execPath().includes("deno");
  } catch (_e) {
    // If Deno.execPath() is not available, fallback to checking mainModule
    isCompiledBinary = Deno.mainModule.startsWith("file://") &&
      !Deno.mainModule.endsWith(".js") &&
      !Deno.mainModule.endsWith(".ts");
  }

  // Get the executable name
  let executableName;
  try {
    executableName = isCompiledBinary
      ? Deno.execPath().split("/").pop() || "db_analyzer"
      : "main.ts";
  } catch (_e) {
    executableName = isCompiledBinary
      ? Deno.mainModule.split("/").pop() || "db_analyzer"
      : "main.ts";
  }

  // Create appropriate command examples based on execution context
  const commandPrefix = isCompiledBinary
    ? `./${executableName}`
    : "deno run --allow-net --allow-read --allow-env main.ts";

  console.log(`
DB Analyzer - Generate Rust types from PostgreSQL database

USAGE:
  ${commandPrefix} [OPTIONS]

OPTIONS:
  -o, --output <path>    Full output path for the generated file
  -d, --dir <dir>        Output directory (default: current directory)
  -n, --name <name>      Output filename (default: database_name_types.rs)
  -s, --sqlx             Use SQLx rename attributes instead of Serde (default: false)
  -h, --help             Show this help message

EXAMPLES:
  ${commandPrefix}
  ${commandPrefix} --name my_types.rs
  ${commandPrefix} --dir /path/to/output
  ${commandPrefix} --output /path/to/output/my_types.rs
`);
  Deno.exit(0);
}

// Load environment variables from .env file
await load({ export: true });

const connectionString = Deno.env.get("DATABASE_URL");
if (!connectionString) {
  console.error("DATABASE_URL environment variable is not set");
  Deno.exit(1);
}

// Load type mappings from JSON file or create default if it doesn't exist
const mappingsPath = join(Deno.cwd(), "mappings.json");
type MappingsType = {
  typeMap: Record<string, string>;
  specialCases?: Record<string, string>;
};
let mappings: MappingsType;

try {
  const mappingsText = await Deno.readTextFile(mappingsPath);
  mappings = JSON.parse(mappingsText) as MappingsType;
} catch (_error) {
  // If file doesn't exist or can't be parsed, create default mappings
  console.log("Creating default mappings.json file...");
  mappings = {
    "typeMap": {
      "int2": "i16",
      "int4": "i32",
      "int8": "i64",
      "float4": "f32",
      "float8": "f64",
      "numeric": "f64",
      "bool": "bool",
      "varchar": "String",
      "char": "String",
      "text": "String",
      "uuid": "uuid::Uuid",
      "date": "chrono::NaiveDate",
      "timestamp": "chrono::NaiveDateTime",
      "timestamptz": "chrono::DateTime<chrono::Utc>",
      "json": "serde_json::Value",
      "jsonb": "serde_json::Value",
    },
    "specialCases": {
      // Add any special case mappings here
      // For example: "some_table_name": "CustomStructName"
    },
  };

  // Write default mappings to file
  await Deno.writeTextFile(mappingsPath, JSON.stringify(mappings, null, 2));
  console.log(`✅ Created default mappings.json file at ${mappingsPath}`);
}

// PostgreSQL data type to Rust type mapping
const pgToRustTypeMap: Record<string, string> = mappings.typeMap;

// Convert PostgreSQL column name to Rust snake_case field name
function toRustFieldName(name: string): string {
  // First convert camelCase to snake_case
  const snakeCase = name
    .replace(/([a-z])([A-Z])/g, "$1_$2") // Convert camelCase to snake_case
    .replace(/([A-Z])([A-Z][a-z])/g, "$1_$2") // Handle consecutive uppercase letters
    .toLowerCase() // Convert to lowercase
    .replace(/[^a-z0-9_]/g, "_"); // Replace non-alphanumeric chars with underscores

  return snakeCase;
}

// Convert PostgreSQL table name to Rust PascalCase struct name
function toRustStructName(name: string): string {
  // Use special cases from mappings.json
  const specialCases: Record<string, string> = mappings.specialCases || {};

  // Check if this is a special case
  const lowerName = name.toLowerCase();
  if (specialCases[lowerName]) {
    return specialCases[lowerName];
  }

  // Handle normal cases - split by non-alphanumeric characters and convert to PascalCase
  return name
    .split(/[^a-zA-Z0-9]/) // Split on non-alphanumeric characters
    .map((part) => {
      if (!part) return "";

      // Check if part is an acronym (all uppercase)
      if (part.toUpperCase() === part && part.length > 1) {
        return part; // Keep acronyms as is
      }

      // Handle camelCase parts like "accountInfo" -> "AccountInfo"
      const camelCaseParts = part.replace(/([a-z])([A-Z])/g, "$1 $2").split(
        " ",
      );
      return camelCaseParts
        .map((subPart) =>
          subPart.charAt(0).toUpperCase() + subPart.slice(1).toLowerCase()
        )
        .join("");
    })
    .join("");
}

// Get Rust type for PostgreSQL data type
function getRustType(pgType: string, isNullable: boolean): string {
  let rustType = pgToRustTypeMap[pgType] || pgToRustTypeMap["default"];

  // Handle array types
  if (pgType.endsWith("[]")) {
    const baseType = pgType.slice(0, -2);
    const baseRustType = pgToRustTypeMap[baseType] ||
      pgToRustTypeMap["default"];
    rustType = `Vec<${baseRustType}>`;
  }

  // Add Option wrapper for nullable fields
  if (isNullable) {
    rustType = `Option<${rustType}>`;
  }

  return rustType;
}

async function generateRustTypes() {
  const client = new Client(connectionString);
  try {
    await client.connect();
    console.log("Connected to PostgreSQL database");

    // Get all tables in the public schema
    const tablesResult = await client.queryObject<{ table_name: string }>(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);

    let rustOutput = "// Generated Rust types for PostgreSQL database\n\n";

    // Add necessary imports
    if (args.sqlx) {
      rustOutput += `use sqlx;\n`;
      rustOutput += `use serde::{Deserialize, Serialize};\n`;
    } else {
      rustOutput += `use serde::{Deserialize, Serialize};\n`;
    }
    rustOutput += `use chrono;\n`;
    rustOutput += `use uuid;\n`;
    rustOutput += `use serde_json;\n\n`;

    for (const table of tablesResult.rows) {
      const tableName = table.table_name;
      const structName = toRustStructName(tableName);

      // Get columns for this table
      const columnsResult = await client.queryObject<{
        column_name: string;
        data_type: string;
        is_nullable: string;
        column_default: string | null;
      }>(
        `
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = $1
        ORDER BY ordinal_position
      `,
        [tableName],
      );

      // Generate struct
      if (args.sqlx) {
        // SQLx attributes only
        rustOutput +=
          `#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]\n`;
        rustOutput += `#[sqlx(rename_all = "camelCase")]\n`;
        rustOutput += `#[sqlx(table = "${tableName}")]\n`;
      } else {
        // Serde attributes only
        rustOutput += `#[derive(Debug, Serialize, Deserialize)]\n`;
        rustOutput += `#[serde(rename_all = "camelCase")]\n`;
        rustOutput += `#[serde(rename = "${tableName}")]\n`;
      }
      rustOutput += `pub struct ${structName} {\n`;

      for (const column of columnsResult.rows) {
        const originalColumnName = column.column_name;
        const fieldName = toRustFieldName(originalColumnName);
        const isNullable = column.is_nullable === "YES";
        const rustType = getRustType(column.data_type, isNullable);

        // Add field with doc comment
        rustOutput += `    /// ${originalColumnName} - ${column.data_type}${
          isNullable ? ", nullable" : ""
        }${
          column.column_default ? `, default: ${column.column_default}` : ""
        }\n`;

        // Add rename attributes if field name is different from original column name
        if (fieldName !== originalColumnName.toLowerCase()) {
          if (args.sqlx) {
            // Add only SQLx rename attribute
            rustOutput += `    #[sqlx(rename = "${originalColumnName}")]\n`;
          } else {
            // Add only Serde rename attribute
            rustOutput += `    #[serde(rename = "${originalColumnName}")]\n`;
          }
        }

        rustOutput += `    pub ${fieldName}: ${rustType},\n`;
      }

      rustOutput += `}\n\n`;
    }

    // Extract database name from connection string
    let dbName = "db";
    try {
      // Parse the connection string to extract the database name
      if (connectionString) {
        const url = new URL(connectionString);
        // The pathname starts with a slash, so we remove it and split by any query params
        const pathParts = url.pathname.substring(1).split("?");
        if (pathParts[0]) {
          dbName = pathParts[0];
        }
      }
    } catch (_e) {
      console.warn(
        "Could not parse database name from connection string, using default name",
      );
    }

    // Determine output path based on command-line arguments
    let outputPath: string;

    if (args.output) {
      // If full output path is specified, use it directly
      outputPath = args.output;
    } else {
      // Determine output directory
      const outputDir = args.dir || Deno.cwd();

      // Determine output filename
      let outputFilename: string;
      if (args.name) {
        outputFilename = args.name;
      } else {
        outputFilename = `${dbName}_types.rs`;
      }

      // Combine directory and filename
      outputPath = join(outputDir, outputFilename);
    }

    // Write to file
    await Deno.writeTextFile(outputPath, rustOutput);
    console.log(`Rust types generated and saved to ${outputPath}`);
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await client.end();
  }
}

if (import.meta.main) {
  await generateRustTypes();
}
