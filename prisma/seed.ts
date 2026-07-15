import 'dotenv/config';
import { PrismaClient, SystemRole, UserStatus, TicketStatus, SubStatus, TicketPriority } from '@prisma/client';
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

interface TicketSeedTemplate {
  title: string;
  description: string;
  category: string;
  priority: TicketPriority | any;
  status: TicketStatus | any;
  resolutionSummary: string | null;
  timeSpentMin?: number;
}

async function main() {
  console.log('🌱 Starting historical RAG test data seeding...');

  // 1. Safely clear existing tickets (optional guardrail)
  console.log('🧹 Clearing existing ticket records...');
  await prisma.comment.deleteMany({});
  await prisma.attachment.deleteMany({});
  await prisma.ticket.deleteMany({});

  // 2. Find or create fallback User records to satisfy mandatory foreign key relations
  console.log('👤 Finding or creating fallback users for customer and ticketOwner relations...');
  const passwordHash = await bcrypt.hash('Secret123!', 10);

  const superAdmin = await prisma.user.upsert({
    where: { email: 'admin@company.internal' },
    update: {
      name: 'System Admin (L3)',
      status: UserStatus.ACTIVE,
    },
    create: {
      email: 'admin@company.internal',
      name: 'System Admin (L3)',
      passwordHash,
      systemRole: SystemRole.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
      mustChangePassword: false,
    },
  });

  const l2Engineer = await prisma.user.upsert({
    where: { email: 'tech.support@company.internal' },
    update: {
      name: 'Marcus Vance (Senior L2 Tech)',
      status: UserStatus.ACTIVE,
    },
    create: {
      email: 'tech.support@company.internal',
      name: 'Marcus Vance (Senior L2 Tech)',
      passwordHash,
      systemRole: SystemRole.L2_ENGINEER,
      status: UserStatus.ACTIVE,
      mustChangePassword: false,
    },
  });

  const customerUser = await prisma.user.upsert({
    where: { email: 'jsmith@client-enterprise.com' },
    update: {
      name: 'John Smith (Enterprise Client)',
      status: UserStatus.ACTIVE,
    },
    create: {
      email: 'jsmith@client-enterprise.com',
      name: 'John Smith (Enterprise Client)',
      passwordHash,
      systemRole: SystemRole.CUSTOMER,
      status: UserStatus.ACTIVE,
      mustChangePassword: false,
    },
  });

  // Ensure default master statuses exist if statusId is referenced anywhere
  const resolvedMaster = await (prisma as any).masterStatus.upsert({
    where: { name: 'RESOLVED' },
    update: {},
    create: { name: 'RESOLVED', label: 'Resolved', isActive: true, isArchived: true },
  });

  const closedMaster = await (prisma as any).masterStatus.upsert({
    where: { name: 'CLOSED' },
    update: {},
    create: { name: 'CLOSED', label: 'Closed', isActive: true, isArchived: true },
  });

  const openMaster = await (prisma as any).masterStatus.upsert({
    where: { name: 'OPEN' },
    update: {},
    create: { name: 'OPEN', label: 'Open', isActive: true, isArchived: false },
  });

  const wipMaster = await (prisma as any).masterStatus.upsert({
    where: { name: 'WORK_IN_PROGRESS' },
    update: {},
    create: { name: 'WORK_IN_PROGRESS', label: 'Work In Progress', isActive: true, isArchived: false },
  });

  // Helper values resilient across varied IDE type definitions and Prisma Client versions
  const STATUS_RESOLVED = ((TicketStatus as any).RESOLVED || 'RESOLVED') as any;
  const STATUS_CLOSED = ((TicketStatus as any).CLOSED || 'CLOSED') as any;
  const STATUS_OPEN = ((TicketStatus as any).OPEN || 'OPEN') as any;
  const STATUS_WIP = ((TicketStatus as any).WORK_IN_PROGRESS || (TicketStatus as any).IN_PROGRESS || 'WORK_IN_PROGRESS') as any;

  // 3. Define 40 diverse and realistic historical support ticket scenarios
  // ~75% (30 tickets) are RESOLVED or CLOSED with detailed L2 resolution notes (isIndexedToVectorDb: false)
  // ~25% (10 tickets) are OPEN or WORK_IN_PROGRESS (resolutionSummary: null, isIndexedToVectorDb: false)
  const templates: TicketSeedTemplate[] = [
    // --- RESOLVED / CLOSED TICKETS (30 items) ---
    {
      title: 'MFA Setup Blocked - Authenticator QR Code Loop',
      description: 'User reports being unable to register Microsoft Authenticator on their new iPhone. The portal loops indefinitely after scanning the QR code and throws error AADSTS50011.',
      category: 'Identity & Access',
      priority: TicketPriority.HIGH,
      status: STATUS_RESOLVED,
      resolutionSummary: 'Root cause identified as a stale multi-factor authentication token tied to the user\'s decommissioned mobile device. Cleared the active MFA session sessions via Azure AD admin portal, revoked all existing app app passwords, and forced re-enrollment. User successfully scanned the fresh QR code and verified login using push notifications.',
      timeSpentMin: 25,
    },
    {
      title: 'VPN Gateway Disconnections Every 15 Minutes',
      description: 'Remote employee experiencing frequent tunnel drops when connecting to the US-East VPN endpoint from home Wi-Fi. Cisco AnyConnect reports split-tunnel rekey failure.',
      category: 'Network Infrastructure',
      priority: TicketPriority.HIGH,
      status: STATUS_RESOLVED,
      resolutionSummary: 'Traced the root cause to MTU packet fragmentation over the user\'s local ISP fiber gateway. Adjusted the AnyConnect client MTU size down from 1500 to 1350 bytes and updated the local SSL gateway cipher preferences. User tested continuous large file downloads over a 3-hour period with zero packet drop.',
      timeSpentMin: 45,
    },
    {
      title: 'Outlook Desktop Client Stuck in Disconnected State',
      description: 'Outlook 365 desktop application on Windows 11 shows "Disconnected" in the bottom status bar despite active internet connectivity. Webmail works fine.',
      category: 'Workplace Endpoints',
      priority: TicketPriority.MEDIUM,
      status: STATUS_RESOLVED,
      resolutionSummary: 'Mailbox OST cache file had become corrupted after an abrupt Windows system update reboot. Renamed the damaged Outlook profile directory (`%localappdata%\\Microsoft\\Outlook`), cleared autodiscover registry keys, and re-synchronized the primary Exchange account. Verified inbound and outbound mail delivery with user.',
      timeSpentMin: 30,
    },
    {
      title: 'Database Connection Pool Exhaustion on Production API',
      description: 'Production Node.js microservices throwing "TimeoutExceededError: Knex: Timeout acquiring a connection. The pool is probably full". Latency spiked to 8000ms.',
      category: 'Core Servers',
      priority: ((TicketPriority as any).URGENT || TicketPriority.HIGH) as any,
      status: STATUS_RESOLVED,
      resolutionSummary: 'Investigated pg-pool metrics via AWS CloudWatch and found unclosed transactions inside the nightly reporting worker task. Temporarily scaled max_connections on the RDS PostgreSQL read-replica from 200 to 350 to mitigate immediate drop. Deployed hotfix PR #1429 which adds explicit `try/finally` query release blocks to all background workers.',
      timeSpentMin: 120,
    },
    {
      title: 'Docker Build Failure on CI/CD Pipeline - Exit Code 137',
      description: 'GitHub Actions build job failing during `npm run build` stage inside multi-stage Dockerfile. Container terminates abruptly with exit code 137.',
      category: 'DevOps & CI/CD',
      priority: TicketPriority.HIGH,
      status: STATUS_RESOLVED,
      resolutionSummary: 'Determined that the build container was hitting out-of-memory (OOM) limits due to Webpack source-map generation consuming over 4GB RAM. Updated the GitHub Actions runner instance tier from `ubuntu-latest` (2-core 4GB) to custom runner (`ubuntu-8core-16gb`) and added `--max-old-space-size=8192` flag to the Node build environment.',
      timeSpentMin: 40,
    },
    {
      title: 'SSL Certificate Expiration Warning on API Gateway',
      description: 'Automated monitoring triggered PagerDuty alert indicating wild-card TLS certificate for `*.client-enterprise.com` expires in less than 72 hours.',
      category: 'Security & Compliance',
      priority: ((TicketPriority as any).URGENT || TicketPriority.HIGH) as any,
      status: STATUS_RESOLVED,
      resolutionSummary: 'Verified DNS challenge validation for our Let\'s Encrypt / DigiCert account. Renewed the SSL/TLS wildcard certificate across CloudFront distributions and updated the AWS ACM certificate ARN in our Terraform infrastructure definitions. Executed automated health checks across all HTTPS endpoints to confirm 200 OK handshakes.',
      timeSpentMin: 50,
    },
    {
      title: 'Kubernetes Pod CrashLoopBackOff - Auth Service',
      description: 'Production deployment `auth-service-v2` pods entering CrashLoopBackOff state immediately upon rollout. `kubectl logs` reports missing environment secret key.',
      category: 'DevOps & CI/CD',
      priority: ((TicketPriority as any).URGENT || TicketPriority.HIGH) as any,
      status: STATUS_CLOSED,
      resolutionSummary: 'Identified that the newly introduced JWT private signing key (`JWT_PRIVATE_KEY_PEM`) was missing from the target `auth-secrets` Kubernetes Secret namespace. Sealed secrets manifest had not been applied to the `prod-eu-central-1` cluster. Applied updated SealedSecret YAML and restarted pod deployments. All replicas reached healthy running status within 45 seconds.',
      timeSpentMin: 35,
    },
    {
      title: 'Wi-Fi Instability in Conference Room 3B - High Packet Loss',
      description: 'Executives report severe jitter and dropped video calls during Teams presentations when connected to the 5GHz SSID in Room 3B.',
      category: 'Network Infrastructure',
      priority: TicketPriority.MEDIUM,
      status: STATUS_RESOLVED,
      resolutionSummary: 'Performed RF spectrum analysis using Ekahau Sidekick and identified severe co-channel interference on Channel 149 caused by a neighboring tenant\'s unmanaged access point. Adjusted the local Cisco Meraki AP to dynamic channel selection locked between DFS channels 52-64 and increased transmit power by +2 dBm. Conducted verification ping tests showing <2ms latency.',
      timeSpentMin: 60,
    },
    {
      title: 'Laptop Thermal Throttling & Sudden Shutdowns under Load',
      description: 'User\'s Dell Latitude 7430 shuts down unexpectedly when compiling large Java repositories or running local Docker containers. CPU temperature reaches 98C.',
      category: 'Workplace Endpoints',
      priority: TicketPriority.MEDIUM,
      status: STATUS_RESOLVED,
      resolutionSummary: 'Ran hardware diagnostics confirming thermal sensor trip threshold violations. Disassembled laptop chassis, cleaned blocked internal cooling exhaust fans, and re-applied thermal paste (Arctic MX-4) to CPU/GPU die. Updated BIOS to v1.18.0. Post-maintenance stress tests showed peak CPU temperatures stabilizing below 74C during continuous multi-core builds.',
      timeSpentMin: 90,
    },
    {
      title: 'Printer Offline - Network LaserJet Pro MFP M428',
      description: 'Accounting department unable to print invoices. Printer status shows "Offline" across all Windows 10/11 workstations on subnet 10.24.4.x.',
      category: 'Workplace Endpoints',
      priority: TicketPriority.LOW,
      status: STATUS_RESOLVED,
      resolutionSummary: 'Discovered that the DHCP lease for the printer had expired and the printer acquired a fallback APIPA IP address due to a switch port bounce. Reserved static IP `10.24.4.150` in the Windows Server DHCP scope, flushed local print spooler queues across affected accounting workstations, and printed test configuration page successfully.',
      timeSpentMin: 20,
    },
    {
      title: 'Git Authentication Failure after SSH Key Migration',
      description: 'Developer receives `Permission denied (publickey)` error when attempting to `git push` to corporate Bitbucket/GitHub enterprise repositories via SSH port 22.',
      category: 'Identity & Access',
      priority: TicketPriority.MEDIUM,
      status: STATUS_RESOLVED,
      resolutionSummary: 'Diagnosed that OpenSSH v8.8+ deprecated RSA (`ssh-rsa`) signatures by default, causing legacy keys to fail during handshake. Guided user to generate an Ed25519 SSH keypair (`ssh-keygen -t ed25519`), uploaded the public key to their GitHub Enterprise profile, and added identity to `ssh-agent`. Verified `git pull` and `git push` commands against test repo.',
      timeSpentMin: 15,
    },
    {
      title: 'Server Disk Space Alert - /var/log Partition at 98% Capacity',
      description: 'Zabbix monitoring alert triggered for `web-node-04`: `/var/log` filesystem utilization reached 98.4%. Risk of application write failure.',
      category: 'Core Servers',
      priority: TicketPriority.HIGH,
      status: STATUS_CLOSED,
      resolutionSummary: 'Inspected `/var/log` directory hierarchy and located a 42GB uncompressed application debug log (`nginx-access-trace.log`) caused by an inadvertently left-on verbose logging flag in production Nginx config. Rotated and gzip-compressed the historical log file, freed up 41.5GB of disk space, and updated `logrotate.d/nginx` retention rules to enforce daily compression.',
      timeSpentMin: 25,
    },
    {
      title: 'Active Directory User Account Locked Out Repeatedly',
      description: 'User\'s domain account locks out within 10 minutes of unlocking by IT helpdesk. User is unable to remain logged into Windows domain session.',
      category: 'Identity & Access',
      priority: TicketPriority.MEDIUM,
      status: STATUS_RESOLVED,
      resolutionSummary: 'Investigated Domain Controller security event logs (Event ID 4740) and traced lockout requests to IP address `10.12.8.44` (user\'s secondary iPad tablet). User had changed their domain password yesterday but left corporate Exchange mail syncing with old credentials on the tablet. Updated password on the tablet device and verified zero further bad password attempts over 2 hours.',
      timeSpentMin: 30,
    },
    {
      title: 'Access Permission Request - Financial Analytics Tableau Dashboard',
      description: 'New financial analyst requires Viewer access to the Q3 Revenue Forecasting Tableau report and underlying Snowflake read-only schema.',
      category: 'Access & Permissions',
      priority: TicketPriority.LOW,
      status: STATUS_RESOLVED,
      resolutionSummary: 'Verified manager approval ticket #APP-9981 from VP of Finance. Added user\'s Active Directory account to security group `SEC-GRP-Tableau-Finance-Viewers` and granted role `ANALYTICS_READONLY` in Snowflake provisioning portal. Confirmed user could successfully authenticate via Okta SSO and view all workbook sheets.',
      timeSpentMin: 15,
    },
    {
      title: 'Software Installation Request - JetBrains IntelliJ IDEA Ultimate',
      description: 'Senior Java backend developer requesting commercial license assignment and silent installation package for IntelliJ IDEA Ultimate 2026.',
      category: 'Workplace Endpoints',
      priority: TicketPriority.LOW,
      status: STATUS_CLOSED,
      resolutionSummary: 'Assigned floating enterprise subscription seat from our JetBrains account management portal. Deployed silent installation installer via Microsoft Intune Company Portal (`JetBrains-IntelliJ-2026.exe --silent`). Verified license activation via corporate license server (`https://lic.company.internal`).',
      timeSpentMin: 20,
    },
    {
      title: 'Blue Screen of Death (BSOD) - CRITICAL_PROCESS_DIED on Boot',
      description: 'Workstation crashes immediately on Windows boot logo after applying Patch Tuesday updates. Stop code `CRITICAL_PROCESS_DIED` (`0x000000EF`).',
      category: 'Workplace Endpoints',
      priority: TicketPriority.HIGH,
      status: STATUS_RESOLVED,
      resolutionSummary: 'Booted machine into Windows Recovery Environment (WinRE) command prompt. Ran `DISM /image:C:\\ /cleanup-image /revertpendingactions` followed by `sfc /scannow /offbootdir=C:\\ /offwindir=C:\\Windows`. Identified corrupted `ntfs.sys` driver block introduced by conflict with third-party endpoint security driver. Rolled back driver via Device Manager and verified clean boot progression.',
      timeSpentMin: 75,
    },
    {
      title: 'API Timeout Issues on Payment Gateway Webhook Handler',
      description: 'Stripe webhook notifications timing out with HTTP 504 Gateway Timeout errors during high volume sales events. Orders not marking paid.',
      category: 'DevOps & CI/CD',
      priority: ((TicketPriority as any).URGENT || TicketPriority.HIGH) as any,
      status: STATUS_RESOLVED,
      resolutionSummary: 'Analyzed APM traces inside New Relic and noticed the webhook endpoint (`POST /webhooks/stripe`) was doing synchronous invoice PDF generation before returning HTTP 200 acknowledgment. Refactored webhook handler to enqueue payload into RabbitMQ background worker exchange and return `202 Accepted` immediately within 12ms. Zero subsequent webhook timeouts observed during load testing.',
      timeSpentMin: 110,
    },
    {
      title: 'Email Delivery Delays - External Messages Delayed by 4 Hours',
      description: 'Marketing department reports external vendor replies taking up to 4 hours to arrive in Office 365 inbox. Message trace shows queuing at edge transport.',
      category: 'Core Servers',
      priority: TicketPriority.HIGH,
      status: STATUS_RESOLVED,
      resolutionSummary: 'Inspected Exchange Online Mail Flow message traces and found high latency across our third-party email hygiene gateway (Proofpoint/Mimecast) due to regex deadlock in custom DLP attachment scanning rule #14. Disabled problematic regex inspection filter and flushed mail delivery queues. Backlog of 4,200 delayed messages cleared within 18 minutes.',
      timeSpentMin: 65,
    },
    {
      title: 'Corporate VPN Split-Tunnel DNS Resolution Failure',
      description: 'When connected to corporate VPN, internal domain names (`*.dev.company.internal`) fail to resolve via `nslookup` while public internet domains work fine.',
      category: 'Network Infrastructure',
      priority: TicketPriority.MEDIUM,
      status: STATUS_RESOLVED,
      resolutionSummary: 'Diagnosed interface metric conflict between Windows 11 Wi-Fi adapter (Metric 25) and AnyConnect Virtual Adapter (Metric 50). Windows DNS Client was querying public ISP resolvers first instead of corporate internal DNS (`10.0.1.10`). Configured PowerShell `Set-NetIPInterface -InterfaceAlias "Cisco AnyConnect*" -InterfaceMetric 1` to enforce primary DNS search order.',
      timeSpentMin: 35,
    },
    {
      title: 'Redis Cache Cluster High Memory Eviction Spikes',
      description: 'Production Redis cache instance hitting 100% memory limit (`maxmemory`), triggering volatile-lru evictions and slowing down customer cart lookups.',
      category: 'Core Servers',
      priority: TicketPriority.HIGH,
      status: STATUS_RESOLVED,
      resolutionSummary: 'Connected via `redis-cli --bigkeys` and discovered leftover session keys from old v1 authentication schema (`session:user:legacy:*`) that lacked time-to-live (TTL) expiration timestamps. Executed asynchronous background batch deletion (`UNLINK`) removing 1.8 million dead keys and configured a global 30-day default TTL policy on new cache allocations.',
      timeSpentMin: 55,
    },
    {
      title: 'Password Reset Request after 90-Day Policy Expiry',
      description: 'User locked out of corporate portal following mandatory quarterly password rotation deadline. Forgotten previous security questions answers.',
      category: 'Identity & Access',
      priority: TicketPriority.LOW,
      status: STATUS_RESOLVED,
      resolutionSummary: 'Verified employee identity via Zoom video check and employee ID badge match. Initiated temporary password reset via Okta Helpdesk portal (`Temporary Password sent to registered personal SMS`). Required immediate password change upon first authentication and guided user to register updated self-service security verification methods.',
      timeSpentMin: 15,
    },
    {
      title: 'Webcam Audio/Video Desynchronization in Zoom/Teams Calls',
      description: 'Logitech C920 webcam microphone audio lags 2 seconds behind video feed during meetings on Lenovo ThinkPad P14s.',
      category: 'Workplace Endpoints',
      priority: TicketPriority.LOW,
      status: STATUS_CLOSED,
      resolutionSummary: 'Determined that USB power management features were suspending the USB 3.0 root hub controller during high bandwidth video encoding. Disabled USB Selective Suspend via Windows Power Options (`powercfg /SETACVALUEINDEX ...`) and updated Realtek High Definition Audio controller drivers to latest OEM release v6.0.9412.1.',
      timeSpentMin: 25,
    },
    {
      title: 'Terraform State Lock Contention on S3 DynamoDB Table',
      description: 'Infrastructure deployment pipeline stuck with error: `Error acquiring the state lock: ConditionalCheckFailedException in DynamoDB table terraform-locks`.',
      category: 'DevOps & CI/CD',
      priority: TicketPriority.MEDIUM,
      status: STATUS_RESOLVED,
      resolutionSummary: 'Investigated DynamoDB lock entries and verified that a cancelled Jenkins deployment job (`build #891`) terminated without releasing state lock ID `b49a21-99cd-481e...`. Confirmed zero concurrent terraform operations in progress. Executed `terraform force-unlock b49a21-99cd-481e...` and re-triggered infrastructure rollout cleanly.',
      timeSpentMin: 20,
    },
    {
      title: 'Slow SQL Query Execution on Customer Order History Portal',
      description: 'Page load for customer order summary screen taking >12 seconds for accounts with more than 500 historical transactions. Database CPU spikes to 85%.',
      category: 'Core Servers',
      priority: TicketPriority.HIGH,
      status: STATUS_RESOLVED,
      resolutionSummary: 'Executed `EXPLAIN ANALYZE` on the underlying `SELECT * FROM orders WHERE customer_id = $1 ORDER BY created_at DESC` query and found sequential table scans due to missing composite index. Created index `idx_orders_customer_created` (`CREATE INDEX CONCURRENTLY ON orders (customer_id, created_at DESC)`). Execution time dropped from 11,800ms to 14ms.',
      timeSpentMin: 50,
    },
    {
      title: 'MacBook Pro Apple M3 External Dual Monitor Not Detected',
      description: 'User unable to drive two external 4K monitors via USB-C dock on new MacBook Pro M3 base chip. Only single display mirrors.',
      category: 'Workplace Endpoints',
      priority: TicketPriority.MEDIUM,
      status: STATUS_RESOLVED,
      resolutionSummary: 'Educated user on Apple M3 base hardware architectural constraint (supports maximum 1 external display via native Thunderbolt alt-mode). Replaced user\'s standard passive USB-C hub with DisplayLink certified docking station (Targus DOCK190US) and installed DisplayLink Manager software v1.10. Both 4K displays recognized independently at 60Hz.',
      timeSpentMin: 40,
    },
    {
      title: 'Jenkins Master Node Out of Disk Space due to Artifacts',
      description: 'Jenkins CI controller offline. Workspace build logs show `No space left on device` when archiving JUnit test report XML files.',
      category: 'DevOps & CI/CD',
      priority: TicketPriority.HIGH,
      status: STATUS_CLOSED,
      resolutionSummary: 'SSHed into Jenkins primary controller node and checked storage utilization. Discovered workspace `builds/` directories retained uncompressed build artifacts for over 365 days (~140GB). Ran cleanup script removing artifacts older than 14 days and installed Jenkins Discard Old Builds plugin globally with a 20-build retention limit per job.',
      timeSpentMin: 45,
    },
    {
      title: 'Intermittent 502 Bad Gateway Errors on Cloudflare CDN Edge',
      description: 'Customers from EU regions sporadically seeing HTTP 502 Bad Gateway error screens when accessing main landing pages during peak afternoon traffic.',
      category: 'Network Infrastructure',
      priority: ((TicketPriority as any).URGENT || TicketPriority.HIGH) as any,
      status: STATUS_RESOLVED,
      resolutionSummary: 'Correlated Cloudflare edge error logs with origin AWS Application Load Balancer (ALB) access metrics. Discovered ALB `keep-alive` timeout (60 seconds) was shorter than Cloudflare origin connection reuse timeout (100 seconds), causing edge proxies to send requests down closed TCP connections. Increased ALB idle timeout to 120 seconds.',
      timeSpentMin: 60,
    },
    {
      title: 'Shared Network Drive Access Denied (`\\\\stor-srv\\finance`)',
      description: 'User in accounting receives Windows Network Error `0x80070005 Access is denied` when trying to open shared folder mapped to Z: drive.',
      category: 'Access & Permissions',
      priority: TicketPriority.MEDIUM,
      status: STATUS_RESOLVED,
      resolutionSummary: 'Verified NTFS and SMB Share permissions on target file server `stor-srv`. User was recently transferred from HR to Accounting in Workday, but automated AD group synchronization script had delayed adding her to `AD-FINANCE-READWRITE`. Manually added user to AD group, instructed user to log off and re-authenticate to refresh Kerberos ticket granting tokens.',
      timeSpentMin: 20,
    },
    {
      title: 'SentinelOne Endpoint Agent Reporting Offline in Console',
      description: 'Security dashboard shows 12 workstation endpoints in the Austin office haven\'t checked in with SentinelOne management cloud in over 7 days.',
      category: 'Security & Compliance',
      priority: TicketPriority.HIGH,
      status: STATUS_RESOLVED,
      resolutionSummary: 'Investigated workstation firewall rules via GPO and found a newly pushed local Windows Defender Firewall rule blocking outbound HTTPS port 443 to `*.sentinelone.net`. Corrected domain GPO whitelist rule to allow endpoint security agent telemetry and forced `gpupdate /force` across target Austin organizational unit (OU). All 12 agents checked in within 10 minutes.',
      timeSpentMin: 55,
    },
    {
      title: 'PostgreSQL Read-Replica Lag Exceeding 15 Minutes',
      description: 'Analytics dashboard queries serving stale data. Datadog alert shows RDS read-replica `postgres-replica-02` replication lag reached 940 seconds.',
      category: 'Core Servers',
      priority: TicketPriority.HIGH,
      status: STATUS_RESOLVED,
      resolutionSummary: 'Checked `pg_stat_activity` on the read-replica and found a long-running reporting query (`SELECT ... FROM large_audit_table`) holding AccessShareLock that blocked WAL replay of DDL updates from the primary master node. Terminated the blocking read query (`pg_terminate_backend(49182)`) and enabled `max_standby_archive_delay = 30s` in postgresql.conf.',
      timeSpentMin: 45,
    },

    // --- OPEN / WORK_IN_PROGRESS TICKETS (10 items) ---
    {
      title: 'SAML SSO Authentication Loop with Okta & AWS IAM Identity Center',
      description: 'Users attempting to login to AWS Console via Okta SSO tile encounter infinite redirection loop. Browser console shows SAML response validation failure.',
      category: 'Identity & Access',
      priority: ((TicketPriority as any).URGENT || TicketPriority.HIGH) as any,
      status: STATUS_WIP,
      resolutionSummary: null,
    },
    {
      title: 'Intermittent Packet Drops on Data Center Core Switch Stack',
      description: 'Network monitoring tool reports 1.2% CRC error frames and dropped packets on GigabitEthernet1/0/24 uplink between Core Switch A and SAN Storage Array.',
      category: 'Network Infrastructure',
      priority: TicketPriority.HIGH,
      status: STATUS_OPEN,
      resolutionSummary: null,
    },
    {
      title: 'Elasticsearch Cluster Health Status Yellow - Unassigned Shards',
      description: 'Logging infrastructure Elasticsearch index `filebeat-2026.07.14` showing cluster state Yellow due to 4 unassigned replica shards following data node reboot.',
      category: 'Core Servers',
      priority: TicketPriority.MEDIUM,
      status: STATUS_WIP,
      resolutionSummary: null,
    },
    {
      title: 'S3 Bucket Cross-Region Replication Latency Alert',
      description: 'AWS S3 bucket `enterprise-backup-us-east` showing replication lag to disaster recovery bucket `enterprise-backup-eu-west` exceeding SLA threshold of 15 minutes.',
      category: 'DevOps & CI/CD',
      priority: TicketPriority.MEDIUM,
      status: STATUS_WIP,
      resolutionSummary: null,
    },
    {
      title: 'Memory Leak Investigation in User Notification Worker Service',
      description: 'Node.js notification service (`notification-worker-v3`) container memory consumption climbs steadily by 100MB per hour until hitting Docker container cgroup limit.',
      category: 'DevOps & CI/CD',
      priority: TicketPriority.HIGH,
      status: STATUS_WIP,
      resolutionSummary: null,
    },
    {
      title: 'CrowdStrike Falcon Sensor High CPU Usage on Windows Server 2022',
      description: 'Domain controllers reporting sustained 40% CPU utilization by `csagent.exe` (CrowdStrike Falcon Sensor) during routine nightly Active Directory backup snapshots.',
      category: 'Security & Compliance',
      priority: TicketPriority.MEDIUM,
      status: STATUS_OPEN,
      resolutionSummary: null,
    },
    {
      title: 'Request for Custom Role Creation - L1.5 Service Desk Triage',
      description: 'Helpdesk manager requesting creation of a new intermediate system role (`L1.5_ENGINEER`) with read-only audit log access plus ticket re-assignment capabilities.',
      category: 'Access & Permissions',
      priority: TicketPriority.LOW,
      status: STATUS_OPEN,
      resolutionSummary: null,
    },
    {
      title: 'Outlook Mobile App Push Notification Failure on Android 15',
      description: 'Multiple users with Google Pixel devices running Android 15 report delayed or missing email push notifications when device screen is locked.',
      category: 'Workplace Endpoints',
      priority: TicketPriority.LOW,
      status: STATUS_WIP,
      resolutionSummary: null,
    },
    {
      title: 'GitLab Runner CI Cache Storage Cleanup & NFS Share Migration',
      description: 'Shared NFS volume (`/mnt/gitlab-runner-cache`) running out of inodes. Need to migrate CI distributed cache driver to MinIO S3 object storage bucket.',
      category: 'DevOps & CI/CD',
      priority: TicketPriority.MEDIUM,
      status: STATUS_WIP,
      resolutionSummary: null,
    },
    {
      title: 'Periodic SSL Handshake Failures on Legacy Payment Terminal Gateway',
      description: 'Legacy point-of-sale terminals in retail stores failing to complete TLS 1.2 handshake during intermittent morning peak hours. Gateway returns `SSL_ERROR_SYSCALL`.',
      category: 'Network Infrastructure',
      priority: ((TicketPriority as any).URGENT || TicketPriority.HIGH) as any,
      status: STATUS_OPEN,
      resolutionSummary: null,
    },
  ];

  console.log(`📝 Inserting ${templates.length} historical support tickets...`);

  let count = 0;
  for (const t of templates) {
    const isResolved = t.status === STATUS_RESOLVED || t.status === STATUS_CLOSED;
    
    // Map statusId to appropriate master status
    let masterStatusId = openMaster.id;
    if (t.status === STATUS_RESOLVED) masterStatusId = resolvedMaster.id;
    else if (t.status === STATUS_CLOSED) masterStatusId = closedMaster.id;
    else if (t.status === STATUS_WIP) masterStatusId = wipMaster.id;

    // Generate varied historical timestamps within the past 60 days
    const daysAgo = Math.floor(Math.random() * 50) + 5;
    const createdAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
    const updatedAt = new Date(createdAt.getTime() + (t.timeSpentMin || 30) * 60 * 1000);
    const slaDeadline = new Date(createdAt.getTime() + 24 * 60 * 60 * 1000);
    const ttfrDeadline = new Date(createdAt.getTime() + 4 * 60 * 60 * 1000);
    const resolutionDeadline = new Date(createdAt.getTime() + 48 * 60 * 60 * 1000);

    await prisma.ticket.create({
      data: {
        title: t.title,
        description: t.description,
        status: t.status,
        statusId: masterStatusId,
        subStatus: SubStatus.NONE,
        priority: t.priority,
        category: t.category,
        source: 'PORTAL',
        customerId: customerUser.id,
        ticketOwnerId: isResolved ? l2Engineer.id : superAdmin.id,
        slaDeadline,
        ttfrDeadline,
        resolutionDeadline,
        createdAt,
        updatedAt,
        timeSpentMin: t.timeSpentMin || 0,
        isScopeInScope: true,
        isSlaBreached: false,
        isTtfrBreached: false,
        isResolutionBreached: false,
        slaTimerActive: !isResolved,
        isArchived: isResolved,
        archivedAt: isResolved ? updatedAt : null,
        closedAt: isResolved ? updatedAt : null,
        resolvedAt: isResolved ? updatedAt : null,
        closedBy: isResolved ? l2Engineer.id : null,
        // RAG / Vector DB synchronization flags exactly as requested
        isIndexedToVectorDb: false,
        vectorIndexedAt: null,
        resolutionSummary: isResolved ? t.resolutionSummary : null,
      } as any,
    });
    count++;
  }

  console.log(`✅ Successfully seeded ${count} historical support tickets (${templates.filter(x => x.status === STATUS_RESOLVED || x.status === STATUS_CLOSED).length} resolved/closed, ${templates.filter(x => x.status === STATUS_OPEN || x.status === STATUS_WIP).length} active).`);
}

main()
  .catch((e) => {
    console.error('❌ Error during Prisma seed execution:', e);
    process.exit(1);
  })
  .finally(async () => {
    console.log('🔌 Disconnecting Prisma client cleanly...');
    await prisma.$disconnect();
    await pool.end();
  });
