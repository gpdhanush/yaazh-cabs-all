export function statusTone(status: string): string {
  const s = (status || '').toLowerCase();
  if (['pending', 'requested', 'driver_notified'].includes(s)) return 'tone-warn';
  if (['confirmed', 'driver_accepted', 'driver_assigned', 'on_the_way', 'arrived', 'trip_started'].includes(s)) {
    return 'tone-info';
  }
  if (['completed', 'paid', 'approved', 'active', 'published'].includes(s)) return 'tone-success';
  if (['cancelled', 'rejected', 'failed', 'no_show', 'driver_rejected'].includes(s)) return 'tone-danger';
  return 'tone-muted';
}

/** Human-readable booking / trip status. */
export function statusLabel(status: string): string {
  const map: Record<string, string> = {
    pending: 'Pending',
    confirmed: 'Confirmed',
    driver_notified: 'Driver notified',
    driver_accepted: 'Driver accepted',
    driver_rejected: 'Driver rejected',
    driver_assigned: 'Driver assigned',
    on_the_way: 'On the way',
    arrived: 'Arrived',
    trip_started: 'Trip started',
    completed: 'Completed',
    cancelled: 'Cancelled',
    rejected: 'Rejected',
    no_show: 'No show',
  };
  return map[status] ?? status.replace(/_/g, ' ');
}

export function canAssignDriver(status: string): boolean {
  return [
    'confirmed',
    'driver_notified',
    'driver_accepted',
    'driver_rejected',
    'driver_assigned',
    'on_the_way',
    'arrived',
  ].includes(status);
}

/** Driver availability_status → display label. */
export function availabilityLabel(status: string): string {
  const map: Record<string, string> = {
    available: 'Available',
    on_trip: 'On Ride',
    on_leave: 'Leave',
    suspended: 'Suspend',
  };
  return map[status] ?? status.replace(/_/g, ' ');
}

export function onlineLabel(status: string): string {
  const map: Record<string, string> = {
    offline: 'Offline',
    online: 'Online',
    busy: 'Busy',
  };
  return map[status] ?? status.replace(/_/g, ' ');
}
