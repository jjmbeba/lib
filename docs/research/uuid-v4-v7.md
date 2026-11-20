# UUID v4 and v7 for Book identifiers

## Decision context

V1 assigns each Book a stable identifier that is exported to CSV and reused to match records during imports. The Go service uses SQLite. The library sorts Books by most recently added, so that order needs an explicit persisted field rather than an accidental property of the identifier.

Go 1.27 provides the standard-library `uuid` package, including `uuid.NewV4()` and `uuid.NewV7()`. Both choices avoid an external UUID dependency. The standard library describes V4 as random and V7 as time ordered; its V7 generator sorts increasingly except when the system clock moves backwards. [Go 1.27 release notes](https://go.dev/doc/go1.27#uuid), [Go `uuid` package](https://pkg.go.dev/uuid).

## Comparison

| Concern | UUID v4 | UUID v7 |
| --- | --- | --- |
| Construction | 122 random bits. | Unix timestamp in the high 48 bits, with random data in the remaining available bits. Go documents at least 62 random bits. |
| CSV identity | Works as a stable merge identifier when the imported ID is preserved. Its value reveals no generation timestamp. | Also works as a stable merge identifier when preserved. Its embedded timestamp reveals approximate creation time to anyone who receives the ID. |
| Ordering | Random values do not sort by creation time. Use the explicit added-order field for newest-first views. | Lexicographic order is time-oriented. Go’s generator orders returned values increasingly unless the system clock moves backwards. Keep the explicit added-order field as the product’s source of truth. |
| SQLite index behavior | Random insert keys can have poorer B-tree locality as an index grows. | Time-ordered inserts can have better index locality. RFC 9562 describes this benefit for database indexes, while its magnitude depends on the workload and database layout. |
| Operational trade-off | Simpler privacy properties and no clock-order dependency. | Sortability and potential index locality, with timestamp disclosure and dependence on system time. |

The UUID RFC says UUIDv7 uses Unix epoch milliseconds in its most significant 48 bits. It also states that UUIDv6/v7 are designed to sort as raw bytes and that time-ordered IDs can improve database-index locality. The RFC cautions implementers to consider system-clock changes and monotonicity. [RFC 9562 §§5.7, 6.1, 6.2, 6.11, 8](https://www.rfc-editor.org/rfc/rfc9562.html).

## SQLite considerations

Both UUID versions have the same encoded size; V7 does not make an identifier smaller. The RFC recommends storing UUIDs as 128-bit binary when practical, while text is easier to inspect and exchange. CSV still uses the textual form either way. [RFC 9562 §6.13](https://www.rfc-editor.org/rfc/rfc9562.html#section-6.13).

SQLite ordinary tables are stored in a table B-tree keyed by the rowid. An `INTEGER PRIMARY KEY` aliases that rowid; a text UUID primary key does not. Therefore, if SQLite uses a hidden/explicit integer rowid plus a unique UUID column for CSV identity, V7 affects the UUID index’s locality, not the table’s rowid clustering. This is a schema choice separate from V4 versus V7. [SQLite file format: table representation](https://www.sqlite.org/fileformat.html#representation_of_sql_tables).

For a personal library, the expected number of Books is small. V7’s index-locality benefit is unlikely to be a meaningful performance requirement at that scale; this is an inference from the workload, not a measured benchmark. If the project later grows substantially, benchmark the chosen SQLite schema before optimizing around UUID order.

## Practical trade-off for this app

- Choose V4 when a Book ID should be opaque and must not expose an approximate creation time. Newest-first ordering remains explicit in the stored added-order field.
- Choose V7 when time-sortable IDs and potentially better index locality are useful, and revealing the generation time through exported IDs is acceptable.
- With either version, CSV import must preserve the source ID to match and update a previously exported Book. Generate a new ID only for a genuinely new Book.
- Neither version should be treated as an authorization secret. The UUID RFC explicitly says UUIDs are not hard to guess reliably and must not be used as security capabilities. [RFC 9562 §8](https://www.rfc-editor.org/rfc/rfc9562.html#section-8).

## Sources

- [RFC 9562: Universally Unique IDentifiers (UUIDs)](https://www.rfc-editor.org/rfc/rfc9562.html)
- [Go 1.27 release notes: new `uuid` package](https://go.dev/doc/go1.27#uuid)
- [Go standard-library `uuid` package](https://pkg.go.dev/uuid)
- [SQLite file format](https://www.sqlite.org/fileformat.html)
