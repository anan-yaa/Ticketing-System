import { Injectable } from '@nestjs/common';
import { TicketPriority } from '@prisma/client';

@Injectable()
export class SlaService {
  calculateSlaDeadline(
    priority: TicketPriority | string,
    criticality?: string | null,
    serviceContract?: string | null,
    baseDate: Date = new Date(),
  ): Date {
    const deadline = new Date(baseDate);
    let hours = 24;

    const p = String(priority).toUpperCase();
    if (p === 'URGENT') {
      hours = 1;
    } else if (p === 'HIGH') {
      hours = 4;
    } else if (p === 'MEDIUM') {
      hours = 8;
    } else if (p === 'LOW') {
      hours = 24;
    }

    // Criticality multiplier/adjustments
    const crit = String(criticality || '').toUpperCase();
    if (crit === 'CRITICAL') {
      hours = Math.max(1, Math.floor(hours * 0.5));
    } else if (crit === 'HIGH') {
      hours = Math.max(1, Math.floor(hours * 0.75));
    }

    // Service Contract adjustments
    const contract = String(serviceContract || '').toUpperCase();
    if (contract.includes('GOLD') || contract.includes('VIP') || contract.includes('PREMIUM')) {
      hours = Math.max(1, Math.floor(hours * 0.5));
    } else if (contract.includes('SILVER')) {
      hours = Math.max(1, Math.floor(hours * 0.8));
    }

    deadline.setHours(deadline.getHours() + hours);
    return deadline;
  }
}
