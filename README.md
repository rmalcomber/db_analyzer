# DB Analyzer

A Deno application that connects to a PostgreSQL database and generates Rust types for all tables and columns.

## Features

- Connects to PostgreSQL using a connection string from a `.env` file
- Generates Rust types for all tables in the public schema
- Follows Rust best practices:
  - PascalCase for struct names
  - snake_case for field names
  - Appropriate Rust types for PostgreSQL data types
  - Nullable fields wrapped in `Option<T>`
  - Includes documentation comments with original column names and types

## Setup

1. Create a `.env` file with your PostgreSQL connection string:
   ```
   DATABASE_URL=postgres://username:password@localhost:5432/database_name
   ```

2. Replace the placeholder values with your actual PostgreSQL credentials.

## Usage

Run the application with:

```bash
deno task start
```

This will:
1. Connect to your PostgreSQL database
2. Query the database schema
3. Generate Rust types for all tables
4. Save the types to `<database_name>_types.rs` in the current directory

### Command-line Arguments

You can customize the output location and filename using command-line arguments:

```bash
# Show help
deno task start -- --help

# Specify output filename
deno task start -- --name my_types.rs

# Specify output directory
deno task start -- --dir /path/to/output

# Specify full output path
deno task start -- --output /path/to/output/my_types.rs
```

Available options:

| Option | Alias | Description |
|--------|-------|-------------|
| `--output <path>` | `-o` | Full output path for the generated file |
| `--dir <dir>` | `-d` | Output directory (default: current directory) |
| `--name <name>` | `-n` | Output filename (default: `<database_name>_types.rs`) |
| `--help` | `-h` | Show help message |

## Generated Output

The generated `db_types.rs` file will include:

- Rust structs for each table with appropriate naming
- Field types mapped to idiomatic Rust types
- Documentation comments for each field
- Serde derive macros for serialization/deserialization

## Dependencies

- Deno
- PostgreSQL database
