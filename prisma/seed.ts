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

const RESOLVED_STATUS = ('RESOLVED' in TicketStatus ? (TicketStatus as any).RESOLVED : 'RESOLVED') as any;

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

// 1. Exactly 8 Enterprise Service Groups
const SERVICE_GROUPS = [
  'RIMS (Remote Infrastructure Management Services)',
  'SecOps (Cyber Security & Governance)',
  'Database & Middleware Management',
  'DevOps & Cloud Automation',
  'IoT & Edge Engineering',
  'Application Platform Support',
  'IAM (Identity & Access Management)',
  'IT Service Desk & Assets'
];

// 2. Exactly 7 Strict Ticket Type Subqueues
const TICKET_SUBQUEUES = [
  { name: 'Incident', desc: 'System interruption or threat issue', priority: TicketPriority.HIGH },
  { name: 'Service Request', desc: 'General access or configuration change', priority: TicketPriority.MEDIUM },
  { name: 'Proactive Notification', desc: 'Automated monitoring threat trigger alert', priority: TicketPriority.URGENT || TicketPriority.HIGH },
  { name: 'Report', desc: 'Scheduled audit analysis report', priority: TicketPriority.LOW },
  { name: 'Information', desc: 'General technical query/informational request', priority: TicketPriority.LOW },
  { name: 'Notification (Domain/Renewal)', desc: 'Identity domain or renewal task', priority: TicketPriority.MEDIUM },
  { name: 'Junk (Advertisement)', desc: 'Filtered spam or advertising message', priority: TicketPriority.LOW }
];

interface EnterpriseScenario {
  group: string;
  subqueue: string;
  title: string;
  description: string;
  resolutionSummary: string;
  priority: TicketPriority;
}

// 3. Comprehensive Domain-Specific Historical Ticket Dataset (112 Scenarios, 14 per Service Group covering all 7 subqueues)
const ENTERPRISE_SCENARIOS: EnterpriseScenario[] = [
  // ============================================================================
  // GROUP 1: RIMS (Remote Infrastructure Management Services)
  // ============================================================================
  {
    group: 'RIMS (Remote Infrastructure Management Services)',
    subqueue: 'Incident',
    title: 'ESXi vSphere Host 04 Purple Screen of Death (PSOD) - Kernel Exception',
    description: 'VMware ESXi vSphere 8.0 host `esx-prod-04.dc1.internal` abruptly halted with a Purple Screen of Death displaying exception `PF Exception 14 in world 432101: vmx`. 18 critical production VMs experienced HA failover reboot.',
    resolutionSummary: 'Analyzed vmkernel core dump (`/var/core/esx-prod-04.dump`) via VMware crash utility. Traced the fatal kernel page fault to a known bug in the Broadcom bnxtnet 10GbE NIC driver (`version 221.0.16.0`). Evacuated remaining VMs via vMotion, placed host in Maintenance Mode, applied certified Broadcom driver `bnxtnet-222.0.14.0-1OEM.800.1.0.20613240`, and verified stability under high I/O stress tests.',
    priority: TicketPriority.URGENT || TicketPriority.HIGH,
  },
  {
    group: 'RIMS (Remote Infrastructure Management Services)',
    subqueue: 'Incident',
    title: 'Cisco Nexus 9000 Core Switch BGP Peer Flap on Port-Channel 10',
    description: 'BGP peering session (`AS 65100`) between core data center switch `sw-nexus-core-01` and border router `rtr-border-east` flapped 12 times in 30 minutes. Network monitoring alerts indicate intermittent packet loss across VLAN 200.',
    resolutionSummary: 'Inspected switch syslog buffer and interface counters (`show interface port-channel 10`). Discovered CRC errors rapidly incrementing on physical member port `Ethernet1/48` due to a degraded SFP+ optical transceiver. Isolated member port from Port-Channel, hot-swapped the faulty Cisco 10GBASE-SR SFP+ module, cleaned fiber patch lead, and cleared interface counters. Peering session remained stable for 24+ hours.',
    priority: TicketPriority.HIGH,
  },
  {
    group: 'RIMS (Remote Infrastructure Management Services)',
    subqueue: 'Service Request',
    title: 'Provision 4x High-Performance LUNs on Pure Storage FlashArray//X',
    description: 'Database engineering team requires four 2TB NVMe FlashArray LUNs provisioned and mapped via Fibre Channel to the Oracle RAC physical host cluster (`ora-rac-01` and `ora-rac-02`).',
    resolutionSummary: 'Created four new 2TB volumes (`vol-ora-data-01` to `vol-ora-data-04`) on Pure Storage FlashArray//X90. Configured host groups and mapped volumes using WWNs of the dual-port Emulex HBA adapters on both physical Oracle nodes. Resized multipath (`multipath -ll`) on RHEL 8 hosts and confirmed round-robin path balancing across all 4 SAN fabrics.',
    priority: TicketPriority.MEDIUM,
  },
  {
    group: 'RIMS (Remote Infrastructure Management Services)',
    subqueue: 'Service Request',
    title: 'Dell PowerEdge R750 iDRAC9 Out-of-Band Firmware Upgrade',
    description: 'Scheduled maintenance request to upgrade iDRAC9 controller and BIOS firmware across 16 Dell PowerEdge R750 compute nodes in Rack B to resolve CVE-2024-22451.',
    resolutionSummary: 'Coordinated maintenance window with application owners. Executed rolling out-of-band firmware updates using Dell OpenManage Enterprise (OME) automation job. Upgraded iDRAC9 firmware from `6.00.02.00` to `7.00.00.171` and BIOS from `1.5.4` to `1.8.2`. Verified clean POST reboots and confirmed zero thermal or hardware sensor alerts across all 16 compute blades.',
    priority: TicketPriority.MEDIUM,
  },
  {
    group: 'RIMS (Remote Infrastructure Management Services)',
    subqueue: 'Proactive Notification',
    title: 'SAN Fibre Channel Path Redundancy Degraded on Storage Array A',
    description: 'Automated SolarWinds storage monitoring alert: SAN Controller A physical port FC_1/2 link status changed from ONLINE to DEGRADED. Storage traffic currently running on single redundant path FC_2/2.',
    resolutionSummary: 'Investigated SAN Brocade 6510 SAN switch port `Index 14`. Optical diagnostics (`sfpshow`) indicated TX laser output power dropped below acceptable threshold (-8.5 dBm). Replaced Brocade 16Gb FC SFP+ optics on switch port `14` and corresponding HBA port on storage controller. Ran `fc-validate` and verified full dual-path redundant failover.',
    priority: TicketPriority.URGENT || TicketPriority.HIGH,
  },
  {
    group: 'RIMS (Remote Infrastructure Management Services)',
    subqueue: 'Proactive Notification',
    title: 'Windows Server 2022 Hyper-V Cluster Node Storage Latency Spike',
    description: 'Datadog proactive anomaly alert triggered: Hyper-V Cluster Volume `ClusterStorage-Vol03` average read/write latency exceeded 45ms (threshold 15ms) for over 10 consecutive minutes on host `hv-node-07`.',
    resolutionSummary: 'Logged into cluster node and analyzed Performance Monitor disk queues. Discovered a runaway Veeam Backup snapshot consolidation task executing outside the scheduled overnight backup window. Throttled Veeam agent I/O allocation and re-scheduled VM disk merge operations during off-peak hours (02:00 UTC). Storage latency normalized to <4ms.',
    priority: TicketPriority.HIGH,
  },
  {
    group: 'RIMS (Remote Infrastructure Management Services)',
    subqueue: 'Report',
    title: 'Monthly Data Center Physical Infrastructure & Capacity Audit Report',
    description: 'Automated scheduled generation of the monthly infrastructure capacity audit report detailing rack power density (kW), UPS battery runtime load, and cooling BTU efficiency across DC1 and DC2.',
    resolutionSummary: 'Compiled telemetry logs from Schneider Electric EcoStruxure IT and Eaton UPS controllers. Average rack power utilization sits at 64% capacity; UPS battery runtime under full DC1 load tested at 18.5 minutes. Attached comprehensive Excel audit matrix (`DC_Capacity_Audit_May2026.xlsx`) and dispatched to infrastructure governance leadership.',
    priority: TicketPriority.LOW,
  },
  {
    group: 'RIMS (Remote Infrastructure Management Services)',
    subqueue: 'Report',
    title: 'Quarterly ESXi Cluster Storage Over-Commitment & Snapshot Audit',
    description: 'Scheduled quarterly review report for orphaned VMDK virtual disks, lingering snapshots older than 7 days, and datastore over-commitment ratios across our 6 production VMware clusters.',
    resolutionSummary: 'Executed PowerCLI auditing script `Audit-Datastores.ps1` against vCenter `vc-prod.internal`. Identified 14 orphaned `.vmdk` files consuming 3.2TB of Tier-1 flash storage and 6 uncommitted delta snapshots from old deployment pipelines. Archived report and generated sub-tasks for safe cleanup during the upcoming weekend maintenance window.',
    priority: TicketPriority.LOW,
  },
  {
    group: 'RIMS (Remote Infrastructure Management Services)',
    subqueue: 'Information',
    title: 'Query Regarding RHEL 9.4 Compatibility with Veeam Agent v12.1',
    description: 'Application engineering team inquiring about official RHEL 9.4 kernel support and required kernel-devel headers for Veeam Linux Agent `v12.1.0.1400` prior to OS upgrade rollout.',
    resolutionSummary: 'Verified Veeam Agent for Linux `v12.1.0.1400` release notes and tested against RHEL `9.4 (Linux kernel 5.14.0-427.el9.x86_64)` in our staging lab. Confirmed kernel module `veeamsnap` compiles cleanly provided `kernel-headers-$(uname -r)` and `gcc` packages are pre-installed. Provided step-by-step installation runbook documentation to the app team.',
    priority: TicketPriority.LOW,
  },
  {
    group: 'RIMS (Remote Infrastructure Management Services)',
    subqueue: 'Information',
    title: 'Specification Request for Data Center Colocation Power Feed Redundancy',
    description: 'Network planning group requesting architectural diagrams and physical feed specs for the A+B PDU power distribution topology in Row 4 Rack 12.',
    resolutionSummary: 'Extracted physical wiring schematics from our DCIM (Data Center Infrastructure Management) platform. Rack 12 is fed by dual independent 30A 208V 3-phase L21-30P locking receptacles from PDU-A (Utility Feed 1 + Generator A) and PDU-B (Utility Feed 2 + Generator B). Provided PDF schematic showing zero single-point-of-failure power redundancy.',
    priority: TicketPriority.LOW,
  },
  {
    group: 'RIMS (Remote Infrastructure Management Services)',
    subqueue: 'Notification (Domain/Renewal)',
    title: 'VMware vCenter Server Appliance SSL Certificate Expiration Warning',
    description: 'Automated lifecycle reminder: The Machine SSL Certificate on vCenter Server `vc-prod.internal` will expire on 2026-08-15. Action required to prevent API and ESXi host disconnection.',
    resolutionSummary: 'Connected to vCenter Server Appliance via SSH as root and launched VMware Certificate Manager tool (`/usr/lib/vmware-vmca/bin/certificate-manager`). Executed Option 3 to replace the Machine SSL Certificate using a new custom CSR signed by our internal corporate PKI Enterprise Intermediate CA. Restarted vCenter services (`service-control --stop --all && service-control --start --all`) and verified valid SSL chain through 2028.',
    priority: TicketPriority.MEDIUM,
  },
  {
    group: 'RIMS (Remote Infrastructure Management Services)',
    subqueue: 'Notification (Domain/Renewal)',
    title: 'Annual Hardware Support Contract Renewal for Cisco Catalyst Core Switches',
    description: 'Procurement notification alert: Cisco SmartNet 24x7x4hr hardware replacement contract `SMN-982310` covering 12 Catalyst 9300 edge switches expires next month.',
    resolutionSummary: 'Cross-referenced active switch serial numbers with our internal asset management CMDB. Confirmed all 12 Catalyst 9300 switches are in active production service. Approved purchase requisition `PR-88124` for SmartNet contract renewal and attached verified serial number inventory list for vendor order fulfillment.',
    priority: TicketPriority.MEDIUM,
  },
  {
    group: 'RIMS (Remote Infrastructure Management Services)',
    subqueue: 'Junk (Advertisement)',
    title: 'Unsolicited Quotation: Discounted Server Rack Enclosures & PDU Units',
    description: 'Incoming email from `sales@global-server-racks-promotions.com` offering bulk discounts on 42U APC compatible rack enclosures and smart metered PDU strips.',
    resolutionSummary: 'Identified incoming ticket as unsolicited external B2B sales advertisement. No technical infrastructure action required. Ticket classified under Junk/Advertisement routing rules and closed without notification.',
    priority: TicketPriority.LOW,
  },
  {
    group: 'RIMS (Remote Infrastructure Management Services)',
    subqueue: 'Junk (Advertisement)',
    title: 'Cold Outreach: Managed Offshore Remote NOC Monitoring Services 24/7',
    description: 'Sales inquiry proposing outsourced Level-1 NOC monitoring and ping checking services at $8 per device per month.',
    resolutionSummary: 'Unsolicited sales solicitation from external vendor. Our RIMS operations are fully managed internally via enterprise monitoring platforms. Tagged as spam and closed immediately.',
    priority: TicketPriority.LOW,
  },

  // ============================================================================
  // GROUP 2: SecOps (Cyber Security & Governance)
  // ============================================================================
  {
    group: 'SecOps (Cyber Security & Governance)',
    subqueue: 'Incident',
    title: 'CrowdStrike Falcon Sensor Quarantine Loop on Linux Kernel 6.5 Update',
    description: 'Multiple RHEL 9 production servers running CrowdStrike Falcon agent (`v7.10`) entered kernel panic / quarantine loop immediately after unattended security update applied Linux kernel `6.5.0-35-generic`.',
    resolutionSummary: 'Identified kernel eBPF probe incompatibility between CrowdStrike Falcon sensor `v7.10` and the newly updated `6.5.0-35` kernel module signatures. Booted affected hosts into previous working kernel (`6.5.0-28`), pinned kernel packages (`versionlock`), deployed updated CrowdStrike sensor `v7.14.18206.0` via Ansible playbook, and confirmed clean sensor check-in with zero kernel faults.',
    priority: TicketPriority.URGENT || TicketPriority.HIGH,
  },
  {
    group: 'SecOps (Cyber Security & Governance)',
    subqueue: 'Incident',
    title: 'Palo Alto Networks Firewall SSL Decryption Policy Blocking GitHub SSH',
    description: 'DevOps engineers report sudden inability to clone or push Git repositories over SSH (`git@github.com:port 22`). Palo Alto firewall `PA-3410` logs show session dropped with reason `policy-deny-ssl-decrypt`.',
    resolutionSummary: 'Inspected Palo Alto Panorama decryption policy rule `Rule-104-SSL-Inbound`. Discovered that an automated security signature update enabled aggressive SSH-proxy inspection which failed on Git SSH RSA/Ed25519 key exchanges. Created a dedicated Decryption Exemption Rule targeting destination `github.com` on TCP port `22` and applied commit to all border firewalls. Git workflows restored instantly.',
    priority: TicketPriority.HIGH,
  },
  {
    group: 'SecOps (Cyber Security & Governance)',
    subqueue: 'Service Request',
    title: 'Configure SIEM Splunk Log Forwarding for New EKS Kubernetes Cluster',
    description: 'Cloud team requests configuration of Splunk Connect for Kubernetes (SC4K) and Splunk HTTP Event Collector (HEC) tokens to forward container stdout/stderr logs from `eks-prod-us-east-1`.',
    resolutionSummary: 'Provisioned a dedicated Splunk HEC index `k8s_prod_apps` and generated a secure 32-character HEC authentication token (`4A8B9C12-...`) with SSL validation enabled. Created Kubernetes Secret `splunk-heC-token` inside the cluster and deployed official Helm chart `splunk-connect-for-kubernetes-1.4.8` configured with Fluentd DaemonSets. Confirmed real-time log ingestion inside Splunk Enterprise search dashboard.',
    priority: TicketPriority.MEDIUM,
  },
  {
    group: 'SecOps (Cyber Security & Governance)',
    subqueue: 'Service Request',
    title: 'Perform SOC Vulnerability Remediation Assessment for CVE-2024-3094 (XZ Utils)',
    description: 'Urgent security request to scan all internal Linux endpoints and container registries for presence of compromised `xz-utils` library versions (`5.6.0` and `5.6.1`) and provide patch verification.',
    resolutionSummary: 'Executed enterprise-wide Tenable Nessus vulnerability scan and queried CrowdStrike asset telemetry for package `xz` across 1,240 Linux hosts and AWS ECR container layers. Zero instances of compromised `5.6.0` or `5.6.1` libraries were found (all production RHEL/Debian systems running verified safe versions `5.2.5` / `5.4.1`). Exported clean vulnerability attestation report (`CVE-XZ-Utils-Audit.pdf`) to CISO office.',
    priority: TicketPriority.HIGH,
  },
  {
    group: 'SecOps (Cyber Security & Governance)',
    subqueue: 'Proactive Notification',
    title: 'SIEM Splunk Indexer Queue Backpressure from SSH Dictionary Attack',
    description: 'Splunk automated monitoring alert: Indexer pool `idx-pool-eu` aggregation queue reached 95% capacity. Root cause traced to massive burst of `sshd` Failed Password syslog events originating from external IP subnet `185.220.101.0/24`.',
    resolutionSummary: 'Verified brute-force SSH dictionary attack hitting external SFTP gateway `sftp.client-enterprise.com` (over 45,000 failed login attempts per minute). Updated Cloudflare Magic Transit rate-limiting firewall rules and added an immediate BGP Null-Route / IP Blocklist entry on edge Palo Alto firewalls for ASN `AS62041` / subnet `185.220.101.0/24`. Syslog ingestion rate dropped back to normal baseline (<800 EPS).',
    priority: TicketPriority.URGENT || TicketPriority.HIGH,
  },
  {
    group: 'SecOps (Cyber Security & Governance)',
    subqueue: 'Proactive Notification',
    title: 'AWS GuardDuty High-Severity Alert: IAM Role Unauthorized API Access Attempt',
    description: 'GuardDuty proactive threat alert triggered: IAM Role `arn:aws:iam::123456789012:role/ci-cd-deployer` invoked `iam:CreateAccessKey` from unrecognized IP address `198.51.100.45` outside corporate VPN CIDR.',
    resolutionSummary: 'Executed immediate containment incident response runbook. Revoked active session tokens (`RevokeRoleSessions`) for `ci-cd-deployer` IAM role and quarantined attached EC2 runner instance. Investigated CloudTrail logs and discovered leaked temporary AWS STS credentials inside a developer\'s local `.env` file uploaded to a public Git branch. Re-issued rotated credentials, scrubbed Git repository history using `git-filter-repo`, and enabled mandatory AWS IAM Access Analyzer secret scanning rules.',
    priority: TicketPriority.URGENT || TicketPriority.HIGH,
  },
  {
    group: 'SecOps (Cyber Security & Governance)',
    subqueue: 'Report',
    title: 'Weekly SOC SIEM Security Incident & Threat Hunting Summary Report',
    description: 'Scheduled weekly automated report summarizing SOC Tier-1 triage volume, false-positive ratios, quarantined malware hashes, and top 10 blocked firewall intrusion prevention (IPS) signatures.',
    resolutionSummary: 'Generated automated weekly threat intelligence digest from Splunk ES and Palo Alto Cortex XSOAR. SOC analysts investigated 312 security alerts this week (98.4% false positives or automated scanner noise; 5 confirmed phishing attempts successfully contained at email gateway). Report distributed to security compliance committee.',
    priority: TicketPriority.LOW,
  },
  {
    group: 'SecOps (Cyber Security & Governance)',
    subqueue: 'Report',
    title: 'Monthly Quarterly PCI-DSS & ISO 27001 Access Control Compliance Audit',
    description: 'Generation of mandatory compliance audit matrices checking privileged user access reviews, inactive account terminations, and multi-factor authentication enrollment across production environments.',
    resolutionSummary: 'Ran automated compliance auditing scripts querying Azure AD Graph API and AWS IAM Credential Reports. Confirmed 100% MFA compliance across all 142 administrative user accounts. Identified 3 contractors with expired contracts whose accounts had already been disabled. Attached verified compliance attestation matrix.',
    priority: TicketPriority.LOW,
  },
  {
    group: 'SecOps (Cyber Security & Governance)',
    subqueue: 'Information',
    title: 'Inquiry Regarding Permissible Cipher Suites for External API Gateway TLS 1.3',
    description: 'Mobile app development team requesting official approved cipher list for TLS 1.3 endpoints to ensure compliance with upcoming iOS App Store security mandates.',
    resolutionSummary: 'Provided official SecOps Cryptographic Standard specification v4.2. For all external production API Gateways, TLS 1.3 MUST be enabled using only the following forward-secrecy cipher suites: `TLS_AES_256_GCM_SHA384`, `TLS_CHACHA20_POLY1305_SHA256`, and `TLS_AES_128_GCM_SHA256`. TLS 1.0 and 1.1 are strictly prohibited.',
    priority: TicketPriority.LOW,
  },
  {
    group: 'SecOps (Cyber Security & Governance)',
    subqueue: 'Information',
    title: 'Clarification on Approved Data Masking Standards for Non-Prod Database Dumps',
    description: 'QA engineering inquiring about required PII data obfuscation algorithms when sanitizing production PostgreSQL snapshots for lower staging and dev testing environments.',
    resolutionSummary: 'Instructed QA team to utilize official enterprise masking pipeline `pg_anonymize` script. All customer PII fields (`email`, `phone_number`, `social_security_num`, `credit_card_pan`) MUST be replaced using deterministic SHA-256 salted hashing or synthetic format-preserving encryption (FPE) Faker libraries prior to export outside production VPC subnet.',
    priority: TicketPriority.LOW,
  },
  {
    group: 'SecOps (Cyber Security & Governance)',
    subqueue: 'Notification (Domain/Renewal)',
    title: 'Annual Renewal of Wildcard TLS/SSL Certificate for *.client-enterprise.com',
    description: 'PKI Certificate authority automated alert: DigiCert OV Wildcard TLS certificate `SN: 04E2A19B...` expires in 30 days. Renewal required across AWS CloudFront, ALB, and F5 BIG-IP load balancers.',
    resolutionSummary: 'Generated new 4096-bit RSA Private Key and Certificate Signing Request (CSR). Completed domain validation via DNS TXT record challenge (`_dnsauth.client-enterprise.com`). Imported renewed DigiCert certificate (`valid 2026-2027`) into AWS Certificate Manager (ACM) and F5 BIG-IP Keystore. Performed zero-downtime listener update across all 18 production load balancers and verified SSL Labs `A+` rating.',
    priority: TicketPriority.MEDIUM,
  },
  {
    group: 'SecOps (Cyber Security & Governance)',
    subqueue: 'Notification (Domain/Renewal)',
    title: 'Annual Domain Name Registration Renewal for Defensive Brand Protection Domains',
    description: 'MarkMonitor domain asset renewal notification: 14 defensive corporate domain registrations (e.g., `client-enterprise-support.net`, `cliententerprisepay.org`) set to expire next month.',
    resolutionSummary: 'Reviewed defensive domain portfolio with Legal & Brand Governance team. Approved annual renewal invoice `MM-2026-9912` for all 14 defensive domain names. Confirmed registrar lock (`clientTransferProhibited`) and DNSSEC signing keys are active across all domain profiles.',
    priority: TicketPriority.MEDIUM,
  },
  {
    group: 'SecOps (Cyber Security & Governance)',
    subqueue: 'Junk (Advertisement)',
    title: 'Spam: Revolutionary AI-Powered Autonomous Cyber Penetration Testing SaaS',
    description: 'Marketing email from `info@autonomous-ai-pentesting-solutions.io` promising automated zero-day vulnerability discovery using quantum neural networks.',
    resolutionSummary: 'Unsolicited promotional vendor pitch intercepted by support desk inbox. Classified under Junk/Advertisement queue and purged.',
    priority: TicketPriority.LOW,
  },
  {
    group: 'SecOps (Cyber Security & Governance)',
    subqueue: 'Junk (Advertisement)',
    title: 'Advertisement: Invitation to Cyber Security Leadership Networking Dinner & Wine Tasting',
    description: 'Promotional invitation targeting CISO and SecOps managers for a vendor-sponsored sales dinner at local steakhouse.',
    resolutionSummary: 'Non-technical promotional invitation. Categorized as junk/advertisement and closed.',
    priority: TicketPriority.LOW,
  },

  // ============================================================================
  // GROUP 3: Database & Middleware Management
  // ============================================================================
  {
    group: 'Database & Middleware Management',
    subqueue: 'Incident',
    title: 'PostgreSQL Production Cluster Deadlocks & shared_buffers Memory Exhaustion',
    description: 'Main billing PostgreSQL 16 cluster (`pg-billing-master`) throwing continuous `FATAL: out of memory` and `ERROR: deadlock detected` during peak morning transaction burst. Active connection pool saturated at 500/500.',
    resolutionSummary: 'Connected via `psql` superuser shell and executed `SELECT pid, state, query FROM pg_stat_activity WHERE state = \'active\';`. Discovered unindexed foreign key cascading delete queries generated by the invoice archiving job locking `invoices_line_items` table. Terminated blocking PIDs (`pg_terminate_backend`), added concurrent B-Tree indexes on `invoice_id` (`CREATE INDEX CONCURRENTLY idx_line_items_inv_id ON invoices_line_items(invoice_id)`), and tuned `shared_buffers` from 16GB to 32GB on the 128GB RAM physical host. Database queries normalized to <12ms.',
    priority: TicketPriority.URGENT || TicketPriority.HIGH,
  },
  {
    group: 'Database & Middleware Management',
    subqueue: 'Incident',
    title: 'Redis Cluster Shard Rebalancing Failure & MOVED Redirection Loop',
    description: 'Caching microservices failing with continuous `JedisMovedDataException: MOVED 12450 10.20.30.41:6379`. Application throughput dropped 60% due to cache misses during cluster resharding.',
    resolutionSummary: 'Inspected Redis Cluster nodes via `redis-cli -c -p 6379 cluster nodes`. Found hash slots `12000-13000` stuck in `MIGRATING` state due to a network timeout during an automated cluster scaling operation. Executed `redis-cli --cluster fix 10.20.30.41:6379` to force complete hash slot ownership synchronization across master and replica nodes. Cleared client connection pool caches and confirmed zero `MOVED` redirection exceptions across all 6 Redis shards.',
    priority: TicketPriority.HIGH,
  },
  {
    group: 'Database & Middleware Management',
    subqueue: 'Service Request',
    title: 'Provision MongoDB 7.0 Sharded Cluster for New Analytics Microservice',
    description: 'Data analytics team requests a 3-node replica set config server cluster plus 2 query routers (`mongos`) and 2 sharded data nodes for high-throughput event storage (`mongodb-analytics-prod`).',
    resolutionSummary: 'Deployed MongoDB Enterprise 7.0 architecture across dedicated AWS EC2 `r6i.2xlarge` instances using Ansible automation. Configured 3-node Config Server Replica Set (`cfg-rs0`), initialized 2 `mongos` routing routers with TLS 1.3 certificate binding, and provisioned two 3-node Shard Replica Sets (`shard01-rs`, `shard02-rs`). Enabled hashed sharding (`sh.shardCollection("analytics_db.events", { "tenant_id": "hashed" })`) and verified balance across both shards.',
    priority: TicketPriority.MEDIUM,
  },
  {
    group: 'Database & Middleware Management',
    subqueue: 'Service Request',
    title: 'Kafka Topic Partition Expansion & Consumer Group Lag Optimization',
    description: 'High-volume telemetry ingestion topic `telemetry-events-v1` experiencing severe lag (`450,000+ unconsumed messages`). Need to expand topic partitions from 12 to 24 and tune Kafka broker segment parameters.',
    resolutionSummary: 'Executed `kafka-topics.sh --bootstrap-server kafka-cluster.internal:9092 --alter --topic telemetry-events-v1 --partitions 24` during low-traffic window. Coordinated with application engineering to scale out consumer group instances from 12 to 24 pods in Kubernetes. Adjusted `log.segment.bytes` and `log.retention.hours=72` on the brokers. Consumer group lag drained to zero within 8 minutes of scaling.',
    priority: TicketPriority.MEDIUM,
  },
  {
    group: 'Database & Middleware Management',
    subqueue: 'Proactive Notification',
    title: 'PostgreSQL Autovacuum Wraparound & Dead Tuple Bloat Threshold Alert',
    description: 'Datadog proactive database monitoring alert: Table `public.user_activity_logs` has accumulated over 14,500,000 dead tuples (`n_dead_tup`) and autovacuum worker is struggling to complete cleanup.',
    resolutionSummary: 'Connected to `pg-prod-master` and inspected table bloat statistics. Autovacuum was being cancelled repeatedly due to long-running analytical queries holding `AccessShareLock`. Terminated lingering reporting query (`PID 88219` running >4 hours) and triggered manual aggressive maintenance: `VACUUM (VERBOSE, ANALYZE) public.user_activity_logs;`. Tuned table-level autovacuum settings (`autovacuum_vacuum_scale_factor = 0.02`, `autovacuum_vacuum_cost_limit = 2000`) to ensure continuous background cleanup without wraparound risk.',
    priority: TicketPriority.URGENT || TicketPriority.HIGH,
  },
  {
    group: 'Database & Middleware Management',
    subqueue: 'Proactive Notification',
    title: 'Oracle RAC Cache Fusion Interconnect Latency Anomaly Alert',
    description: 'Oracle Enterprise Manager (OEM) alert: Global Cache Block Transfer latency between Oracle RAC Node 1 (`ora-db-01`) and Node 2 (`ora-db-02`) exceeded 18ms (baseline 1.2ms) via Private InfiniBand interconnect.',
    resolutionSummary: 'Investigated Oracle RAC private interconnect switch `ib-switch-01`. Discovered packet buffer overflows on InfiniBand port 8 connecting Node 2. Traced to a misconfigured Jumbo Frame MTU mismatch (Node 1 MTU 9000 vs Node 2 interface `ib0` accidentally reset to MTU 1500 after OS patch reboot). Corrected interface configuration on Node 2 (`ip link set ib0 mtu 9000`) and restarted Oracle Grid Interconnect daemon. Cache fusion latency dropped back to 0.9ms.',
    priority: TicketPriority.HIGH,
  },
  {
    group: 'Database & Middleware Management',
    subqueue: 'Report',
    title: 'Monthly Database Storage Growth & Backup Validation Audit Matrix',
    description: 'Scheduled monthly audit report summarizing storage footprint growth rate across PostgreSQL, MongoDB, and Oracle instances, alongside verification of automated nightly backup point-in-time recovery (PITR) tests.',
    resolutionSummary: 'Compiled storage consumption metrics from RDS and on-prem storage arrays. Total database footprint stands at 48.6TB (+3.4% month-over-month growth). Executed automated restore verification job `pitr-restore-test-job-881` in staging; verified complete data integrity and schema consistency across all restored databases. Attached full report.',
    priority: TicketPriority.LOW,
  },
  {
    group: 'Database & Middleware Management',
    subqueue: 'Report',
    title: 'Quarterly Middleware License & Instance Utilization Report (RabbitMQ & Kafka)',
    description: 'Quarterly review auditing deployed message broker instances, active queues, topic partition counts, and cluster resource utilization for RabbitMQ and Apache Kafka environments.',
    resolutionSummary: 'Extracted cluster metrics via Prometheus and Grafana dashboards. Kafka cluster `kafka-prod-01` averages 42,000 messages/sec with 82% disk throughput efficiency. RabbitMQ cluster `rmq-core-01` maintains 140 active queues with zero dropped messages. Attached complete capacity report.',
    priority: TicketPriority.LOW,
  },
  {
    group: 'Database & Middleware Management',
    subqueue: 'Information',
    title: 'Query Regarding PostgreSQL 16 `pg_stat_statements` Query Normalization Rules',
    description: 'Backend engineering asking how `pg_stat_statements` aggregates parameterized prepared statements vs dynamic SQL strings when monitoring slow query latency in production.',
    resolutionSummary: 'Provided technical briefing on PostgreSQL `pg_stat_statements` internal normalization behavior. Constant literals (`WHERE user_id = 10` vs `WHERE user_id = 99`) are automatically replaced with `$1` parameter tokens so different executions of the same logical query are aggregated under a single `queryid`. Advised developers to use ORM parameterized queries (`$1, $2`) to prevent shared cache eviction.',
    priority: TicketPriority.LOW,
  },
  {
    group: 'Database & Middleware Management',
    subqueue: 'Information',
    title: 'Inquiry: Best Practices for MongoDB Indexing on Nested Array Documents',
    description: 'Application developers querying whether multikey B-Tree indexes or wildcard indexes are recommended when querying nested `tags` and `attributes.properties` array structures.',
    resolutionSummary: 'Advised application team that Multikey Indexes (`{ "tags": 1 }`) should be created when querying exact array values, but warned that compounding two multikey fields (`{ "tags": 1, "categories": 1 }`) is disallowed by MongoDB engine restrictions. Recommended using Wildcard Indexes (`{ "attributes.properties.$**": 1 }`) only for dynamic user-defined attribute fields to avoid excessive RAM index footprint.',
    priority: TicketPriority.LOW,
  },
  {
    group: 'Database & Middleware Management',
    subqueue: 'Notification (Domain/Renewal)',
    title: 'Annual Enterprise Support & Licensing Renewal for Percona PostgreSQL Distribution',
    description: 'Licensing alert: Percona Platinum 24x7 Enterprise Database Support Contract (`PER-2025-PG-1100`) covering 34 PostgreSQL production cores expires next month.',
    resolutionSummary: 'Coordinated with IT Procurement and Database Architecture leadership. Verified active core deployment counts match licensed tiers. Processed purchase order `PO-440192` renewing Percona Platinum 24x7 support through 2027.',
    priority: TicketPriority.MEDIUM,
  },
  {
    group: 'Database & Middleware Management',
    subqueue: 'Notification (Domain/Renewal)',
    title: 'Annual Renewal of Confluent Cloud Kafka Enterprise Dedicated Cluster Subscription',
    description: 'Confluent Cloud notification: Dedicated Kafka cluster `lkc-prod-aws-east` annual commit tier (250 MB/s ingress / 750 MB/s egress) up for annual renewal review.',
    resolutionSummary: 'Analyzed past 12 months of telemetry ingress/egress usage in Confluent Cloud console. Peak ingress averaged 185 MB/s. Re-certified current 250 MB/s dedicated cluster commit contract (`CC-RENEW-8812`) and approved annual renewal billing invoice.',
    priority: TicketPriority.MEDIUM,
  },
  {
    group: 'Database & Middleware Management',
    subqueue: 'Junk (Advertisement)',
    title: 'Promotional Offer: Next-Gen Autonomous AI Database Tuning Tool (Zero DBA Required)',
    description: 'Sales advertisement from `marketing@autodb-ai-optimizer.com` pitching AI DBA replacement software with 10x instant query speedup guarantees.',
    resolutionSummary: 'Unsolicited software vendor marketing campaign. Tagged as junk/advertisement and removed.',
    priority: TicketPriority.LOW,
  },
  {
    group: 'Database & Middleware Management',
    subqueue: 'Junk (Advertisement)',
    title: 'Spam: Discounted Remote Oracle & SQL Server Database Administration Consulting',
    description: 'Cold outreach from boutique offshore consulting firm offering hourly SQL Server performance tuning services.',
    resolutionSummary: 'External vendor solicitation. Categorized under junk routing rules and closed.',
    priority: TicketPriority.LOW,
  },

  // ============================================================================
  // GROUP 4: DevOps & Cloud Automation
  // ============================================================================
  {
    group: 'DevOps & Cloud Automation',
    subqueue: 'Incident',
    title: 'Kubernetes Pod CrashLoopBackOff & OOMKilled Exception on Auth Microservice v2.4',
    description: 'Production EKS cluster `eks-prod-eu-west` deployment `auth-service-v2` experiencing continuous CrashLoopBackOff after deploying release `v2.4.1`. `kubectl get pods` indicates exit code 137 (`OOMKilled`).',
    resolutionSummary: 'Executed `kubectl logs -l app=auth-service --previous --tail=200` and `kubectl describe pod`. Discovered a memory leak inside a newly introduced Redis session caching middleware where connection listeners were not deregistered on error, causing heap consumption to exceed the configured container memory limit (`resources.limits.memory: 512Mi`). Immediately rolled back deployment to stable image `v2.4.0` via `helm rollback auth-service 14`, temporarily bumped memory limits to `1024Mi`, and dispatched detailed memory heap dump (`/heap-dumps/auth-v241.heapsnapshot`) to backend engineering team.',
    priority: TicketPriority.URGENT || TicketPriority.HIGH,
  },
  {
    group: 'DevOps & Cloud Automation',
    subqueue: 'Incident',
    title: 'Terraform State Lock Stuck in AWS DynamoDB Table tf-state-locks',
    description: 'CI/CD GitHub Actions deployment pipeline `deploy-infrastructure.yml` failing across all production environments with error `Error acquiring the state lock: ConditionalCheckFailedException in DynamoDB table tf-state-locks`.',
    resolutionSummary: 'Investigated the failed GitHub Actions runner `job-ID 8812401` which had timed out and terminated abruptly mid-apply due to a network runner disconnect, leaving the lock entry orphaned inside DynamoDB table `tf-state-locks`. Verified via AWS console (`LockID: prod/terraform.tfstate-md5`) that no other Terraform processes were actively running. Executed `terraform force-unlock 8e4b102a-9921-4a1c-8b22-10293847561` locally with verified admin AWS IAM role. Pipeline triggered clean re-run and applied infrastructure state successfully.',
    priority: TicketPriority.HIGH,
  },
  {
    group: 'DevOps & Cloud Automation',
    subqueue: 'Service Request',
    title: 'Provision AWS EKS Kubernetes Node Group with NVIDIA A10G GPU Support for AI Workers',
    description: 'AI/ML data science team requests creation of a new specialized EKS managed node group (`ng-gpu-ai-workers`) containing 4x `g5.2xlarge` instances with NVIDIA Container Toolkit drivers for embedding generation.',
    resolutionSummary: 'Modified `terraform/aws-eks/node_groups.tf` to define a new managed node group `ng-gpu-ai-workers` using AMI type `AL2_x86_64_GPU` (`instance_types = ["g5.2xlarge"]`, `desired_size = 4`, `max_size = 8`). Added Kubernetes node taint `nvidia.com/gpu=true:NoSchedule` to prevent general microservices from scheduling on GPU hardware. Applied Terraform plan (`terraform apply -auto-approve`), verified instances joined the cluster (`kubectl get nodes -l eks.amazonaws.com/nodegroup=ng-gpu-ai-workers`), and deployed official NVIDIA Device Plugin DaemonSet (`nvdp/nvidia-device-plugin:v0.14.1`). Confirmed GPU allocation via `kubectl describe node | grep nvidia.com/gpu`.',
    priority: TicketPriority.MEDIUM,
  },
  {
    group: 'DevOps & Cloud Automation',
    subqueue: 'Service Request',
    title: 'GitLab CI/CD Runner Docker-in-Docker (DinD) Cache Migration to AWS S3 MinIO Object Storage',
    description: 'Shared CI/CD runner local EBS volume (`/var/lib/docker`) running out of disk space (`98% full`) due to accumulated layer caches. Need to configure distributed S3 cache driver and prune local volumes.',
    resolutionSummary: 'Updated `/etc/gitlab-runner/config.toml` across all 8 dedicated build runners. Configured `[runners.cache]` block to utilize our internal MinIO S3 object storage bucket `s3://gitlab-runner-distributed-cache` with AWS IAM instance profile authentication. Executed `docker system prune -a --volumes --force` on all build runners to reclaim 480GB of local NVMe storage. Verified next CI build run cleanly downloaded and uploaded distributed cache artifacts from S3 with zero local disk saturation.',
    priority: TicketPriority.MEDIUM,
  },
  {
    group: 'DevOps & Cloud Automation',
    subqueue: 'Proactive Notification',
    title: 'AWS EKS Cluster Istio Service Mesh mTLS Handshake Timeout & Circuit Breaker Trip',
    description: 'Prometheus Alerting rule `IstioHigh5xxRate` fired for namespace `payments-prod`. Sidecar Envoy proxies (`envoy-proxy`) logging `503 Service Unavailable (upstream_reset_before_response_started{connection_termination})` on internal gRPC calls.',
    resolutionSummary: 'Traced the Envoy proxy connection termination to an expired internal SPIFFE identity certificate issued by the Istio `istiod` control plane (`CERTIFICATE_VERIFY_FAILED`). The root CA certificate in namespace `istio-system` had reached its 1-year rotation boundary and `istiod` pods failed to reload the new secret cleanly. Restarted `istiod` deployment (`kubectl rollout restart deployment/istiod -n istio-system`) followed by a rolling restart of all application workloads in `payments-prod` namespace to force sidecars to fetch fresh mTLS certificates. Inter-pod gRPC handshakes normalized immediately.',
    priority: TicketPriority.URGENT || TicketPriority.HIGH,
  },
  {
    group: 'DevOps & Cloud Automation',
    subqueue: 'Proactive Notification',
    title: 'AWS NAT Gateway Port Allocation Exhaustion & SNAT Packet Drop Alert',
    description: 'CloudWatch alarm `NATGatewayPortAllocationExceeded` triggered: Public NAT Gateway `nat-04a8b9c123d4e5f60` in AZ `us-east-1a` exceeded 60,000 active concurrent connections, causing outbound SNAT packet drops for private subnets.',
    resolutionSummary: 'Analyzed VPC Flow Logs using Athena query `SELECT srcaddr, dstaddr, count(*) FROM vpc_flow_logs WHERE gateway_id = \'nat-04a...\' GROUP BY srcaddr, dstaddr ORDER BY count(*) DESC LIMIT 20;`. Discovered a newly deployed web scraper worker pod inside private subnet `subnet-priv-1a` opening thousands of unclosed HTTP connections per minute to external domain `api.external-vendor.com`. Coordinated with app team to fix connection pooling in scraper service. In parallel, provisioned a second NAT Gateway in `us-east-1b` and updated VPC route tables to split private subnet egress traffic across multiple NAT endpoints.',
    priority: TicketPriority.HIGH,
  },
  {
    group: 'DevOps & Cloud Automation',
    subqueue: 'Report',
    title: 'Monthly Cloud Infrastructure FinOps & AWS EC2 Spot Savings Optimization Report',
    description: 'Automated monthly financial engineering report detailing AWS cloud spend, EC2/EKS compute reservation utilization ratios, Spot instance savings, and unattached EBS volume waste across all AWS accounts.',
    resolutionSummary: 'Aggregated AWS Cost Explorer and CloudHealth telemetry data for May 2026. Total cloud spend reached $142,500. Spot instance utilization across non-prod EKS clusters generated $34,200 in net savings compared to On-Demand rates. Identified 18 unattached EBS gp3 volumes (`$410/month waste`) and 4 idle NAT Gateways (`$130/month per gateway`). Attached detailed breakdown report and submitted Jira tickets for resource termination.',
    priority: TicketPriority.LOW,
  },
  {
    group: 'DevOps & Cloud Automation',
    subqueue: 'Report',
    title: 'Quarterly CI/CD Pipeline Build Duration & Runner Efficiency Metric Audit',
    description: 'Quarterly analysis report tracking average build duration, unit test execution times, Docker layer caching efficiency, and build queue wait times across all GitHub Actions and GitLab CI/CD pipelines.',
    resolutionSummary: 'Compiled telemetry from GitHub API and GitLab Runner telemetry exporters. Average pull request build duration improved from 14.2 minutes down to 8.4 minutes following the adoption of distributed S3 caching and self-hosted 8-core runners. Attached comprehensive metrics matrix (`CI_Performance_Q2_2026.pdf`).',
    priority: TicketPriority.LOW,
  },
  {
    group: 'DevOps & Cloud Automation',
    subqueue: 'Information',
    title: 'Inquiry Regarding Best Practices for Helm v3 Chart Multi-Environment Value Overrides',
    description: 'Software engineering team querying how to properly structure `values.yaml` hierarchy across `dev`, `staging`, and `production` namespaces without duplicating common configuration blocks.',
    resolutionSummary: 'Provided standard DevOps GitOps architectural guidelines. Recommended maintaining a base `values.yaml` containing universal defaults, and environment-specific override files (`values.dev.yaml`, `values.prod.yaml`) inside the `helm/environments/` folder. For secrets and dynamic endpoints, instructed developers to reference Kubernetes `ExternalSecret` custom resources backed by AWS Secrets Manager (`ClusterSecretStore`) rather than hardcoding values in Git.',
    priority: TicketPriority.LOW,
  },
  {
    group: 'DevOps & Cloud Automation',
    subqueue: 'Information',
    title: 'Clarification on ArgoCD App-of-Apps Pattern for Automated Cluster Syncing',
    description: 'Platform engineers asking whether ArgoCD sync waves (`argocd.argoproj.io/sync-wave`) are supported when deploying nested Application custom resources inside our `gitops-cluster-config` repo.',
    resolutionSummary: 'Confirmed that ArgoCD fully supports `sync-wave` annotations (`-5` through `5`) within the App-of-Apps architectural pattern. Advised team to place foundational infrastructure (cert-manager, istio, external-dns) on sync waves `-5` to `-1`, monitoring stack on wave `0`, and user-facing microservices on waves `1` to `5` to guarantee proper dependency bootstrapping during automated cluster disaster recovery rehydration.',
    priority: TicketPriority.LOW,
  },
  {
    group: 'DevOps & Cloud Automation',
    subqueue: 'Notification (Domain/Renewal)',
    title: 'Annual Renewal of Terraform Cloud / HashiCorp Enterprise Organization Subscription',
    description: 'HashiCorp licensing notification: Terraform Cloud Business tier organization `client-enterprise-cloud` (covering 150 active workspace deployments and concurrent run concurrency of 10) expires next month.',
    resolutionSummary: 'Coordinated with Cloud Architecture Director and IT Procurement. Confirmed active workspace utilization sits at 134 workspaces with daily deployment volume requiring the 10x concurrent run slots. Approved purchase order `PO-TF-2026-991` for annual renewal of HashiCorp Terraform Cloud Business tier through 2027.',
    priority: TicketPriority.MEDIUM,
  },
  {
    group: 'DevOps & Cloud Automation',
    subqueue: 'Notification (Domain/Renewal)',
    title: 'Annual GitHub Enterprise Cloud Seat License Audit & Renewal Notification',
    description: 'GitHub Enterprise billing notification: Annual seat license contract covering 450 developer seats across organization `github.com/client-enterprise` up for true-up renewal.',
    resolutionSummary: 'Ran automated GitHub Enterprise audit script querying user activity over the past 90 days. Deactivated 28 dormant accounts belonging to departed contractors and interns. Re-certified required seat count at 425 active developers and approved annual GitHub Enterprise renewal contract (`GHE-INV-88210`).',
    priority: TicketPriority.MEDIUM,
  },
  {
    group: 'DevOps & Cloud Automation',
    subqueue: 'Junk (Advertisement)',
    title: 'Promotional Offer: Zero-Code Autonomous Kubernetes Cost Reduction SaaS Platform',
    description: 'Unsolicited sales pitch from `hello@k8s-cost-slasher-ai.com` offering instant 70% AWS EKS bill reduction using autonomous pod packing algorithms.',
    resolutionSummary: 'External vendor marketing solicitation. Categorized under Junk/Advertisement routing rules and closed.',
    priority: TicketPriority.LOW,
  },
  {
    group: 'DevOps & Cloud Automation',
    subqueue: 'Junk (Advertisement)',
    title: 'Cold Outreach: Offshore Cloud Migration & Terraform Automation Engineering Services',
    description: 'Sales outreach offering outsourced cloud migration and DevOps hourly consulting resources.',
    resolutionSummary: 'Unsolicited B2B sales advertisement. Tagged as spam and closed without action.',
    priority: TicketPriority.LOW,
  },

  // ============================================================================
  // GROUP 5: IoT & Edge Engineering
  // ============================================================================
  {
    group: 'IoT & Edge Engineering',
    subqueue: 'Incident',
    title: 'ESP32 Edge Microcontroller freeRTOS Queue Buffer Overflow on Sensor Burst',
    description: 'Smart factory vibration telemetry sensors (`ESP32-S3` devices running custom firmware `v3.1.0`) randomly resetting every 4 hours. Serial UART logs show `Guru Meditation Error: Core 1 panic\'ed (LoadProhibited)` during high-frequency accelerometer burst sampling.',
    resolutionSummary: 'Analyzed JTAG stack trace and `sdkconfig` memory allocation. Discovered that the freeRTOS sensor telemetry queue `xQueueCreate(16, sizeof(VibrationPacket))` was sized too small for 1000Hz accelerometer burst frames, leading to queue saturation and wild pointer dereference when ISR task (`vTaskSensorISR`) forced task yield (`xQueueSendFromISR`). Increased queue depth from `16` to `64` slots (`xQueueCreate(64, sizeof(VibrationPacket))`), allocated packet buffers in external SPIRAM (`MALLOC_CAP_SPIRAM`), and compiled/flashed OTA firmware `v3.1.2`. All 120 factory edge microcontrollers maintained zero resets across 72+ hour stress test.',
    priority: TicketPriority.URGENT || TicketPriority.HIGH,
  },
  {
    group: 'IoT & Edge Engineering',
    subqueue: 'Incident',
    title: 'LoRaWAN Edge Gateway Packet Loss & LoRa Packet Forwarder Daemon Crash',
    description: 'Agricultural field monitoring gateway `gw-lora-north-02` (Multitech Conduit running Yocto Linux) stopped forwarding sensor payloads to AWS IoT Core. Local syslog shows `lora-pkt-fwd` systemd service crashed with `ERROR: [main] failed to start the concentrator`.',
    resolutionSummary: 'Connected to edge gateway via cellular out-of-band SSH. Checked Semtech SX1301 concentrator chip SPI bus communication (`dmesg | grep spi`). Discovered SPI clock desynchronization caused by a brownout power glitch during severe weather. Power-cycled the internal PCIe concentrator module via GPIO reset pin (`echo 19 > /sys/class/gpio/export && echo out > .../direction && echo 1 > .../value`), updated `global_conf.json` clock skew tolerance, and restarted `lora-pkt-fwd.service`. Sensor telemetry packet forwarding resumed immediately across all 8 LoRa channels.',
    priority: TicketPriority.HIGH,
  },
  {
    group: 'IoT & Edge Engineering',
    subqueue: 'Service Request',
    title: 'Provision X.509 Mutual TLS (mTLS) Certificates for 500 New ESP32-C6 Edge Gateways',
    description: 'Hardware manufacturing engineering team requires production X.509 device certificates generated from our AWS IoT Core Device CA and flashed via secure factory provisioning tool onto 500 new ESP32-C6 smart HVAC controllers.',
    resolutionSummary: 'Executed automated PKI provisioning script `bulk_provision_iot_certs.py` interfacing with AWS IoT Core Certificate Authority (`arn:aws:iot:us-east-1:123456789012:cacert/...`). Generated 500 unique 2048-bit RSA private keys, device certificates (`Cert ID: iot-hvac-2026-0001` through `0500`), and attached restrictive AWS IoT policy `IoTHVACEdgeDevicePolicy` permitting `iot:Connect` and `iot:Publish` strictly to `hvac/telemetry/${iot:Connection.Thing.ThingName}`. Exported encrypted NVS binary flash partition images (`nvs_keys.bin`) and delivered securely to manufacturing flashing station.',
    priority: TicketPriority.MEDIUM,
  },
  {
    group: 'IoT & Edge Engineering',
    subqueue: 'Service Request',
    title: 'Configure Modbus TCP to MQTT Bridge Firmware for Siemens S7-1200 Industrial PLCs',
    description: 'Industrial automation team requests configuration of Edge Gateway `egw-plant-01` to poll holding registers (`40001-40050`) from four Siemens S7-1200 PLCs via Modbus TCP and publish structured JSON payloads to MQTT broker (`tls://mqtt.iot.internal:8883`).',
    resolutionSummary: 'Installed and configured `Telegraf` edge agent with `inputs.modbus` and `outputs.mqtt` plugins on Industrial Edge Gateway `egw-plant-01`. Configured slave IDs (`101-104`), polled holding registers (`40001: temperature`, `40002: pressure`, `40003: flow_rate`), set sampling interval to `1000ms`, and configured SSL/TLS client certificate authentication pointing to `tls://mqtt.iot.internal:8883` on topic `plant1/lineA/telemetry`. Verified data ingestion inside Grafana IoT monitoring dashboard.',
    priority: TicketPriority.MEDIUM,
  },
  {
    group: 'IoT & Edge Engineering',
    subqueue: 'Proactive Notification',
    title: 'AWS IoT Core MQTT Broker Disconnect Burst Alert: Keep-Alive Timeout Spikes',
    description: 'CloudWatch proactive IoT telemetry alarm triggered: Over 1,200 connected smart meter devices (`ThingType: SmartMeter-V2`) disconnected from AWS IoT Core within a 5-minute window with reason `CLIENT_ERROR_KEEPALIVE_TIMEOUT`.',
    resolutionSummary: 'Investigated cellular carrier NB-IoT / LTE-M gateway logs. Discovered that cellular provider Vodafone/AT&T initiated an unannounced carrier NAT timeout reduction on their NB-IoT APN (`apn.smartmeter.net`), dropping idle UDP/TCP sockets after 45 seconds while device firmware was configured with `MQTT Keep-Alive = 120 seconds`. Issued an emergency Over-The-Air (OTA) configuration shadow update reducing `mqtt_keep_alive_seconds` down to `30 seconds`. Devices automatically reconnected and maintained stable MQTT sessions across cellular towers.',
    priority: TicketPriority.URGENT || TicketPriority.HIGH,
  },
  {
    group: 'IoT & Edge Engineering',
    subqueue: 'Proactive Notification',
    title: 'Edge Gateway NVMe Storage Wear-Level & Flash Write Bloat Alert',
    description: 'Smart city edge video analytics controller `egw-video-central-04` reported SSD SMART telemetry warning: NVMe drive percentage used reached 88% due to excessive local log writes (`>150GB/day write amplification`).',
    resolutionSummary: 'Connected via SSH to edge Ubuntu Core gateway. Analyzed disk I/O writes (`iotop -o -a`) and discovered debug logging enabled inside the local OpenVINO AI object detection daemon (`openvino-detector.service`), writing raw uncompressed bounding box frame coordinates to local disk at 30 FPS. Modified `/etc/openvino/config.yaml` to set `log_level: ERROR`, mounted `/var/log/openvino` as a RAM-backed `tmpfs` volume (`size=512M`), and purged historical log files. Daily SSD write amplification dropped from 150GB to <1.2GB.',
    priority: TicketPriority.HIGH,
  },
  {
    group: 'IoT & Edge Engineering',
    subqueue: 'Report',
    title: 'Monthly IoT Edge Gateway Fleet Health & OTA Firmware Compliance Matrix',
    description: 'Scheduled monthly generation of fleet management report tracking active check-ins, battery voltage degradation curves, cellular SIM data consumption, and OTA firmware upgrade adoption across 14,500 deployed IoT devices.',
    resolutionSummary: 'Synthesized telemetry data from AWS IoT Device Management and cellular Jasper/Hologram APIs. 98.6% of devices are actively reporting (14,297 active, 203 offline/dormant). OTA firmware `v3.1.2` adoption reached 94.2% across active nodes. Average SIM cellular data usage sits at 4.2MB/month per device (well below 10MB tier cap). Attached fleet audit CSV.',
    priority: TicketPriority.LOW,
  },
  {
    group: 'IoT & Edge Engineering',
    subqueue: 'Report',
    title: 'Quarterly Industrial Sensor Calibration & Modbus Communication Reliability Audit',
    description: 'Quarterly compliance audit checking Modbus TCP communication packet loss rates, CRC error counters, and calibration timestamp compliance across 480 factory floor sensors.',
    resolutionSummary: 'Polled Modbus diagnostics registers across all 12 manufacturing lines. Packet success rate averaged 99.984%. Identified 3 pressure transducers (`PT-104`, `PT-209`, `PT-411`) on Line 4 exhibiting minor zero-point drift requiring physical re-calibration. Dispatched report to Plant Maintenance engineering.',
    priority: TicketPriority.LOW,
  },
  {
    group: 'IoT & Edge Engineering',
    subqueue: 'Information',
    title: 'Inquiry Regarding Power Consumption Specs & Sleep Mode Currents for ESP32-S3',
    description: 'Hardware design engineers querying exact deep-sleep current draw (uA) and RTC memory retention limits when using external 32.768kHz crystal oscillator versus internal RC oscillator.',
    resolutionSummary: 'Provided Espressif official hardware datasheet validation specifications. When using the external 32.768kHz crystal (`CONFIG_RTC_CLK_SRC_EXT_CRYS`), ESP32-S3 deep sleep current with RTC Fast Memory powered on is verified at `8.5 uA` (`vs 14.2 uA` using internal RC oscillator). Advised hardware team to ensure GPIO pull-ups/pull-downs (`rtc_gpio_isolate()`) are explicitly configured before entering `esp_deep_sleep_start()` to prevent floating pin leakage.',
    priority: TicketPriority.LOW,
  },
  {
    group: 'IoT & Edge Engineering',
    subqueue: 'Information',
    title: 'Specification Request for Industrial RS-485 Surge Protection & Grounding Topology',
    description: 'Field technicians requesting recommended wiring schematic for shield grounding and TVS diode placement on long-run (>500 meter) RS-485 Modbus serial drops.',
    resolutionSummary: 'Supplied standard Industrial RS-485 Installation Runbook (`ENG-SPEC-RS485-V2.pdf`). Emphasized that the RS-485 cable drain/shield wire MUST be connected to earth ground at ONE end only (typically the master gateway panel) to eliminate ground loop currents. Recommended installing external bidirectional TVS surge suppressor diodes (`P6KE6.8CA`) across D+/D- lines at every remote slave drop exceeding 100 meters.',
    priority: TicketPriority.LOW,
  },
  {
    group: 'IoT & Edge Engineering',
    subqueue: 'Notification (Domain/Renewal)',
    title: 'Annual Cellular SIM Card M2M Connectivity Pool Subscription Renewal (Hologram/Jasper)',
    description: 'Cellular IoT vendor alert: Pooled M2M cellular connectivity subscription covering 15,000 global SIM cards (`Plan: 10MB pooled global IoT tier`) up for annual contract renewal.',
    resolutionSummary: 'Evaluated cellular IoT data usage trends over the past year. Total fleet consumed an average of 62GB/month across the 15,000 SIM pool (`4.13MB/SIM average`). Re-signed annual enterprise connectivity contract with Hologram/Jasper (`Contract ID: HLG-2026-ENT-15K`) locking in discounted $0.65/SIM monthly rate through 2027.',
    priority: TicketPriority.MEDIUM,
  },
  {
    group: 'IoT & Edge Engineering',
    subqueue: 'Notification (Domain/Renewal)',
    title: 'AWS IoT Core Device Intermediate CA Certificate Expiration Warning',
    description: 'PKI lifecycle notification: The custom Intermediate CA Certificate (`cn=IoT-Edge-Intermediate-CA-01`) registered in AWS IoT Core used for signing factory device certificates expires on 2026-10-01.',
    resolutionSummary: 'Generated new Intermediate CA CSR (`cn=IoT-Edge-Intermediate-CA-02`) and signed via Offline Root CA HSM. Registered and verified the new Intermediate CA inside AWS IoT Core (`aws iot register-ca-certificate --ca-certificate ... --set-as-active`). Updated automated factory flashing stations (`bulk_provision_iot_certs.py`) to issue all new device credentials signed under `Intermediate-CA-02` while preserving legacy trust chains until 2027.',
    priority: TicketPriority.MEDIUM,
  },
  {
    group: 'IoT & Edge Engineering',
    subqueue: 'Junk (Advertisement)',
    title: 'Promotional Offer: Cheap Custom PCB Assembly & SMT Manufacturing Services in Shenzhen',
    description: 'Sales promotion from `pcba-sales@fast-smt-china.cn` offering 24-hour turnarounds on 4-layer and 6-layer custom IoT PCB prototypes.',
    resolutionSummary: 'Unsolicited hardware manufacturing solicitation. Categorized as junk/advertisement and purged from active queues.',
    priority: TicketPriority.LOW,
  },
  {
    group: 'IoT & Edge Engineering',
    subqueue: 'Junk (Advertisement)',
    title: 'Spam: Next-Gen Ultra-Long Range Industrial LoRa & Zigbee Wireless Modules',
    description: 'Cold outreach advertisement from electronic components distributor offering free sample kits of proprietary 915MHz wireless transceiver chips.',
    resolutionSummary: 'Unsolicited vendor promotional pitch. Closed under junk routing policies.',
    priority: TicketPriority.LOW,
  },

  // ============================================================================
  // GROUP 6: Application Platform Support
  // ============================================================================
  {
    group: 'Application Platform Support',
    subqueue: 'Incident',
    title: 'Spring Boot HikariCP Connection Pool Exhaustion on Customer Portal API',
    description: 'Customer Portal API (`spring-portal-api-prod`) throwing continuous `java.sql.SQLTransientConnectionException: HikariPool-1 - Connection is not available, request timed out after 30000ms`. HTTP 500 error rate spiked to 45%.',
    resolutionSummary: 'Enabled HikariCP leak detection (`spring.datasource.hikari.leak-detection-threshold=15000`) and inspected thread dump (`jstack -l <pid>`). Traced connection pool exhaustion (`maximum-pool-size=50`) to a newly deployed custom PDF invoice generator service that opened JDBC connections manually via `DataSourceUtils.getConnection()` without enclosing the release inside a `try-with-resources` or explicit `close()` finally block. Replaced manual JDBC calls with standard JPA/@Transactional Spring repository methods and scaled HikariCP maximum pool size to `75`. Connection leaks ceased immediately and HTTP 500 rate dropped to 0%.',
    priority: TicketPriority.URGENT || TicketPriority.HIGH,
  },
  {
    group: 'Application Platform Support',
    subqueue: 'Incident',
    title: 'Node.js Event Loop Lag Spiking Above 1500ms Due to Synchronous JSON Parsing',
    description: 'Order processing Node.js microservice (`order-processor-v3`) experiencing severe event loop blockage (`Event Loop Lag: 1640ms`). Health check endpoint `/healthz` timing out, causing Kubernetes liveness probes to kill and restart pods.',
    resolutionSummary: 'Captured CPU profiling flame graph using `clinic flame -- node server.js` inside staging. Identified a blocking synchronous operation inside the webhook payload handler: `JSON.parse(fs.readFileSync(\'/tmp/large_cached_catalog.json\'))` (`18MB JSON file parsed synchronously on every incoming checkout event`). Replaced synchronous file read and parse with asynchronous `fs.promises.readFile()` and integrated in-memory LRU caching (`lru-cache`) initialized once during startup. Event loop lag dropped to `<4ms` under 2,000 req/sec load.',
    priority: TicketPriority.HIGH,
  },
  {
    group: 'Application Platform Support',
    subqueue: 'Service Request',
    title: 'Deploy New React Next.js 14 SSR Application to Vercel/Enterprise EKS Cluster',
    description: 'Frontend engineering team requests production deployment of the new Next.js 14 App Router customer dashboard (`portal-nextjs-v2`) with Redis Session caching and CloudFront CDN integration.',
    resolutionSummary: 'Created Dockerfile multi-stage production build utilizing Next.js standalone output (`output: "standalone"` in `next.config.js`). Created Kubernetes Deployment, Service, and Horizontal Pod Autoscaler (`minReplicas: 3, maxReplicas: 12, cpuUtilization: 70%`) manifests in `k8s/portal-nextjs/`. Configured AWS CloudFront origin custom headers and Redis cluster secret binding (`REDIS_URL=redis://redis-cluster.internal:6379`). Executed deployment via ArgoCD pipeline; verified zero SSR hydration errors (`Prop className did not match`) across all device viewports.',
    priority: TicketPriority.MEDIUM,
  },
  {
    group: 'Application Platform Support',
    subqueue: 'Service Request',
    title: 'Configure GraphQL Apollo Federation Gateway Subgraph Schema Registry API Key',
    description: 'API team requests configuration of Apollo Studio Managed Federation schema checks and routing API keys for our 6 microservice subgraphs (`users`, `tickets`, `inventory`, `billing`, `analytics`, `auth`).',
    resolutionSummary: 'Generated Apollo Studio Enterprise API key (`service:client-enterprise-supergraph:X9a8B7...`) and injected into the Apollo Gateway deployment secret store (`apollo-gateway-secrets`). Updated Rover CLI CI/CD GitHub Actions workflows across all 6 subgraph repositories to execute `rover subgraph check` on pull requests and `rover subgraph publish` on merge to `main`. Confirmed clean supergraph composition and zero schema breaking changes across all active client queries.',
    priority: TicketPriority.MEDIUM,
  },
  {
    group: 'Application Platform Support',
    subqueue: 'Proactive Notification',
    title: 'Prometheus Alert: JVM Heap Memory Old Gen Space Usage Above 88% Threshold',
    description: 'Automated monitoring triggered PagerDuty warning: JVM Old Gen memory utilization on `payment-processing-srv-pod-3` reached 88.5% capacity after 6 days of continuous uptime (`Garbage collection GC overhead limit exceeded` warning approaching).',
    resolutionSummary: 'Generated automated heap dump via `jmap -dump:live,format=b,file=/tmp/heap.bin <pid>` before triggering graceful pod rollout restart. Analyzed heap dump in Eclipse MAT (Memory Analyzer Tool) and identified 4.2M orphaned `org.hibernate.internal.SessionImpl` objects held in strong references by a static `EventDispatcher` listener list (`memory leak in event registration`). Created Jira bug ticket `APP-8812` for developers to implement `WeakReference` listeners or explicit deregistration upon transaction completion.',
    priority: TicketPriority.HIGH,
  },
  {
    group: 'Application Platform Support',
    subqueue: 'Proactive Notification',
    title: 'Sentry Error Rate Anomaly: Uncaught TypeError in React Admin Dashboard UI',
    description: 'Sentry proactive anomaly detection alert: `TypeError: Cannot read properties of undefined (reading \'map\')` inside `TicketsTable.tsx` spiked over 350 times in 10 minutes following frontend release `v1.9.4`.',
    resolutionSummary: 'Investigated Sentry stack trace (`TicketsTable.tsx:L142`). The newly added `masterCategories` array prop was not initialized with a default fallback `[]` when the backend query `GET /master-config/categories` returned `undefined` during transient network delays. Pushed hotfix patch `v1.9.5` adding optional chaining (`categories?.map(...) || []`) and fallback empty arrays inside React component props. Error rate in Sentry dropped to zero.',
    priority: TicketPriority.URGENT || TicketPriority.HIGH,
  },
  {
    group: 'Application Platform Support',
    subqueue: 'Report',
    title: 'Monthly Application Performance Monitoring (APM) & P99 Latency SLA Summary',
    description: 'Monthly generation of application telemetry audit tracking P95/P99 HTTP response times, database transaction durations, and overall uptime SLAs across our 24 production microservices.',
    resolutionSummary: 'Compiled APM metrics from Datadog and New Relic. Overall platform uptime achieved 99.982% for May 2026. P95 latency across core API endpoints averaged 84ms (`vs 120ms SLA limit`); P99 latency averaged 210ms. Identified two legacy monolithic endpoints (`POST /api/v1/export-csv` and `GET /api/v1/user-history`) exceeding P99 threshold (>1200ms) and assigned refactoring tasks to sprint backlog. Attached full report.',
    priority: TicketPriority.LOW,
  },
  {
    group: 'Application Platform Support',
    subqueue: 'Report',
    title: 'Quarterly Third-Party NPM & Maven Dependency Vulnerability Audit (SCA)',
    description: 'Quarterly Software Composition Analysis (SCA) report auditing all Node.js (`package.json`) and Java (`pom.xml`) third-party libraries against national vulnerability databases (NVD / Snyk).',
    resolutionSummary: 'Executed enterprise Snyk and OWASP Dependency-Check scans across all 42 source repositories. Identified 0 Critical, 4 High (primarily outdated `express-fileupload` and `netty-handler` transitive dependencies), and 18 Medium severity CVEs. Submitted automated Dependabot PRs to bump library versions across all affected repos. Attached complete vulnerability matrix.',
    priority: TicketPriority.LOW,
  },
  {
    group: 'Application Platform Support',
    subqueue: 'Information',
    title: 'Query Regarding Proper Implementation of Axios Interceptors for JWT Refresh Token Flow',
    description: 'Frontend engineering inquiring about the recommended pattern for intercepting HTTP 401 Unauthorized responses to transparently refresh JWT tokens without logging the user out or causing race conditions on concurrent requests.',
    resolutionSummary: 'Provided reference implementation code (`AxiosAuthInterceptor.ts`). Explained the necessity of maintaining a `isRefreshing` boolean lock and a queue (`failedQueue: Array<{resolve, reject}>`) inside the Axios response interceptor. When a 401 occurs while `isRefreshing === true`, subsequent requests push their promises into `failedQueue` and resolve automatically once the single refresh endpoint (`POST /auth/refresh`) returns the new `accessToken`.',
    priority: TicketPriority.LOW,
  },
  {
    group: 'Application Platform Support',
    subqueue: 'Information',
    title: 'Inquiry on NestJS `@Global()` Module vs Feature Module Dependency Injection Best Practices',
    description: 'NestJS backend developers asking when it is appropriate to use `@Global()` decorators versus explicitly importing and exporting database and AI service providers inside feature modules (`AiModule`, `TicketsModule`).',
    resolutionSummary: 'Advised engineering team that `@Global()` modules should be strictly limited to foundational cross-cutting infrastructure (e.g., `ConfigModule`, `PrismaModule`, `LoggerModule`) that every component requires universally. Specialized domain modules like `AiModule` or `SlaModule` MUST NOT be made global; instead, explicitly export `CoPilotService` / `VectorService` from `AiModule` and import `AiModule` into `TicketsModule`. This preserves modular encapsulation and prevents circular dependency resolution deadlocks (`[ModuleRef] Circular dependency detected`).',
    priority: TicketPriority.LOW,
  },
  {
    group: 'Application Platform Support',
    subqueue: 'Notification (Domain/Renewal)',
    title: 'Annual Enterprise Subscription Renewal for Datadog APM & Log Management Platform',
    description: 'Datadog billing notification: Annual commit subscription (`Commitment: 250 APM hosts, 5,000 custom metrics, 1.5TB daily log indexing`) up for contract renewal review.',
    resolutionSummary: 'Reviewed Datadog utilization dashboards with VP of Engineering. Log indexing averaged 1.2TB/day (comfortably below commit cap); APM host count stands at 230 instances. Re-certified contract terms and processed renewal invoice `DD-INV-2026-881` locking in enterprise volume discounts through 2027.',
    priority: TicketPriority.MEDIUM,
  },
  {
    group: 'Application Platform Support',
    subqueue: 'Notification (Domain/Renewal)',
    title: 'Annual Renewal of Snyk Enterprise Developer Security & SCA Platform License',
    description: 'Snyk licensing reminder: Enterprise developer security subscription covering 350 contributing developers across code vulnerability (`Snyk Code`) and container scanning (`Snyk Container`) expires next month.',
    resolutionSummary: 'Conducted developer seat reconciliation with HR and Engineering management. Confirmed 325 active developers utilizing Snyk IDE and CI/CD plugins. Approved annual renewal contract `SNYK-ENT-2026-441` for 350 developer seats.',
    priority: TicketPriority.MEDIUM,
  },
  {
    group: 'Application Platform Support',
    subqueue: 'Junk (Advertisement)',
    title: 'Promotional Offer: Out-of-the-Box AI Code Generation & Automated Unit Testing IDE Plugin',
    description: 'Marketing solicitation from `sales@ai-codegen-pro.io` pitching automated test creation tools.',
    resolutionSummary: 'Unsolicited B2B software vendor advertisement. Classified as junk and purged.',
    priority: TicketPriority.LOW,
  },
  {
    group: 'Application Platform Support',
    subqueue: 'Junk (Advertisement)',
    title: 'Spam: Discounted Nearshore UI/UX Design & React Native App Development Agency',
    description: 'Cold email offering hourly staff augmentation and frontend design services.',
    resolutionSummary: 'External vendor promotional outreach. Tagged under junk rules and closed without notification.',
    priority: TicketPriority.LOW,
  },

  // ============================================================================
  // GROUP 7: IAM (Identity & Access Management)
  // ============================================================================
  {
    group: 'IAM (Identity & Access Management)',
    subqueue: 'Incident',
    title: 'Okta SSO SAML 2.0 Assertion Signature Verification Failure on Salesforce Production',
    description: 'All sales and customer service employees reporting inability to log into Salesforce Production via Okta SSO. Salesforce login page throws `SAML Assertion Signature Verification Failed (Error ID: 1102)`.',
    resolutionSummary: 'Investigated Okta SAML application settings for `Salesforce.com (Production)`. Discovered that the automated annual X.509 Identity Provider (IdP) signing certificate (`IDP_CERT_EXPIRED`) had rotated automatically inside Okta overnight, but the public key `.crt` file had not been updated inside Salesforce Single Sign-On configuration settings. Logged into Salesforce via break-glass local admin account, uploaded the new Okta X.509 SAML public certificate, and updated the identity provider binding. SSO authentication across all 400+ sales users restored immediately.',
    priority: TicketPriority.URGENT || TicketPriority.HIGH,
  },
  {
    group: 'IAM (Identity & Access Management)',
    subqueue: 'Incident',
    title: 'Azure AD / Entra ID Conditional Access Policy Blocking Remote VPN MFA Sign-Ins',
    description: 'Remote engineering workers suddenly blocked from connecting to Cisco AnyConnect VPN. Entra ID sign-in logs report error `AADSTS53003: Access has been blocked by Conditional Access policies` with reason `Device not compliant`.',
    resolutionSummary: 'Analyzed Entra ID Conditional Access Policy `CA-Rule-08-Require-Compliant-Device-For-VPN`. Discovered that an automated Microsoft Intune compliance policy sync delay caused Windows 11 endpoints that installed yesterday\'s cumulative OS patch to temporarily report as `Grace Period / Not Evaluated` instead of `Compliant`. Created a temporary 24-hour exclusion group inside `CA-Rule-08` while forcing a manual Intune device compliance re-evaluation sync (`Sync-IntuneDevice`) across all managed endpoints. Remote VPN connectivity restored within 15 minutes.',
    priority: TicketPriority.HIGH,
  },
  {
    group: 'IAM (Identity & Access Management)',
    subqueue: 'Service Request',
    title: 'Provision Role-Based Access Control (RBAC) & SAML SSO for New Databricks Workspace',
    description: 'Data engineering leadership requesting integration of our newly provisioned AWS Databricks workspace `databricks-analytics-prod` with Okta SSO and automated SCIM user group provisioning.',
    resolutionSummary: 'Configured Okta SAML 2.0 application `Databricks Cloud (Prod)` and enabled SCIM 2.0 provisioning API integration using Databricks personal access token (`dapi98a7b6c...`). Mapped Active Directory groups `AD_Databricks_Admins`, `AD_Databricks_DataEngineers`, and `AD_Databricks_Analysts` to corresponding Databricks workspace entitlements (`admins`, `workspace-access`, `sql-access`). Verified test login and confirmed automatic group membership sync via SCIM.',
    priority: TicketPriority.MEDIUM,
  },
  {
    group: 'IAM (Identity & Access Management)',
    subqueue: 'Service Request',
    title: 'Create Emergency Break-Glass SuperAdmin Account in OpenLDAP Master Directory',
    description: 'SecOps and IAM governance request creation of a secondary encrypted break-glass directory administrator account (`cn=breakglass-admin,dc=client-enterprise,dc=internal`) stored securely in physical fireproof safe.',
    resolutionSummary: 'Generated secure 32-character random passphrase and computed SHA-512 salted password hash (`slappasswd -h {SSHA512}`). Created LDIF file `breakglass.ldif` defining user `cn=breakglass-admin` with full `olcAccess` privileges across the directory tree (`manage` access to all attributes). Applied LDIF via `ldapadd -x -D cn=admin,dc=... -W -f breakglass.ldif`. Sealed printed credentials inside tamper-evident security envelope #8821 and deposited inside executive vault.',
    priority: TicketPriority.HIGH,
  },
  {
    group: 'IAM (Identity & Access Management)',
    subqueue: 'Proactive Notification',
    title: 'HashiCorp Vault Token Lease TTL Renewal Failure & Expired Secret ID Alert',
    description: 'Automated monitoring alert from HashiCorp Vault (`vault-prod-cluster`): AppRole `billing-worker-role` failed automatic token lease renewal (`invalid secret_id`). Applications utilizing this identity will lose DB access within 60 minutes.',
    resolutionSummary: 'Investigated Vault audit logs (`/var/log/vault_audit.log`). The `secret_id` assigned to AppRole `billing-worker-role` had reached its hard `secret_id_num_uses` limit (50,000 uses) due to an aggressive retry loop inside a misconfigured background worker pod. Executed `vault write -f auth/approle/role/billing-worker-role/secret-id` to issue a fresh `secret_id`, updated the Kubernetes secret `billing-vault-approle`, and adjusted AppRole parameters (`secret_id_ttl=0`, `secret_id_num_uses=0` for trusted internal cluster roles). Worker pods re-authenticated cleanly.',
    priority: TicketPriority.URGENT || TicketPriority.HIGH,
  },
  {
    group: 'IAM (Identity & Access Management)',
    subqueue: 'Proactive Notification',
    title: 'Active Directory User Account Lockout Storm Alert: Stale Service Account Credentials',
    description: 'Splunk IAM security alert: Service account `svc-printers-spool` triggered over 400 bad password attempts across 6 Domain Controllers within 3 minutes, resulting in continuous account lockout (`Event ID 4740`).',
    resolutionSummary: 'Traced bad password authentication attempts using PowerShell `Get-WinEvent -FilterHashtable @{LogName=\'Security\';ID=4625}` on Domain Controller `dc-01.internal`. Discovered that `svc-printers-spool` password was rotated yesterday, but an old legacy Windows Print Server (`srv-print-legacy-02`) in Building 3 was missed during password update and kept trying to authenticate using stale cached credentials every 5 seconds. Updated the service account password inside `services.msc` on `srv-print-legacy-02` and restarted Print Spooler service. Account lockouts ceased instantly.',
    priority: TicketPriority.HIGH,
  },
  {
    group: 'IAM (Identity & Access Management)',
    subqueue: 'Report',
    title: 'Monthly Privileged Access Management (PAM) CyberArk Session Audit Report',
    description: 'Monthly generation of compliance audit reviewing all privileged SSH and RDP sessions recorded via CyberArk Privileged Session Manager (PSM), alongside verification of automatic root/admin password vault rotations.',
    resolutionSummary: 'Exported CyberArk PVWA compliance matrix for May 2026. 100% of domain admin and root server passwords rotated automatically every 30 days (`1,420 privileged accounts under active management`). Audited 84 active PSM video session recordings; all sessions corresponded to approved Change Management maintenance tickets (`CHG-881` through `CHG-940`). Attached audit report.',
    priority: TicketPriority.LOW,
  },
  {
    group: 'IAM (Identity & Access Management)',
    subqueue: 'Report',
    title: 'Quarterly Inactive User Account Deprovisioning & Orphaned License Audit',
    description: 'Quarterly IAM compliance audit identifying all user accounts in Active Directory and Okta with zero login activity over the past 90 days (`inactive users`), ensuring automated deprovisioning runbooks executed cleanly.',
    resolutionSummary: 'Ran PowerShell audit script `Audit-InactiveADUsers.ps1` and queried Okta System Log API. Identified 12 contractor accounts with no login activity exceeding 90 days. Confirmed with HR that contracts had concluded. Executed automated deprovisioning workflow (`Disable AD Account -> Move to OU=Disabled -> Revoke Okta Licenses -> Archive Office 365 Mailbox to Shared`). Reclaimed $1,800/year in SaaS licensing costs.',
    priority: TicketPriority.LOW,
  },
  {
    group: 'IAM (Identity & Access Management)',
    subqueue: 'Information',
    title: 'Query Regarding OAuth 2.0 / OpenID Connect PKCE Flow for Mobile App Authentication',
    description: 'Mobile engineering querying whether Proof Key for Code Exchange (PKCE) (`code_challenge_method=S256`) is mandatory when implementing Okta OIDC login inside our iOS and Android mobile applications.',
    resolutionSummary: 'Provided IAM security standard architecture memo (`IAM-SPEC-OIDC-v3`). Confirmed that PKCE (`Authorization Code Flow with Proof Key for Code Exchange using SHA-256`) is strictly mandatory for all native mobile and single-page applications (SPAs) where client secrets cannot be securely stored on the end-user device. Implicit Flow (`response_type=token`) is explicitly forbidden across our enterprise.',
    priority: TicketPriority.LOW,
  },
  {
    group: 'IAM (Identity & Access Management)',
    subqueue: 'Information',
    title: 'Inquiry on Enterprise Password Complexity Policies vs NIST SP 800-63B Guidelines',
    description: 'Security compliance committee inquiring why mandatory 90-day password expiration rules were deprecated in our new Active Directory Group Policy (`GPO_Domain_Sec_V2`).',
    resolutionSummary: 'Presented technical briefing referencing modern NIST SP 800-63B (`Digital Identity Guidelines`). Explained that arbitrary periodic password expiration (`e.g., every 90 days`) forces users to pick predictable incremental passwords (`Winter2025! -> Spring2026!`) which weakens overall defense. Our updated enterprise standard enforces minimum 15-character passphrase lengths, checks all new passwords against compromised breach dictionaries (`Azure AD Password Protection / HaveIBeenPwned API`), enforces mandatory MFA, and only requires password rotation when a specific account compromise is suspected or detected.',
    priority: TicketPriority.LOW,
  },
  {
    group: 'IAM (Identity & Access Management)',
    subqueue: 'Notification (Domain/Renewal)',
    title: 'Annual Enterprise Subscription Renewal for Okta Workforce Identity Cloud SSO & MFA',
    description: 'Okta licensing reminder: Annual contract `OKTA-INV-2026-901` covering 3,500 Workforce Identity SSO, Adaptive MFA, and Lifecycle Management (LCM) user licenses up for renewal.',
    resolutionSummary: 'Conducted user license audit across corporate directory (`3,210 active employees + contractors`). Re-certified enterprise licensing tier for 3,500 user seats. Processed annual Okta renewal order locking in existing pricing tiers and SLA guarantees through 2027.',
    priority: TicketPriority.MEDIUM,
  },
  {
    group: 'IAM (Identity & Access Management)',
    subqueue: 'Notification (Domain/Renewal)',
    title: 'Annual Renewal of CyberArk Privileged Access Security (PAS) Enterprise License',
    description: 'CyberArk licensing notification: Enterprise Vault and Privileged Session Manager (`PSM`) license covering 150 concurrent privileged sessions and 5,000 managed target devices expires next month.',
    resolutionSummary: 'Coordinated with SecOps and IAM leadership. Confirmed active vault utilization (`4,120 managed target credentials`). Approved purchase requisition `PR-CYBER-8812` for annual CyberArk PAS license renewal.',
    priority: TicketPriority.MEDIUM,
  },
  {
    group: 'IAM (Identity & Access Management)',
    subqueue: 'Junk (Advertisement)',
    title: 'Promotional Offer: Biometric Passwordless Authentication Hardware Tokens & Smart Cards',
    description: 'Sales promotion from `info@biometric-id-keys.com` offering bulk discounts on fingerprint-activated FIDO2 USB-C security keys.',
    resolutionSummary: 'Unsolicited hardware vendor marketing email. Categorized under junk routing rules and closed.',
    priority: TicketPriority.LOW,
  },
  {
    group: 'IAM (Identity & Access Management)',
    subqueue: 'Junk (Advertisement)',
    title: 'Spam: Autonomous IAM Identity Governance & Compliance Cleanup SaaS Platform',
    description: 'Cold outreach from sales representative pitching automated entitlement cleanup software.',
    resolutionSummary: 'External vendor solicitation. Tagged as spam and closed.',
    priority: TicketPriority.LOW,
  },

  // ============================================================================
  // GROUP 8: IT Service Desk & Assets
  // ============================================================================
  {
    group: 'IT Service Desk & Assets',
    subqueue: 'Incident',
    title: 'Lenovo ThinkPad T14 Gen 4 BitLocker Recovery Key Prompt Loop After BIOS Update',
    description: 'Executive user reports ThinkPad T14 Gen 4 (`Asset ID: LT-2025-0891`) booted directly into blue BitLocker Recovery screen asking for 48-digit numerical recovery key immediately after automatic Lenovo Vantage BIOS firmware update `v1.34`.',
    resolutionSummary: 'Retrieved the 48-digit numerical BitLocker Recovery Key from our Microsoft Entra ID / BitLocker Administration portal (`Key ID: 8A9B10C2-...`) after verifying user identity via phone callback. Guided executive through entering the recovery key at the boot prompt. Once booted into Windows 11, temporarily suspended and resumed BitLocker protection (`Suspend-BitLocker -MountPoint "C:" -RebootCount 1 && Resume-BitLocker -MountPoint "C:"`) inside elevated PowerShell to re-seal the TPM 2.0 Platform Configuration Registers (PCRs). Subsequent reboots completed cleanly without prompting for recovery keys.',
    priority: TicketPriority.HIGH,
  },
  {
    group: 'IT Service Desk & Assets',
    subqueue: 'Incident',
    title: 'Apple MacBook Pro M3 Max MDM Enrollment Profile Stuck in Jamf Pro Quarantine',
    description: 'Newly onboarded iOS/macOS developer unable to access company resources or install self-service software on MacBook Pro (`Serial: C02X9812A...`). Jamf Pro agent reports `MDM Profile Installation Failed: Device in Quarantine State`.',
    resolutionSummary: 'Checked Jamf Pro admin console under `Devices -> Search -> C02X9812A...`. Discovered that the automated Apple Business Manager (DEP/ADE) profile assignment failed during initial setup assistant because the user\'s Apple ID was flagged for password reset. Executed `sudo jamf removeFramework` on the local terminal via remote support screen share, re-assigned the pre-stage enrollment profile inside Jamf Pro, and ran `sudo profiles renew -type enrollment`. User authenticated cleanly via Okta SSO prompt and self-service software catalog populated instantly.',
    priority: TicketPriority.MEDIUM,
  },
  {
    group: 'IT Service Desk & Assets',
    subqueue: 'Service Request',
    title: 'Onboarding Asset Provisioning & Hardware Setup for New VP of Engineering',
    description: 'HR onboarding request (`Start Date: 2026-06-01`): Provision 1x Apple MacBook Pro 16" M3 Max (`64GB RAM, 2TB SSD`), 1x Dell UltraSharp 32" 4K USB-C Hub Monitor (`U3223QE`), Jabra Evolve2 85 wireless headset, and pre-configure standard engineering development image.',
    resolutionSummary: 'Allocated new hardware assets from IT inventory (`MacBook Pro Asset #APL-2026-0142`, `Dell Monitor #MON-2026-0881`). Assigned device serial numbers to user profile inside Apple Business Manager and Jamf Pro. Pre-loaded corporate engineering configuration profile (`Slack, Zoom, 1Password, Docker Desktop, VS Code, Cisco AnyConnect VPN, CrowdStrike Falcon`). Shipped complete onboarding hardware package via FedEx Priority Overnight (`Tracking: 791234567890`) to executive\'s verified home address and updated ServiceNow CMDB asset assignment.',
    priority: TicketPriority.MEDIUM,
  },
  {
    group: 'IT Service Desk & Assets',
    subqueue: 'Service Request',
    title: 'Docking Station Dual 4K Monitor Flickering & USB-C DisplayLink Driver Update',
    description: 'Financial analyst in Room 4A reporting intermittent screen blackouts and flickering on dual Dell 27" monitors connected via USB-C to Dell WD19DCS dual-cable docking station (`Asset ID: DOCK-8812`).',
    resolutionSummary: 'Dispatched Level-1 field technician to workstation. Inspected physical cabling and discovered outdated DisplayLink / MST firmware on the Dell WD19DCS dock (`firmware v01.00.08`). Connected dock to maintenance laptop and flashed latest Dell Docking Station Firmware Utility `v01.00.21.01`. Replaced generic HDMI cables with certified DisplayPort 1.4 high-speed braided cables (`part #CBL-DP14-2M`). Dual 4K monitors tested at 60Hz continuous resolution with zero flickering over a 4-hour observation period.',
    priority: TicketPriority.MEDIUM,
  },
  {
    group: 'IT Service Desk & Assets',
    subqueue: 'Proactive Notification',
    title: 'CrowdStrike Falcon Endpoint Security Agent Offline / Disconnected Alert',
    description: 'CrowdStrike Falcon asset monitoring alert: Workstation `LT-FINANCE-042` (`Assigned: Sarah Jenkins`) has not checked into the Falcon cloud management console in over 14 consecutive days while remaining active on internal corporate Wi-Fi (`IP: 10.40.12.88`).',
    resolutionSummary: 'Connected to `LT-FINANCE-042` via internal remote management background tool (`Dameware / PowerShell Remoting`). Discovered that the local CrowdStrike Falcon sensor `csagent.service` was stuck in `Stopped / Disabled` state after a failed Windows update rollback attempt. Executed silent maintenance repair (`falcon-sensor.exe /install /quiet /norestart CID=12345678...`) from elevated command prompt. Sensor re-registered with cloud console (`Status: Running, Version: 7.14.18206`), downloaded updated malware definition policies, and cleared proactive compliance alert.',
    priority: TicketPriority.HIGH,
  },
  {
    group: 'IT Service Desk & Assets',
    subqueue: 'Proactive Notification',
    title: 'Automated Hardware Warranty Expiration Alert: 45x Dell Latitude 5420 Laptops',
    description: 'Dell Asset Warranty proactive lifecycle alert: 45 Dell Latitude 5420 employee laptops (`Serial batch: 8X9Y...`) deployed in 2023 will reach the end of their 3-year ProSupport Plus hardware warranty next month (`2026-07-15`).',
    resolutionSummary: 'Cross-referenced the 45 Dell Latitude 5420 asset tags against our current employee active directory roster. Identified 38 laptops assigned to active staff and 7 sitting in IT spares locker. Generated IT Hardware Refresh project task `HR-2026-Q3` to order replacement Dell Latitude 5450 Gen 14 laptops for the 38 active users during next quarter\'s budget cycle. Tagged the 7 spare units for secure e-waste recycling decommissioning.',
    priority: TicketPriority.MEDIUM,
  },
  {
    group: 'IT Service Desk & Assets',
    subqueue: 'Report',
    title: 'Monthly IT Asset Inventory CMDB Reconciliation & e-Waste Disposal Audit',
    description: 'Scheduled monthly compliance report verifying exact inventory counts across laptop spares, assigned mobile devices, peripherals, and documentation of secure DoD 5220.22-M hard drive wiping certificates for retired e-waste hardware.',
    resolutionSummary: 'Completed physical inventory count in IT asset lockers (`Room 102`). Spares stock: `18x MacBook Pro M3`, `24x Dell Latitude 5450`, `42x Dell 24" Monitors`. Reconciled all serial numbers with ServiceNow CMDB (`99.8% accuracy`). Processed batch of 35 retired laptops through certified e-waste recycling partner (`EcoTech Disposal`); verified and attached Certificate of Destruction (`COD-2026-0599`) detailing zero-data-recovery hard drive destruction.',
    priority: TicketPriority.LOW,
  },
  {
    group: 'IT Service Desk & Assets',
    subqueue: 'Report',
    title: 'Quarterly Helpdesk SLA First-Contact Resolution (FCR) & CSAT Satisfaction Score Audit',
    description: 'Quarterly review report auditing IT Service Desk performance metrics across ticket volume, First-Contact Resolution (`FCR`) percentage, average handle time (`AHT`), and end-user Customer Satisfaction (`CSAT`) survey feedback.',
    resolutionSummary: 'Extracted quarterly analytics from ticketing platform. Q2 2026 Helpdesk logged `4,120 total tickets`. First-Contact Resolution (`FCR`) reached 78.4% (`exceeding 75% KPI target`). Average resolution time for L1/L2 tickets sat at `4.2 hours`. End-user CSAT survey satisfaction score averaged `4.86 out of 5.0` (`across 1,420 completed surveys`). Attached comprehensive performance slide deck.',
    priority: TicketPriority.LOW,
  },
  {
    group: 'IT Service Desk & Assets',
    subqueue: 'Information',
    title: 'Query Regarding Standard Corporate Smartphone Hardware Tier Options (iPhone vs Samsung)',
    description: 'Sales department manager inquiring about current eligible hardware model choices and carrier subsidy options for employees eligible for corporate-issued mobile smartphones.',
    resolutionSummary: 'Provided IT Hardware Standard Specification Catalog v4.0. Eligible field sales and management employees may select between `Apple iPhone 15 Pro (256GB, Titanium)` or `Samsung Galaxy S24+ (256GB, Black)` under our corporate Verizon/AT&T enterprise rate plans (`Unlimited Voice/Data + International Roaming Pass`). All devices must be ordered through our self-service IT portal and enrolled directly into corporate MDM.',
    priority: TicketPriority.LOW,
  },
  {
    group: 'IT Service Desk & Assets',
    subqueue: 'Information',
    title: 'Clarification on Approved Home Office Ergonomic Equipment Reimbursement Policy',
    description: 'Remote employees inquiring about official reimbursement limits and approved vendor catalogs for home office standing desks, ergonomic chairs, and external webcams.',
    resolutionSummary: 'Sent standard HR & IT Ergonomic Home Office Policy briefing (`STND-WFH-2026`). Full-time remote employees are eligible for a one-time `$750 ergonomic hardware stipend` reimbursable via Concur expense report (`covering standing desks, Herman Miller/Steelcase chairs, and LED monitor arms`). Standard IT peripherals (`Logitech Brio 4K Webcam, Jabra wireless headset, Dell USB-C Dock`) do not count against the stipend and can be ordered directly from the IT asset catalog at zero personal cost.',
    priority: TicketPriority.LOW,
  },
  {
    group: 'IT Service Desk & Assets',
    subqueue: 'Notification (Domain/Renewal)',
    title: 'Annual Enterprise Subscription Renewal for Jamf Pro Apple MDM Cloud Management',
    description: 'Jamf licensing alert: Jamf Pro Cloud Enterprise subscription `JAMF-2026-ENT` covering 1,200 managed macOS and iOS endpoints expires next month (`2026-08-01`).',
    resolutionSummary: 'Audited active Jamf Pro device inventory (`1,085 active MacBooks + iPhones`). Confirmed ongoing requirement for full 1,200 device tier to accommodate planned Q3 engineering hiring growth. Approved purchase order `PO-JAMF-99120` renewing annual Jamf Pro Cloud subscription through August 2027.',
    priority: TicketPriority.MEDIUM,
  },
  {
    group: 'IT Service Desk & Assets',
    subqueue: 'Notification (Domain/Renewal)',
    title: 'Annual Renewal of TeamViewer / BeyondTrust Remote Support Enterprise License',
    description: 'Licensing alert: Enterprise remote support software license (`BeyondTrust Remote Support Cloud Enterprise 25 concurrent technician seats`) up for annual contract renewal.',
    resolutionSummary: 'Verified daily concurrent technician seat utilization across L1 Service Desk and L2 Field Support teams (`average 18 concurrent active sessions`). Re-certified need for 25 concurrent technician license seats and approved annual renewal billing invoice (`BT-INV-2026-4412`).',
    priority: TicketPriority.MEDIUM,
  },
  {
    group: 'IT Service Desk & Assets',
    subqueue: 'Junk (Advertisement)',
    title: 'Promotional Offer: Refurbished Laptops & Cheap Office Cubicle Partition Furniture',
    description: 'Sales promotion from `sales@office-liquidation-outlet.biz` offering bulk discounts on used cubicle desks and refurbished office chairs.',
    resolutionSummary: 'Unsolicited commercial advertisement from external furniture liquidator. Categorized under Junk/Advertisement routing rules and purged from queue.',
    priority: TicketPriority.LOW,
  },
  {
    group: 'IT Service Desk & Assets',
    subqueue: 'Junk (Advertisement)',
    title: 'Spam: Discounted Printer Toner Cartridges & Copier Maintenance Contracts',
    description: 'Cold marketing email offering 50% off compatible toner refills for HP LaserJet and Xerox multi-function printers.',
    resolutionSummary: 'Unsolicited printer supplies advertisement. Tagged as junk/spam and closed without action.',
    priority: TicketPriority.LOW,
  }
];

async function main() {
  console.log('====================================================================');
  console.log(' Enterprise Routing Matrix & Vector Knowledge Base Seeder (`prisma/seed.ts`)');
  console.log('====================================================================\n');

  // STEP 1: VERIFY DATABASE CONNECTION & PGVECTOR EXTENSION
  console.log('[Step 1/5] Checking PostgreSQL connection and verifying `pgvector` extension...');
  try {
    await prisma.$executeRaw`CREATE EXTENSION IF NOT EXISTS vector;`;
    console.log('✔ pgvector extension (`vector`) is active and registered inside PostgreSQL.');
  } catch (err: any) {
    console.warn('⚠️ Could not execute `CREATE EXTENSION vector;` directly (may require superuser privileges or already exist):', err.message);
  }

  const now = new Date();

  // STEP 2: FIND OR CREATE SUPERADMIN & L2 ENGINEER USERS FOR FOREIGN KEYS
  console.log('\n[Step 2/5] Provisioning fallback SuperAdmin and L2 Engineer accounts for ticket relationships...');
  const passwordHash = await bcrypt.hash('Secret123!', 10);

  const superAdmin = await prisma.user.upsert({
    where: { email: 'admin@company.internal' },
    update: { name: 'System Admin (L3)', status: UserStatus.ACTIVE },
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
    update: { name: 'Marcus Vance (Senior L2 Tech)', status: UserStatus.ACTIVE },
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
    where: { email: 'enterprise.client@client-corp.com' },
    update: { name: 'Enterprise Client Contact', status: UserStatus.ACTIVE },
    create: {
      email: 'enterprise.client@client-corp.com',
      name: 'Enterprise Client Contact',
      passwordHash,
      systemRole: SystemRole.CUSTOMER,
      status: UserStatus.ACTIVE,
      mustChangePassword: false,
    },
  });

  // Ensure master status rows exist
  const resolvedMaster = await (prisma as any).masterStatus.upsert({
    where: { name: 'RESOLVED' },
    update: {},
    create: { name: 'RESOLVED', label: 'Resolved', isActive: true, isArchived: true },
  });

  await (prisma as any).masterStatus.upsert({
    where: { name: 'CLOSED' },
    update: {},
    create: { name: 'CLOSED', label: 'Closed', isActive: true, isArchived: true },
  });

  await (prisma as any).masterStatus.upsert({
    where: { name: 'OPEN' },
    update: {},
    create: { name: 'OPEN', label: 'Open', isActive: true, isArchived: false },
  });

  // STEP 3: SEED EXACTLY 8 SERVICE GROUPS (SERVICE CONTRACTS & MASTER CATEGORIES)
  console.log('\n[Step 3/5] Provisioning exactly 8 Service Groups and synchronizing categories...');
  const serviceContractsMap: { [key: string]: string } = {};

  for (const groupName of SERVICE_GROUPS) {
    // 1. Ensure exists inside ServiceContract (Service Groups table)
    const contract = await prisma.serviceContract.upsert({
      where: { name: groupName },
      update: { isActive: true },
      create: { name: groupName, isActive: true },
    });
    serviceContractsMap[groupName] = contract.id;

    // 2. Ensure exists inside MasterCategory (Categories table) for UI consistency
    await prisma.masterCategory.upsert({
      where: { name: groupName },
      update: { isActive: true, description: `Enterprise Service Group: ${groupName}` },
      create: { name: groupName, isActive: true, description: `Enterprise Service Group: ${groupName}` },
    });
  }
  console.log(`✔ Successfully provisioned all 8 Service Groups.`);

  // STEP 4: SEED 7 STRICT SUBQUEUES FOR EACH OF THE 8 SERVICE GROUPS (56 TOTAL QUEUES)
  console.log('\n[Step 4/5] Provisioning all 7 strict ticket type subqueues across each Service Group (56 total routing queues)...');
  const queueIdLookup: { [key: string]: string } = {}; // key: `${groupName}___${subqueueName}` -> queueId

  for (const subq of TICKET_SUBQUEUES) {
    // 1. Ensure MasterType exists
    await prisma.masterType.upsert({
      where: { name: subq.name },
      update: { isActive: true, description: subq.desc },
      create: { name: subq.name, isActive: true, description: subq.desc },
    });
  }

  let totalQueuesSeeded = 0;
  for (const groupName of SERVICE_GROUPS) {
    const serviceId = serviceContractsMap[groupName];
    for (const subq of TICKET_SUBQUEUES) {
      const queueName = `${groupName} - ${subq.name}`;
      const queue = await prisma.masterAssignmentGroup.upsert({
        where: { name: queueName },
        update: {
          description: `${subq.desc} (${groupName})`,
          isActive: true,
          serviceId: serviceId,
        },
        create: {
          name: queueName,
          description: `${subq.desc} (${groupName})`,
          isActive: true,
          serviceId: serviceId,
        },
      });
      queueIdLookup[`${groupName}___${subq.name}`] = queue.id;
      totalQueuesSeeded++;
    }
  }
  console.log(`✔ Successfully seeded ${totalQueuesSeeded} enterprise routing subqueues tied to Service Groups.`);

  // STEP 5: COMPREHENSIVE TEXT & VECTOR SEEDING SIMULATION (112 REALISTIC TECHNICAL TICKETS)
  console.log(`\n[Step 5/5] Bulk-generating ${ENTERPRISE_SCENARIOS.length} high-density technical ticket records with pre-calculated 1536-dimensional vectors...`);

  let seededCount = 0;
  for (let i = 0; i < ENTERPRISE_SCENARIOS.length; i++) {
    const scenario = ENTERPRISE_SCENARIOS[i];
    const lookupKey = `${scenario.group}___${scenario.subqueue}`;
    const queueId = queueIdLookup[lookupKey];

    // Generate historical timestamps distributed across the past 60 days
    const daysAgo = Math.floor(i * 0.5) + 1;
    const createdAt = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
    const updatedAt = new Date(createdAt.getTime() + 45 * 60 * 1000);
    const slaDeadline = new Date(createdAt.getTime() + 24 * 60 * 60 * 1000);
    const ttfrDeadline = new Date(createdAt.getTime() + 4 * 60 * 60 * 1000);
    const resolutionDeadline = new Date(createdAt.getTime() + 48 * 60 * 60 * 1000);

    try {
      const ticket = await prisma.ticket.create({
        data: {
          title: scenario.title,
          description: scenario.description,
          status: RESOLVED_STATUS,
          statusId: resolvedMaster.id,
          subStatus: SubStatus.NONE,
          priority: scenario.priority,
          category: scenario.group,
          ticketType: scenario.subqueue,
          serviceContract: scenario.group,
          queueId: queueId,
          source: 'PORTAL',
          customerId: customerUser.id,
          ticketOwnerId: l2Engineer.id,
          slaDeadline,
          ttfrDeadline,
          resolutionDeadline,
          createdAt,
          updatedAt,
          timeSpentMin: 45,
          isScopeInScope: true,
          isSlaBreached: false,
          isTtfrBreached: false,
          isResolutionBreached: false,
          slaTimerActive: false,
          isArchived: true,
          archivedAt: updatedAt,
          closedAt: updatedAt,
          resolvedAt: updatedAt,
          closedBy: l2Engineer.id,
          resolutionSummary: scenario.resolutionSummary,
          isIndexedToVectorDb: true,
          vectorIndexedAt: now,
        } as any,
      });

      // Compute 1536-dimensional vector embedding from combined ticket domain string
      const seedString = `${scenario.subqueue} | ${scenario.group} | ${scenario.title} | ${scenario.resolutionSummary}`;
      const vector1536 = generateMockVector1536(seedString);
      const postgresVectorLiteral = `[${vector1536.join(',')}]`;

      await prisma.$executeRaw`
        UPDATE "Ticket"
        SET "embedding" = ${postgresVectorLiteral}::vector,
            "isIndexedToVectorDb" = true,
            "vectorIndexedAt" = ${now}
        WHERE "id" = ${ticket.id}
      `;

      seededCount++;
      if (seededCount % 20 === 0 || seededCount === ENTERPRISE_SCENARIOS.length) {
        console.log(`   Progress: [${seededCount}/${ENTERPRISE_SCENARIOS.length}] RAG tickets inserted & vector-indexed cleanly.`);
      }
    } catch (err: any) {
      console.error(`⚠️ Error inserting ticket scenario #${i + 1} (${scenario.title}):`, err.message);
    }
  }

  console.log(`\n====================================================================`);
  console.log(` ✔ Master Pipeline Complete! Successfully seeded:`);
  console.log(`   • 8 Enterprise Service Groups`);
  console.log(`   • 56 Subqueues (7 strict subqueues per Service Group)`);
  console.log(`   • ${seededCount} Domain-Specific RAG Tickets with 1536-dim pgvector embeddings`);
  console.log(`====================================================================\n`);
}

main()
  .catch((e) => {
    console.error('❌ Master Seeder Execution Threw Fatal Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    console.log('Disconnecting Prisma client & database pool cleanly...');
    await prisma.$disconnect();
    await pool.end();
  });
