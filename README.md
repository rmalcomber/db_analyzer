# DB Analyzer

A Deno application that connects to a PostgreSQL database and generates Rust
types for all tables and columns. This tool helps streamline the process of
creating type-safe Rust code for interacting with PostgreSQL databases.

## Features

- Connects to PostgreSQL using a connection string from a `.env` file
- Automatically generates a default `mappings.json` file if one doesn't exist
- Generates Rust types for all tables in the public schema
- Follows Rust best practices:
  - PascalCase for struct names
  - snake_case for field names
  - Appropriate Rust types for PostgreSQL data types
  - Nullable fields wrapped in `Option<T>`
  - Includes documentation comments with original column names and types
- Flexible attribute generation:
  - Serde attributes for JSON serialization/deserialization (default)
  - SQLx attributes for database operations (optional)

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
5. Automatically create a default `mappings.json` file if one doesn't exist

### Command-line Arguments

You can customize the output location, filename, and attribute style using
command-line arguments:

```bash
# Show help
deno task start -- --help

# Specify output filename
deno task start -- --name my_types.rs

# Specify output directory
deno task start -- --dir /path/to/output

# Specify full output path
deno task start -- --output /path/to/output/my_types.rs

# Generate types with SQLx attributes instead of Serde
deno task start -- --sqlx
```

Available options:

| Option            | Alias | Description                                                  |
| ----------------- | ----- | ------------------------------------------------------------ |
| `--output <path>` | `-o`  | Full output path for the generated file                      |
| `--dir <dir>`     | `-d`  | Output directory (default: current directory)                |
| `--name <name>`   | `-n`  | Output filename (default: `<database_name>_types.rs`)        |
| `--sqlx`          | `-s`  | Use SQLx rename attributes instead of Serde (default: false) |
| `--help`          | `-h`  | Show help message                                            |

## Generated Output

The generated Rust file will include:

- Rust structs for each table with appropriate naming
- Field types mapped to idiomatic Rust types based on PostgreSQL types
- Documentation comments for each field including original column name, type,
  and nullability
- Appropriate attributes based on your selection:
  - **Default**: Serde attributes for JSON serialization/deserialization
  - **With `--sqlx`**: SQLx attributes for database operations

### Example Output (Default with Serde)

```rust
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
#[serde(rename = "users")]
pub struct Users {
    /// id - uuid, primary key
    pub id: uuid::Uuid,
    /// user_name - varchar
    #[serde(rename = "user_name")]
    pub user_name: String,
    /// created_at - timestamp
    #[serde(rename = "created_at")]
    pub created_at: chrono::NaiveDateTime,
}
```

### Example Output (With SQLx)

```rust
#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
#[sqlx(rename_all = "camelCase")]
#[sqlx(table = "users")]
pub struct Users {
    /// id - uuid, primary key
    pub id: uuid::Uuid,
    /// user_name - varchar
    #[sqlx(rename = "user_name")]
    pub user_name: String,
    /// created_at - timestamp
    #[sqlx(rename = "created_at")]
    pub created_at: chrono::NaiveDateTime,
}
```

## Installation

### Option 1: Download Pre-built Binaries

You can download the pre-built binaries directly from the GitHub repository's
releases section:

1. Go to the [Releases](https://github.com/yourusername/db_analyzer/releases)
   page
2. Download the appropriate binary for your platform:
   - `db_analyzer.exe` for Windows
   - `db_analyzer` for macOS
   - `db_analyzer` for Linux
3. Make the file executable (macOS/Linux only):
   ```bash
   chmod +x db_analyzer
   ```

### Option 2: Build from Source

The project includes a build script that compiles the application for multiple
platforms:

```bash
# Make the build script executable
chmod +x build.sh

# Run the build script
./build.sh
```

This will:

1. Create a `bin` directory with subdirectories for each platform (Windows,
   macOS, Linux)
2. Compile the application for each platform
3. Place the binaries in the appropriate directories
4. Generate README files for each platform with usage instructions

After building, you can find the binaries in:

- `bin/windows/db_analyzer.exe` for Windows
- `bin/macos/db_analyzer` for macOS
- `bin/linux/db_analyzer` for Linux

## Using the Binary

Once you have the binary for your platform, you can use it directly from the
command line. Make sure to create a `.env` file in the same directory as the
binary with your PostgreSQL connection string.

### Basic Usage

```bash
# Windows
.\db_analyzer.exe

# macOS/Linux
./db_analyzer
```

### Examples

```bash
# Generate types with default settings
./db_analyzer

# Show help and available options
./db_analyzer --help

# Generate types with a custom output filename
./db_analyzer --name my_database_types.rs

# Generate types in a specific directory
./db_analyzer --dir ./src/models

# Generate types with SQLx attributes instead of Serde
./db_analyzer --sqlx

# Combine multiple options
./db_analyzer --sqlx --dir ./src/models --name database_types.rs
```

### Integration with Rust Projects

To use the generated types in your Rust project:

1. Run the DB Analyzer to generate your types file
2. Copy the generated `.rs` file to your Rust project's source directory
3. Import the types in your Rust code:

```rust
// If using Serde (default)
use your_project::YourTypeName;

// If using SQLx
use sqlx::query_as;

async fn get_records(pool: &sqlx::PgPool) -> Result<Vec<YourTypeName>, sqlx::Error> {
    let records = query_as::<_, YourTypeName>("SELECT * FROM your_table")
        .fetch_all(pool)
        .await?;
    Ok(records)
}
```

## Dependencies

- [Deno](https://deno.land/) (for development and running the application)
- PostgreSQL database (for connecting and retrieving schema information)

## Type Mappings

The application uses a `mappings.json` file to map PostgreSQL types to Rust
types. This file will be automatically generated if it doesn't exist. You can
customize the mappings by editing this file.
