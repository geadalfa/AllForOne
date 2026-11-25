# Resource Catalog — Repo Learning OS

All links verified **2026-11-10** (HTTP 200 unless noted). Use official docs first; blogs only for explanations.

## 1. Code intelligence & navigation

| Resource | Link | Use |
|---|---|---|
| Sourcegraph | https://sourcegraph.com/ | Cross-repo symbol search, references, call sites |
| Tree-sitter | https://tree-sitter.github.io/tree-sitter/ | AST parsing for custom code maps |
| Language Server Protocol | https://microsoft.github.io/language-server-protocol/ | Go-to-definition, references, diagnostics |
| Semgrep | https://semgrep.dev/ | Pattern-based code audit, custom rules |
| SonarQube | https://www.sonarsource.com/products/sonarqube/ | Quality gates, duplication, security hotspots |
| Mermaid | https://mermaid.js.org/ | Sequence, flow, ER, C4-style diagrams |
| Draw.io | https://www.drawio.com/ | Manual architecture diagrams |
| Structurizr | https://structurizr.com/ | C4 model as code |

## 2. Architecture & design

| Resource | Link | Use |
|---|---|---|
| Martin Fowler | https://martinfowler.com/ | Refactoring, PoEAA, CQRS, strangler fig |
| Microservices.io | https://microservices.io/ | Pattern catalog: saga, outbox, API gateway |
| The Twelve-Factor App | https://12factor.net/ | Service hygiene checklist |
| Refactoring.Guru | https://refactoring.guru/ | Design patterns and refactoring moves |
| C4 model | https://c4model.com/ | Context → container → component → code |
| arc42 | https://arc42.org/ | Architecture documentation template |
| ADR | https://adr.github.io/ | Decision records |
| CNCF Landscape | https://www.cncf.io/ | Cloud-native tool map |
| Google SRE Books | https://sre.google/books/ | Reliability, SLO, incident response |
| AWS Well-Architected | https://docs.aws.amazon.com/wellarchitected/ | Review lenses |
| Azure Architecture Center | https://learn.microsoft.com/en-us/azure/architecture/ | Reference architectures |
| Google Cloud Architecture Center | https://cloud.google.com/architecture | Reference architectures |

## 3. Languages & frameworks

| Stack | Official docs |
|---|---|
| Go | https://go.dev/doc/ |
| Laravel | https://laravel.com/docs |
| CodeIgniter 3 | https://codeigniter.com/user_guide/ |
| Python | https://docs.python.org/3/ |
| Swift | https://www.swift.org/documentation/ |
| Apple platforms | https://developer.apple.com/documentation/ |
| React Native | https://reactnative.dev/docs/getting-started |
| Kotlin | https://kotlinlang.org/docs/home.html |
| Android | https://developer.android.com/docs |
| .NET | https://learn.microsoft.com/en-us/dotnet/ |
| Java | https://docs.oracle.com/en/java/ |
| Web platform (MDN) | https://developer.mozilla.org/en-US/docs/Web |

## 4. Data, caching, streaming

| Resource | Link | Use |
|---|---|---|
| PostgreSQL | https://www.postgresql.org/docs/ | Schema, indexes, query plans |
| MySQL | https://dev.mysql.com/doc/ | InnoDB, locks, replication (403 to bots; valid in browser) |
| Redis | https://redis.io/docs/latest/ | Data structures, TTL, eviction |
| Apache Kafka | https://kafka.apache.org/documentation/ | Topics, partitions, consumer groups |
| Confluent docs | https://docs.confluent.io/ | Schema Registry, connectors |
| Debezium | https://debezium.io/documentation/ | CDC patterns |
| Kafka UI | https://github.com/provectus/kafka-ui | Local topic/consumer inspection |
| RedisInsight | https://redis.io/insight/ | Redis key inspection |
| DBeaver | https://dbeaver.io/ | Multi-DB exploration |

## 5. Observability & runtime

| Resource | Link |
|---|---|
| OpenTelemetry | https://opentelemetry.io/docs/ |
| Jaeger | https://www.jaegertracing.io/ |
| Prometheus | https://prometheus.io/docs/ |

## 6. Machine learning

| Resource | Link | Use |
|---|---|---|
| scikit-learn | https://scikit-learn.org/stable/ | Classical ML, pipelines |
| PyTorch | https://pytorch.org/docs/ | Deep learning |
| TensorFlow | https://www.tensorflow.org/ | Deep learning / TFLite |
| Hugging Face docs | https://huggingface.co/docs | Transformers, datasets |
| Papers with Code | https://paperswithcode.com/ | Paper → implementation |
| arXiv cs.SE | https://arxiv.org/list/cs.SE/recent | Software engineering preprints |
| arXiv cs.LG | https://arxiv.org/list/cs.LG/recent | Machine learning preprints |

## 7. Open-source exemplars to study

| Repo | Why |
|---|---|
| https://github.com/kubernetes/kubernetes | Large Go monorepo, controllers, API machinery |
| https://github.com/grafana/grafana | Go backend + TypeScript frontend |
| https://github.com/laravel/framework | PHP framework internals, container, queues |
| https://github.com/gin-gonic/gin | Minimal Go HTTP router |
| https://github.com/redis/redis | C, event loop, data structures |
| https://github.com/apache/kafka | Distributed log, replication |
| https://github.com/pocketbase/pocketbase | Compact Go full-stack reference |

## 8. Research journals & conferences

| Venue | Link |
|---|---|
| IEEE Transactions on Software Engineering | https://www.computer.org/csdl/journal/ts |
| ACM TOSEM | https://dl.acm.org/journal/tosem (403 to bots; valid in browser) |
| ICSE | https://conf.researchr.org/series/icse |
| FSE | https://conf.researchr.org/series/fse |
| ASE | https://conf.researchr.org/series/ase |

## 9. How to use this catalog

1. For a language question: official docs → repo idiom → exemplar repo.
2. For an architecture question: C4/arc42/Microservices.io → pattern evidence in code.
3. For a refactor question: Fowler + Refactoring.Guru + `references/refactor_safety.md`.
4. For a data/async question: official DB/Kafka docs → repo producer/consumer code → runtime tool (Kafka UI, RedisInsight).
