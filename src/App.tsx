/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { RoleType, ViewType } from './types';
import { CLINICAL_PERSONAS } from './data/mockHospitalData';
import { auditLogService } from './services/auditLogService';
import { MainLayout } from './components/layout/MainLayout';
import { DoctorFlowPipelineView } from './components/views/DoctorFlowPipelineView';
import { BedMatrixView } from './components/views/BedMatrixView';
import { ClinicalStationView } from './components/views/ClinicalStationView';
import { DischargeHubView } from './components/views/DischargeHubView';
import { BillingDeskView } from './components/views/BillingDeskView';
import { HousekeepingView } from './components/views/HousekeepingView';
import { ReceptionIntakeView } from './components/views/ReceptionIntakeView';
import { PharmacyStatView } from './components/views/PharmacyStatView';
import { ExecutiveAdminView } from './components/views/ExecutiveAdminView';
import { SuperAdminPortalView } from './components/views/SuperAdminPortalView';
import { SystemGovernanceView } from './components/views/SystemGovernanceView';
import { TurnoverManagerView } from './components/views/TurnoverManagerView';
import { NursingStationView } from './components/views/NursingStationView';
import { PatientPortalView } from './components/views/PatientPortalView';
import { PatientSelfCheckInView } from './components/views/PatientSelfCheckInView';
import { LoginPortalView } from './components/views/LoginPortalView';
import { ProtectedRoleView } from './components/auth/ProtectedRoleView';
import { ShiftHandoverModal } from './components/common/ShiftHandoverModal';
import { ClinicalNotesSidePanel } from './components/common/ClinicalNotesSidePanel';

export default function App() {
  const [activeRole, setActiveRole] = useState<RoleType>('doctor');
  const [activeView, setActiveView] = useState<ViewType>('ward_flow');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showShiftHandover, setShowShiftHandover] = useState(false);
  const [handoverRole, setHandoverRole] = useState<RoleType>('doctor');

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
  };

  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => {
      setToastMessage(null);
    }, 4000);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  // Render view safely wrapped with ProtectedRoleView to enforce role restrictions
  const renderActiveView = () => {
    return (
      <ProtectedRoleView
        activeRole={activeRole}
        view={activeView}
        onNavigate={setActiveView}
        onSelectRole={setActiveRole}
        onTriggerToast={triggerToast}
      >
        {() => {
          switch (activeView) {
            case 'ward_flow':
              return <DoctorFlowPipelineView onNavigate={setActiveView} onTriggerToast={triggerToast} />;
            case 'bed_matrix':
              return <BedMatrixView onNavigate={setActiveView} onTriggerToast={triggerToast} />;
            case 'clinical_rounds':
              return <ClinicalStationView onNavigate={setActiveView} onTriggerToast={triggerToast} />;
            case 'discharge_hub':
              return <DischargeHubView onNavigate={setActiveView} onTriggerToast={triggerToast} />;
            case 'billing':
              return <BillingDeskView onNavigate={setActiveView} onTriggerToast={triggerToast} />;
            case 'housekeeping':
              return <HousekeepingView onNavigate={setActiveView} onTriggerToast={triggerToast} />;
            case 'reception':
              return (
                <ReceptionIntakeView
                  onNavigate={setActiveView}
                  onSelectRole={setActiveRole}
                  onTriggerToast={triggerToast}
                />
              );
            case 'pharmacy':
              return <PharmacyStatView onNavigate={setActiveView} onTriggerToast={triggerToast} />;
            case 'executive_admin':
              return <ExecutiveAdminView onNavigate={setActiveView} onTriggerToast={triggerToast} />;
            case 'super_admin_panel':
              return <SuperAdminPortalView onNavigate={setActiveView} onTriggerToast={triggerToast} />;
            case 'governance':
              return <SystemGovernanceView onNavigate={setActiveView} onTriggerToast={triggerToast} />;
            case 'turnover_manager':
              return <TurnoverManagerView onNavigate={setActiveView} onTriggerToast={triggerToast} />;
            case 'nursing_station':
              return <NursingStationView onNavigate={setActiveView} onTriggerToast={triggerToast} />;
            case 'patient_portal':
              return <PatientPortalView onNavigate={setActiveView} onTriggerToast={triggerToast} />;
            case 'patient_self_checkin':
              return <PatientSelfCheckInView onNavigate={setActiveView} onTriggerToast={triggerToast} />;
            case 'login_portal':
              return (
                <LoginPortalView
                  onSelectRole={setActiveRole}
                  onNavigate={setActiveView}
                  onTriggerToast={triggerToast}
                />
              );
            default:
              return <DoctorFlowPipelineView onNavigate={setActiveView} onTriggerToast={triggerToast} />;
          }
        }}
      </ProtectedRoleView>
    );
  };

  return (
    <MainLayout
      activeView={activeView}
      onSelectView={setActiveView}
      activeRole={activeRole}
      onSelectRole={(role) => {
        if (role !== activeRole) {
          const prevPersona = CLINICAL_PERSONAS[activeRole] || CLINICAL_PERSONAS.doctor;
          auditLogService.logRoleSwitch(prevPersona.name, activeRole, role);
        }
        setActiveRole(role);
        // Automatically route to appropriate view when role is switched
        switch (role) {
          case 'doctor':
            setActiveView('ward_flow');
            break;
          case 'nurse':
            setActiveView('nursing_station');
            break;
          case 'bed_manager':
            setActiveView('bed_matrix');
            break;
          case 'hospital_admin':
            setActiveView('executive_admin');
            break;
          case 'super_admin':
            setActiveView('super_admin_panel');
            break;
          case 'billing':
            setActiveView('billing');
            break;
          case 'pharmacy':
            setActiveView('pharmacy');
            break;
          case 'housekeeping':
            setActiveView('housekeeping');
            break;
          case 'reception':
            setActiveView('reception');
            break;
          case 'patient_portal':
            setActiveView('patient_self_checkin');
            break;
        }
        if (role !== 'patient_portal') {
          setHandoverRole(role);
          setShowShiftHandover(true);
        }
        triggerToast(`Switched perspective to ${role.replace('_', ' ').toUpperCase()}`);
      }}
      toastMessage={toastMessage}
      onClearToast={() => setToastMessage(null)}
      onTriggerToast={triggerToast}
      dischargeReqCount={1}
      onOpenHandover={() => {
        setHandoverRole(activeRole);
        setShowShiftHandover(true);
      }}
      onLogout={() => {
        const currentPersona = CLINICAL_PERSONAS[activeRole] || CLINICAL_PERSONAS.doctor;
        const token = localStorage.getItem('hosflow_jwt');
        fetch('/api/audit-logs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({
            actor: currentPersona.name,
            role: currentPersona.designation,
            action: `Workstation Signed Out: Closed active console session for [${activeRole.replace('_', ' ').toUpperCase()}]. Session tokens invalidated.`,
            category: 'auth',
            severity: 'info',
            status: 'RECORDED',
          })
        }).catch(console.error);
        setActiveView('login_portal');
        triggerToast('Signed out of workstation. Please authenticate to resume clinical session.');
      }}
    >
      {renderActiveView()}
      
      {/* Shift Handover Component upon role selection */}
      <ShiftHandoverModal
        isOpen={showShiftHandover}
        onClose={() => setShowShiftHandover(false)}
        incomingRole={handoverRole}
        onNavigate={setActiveView}
        onTriggerToast={triggerToast}
      />

      {/* Interdisciplinary Clinical Notes Side-Panel */}
      <ClinicalNotesSidePanel
        activeRole={activeRole}
        onTriggerToast={triggerToast}
      />
    </MainLayout>
  );
}
