import { assertEquals, assertStringIncludes } from "@std/assert";
import { join } from "@std/path";
import { exists } from "@std/fs";

// Mock PostgreSQL client for testing
// Define types for our mock database
type TableRow = { table_name: string };
type ColumnRow = {
  column_name: string;
  data_type: string;
  is_nullable: string;
  column_default: string | null;
};

class MockClient {
  #connected = false;
  #tables: TableRow[] = [
    { table_name: "users" },
    { table_name: "posts" },
    { table_name: "comments" },
  ];

  #columns: Record<
    string,
    Array<
      {
        column_name: string;
        data_type: string;
        is_nullable: string;
        column_default: string | null;
      }
    >
  > = {
    "users": [
      {
        column_name: "id",
        data_type: "uuid",
        is_nullable: "NO",
        column_default: "uuid_generate_v4()",
      },
      {
        column_name: "username",
        data_type: "varchar",
        is_nullable: "NO",
        column_default: null,
      },
      {
        column_name: "email",
        data_type: "varchar",
        is_nullable: "NO",
        column_default: null,
      },
      {
        column_name: "created_at",
        data_type: "timestamp",
        is_nullable: "NO",
        column_default: "CURRENT_TIMESTAMP",
      },
    ],
    "posts": [
      {
        column_name: "id",
        data_type: "uuid",
        is_nullable: "NO",
        column_default: "uuid_generate_v4()",
      },
      {
        column_name: "user_id",
        data_type: "uuid",
        is_nullable: "NO",
        column_default: null,
      },
      {
        column_name: "title",
        data_type: "varchar",
        is_nullable: "NO",
        column_default: null,
      },
      {
        column_name: "content",
        data_type: "text",
        is_nullable: "NO",
        column_default: null,
      },
      {
        column_name: "published",
        data_type: "bool",
        is_nullable: "NO",
        column_default: "false",
      },
      {
        column_name: "created_at",
        data_type: "timestamp",
        is_nullable: "NO",
        column_default: "CURRENT_TIMESTAMP",
      },
    ],
    "comments": [
      {
        column_name: "id",
        data_type: "uuid",
        is_nullable: "NO",
        column_default: "uuid_generate_v4()",
      },
      {
        column_name: "post_id",
        data_type: "uuid",
        is_nullable: "NO",
        column_default: null,
      },
      {
        column_name: "user_id",
        data_type: "uuid",
        is_nullable: "NO",
        column_default: null,
      },
      {
        column_name: "content",
        data_type: "text",
        is_nullable: "NO",
        column_default: null,
      },
      {
        column_name: "created_at",
        data_type: "timestamp",
        is_nullable: "NO",
        column_default: "CURRENT_TIMESTAMP",
      },
    ],
  };

  constructor() {
    this.#connected = true;
  }

  queryObject(query: string, params: unknown[] = []) {
    // Mock the query responses based on the query
    if (query.includes("information_schema.tables")) {
      return { rows: this.#tables };
    } else if (query.includes("information_schema.columns")) {
      const tableName = params[0] as string;
      return { rows: this.#columns[tableName] || [] };
    }

    return { rows: [] };
  }

  end() {
    this.#connected = false;
  }
}

// Mock environment for testing
async function setupTestEnvironment() {
  const testDir = join(Deno.cwd(), "tests", "temp");

  // Create test directory if it doesn't exist
  if (!await exists(testDir)) {
    await Deno.mkdir(testDir, { recursive: true });
  }

  // Create test mappings.json
  const mappingsPath = join(testDir, "mappings.json");
  const mappings = {
    typeMap: {
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
    specialCases: {},
  };

  await Deno.writeTextFile(mappingsPath, JSON.stringify(mappings, null, 2));

  return testDir;
}

// Clean up test environment
async function cleanupTestEnvironment(testDir: string) {
  await Deno.remove(testDir, { recursive: true });
}

// Mock the main function for testing
async function mockGenerateRustTypes(options: {
  outputPath?: string;
  sqlx?: boolean;
}) {
  const client = new MockClient();
  const testDir = await setupTestEnvironment();

  // Default output path
  const outputPath = options.outputPath || join(testDir, "test_types.rs");

  // Read mappings
  const mappingsPath = join(testDir, "mappings.json");
  const mappingsText = await Deno.readTextFile(mappingsPath);
  const mappings = JSON.parse(mappingsText);

  // Generate Rust types
  let rustOutput = "// Generated Rust types for PostgreSQL database\n\n";

  // Add necessary imports
  if (options.sqlx) {
    rustOutput += `use sqlx;\n`;
    rustOutput += `use serde::{Deserialize, Serialize};\n`;
  } else {
    rustOutput += `use serde::{Deserialize, Serialize};\n`;
  }
  rustOutput += `use chrono;\n`;
  rustOutput += `use uuid;\n`;
  rustOutput += `use serde_json;\n\n`;

  // Get all tables
  const tablesResult = await client.queryObject(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
    ORDER BY table_name
  `);

  // Generate a struct for each table
  for (const table of tablesResult.rows as TableRow[]) {
    const tableName = table.table_name;

    // Get columns for this table
    const columnsResult = await client.queryObject(
      `
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = $1
      ORDER BY ordinal_position
    `,
      [tableName],
    );

    // Generate struct
    if (options.sqlx) {
      // SQLx attributes only
      rustOutput += `#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]\n`;
      rustOutput += `#[sqlx(rename_all = "camelCase")]\n`;
      rustOutput += `#[sqlx(table = "${tableName}")]\n`;
    } else {
      // Serde attributes only
      rustOutput += `#[derive(Debug, Serialize, Deserialize)]\n`;
      rustOutput += `#[serde(rename_all = "camelCase")]\n`;
      rustOutput += `#[serde(rename = "${tableName}")]\n`;
    }

    // Convert table name to PascalCase for struct name
    const structName = tableName
      .split("_")
      .map((part: string) =>
        part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
      )
      .join("");

    rustOutput += `pub struct ${structName} {\n`;

    // Add fields for each column
    for (const column of columnsResult.rows as ColumnRow[]) {
      const columnName = column.column_name;
      const dataType = column.data_type;
      const isNullable = column.is_nullable === "YES";

      // Convert column name to snake_case for field name
      const fieldName = columnName.toLowerCase();

      // Get Rust type for this PostgreSQL type
      const rustType = isNullable
        ? `Option<${mappings.typeMap[dataType] || "String"}>`
        : mappings.typeMap[dataType] || "String";

      // Add field with doc comment
      rustOutput += `    /// ${columnName} - ${dataType}${
        isNullable ? ", nullable" : ""
      }${column.column_default ? `, default: ${column.column_default}` : ""}\n`;

      // Add rename attributes if field name is different from original column name
      if (fieldName !== columnName.toLowerCase()) {
        if (options.sqlx) {
          // Add only SQLx rename attribute
          rustOutput += `    #[sqlx(rename = "${columnName}")]\n`;
        } else {
          // Add only Serde rename attribute
          rustOutput += `    #[serde(rename = "${columnName}")]\n`;
        }
      }

      rustOutput += `    pub ${fieldName}: ${rustType},\n`;
    }

    rustOutput += `}\n\n`;
  }

  // Write to file
  await Deno.writeTextFile(outputPath, rustOutput);

  await client.end();

  return {
    outputPath,
    testDir,
  };
}

// Integration tests
Deno.test("Generate Rust types with Serde attributes", async () => {
  const { outputPath, testDir } = await mockGenerateRustTypes({
    sqlx: false,
  });

  // Check if the output file exists
  const fileExists = await exists(outputPath);
  assertEquals(fileExists, true);

  // Read the generated file
  const content = await Deno.readTextFile(outputPath);

  // Check if it contains the expected content
  assertStringIncludes(content, "use serde::{Deserialize, Serialize};");
  assertStringIncludes(content, "#[derive(Debug, Serialize, Deserialize)]");
  assertStringIncludes(content, '#[serde(rename_all = "camelCase")]');
  assertStringIncludes(content, "pub struct Users {");

  // Clean up
  await cleanupTestEnvironment(testDir);
});

Deno.test("Generate Rust types with SQLx attributes", async () => {
  const { outputPath, testDir } = await mockGenerateRustTypes({
    sqlx: true,
  });

  // Check if the output file exists
  const fileExists = await exists(outputPath);
  assertEquals(fileExists, true);

  // Read the generated file
  const content = await Deno.readTextFile(outputPath);

  // Check if it contains the expected content
  assertStringIncludes(content, "use sqlx;");
  assertStringIncludes(
    content,
    "#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]",
  );
  assertStringIncludes(content, '#[sqlx(rename_all = "camelCase")]');
  assertStringIncludes(content, '#[sqlx(table = "users")]');

  // Clean up
  await cleanupTestEnvironment(testDir);
});
