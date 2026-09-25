import QRCode from 'qrcode';

export interface PatientQRCheckInData {
  protocol: 'hosflow-v1';
  uhid: string;
  name: string;
  age?: number | string;
  gender?: string;
  ward?: string;
  bed?: string;
  triageAcuity?: 'emergent' | 'urgent' | 'non_urgent';
  intakeTimestamp: string;
  token: string;
  authEndpoint: string;
}

/**
 * Creates a structured JSON payload for hospital intake check-in and patient portal launch
 */
export function createPatientCheckInPayload(patient: {
  uhid: string;
  name: string;
  age?: number | string;
  gender?: string;
  ward?: string;
  bed?: string;
  triageAcuity?: 'emergent' | 'urgent' | 'non_urgent';
  token?: string;
}): string {
  const token = patient.token || `HOSFLOW-REG-${patient.uhid}-${Date.now().toString().slice(-4)}`;
  const payload: PatientQRCheckInData = {
    protocol: 'hosflow-v1',
    uhid: patient.uhid,
    name: patient.name,
    age: patient.age || 45,
    gender: patient.gender || 'M',
    ward: patient.ward || 'General Surgical Recovery',
    bed: patient.bed || 'Bay 204',
    triageAcuity: patient.triageAcuity || 'urgent',
    intakeTimestamp: new Date().toISOString(),
    token,
    authEndpoint: `https://hosflow.citycare.health/portal?uhid=${patient.uhid}&token=${token}`,
  };

  return JSON.stringify(payload, null, 2);
}

/**
 * Generates a high-resolution base64 PNG data URL of the QR code
 */
export async function generateQRCodeDataURL(
  data: string | object,
  options?: {
    width?: number;
    margin?: number;
    darkColor?: string;
    lightColor?: string;
    errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
  }
): Promise<string> {
  const text = typeof data === 'string' ? data : JSON.stringify(data);
  const opts = {
    width: options?.width || 360,
    margin: options?.margin ?? 2,
    color: {
      dark: options?.darkColor || '#141416',
      light: options?.lightColor || '#ffffff',
    },
    errorCorrectionLevel: options?.errorCorrectionLevel || 'H',
  };

  try {
    return await QRCode.toDataURL(text, opts);
  } catch (err) {
    console.error('Failed to generate QR code data URL:', err);
    throw err;
  }
}

/**
 * Generates an SVG string representation of the QR code
 */
export async function generateQRCodeSVG(
  data: string | object,
  options?: {
    width?: number;
    margin?: number;
    darkColor?: string;
    lightColor?: string;
  }
): Promise<string> {
  const text = typeof data === 'string' ? data : JSON.stringify(data);
  return QRCode.toString(text, {
    type: 'svg',
    width: options?.width || 280,
    margin: options?.margin ?? 2,
    color: {
      dark: options?.darkColor || '#141416',
      light: options?.lightColor || '#ffffff',
    },
  });
}

/**
 * Triggers a client-side download of the QR code as PNG image
 */
export function downloadQRCodePNG(dataUrl: string, fileName = 'patient-checkin-qr.png'): void {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
