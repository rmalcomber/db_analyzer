import { assertEquals } from "https://deno.land/std@0.220.1/assert/mod.ts";
import { parse } from "https://deno.land/std@0.220.1/flags/mod.ts";

// Import helper functions from main.ts
// Note: We're using relative imports here
import { toRustFieldName, toRustStructName, toRustType } from "../utils.ts";

Deno.test("toRustFieldName converts PostgreSQL column names to Rust snake_case", () => {
  // Test camelCase to snake_case
  assertEquals(toRustFieldName("userId"), "user_id");

  // Test PascalCase to snake_case
  assertEquals(toRustFieldName("UserId"), "user_id");

  // Test with underscores already present
  assertEquals(toRustFieldName("user_id"), "user_id");

  // Test with mixed case and underscores
  assertEquals(toRustFieldName("User_Id"), "user_id");

  // Test with special characters
  assertEquals(toRustFieldName("user-id"), "user_id");
  assertEquals(toRustFieldName("user.id"), "user_id");

  // Test with numbers
  assertEquals(toRustFieldName("user123Id"), "user123_id");

  // Test with all uppercase
  assertEquals(toRustFieldName("USERID"), "userid");
});

Deno.test("toRustStructName converts PostgreSQL table names to Rust PascalCase", () => {
  // Test snake_case to PascalCase
  assertEquals(toRustStructName("user_profiles"), "UserProfiles");

  // Test camelCase to PascalCase
  assertEquals(toRustStructName("userProfiles"), "UserProfiles");

  // Test already PascalCase
  assertEquals(toRustStructName("UserProfiles"), "UserProfiles");

  // Test with special characters
  assertEquals(toRustStructName("user-profiles"), "UserProfiles");

  // Test with numbers
  assertEquals(toRustStructName("user123_profiles"), "User123Profiles");

  // Test with all uppercase
  assertEquals(toRustStructName("USER_PROFILES"), "UserProfiles");
});

Deno.test("toRustType converts PostgreSQL types to Rust types", () => {
  // Create a mock type map
  const typeMap = {
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
  };

  // Test basic type conversions
  assertEquals(toRustType("int4", false, typeMap), "i32");
  assertEquals(toRustType("varchar", false, typeMap), "String");
  assertEquals(toRustType("uuid", false, typeMap), "uuid::Uuid");

  // Test nullable types (should be wrapped in Option<T>)
  assertEquals(toRustType("int4", true, typeMap), "Option<i32>");
  assertEquals(toRustType("varchar", true, typeMap), "Option<String>");
  assertEquals(toRustType("uuid", true, typeMap), "Option<uuid::Uuid>");

  // Test unknown type (should default to String)
  assertEquals(toRustType("unknown_type", false, typeMap), "String");
  assertEquals(toRustType("unknown_type", true, typeMap), "Option<String>");
});

Deno.test("Command-line argument parsing works correctly", () => {
  // Test default values
  const args1 = parse(["--help"], {
    boolean: ["help", "sqlx"],
    string: ["output", "dir", "name"],
    alias: {
      o: "output",
      d: "dir",
      n: "name",
      h: "help",
      s: "sqlx",
    },
    default: {
      dir: Deno.cwd(),
      sqlx: false,
    },
  });

  assertEquals(args1.help, true);
  assertEquals(args1.sqlx, false);
  assertEquals(args1.dir, Deno.cwd());

  // Test setting values
  const args2 = parse(["--sqlx", "--dir", "/tmp", "--name", "test.rs"], {
    boolean: ["help", "sqlx"],
    string: ["output", "dir", "name"],
    alias: {
      o: "output",
      d: "dir",
      n: "name",
      h: "help",
      s: "sqlx",
    },
    default: {
      dir: Deno.cwd(),
      sqlx: false,
    },
  });

  assertEquals(args2.sqlx, true);
  assertEquals(args2.dir, "/tmp");
  assertEquals(args2.name, "test.rs");
  assertEquals(args2.help, false);
});
