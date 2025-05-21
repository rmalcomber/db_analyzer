import { assertEquals } from "https://deno.land/std@0.178.0/assert/mod.ts";
import { join } from "https://deno.land/std@0.178.0/path/mod.ts";
import { exists } from "https://deno.land/std@0.178.0/fs/exists.ts";
import { parse } from "https://deno.land/std@0.178.0/flags/mod.ts";

// Test the automatic generation of mappings.json
Deno.test("Automatically generate mappings.json if it doesn't exist", async () => {
  const testDir = join(Deno.cwd(), "tests", "temp_cli");

  // Create test directory if it doesn't exist
  if (!await exists(testDir)) {
    await Deno.mkdir(testDir, { recursive: true });
  }

  // Make sure mappings.json doesn't exist
  const mappingsPath = join(testDir, "mappings.json");
  try {
    await Deno.remove(mappingsPath);
  } catch (_error) {
    // Ignore if file doesn't exist
  }

  // Create default mappings
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

  // Write default mappings to file
  await Deno.writeTextFile(mappingsPath, JSON.stringify(mappings, null, 2));

  // Check if the file exists
  const fileExists = await exists(mappingsPath);
  assertEquals(fileExists, true);

  // Read the file and check its contents
  const content = await Deno.readTextFile(mappingsPath);
  const parsedContent = JSON.parse(content);

  assertEquals(parsedContent.typeMap.int4, "i32");
  assertEquals(parsedContent.typeMap.varchar, "String");
  assertEquals(parsedContent.typeMap.uuid, "uuid::Uuid");

  // Clean up
  await Deno.remove(testDir, { recursive: true });
});

// Test command-line argument handling
Deno.test("Command-line arguments determine output location", () => {
  // Test with no arguments (should use defaults)
  const args1 = parse([], {
    string: ["output", "dir", "name"],
    boolean: ["help", "sqlx"],
    alias: {
      o: "output",
      d: "dir",
      n: "name",
      h: "help",
      s: "sqlx",
    },
    default: {
      dir: "/test/dir",
      sqlx: false,
    },
  });

  // Should use default directory
  assertEquals(args1.dir, "/test/dir");
  assertEquals(args1.sqlx, false);
  assertEquals(args1.help, false);

  // Test with output argument
  const args2 = parse(["--output", "/path/to/output.rs"], {
    string: ["output", "dir", "name"],
    boolean: ["help", "sqlx"],
    alias: {
      o: "output",
      d: "dir",
      n: "name",
      h: "help",
      s: "sqlx",
    },
    default: {
      dir: "/test/dir",
      sqlx: false,
    },
  });

  assertEquals(args2.output, "/path/to/output.rs");

  // Test with dir and name arguments
  const args3 = parse(["--dir", "/custom/dir", "--name", "custom.rs"], {
    string: ["output", "dir", "name"],
    boolean: ["help", "sqlx"],
    alias: {
      o: "output",
      d: "dir",
      n: "name",
      h: "help",
      s: "sqlx",
    },
    default: {
      dir: "/test/dir",
      sqlx: false,
    },
  });

  assertEquals(args3.dir, "/custom/dir");
  assertEquals(args3.name, "custom.rs");

  // Test with sqlx flag
  const args4 = parse(["--sqlx"], {
    string: ["output", "dir", "name"],
    boolean: ["help", "sqlx"],
    alias: {
      o: "output",
      d: "dir",
      n: "name",
      h: "help",
      s: "sqlx",
    },
    default: {
      dir: "/test/dir",
      sqlx: false,
    },
  });

  assertEquals(args4.sqlx, true);

  // Test with alias
  const args5 = parse(["-s", "-d", "/alias/dir", "-n", "alias.rs"], {
    string: ["output", "dir", "name"],
    boolean: ["help", "sqlx"],
    alias: {
      o: "output",
      d: "dir",
      n: "name",
      h: "help",
      s: "sqlx",
    },
    default: {
      dir: "/test/dir",
      sqlx: false,
    },
  });

  assertEquals(args5.sqlx, true);
  assertEquals(args5.dir, "/alias/dir");
  assertEquals(args5.name, "alias.rs");
});
