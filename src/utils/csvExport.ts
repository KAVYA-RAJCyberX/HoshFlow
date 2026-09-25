import { HospitalRecord } from '../services/hospitalManagementService';

/**
 * Generates an RFC-4180 compliant CSV string representing registered hospital entities
 * with clinical metrics, accreditation details, and administrator contact bindings.
 */
export function generateHospitalCSV(hospitals: HospitalRecord[]): string {
  const headers = [
    'Hospital ID',
    'Institution Code',
    'Hospital Name',
    'Campus / Branch',
    'Clinical Tier Classification',
    'Operational Status',
    'Total Bed Capacity',
    'Occupied Beds',
    'Available Beds',
    'Bed Occupancy Rate',
    'Accreditation Standard',
    'City',
    'State / Province',
    'Postal Code',
    'Registered Address',
    'Main Reception Phone',
    'Emergency 24x7 Hotline',
    'Institutional Email',
    'Hospital Administrator Name',
    'Administrator Email',
    'Administrator Phone',
    'Provisioning Timestamp'
  ];

  const escapeCSV = (val: string | number | boolean | undefined | null): string => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const rows = hospitals.map((h) => {
    const totalBeds = h.totalBeds || 0;
    const occupiedBeds = h.occupiedBeds || 0;
    const availableBeds = Math.max(0, totalBeds - occupiedBeds);
    const occupancyRate = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;

    return [
      h.id,
      h.code,
      h.name,
      h.campus || 'Main Campus',
      h.tier,
      h.isActive ? 'ACTIVE' : 'DEACTIVATED',
      totalBeds,
      occupiedBeds,
      availableBeds,
      `${occupancyRate}%`,
      h.accreditation || 'NABH Digital Certified',
      h.city,
      h.state,
      h.postalCode,
      h.address,
      h.contactPhone,
      h.emergencyHotline,
      h.contactEmail,
      h.hospitalAdminName || 'Unassigned',
      h.hospitalAdminEmail || 'N/A',
      h.hospitalAdminPhone || 'N/A',
      h.createdAt || new Date().toISOString()
    ].map(escapeCSV).join(',');
  });

  return [headers.map(escapeCSV).join(','), ...rows].join('\r\n');
}

/**
 * Triggers a client-side file download of the generated CSV file
 * formatted specifically for offline reporting and compliance audits.
 */
export function downloadHospitalCSV(
  hospitals: HospitalRecord[],
  filenamePrefix = 'hospital_registry_compliance_audit'
): void {
  const csvContent = generateHospitalCSV(hospitals);
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const timeStr = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
  
  link.href = url;
  link.setAttribute('download', `${filenamePrefix}_${dateStr}_${timeStr}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
