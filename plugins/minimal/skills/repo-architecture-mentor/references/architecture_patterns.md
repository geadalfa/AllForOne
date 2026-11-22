# Architecture Pattern Detection

Verify from **imports, call direction, and deployment units** — never from folder names alone.

## Layered / MVC

**Cues:** `controllers/`, `services/`, `repositories/`; controller calls service calls repository.
**Check:** grep imports of `database/sql`, ORM, or HTTP frameworks inside `domain/` or `services/`.
**Risk:** fat controllers, business logic in SQL, layer bypass.
**Refactor implication:** extract use-cases before splitting deployment.

## Clean / Hexagonal

**Cues:** `domain/` or `core/` with no framework imports; `ports/`, `adapters/`, `usecases/`.
**Check:** domain package imports only stdlib/interfaces.
**Risk:** over-abstraction, excessive mapping, interface explosion.
**Refactor implication:** preserve ports; add adapters, do not leak transport types into domain.

## Modular monolith

**Cues:** one deployable, strong module boundaries, module-local migrations.
**Check:** cross-module imports; shared database tables.
**Risk:** hidden coupling through shared tables and global utilities.
**Refactor implication:** enforce module contracts before extracting services.

## Microservices

**Cues:** separate repos/pipelines, API gateway, service discovery, per-service DB.
**Check:** synchronous call chains, shared libraries, distributed transactions.
**Risk:** latency amplification, partial failure, data duplication.
**Refactor implication:** never change a contract without consumer inventory.

## Event-driven

**Cues:** Kafka/RabbitMQ producers and consumers, topic constants, schema registry.
**Check:** message schema, partition key, retry/DLQ, idempotency.
**Risk:** schema drift, duplicate delivery, ordering assumptions.
**Refactor implication:** version events; never rename topics silently.

## CQRS

**Cues:** separate write and read models, projections, eventual consistency.
**Check:** projection lag, replay strategy.
**Risk:** stale reads, duplicated logic, projection rebuild downtime.
**Refactor implication:** document read-after-write expectations.

## Saga / orchestration

**Cues:** compensating actions, state machine, orchestration service.
**Check:** every step has a compensation and timeout.
**Risk:** partial failure leaves inconsistent state.
**Refactor implication:** add compensation before splitting a transaction.

## BFF (Backend for Frontend)

**Cues:** per-client gateway aggregating downstream services.
**Check:** duplicated business rules between BFF and service.
**Risk:** logic drift across clients.
**Refactor implication:** keep orchestration in BFF, invariants in domain services.

## MVVM / VIPER (iOS)

**Cues:** ViewModel/Interactor/Router, bindings, Combine/async streams.
**Check:** view controller size, retain cycles, main-thread work.
**Risk:** massive view controllers, broken navigation ownership.
**Refactor implication:** extract use-cases before changing UI state flow.

## Redux / Flux (React Native)

**Cues:** store, actions, reducers, selectors, middleware.
**Check:** server state vs client state duplication.
**Risk:** stale selectors, re-render storms, business logic in components.
**Refactor implication:** separate server cache from UI state first.

## Detection evidence table

| Claim | Evidence to collect |
|---|---|
| "This is layered" | Controller → service → repository call chain with `file:line` |
| "This is event-driven" | Producer topic + consumer group + schema |
| "This is microservices" | Separate deploy pipelines + independent databases |
| "This is hexagonal" | Domain imports have no framework dependencies |
| "This is CQRS" | Separate write path and read projection |
