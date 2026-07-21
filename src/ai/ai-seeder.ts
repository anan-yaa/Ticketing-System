import 'dotenv/config';
import { PrismaClient, SystemRole, UserStatus, TicketStatus, TicketPriority, SubStatus } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';

// Initialize Prisma Client with PostgreSQL adapter exactly as required by Prisma v7
let dbUrl = process.env.DATABASE_URL;
if (dbUrl) {
  try {
    const parsedUrl = new URL(dbUrl);
    if (parsedUrl.password) {
      const decodedPassword = decodeURIComponent(parsedUrl.password);
      parsedUrl.password = encodeURIComponent(decodedPassword);
      dbUrl = parsedUrl.toString();
    }
  } catch (err) {
    console.error('Failed to parse and encode DATABASE_URL password:', err);
  }
}

const pool = new Pool({ connectionString: dbUrl });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const RESOLVED_STATUS = ('RESOLVED' in TicketStatus ? (TicketStatus as any).RESOLVED : 'RESOLVED') as any;

interface TicketDataSpec {
  title: string;
  description: string;
  ticketType: string;
  category: string;
  priority: TicketPriority;
  status: any;
  resolutionSummary: string;
}

/**
 * Generates a deterministic or randomized 1536-dimensional float vector normalized between -1 and 1.
 */
function generateMockVector1536(seedText: string): number[] {
  const dimensions = 1536;
  const vector: number[] = new Array(dimensions);
  
  let hash = 0;
  for (let i = 0; i < seedText.length; i++) {
    hash = (hash << 5) - hash + seedText.charCodeAt(i);
    hash |= 0;
  }

  let sumSquares = 0;
  for (let i = 0; i < dimensions; i++) {
    hash = (hash * 1664525 + 1013904223) | 0;
    const val = (hash / 2147483648.0);
    vector[i] = val;
    sumSquares += val * val;
  }

  const magnitude = Math.sqrt(sumSquares) || 1.0;
  for (let i = 0; i < dimensions; i++) {
    vector[i] = Number((vector[i] / magnitude).toFixed(6));
  }

  return vector;
}

const PATCH_RESOLUTIONS = [
  "Identified an IP conflict on the local subnet. Reconfigured the DHCP scope range, flushed the client DNS cache, and successfully renewed the DHCP lease. Verified network connectivity is stable.",
  "Root cause traced to an active session lock on the database pool cluster. Terminated the stale zombie process threads and optimized the connection pool timeout thresholds. Application performance restored.",
  "Investigated user identity sync delay between Active Directory and Okta SSO. Manually triggered an incremental profile synchronization cycle and verified user provisioning policies.",
  "Inspected web application firewall (WAF) rule triggering false positive blocks on `/api/v1/checkout`. Created a targeted URI bypass rule for legitimate client payloads.",
  "Analyzed Kubernetes pod memory exhaustion logs (`OOMKilled - Exit code 137`). Increased container memory resource allocation limits from 512Mi up to 1.5Gi and enabled JVM container support flag.",
  "Resolved VPN split-tunneling DNS resolution leak on Windows 11 endpoints by enforcing corporate DNS search suffixes and updating local group policy registry settings.",
  "Executed non-blocking PostgreSQL index rebuild (`REINDEX INDEX CONCURRENTLY`) on table `users` and ran `ANALYZE` to clean up 88% index bloat and restore query speeds under 5ms."
];

/**
 * Dense dataset of 100 distinct, highly technical historical tickets covering IT, DevOps, Cloud Infrastructure,
 * Database Administration, Network Security, and Workplace Endpoints.
 */
const HEAVY_TICKET_DATASET: TicketDataSpec[] = [
  // --- DEVOPS & KUBERNETES (1-18) ---
  {
    title: "Kubernetes Pod CrashLoopBackOff in Production Payment Gateway",
    description: "Payment processing service pods in us-east-1 prod cluster crash upon startup after deploying v2.4.1. Logs report `OutOfMemoryError: Container killed on request. Exit code 137`.",
    ticketType: "DEVOPS",
    category: "Kubernetes Infrastructure",
    priority: TicketPriority.URGENT,
    status: RESOLVED_STATUS,
    resolutionSummary: "Analyzed heap allocation and JVM memory parameters in container deployment specs. Increased memory limit from 512Mi to 1.5Gi and set `-XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0` to prevent memory overcommit."
  },
  {
    title: "GitHub Actions CI/CD Pipeline Timeout on Docker Layer Cache Build",
    description: "The core microservices CI/CD pipeline has been timing out at the 45-minute limit during the multi-stage build stage. Remote cache eviction is causing full recompilations.",
    ticketType: "DEVOPS",
    category: "CI/CD Pipelines",
    priority: TicketPriority.HIGH,
    status: RESOLVED_STATUS,
    resolutionSummary: "Reconfigured GitHub Actions workflow to utilize `docker/setup-buildx-action` with explicit GitHub Actions cache backend (`type=gha,mode=max`). Reduced build duration from 45+ mins to 4 mins."
  },
  {
    title: "Terraform State Lock Deadlock on AWS S3 DynamoDB Backend",
    description: "Infrastructure automation pipeline failed with `Error acquiring the state lock: ConditionalCheckFailedException`. Multiple concurrent runs deadlocked the Terraform lock table.",
    ticketType: "DEVOPS",
    category: "Infrastructure as Code",
    priority: TicketPriority.HIGH,
    status: RESOLVED_STATUS,
    resolutionSummary: "Verified no active Terraform apply operations were running via CloudWatch logs. Executed `terraform force-unlock <lock-id>` on the S3 state backend and updated CI concurrency limits to prevent simultaneous plan/apply execution."
  },
  {
    title: "Ingress Controller SSL Certificate Expiry on API Gateway Route",
    description: "External clients reporting `SSL_ERROR_EXPIRED_CERT_ALERT` on `api.client-enterprise.com`. cert-manager failed to automatically renew the Let's Encrypt TLS secret.",
    ticketType: "DEVOPS",
    category: "SSL/TLS Certificates",
    priority: TicketPriority.URGENT,
    status: RESOLVED_STATUS,
    resolutionSummary: "Investigated `ClusterIssuer` logs and identified an HTTP-01 challenge failure caused by a recently added CloudFlare WAF firewall rule blocking `.well-known/acme-challenge/`. Whitelisted Let's Encrypt validation IPs and manually triggered certificate re-issuance."
  },
  {
    title: "ArgoCD Application OutOfSync Loop on Helm Chart Value Drift",
    description: "ArgoCD continuously syncs and rolls back the `auth-service` deployment every 3 minutes. Health status shows Degraded due to mismatched replica counts.",
    ticketType: "DEVOPS",
    category: "GitOps / ArgoCD",
    priority: TicketPriority.MEDIUM,
    status: RESOLVED_STATUS,
    resolutionSummary: "Identified a Horizontal Pod Autoscaler (HPA) modifying `spec.replicas` directly, conflicting with the hardcoded `replicas: 2` in the Git repository Helm values. Added `ignoreDifferences` spec for `spec.replicas` inside the ArgoCD Application manifest."
  },
  {
    title: "Prometheus Alertmanager High Memory Consumption on Scraping Exporter",
    description: "Prometheus server pod consumes 32GB RAM and drops target scrapes for `node-exporter` across 150 worker nodes. Query latency exceeds 30 seconds.",
    ticketType: "DEVOPS",
    category: "Monitoring & Observability",
    priority: TicketPriority.HIGH,
    status: RESOLVED_STATUS,
    resolutionSummary: "Traced memory spike to high-cardinality custom metrics emitted by a legacy tracking microservice (`http_requests_total` with dynamic user_id labels). Applied metric relabel rules (`metric_relabel_configs`) to drop `user_id` labels at scrape time."
  },
  {
    title: "Helm Upgrade Deployment Failure: Immutable Field Change in StatefulSet",
    description: "Helm deploy job fails with `Error: UPGRADE FAILED: cannot patch StatefulSet: spec.volumeClaimTemplates is immutable`. Deployment pipeline blocked for data analytics service.",
    ticketType: "DEVOPS",
    category: "Kubernetes Infrastructure",
    priority: TicketPriority.HIGH,
    status: RESOLVED_STATUS,
    resolutionSummary: "Because Kubernetes forbids modifying `volumeClaimTemplates` on existing StatefulSets, performed a controlled `--cascade=orphan` deletion of the StatefulSet object while preserving underlying PVCs, then ran `helm upgrade --install` to recreate the controller cleanly."
  },
  {
    title: "Docker Swarm Worker Node Eviction Due to Disk Pressure Alert",
    description: "Node `worker-node-04` marked `Ready,SchedulingDisabled` due to `DiskPressure`. All local container instances migrated to remaining healthy nodes causing CPU spikes.",
    ticketType: "DEVOPS",
    category: "Container Orchestration",
    priority: TicketPriority.MEDIUM,
    status: RESOLVED_STATUS,
    resolutionSummary: "Found 120GB of dangling Docker build layers and unreferenced container volumes. Executed `docker system prune -a --volumes -f` and configured a weekly cron job (`0 3 * * 0`) to clean up orphan container artifacts automatically."
  },
  {
    title: "Istio Service Mesh mTLS Handshake Failure Between Microservices",
    description: "Requests between `frontend-proxy` and `billing-engine` fail with HTTP 503 `upstream connect error or disconnect/reset before headers. reset reason: connection termination`.",
    ticketType: "DEVOPS",
    category: "Service Mesh / Istio",
    priority: TicketPriority.URGENT,
    status: RESOLVED_STATUS,
    resolutionSummary: "Diagnosed Istiod sidecar proxy configuration using `istioctl proxy-config secret`. Found `billing-engine` namespace had strict mTLS enabled (`PeerAuthentication: STRICT`) while `frontend-proxy` lacked injected envoy sidecar certificates. Re-injected sidecars and synchronized Istio CA certificates."
  },
  {
    title: "Elasticsearch Cluster Yellow Health State Due to Unassigned Shards",
    description: "ELK logging cluster reports status Yellow. 4 shards remain in `UNASSIGNED` state following the automated rolling restart of node `es-data-02`.",
    ticketType: "DEVOPS",
    category: "Logging Infrastructure",
    priority: TicketPriority.MEDIUM,
    status: RESOLVED_STATUS,
    resolutionSummary: "Queried `_cluster/allocation/explain` and discovered shards exceeded `cluster.routing.allocation.total_shards_per_node` thresholds. Adjusted shard limits via `_cluster/settings` API and triggered manual `reroute` commands for the unassigned replicas."
  },
  {
    title: "AWS ECR Registry Authentication Token Expiry in K8s ImagePull",
    description: "Worker nodes unable to pull updated container images from private AWS ECR repository (`401 Unauthorized`). Scheduled cron pod `ecr-token-refresher` failed.",
    ticketType: "DEVOPS",
    category: "Container Registry",
    priority: TicketPriority.HIGH,
    status: RESOLVED_STATUS,
    resolutionSummary: "Fixed IAM role trust policy on `ecr-token-refresher` service account to allow `sts:AssumeRoleWithWebIdentity`. Manually regenerated the `aws-registry-secret` image pull secret across all operational namespaces."
  },
  {
    title: "Vault Secrets Operator Sync Failure: Permission Denied on AppRole",
    description: "Kubernetes `ExternalSecret` resources failing to sync with HashiCorp Vault. Error: `vault read failed: permission denied for secret/data/prod/db-credentials`.",
    ticketType: "DEVOPS",
    category: "Secrets Management",
    priority: TicketPriority.HIGH,
    status: RESOLVED_STATUS,
    resolutionSummary: "Updated the Vault ACL policy attached to `k8s-app-role` to include `capabilities = [\"read\", \"list\"]` on path `secret/data/prod/*`. Verified token refresh and confirmed Kubernetes `Secret` resources populated cleanly."
  },
  {
    title: "Kafka Consumer Group Lag Spiking on Order Processing Topic",
    description: "Consumer group `order-validator-group` has accumulated over 450,000 unhandled messages on topic `orders.events.v1`. Downstream checkout notification delays exceeding 2 hours.",
    ticketType: "DEVOPS",
    category: "Message Brokers / Kafka",
    priority: TicketPriority.URGENT,
    status: RESOLVED_STATUS,
    resolutionSummary: "Identified poison pill event payload at partition offset `1048291` causing unhandled deserialization exceptions in consumer threads. Updated consumer error handler to route malformed payloads to `orders.events.DLQ` (Dead Letter Queue) and scaled consumer replicas to 12 to drain partition lag."
  },
  {
    title: "Grafana Alert Notification Webhook Failure to Slack Workspace",
    description: "Production alerting system failed to deliver Slack notifications during yesterday's network degradation. Grafana logs show `400 Bad Request` when posting to incoming webhook URL.",
    ticketType: "DEVOPS",
    category: "Monitoring & Observability",
    priority: TicketPriority.MEDIUM,
    status: RESOLVED_STATUS,
    resolutionSummary: "Slack app webhook authentication token was revoked following an admin security policy audit. Generated a new dedicated bot OAuth token, updated the Grafana Contact Point configuration with exact JSON block structure, and sent test payload successfully."
  },
  {
    title: "Consul Service Discovery DNS Resolution Latency in Multi-Region VPC",
    description: "Microservices in `us-west-2` experiencing intermittent 5-second DNS lookup timeouts when querying `.service.consul` endpoints hosted in `us-east-1`.",
    ticketType: "DEVOPS",
    category: "Service Discovery",
    priority: TicketPriority.HIGH,
    status: RESOLVED_STATUS,
    resolutionSummary: "Inspected Consul WAN gossip pool and discovered UDP packet fragmentation across inter-region peering tunnels. Adjusted `dns_config.udp_answer_limit` to `3` inside Consul server configurations and enabled `use_cache` in local CoreDNS forwarding rules."
  },
  {
    title: "Redis Cluster Memory Fragmentation Ratio Exceeding Threshold (3.4x)",
    description: "Production Redis cache cluster `redis-main-cluster` reports memory usage 12GB RSS vs 3.5GB allocated. Eviction policy triggering premature session dropouts.",
    ticketType: "DEVOPS",
    category: "Caching / Redis",
    priority: TicketPriority.HIGH,
    status: RESOLVED_STATUS,
    resolutionSummary: "Enabled active memory defragmentation (`activedefrag yes`) in `redis.conf` with parameters `active-defrag-ignore-bytes 100mb` and `active-defrag-threshold-lower 10`. Memory fragmentation dropped to 1.08x within 30 minutes without downtime."
  },
  {
    title: "Nginx Ingress `504 Gateway Timeout` on Large CSV Export Request",
    description: "Financial reporting tool throws HTTP 504 when downloading monthly billing exports larger than 50MB. Backend service logs indicate report generation completes cleanly in 75 seconds.",
    ticketType: "DEVOPS",
    category: "Load Balancing / Nginx",
    priority: TicketPriority.MEDIUM,
    status: RESOLVED_STATUS,
    resolutionSummary: "Added annotations to the reporting service Ingress manifest: `nginx.ingress.kubernetes.io/proxy-read-timeout: \"180\"` and `nginx.ingress.kubernetes.io/proxy-send-timeout: \"180\"`. Verified large file streaming downloads successfully."
  },
  {
    title: "RabbitMQ Memory Alarm Triggered: Blocking All Publisher Connections",
    description: "RabbitMQ broker node `rmq-prod-01` entered `memory alarm` state (`vm_memory_high_watermark` breached). All incoming AMQP publisher channels blocked.",
    ticketType: "DEVOPS",
    category: "Message Brokers / RabbitMQ",
    priority: TicketPriority.URGENT,
    status: RESOLVED_STATUS,
    resolutionSummary: "Discovered an unconsumed diagnostic queue `debug.trace.audit` that accumulated 8.5 million unacknowledged messages over 3 weeks. Purged the forgotten diagnostic queue and configured lazy queue storage (`queue_mode: lazy`) for high-volume audit channels."
  },

  // --- DATABASE ADMINISTRATION (19-36) ---
  {
    title: "PostgreSQL Deadlock Detected on Concurrent Inventory Table Updates",
    description: "Database transaction aborted with `ERROR: deadlock detected. Process 18492 waits for ShareLock on transaction 948201`. E-commerce checkout transactions failing intermittently.",
    ticketType: "DATABASE",
    category: "PostgreSQL Administration",
    priority: TicketPriority.URGENT,
    status: RESOLVED_STATUS,
    resolutionSummary: "Analyzed `pg_stat_activity` and query deadlock graphs. Discovered two backend workers updating `inventory_items` and `customer_wallets` in opposite order. Refactored repository update routines to acquire row locks (`FOR UPDATE`) in deterministic alphabetical order by table name."
  },
  {
    title: "MySQL Slave Replication Lag Exceeding 4 Hours After Bulk Data Import",
    description: "Read-replica `mysql-ro-node-02` replication lag (`Seconds_Behind_Master`) climbed to 14,400s following nightly analytical ETL job execution.",
    ticketType: "DATABASE",
    category: "MySQL Replication",
    priority: TicketPriority.HIGH,
    status: RESOLVED_STATUS,
    resolutionSummary: "ETL script was executing single massive `DELETE FROM analytics_logs WHERE created_at < ...` statement causing single-threaded replication bottleneck. Switched replication configuration to `replica_parallel_workers = 8` and updated ETL script to chunk deletions into batches of 5,000 rows."
  },
  {
    title: "MongoDB CPU Starvation Due to Unindexed Regex Collection Query",
    description: "MongoDB primary node CPU spiked to 100%. `db.currentOp()` revealed long-running queries against `user_sessions` collection utilizing unindexed `{$regex: /.*jsmith.*/i}` patterns.",
    ticketType: "DATABASE",
    category: "MongoDB Administration",
    priority: TicketPriority.HIGH,
    status: RESOLVED_STATUS,
    resolutionSummary: "Killed blocking queries using `db.killOp()`. Created compound text index on `user_sessions.email` and `user_sessions.username` (`db.user_sessions.createIndex({email: \"text\", username: \"text\"})`). Replaced frontend regex search with MongoDB native `$text` search queries."
  },
  {
    title: "PostgreSQL Autovacuum Daemon Bloat on High-Churn Transactions Table",
    description: "Table `payment_transactions` disk usage reads 180GB while `SELECT count(*)` indicates only 20GB of active live tuples. Autovacuum not keeping up with updates.",
    ticketType: "DATABASE",
    category: "PostgreSQL Administration",
    priority: TicketPriority.MEDIUM,
    status: RESOLVED_STATUS,
    resolutionSummary: "Configured aggressive per-table autovacuum parameters on `payment_transactions`: `autovacuum_vacuum_scale_factor = 0.02`, `autovacuum_vacuum_cost_limit = 2000`. Scheduled off-peak maintenance window to execute `VACUUM (VERBOSE, ANALYZE)` to reclaim dead tuple storage."
  },
  {
    title: "AWS RDS PostgreSQL Connection Pool Exhaustion (Max Connections Breached)",
    description: "App backend throwing `PrismaClientInitializationError: Can't reach database server at rds.amazonaws.com:5432. FATAL: remaining connection slots are reserved for non-replication superuser connections`.",
    ticketType: "DATABASE",
    category: "Connection Pooling",
    priority: TicketPriority.URGENT,
    status: RESOLVED_STATUS,
    resolutionSummary: "Deployed AWS RDS Proxy in front of PostgreSQL database instance to multiplex persistent database connections. Reduced NestJS Prisma Client `connection_limit` parameter from 50 to 10 per container instance across all 15 ECS microservice tasks."
  },
  {
    title: "DynamoDB Provisioned Throughput Exceeded Exception on Hot Partition Key",
    description: "Audit logging table throwing `ProvisionedThroughputExceededException` during flash sales events despite auto-scaling enabled up to 10,000 WCU.",
    ticketType: "DATABASE",
    category: "NoSQL / DynamoDB",
    priority: TicketPriority.HIGH,
    status: RESOLVED_STATUS,
    resolutionSummary: "Identified hot partition key design where all audit logs were partitioned strictly by `event_date` (`2026-07-15`), funneling all write traffic to a single physical storage node. Redesigned table schema to append a random shard suffix (`2026-07-15#shard_3`) across 10 buckets."
  },
  {
    title: "PostgreSQL WAL Disk Space Exhaustion Due to Stale Replication Slot",
    description: "Database server `pg-primary-node` root storage reached 98% capacity. `/var/lib/postgresql/data/pg_wal/` directory containing 350GB of unpurged Write-Ahead Log segments.",
    ticketType: "DATABASE",
    category: "PostgreSQL Administration",
    priority: TicketPriority.URGENT,
    status: RESOLVED_STATUS,
    resolutionSummary: "Queried `pg_replication_slots` and found an inactive logical replication slot `debezium_cdc_slot` left behind after a decommissioned analytics integration. Executed `SELECT pg_drop_replication_slot('debezium_cdc_slot');`, allowing checkpoints to recycle 340GB of old WAL files instantly."
  },
  {
    title: "Cassandra Cluster Read Timeout on High Tombstone Threshold",
    description: "Queries to `telemetry_events` table timing out with `ReadTimeoutException: Cassandra timeout during read query at consistency LOCAL_QUORUM`. Logs show `Scanned over 100000 tombstones`.",
    ticketType: "DATABASE",
    category: "NoSQL / Cassandra",
    priority: TicketPriority.MEDIUM,
    status: RESOLVED_STATUS,
    resolutionSummary: "Table was configured with `gc_grace_seconds = 864000` (10 days) while high-frequency deletions occurred daily. Adjusted table properties to lower `gc_grace_seconds` to `86400` (1 day) and executed manual `nodetool compact telemetry_events` across all cluster replicas to purge tombstones."
  },
  {
    title: "Oracle Database ORA-01653: Unable to Extend Table in Tablespace DATA",
    description: "Legacy ERP batch processing job halted at 3:00 AM with error `ORA-01653: unable to extend table ERP_OWNER.LEDGER_ENTRIES by 8192 in tablespace DATA`.",
    ticketType: "DATABASE",
    category: "Oracle Database",
    priority: TicketPriority.HIGH,
    status: RESOLVED_STATUS,
    resolutionSummary: "Verified free space in tablespace `DATA` using `DBA_FREE_SPACE`. Added a new 20GB datafile with autoextend enabled: `ALTER TABLESPACE DATA ADD DATAFILE '/u02/oradata/data04.dbf' SIZE 10G AUTOEXTEND ON NEXT 512M MAXSIZE 50G;`."
  },
  {
    title: "SQL Server TempDB Bottleneck Causing Page Latch Contention (PAGELATCH_UP)",
    description: "Microsoft SQL Server 2022 CPU utilization at 85% with severe query waits on `PAGELATCH_UP` inside `tempdb` system database (`2:1:1` allocation page).",
    ticketType: "DATABASE",
    category: "Microsoft SQL Server",
    priority: TicketPriority.HIGH,
    status: RESOLVED_STATUS,
    resolutionSummary: "Configured `tempdb` data files to match the exact number of logical CPU cores (8 files of equal 4GB size with identical growth increments). Enabled Trace Flag 1118 (`TF 1118`) and verified page allocation contention dropped to near zero."
  },
  {
    title: "PostgreSQL pg_dump Backup Failure: Query Cancelled by Statement Timeout",
    description: "Automated nightly `pg_dump` backup script exits with `FATAL: canceling statement due to statement timeout` while dumping large `historical_audit_trails` table.",
    ticketType: "DATABASE",
    category: "Database Backups",
    priority: TicketPriority.MEDIUM,
    status: RESOLVED_STATUS,
    resolutionSummary: "Nightly backup role `db_backup_user` inherited the global database parameter `statement_timeout = 30000ms` (30 seconds). Executed `ALTER ROLE db_backup_user SET statement_timeout = 0;` to disable statement timeouts exclusively for automated backup sessions."
  },
  {
    title: "Prisma Schema Migration Collision: Shadow Database Permission Denied",
    description: "Developer running `npx prisma migrate dev` in staging environment encounters error `P3014: Prisma Migrate could not create the shadow database. Please check your database user permissions`.",
    ticketType: "DATABASE",
    category: "Prisma ORM & Schema",
    priority: TicketPriority.MEDIUM,
    status: RESOLVED_STATUS,
    resolutionSummary: "Staging database user `staging_app_user` lacked `CREATEDB` privilege required by Prisma to spin up temporary shadow databases during schema validation. Granted explicit permission: `ALTER USER staging_app_user CREATEDB;` and verified migration runs cleanly."
  },
  {
    title: "ClickHouse Aggregation Query Out of Memory on Billion-Row Join",
    description: "Analytical BI dashboard query against ClickHouse cluster returns `Code: 241, e.displayText() = DB::Exception: Memory limit (10.00 GB) exceeded: would use 10.12 GB`.",
    ticketType: "DATABASE",
    category: "Analytical Databases / ClickHouse",
    priority: TicketPriority.MEDIUM,
    status: RESOLVED_STATUS,
    resolutionSummary: "Query was performing an uncompressed `GLOBAL JOIN` against a 50M row lookup table. Refactored query to utilize `ANY LEFT JOIN` and enabled external sorting (`max_bytes_before_external_sort = 8589934592`) to spill overflow join buckets to fast NVMe disk."
  },
  {
    title: "Neo4j Graph Database Cypher Query Infinite Traversal Loop",
    description: "Recommendation engine API timeouts. Neo4j server log shows runaway Cypher query `MATCH (u:User)-[:FRIEND*]->(f:User) WHERE ...` consuming 100% JVM heap.",
    ticketType: "DATABASE",
    category: "Graph Databases / Neo4j",
    priority: TicketPriority.MEDIUM,
    status: RESOLVED_STATUS,
    resolutionSummary: "Bounded the variable-length path relationship traversal inside the Cypher query from unbounded `[:FRIEND*]` to a strict upper limit of 3 hops (`[:FRIEND*1..3]`). Added directional indexing on `User(id)` and terminated the hung transaction using `CALL dbms.killQuery(...)`."
  },
  {
    title: "Amazon Aurora Serverless v2 Scaling Latency Spike During Cold Start",
    description: "API response times jump from 45ms to 4,200ms when Aurora Serverless v2 cluster scales up from 0.5 ACUs to 8 ACUs during morning traffic surge.",
    ticketType: "DATABASE",
    category: "AWS RDS / Aurora",
    priority: TicketPriority.HIGH,
    status: RESOLVED_STATUS,
    resolutionSummary: "Aurora Serverless v2 buffer cache buffer pool resizing under sudden load caused temporary read I/O stalls. Adjusted the minimum ACU capacity setting from `0.5 ACU` up to `2.0 ACU` (`min_capacity = 2.0`) to keep core indexes warm in RAM."
  },
  {
    title: "Database Index Bloat Causing Slow Sequential Scan Fallback in Queries",
    description: "Customer search endpoint query execution time degraded to 1,800ms. `EXPLAIN ANALYZE` shows PostgreSQL query planner choosing `Seq Scan on users` instead of existing B-Tree index.",
    ticketType: "DATABASE",
    category: "Query Optimization",
    priority: TicketPriority.MEDIUM,
    status: RESOLVED_STATUS,
    resolutionSummary: "Checked `pg_stat_user_indexes` and discovered `idx_users_email` was 88% bloated due to historical GDPR bulk deletion scripts. Executed non-blocking index rebuild (`REINDEX INDEX CONCURRENTLY idx_users_email;`) and ran `ANALYZE users;`. Query times restored to < 5ms."
  },
  {
    title: "MongoDB Replica Set Election Loop Due to Network Partition Heartbeat Loss",
    description: "MongoDB cluster switching primary node every 10 seconds (`Election succeeded, assuming primary`). Applications receiving `TopologyClosedException` on write operations.",
    ticketType: "DATABASE",
    category: "MongoDB Administration",
    priority: TicketPriority.URGENT,
    status: RESOLVED_STATUS,
    resolutionSummary: "Diagnosed network latency between data center availability zones. Increased `electionTimeoutMillis` parameter from default 1,000ms up to 5,000ms (`rs.reconfig()` with `settings.electionTimeoutMillis: 5000`) to prevent temporary network jitter from triggering false failovers."
  },
  {
    title: "PostgreSQL Sequence Desynchronization Following Table Data Restoration",
    description: "Creating new support tickets throws `PrismaClientKnownRequestError: Unique constraint failed on the fields: (ticketSeq)`. Primary sequence generating duplicate keys.",
    ticketType: "DATABASE",
    category: "PostgreSQL Administration",
    priority: TicketPriority.URGENT,
    status: RESOLVED_STATUS,
    resolutionSummary: "Checked `Ticket_ticketSeq_seq` current value vs maximum existing sequence in table. Executed sequence realignment command: `SELECT setval('\"Ticket_ticketSeq_seq\"', (SELECT MAX(\"ticketSeq\") FROM \"Ticket\") + 1);`. Ticket creation resumed without collisions."
  },

  // --- CLOUD INFRASTRUCTURE & AWS/GCP/AZURE (37-54) ---
  {
    title: "AWS CloudFront CDN 502 Bad Gateway Error on Custom Origin SSL Handshake",
    description: "Users accessing `portal.client-enterprise.com` receive HTTP 502 from CloudFront edge locations. Origin health checks reporting `OriginSslHandshakeError`.",
    ticketType: "INFRASTRUCTURE",
    category: "CDN & Edge Routing",
    priority: TicketPriority.URGENT,
    status: RESOLVED_STATUS,
    resolutionSummary: "Origin server SSL certificate installed on ALB expired at midnight. CloudFront origin protocol policy was configured to `HTTPS Only` requiring valid TLS certificate. Replaced ALB listener certificate with newly renewed ACM certificate and invalidated CloudFront edge cache (`/*`)."
  },
  {
    title: "AWS Lambda Function Timeout on VPC ENI Cold Start Initialization",
    description: "Serverless PDF generation microservice (`pdf-generator-lambda`) timing out at 10 seconds during peak hours. X-Ray traces reveal 8.5 seconds spent creating VPC Elastic Network Interfaces.",
    ticketType: "INFRASTRUCTURE",
    category: "Serverless / AWS Lambda",
    priority: TicketPriority.HIGH,
    status: RESOLVED_STATUS,
    resolutionSummary: "Enabled AWS Lambda Provisioned Concurrency (`provisioned_concurrent_executions = 5`) to maintain pre-warmed execution environments with attached VPC ENIs. Cold start latency reduced from 8,500ms to < 200ms."
  },
  {
    title: "GCP Kubernetes Engine (GKE) IP Address Space Exhaustion in VPC Subnet",
    description: "GKE cluster `prod-us-central1` failing to schedule new pods (`FailedCreatePodSandBox`). Error: `failed to allocate IP for pod: no available IP addresses in secondary range`.",
    ticketType: "INFRASTRUCTURE",
    category: "GCP Infrastructure",
    priority: TicketPriority.URGENT,
    status: RESOLVED_STATUS,
    resolutionSummary: "Secondary VPC CIDR block `10.48.0.0/16` assigned to pod networking was fully exhausted by lingering completed cron jobs. Expanded pod secondary IP range with additional `/16` subnet using `gcloud container clusters update` and cleaned up 12,000 completed job pods."
  },
  {
    title: "Azure Blob Storage CORS Policy Blocking Frontend Direct File Uploads",
    description: "React web portal throws `Access to XMLHttpRequest at 'https://storage.blob.core.windows.net/uploads' from origin 'https://app.client.com' has been blocked by CORS policy`.",
    ticketType: "INFRASTRUCTURE",
    category: "Azure Cloud Storage",
    priority: TicketPriority.MEDIUM,
    status: RESOLVED_STATUS,
    resolutionSummary: "Updated Azure Storage Account CORS rules using Azure CLI (`az storage cors add`). Added explicit allowed origin `https://app.client.com`, allowed methods `PUT, POST, OPTIONS`, and allowed headers `x-ms-blob-type, content-type`."
  },
  {
    title: "AWS NAT Gateway Port Allocation Exhaustion (Error: `Connection timed out`)",
    description: "Internal EC2 instances inside private subnets unable to reach external payment APIs or GitHub packages. CloudWatch metrics show `ErrorPortAllocation` spiking to 5,000+ per minute on `nat-098a7bc`.",
    ticketType: "INFRASTRUCTURE",
    category: "AWS Networking / VPC",
    priority: TicketPriority.URGENT,
    status: RESOLVED_STATUS,
    resolutionSummary: "NAT Gateway handles maximum 55,000 concurrent outbound connections per destination IP. Discovered a misconfigured web scraper pod opening 40,000 idle HTTP connections. Terminated scraper pods and deployed a second NAT Gateway across multi-AZ subnets to distribute source port allocation."
  },
  {
    title: "AWS S3 Bucket Policy Accidentally Denying All Public & IAM Read Access",
    description: "Static asset serving bucket `company-prod-assets-cdn` returning `403 Access Denied` to all CloudFront origins and internal IAM admin roles following security automation update.",
    ticketType: "INFRASTRUCTURE",
    category: "AWS IAM & S3",
    priority: TicketPriority.URGENT,
    status: RESOLVED_STATUS,
    resolutionSummary: "Since the S3 Bucket Policy explicitly denied all `s3:*` actions without correct IAM condition exemptions, logged in using the AWS Account Root User credentials via AWS Management Console to bypass the bucket policy and delete the malformed JSON `Deny` statement."
  },
  {
    title: "AWS Transit Gateway Route Table Blackhole Causing Inter-VPC Packet Drop",
    description: "Application servers in `VPC-Shared-Services` (`10.10.0.0/16`) cannot reach database instances in `VPC-Prod-DB` (`10.20.0.0/16`). ICMP traceroute drops after Transit Gateway ENI.",
    ticketType: "INFRASTRUCTURE",
    category: "AWS Networking / Transit Gateway",
    priority: TicketPriority.HIGH,
    status: RESOLVED_STATUS,
    resolutionSummary: "Inspected Transit Gateway Route Tables and found static route for `10.20.0.0/16` was pointing to an attachment `tgw-attach-881` that had been deleted during weekend VPC maintenance. Updated TGW route table to associate `10.20.0.0/16` with active attachment `tgw-attach-904`."
  },
  {
    title: "GCP Cloud SQL SSL Enforcement Breaking Legacy Python Worker Connections",
    description: "Python ETL workers reporting `psycopg2.OperationalError: FATAL: connection requires a valid client certificate` after enabling mandatory `Require SSL/TLS` on Cloud SQL Postgres.",
    ticketType: "INFRASTRUCTURE",
    category: "GCP Infrastructure",
    priority: TicketPriority.MEDIUM,
    status: RESOLVED_STATUS,
    resolutionSummary: "Generated new client certificates (`client-cert.pem` and `client-key.pem`) from the GCP Cloud SQL console. Updated Python SQLAlchemy database connection URI with SSL parameters: `sslmode=verify-ca&sslrootcert=server-ca.pem&sslcert=client-cert.pem&sslkey=client-key.pem`."
  },
  {
    title: "Azure App Service Cold Start & High Memory Swap on Premium Plan",
    description: "Backend API hosted on Azure App Service (`P1v3` tier) experiencing 12-second latency on first request after scaling events. Diagnostics show heavy memory swap (`AvailableMemory` < 150MB).",
    ticketType: "INFRASTRUCTURE",
    category: "Azure App Service",
    priority: TicketPriority.HIGH,
    status: RESOLVED_STATUS,
    resolutionSummary: "App Service was running 4 distinct Node.js applications inside a single App Service Plan. Upgraded App Service Plan to `P2v3` (8GB RAM) and enabled `Always On` configuration toggle to prevent worker process recycling during low traffic windows."
  },
  {
    title: "AWS Route 53 Health Check False Positive Triggering DNS Failover",
    description: "Active-Active multi-region DNS routing shifted 100% of global traffic away from `us-east-1` to `eu-west-1` unexpectedly, causing severe EU server overload.",
    ticketType: "INFRASTRUCTURE",
    category: "AWS Route 53 DNS",
    priority: TicketPriority.URGENT,
    status: RESOLVED_STATUS,
    resolutionSummary: "Route 53 health check target endpoint `/healthz` was checking downstream Redis dependency. A temporary 3-second Redis latency spike caused health checks to fail across 3 AWS checkers simultaneously. Decoupled DNS routing health check to verify core HTTP server responsiveness (`/ping`) instead of deep downstream dependencies."
  },
  {
    title: "AWS IAM Role STS Token Expiry Inside Long-Running Data Migration Script",
    description: "Batch migration job transferring 15TB of data to S3 crashes after exactly 1 hour with error `ExpiredToken: The security token included in the request is expired`.",
    ticketType: "INFRASTRUCTURE",
    category: "AWS IAM & STS",
    priority: TicketPriority.MEDIUM,
    status: RESOLVED_STATUS,
    resolutionSummary: "Default AWS STS `AssumeRole` temporary session duration is hardcoded to 3,600 seconds (1 hour). Modified the IAM Role settings in AWS Console to allow `MaxSessionDuration = 43200` (12 hours) and updated the script's `boto3.client('sts').assume_role(DurationSeconds=36000)` parameter."
  },
  {
    title: "GCP Cloud Functions Eventarc Trigger Failure from Pub/Sub Dead Letter Topic",
    description: "Event-driven error notification function fails to trigger when messages land in `orders-dlq-topic`. Eventarc audit logs show `PERMISSION_DENIED: Service account lacks `iam.serviceAccountTokenCreator`.",
    ticketType: "INFRASTRUCTURE",
    category: "GCP Infrastructure",
    priority: TicketPriority.MEDIUM,
    status: RESOLVED_STATUS,
    resolutionSummary: "Assigned the `roles/iam.serviceAccountTokenCreator` and `roles/eventarc.eventReceiver` IAM roles to the default Pub/Sub service account (`service-[PROJECT_NUMBER]@gcp-sa-pubsub.iam.gserviceaccount.com`). Confirmed DLQ events trigger Cloud Functions successfully."
  },
  {
    title: "AWS ALB WebSocket Connection Dropouts Exceeding 60-Second Idle Timeout",
    description: "Real-time collaboration dashboard WebSocket clients disconnecting exactly every 60 seconds of user inactivity (`WebSocket connection closed with code 1006`).",
    ticketType: "INFRASTRUCTURE",
    category: "Load Balancing / AWS ALB",
    priority: TicketPriority.MEDIUM,
    status: RESOLVED_STATUS,
    resolutionSummary: "AWS Application Load Balancer default idle connection timeout (`idle_timeout.timeout_seconds`) is set to 60 seconds. Increased ALB idle timeout setting to `3600` seconds and implemented an automated WebSocket ping/pong heartbeat interval every 25 seconds inside frontend client code."
  },
  {
    title: "Terraform AWS Provider `InvalidVpcID.NotFound` During Subnet Creation",
    description: "CI/CD deployment fails when creating secondary Availability Zone subnet: `Error: creating EC2 Subnet: InvalidVpcID.NotFound: The vpc ID 'vpc-0e819b' does not exist`.",
    ticketType: "INFRASTRUCTURE",
    category: "Infrastructure as Code",
    priority: TicketPriority.MEDIUM,
    status: RESOLVED_STATUS,
    resolutionSummary: "Identified race condition where `aws_subnet` resource attempted creation before `aws_vpc` resource finished propagation across AWS control plane. Added explicit `depends_on = [aws_vpc.main]` attribute and configured `create_before_destroy = true` inside the lifecycle block."
  },
  {
    title: "GCP Cloud Storage Bucket `Uniform Bucket-Level Access` Lockout",
    description: "Deployment pipeline unable to set object-level ACL `public-read` on generated invoice PDFs. Error: `Cannot use ACL API to set object policy when Uniform Bucket-Level Access is enabled`.",
    ticketType: "INFRASTRUCTURE",
    category: "GCP Infrastructure",
    priority: TicketPriority.MEDIUM,
    status: RESOLVED_STATUS,
    resolutionSummary: "Configured bucket IAM policy via `gcloud storage buckets add-iam-policy-binding gs://invoice-storage --member=allUsers --role=roles/storage.objectViewer` instead of individual object ACLs, aligning with modern GCP security standards."
  },
  {
    title: "AWS ECS Fargate Task Stuck in `PROVISIONING` State Due to Subnet Routing",
    description: "New container deployments stuck indefinitely in `PROVISIONING` status inside `ecs-cluster-prod`. Events log shows `Task failed to download container image: CannotPullContainerError`.",
    ticketType: "INFRASTRUCTURE",
    category: "Container Orchestration / AWS ECS",
    priority: TicketPriority.HIGH,
    status: RESOLVED_STATUS,
    resolutionSummary: "Fargate task definition was launched inside a private subnet (`subnet-priv-az1`) with `assign_public_ip = false` and no configured NAT Gateway or VPC Endpoints. Deployed AWS PrivateLink VPC Endpoints for `com.amazonaws.us-east-1.ecr.api`, `ecr.dkr`, and `s3` to allow private image downloads."
  },
  {
    title: "Azure DevOps Self-Hosted Agent Pool Disconnection Under Heavy Load",
    description: "Build pipeline agents (`vm-agent-linux-01` to `04`) dropping offline intermittently during parallel C++ compilation builds. Agent service logs show `OutOfMemory: Killed process 49102 (node)`.",
    ticketType: "INFRASTRUCTURE",
    category: "CI/CD Pipelines",
    priority: TicketPriority.MEDIUM,
    status: RESOLVED_STATUS,
    resolutionSummary: "Upgraded self-hosted build VM SKU from `Standard_D2s_v3` (8GB RAM) to `Standard_D4s_v3` (16GB RAM) and configured a 16GB Linux swapfile on `/mnt/resource/swapfile`. Agent stability restored across all build queues."
  },
  {
    title: "AWS KMS Key Policy Lockout Denying Root Account Management Access",
    description: "Terraform pipeline and AWS Console admins cannot view, edit, or delete KMS Customer Managed Key `arn:aws:kms:us-east-1:123456789:key/abcd`. Error: `User is not authorized to perform kms:PutKeyPolicy`.",
    ticketType: "INFRASTRUCTURE",
    category: "AWS IAM & KMS",
    priority: TicketPriority.URGENT,
    status: RESOLVED_STATUS,
    resolutionSummary: "Previous key policy update removed the mandatory `kms:*` permission block for `arn:aws:iam::123456789:root`. Contacted AWS Premium Support who verified account ownership via phone PIN and performed a root-level policy override to restore administrative key access."
  },

  // --- NETWORK SECURITY & FIREWALLS (55-72) ---
  {
    title: "Cisco AnyConnect VPN Client Authentication Failure After Radius Server Certificate Renewal",
    description: "Remote employees unable to connect to corporate SSL VPN (`vpn.company.internal`). Client displays `The VPN connection failed due to unsuccessful domain name resolution or certificate validation`.",
    ticketType: "SECURITY",
    category: "Network & VPN",
    priority: TicketPriority.URGENT,
    status: RESOLVED_STATUS,
    resolutionSummary: "Cisco ASA firewall had cached the intermediate CA certificate from the previous RADIUS authentication certificate chain. Imported the updated DigiCert Global Root G2 intermediate CA into Cisco ASA certificate store (`crypto ca trustpoint RADIUS-CA`) and restarted SSL VPN tunnel group."
  },
  {
    title: "CloudFlare WAF False Positive Blocking legitimate REST API JSON Payloads",
    description: "Customer portal checkout submissions failing with HTTP 403 `CloudFlare Ray ID: 8a9b1c2d3e4f5a6b`. WAF activity log shows block triggered by `SQLi Attack Detection Rule 942100`.",
    ticketType: "SECURITY",
    category: "Web Application Firewall",
    priority: TicketPriority.URGENT,
    status: RESOLVED_STATUS,
    resolutionSummary: "Inspected blocked payload: field `user_bio` contained string `...and OR 1=1 boolean testing...` inside technical user feedback. Created a CloudFlare WAF Custom Bypass rule to skip OWASP SQLi Rule `942100` specifically for URI path `/api/v1/user/profile` when HTTP Header `X-App-Client` is present."
  },
  {
    title: "Palo Alto Firewall High CPU Usage Caused by Runaway SSL Decryption Session Pool",
    description: "PA-5250 perimeter firewall management plane unresponsive and packet forwarding latency increased by 120ms. `show system statistics` indicates SSL Decryption hardware engine at 100% load.",
    ticketType: "SECURITY",
    category: "Perimeter Security & Firewalls",
    priority: TicketPriority.URGENT,
    status: RESOLVED_STATUS,
    resolutionSummary: "Identified a misconfigured automated backup server transferring 400GB of encrypted Veeam disk images over HTTPS (`port 443`) across the perimeter firewall every hour. Added an SSL Decryption Exclusion policy specifically for destination IP range `192.168.100.0/24` (Backup Storage Subnet)."
  },
  {
    title: "Active Directory Account Lockout Storm Caused by Stale Service Account Password",
    description: "Domain User `svc-print-spooler` locked out every 5 minutes across Domain Controllers (`Security Event ID 4740`). Print servers denying user authentication across HQ campus.",
    ticketType: "SECURITY",
    category: "Identity & Access Management",
    priority: TicketPriority.HIGH,
    status: RESOLVED_STATUS,
    resolutionSummary: "Used Microsoft Account Lockout and Management Tools (`ALTools / LockoutStatus.exe`) to trace bad password attempts (`Event ID 4625`) to IP `10.12.44.18` (Legacy HR Scanner device). Updated the stored LDAP authentication credentials inside the scanner's web management interface."
  },
  {
    title: "Auth0 / Okta SAML 2.0 Single Sign-On (SSO) Assertion Signature Verification Failed",
    description: "Users logging into Salesforce internal CRM via Okta SSO receive error `SAML 2.0 Assertion validation failed: Invalid Signature`. Login workflow blocked for 300+ sales reps.",
    ticketType: "SECURITY",
    category: "SAML / SSO Identity",
    priority: TicketPriority.URGENT,
    status: RESOLVED_STATUS,
    resolutionSummary: "Okta Identity Provider (IdP) signing certificate rotated automatically according to annual schedule, but the new public certificate (`SAML-IdP-Cert.crt`) was not updated inside Salesforce Single Sign-On Settings. Uploaded the new X.509 certificate to Salesforce SSO configuration."
  },
  {
    title: "Fortinet FortiGate Firewall VPN Split-Tunneling DNS Leak in Windows 11 Clients",
    description: "Windows 11 remote workers on FortiClient SSL VPN resolving internal corporate `.internal` domain names against public ISP DNS servers (`1.1.1.1`), exposing internal hostnames.",
    ticketType: "SECURITY",
    category: "Network & VPN",
    priority: TicketPriority.MEDIUM,
    status: RESOLVED_STATUS,
    resolutionSummary: "Windows 11 Smart Multi-Homed Name Resolution (`SMHNR`) sends concurrent DNS queries across all active network adapters. Pushed group policy registry fix (`DisableSmartNameResolution = 1` under `HKLM\\Software\\Policies\\Microsoft\\Windows NT\\DNSClient`) and configured FortiGate SSL VPN portal with mandatory DNS suffix search lists."
  },
  {
    title: "HashiCorp Vault Master Key Unseal Failure After Server Reboot",
    description: "Vault cluster nodes reporting `Sealed: true` following Ubuntu kernel security patch reboot. Applications returning `VaultError: 503 Service Unavailable: Vault is sealed`.",
    ticketType: "SECURITY",
    category: "Secrets Management",
    priority: TicketPriority.URGENT,
    status: RESOLVED_STATUS,
    resolutionSummary: "Convened the 3 designated security key custodians via secure video bridge. Executed `vault operator unseal` sequentially with 3 distinct Shamir master key shares (`Key Threshold: 3 of 5`). Verified cluster transitioned to `Sealed: false` and active leader election completed."
  },
  {
    title: "CrowdStrike Falcon Sensor False Positive Quarantining Custom ERP Executable",
    description: "Antivirus host protection quarantining `/usr/local/bin/company-payroll-engine` on finance servers (`Detection: MachineLearning/Behavioral.SuspiciousFile.A`). Payroll calculation batch halted.",
    ticketType: "SECURITY",
    category: "Endpoint Detection & Response",
    priority: TicketPriority.HIGH,
    status: RESOLVED_STATUS,
    resolutionSummary: "Submitted false positive diagnostic bundle to CrowdStrike portal and verified SHA256 file hash against internal software release manifest. Created a custom Machine Learning Exclusion rule inside CrowdStrike Falcon dashboard matching file path `/usr/local/bin/company-payroll-engine` and SHA256 hash."
  },
  {
    title: "Zscaler Zero Trust Network Access (ZTNA) Blocking SSH Access to Production Bastion",
    description: "DevOps engineers unable to initiate SSH sessions (`port 22`) via Zscaler Client Connector to `bastion.prod.internal`. Connection resets with `Connection closed by foreign host`.",
    ticketType: "SECURITY",
    category: "Zero Trust / Zscaler",
    priority: TicketPriority.HIGH,
    status: RESOLVED_STATUS,
    resolutionSummary: "Zscaler Private Access (ZPA) App Segment policy for `Production Bastions` had `Health Reporting` enabled on port 22 using HTTP probes instead of TCP probes, marking SSH endpoints as unreachable. Switched health probe type to `TCP` and verified SSH tunneling connects cleanly."
  },
  {
    title: "AWS Security Group Misconfiguration Allowing Unrestricted Port 3389 (RDP) from Internet",
    description: "Automated AWS GuardDuty alert triggered: `UnauthorizedAccess:EC2/RDPBruteForce`. Security group `sg-prod-mgmt` found to have inbound rule `0.0.0.0/0:3389`.",
    ticketType: "SECURITY",
    category: "Perimeter Security & Firewalls",
    priority: TicketPriority.URGENT,
    status: RESOLVED_STATUS,
    resolutionSummary: "Immediately revoked the `0.0.0.0/0` inbound RDP rule from `sg-prod-mgmt` using AWS CLI (`aws ec2 revoke-security-group-ingress`). Replaced rule with restricted CIDR block `203.0.113.0/24` (Corporate Office VPN Gateway). Ran forensic audit on affected EC2 instance logs to verify no unauthorized logins occurred."
  },
  {
    title: "OpenVPN Access Server CRL (Certificate Revocation List) Expiration Blocking All Users",
    description: "OpenVPN Access Server rejecting all client connections with TLS error `VERIFY ERROR: depth=0, error=CRL has expired`. Entire engineering organization locked out of development VPC.",
    ticketType: "SECURITY",
    category: "Network & VPN",
    priority: TicketPriority.URGENT,
    status: RESOLVED_STATUS,
    resolutionSummary: "Connected to OpenVPN server via out-of-band AWS Systems Manager Session Manager. Regenerated the internal CA Certificate Revocation List using `easyrsa gen-crl` and reloaded the OpenVPN daemon service (`systemctl restart openvpnas`). Set cron reminder for annual CRL renewal."
  },
  {
    title: "Wazuh SIEM Agent Disconnection Spikes Due to TCP Buffer Overflow on Manager",
    description: "Over 400 Linux servers reporting `Wazuh agent disconnected` in security dashboard. Manager server `/var/log/wazuh-ossec.log` shows `Error sending message to queue: No buffer space available`.",
    ticketType: "SECURITY",
    category: "SIEM & Security Monitoring",
    priority: TicketPriority.MEDIUM,
    status: RESOLVED_STATUS,
    resolutionSummary: "Adjusted Linux kernel network socket buffer sizes on Wazuh Manager server (`sysctl -w net.core.rmem_max=16777216` and `net.core.wmem_max=16777216`). Increased `remoted.queue_size` in `/var/ossec/etc/ossec.conf` from 131072 to 524288 and restarted Wazuh manager."
  },
  {
    title: "DDoS Attack Mitigation: HTTP Flood on Public Marketing Portal (`/request-demo`)",
    description: "Marketing website receiving 85,000 requests/sec from distributed botnet IP addresses targeting `/request-demo` form endpoint. Web servers CPU at 100% causing cascading timeouts.",
    ticketType: "SECURITY",
    category: "DDoS Protection",
    priority: TicketPriority.URGENT,
    status: RESOLVED_STATUS,
    resolutionSummary: "Engaged CloudFlare Under Attack Mode (`I'm Under Attack` toggle) to present JavaScript/Turnstile interactive challenges to inbound requests. Enabled rate limiting rule inside CloudFlare blocking IPs exceeding 15 POST requests per minute to `/request-demo`. Traffic normalized within 4 minutes."
  },
  {
    title: "Nginx Reverse Proxy Vulnerable to SSL/TLS Weak Cipher Suites (Sweet32 / TLSv1.0)",
    description: "External quarterly penetration test report flagged high-severity vulnerability: `Server supports TLSv1.0 and weak 64-bit block ciphers (3DES)` on `pay.client-enterprise.com`.",
    ticketType: "SECURITY",
    category: "SSL/TLS Certificates",
    priority: TicketPriority.HIGH,
    status: RESOLVED_STATUS,
    resolutionSummary: "Updated Nginx configuration `/etc/nginx/conf.d/ssl.conf` to enforce modern Mozilla Intermediate SSL standards: `ssl_protocols TLSv1.2 TLSv1.3;` and `ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:...`. Reloaded Nginx and verified compliance via `testssl.sh`."
  },
  {
    title: "Keycloak OAuth 2.0 / OIDC Token Expiry & Refresh Token Re-use Attack Detection",
    description: "Mobile app users forced to re-login every 15 minutes. Keycloak server logs indicate `RefreshTokenReuseException: Refresh token reused across concurrent client requests` during unstable mobile network switching.",
    ticketType: "SECURITY",
    category: "Identity & Access Management",
    priority: TicketPriority.MEDIUM,
    status: RESOLVED_STATUS,
    resolutionSummary: "In Keycloak Realm Settings -> Tokens, enabled `Revoke Refresh Token` alongside a `Refresh Token Max Reuse Interval` of 10 seconds (`10s`). This grace window accommodates mobile clients sending duplicate refresh requests during poor cell tower handoffs while preserving token replay security."
  },
  {
    title: "Linux Server Unauthorized Root SSH Brute Force Attempts (`/var/log/auth.log`)",
    description: "Security Operations Center (SOC) alerted on 120,000 failed SSH login attempts per hour targeting account `root` on public SFTP gateway server `sftp.client-enterprise.com`.",
    ticketType: "SECURITY",
    category: "Endpoint Security & Hardening",
    priority: TicketPriority.HIGH,
    status: RESOLVED_STATUS,
    resolutionSummary: "Hardened `/etc/ssh/sshd_config` by setting `PermitRootLogin no`, `PasswordAuthentication no`, and restricting allowed users (`AllowUsers sftp_batch_user`). Installed and configured `fail2ban` with jail `[sshd]` set to ban source IPs for 24 hours after 3 failed login attempts."
  },
  {
    title: "CyberArk Password Vault Privileged Account Rotation Synchronization Failure",
    description: "CyberArk CPM (Central Policy Manager) failed to rotate root password for database host `db-ora-main-01`. Error: `CACPM344E Verifying Password Safe: Administration user not authorized`.",
    ticketType: "SECURITY",
    category: "Privileged Access Management",
    priority: TicketPriority.MEDIUM,
    status: RESOLVED_STATUS,
    resolutionSummary: "CyberArk CPM reconciliation account `svc-cpm-recon` had expired password inside Oracle database `SYS.USER$` table. Manually unlocked `svc-cpm-recon` via SQL*Plus (`ALTER USER svc_cpm_recon ACCOUNT UNLOCK IDENTIFIED BY \"...\";`) and triggered manual CyberArk password verify/change cycle."
  },
  {
    title: "Kubernetes Role-Based Access Control (RBAC) Privilege Escalation Audit Fix",
    description: "Security scan identified developer `ClusterRoleBinding` granting `verbs: [\"*\"]` on `resources: [\"secrets\", \"pods/exec\"]` across production namespaces (`prod-east`).",
    ticketType: "SECURITY",
    category: "Identity & Access Management",
    priority: TicketPriority.HIGH,
    status: RESOLVED_STATUS,
    resolutionSummary: "Revoked the wildcard `ClusterRoleBinding` `dev-team-cluster-admin`. Created granular namespace-scoped `RoleBinding` resources restricting developers to `get, list, watch` on `pods` and `logs` exclusively within non-production (`staging`, `dev`) namespaces."
  },

  // --- WORKPLACE ENDPOINTS, IT HARDWARE & SOFTWARE (73-90) ---
  {
    title: "Dell Latitude 5530 Laptop Blue Screen of Death (`UNEXPECTED_KERNEL_MODE_TRAP`)",
    description: "Executive user reports laptop crashes immediately when connecting to Kensington USB-C Thunderbolt Docking Station (`BSOD Stop Code 0x0000007F`).",
    ticketType: "HARDWARE",
    category: "Laptops & Hardware",
    priority: TicketPriority.HIGH,
    status: RESOLVED_STATUS,
    resolutionSummary: "Analyzed Windows minidump file (`C:\\Windows\\Minidump\\071526-18490-01.dmp`) using WinDbg. Traced crash to outdated Realtek USB GbE Family Controller driver (`rtux64w10.sys`). Downloaded Realtek Ethernet Driver v11.14.0520.2026 via Dell Command Update and flashed system BIOS to v1.21.0."
  },
  {
    title: "Microsoft Outlook 365 Search Not Returning Results (`We're having trouble fetching results...`)",
    description: "User mailbox search returns zero results for emails older than 3 days. Windows Search Indexer service showing high CPU disk queue lengths.",
    ticketType: "SOFTWARE",
    category: "Email & Office 365",
    priority: TicketPriority.MEDIUM,
    status: RESOLVED_STATUS,
    resolutionSummary: "Rebuilt local Outlook search catalog by navigating to Windows Indexing Options -> Advanced -> Rebuild. Repaired corrupted `.OST` local cache file (`C:\\Users\\username\\AppData\\Local\\Microsoft\\Outlook\\user@company.com.ost`) by forcing a fresh offline folder synchronization."
  },
  {
    title: "HP Color LaserJet Enterprise M553 Printer Offline & Spooler Queue Jam",
    description: "Finance department printer displaying `Offline` across all Windows 10/11 client PCs. Print Server `srv-print-01` shows 42 print jobs stuck in `Spooling` status.",
    ticketType: "HARDWARE",
    category: "Printers & Peripherals",
    priority: TicketPriority.MEDIUM,
    status: RESOLVED_STATUS,
    resolutionSummary: "Stopped Windows `Print Spooler` service on `srv-print-01`. Deleted all temporary `.SHD` and `.SPL` spool files from `C:\\Windows\\System32\\spool\\PRINTERS\\`. Restarted Print Spooler service and configured printer TCP/IP port to use `LPR` protocol with byte counting enabled."
  },
  {
    title: "Apple MacBook Pro M3 Max Kernel Panic During External Monitor DisplayPort Wake",
    description: "macOS Sonoma 14.5 kernel panics and reboots when waking from sleep while connected to dual LG UltraFine 4K displays via Thunderbolt 4 hub (`panic(cpu 0 caller...): AppleThunderboltHAL`).",
    ticketType: "HARDWARE",
    category: "Laptops & Hardware",
    priority: TicketPriority.MEDIUM,
    status: RESOLVED_STATUS,
    resolutionSummary: "Reset Mac NVRAM/PRAM settings and disabled `Prevent automatic sleeping on power adapter when the display is off` in System Settings -> Lock Screen. Updated Thunderbolt hub firmware using manufacturer utility to fix DisplayPort MST wake signal negotiation."
  },
  {
    title: "Microsoft Teams Desktop App White Screen Freeze on Launch (`electron.js` crash)",
    description: "User launches Microsoft Teams desktop app and gets a blank white window that cannot be closed or maximized. Clearing regular app cache did not resolve issue.",
    ticketType: "SOFTWARE",
    category: "Communication & Teams",
    priority: TicketPriority.LOW,
    status: RESOLVED_STATUS,
    resolutionSummary: "Terminated lingering `ms-teams.exe` background processes via Task Manager. Deleted complete Electron app data folder at `%AppData%\\Microsoft\\Teams` and `%LocalAppData%\\Packages\\MSTeams_8wekyb3d8bbwe\\LocalCache`. Reinstalled Teams MSIX v2.4 executable cleanly."
  },
  {
    title: "BitLocker Drive Encryption PIN Lockout After BIOS Firmware Update",
    description: "Employee laptop prompting for 48-digit BitLocker Recovery Key on every boot following automated Lenovo System Update BIOS patch installation.",
    ticketType: "SECURITY",
    category: "Endpoint Security & Hardening",
    priority: TicketPriority.HIGH,
    status: RESOLVED_STATUS,
    resolutionSummary: "Retrieved the 48-digit BitLocker Recovery Key from Microsoft Active Directory / Intune Device Management portal (`manage.microsoft.com`). Entered key on boot, opened command prompt as Administrator, and ran `manage-bde -protectors -disable C:` followed by `manage-bde -protectors -enable C:` to re-seal TPM PCR registers."
  },
  {
    title: "Windows 11 Wi-Fi Adapter Disconnection (`No Internet, Secured` IP Configuration Failure)",
    description: "Laptop loses Wi-Fi connection every 30 minutes. Network status displays `No Internet, Secured`. `ipconfig /renew` fails with `An error occurred while renewing interface Wi-Fi: unable to contact your DHCP server`.",
    ticketType: "NETWORK",
    category: "Wi-Fi & LAN Endpoint",
    priority: TicketPriority.MEDIUM,
    status: RESOLVED_STATUS,
    resolutionSummary: "Device Manager showed Intel Wi-Fi 6E AX211 Power Management setting `Allow the computer to turn off this device to save power` enabled. Disabled power saving toggle on wireless NIC and flushed TCP/IP stack (`netsh int ip reset` and `netsh winsock reset`). Wi-Fi stability verified over 4 hours."
  },
  {
    title: "Adobe Acrobat Pro DC Licensing Error 104 (`Subscription Expired or Invalid Token`)",
    description: "Design team member unable to edit PDF documents. Adobe Creative Cloud displays `Error 104: We can't verify your subscription status` despite active enterprise license assignment.",
    ticketType: "SOFTWARE",
    category: "Enterprise Software Licensing",
    priority: TicketPriority.LOW,
    status: RESOLVED_STATUS,
    resolutionSummary: "Closed all Adobe applications and ran the official `Adobe Limited Access Repair Tool` (`LogCollector / ResetLicensing`). Deleted corrupted local license certificates at `C:\\ProgramData\\Adobe\\SLStore\\` and `%LocalAppData%\\Adobe\\OOBE\\opm.db`. User re-authenticated successfully via Okta SSO."
  },
  {
    title: "Lenovo ThinkPad X1 Carbon Overheating & Thermal Throttling Under Zoom Video Calls",
    description: "Laptop CPU temperatures reach 98°C during Zoom video conferences. Fan runs at maximum 6000 RPM and system clocks throttle down to 0.8 GHz causing severe audio/video stutter.",
    ticketType: "HARDWARE",
    category: "Laptops & Hardware",
    priority: TicketPriority.MEDIUM,
    status: RESOLVED_STATUS,
    resolutionSummary: "Disassembled laptop base cover and discovered dried thermal paste compound on CPU/GPU heatsink assembly. Cleaned old thermal residue using 99% Isopropyl Alcohol and applied high-conductivity Arctic MX-6 thermal compound. Cleaned heatsink exhaust fins and verified full-load temperatures stabilized below 74°C."
  },
  {
    title: "Windows 10 Profile Service Login Error (`We can't sign into your account`)",
    description: "User logs into domain PC and is placed into a temporary profile (`C:\\Users\\TEMP`). Desktop shortcuts and personal Documents folders are missing.",
    ticketType: "SOFTWARE",
    category: "Windows OS Administration",
    priority: TicketPriority.HIGH,
    status: RESOLVED_STATUS,
    resolutionSummary: "Opened Registry Editor (`regedit`) and navigated to `HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\ProfileList`. Located user's SID (`S-1-5-21-...-1042.bak`), renamed the corrupted non-bak key, and removed the `.bak` extension from the valid SID profile path. Re-enabled `State = 0` and restarted PC."
  },
  {
    title: "Cisco IP Phone 8845 Registration Rejected (`Registration Rejected: Error 22`)",
    description: "Desk phone in conference room 4B displays `Unregistered` and cannot make internal or external calls. Ethernet link LED active with PoE power supply verified.",
    ticketType: "HARDWARE",
    category: "VoIP & Telephony",
    priority: TicketPriority.MEDIUM,
    status: RESOLVED_STATUS,
    resolutionSummary: "Verified phone MAC address (`00:1B:2C:3D:4E:5F`) inside Cisco Unified Communications Manager (CUCM). Found device security profile was set to `Encrypted` while phone had lost its locally installed LAK/CTL certificate. Reset phone security profile to `Non Secure Voice` and performed factory hard reset (`123456789*0#`)."
  },
  {
    title: "Zoom Rooms Conference Room Controller Touchscreen Unresponsive after Automatic Update",
    description: "iPad controller in Boardroom A frozen on `Connecting to Zoom Room PC...` after automated overnight iPadOS 17.5 update. Meeting initiation blocked.",
    ticketType: "HARDWARE",
    category: "Audio/Visual Conference Rooms",
    priority: TicketPriority.HIGH,
    status: RESOLVED_STATUS,
    resolutionSummary: "Performed forced reboot on iPad controller. Checked Zoom Rooms Windows Mini-PC on local subnet `10.15.22.40` and discovered Windows Firewall profile had switched from `Domain` to `Public` following network adapter driver update, blocking UDP ports `3478-3480`. Reset network adapter profile to `Domain` inside PowerShell (`Set-NetConnectionProfile -NetworkCategory DomainAuthenticated`)."
  },
  {
    title: "Zoom Video Audio Distortion / Robotic Echo When Using Bluetooth Headset",
    description: "User reports severe robotic voice distortion and echo during Zoom calls when using Jabra Evolve2 65 Bluetooth headset. Wired USB headset works normally.",
    ticketType: "HARDWARE",
    category: "Audio/Visual & Headsets",
    priority: TicketPriority.LOW,
    status: RESOLVED_STATUS,
    resolutionSummary: "In Windows Sound Settings, the headset audio device had defaulted to `Hands-Free AG Audio` profile (`16-bit 8000Hz telephone quality`) instead of `Stereo Audio`. Disabled the Bluetooth Hands-Free Telephony service profile under Devices and Printers -> Jabra Properties -> Services, forcing high-fidelity Bluetooth A2DP protocol."
  },
  {
    title: "Microsoft OneDrive Sync Engine Error (`A file or folder name contains invalid characters`)",
    description: "OneDrive client stuck on `Syncing 3,420 files...` for 48 hours. Notification tray reports filename character violation preventing cloud synchronization.",
    ticketType: "SOFTWARE",
    category: "Cloud Storage Sync",
    priority: TicketPriority.LOW,
    status: RESOLVED_STATUS,
    resolutionSummary: "Executed PowerShell diagnostics script `Get-ChildItem -Recurse | Where-Object {$_.Name -match '[\"*:<>?/|]|\s$'}` across user's OneDrive local folder (`C:\\Users\\username\\OneDrive - Enterprise`). Located 4 CAD engineering files with trailing spaces and illegal colon characters (`Project:Final .dwg`). Renamed files to standard alphanumeric conventions (`Project_Final.dwg`); sync completed in 5 minutes."
  },
  {
    title: "VPN Domain Name Resolution Failure: Internal Intranet Sites Unreachable (`DNS PROBE FINISHED NXDOMAIN`)",
    description: "User connected to VPN can access public internet (`google.com`) but internal web tools (`wiki.internal.com`, `jira.internal.com`) fail to load.",
    ticketType: "NETWORK",
    category: "Network & VPN",
    priority: TicketPriority.HIGH,
    status: RESOLVED_STATUS,
    resolutionSummary: "Checked `Get-DnsClientServerAddress` in PowerShell while VPN active. Found local home Wi-Fi router (`192.168.1.1`) assigning IPv6 DNS servers (`fe80::1`) with higher metric priority than the VPN virtual adapter IPv4 DNS servers (`10.10.10.11`). Adjusted VPN virtual network adapter Interface Metric to `1` via `Set-NetIPInterface -InterfaceAlias 'Ethernet 2 (VPN)' -InterfaceMetric 1`."
  },
  {
    title: "Windows Update Error `0x80070643` During KB5034441 Recovery Partition Patch",
    description: "Windows 10/11 endpoints continuously failing monthly security update installation with error `0x80070643 - CBS_E_INSUFFICIENT_DISK_SPACE in WinRE partition`.",
    ticketType: "SOFTWARE",
    category: "Windows OS Administration",
    priority: TicketPriority.MEDIUM,
    status: RESOLVED_STATUS,
    resolutionSummary: "Windows Recovery Environment (`WinRE`) partition size (`500MB`) was insufficient to extract the 250MB WinRE patch payload. Executed automated PowerShell script `re-size-winre.ps1` utilizing `diskpart` to shrink `C:` drive volume by `250MB` (`shrink desired=250`) and expanded the WinRE recovery partition to `750MB`. Re-ran Windows Update successfully."
  },
  {
    title: "Poly Studio X50 Video Bar SIP Registration Failure to Microsoft Teams Gateway",
    description: "Conference room video bar cannot join scheduled Teams meetings via Poly RealConnect interoperability gateway (`Error: SIP 403 Forbidden - Invalid Tenant Domain`).",
    ticketType: "HARDWARE",
    category: "Audio/Visual Conference Rooms",
    priority: TicketPriority.MEDIUM,
    status: RESOLVED_STATUS,
    resolutionSummary: "Accessed Poly Studio web portal `https://10.15.30.12`. Found device system time had drifted 7 minutes behind NTP server pool due to blocked UDP port 123 on VLAN 30, causing OAuth token timestamps to expire instantly during SIP handshake. Corrected NTP server address to internal corporate time server `ntp.company.internal`."
  },
  {
    title: "Microsoft Excel `Not Enough Memory to Run Microsoft Excel` on 120MB Spreadsheet",
    description: "Financial analyst opens complex financial modeling workbook (`Q3-Budget-Model.xlsm`) and receives out of memory error. PC has 32GB physical RAM available.",
    ticketType: "SOFTWARE",
    category: "Email & Office 365",
    priority: TicketPriority.MEDIUM,
    status: RESOLVED_STATUS,
    resolutionSummary: "Checked Task Manager and confirmed user had installed 32-bit version of Microsoft Office 365 (`EXCEL.EXE *32`), capping process virtual memory addressing at 2GB limit. Uninstalled 32-bit Office suite and deployed 64-bit Office 365 Enterprise installer (`O365ProPlusRetail_64bit`). Workbook now opens cleanly consuming 4.2GB RAM."
  },

  // --- ADVANCED NETWORK & INFRASTRUCTURE EDGE CASES (91-100) ---
  {
    title: "BGP Route Flapping Between Primary and Backup MPLS Circuits on Cisco ASR Router",
    description: "Core WAN router `hq-core-rtr-01` log shows BGP session `192.0.2.1` transitioning `ESTABLISHED -> IDLE -> ESTABLISHED` every 45 seconds (`Hold Timer Expired`).",
    ticketType: "NETWORK",
    category: "WAN & BGP Routing",
    priority: TicketPriority.URGENT,
    status: RESOLVED_STATUS,
    resolutionSummary: "Investigated ISP optical handoff interface `GigabitEthernet0/1/0` and found CRC input errors incrementing at 500 packets/sec due to degraded single-mode fiber patch cord. Replaced physical fiber optic jumper cable and configured BGP dampening (`bgp dampening 15 750 2000 60`) to stabilize WAN prefix propagation."
  },
  {
    title: "OOMKiller Terminating PostgreSQL Main Process (`postmaster`) on Heavy Sorting Query",
    description: "Database server abruptly crashed and restarted (`LOG: database system was interrupted while in recovery`). Linux kernel `dmesg` log reports `Out of memory: Killed process 8402 (postgres)`.",
    ticketType: "DATABASE",
    category: "PostgreSQL Administration",
    priority: TicketPriority.URGENT,
    status: RESOLVED_STATUS,
    resolutionSummary: "PostgreSQL `work_mem` parameter was set to `256MB` on a server with `max_connections = 400`. When 60 complex analytical sorting queries ran simultaneously, total per-connection sorting memory allocation exceeded physical RAM plus swap (`60 * 256MB = 15.3GB`). Reduced global `work_mem` to `32MB` and enabled `hash_mem_multiplier = 2.0`."
  },
  {
    title: "SAML 2.0 Just-In-Time (JIT) Provisioning Creating Duplicate User SIDs in Active Directory",
    description: "SAML JIT provisioning from Workday HR to Active Directory generating duplicate user accounts (`jsmith` vs `jsmith1`) due to race condition during batch onboarding.",
    ticketType: "SECURITY",
    category: "Identity & Access Management",
    priority: TicketPriority.HIGH,
    status: RESOLVED_STATUS,
    resolutionSummary: "Updated SAML JIT matching attribute mapping inside Azure AD Enterprise Application settings. Switched primary matching claim from ambiguous `user.mailNickname` (`jsmith`) to immutable employee ID `user.employeeId` (`EMP-948201`). Merged duplicate AD accounts using PowerShell `ADMT` migration script."
  },
  {
    title: "Kafka Producer `RecordTooLargeException` on Batch Event Ingestion Pipeline",
    description: "Analytics telemetry producer throwing `org.apache.kafka.common.errors.RecordTooLargeException: The request included a message larger than the max message size the server will accept`.",
    ticketType: "DEVOPS",
    category: "Message Brokers / Kafka",
    priority: TicketPriority.HIGH,
    status: RESOLVED_STATUS,
    resolutionSummary: "Payload contained uncompressed base64 image snapshots exceeding default `1048576` byte (1MB) broker limit. Updated Kafka broker topic configuration: `bin/kafka-configs.sh --alter --topic telemetry.snapshots --add-config max.message.bytes=10485760` (10MB) and configured producer compression (`compression.type=zstd`)."
  },
  {
    title: "AWS S3 CloudTrail Bucket Log Delivery Stopped (`InsufficientS3BucketPolicyException`)",
    description: "Security audit compliance alert triggered: Organization CloudTrail trail `org-master-trail` stopped writing logs to S3 bucket `arn:aws:s3:::company-cloudtrail-logs` 48 hours ago.",
    ticketType: "INFRASTRUCTURE",
    category: "AWS IAM & S3",
    priority: TicketPriority.URGENT,
    status: RESOLVED_STATUS,
    resolutionSummary: "Bucket KMS Customer Managed Key (`CMK`) had its key policy modified during Terraform cleanup, removing `kms:GenerateDataKey` authorization for service principal `cloudtrail.amazonaws.com`. Re-added the mandatory CloudTrail service principal trust block to the KMS Key Policy and confirmed log delivery resumed within 15 minutes."
  },
  {
    title: "Docker Container `No Space Left on Device` on `/var/lib/docker/overlay2` Disk Volume",
    description: "Production CI build runners failing all container startups with `mkdir /var/lib/docker/overlay2/abc123def/merged: no space left on device`. `df -h` shows `/var/lib/docker` at 100%.",
    ticketType: "DEVOPS",
    category: "Container Orchestration",
    priority: TicketPriority.HIGH,
    status: RESOLVED_STATUS,
    resolutionSummary: "Identified 800GB of uncompressed application log files trapped inside stopped container root filesystems (`/var/lib/docker/containers/*/*-json.log`). Configured Docker daemon (`/etc/docker/daemon.json`) with mandatory log rotation limits (`\"log-driver\": \"json-file\", \"log-opts\": {\"max-size\": \"50m\", \"max-file\": \"3\"}`) and executed `docker system prune -af --volumes`."
  },
  {
    title: "Istio VirtualService Canary Routing `Weight` Rule Causing 100% Traffic Drop to v2",
    description: "After deploying `orders-service-v2` with `weight: 10` canary routing in Istio VirtualService, all requests routed to `v2` return `HTTP 503 NR (No Route)`.",
    ticketType: "DEVOPS",
    category: "Service Mesh / Istio",
    priority: TicketPriority.URGENT,
    status: RESOLVED_STATUS,
    resolutionSummary: "Inspected `DestinationRule` for `orders-service` and found subset `v2` was missing selector label (`labels: { version: v2 }`). Istio router attempted to forward 10% of traffic to a non-existent endpoint group. Added exact `version: v2` label matching selector to the `DestinationRule` manifest and verified canary traffic flow."
  },
  {
    title: "PostgreSQL Logical Replication `Slot drop` Error Due to Max Wal Size Overflow",
    description: "Subscriber database instance `pg-analytics-sub` replication disconnected with error `ERROR: could not receive data from WAL stream: ERROR: replication slot \"debezium_slot\" was invalidated because it exceeded max_slot_wal_keep_size`.",
    ticketType: "DATABASE",
    category: "PostgreSQL Replication",
    priority: TicketPriority.URGENT,
    status: RESOLVED_STATUS,
    resolutionSummary: "Subscriber server experienced a 6-hour network outage, causing WAL accumulation on the publisher to breach `max_slot_wal_keep_size` (64GB limit). Recreated the logical replication slot on the publisher (`SELECT pg_create_logical_replication_slot(...)`) and re-synchronized tables via `ALTER SUBSCRIPTION analytics_sub REFRESH PUBLICATION;`."
  },
  {
    title: "GitLab CI Runner Kubernetes Pod `OOMKilled` During Node.js Webpack Production Bundle",
    description: "Frontend build pipeline crashes on step `npm run build:prod` (`Exit code 137`). Runner pod logs show `FATAL ERROR: Ineffective mark-compacts near heap limit Allocation failed - JavaScript heap out of memory`.",
    ticketType: "DEVOPS",
    category: "CI/CD Pipelines",
    priority: TicketPriority.MEDIUM,
    status: RESOLVED_STATUS,
    resolutionSummary: "Node.js V8 engine defaults to 2GB maximum heap inside containerized CI environments. In `.gitlab-ci.yml`, added environment variable `NODE_OPTIONS: \"--max-old-space-size=6144\"` and expanded the Kubernetes runner pod limits to `memory: 8Gi`."
  },
  {
    title: "AWS EKS Cluster `Coredns` CrashLoop Following Node Group Auto-Scaling to Zero",
    description: "CoreDNS pods inside `kube-system` stuck in `Pending` state after managed node group `workers-general` scaled down to 0 during weekend cost optimization window. All cluster DNS resolution dead.",
    ticketType: "INFRASTRUCTURE",
    category: "Container Orchestration / AWS EKS",
    priority: TicketPriority.URGENT,
    status: RESOLVED_STATUS,
    resolutionSummary: "CoreDNS deployment (`replicas: 2`) had `topologySpreadConstraints` and `nodeSelector` requiring deployment on `workers-general` spot instances, which had scaled down to zero. Updated CoreDNS deployment to tolerate `system-pool` on-demand system nodes (`nodeSelector: { \"eks.amazonaws.com/nodegroup\": \"system-pool\" }`) ensuring critical cluster DNS services never starve during spot scale-downs."
  }
];

async function main() {
  console.log('====================================================================');
  console.log(' Master AI & Vector Knowledge Base Pipeline (`ai-seeder.ts`)');
  console.log('====================================================================\n');

  // STEP 1: DATABASE ALIGNMENT & PGVECTOR CHECK
  console.log('[Step 1/3] Checking database connection and verifying `pgvector` extension alignment...');
  try {
    await prisma.$executeRaw`CREATE EXTENSION IF NOT EXISTS vector;`;
    console.log('pgvector extension (`vector`) is active and registered inside PostgreSQL.');
  } catch (err: any) {
    console.warn(' Could not execute `CREATE EXTENSION vector;` directly (may require superuser permissions or already exist):', err.message);
  }

  const now = new Date();

  // STEP 2: EVALUATE & PATCH EXISTING ROWS WITH NULL OR EMPTY RESOLUTIONS
  console.log('\n[Step 2/3] Evaluating existing rows to safely patch missing `resolutionSummary` and embedding vectors...');
  const unpatchedTickets: any[] = await prisma.ticket.findMany({
    where: {
      OR: [
        { resolutionSummary: null },
        { resolutionSummary: '' },
        { isIndexedToVectorDb: false }
      ]
    } as any
  });

  if (unpatchedTickets.length > 0) {
    console.log(`Found ${unpatchedTickets.length} unpatched or unindexed tickets. Patching with realistic resolution text & vectors...`);
    let patchCount = 0;
    for (const t of unpatchedTickets) {
      const summaryText = t.resolutionSummary && t.resolutionSummary.trim().length > 0
        ? t.resolutionSummary
        : PATCH_RESOLUTIONS[patchCount % PATCH_RESOLUTIONS.length];

      const seedStr = `${t.ticketType || 'GENERAL'} | ${t.category || 'SUPPORT'} | ${t.title} | ${summaryText}`;
      const mockVector = generateMockVector1536(seedStr);
      const vectorLiteral = `[${mockVector.join(',')}]`;

      await prisma.$executeRaw`
        UPDATE "Ticket"
        SET "resolutionSummary" = ${summaryText},
            "embedding" = ${vectorLiteral}::vector,
            "isIndexedToVectorDb" = true,
            "vectorIndexedAt" = ${now}
        WHERE "id" = ${t.id}
      `;
      patchCount++;
    }
    console.log(`Successfully patched and embedded ${patchCount} existing tickets.`);
  } else {
    console.log('No existing tickets require patching.');
  }

  // STEP 3: BULK-GENERATE DENSE DATASET IF NOT ALREADY SEEDED
  console.log('\n[Step 3/3] Checking dataset density and bulk-generating 100 diverse, highly technical RAG tickets...');
  const totalTickets = await prisma.ticket.count();
  const targetMinTickets = 100;

  if (totalTickets >= targetMinTickets) {
    console.log(`Database already contains ${totalTickets} total tickets (meeting or exceeding target ${targetMinTickets}). Pipeline complete.`);
    return;
  }

  const ticketsNeeded = targetMinTickets - totalTickets;
  console.log(`Database currently has ${totalTickets} tickets. Bulk-inserting ${ticketsNeeded} dense technical tickets to reach target ${targetMinTickets}...`);

  const adminUser = await prisma.user.findFirst({
    where: { systemRole: SystemRole.SUPER_ADMIN }
  });

  if (!adminUser) {
    throw new Error('Could not find a SUPER_ADMIN user in the database. Please run `npx prisma db seed` first to establish initial user records.');
  }

  const resolvedStatus: any = await (prisma as any).masterStatus.findFirst({
    where: { name: 'RESOLVED' }
  });

  let insertCount = 0;
  for (let i = 0; i < ticketsNeeded; i++) {
    const item = HEAVY_TICKET_DATASET[i % HEAVY_TICKET_DATASET.length];
    try {
      const ticket = await prisma.ticket.create({
        data: {
          title: item.title + (i >= HEAVY_TICKET_DATASET.length ? ` (Scenario #${i + 1})` : ''),
          description: item.description,
          status: item.status,
          statusId: resolvedStatus ? resolvedStatus.id : undefined,
          subStatus: SubStatus.NONE,
          priority: item.priority,
          category: item.category,
          ticketType: item.ticketType,
          customerId: adminUser.id,
          ticketOwnerId: adminUser.id,
          slaDeadline: new Date(now.getTime() + 86400000),
          ttfrDeadline: new Date(now.getTime() + 14400000),
          resolutionDeadline: new Date(now.getTime() + 86400000),
          isArchived: true,
          archivedAt: now,
          resolvedAt: now,
          slaTimerActive: false,
          resolutionSummary: item.resolutionSummary,
          isIndexedToVectorDb: true,
          vectorIndexedAt: now,
        } as any,
      });

      const seedString = `${item.ticketType} | ${item.category} | ${ticket.title} | ${item.resolutionSummary}`;
      const vector1536 = generateMockVector1536(seedString);
      const postgresVectorString = `[${vector1536.join(',')}]`;

      await prisma.$executeRaw`
        UPDATE "Ticket"
        SET "embedding" = ${postgresVectorString}::vector,
            "isIndexedToVectorDb" = true,
            "vectorIndexedAt" = ${now}
        WHERE "id" = ${ticket.id}
      `;

      insertCount++;
      if (insertCount % 20 === 0 || insertCount === ticketsNeeded) {
        console.log(`   Progress: [${insertCount}/${ticketsNeeded}] tickets seeded and vector-indexed cleanly.`);
      }
    } catch (err: any) {
      console.error(`Error inserting ticket #${i + 1}:`, err.message);
    }
  }

  console.log(`\n Master Pipeline Complete: Successfully synced database, patched missing data, and bulk-generated ${insertCount} new technical tickets!`);
}

main()
  .catch((e) => {
    console.error('Master Seeder Execution Threw Fatal Error:', e);
  })
  .finally(async () => {
    console.log('Closing database connections cleanly...');
    await prisma.$disconnect();
    await pool.end();
  });
