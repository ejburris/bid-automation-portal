export const COMPANY_IDENTITY = {
  name: 'Clean World Maintenance',
  phone: '(360) 256-9250',
  tollFree: '(800) 643-3850',
  email: 'eburris@cwminc.com',
  address: '19312 NE 58th St. Vancouver, WA 98682',
  waContractorLicense: 'CC CLEANMI752JJ',
  omwbeCertificationNumber: 'W2F0026094',
} as const;

export const COMPANY_SIGNATURE = `Clean World Maintenance
${COMPANY_IDENTITY.phone}
${COMPANY_IDENTITY.tollFree}
${COMPANY_IDENTITY.email}
${COMPANY_IDENTITY.address}
WA Contractor License: ${COMPANY_IDENTITY.waContractorLicense}
OMWBE Certification Number: ${COMPANY_IDENTITY.omwbeCertificationNumber}`;
