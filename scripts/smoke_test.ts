// Smoke test: full discharge→turnover→housekeeping→bed lifecycle
const BASE = 'http://localhost:3001';

async function run() {
  // Auth
  const authRes = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'arao@citycare.com', password: 'Hosflow@2026' })
  });
  const { token } = await authRes.json();
  const H = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  // 1. Current state
  const beds = await (await fetch(`${BASE}/api/beds`, { headers: H })).json();
  const patients = await (await fetch(`${BASE}/api/patients`, { headers: H })).json();

  console.log('\n=== CURRENT STATE ===');
  beds.forEach((b: any) => console.log(`  Bed ${b.id}: ${b.status} | patient=${b.patientUhid || 'none'}`));
  patients.forEach((p: any) => console.log(`  Patient ${p.uhid}: status=${p.status} | bedId=${p.bedId || 'none'}`));

  // 2. Find an occupied bed with a patient to discharge
  const occupied = beds.find((b: any) => b.status === 'occupied' && b.patientUhid);
  if (!occupied) {
    console.log('\n⚠️  No occupied bed found. Seeding a patient first...');
    // Create a test patient and allocate them
    const pRes = await fetch(`${BASE}/api/patients`, {
      method: 'POST', headers: H,
      body: JSON.stringify({
        uhid: 'SMOKE-001', name: 'Smoke Test Patient', age: 45, gender: 'M',
        ward: 'Medical Ward A', diagnosis: 'Smoke Test', attendingDoctor: 'Dr. Test',
        status: 'admitted', acuity: 'non_urgent'
      })
    });
    const newPatient = await pRes.json();
    console.log('  Created patient:', newPatient.uhid);

    const availBed = beds.find((b: any) => b.status === 'available');
    if (!availBed) { console.log('❌ No available bed to allocate.'); return; }

    const allocRes = await fetch(`${BASE}/api/turnover/allocate`, {
      method: 'POST', headers: H,
      body: JSON.stringify({ uhid: 'SMOKE-001', bedId: availBed.id })
    });
    const allocData = await allocRes.json();
    console.log('  Allocated to bed:', allocData.bed?.id, '| status:', allocData.bed?.status);
    
    // Discharge this newly allocated patient
    const dischargeRes2 = await fetch(`${BASE}/api/patients/SMOKE-001/discharge`, {
      method: 'POST', headers: H
    });
    const dd2 = await dischargeRes2.json();
    console.log('  Discharge SMOKE-001 result:', dischargeRes2.status);
    const bedsAfter2 = await (await fetch(`${BASE}/api/beds`, { headers: H })).json();
    const db2 = bedsAfter2.find((b: any) => b.id === availBed.id);
    console.log(`  Bed ${availBed.id} after discharge: ${db2?.status} | patient=${db2?.patientUhid || 'CLEARED'}`);
    if (db2?.status === 'cleaning') console.log('  ✅ PASS: Discharge→Cleaning works');
    else console.log('  ❌ FAIL: Expected cleaning, got', db2?.status);
    
    const hkRes2 = await fetch(`${BASE}/api/beds/${availBed.id}`, {
      method: 'PATCH', headers: H,
      body: JSON.stringify({ status: 'available', cleaningProgress: 100, lastSanitized: new Date().toISOString() })
    });
    const hkD2 = await hkRes2.json();
    if (hkD2.status === 'available') console.log('  ✅ PASS: Cleaning→Available works');
    else console.log('  ❌ FAIL: Expected available, got', hkD2.status);
    console.log('\n✅ Full lifecycle smoke test complete (seeded new patient path).');
    return;
  }

  // 3. Discharge the patient
  console.log(`\n=== STEP 1: Discharge ${occupied.patientUhid} from bed ${occupied.id} ===`);
  const dischargeRes = await fetch(`${BASE}/api/patients/${occupied.patientUhid}/discharge`, {
    method: 'POST', headers: H
  });
  const dischargeData = await dischargeRes.json();
  console.log('  Discharge result:', dischargeRes.status, JSON.stringify(dischargeData));

  // 4. Verify bed is now cleaning
  const bedsAfterDischarge = await (await fetch(`${BASE}/api/beds`, { headers: H })).json();
  const dischargedBed = bedsAfterDischarge.find((b: any) => b.id === occupied.id);
  console.log(`\n=== STEP 2: Bed ${occupied.id} after discharge ===`);
  console.log(`  status=${dischargedBed?.status} | patientUhid=${dischargedBed?.patientUhid || 'CLEARED'}`);
  if (dischargedBed?.status !== 'cleaning') {
    console.log('  ❌ FAIL: Expected "cleaning"');
  } else {
    console.log('  ✅ PASS: Bed correctly set to cleaning');
  }

  // 5. Mark bed as sanitized (housekeeping completes)
  console.log(`\n=== STEP 3: Housekeeping marks bed ${occupied.id} as available ===`);
  const hkRes = await fetch(`${BASE}/api/beds/${occupied.id}`, {
    method: 'PATCH', headers: H,
    body: JSON.stringify({ status: 'available', cleaningProgress: 100, lastSanitized: new Date().toISOString() })
  });
  const hkData = await hkRes.json();
  console.log(`  status=${hkData.status} | lastSanitized=${hkData.lastSanitized}`);
  if (hkData.status !== 'available') {
    console.log('  ❌ FAIL: Expected "available"');
  } else {
    console.log('  ✅ PASS: Bed back to available');
  }

  // 6. Final state
  const finalBeds = await (await fetch(`${BASE}/api/beds`, { headers: H })).json();
  const finalPatients = await (await fetch(`${BASE}/api/patients`, { headers: H })).json();
  console.log('\n=== FINAL STATE ===');
  finalBeds.forEach((b: any) => console.log(`  Bed ${b.id}: ${b.status} | patient=${b.patientUhid || 'none'}`));
  const dp = finalPatients.find((p: any) => p.uhid === occupied.patientUhid);
  console.log(`  Patient ${occupied.patientUhid}: status=${dp?.status} | bedId=${dp?.bedId || 'CLEARED'}`);
  if (dp?.status === 'discharged' && !dp?.bedId) {
    console.log('  ✅ PASS: Patient correctly discharged and delinked from bed');
  }

  console.log('\n✅ Full bed lifecycle smoke test complete.');
}

run().catch(console.error);
