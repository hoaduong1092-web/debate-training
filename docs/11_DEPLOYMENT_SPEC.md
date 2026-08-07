# 11 — Deployment Specification

**Document:** `docs/11_DEPLOYMENT_SPEC.md`  
**Project:** AI Debate Master — Thinking OS  
**Blueprint Version:** 3.0.0  
**Source of Truth:** `ai-debate-master-blueprint-v3.pdf`  
**Referenced Blueprint Section:** Section 17 — Deployment Architecture  
**Document Status:** Specification  
**Compliance Rule:** This document MUST NOT introduce deployment architecture, infrastructure technology, operational behavior, or lifecycle logic that is not explicitly supported by Blueprint v3.0.0. Any unspecified detail MUST be marked as `SPEC GAP`.

---

# 1. Document Purpose & Scope

## 1.1 Purpose

This document specifies the deployment architecture requirements for **AI Debate Master — Thinking OS**, directly aligned with **Section 17 — Deployment Architecture** of Blueprint v3.0.0.

The purpose of this specification is to define:

- The required core infrastructure components.
- The distributed Microservices deployment model.
- The persistence and caching infrastructure.
- Real-time communication requirements.
- Audio storage requirements.
- Storage tiers and data lifecycle requirements.
- Deployment-level performance targets.
- Explicit areas where Blueprint v3.0.0 does not provide sufficient implementation detail.

This document is an implementation constraint document, not an architectural expansion.

---

## 1.2 Scope

The scope of this document is limited to deployment architecture and infrastructure requirements explicitly represented by Blueprint Section 17.

The deployment architecture covered by this specification consists of:

- Nginx / FastAPI Gateway
- Distributed Microservices
- PostgreSQL RDBMS
- Redis Session / Cache
- WebSocket Real-time Communication
- Cloud Storage for Opus Audio
- Hot / Warm / Cold Storage lifecycle tiers

This document does NOT define implementation details that are absent from Blueprint v3.0.0.

Where such details are required for implementation, they are explicitly identified as:

`SPEC GAP: [Missing specification]`

---

# 2. Deployment Architecture Overview

## 2.1 Architectural Model

AI Debate Master — Thinking OS uses a **distributed Microservices architecture**.

The deployment architecture consists of a Gateway layer, backend services, persistent relational storage, cache/session infrastructure, real-time communication, and cloud-based audio storage.

The high-level deployment structure is:

    Client
       |
       v
    Nginx / FastAPI Gateway
       |
       +-----------------------------+
       |             |               |
       v             v               v
    Backend      Real-time       Other
    Services     WebSocket       Services
       |             |
       +-------------+
              |
       +------+----------------------+
       |                             |
       v                             v
    PostgreSQL                    Redis
       |
       |
       v
    Persistent Data

    Audio
       |
       v
    Cloud Storage
       |
       +--> Hot Storage
       +--> Warm Storage
       +--> Cold Storage

The exact internal service decomposition is governed by the corresponding Blueprint specifications and MUST NOT be expanded in this deployment document unless explicitly defined elsewhere in the Blueprint.

---

# 3. Core Infrastructure Stack

## 3.1 Infrastructure Components

The deployment environment MUST provide the following infrastructure components specified by Blueprint Section 17:

| Component | Role |
|---|---|
| Nginx / FastAPI | Gateway / request entry point |
| Microservices | Distributed backend application architecture |
| PostgreSQL | Relational database management system |
| Redis | Session and cache infrastructure |
| WebSocket | Real-time communication |
| Cloud Storage | Storage for Opus audio |
| Whisper STT | Speech-to-text processing target referenced by performance requirements |

---

## 3.2 Nginx / FastAPI Gateway

The system uses an **Nginx / FastAPI Gateway** layer as the entry point for application traffic.

The Gateway layer is responsible for providing the deployment boundary between clients and backend services.

The exact responsibilities assigned to Nginx versus FastAPI are not further specified in Blueprint Section 17.

Therefore:

`SPEC GAP: Blueprint does not explicitly define the responsibility split between Nginx and FastAPI.`

`SPEC GAP: Blueprint does not specify whether Nginx performs TLS termination, load balancing, static asset serving, rate limiting, or other edge functions.`

`SPEC GAP: Blueprint does not specify the exact Gateway routing configuration.`

---

# 4. Distributed Microservices Architecture

## 4.1 Microservices Model

The backend MUST be deployed according to the distributed **Microservices architecture** defined by Blueprint Section 17.

Services are expected to operate as independently deployable backend components within the overall system architecture.

The deployment specification does not invent additional services beyond those explicitly defined by the Blueprint.

---

## 4.2 Service Discovery

The mechanism used for service discovery is not explicitly defined by Blueprint Section 17.

`SPEC GAP: Service discovery mechanism is not specified.`

No assumption is made regarding:

- Kubernetes Service Discovery
- DNS-based discovery
- Consul
- Service mesh
- Static service addresses
- Other discovery mechanisms

---

## 4.3 Service Scaling

The Blueprint establishes a distributed Microservices architecture but does not provide a concrete scaling policy.

`SPEC GAP: Horizontal and vertical scaling rules for individual Microservices are not specified.`

`SPEC GAP: Minimum and maximum service replica counts are not specified.`

`SPEC GAP: Autoscaling metrics and thresholds are not specified.`

---

# 5. PostgreSQL — RDBMS

## 5.1 Role

PostgreSQL is the system's relational database management system.

It is responsible for persistent structured application data according to the data model defined by the project specifications.

PostgreSQL MUST be treated as persistent storage and MUST NOT be replaced by Redis for durable relational data.

---

## 5.2 Database Deployment

The Blueprint specifies PostgreSQL as the RDBMS but does not specify the concrete deployment topology.

`SPEC GAP: PostgreSQL deployment topology is not specified.`

`SPEC GAP: Primary/replica configuration is not specified.`

`SPEC GAP: Database backup frequency and retention are not specified.`

`SPEC GAP: PostgreSQL failover strategy is not specified.`

`SPEC GAP: Database connection pooling configuration is not specified.`

---

# 6. Redis — Session / Cache

## 6.1 Role

Redis is used for:

- Session management.
- Cache operations.

Redis is therefore a performance-oriented transient infrastructure layer and is distinct from PostgreSQL persistent storage.

---

## 6.2 Cache Performance Target

The required Redis cache retrieval performance target is:

**Redis cache retrieval latency < 10 ms**

This target is a deployment-level performance requirement.

The exact measurement methodology is not defined by Blueprint.

`SPEC GAP: Blueprint does not specify whether the <10 ms target is measured at application level, Redis command level, network round-trip level, or end-to-end request level.`

---

## 6.3 Redis Persistence

Blueprint Section 17 does not define whether Redis persistence mechanisms such as RDB snapshots or AOF are required.

`SPEC GAP: Redis persistence mode is not specified.`

`SPEC GAP: Redis failover / replication topology is not specified.`

---

# 7. WebSocket — Real-time Communication

## 7.1 Requirement

The deployment architecture MUST support **WebSocket-based real-time communication**.

WebSocket provides the real-time communication channel required by the application architecture.

---

## 7.2 WebSocket Deployment

The Blueprint does not specify the exact WebSocket deployment topology.

`SPEC GAP: WebSocket connection termination architecture is not specified.`

`SPEC GAP: WebSocket load-balancing strategy is not specified.`

`SPEC GAP: WebSocket connection affinity / sticky-session requirements are not specified.`

`SPEC GAP: WebSocket connection limits and timeout values are not specified.`

---

# 8. Cloud Storage — Opus Audio

## 8.1 Role

Cloud Storage is used for **Opus Audio** storage.

Audio data MUST therefore be stored in the cloud storage tier rather than being treated as ordinary relational database payloads unless another Blueprint specification explicitly requires otherwise.

---

## 8.2 Audio Format

The deployment architecture explicitly references **Opus Audio**.

The exact encoding parameters are not defined by this document.

`SPEC GAP: Opus codec configuration, bitrate, sample rate, channel configuration, and encoding parameters are not specified unless defined elsewhere in Blueprint v3.0.0.`

---

## 8.3 Cloud Provider

The Blueprint identifies Cloud Storage but does not specify a particular cloud provider.

`SPEC GAP: Blueprint does not specify whether the deployment uses AWS, Google Cloud Platform, Microsoft Azure, or another cloud provider.`

No cloud provider MUST be selected as a normative requirement based solely on this document.

---

# 9. Storage Tiers & Data Lifecycle

## 9.1 Overview

The system uses three storage lifecycle tiers:

1. **Hot Storage**
2. **Warm Storage**
3. **Cold Storage**

The lifecycle classification is based on data age.

The lifecycle requirements are:

| Storage Tier | Data Age | Required Data |
|---|---:|---|
| Hot Storage | 0–30 days | Full data |
| Warm Storage | 31–180 days | Compressed Audio and Transcript |
| Cold Storage | >180 days | Score and Thinking DNA only |

These lifecycle rules are mandatory deployment requirements.

---

# 10. Hot Storage

## 10.1 Retention Period

Hot Storage applies to data from:

**0–30 days**

---

## 10.2 Data Content

Hot Storage MUST retain the **full data** associated with the applicable records.

This means that during the Hot Storage period, the system MUST NOT apply the Warm or Cold data reduction policy.

---

## 10.3 Hot Storage Requirements

Hot Storage is intended to provide access to the complete recent data set.

The exact physical storage implementation is not fully specified by Blueprint Section 17.

`SPEC GAP: Blueprint does not specify the exact storage backend used for each Hot Storage data category beyond the stated infrastructure components.`

---

# 11. Warm Storage

## 11.1 Retention Period

Warm Storage applies to data from:

**31–180 days**

---

## 11.2 Data Transformation

During the Warm Storage phase:

- Audio MUST be compressed.
- Transcript MUST be compressed.

The purpose is to reduce storage requirements while retaining the specified historical information.

---

## 11.3 Compression Method

The Blueprint requires compression but does not define a concrete compression algorithm or implementation.

`SPEC GAP: Blueprint does not specify the compression algorithm for Audio in Warm Storage.`

`SPEC GAP: Blueprint does not specify the compression algorithm for Transcript in Warm Storage.`

`SPEC GAP: Blueprint does not specify compression ratio targets.`

`SPEC GAP: Blueprint does not specify whether compression occurs synchronously or asynchronously.`

---

# 12. Cold Storage

## 12.1 Retention Period

Cold Storage applies to data older than:

**180 days**

---

## 12.2 Retained Data

Cold Storage MUST retain only:

- Score
- Thinking DNA

The Cold Storage tier therefore represents the long-term analytical/minimal-retention representation defined by the Blueprint.

Audio and Transcript are not retained in the Cold Storage tier according to the stated lifecycle policy.

---

## 12.3 Cold Storage Implementation

The Blueprint does not specify the exact physical implementation of Cold Storage.

`SPEC GAP: Blueprint does not specify the concrete Cold Storage technology or provider.`

`SPEC GAP: Blueprint does not specify the migration mechanism from Warm Storage to Cold Storage.`

`SPEC GAP: Blueprint does not specify whether deletion of non-retained Warm data occurs automatically or through a scheduled lifecycle process.`

---

# 13. Data Lifecycle Transition

## 13.1 Lifecycle Model

The required lifecycle is:

    0–30 days
        |
        v
    HOT
    Full Data
        |
        | after 30 days
        v
    31–180 days
        |
        v
    WARM
    Compressed Audio + Transcript
        |
        | after 180 days
        v
    COLD
    Score + Thinking DNA only

---

## 13.2 Lifecycle Automation

The Blueprint defines the lifecycle states but does not specify the implementation mechanism responsible for moving data between tiers.

`SPEC GAP: Lifecycle scheduler / worker implementation is not specified.`

`SPEC GAP: Exact transition trigger is not specified.`

`SPEC GAP: Lifecycle job frequency is not specified.`

`SPEC GAP: Failure handling and retry policy for lifecycle transitions are not specified.`

---

# 14. SLA & Performance Targets

The deployment architecture MUST target the following performance requirements.

| Metric | Target |
|---|---:|
| Audio Latency | < 500 ms |
| Redis Cache Retrieval | < 10 ms |
| Whisper STT Accuracy | > 95% |

These targets are normative requirements for the deployment specification to the extent defined by Blueprint v3.0.0.

---

# 15. Audio Latency

## 15.1 Target

The required Audio Latency target is:

**< 500 ms**

---

## 15.2 Measurement Definition

The Blueprint does not provide sufficient detail to define the exact beginning and end points of the latency measurement.

`SPEC GAP: Blueprint does not explicitly define whether Audio Latency means client-to-server latency, audio ingestion latency, processing latency, WebSocket latency, or end-to-end audio pipeline latency.`

`SPEC GAP: Percentile target such as P50, P95, or P99 is not specified.`

---

# 16. Redis Cache Performance

## 16.1 Target

Redis cache retrieval MUST target:

**< 10 ms**

---

## 16.2 Measurement Definition

The exact measurement boundary is not specified.

`SPEC GAP: Blueprint does not define the measurement environment, network conditions, workload, concurrency level, or percentile used to validate the <10 ms Redis target.`

---

# 17. Whisper STT Accuracy

## 17.1 Target

The STT system based on **Whisper** MUST target:

**> 95% accuracy**

---

## 17.2 Accuracy Measurement

The Blueprint does not specify the exact evaluation methodology for this target.

`SPEC GAP: Blueprint does not define the dataset used to evaluate Whisper accuracy.`

`SPEC GAP: Blueprint does not define the accuracy metric used for the >95% requirement.`

`SPEC GAP: Blueprint does not define language-specific evaluation criteria.`

`SPEC GAP: Blueprint does not define environmental conditions such as noise level, speaker count, microphone quality, or speaking rate for STT evaluation.`

---

# 18. Deployment Environment

## 18.1 Cloud Provider

The deployment architecture requires Cloud Storage but does not identify a specific provider.

`SPEC GAP: AWS / GCP / Azure / other cloud provider is not specified by Blueprint v3.0.0.`

No provider-specific deployment configuration is defined in this document.

---

## 18.2 Containerization

Blueprint Section 17 does not provide a concrete container specification.

`SPEC GAP: Docker image structure is not specified.`

`SPEC GAP: Dockerfile requirements are not specified.`

`SPEC GAP: Container base images are not specified.`

`SPEC GAP: Container resource requests and limits are not specified.`

---

## 18.3 Kubernetes

The Blueprint does not provide a Kubernetes deployment specification.

`SPEC GAP: Kubernetes is not explicitly specified as the orchestration platform.`

`SPEC GAP: Kubernetes manifests are not specified.`

`SPEC GAP: Namespace structure is not specified.`

`SPEC GAP: Deployment / StatefulSet configuration is not specified.`

`SPEC GAP: Service configuration is not specified.`

`SPEC GAP: Ingress configuration is not specified.`

`SPEC GAP: Horizontal Pod Autoscaler configuration is not specified.`

---

# 19. Networking

The deployment architecture requires communication between the Gateway, Microservices, PostgreSQL, Redis, WebSocket infrastructure, and Cloud Storage.

However, Blueprint Section 17 does not provide a detailed network topology.

`SPEC GAP: VPC / network segmentation is not specified.`

`SPEC GAP: Private versus public subnet configuration is not specified.`

`SPEC GAP: Firewall / security-group rules are not specified.`

`SPEC GAP: Internal service communication protocol details are not fully specified.`

---

# 20. TLS / Security at Deployment Layer

Blueprint Section 17 does not provide a complete deployment security specification.

`SPEC GAP: TLS certificate management is not specified.`

`SPEC GAP: HTTPS termination location is not specified.`

`SPEC GAP: Internal service encryption requirements are not specified.`

`SPEC GAP: Cloud Storage access-control configuration is not specified.`

`SPEC GAP: Redis network security configuration is not specified.`

`SPEC GAP: PostgreSQL network-access policy is not specified.`

These items MUST NOT be invented as mandatory architecture requirements without an explicit Blueprint update.

---

# 21. CI/CD

The Blueprint does not provide a CI/CD pipeline specification.

`SPEC GAP: CI/CD platform is not specified.`

`SPEC GAP: Build pipeline is not specified.`

`SPEC GAP: Test pipeline is not specified.`

`SPEC GAP: Deployment pipeline is not specified.`

`SPEC GAP: Rollback mechanism is not specified.`

`SPEC GAP: Deployment approval process is not specified.`

---

# 22. Observability

Blueprint Section 17 does not define a complete observability stack.

`SPEC GAP: Logging platform is not specified.`

`SPEC GAP: Metrics platform is not specified.`

`SPEC GAP: Distributed tracing platform is not specified.`

`SPEC GAP: Alerting platform is not specified.`

`SPEC GAP: Required infrastructure dashboards are not specified.`

---

# 23. Backup & Disaster Recovery

The Blueprint identifies PostgreSQL and Cloud Storage but does not provide a disaster-recovery specification.

`SPEC GAP: PostgreSQL backup schedule is not specified.`

`SPEC GAP: PostgreSQL backup retention is not specified.`

`SPEC GAP: Cloud Storage backup / replication policy is not specified.`

`SPEC GAP: Recovery Point Objective (RPO) is not specified.`

`SPEC GAP: Recovery Time Objective (RTO) is not specified.`

`SPEC GAP: Disaster recovery region / topology is not specified.`

---

# 24. High Availability

The distributed Microservices architecture does not by itself define a complete high-availability policy.

`SPEC GAP: Required availability percentage is not specified.`

`SPEC GAP: Multi-instance requirements are not specified.`

`SPEC GAP: Multi-zone deployment is not specified.`

`SPEC GAP: Multi-region deployment is not specified.`

`SPEC GAP: Failover procedures are not specified.`

---

# 25. Explicit Deployment Specification Gaps

The following deployment details are explicitly identified as **SPEC GAP** because Blueprint v3.0.0 does not provide sufficient implementation detail:

1. `SPEC GAP: Specific cloud provider (AWS / GCP / Azure / other) is not specified.`
2. `SPEC GAP: Docker configuration and image specifications are not specified.`
3. `SPEC GAP: Kubernetes configuration and manifests are not specified.`
4. `SPEC GAP: CI/CD pipeline is not specified.`
5. `SPEC GAP: Warm Storage compression algorithm is not specified.`
6. `SPEC GAP: Warm Storage compression process is not specified.`
7. `SPEC GAP: Exact Hot/Warm/Cold physical storage implementation is not fully specified.`
8. `SPEC GAP: Data lifecycle automation mechanism is not specified.`
9. `SPEC GAP: Lifecycle transition scheduler and retry mechanism are not specified.`
10. `SPEC GAP: PostgreSQL high-availability topology is not specified.`
11. `SPEC GAP: PostgreSQL backup and disaster-recovery policy is not specified.`
12. `SPEC GAP: Redis persistence and failover configuration is not specified.`
13. `SPEC GAP: WebSocket scaling and load-balancing strategy is not specified.`
14. `SPEC GAP: Nginx/FastAPI responsibility split is not specified.`
15. `SPEC GAP: Service discovery mechanism is not specified.`
16. `SPEC GAP: Container resource requirements are not specified.`
17. `SPEC GAP: Network topology and segmentation are not specified.`
18. `SPEC GAP: TLS/certificate management is not specified.`
19. `SPEC GAP: Observability stack is not specified.`
20. `SPEC GAP: Audio latency measurement methodology is not specified.`
21. `SPEC GAP: Redis latency measurement methodology is not specified.`
22. `SPEC GAP: Whisper accuracy evaluation methodology is not specified.`
23. `SPEC GAP: SLA availability percentage is not specified.`
24. `SPEC GAP: RPO/RTO requirements are not specified.`

These gaps MUST remain explicitly visible until resolved by an authoritative Blueprint revision or an approved project specification that formally extends the Source of Truth.

---

# 26. Deployment Compliance Checklist

| # | Requirement | Status |
|---:|---|---|
| 1 | Distributed Microservices architecture | REQUIRED |
| 2 | Nginx / FastAPI Gateway | REQUIRED |
| 3 | PostgreSQL RDBMS | REQUIRED |
| 4 | Redis Session / Cache | REQUIRED |
| 5 | WebSocket Real-time Communication | REQUIRED |
| 6 | Cloud Storage for Opus Audio | REQUIRED |
| 7 | Hot Storage: 0–30 days | REQUIRED |
| 8 | Hot Storage retains full data | REQUIRED |
| 9 | Warm Storage: 31–180 days | REQUIRED |
| 10 | Warm Audio compressed | REQUIRED |
| 11 | Warm Transcript compressed | REQUIRED |
| 12 | Cold Storage: >180 days | REQUIRED |
| 13 | Cold Storage retains Score | REQUIRED |
| 14 | Cold Storage retains Thinking DNA | REQUIRED |
| 15 | Audio Latency < 500 ms | TARGET |
| 16 | Redis retrieval < 10 ms | TARGET |
| 17 | Whisper STT accuracy > 95% | TARGET |
| 18 | Specific cloud provider | SPEC GAP |
| 19 | Docker specification | SPEC GAP |
| 20 | Kubernetes specification | SPEC GAP |
| 21 | CI/CD pipeline | SPEC GAP |
| 22 | Warm compression method | SPEC GAP |
| 23 | Lifecycle automation mechanism | SPEC GAP |
| 24 | Disaster recovery specification | SPEC GAP |
| 25 | Observability specification | SPEC GAP |

---

# 27. Compliance Rules

The implementation team MUST follow these rules:

1. Do not replace the Microservices architecture with a monolithic deployment without an explicit Blueprint change.
2. Do not replace PostgreSQL with another RDBMS without an explicit Blueprint change.
3. Do not replace Redis as the specified Session / Cache infrastructure without an explicit Blueprint change.
4. Do not remove WebSocket real-time communication where required by the architecture.
5. Do not replace Cloud Storage as the specified Opus Audio storage layer without an explicit Blueprint change.
6. Do not modify the 0–30 day Hot Storage lifecycle.
7. Do not modify the 31–180 day Warm Storage lifecycle.
8. Do not modify the >180 day Cold Storage lifecycle.
9. Do not retain Audio or Transcript in Cold Storage unless the Blueprint is explicitly revised.
10. Do not invent a cloud provider as a normative requirement.
11. Do not invent Kubernetes or Docker requirements as if they were already defined by Blueprint.
12. Do not invent a compression algorithm for Warm Storage.
13. Do not invent SLA measurement methodologies where the Blueprint has not specified them.
14. All unresolved deployment details MUST remain marked as `SPEC GAP`.

---

# 28. Document Status

**Status:** Specification aligned with Blueprint v3.0.0 Section 17.

**Source of Truth:** `ai-debate-master-blueprint-v3.pdf`

**Blueprint Section:** Section 17 — Deployment Architecture

**Implementation Authority:** Blueprint v3.0.0 takes precedence over this document.

**SPEC GAP Policy:** Any implementation detail not explicitly defined by Blueprint MUST NOT be inferred as a mandatory architectural requirement. It MUST be recorded as `SPEC GAP` until formally specified.

**Change Control:** Any change to the deployment architecture, storage lifecycle, infrastructure stack, or performance targets MUST be validated against the authoritative Blueprint before implementation.

---

# 29. Final Deployment Definition

The deployment architecture for AI Debate Master — Thinking OS is therefore formally defined at the Blueprint level as:

**Distributed Microservices + Nginx/FastAPI Gateway + PostgreSQL RDBMS + Redis Session/Cache + WebSocket Real-time Communication + Cloud Storage for Opus Audio**

with the mandatory data lifecycle:

**Hot (0–30 days) → Full Data**

**Warm (31–180 days) → Compressed Audio + Transcript**

**Cold (>180 days) → Score + Thinking DNA**

and the deployment performance targets:

**Audio Latency < 500 ms**

**Redis Cache Retrieval < 10 ms**

**Whisper STT Accuracy > 95%**

All deployment implementation details beyond these explicitly defined requirements remain subject to the documented `SPEC GAP` items and MUST NOT be fabricated or implicitly promoted to Blueprint requirements.
