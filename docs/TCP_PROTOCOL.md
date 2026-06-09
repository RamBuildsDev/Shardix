# TCP Protocol

Shardix uses a simple newline-delimited TCP protocol.

Each request is one line:

```txt
SET name Siva\n
GET name\n
```

Each response is one line:

```txt
OK\n
Siva\n
KEY_NOT_FOUND\n
```

Supported client commands:

- `SET key value`
- `GET key`
- `DELETE key`
- `EXISTS key`
- `KEYS`
- `SIZE`
- `CLEAR`
- `PING`

Internal replication commands:

- `REPL SET key value`
- `REPL DELETE key`
- `REPL CLEAR`

The protocol is plain text for now. JSON responses and authentication are future
improvements.
