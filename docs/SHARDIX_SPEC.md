# Shardix Specification

## Project Overview

Shardix is a distributed key-value database built from scratch using
TypeScript and Node.js.

Shardix will initially run as a single-node, in-memory key-value database.
It will later evolve into a persistent and distributed database supporting
network communication, replication, failure detection, leader election,
and sharding.

## Main Goal

The goal of Shardix is to understand and implement the internal components
of a database and distributed system instead of relying on an existing
database such as Redis, PostgreSQL, or MongoDB.

## First Version Scope

The first version of Shardix will:

- Run as a single Node.js process
- Store data in memory
- Store string keys and string values
- Support basic key-value operations
- Validate inputs
- Return consistent results and errors
- Include unit tests for the storage engine

## First Version Architecture

Client Code
    |
    v
Storage Engine
    |
    v
Map<string, string>

## Out of Scope for the First Version

The first version will not include:

- Disk persistence
- TCP networking
- CLI client
- Replication
- Leader election
- Sharding
- Authentication
- SQL queries
- Tables
- Transactions
- Frontend dashboard





## Data Model

The first version of Shardix stores data as key-value pairs.

```txt
key -> value
```

Both keys and values are strings.

Examples:

```txt
name -> Siva
user:1 -> {"name":"Siva Ram","role":"Backend Engineer"}
session:abc123 -> active
```

Internally, the first version uses:

```ts
Map<string, string>
```

## Key Rules

* Keys must be strings.
* Keys cannot be empty.
* Keys are case-sensitive.
* Leading and trailing spaces in keys are not allowed.
* Maximum key-size limits will be added later.

These are treated as different keys:

```txt
name
Name
NAME
```

## Value Rules

* Values must be strings.
* Empty string values are allowed.
* Values can contain spaces.
* JSON can be stored as a string.
* Maximum value-size limits will be added later.

Example:

```txt
user:1 -> {"name":"Siva Ram","age":22}
```

## Storage Engine Operations

The storage engine provides the following internal methods.

### set

Stores a new key-value pair or replaces the existing value.

```ts
set(key: string, value: string): void
```

Example:

```txt
set("name", "Siva")
set("name", "Ram")
```

Final stored value:

```txt
name -> Ram
```

### get

Returns the value associated with a key.

```ts
get(key: string): string | undefined
```

If the key exists, its value is returned.

If the key does not exist, `undefined` is returned.

### delete

Deletes a key and its value.

```ts
delete(key: string): boolean
```

Returns:

```txt
true  -> key existed and was deleted
false -> key did not exist
```

### exists

Checks whether a key exists.

```ts
exists(key: string): boolean
```

Returns:

```txt
true
false
```

### keys

Returns all stored keys.

```ts
keys(): string[]
```

The order of returned keys is not guaranteed.

### clear

Deletes all stored key-value pairs.

```ts
clear(): void
```

### size

Returns the number of stored keys.

```ts
size(): number
```

## External Commands

Later, the command processor will expose these commands to users:

```txt
SET key value
GET key
DELETE key
EXISTS key
KEYS
CLEAR
SIZE
```

## External Command Responses

### SET

Request:

```txt
SET name Siva
```

Response:

```txt
OK
```

### GET

When the key exists:

```txt
Siva
```

When the key does not exist:

```txt
KEY_NOT_FOUND
```

### DELETE

When the key exists:

```txt
DELETED
```

When the key does not exist:

```txt
KEY_NOT_FOUND
```

### EXISTS

Response:

```txt
true
```

or:

```txt
false
```

### KEYS

Response:

```txt
["name", "city", "user:1"]
```

### CLEAR

Response:

```txt
OK
```

### SIZE

Response:

```txt
3
```

## Error Codes

Shardix will initially use the following error codes:

```txt
EMPTY_KEY
INVALID_COMMAND
INVALID_ARGUMENTS
KEY_NOT_FOUND
INTERNAL_ERROR
```

### Error Conditions

```txt
EMPTY_KEY
```

Returned when a key is empty or contains only spaces.

```txt
INVALID_COMMAND
```

Returned when the provided command is not supported.

```txt
INVALID_ARGUMENTS
```

Returned when a command does not receive the required arguments.

```txt
KEY_NOT_FOUND
```

Returned when GET or DELETE is used with a missing key.

```txt
INTERNAL_ERROR
```

Returned when Shardix encounters an unexpected internal failure.

## Initial Success Criteria

The first storage engine is considered complete when all of these behaviours work correctly:

```txt
set stores a new value
set updates an existing value
get returns an existing value
get returns undefined for a missing key
delete removes an existing key
delete returns false for a missing key
exists correctly identifies stored keys
keys returns all stored keys
clear removes all stored data
size returns the correct number of stored keys
empty keys are rejected
```


## Initial Architecture

The first working version of Shardix will have three main parts:

```txt
Test / App Code
      |
      v
Storage Engine
      |
      v
In-Memory Map
```

The storage engine is the core component responsible for storing, retrieving, updating, and deleting key-value data.

In the first version, Shardix will not have a command parser, TCP server, CLI client, disk storage, replication, or sharding.

## Phase 1 Components

Phase 1 will contain only the in-memory storage engine.

Expected files:

```txt
src/
└── core/
    ├── StorageEngine.ts
    ├── errors.ts
    └── types.ts

tests/
└── StorageEngine.test.ts
```

## File Responsibilities

### StorageEngine.ts

This file contains the main `StorageEngine` class.

Responsibilities:

* Store key-value pairs in memory
* Add or update values
* Retrieve values
* Delete keys
* Check whether a key exists
* Return all keys
* Clear all data
* Return the number of stored keys
* Validate keys before performing operations

### types.ts

This file contains shared TypeScript types used by the core database engine.

Initial examples:

```txt
Key
Value
StorageEntry
```

These types may grow later when Shardix adds commands, persistence, networking, and replication.

### errors.ts

This file contains Shardix-specific error classes or error codes.

Initial errors:

```txt
EMPTY_KEY
INTERNAL_ERROR
```

More errors will be added later when the command parser and TCP server are built.

### StorageEngine.test.ts

This file contains unit tests for the storage engine.

The tests should verify:

```txt
set stores a value
set updates an existing value
get returns an existing value
get returns undefined for a missing key
delete removes an existing key
delete returns false for a missing key
exists returns true for existing keys
exists returns false for missing keys
keys returns all keys
clear removes all keys
size returns the correct count
empty keys are rejected
```

## Phase 1 Success Criteria

Phase 1 is complete when:

```txt
StorageEngine is implemented
All storage engine methods work correctly
Invalid empty keys are rejected
All unit tests pass
No persistence or networking code exists yet
```

## Important Rule

Shardix will be built in layers.

The storage engine should not know anything about:

```txt
TCP
CLI
files
replication
sharding
Docker
```

It should only focus on managing in-memory key-value data.

This keeps the system clean and easy to extend later.
