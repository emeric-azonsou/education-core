# ADR 0001: Keep the core dependency-free

## Status

Accepted

## Decision

The core package will use platform APIs and TypeScript only. Format-specific
imports, exporters and UI integrations will live in adapters or separate
packages.

## Rationale

This keeps the assessment model portable across browsers, servers and
offline-first applications. It also reduces installation size and limits the
security surface of the package used by education projects with constrained
infrastructure.

## Consequences

Consumers may need an adapter for PDF, DOCX or database integration. The core
API remains easier to test, cache and embed in other applications.
