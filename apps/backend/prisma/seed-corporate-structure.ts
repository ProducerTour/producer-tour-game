/**
 * Seed script for Corporate Structure Quest System
 * Creates all 5 entities with their quests, steps, and compliance items
 *
 * Run with: npx ts-node prisma/seed-corporate-structure.ts
 */

import { PrismaClient } from '../src/generated/client';

const prisma = new PrismaClient();

async function seedCorporateStructure() {
  console.log('🏛️ Seeding Corporate Structure Quest System...\n');

  // ============================================================================
  // ENTITIES
  // ============================================================================

  // Holdings, Inc. - ACTIVE (already formed)
  const holdings = await prisma.corporateEntity.upsert({
    where: { id: 'holdings' },
    update: {},
    create: {
      id: 'holdings',
      name: 'Producer Tour Holdings, Inc.',
      shortName: 'Holdings',
      type: 'C_CORP',
      jurisdiction: 'Delaware',
      status: 'ACTIVE',
      formedDate: new Date('2024-01-01'), // Update with actual date
      registeredAgent: 'Bizee', // Update with actual agent
      color: '#3b82f6',
      biomeType: 'vault_fortress',
    },
  });
  console.log('✅ Created Holdings, Inc.');

  // IP LLC - NOT_FORMED
  const ipLlc = await prisma.corporateEntity.upsert({
    where: { id: 'ip-llc' },
    update: {},
    create: {
      id: 'ip-llc',
      name: 'Producer Tour IP LLC',
      shortName: 'IP LLC',
      type: 'LLC',
      jurisdiction: 'Delaware',
      status: 'NOT_FORMED',
      color: '#a855f7',
      biomeType: 'crystal_archives',
    },
  });
  console.log('✅ Created IP LLC (not formed)');

  // PT LLC (Admin) - NOT_FORMED
  const ptLlc = await prisma.corporateEntity.upsert({
    where: { id: 'pt-llc' },
    update: {},
    create: {
      id: 'pt-llc',
      name: 'Producer Tour LLC',
      shortName: 'PT LLC',
      type: 'LLC',
      jurisdiction: 'Florida',
      status: 'NOT_FORMED',
      color: '#f59e0b',
      biomeType: 'command_bridge',
    },
  });
  console.log('✅ Created PT LLC (not formed)');

  // Ops LLC - NOT_FORMED
  const opsLlc = await prisma.corporateEntity.upsert({
    where: { id: 'ops-llc' },
    update: {},
    create: {
      id: 'ops-llc',
      name: 'Producer Tour Ops LLC',
      shortName: 'Ops LLC',
      type: 'LLC',
      jurisdiction: 'Florida',
      status: 'NOT_FORMED',
      color: '#22c55e',
      biomeType: 'factory_floor',
    },
  });
  console.log('✅ Created Ops LLC (not formed)');

  // Finance LLC - NOT_FORMED
  const financeLlc = await prisma.corporateEntity.upsert({
    where: { id: 'finance-llc' },
    update: {},
    create: {
      id: 'finance-llc',
      name: 'Producer Tour Finance LLC',
      shortName: 'Finance LLC',
      type: 'LLC',
      jurisdiction: 'Florida',
      status: 'NOT_FORMED',
      color: '#06b6d4',
      biomeType: 'treasury',
    },
  });
  console.log('✅ Created Finance LLC (not formed)');

  // ============================================================================
  // HOLDINGS QUESTS (Post-Formation - since Holdings is already ACTIVE)
  // ============================================================================

  // Quest 1: Bylaws (Governance)
  const holdingsBylaws = await prisma.corporateQuest.upsert({
    where: { id: 'holdings-bylaws' },
    update: {},
    create: {
      id: 'holdings-bylaws',
      entityId: holdings.id,
      title: 'The Laws of the Land',
      description: 'Adopt corporate bylaws to govern shareholder meetings, board procedures, and officer duties.',
      category: 'GOVERNANCE',
      order: 1,
      status: 'AVAILABLE',
      xpReward: 200,
    },
  });

  await prisma.corporateQuestStep.createMany({
    skipDuplicates: true,
    data: [
      {
        id: 'holdings-bylaws-1',
        questId: holdingsBylaws.id,
        title: 'Review Bylaws Template',
        description: 'Review the standard corporate bylaws template and understand key provisions.',
        order: 1,
        actionType: 'TEMPLATE',
        actionData: { templateName: 'Corporate Bylaws' },
      },
      {
        id: 'holdings-bylaws-2',
        questId: holdingsBylaws.id,
        title: 'Customize for Holdings',
        description: 'Modify the template with Producer Tour Holdings specific details.',
        order: 2,
        actionType: 'TEMPLATE',
      },
      {
        id: 'holdings-bylaws-3',
        questId: holdingsBylaws.id,
        title: 'Board Adoption Resolution',
        description: 'Create a resolution for the board to formally adopt the bylaws.',
        order: 3,
        actionType: 'TEMPLATE',
      },
      {
        id: 'holdings-bylaws-4',
        questId: holdingsBylaws.id,
        title: 'Upload Signed Bylaws',
        description: 'Upload the final signed bylaws document.',
        order: 4,
        actionType: 'UPLOAD',
        requiresUpload: true,
      },
    ],
  });

  // Quest 2: Shareholder Agreement
  const holdingsShareholderAgreement = await prisma.corporateQuest.upsert({
    where: { id: 'holdings-shareholder-agreement' },
    update: {},
    create: {
      id: 'holdings-shareholder-agreement',
      entityId: holdings.id,
      title: "Shareholder's Covenant",
      description: 'Create shareholder agreement defining ownership rights, transfer restrictions, and governance.',
      category: 'GOVERNANCE',
      order: 2,
      status: 'LOCKED',
      prerequisiteIds: ['holdings-bylaws'],
      xpReward: 200,
    },
  });

  await prisma.corporateQuestStep.createMany({
    skipDuplicates: true,
    data: [
      {
        id: 'holdings-sha-1',
        questId: holdingsShareholderAgreement.id,
        title: 'Review Shareholder Agreement Template',
        description: 'Review the template and understand buy-sell provisions, voting rights, and transfer restrictions.',
        order: 1,
        actionType: 'TEMPLATE',
      },
      {
        id: 'holdings-sha-2',
        questId: holdingsShareholderAgreement.id,
        title: 'Define Share Classes',
        description: 'Determine if you need multiple share classes (common, preferred).',
        order: 2,
        actionType: 'INFO',
        actionData: {
          content: 'For most startups, a single class of common stock is sufficient. Preferred shares are typically issued during fundraising rounds.'
        },
      },
      {
        id: 'holdings-sha-3',
        questId: holdingsShareholderAgreement.id,
        title: 'Upload Executed Agreement',
        description: 'Upload the fully signed shareholder agreement.',
        order: 3,
        actionType: 'UPLOAD',
        requiresUpload: true,
      },
    ],
  });

  // Quest 3: Stock Certificates
  const holdingsStock = await prisma.corporateQuest.upsert({
    where: { id: 'holdings-stock-certificates' },
    update: {},
    create: {
      id: 'holdings-stock-certificates',
      entityId: holdings.id,
      title: 'Stock Certificates',
      description: 'Issue stock certificates to founders and maintain the stock ledger.',
      category: 'GOVERNANCE',
      order: 3,
      status: 'LOCKED',
      prerequisiteIds: ['holdings-shareholder-agreement'],
      xpReward: 200,
    },
  });

  await prisma.corporateQuestStep.createMany({
    skipDuplicates: true,
    data: [
      {
        id: 'holdings-stock-1',
        questId: holdingsStock.id,
        title: 'Review Stock Certificate Template',
        description: 'Review the stock certificate template format.',
        order: 1,
        actionType: 'TEMPLATE',
      },
      {
        id: 'holdings-stock-2',
        questId: holdingsStock.id,
        title: 'Create Stock Ledger',
        description: 'Set up the stock ledger to track all share issuances.',
        order: 2,
        actionType: 'TEMPLATE',
      },
      {
        id: 'holdings-stock-3',
        questId: holdingsStock.id,
        title: 'Issue Founder Shares',
        description: 'Issue stock certificates to founders based on ownership percentages.',
        order: 3,
        actionType: 'VERIFY',
      },
      {
        id: 'holdings-stock-4',
        questId: holdingsStock.id,
        title: 'Upload Stock Certificates',
        description: 'Upload copies of all issued stock certificates.',
        order: 4,
        actionType: 'UPLOAD',
        requiresUpload: true,
      },
    ],
  });

  // Quest 4: Bank Account
  const holdingsBank = await prisma.corporateQuest.upsert({
    where: { id: 'holdings-bank-account' },
    update: {},
    create: {
      id: 'holdings-bank-account',
      entityId: holdings.id,
      title: 'Treasury Vault',
      description: 'Open a business bank account for Holdings, Inc.',
      category: 'FINANCIAL',
      order: 4,
      status: 'AVAILABLE',
      xpReward: 200,
    },
  });

  await prisma.corporateQuestStep.createMany({
    skipDuplicates: true,
    data: [
      {
        id: 'holdings-bank-1',
        questId: holdingsBank.id,
        title: 'Gather Required Documents',
        description: 'Collect: Articles of Incorporation, EIN Letter, Bylaws, Board Resolution for banking.',
        order: 1,
        actionType: 'INFO',
        actionData: {
          checklist: [
            'Articles of Incorporation (certified copy)',
            'EIN Confirmation Letter (IRS CP 575)',
            'Corporate Bylaws',
            'Board Resolution authorizing bank account',
            'Photo ID of authorized signers'
          ]
        },
      },
      {
        id: 'holdings-bank-2',
        questId: holdingsBank.id,
        title: 'Open Business Checking Account',
        description: 'Visit bank or apply online to open the account.',
        order: 2,
        actionType: 'VERIFY',
      },
      {
        id: 'holdings-bank-3',
        questId: holdingsBank.id,
        title: 'Record Account Details',
        description: 'Securely record the account number and routing number.',
        order: 3,
        actionType: 'VERIFY',
      },
    ],
  });

  // Quest 5: Annual Meeting Setup
  const holdingsAnnualMeeting = await prisma.corporateQuest.upsert({
    where: { id: 'holdings-annual-meeting-setup' },
    update: {},
    create: {
      id: 'holdings-annual-meeting-setup',
      entityId: holdings.id,
      title: 'First Assembly',
      description: 'Set up the annual meeting schedule and create organizational minutes.',
      category: 'GOVERNANCE',
      order: 5,
      status: 'LOCKED',
      prerequisiteIds: ['holdings-bylaws'],
      xpReward: 250,
    },
  });

  await prisma.corporateQuestStep.createMany({
    skipDuplicates: true,
    data: [
      {
        id: 'holdings-meeting-1',
        questId: holdingsAnnualMeeting.id,
        title: 'Review Meeting Checklist',
        description: 'Understand what needs to be covered in organizational/annual meetings.',
        order: 1,
        actionType: 'INFO',
      },
      {
        id: 'holdings-meeting-2',
        questId: holdingsAnnualMeeting.id,
        title: 'Complete Organizational Minutes',
        description: 'Fill out the organizational meeting minutes template.',
        order: 2,
        actionType: 'TEMPLATE',
      },
      {
        id: 'holdings-meeting-3',
        questId: holdingsAnnualMeeting.id,
        title: 'Elect Officers',
        description: 'Document election of President, Secretary, and Treasurer.',
        order: 3,
        actionType: 'TEMPLATE',
      },
      {
        id: 'holdings-meeting-4',
        questId: holdingsAnnualMeeting.id,
        title: 'Upload Signed Minutes',
        description: 'Upload the signed organizational meeting minutes.',
        order: 4,
        actionType: 'UPLOAD',
        requiresUpload: true,
      },
    ],
  });

  console.log('✅ Created Holdings quests and steps');

  // ============================================================================
  // IP LLC FORMATION QUESTS
  // ============================================================================

  // Quest 1: Foundation (Choose Structure)
  const ipFoundation = await prisma.corporateQuest.upsert({
    where: { id: 'ip-foundation' },
    update: {},
    create: {
      id: 'ip-foundation',
      entityId: ipLlc.id,
      title: 'Foundation Stone',
      description: 'Choose Delaware LLC structure for IP protection with strongest charging order protection.',
      category: 'FORMATION',
      order: 1,
      status: 'AVAILABLE',
      xpReward: 100,
    },
  });

  await prisma.corporateQuestStep.createMany({
    skipDuplicates: true,
    data: [
      {
        id: 'ip-foundation-1',
        questId: ipFoundation.id,
        title: 'Understand IP LLC Purpose',
        description: 'Learn why a separate Delaware LLC protects intellectual property from operational liability.',
        order: 1,
        actionType: 'INFO',
        actionData: {
          content: 'The IP LLC holds all trademarks, software, and brand assets. Delaware offers the strongest charging order protection in the US, meaning creditors cannot seize LLC assets - they can only receive distributions IF they are made.'
        },
      },
      {
        id: 'ip-foundation-2',
        questId: ipFoundation.id,
        title: 'Confirm Delaware LLC',
        description: 'Confirm you will form a Delaware LLC for IP protection.',
        order: 2,
        actionType: 'VERIFY',
      },
    ],
  });

  // Quest 2: Name Reservation
  const ipNameReservation = await prisma.corporateQuest.upsert({
    where: { id: 'ip-name-reservation' },
    update: {},
    create: {
      id: 'ip-name-reservation',
      entityId: ipLlc.id,
      title: 'Name Your Vault',
      description: 'Reserve the name "Producer Tour IP LLC" with Delaware.',
      category: 'FORMATION',
      order: 2,
      status: 'LOCKED',
      prerequisiteIds: ['ip-foundation'],
      xpReward: 150,
    },
  });

  await prisma.corporateQuestStep.createMany({
    skipDuplicates: true,
    data: [
      {
        id: 'ip-name-1',
        questId: ipNameReservation.id,
        title: 'Search Name Availability',
        description: 'Search Delaware Division of Corporations for name availability.',
        order: 1,
        actionType: 'EXTERNAL_LINK',
        actionData: { url: 'https://icis.corp.delaware.gov/ecorp/entitysearch/namesearch.aspx' },
      },
      {
        id: 'ip-name-2',
        questId: ipNameReservation.id,
        title: 'Reserve Name via Bizee',
        description: 'Use Bizee to reserve the LLC name.',
        order: 2,
        actionType: 'EXTERNAL_LINK',
        actionData: { url: 'https://www.bizee.com' },
      },
      {
        id: 'ip-name-3',
        questId: ipNameReservation.id,
        title: 'Upload Confirmation',
        description: 'Upload name reservation confirmation.',
        order: 3,
        actionType: 'UPLOAD',
        requiresUpload: true,
      },
    ],
  });

  // Quest 3: Certificate of Formation
  const ipFormation = await prisma.corporateQuest.upsert({
    where: { id: 'ip-certificate-formation' },
    update: {},
    create: {
      id: 'ip-certificate-formation',
      entityId: ipLlc.id,
      title: 'Birth Certificate',
      description: 'File Certificate of Formation with Delaware Division of Corporations.',
      category: 'FORMATION',
      order: 3,
      status: 'LOCKED',
      prerequisiteIds: ['ip-name-reservation'],
      xpReward: 200,
    },
  });

  await prisma.corporateQuestStep.createMany({
    skipDuplicates: true,
    data: [
      {
        id: 'ip-formation-1',
        questId: ipFormation.id,
        title: 'Review Certificate Template',
        description: 'Review the Certificate of Formation template.',
        order: 1,
        actionType: 'TEMPLATE',
      },
      {
        id: 'ip-formation-2',
        questId: ipFormation.id,
        title: 'File with Delaware',
        description: 'File Certificate of Formation via Bizee or directly with Delaware.',
        order: 2,
        actionType: 'EXTERNAL_LINK',
        actionData: { url: 'https://corp.delaware.gov/howtoform/' },
      },
      {
        id: 'ip-formation-3',
        questId: ipFormation.id,
        title: 'Pay Filing Fee',
        description: 'Pay the $90 Delaware LLC filing fee.',
        order: 3,
        actionType: 'VERIFY',
      },
      {
        id: 'ip-formation-4',
        questId: ipFormation.id,
        title: 'Upload Filed Certificate',
        description: 'Upload the stamped Certificate of Formation.',
        order: 4,
        actionType: 'UPLOAD',
        requiresUpload: true,
      },
    ],
  });

  // Quest 4: EIN
  const ipEin = await prisma.corporateQuest.upsert({
    where: { id: 'ip-ein' },
    update: {},
    create: {
      id: 'ip-ein',
      entityId: ipLlc.id,
      title: 'Identity Papers',
      description: 'Apply for an Employer Identification Number (EIN) from the IRS.',
      category: 'FORMATION',
      order: 4,
      status: 'LOCKED',
      prerequisiteIds: ['ip-certificate-formation'],
      xpReward: 150,
    },
  });

  await prisma.corporateQuestStep.createMany({
    skipDuplicates: true,
    data: [
      {
        id: 'ip-ein-1',
        questId: ipEin.id,
        title: 'Gather Required Info',
        description: 'You\'ll need: LLC name, address, responsible party SSN, formation date.',
        order: 1,
        actionType: 'INFO',
      },
      {
        id: 'ip-ein-2',
        questId: ipEin.id,
        title: 'Apply for EIN Online',
        description: 'Complete IRS Form SS-4 online.',
        order: 2,
        actionType: 'EXTERNAL_LINK',
        actionData: { url: 'https://www.irs.gov/businesses/small-businesses-self-employed/apply-for-an-employer-identification-number-ein-online' },
      },
      {
        id: 'ip-ein-3',
        questId: ipEin.id,
        title: 'Upload EIN Letter',
        description: 'Upload the EIN confirmation letter (CP 575).',
        order: 3,
        actionType: 'UPLOAD',
        requiresUpload: true,
      },
    ],
  });

  // Quest 5: Operating Agreement
  const ipOperating = await prisma.corporateQuest.upsert({
    where: { id: 'ip-operating-agreement' },
    update: {},
    create: {
      id: 'ip-operating-agreement',
      entityId: ipLlc.id,
      title: 'The Laws of the Vault',
      description: 'Create Operating Agreement establishing Holdings as sole member.',
      category: 'GOVERNANCE',
      order: 5,
      status: 'LOCKED',
      prerequisiteIds: ['ip-ein'],
      xpReward: 200,
    },
  });

  await prisma.corporateQuestStep.createMany({
    skipDuplicates: true,
    data: [
      {
        id: 'ip-operating-1',
        questId: ipOperating.id,
        title: 'Review Operating Agreement Template',
        description: 'Review single-member LLC operating agreement template.',
        order: 1,
        actionType: 'TEMPLATE',
      },
      {
        id: 'ip-operating-2',
        questId: ipOperating.id,
        title: 'Customize for IP LLC',
        description: 'Add IP-specific provisions: asset protection, licensing rights, etc.',
        order: 2,
        actionType: 'TEMPLATE',
      },
      {
        id: 'ip-operating-3',
        questId: ipOperating.id,
        title: 'Upload Signed Agreement',
        description: 'Upload the executed operating agreement.',
        order: 3,
        actionType: 'UPLOAD',
        requiresUpload: true,
      },
    ],
  });

  console.log('✅ Created IP LLC formation quests');

  // ============================================================================
  // IP LLC GOVERNANCE QUESTS (after formation)
  // ============================================================================

  // Quest 6: IP Assignment Agreement (CRITICAL for music publishing)
  const ipAssignment = await prisma.corporateQuest.upsert({
    where: { id: 'ip-assignment-agreement' },
    update: {},
    create: {
      id: 'ip-assignment-agreement',
      entityId: ipLlc.id,
      title: 'IP Assignment Protocol',
      description: 'Transfer all intellectual property from Holdings to IP LLC for asset protection.',
      category: 'PROTECTION',
      order: 6,
      status: 'LOCKED',
      prerequisiteIds: ['ip-operating-agreement'],
      xpReward: 300,
    },
  });

  await prisma.corporateQuestStep.createMany({
    skipDuplicates: true,
    data: [
      {
        id: 'ip-assignment-1',
        questId: ipAssignment.id,
        title: 'Identify All IP Assets',
        description: 'List all intellectual property: trademarks, software code, brand assets, domain names, publishing rights.',
        order: 1,
        actionType: 'INFO',
        actionData: {
          checklist: [
            'Trademarks (Producer Tour name, logo)',
            'Domain names (producertour.com, etc.)',
            'Software/code repositories',
            'Publishing catalog and copyrights',
            'Brand guidelines and design assets',
            'Social media accounts',
          ],
        },
      },
      {
        id: 'ip-assignment-2',
        questId: ipAssignment.id,
        title: 'Review IP Assignment Template',
        description: 'Review the IP Assignment Agreement that transfers all IP from Holdings to IP LLC.',
        order: 2,
        actionType: 'TEMPLATE',
        actionData: { templateName: 'IP Assignment Agreement' },
      },
      {
        id: 'ip-assignment-3',
        questId: ipAssignment.id,
        title: 'Execute Assignment Agreement',
        description: 'Have Holdings (as assignor) sign the assignment to IP LLC (as assignee).',
        order: 3,
        actionType: 'VERIFY',
      },
      {
        id: 'ip-assignment-4',
        questId: ipAssignment.id,
        title: 'Upload Executed Assignment',
        description: 'Upload the fully executed IP Assignment Agreement.',
        order: 4,
        actionType: 'UPLOAD',
        requiresUpload: true,
      },
    ],
  });

  // Quest 7: Trademark Registration
  const ipTrademark = await prisma.corporateQuest.upsert({
    where: { id: 'ip-trademark' },
    update: {},
    create: {
      id: 'ip-trademark',
      entityId: ipLlc.id,
      title: 'Mark Your Territory',
      description: 'Register Producer Tour trademarks with USPTO for federal protection.',
      category: 'PROTECTION',
      order: 7,
      status: 'LOCKED',
      prerequisiteIds: ['ip-assignment-agreement'],
      xpReward: 250,
    },
  });

  await prisma.corporateQuestStep.createMany({
    skipDuplicates: true,
    data: [
      {
        id: 'ip-trademark-1',
        questId: ipTrademark.id,
        title: 'Conduct Trademark Search',
        description: 'Search USPTO TESS database for conflicting marks.',
        order: 1,
        actionType: 'EXTERNAL_LINK',
        actionData: { url: 'https://tmsearch.uspto.gov/' },
      },
      {
        id: 'ip-trademark-2',
        questId: ipTrademark.id,
        title: 'Identify Classes',
        description: 'Determine the Nice Classification classes for your goods/services.',
        order: 2,
        actionType: 'INFO',
        actionData: {
          content: 'Music publishing typically falls under Class 41 (Entertainment services) and Class 9 (Recorded music). Brand merchandise may require additional classes.',
        },
      },
      {
        id: 'ip-trademark-3',
        questId: ipTrademark.id,
        title: 'File Trademark Application',
        description: 'File application via USPTO TEAS system. Filing fee ~$250-350 per class.',
        order: 3,
        actionType: 'EXTERNAL_LINK',
        actionData: { url: 'https://www.uspto.gov/trademarks/apply' },
      },
      {
        id: 'ip-trademark-4',
        questId: ipTrademark.id,
        title: 'Upload Application Receipt',
        description: 'Upload the USPTO filing receipt with serial number.',
        order: 4,
        actionType: 'UPLOAD',
        requiresUpload: true,
      },
    ],
  });

  // Quest 8: IP LLC Bank Account
  const ipBank = await prisma.corporateQuest.upsert({
    where: { id: 'ip-bank-account' },
    update: {},
    create: {
      id: 'ip-bank-account',
      entityId: ipLlc.id,
      title: 'Vault Treasury',
      description: 'Open bank account for IP LLC to receive licensing royalties.',
      category: 'FINANCIAL',
      order: 8,
      status: 'LOCKED',
      prerequisiteIds: ['ip-ein'],
      xpReward: 150,
    },
  });

  await prisma.corporateQuestStep.createMany({
    skipDuplicates: true,
    data: [
      {
        id: 'ip-bank-1',
        questId: ipBank.id,
        title: 'Gather Required Documents',
        description: 'Collect Certificate of Formation, EIN letter, Operating Agreement.',
        order: 1,
        actionType: 'INFO',
        actionData: {
          checklist: [
            'Certificate of Formation (certified)',
            'EIN Confirmation Letter',
            'Operating Agreement',
            'Manager/Member Resolution for banking',
          ],
        },
      },
      {
        id: 'ip-bank-2',
        questId: ipBank.id,
        title: 'Open Business Account',
        description: 'Open business checking account at chosen bank.',
        order: 2,
        actionType: 'VERIFY',
      },
      {
        id: 'ip-bank-3',
        questId: ipBank.id,
        title: 'Record Account Details',
        description: 'Securely record routing and account numbers.',
        order: 3,
        actionType: 'VERIFY',
      },
    ],
  });

  // Quest 9: IP Licensing Agreement (to Operating LLC)
  const ipLicensing = await prisma.corporateQuest.upsert({
    where: { id: 'ip-licensing-agreement' },
    update: {},
    create: {
      id: 'ip-licensing-agreement',
      entityId: ipLlc.id,
      title: 'License to Operate',
      description: 'Create licensing agreement for PT LLC to use Producer Tour IP.',
      category: 'GOVERNANCE',
      order: 9,
      status: 'LOCKED',
      prerequisiteIds: ['ip-assignment-agreement'],
      xpReward: 200,
    },
  });

  await prisma.corporateQuestStep.createMany({
    skipDuplicates: true,
    data: [
      {
        id: 'ip-licensing-1',
        questId: ipLicensing.id,
        title: 'Understand Licensing Structure',
        description: 'Learn how IP licensing creates additional liability protection and tax benefits.',
        order: 1,
        actionType: 'INFO',
        actionData: {
          content: 'By licensing IP to operating entities, you create arm\'s-length transactions that: (1) further separate IP from operational liability, (2) allow royalty payments that can be deducted by the operating LLC, (3) establish clear ownership trails.',
        },
      },
      {
        id: 'ip-licensing-2',
        questId: ipLicensing.id,
        title: 'Review License Agreement Template',
        description: 'Review the IP License Agreement template.',
        order: 2,
        actionType: 'TEMPLATE',
        actionData: { templateName: 'IP License Agreement' },
      },
      {
        id: 'ip-licensing-3',
        questId: ipLicensing.id,
        title: 'Set Reasonable Royalty Rate',
        description: 'Determine arms-length royalty rate (typically 5-15% of revenue).',
        order: 3,
        actionType: 'INFO',
        actionData: {
          content: 'For music publishing, typical licensing rates are 8-12% of gross revenue. Document your methodology to support the rate if audited.',
        },
      },
      {
        id: 'ip-licensing-4',
        questId: ipLicensing.id,
        title: 'Upload Executed License',
        description: 'Upload the signed license agreement.',
        order: 4,
        actionType: 'UPLOAD',
        requiresUpload: true,
      },
    ],
  });

  console.log('✅ Created IP LLC governance quests');

  // ============================================================================
  // COMPLIANCE ITEMS FOR HOLDINGS
  // ============================================================================

  await prisma.complianceItem.createMany({
    skipDuplicates: true,
    data: [
      {
        id: 'holdings-franchise-tax',
        entityId: holdings.id,
        title: 'Delaware Franchise Tax',
        description: 'Annual franchise tax filing due March 1st. Calculate using authorized shares method.',
        frequency: 'ANNUAL',
        dueDate: new Date('2025-03-01'),
        reminderDays: 60,
        status: 'UPCOMING',
      },
      {
        id: 'holdings-annual-report',
        entityId: holdings.id,
        title: 'Delaware Annual Report',
        description: 'File annual report with Delaware Division of Corporations.',
        frequency: 'ANNUAL',
        dueDate: new Date('2025-03-01'),
        reminderDays: 60,
        status: 'UPCOMING',
      },
      {
        id: 'holdings-annual-meeting',
        entityId: holdings.id,
        title: 'Annual Shareholder Meeting',
        description: 'Hold annual meeting and document minutes per bylaws.',
        frequency: 'ANNUAL',
        dueDate: new Date('2025-12-15'),
        reminderDays: 30,
        status: 'UPCOMING',
      },
      {
        id: 'holdings-board-meeting',
        entityId: holdings.id,
        title: 'Board Meeting',
        description: 'Quarterly board meeting to review financials and operations.',
        frequency: 'QUARTERLY',
        dueDate: new Date('2025-03-31'),
        reminderDays: 14,
        status: 'UPCOMING',
      },
    ],
  });

  console.log('✅ Created Holdings compliance items');

  // ============================================================================
  // PT LLC (PRODUCER TOUR LLC) - COMPLETE QUEST CHAIN
  // Florida LLC for client administration, publishing administration
  // ============================================================================

  // Quest 1: Foundation Stone
  const ptFoundation = await prisma.corporateQuest.upsert({
    where: { id: 'pt-foundation' },
    update: {},
    create: {
      id: 'pt-foundation',
      entityId: ptLlc.id,
      title: 'Foundation Stone',
      description: 'Understand why PT LLC exists: client-facing administration, publishing services, and trust accounting.',
      category: 'FORMATION',
      order: 1,
      status: 'AVAILABLE',
      xpReward: 100,
    },
  });

  await prisma.corporateQuestStep.createMany({
    skipDuplicates: true,
    data: [
      {
        id: 'pt-foundation-1',
        questId: ptFoundation.id,
        title: 'Understand PT LLC Purpose',
        description: 'Learn why a separate operating LLC protects Holdings from client-related liability.',
        order: 1,
        actionType: 'INFO',
        actionData: {
          content: 'PT LLC is the client-facing entity that handles publishing administration, artist relations, and royalty collection. By separating this from Holdings, any lawsuits from clients or disputes cannot reach Holdings or the IP assets. This is called liability compartmentalization.',
        },
      },
      {
        id: 'pt-foundation-2',
        questId: ptFoundation.id,
        title: 'Understand Trust Accounting Requirements',
        description: 'Music publishers must hold client royalties in trust - learn the legal requirements.',
        order: 2,
        actionType: 'INFO',
        actionData: {
          content: 'As a music publisher, you hold client money (royalties) in trust. Florida law and industry standards require: (1) Separate trust account for client funds, (2) Never commingling with operating funds, (3) Quarterly statements to clients, (4) Clear records of all receipts and disbursements.',
        },
      },
      {
        id: 'pt-foundation-3',
        questId: ptFoundation.id,
        title: 'Confirm Florida LLC Structure',
        description: 'Confirm Florida as jurisdiction for physical presence and client operations.',
        order: 3,
        actionType: 'VERIFY',
      },
    ],
  });

  // Quest 2: Name Reservation
  const ptNameReservation = await prisma.corporateQuest.upsert({
    where: { id: 'pt-name-reservation' },
    update: {},
    create: {
      id: 'pt-name-reservation',
      entityId: ptLlc.id,
      title: 'Claim Your Territory',
      description: 'Reserve "Producer Tour LLC" with Florida Division of Corporations.',
      category: 'FORMATION',
      order: 2,
      status: 'LOCKED',
      prerequisiteIds: ['pt-foundation'],
      xpReward: 150,
    },
  });

  await prisma.corporateQuestStep.createMany({
    skipDuplicates: true,
    data: [
      {
        id: 'pt-name-1',
        questId: ptNameReservation.id,
        title: 'Search Florida Name Availability',
        description: 'Search Sunbiz for name availability in Florida.',
        order: 1,
        actionType: 'EXTERNAL_LINK',
        actionData: { url: 'https://dos.myflorida.com/sunbiz/search/' },
      },
      {
        id: 'pt-name-2',
        questId: ptNameReservation.id,
        title: 'Reserve Name (Optional)',
        description: 'Optionally reserve name for 120 days ($25 fee) or proceed directly to filing.',
        order: 2,
        actionType: 'EXTERNAL_LINK',
        actionData: { url: 'https://dos.myflorida.com/sunbiz/manage-business/efile/fl-llc/' },
      },
      {
        id: 'pt-name-3',
        questId: ptNameReservation.id,
        title: 'Confirm Name Decision',
        description: 'Confirm the exact LLC name to use for filing.',
        order: 3,
        actionType: 'VERIFY',
      },
    ],
  });

  // Quest 3: Articles of Organization
  const ptFormation = await prisma.corporateQuest.upsert({
    where: { id: 'pt-articles-organization' },
    update: {},
    create: {
      id: 'pt-articles-organization',
      entityId: ptLlc.id,
      title: 'Birth Certificate',
      description: 'File Articles of Organization with Florida Division of Corporations.',
      category: 'FORMATION',
      order: 3,
      status: 'LOCKED',
      prerequisiteIds: ['pt-name-reservation'],
      xpReward: 200,
    },
  });

  await prisma.corporateQuestStep.createMany({
    skipDuplicates: true,
    data: [
      {
        id: 'pt-formation-1',
        questId: ptFormation.id,
        title: 'Prepare Filing Information',
        description: 'Gather: LLC name, principal address, registered agent, member/manager info.',
        order: 1,
        actionType: 'INFO',
        actionData: {
          checklist: [
            'LLC name: Producer Tour LLC',
            'Principal address in Florida',
            'Registered agent (can be Bizee or yourself if FL resident)',
            'Holdings, Inc. as sole member',
            'Management structure: Member-managed',
          ],
        },
      },
      {
        id: 'pt-formation-2',
        questId: ptFormation.id,
        title: 'File Online via Sunbiz',
        description: 'File Articles of Organization online. Fee: $125 + $25 registered agent.',
        order: 2,
        actionType: 'EXTERNAL_LINK',
        actionData: { url: 'https://dos.myflorida.com/sunbiz/manage-business/efile/fl-llc/' },
      },
      {
        id: 'pt-formation-3',
        questId: ptFormation.id,
        title: 'Pay Filing Fees',
        description: 'Complete payment for Florida LLC filing ($125) plus optional fees.',
        order: 3,
        actionType: 'VERIFY',
      },
      {
        id: 'pt-formation-4',
        questId: ptFormation.id,
        title: 'Upload Filed Articles',
        description: 'Upload the stamped Articles of Organization from Florida.',
        order: 4,
        actionType: 'UPLOAD',
        requiresUpload: true,
      },
    ],
  });

  // Quest 4: EIN Application
  const ptEin = await prisma.corporateQuest.upsert({
    where: { id: 'pt-ein' },
    update: {},
    create: {
      id: 'pt-ein',
      entityId: ptLlc.id,
      title: 'Identity Papers',
      description: 'Apply for an Employer Identification Number (EIN) from the IRS.',
      category: 'FORMATION',
      order: 4,
      status: 'LOCKED',
      prerequisiteIds: ['pt-articles-organization'],
      xpReward: 150,
    },
  });

  await prisma.corporateQuestStep.createMany({
    skipDuplicates: true,
    data: [
      {
        id: 'pt-ein-1',
        questId: ptEin.id,
        title: 'Gather Required Information',
        description: 'You need: LLC name, address, formation date, responsible party SSN.',
        order: 1,
        actionType: 'INFO',
        actionData: {
          checklist: [
            'Legal name: Producer Tour LLC',
            'Florida address',
            'Formation date from Articles',
            'Responsible party name and SSN',
            'Select: Disregarded entity (single-member)',
          ],
        },
      },
      {
        id: 'pt-ein-2',
        questId: ptEin.id,
        title: 'Apply Online via IRS',
        description: 'Complete Form SS-4 online to receive EIN immediately.',
        order: 2,
        actionType: 'EXTERNAL_LINK',
        actionData: { url: 'https://www.irs.gov/businesses/small-businesses-self-employed/apply-for-an-employer-identification-number-ein-online' },
      },
      {
        id: 'pt-ein-3',
        questId: ptEin.id,
        title: 'Upload EIN Confirmation',
        description: 'Upload the EIN confirmation letter (CP 575).',
        order: 3,
        actionType: 'UPLOAD',
        requiresUpload: true,
      },
    ],
  });

  // Quest 5: Operating Agreement
  const ptOperating = await prisma.corporateQuest.upsert({
    where: { id: 'pt-operating-agreement' },
    update: {},
    create: {
      id: 'pt-operating-agreement',
      entityId: ptLlc.id,
      title: 'The Laws of the Bridge',
      description: 'Create Operating Agreement establishing Holdings as sole member with publishing-specific provisions.',
      category: 'GOVERNANCE',
      order: 5,
      status: 'LOCKED',
      prerequisiteIds: ['pt-ein'],
      xpReward: 200,
    },
  });

  await prisma.corporateQuestStep.createMany({
    skipDuplicates: true,
    data: [
      {
        id: 'pt-operating-1',
        questId: ptOperating.id,
        title: 'Review Operating Agreement Template',
        description: 'Review single-member LLC operating agreement with publishing addendum.',
        order: 1,
        actionType: 'TEMPLATE',
        actionData: { templateName: 'Single Member LLC Operating Agreement' },
      },
      {
        id: 'pt-operating-2',
        questId: ptOperating.id,
        title: 'Add Publishing Provisions',
        description: 'Include provisions for: trust accounting, client confidentiality, fiduciary duties.',
        order: 2,
        actionType: 'INFO',
        actionData: {
          content: 'Publishing-specific provisions should include: (1) Requirement to maintain separate trust accounts, (2) Client confidentiality obligations, (3) Fiduciary duty acknowledgment, (4) Audit rights, (5) Record retention requirements (7+ years).',
        },
      },
      {
        id: 'pt-operating-3',
        questId: ptOperating.id,
        title: 'Upload Signed Agreement',
        description: 'Upload the executed operating agreement.',
        order: 3,
        actionType: 'UPLOAD',
        requiresUpload: true,
      },
    ],
  });

  // Quest 6: Business Bank Account
  const ptBank = await prisma.corporateQuest.upsert({
    where: { id: 'pt-bank-account' },
    update: {},
    create: {
      id: 'pt-bank-account',
      entityId: ptLlc.id,
      title: 'Operating Treasury',
      description: 'Open operating bank account for PT LLC business expenses.',
      category: 'FINANCIAL',
      order: 6,
      status: 'LOCKED',
      prerequisiteIds: ['pt-operating-agreement'],
      xpReward: 150,
    },
  });

  await prisma.corporateQuestStep.createMany({
    skipDuplicates: true,
    data: [
      {
        id: 'pt-bank-1',
        questId: ptBank.id,
        title: 'Gather Banking Documents',
        description: 'Collect all required documents for business account.',
        order: 1,
        actionType: 'INFO',
        actionData: {
          checklist: [
            'Articles of Organization (stamped)',
            'EIN Confirmation Letter',
            'Operating Agreement',
            'Manager Resolution for banking',
            'Government ID of authorized signers',
          ],
        },
      },
      {
        id: 'pt-bank-2',
        questId: ptBank.id,
        title: 'Open Operating Account',
        description: 'Open business checking account for operating expenses.',
        order: 2,
        actionType: 'VERIFY',
      },
      {
        id: 'pt-bank-3',
        questId: ptBank.id,
        title: 'Record Account Information',
        description: 'Securely document account and routing numbers.',
        order: 3,
        actionType: 'VERIFY',
      },
    ],
  });

  // Quest 7: Trust Account Setup (CRITICAL for Publishing)
  const ptTrustAccount = await prisma.corporateQuest.upsert({
    where: { id: 'pt-trust-account' },
    update: {},
    create: {
      id: 'pt-trust-account',
      entityId: ptLlc.id,
      title: 'Client Trust Vault',
      description: 'Open separate trust account for holding client royalties - legally required for publishers.',
      category: 'FINANCIAL',
      order: 7,
      status: 'LOCKED',
      prerequisiteIds: ['pt-bank-account'],
      xpReward: 250,
    },
  });

  await prisma.corporateQuestStep.createMany({
    skipDuplicates: true,
    data: [
      {
        id: 'pt-trust-1',
        questId: ptTrustAccount.id,
        title: 'Understand Trust Account Requirements',
        description: 'Learn the legal requirements for holding client funds in trust.',
        order: 1,
        actionType: 'INFO',
        actionData: {
          content: 'As a music publisher, you are a fiduciary holding client money. CRITICAL RULES: (1) Trust funds must NEVER be commingled with operating funds, (2) Interest earned may belong to clients depending on agreement, (3) Quarterly accounting required, (4) Funds must be readily available for distribution.',
        },
      },
      {
        id: 'pt-trust-2',
        questId: ptTrustAccount.id,
        title: 'Open Trust/IOLTA Account',
        description: 'Open a separate trust account or IOLTA-style account for client funds.',
        order: 2,
        actionType: 'INFO',
        actionData: {
          content: 'Name the account: "Producer Tour LLC Client Trust Account" or similar. Some banks offer special trust/escrow accounts with additional protections and reporting.',
        },
      },
      {
        id: 'pt-trust-3',
        questId: ptTrustAccount.id,
        title: 'Set Up Trust Accounting System',
        description: 'Implement accounting system to track individual client balances.',
        order: 3,
        actionType: 'VERIFY',
      },
      {
        id: 'pt-trust-4',
        questId: ptTrustAccount.id,
        title: 'Confirm Trust Account Active',
        description: 'Verify trust account is open and ready to receive royalties.',
        order: 4,
        actionType: 'VERIFY',
      },
    ],
  });

  // Quest 8: Publishing Administration Agreement Template
  const ptPublishingAgreement = await prisma.corporateQuest.upsert({
    where: { id: 'pt-publishing-agreement' },
    update: {},
    create: {
      id: 'pt-publishing-agreement',
      entityId: ptLlc.id,
      title: 'Client Covenant Template',
      description: 'Create standard publishing administration agreement for client signings.',
      category: 'GOVERNANCE',
      order: 8,
      status: 'LOCKED',
      prerequisiteIds: ['pt-operating-agreement'],
      xpReward: 200,
    },
  });

  await prisma.corporateQuestStep.createMany({
    skipDuplicates: true,
    data: [
      {
        id: 'pt-pub-1',
        questId: ptPublishingAgreement.id,
        title: 'Review Standard Terms',
        description: 'Review industry-standard publishing administration agreement terms.',
        order: 1,
        actionType: 'INFO',
        actionData: {
          content: 'Key terms to include: (1) Administration fee percentage (typically 10-25%), (2) Territory (usually worldwide), (3) Term length and renewal, (4) Rights granted (sync, mechanical, performance), (5) Accounting periods (quarterly), (6) Audit rights, (7) Termination provisions.',
        },
      },
      {
        id: 'pt-pub-2',
        questId: ptPublishingAgreement.id,
        title: 'Customize Agreement Template',
        description: 'Customize the template with Producer Tour specific terms.',
        order: 2,
        actionType: 'TEMPLATE',
        actionData: { templateName: 'Publishing Administration Agreement' },
      },
      {
        id: 'pt-pub-3',
        questId: ptPublishingAgreement.id,
        title: 'Legal Review',
        description: 'Have an entertainment attorney review the final template.',
        order: 3,
        actionType: 'VERIFY',
      },
      {
        id: 'pt-pub-4',
        questId: ptPublishingAgreement.id,
        title: 'Upload Final Template',
        description: 'Upload the attorney-approved agreement template.',
        order: 4,
        actionType: 'UPLOAD',
        requiresUpload: true,
      },
    ],
  });

  // Quest 9: PRO Registration
  const ptProRegistration = await prisma.corporateQuest.upsert({
    where: { id: 'pt-pro-registration' },
    update: {},
    create: {
      id: 'pt-pro-registration',
      entityId: ptLlc.id,
      title: 'Join the Alliance',
      description: 'Register PT LLC as a publisher with BMI, ASCAP, and/or SESAC.',
      category: 'COMPLIANCE',
      order: 9,
      status: 'LOCKED',
      prerequisiteIds: ['pt-ein', 'pt-operating-agreement'],
      xpReward: 200,
    },
  });

  await prisma.corporateQuestStep.createMany({
    skipDuplicates: true,
    data: [
      {
        id: 'pt-pro-1',
        questId: ptProRegistration.id,
        title: 'Choose PRO Affiliations',
        description: 'Decide which PROs to register with based on your catalog.',
        order: 1,
        actionType: 'INFO',
        actionData: {
          content: 'Most publishers register with multiple PROs to match their writers: BMI, ASCAP, and SESAC are the main US PROs. ASCAP requires $50 one-time fee, BMI is free for publishers, SESAC is invitation-only. You may need all three depending on your writers\' affiliations.',
        },
      },
      {
        id: 'pt-pro-2',
        questId: ptProRegistration.id,
        title: 'Register with BMI',
        description: 'Complete BMI publisher registration (free).',
        order: 2,
        actionType: 'EXTERNAL_LINK',
        actionData: { url: 'https://www.bmi.com/join/publisher' },
      },
      {
        id: 'pt-pro-3',
        questId: ptProRegistration.id,
        title: 'Register with ASCAP',
        description: 'Complete ASCAP publisher registration ($50 one-time).',
        order: 3,
        actionType: 'EXTERNAL_LINK',
        actionData: { url: 'https://www.ascap.com/become-a-member' },
      },
      {
        id: 'pt-pro-4',
        questId: ptProRegistration.id,
        title: 'Upload PRO Confirmations',
        description: 'Upload publisher membership confirmations from each PRO.',
        order: 4,
        actionType: 'UPLOAD',
        requiresUpload: true,
      },
    ],
  });

  // Quest 10: MLC Registration
  const ptMlcRegistration = await prisma.corporateQuest.upsert({
    where: { id: 'pt-mlc-registration' },
    update: {},
    create: {
      id: 'pt-mlc-registration',
      entityId: ptLlc.id,
      title: 'Mechanical Alliance',
      description: 'Register with The Mechanical Licensing Collective (MLC) for streaming mechanicals.',
      category: 'COMPLIANCE',
      order: 10,
      status: 'LOCKED',
      prerequisiteIds: ['pt-pro-registration'],
      xpReward: 150,
    },
  });

  await prisma.corporateQuestStep.createMany({
    skipDuplicates: true,
    data: [
      {
        id: 'pt-mlc-1',
        questId: ptMlcRegistration.id,
        title: 'Understand MLC Role',
        description: 'Learn how the MLC collects streaming mechanical royalties.',
        order: 1,
        actionType: 'INFO',
        actionData: {
          content: 'The MLC was created by the Music Modernization Act (2018) to collect and distribute mechanical royalties from streaming services (Spotify, Apple Music, etc.). Registration is FREE and required to collect these royalties.',
        },
      },
      {
        id: 'pt-mlc-2',
        questId: ptMlcRegistration.id,
        title: 'Register as Publisher',
        description: 'Create publisher account with The MLC.',
        order: 2,
        actionType: 'EXTERNAL_LINK',
        actionData: { url: 'https://www.themlc.com/register' },
      },
      {
        id: 'pt-mlc-3',
        questId: ptMlcRegistration.id,
        title: 'Upload MLC Confirmation',
        description: 'Upload publisher registration confirmation from The MLC.',
        order: 3,
        actionType: 'UPLOAD',
        requiresUpload: true,
      },
    ],
  });

  console.log('✅ Created PT LLC complete quest chain (10 quests)');

  // ============================================================================
  // OPS LLC - COMPLETE QUEST CHAIN
  // Florida LLC for operations, employees, and day-to-day business
  // ============================================================================

  // Quest 1: Foundation Stone
  const opsFoundation = await prisma.corporateQuest.upsert({
    where: { id: 'ops-foundation' },
    update: {},
    create: {
      id: 'ops-foundation',
      entityId: opsLlc.id,
      title: 'Foundation Stone',
      description: 'Understand why Ops LLC handles employees, contractors, and operational risk.',
      category: 'FORMATION',
      order: 1,
      status: 'AVAILABLE',
      xpReward: 100,
    },
  });

  await prisma.corporateQuestStep.createMany({
    skipDuplicates: true,
    data: [
      {
        id: 'ops-foundation-1',
        questId: opsFoundation.id,
        title: 'Understand Ops LLC Purpose',
        description: 'Learn why separating employees/operations protects other entities.',
        order: 1,
        actionType: 'INFO',
        actionData: {
          content: 'Ops LLC holds all employment relationships, leases, and operational contracts. Employment claims (wrongful termination, discrimination, injury) are some of the highest-risk areas for businesses. By isolating these in Ops LLC, a lawsuit cannot reach Holdings, IP, or client funds.',
        },
      },
      {
        id: 'ops-foundation-2',
        questId: opsFoundation.id,
        title: 'Review Ops LLC Responsibilities',
        description: 'Understand what this entity will handle.',
        order: 2,
        actionType: 'INFO',
        actionData: {
          checklist: [
            'All W-2 employees',
            'Contractor payments (1099s)',
            'Office lease (if any)',
            'Equipment and software subscriptions',
            'Insurance policies',
            'Day-to-day vendor relationships',
          ],
        },
      },
      {
        id: 'ops-foundation-3',
        questId: opsFoundation.id,
        title: 'Confirm Florida LLC',
        description: 'Confirm Florida jurisdiction for operations.',
        order: 3,
        actionType: 'VERIFY',
      },
    ],
  });

  // Quest 2: Name Reservation
  const opsNameReservation = await prisma.corporateQuest.upsert({
    where: { id: 'ops-name-reservation' },
    update: {},
    create: {
      id: 'ops-name-reservation',
      entityId: opsLlc.id,
      title: 'Claim Your Factory',
      description: 'Reserve "Producer Tour Ops LLC" with Florida Division of Corporations.',
      category: 'FORMATION',
      order: 2,
      status: 'LOCKED',
      prerequisiteIds: ['ops-foundation'],
      xpReward: 150,
    },
  });

  await prisma.corporateQuestStep.createMany({
    skipDuplicates: true,
    data: [
      {
        id: 'ops-name-1',
        questId: opsNameReservation.id,
        title: 'Search Florida Name Availability',
        description: 'Confirm "Producer Tour Ops LLC" is available on Sunbiz.',
        order: 1,
        actionType: 'EXTERNAL_LINK',
        actionData: { url: 'https://dos.myflorida.com/sunbiz/search/' },
      },
      {
        id: 'ops-name-2',
        questId: opsNameReservation.id,
        title: 'Confirm Name Decision',
        description: 'Confirm the exact LLC name to use.',
        order: 2,
        actionType: 'VERIFY',
      },
    ],
  });

  // Quest 3: Articles of Organization
  const opsFormation = await prisma.corporateQuest.upsert({
    where: { id: 'ops-articles-organization' },
    update: {},
    create: {
      id: 'ops-articles-organization',
      entityId: opsLlc.id,
      title: 'Factory Birth Certificate',
      description: 'File Articles of Organization with Florida Division of Corporations.',
      category: 'FORMATION',
      order: 3,
      status: 'LOCKED',
      prerequisiteIds: ['ops-name-reservation'],
      xpReward: 200,
    },
  });

  await prisma.corporateQuestStep.createMany({
    skipDuplicates: true,
    data: [
      {
        id: 'ops-formation-1',
        questId: opsFormation.id,
        title: 'Prepare Filing Information',
        description: 'Gather required information for Florida LLC filing.',
        order: 1,
        actionType: 'INFO',
        actionData: {
          checklist: [
            'LLC name: Producer Tour Ops LLC',
            'Principal address in Florida',
            'Registered agent',
            'Holdings, Inc. as sole member',
            'Member-managed structure',
          ],
        },
      },
      {
        id: 'ops-formation-2',
        questId: opsFormation.id,
        title: 'File via Sunbiz',
        description: 'File Articles of Organization online. Fee: $125.',
        order: 2,
        actionType: 'EXTERNAL_LINK',
        actionData: { url: 'https://dos.myflorida.com/sunbiz/manage-business/efile/fl-llc/' },
      },
      {
        id: 'ops-formation-3',
        questId: opsFormation.id,
        title: 'Upload Filed Articles',
        description: 'Upload the stamped Articles of Organization.',
        order: 3,
        actionType: 'UPLOAD',
        requiresUpload: true,
      },
    ],
  });

  // Quest 4: EIN Application
  const opsEin = await prisma.corporateQuest.upsert({
    where: { id: 'ops-ein' },
    update: {},
    create: {
      id: 'ops-ein',
      entityId: opsLlc.id,
      title: 'Factory Identity',
      description: 'Apply for EIN - required for payroll and employee tax withholding.',
      category: 'FORMATION',
      order: 4,
      status: 'LOCKED',
      prerequisiteIds: ['ops-articles-organization'],
      xpReward: 150,
    },
  });

  await prisma.corporateQuestStep.createMany({
    skipDuplicates: true,
    data: [
      {
        id: 'ops-ein-1',
        questId: opsEin.id,
        title: 'Gather Required Information',
        description: 'Prepare information for IRS SS-4 form.',
        order: 1,
        actionType: 'INFO',
        actionData: {
          checklist: [
            'Legal name: Producer Tour Ops LLC',
            'Florida address',
            'Formation date',
            'Responsible party SSN',
            'Check: Will have employees (even if later)',
          ],
        },
      },
      {
        id: 'ops-ein-2',
        questId: opsEin.id,
        title: 'Apply for EIN Online',
        description: 'Complete IRS Form SS-4 online.',
        order: 2,
        actionType: 'EXTERNAL_LINK',
        actionData: { url: 'https://www.irs.gov/businesses/small-businesses-self-employed/apply-for-an-employer-identification-number-ein-online' },
      },
      {
        id: 'ops-ein-3',
        questId: opsEin.id,
        title: 'Upload EIN Confirmation',
        description: 'Upload the EIN confirmation letter.',
        order: 3,
        actionType: 'UPLOAD',
        requiresUpload: true,
      },
    ],
  });

  // Quest 5: Operating Agreement
  const opsOperating = await prisma.corporateQuest.upsert({
    where: { id: 'ops-operating-agreement' },
    update: {},
    create: {
      id: 'ops-operating-agreement',
      entityId: opsLlc.id,
      title: 'Factory Bylaws',
      description: 'Create Operating Agreement with employment and contractor provisions.',
      category: 'GOVERNANCE',
      order: 5,
      status: 'LOCKED',
      prerequisiteIds: ['ops-ein'],
      xpReward: 200,
    },
  });

  await prisma.corporateQuestStep.createMany({
    skipDuplicates: true,
    data: [
      {
        id: 'ops-operating-1',
        questId: opsOperating.id,
        title: 'Review Operating Agreement Template',
        description: 'Review single-member LLC operating agreement template.',
        order: 1,
        actionType: 'TEMPLATE',
        actionData: { templateName: 'Ops LLC Operating Agreement' },
      },
      {
        id: 'ops-operating-2',
        questId: opsOperating.id,
        title: 'Add Operations Provisions',
        description: 'Include provisions for: employment authority, contractor engagement, lease authority.',
        order: 2,
        actionType: 'INFO',
        actionData: {
          content: 'Key provisions: (1) Authority to hire/fire employees, (2) Spending limits requiring member approval, (3) Lease execution authority, (4) Insurance requirements, (5) Indemnification from Holdings.',
        },
      },
      {
        id: 'ops-operating-3',
        questId: opsOperating.id,
        title: 'Upload Signed Agreement',
        description: 'Upload the executed operating agreement.',
        order: 3,
        actionType: 'UPLOAD',
        requiresUpload: true,
      },
    ],
  });

  // Quest 6: Bank Account
  const opsBank = await prisma.corporateQuest.upsert({
    where: { id: 'ops-bank-account' },
    update: {},
    create: {
      id: 'ops-bank-account',
      entityId: opsLlc.id,
      title: 'Factory Treasury',
      description: 'Open business bank account for operational expenses and payroll.',
      category: 'FINANCIAL',
      order: 6,
      status: 'LOCKED',
      prerequisiteIds: ['ops-operating-agreement'],
      xpReward: 150,
    },
  });

  await prisma.corporateQuestStep.createMany({
    skipDuplicates: true,
    data: [
      {
        id: 'ops-bank-1',
        questId: opsBank.id,
        title: 'Gather Banking Documents',
        description: 'Collect required documents for business account.',
        order: 1,
        actionType: 'INFO',
        actionData: {
          checklist: [
            'Articles of Organization',
            'EIN Confirmation Letter',
            'Operating Agreement',
            'Manager Resolution',
            'Photo ID',
          ],
        },
      },
      {
        id: 'ops-bank-2',
        questId: opsBank.id,
        title: 'Open Business Account',
        description: 'Open business checking account. Consider payroll-compatible bank.',
        order: 2,
        actionType: 'VERIFY',
      },
      {
        id: 'ops-bank-3',
        questId: opsBank.id,
        title: 'Record Account Details',
        description: 'Securely document account information.',
        order: 3,
        actionType: 'VERIFY',
      },
    ],
  });

  // Quest 7: Florida Reemployment Tax (Unemployment)
  const opsReemployment = await prisma.corporateQuest.upsert({
    where: { id: 'ops-reemployment-tax' },
    update: {},
    create: {
      id: 'ops-reemployment-tax',
      entityId: opsLlc.id,
      title: 'Workforce Registration',
      description: 'Register with Florida Department of Revenue for Reemployment Tax.',
      category: 'COMPLIANCE',
      order: 7,
      status: 'LOCKED',
      prerequisiteIds: ['ops-ein'],
      xpReward: 150,
    },
  });

  await prisma.corporateQuestStep.createMany({
    skipDuplicates: true,
    data: [
      {
        id: 'ops-reemploy-1',
        questId: opsReemployment.id,
        title: 'Understand Florida Reemployment Tax',
        description: 'Learn about Florida\'s unemployment insurance requirements.',
        order: 1,
        actionType: 'INFO',
        actionData: {
          content: 'Florida requires employers to pay Reemployment Tax (formerly unemployment tax) on wages. New employer rate is 2.7% on first $7,000 of each employee\'s wages. Must file quarterly reports.',
        },
      },
      {
        id: 'ops-reemploy-2',
        questId: opsReemployment.id,
        title: 'Register via FloridaCommerce',
        description: 'Register for Reemployment Tax account.',
        order: 2,
        actionType: 'EXTERNAL_LINK',
        actionData: { url: 'https://floridarevenue.com/taxes/registration/' },
      },
      {
        id: 'ops-reemploy-3',
        questId: opsReemployment.id,
        title: 'Upload Registration Confirmation',
        description: 'Upload the Reemployment Tax account confirmation.',
        order: 3,
        actionType: 'UPLOAD',
        requiresUpload: true,
      },
    ],
  });

  // Quest 8: Payroll Setup
  const opsPayroll = await prisma.corporateQuest.upsert({
    where: { id: 'ops-payroll-setup' },
    update: {},
    create: {
      id: 'ops-payroll-setup',
      entityId: opsLlc.id,
      title: 'Payroll Engine',
      description: 'Set up payroll system for tax withholding and employee payments.',
      category: 'FINANCIAL',
      order: 8,
      status: 'LOCKED',
      prerequisiteIds: ['ops-bank-account', 'ops-reemployment-tax'],
      xpReward: 200,
    },
  });

  await prisma.corporateQuestStep.createMany({
    skipDuplicates: true,
    data: [
      {
        id: 'ops-payroll-1',
        questId: opsPayroll.id,
        title: 'Choose Payroll Provider',
        description: 'Select payroll provider (Gusto, ADP, Paychex, etc.).',
        order: 1,
        actionType: 'INFO',
        actionData: {
          content: 'Popular options: Gusto (easy, modern interface, $40-80/mo), ADP/Paychex (enterprise-grade), QuickBooks Payroll (good if using QB). All handle tax withholding, filings, and direct deposits.',
        },
      },
      {
        id: 'ops-payroll-2',
        questId: opsPayroll.id,
        title: 'Set Up Payroll Account',
        description: 'Create account and connect bank for payroll processing.',
        order: 2,
        actionType: 'VERIFY',
      },
      {
        id: 'ops-payroll-3',
        questId: opsPayroll.id,
        title: 'Enter Tax Information',
        description: 'Enter federal EIN, state tax IDs, and Reemployment Tax number.',
        order: 3,
        actionType: 'VERIFY',
      },
      {
        id: 'ops-payroll-4',
        questId: opsPayroll.id,
        title: 'Run Test Payroll',
        description: 'Run a test payroll to verify everything is set up correctly.',
        order: 4,
        actionType: 'VERIFY',
      },
    ],
  });

  // Quest 9: Workers Compensation Insurance
  const opsWorkersComp = await prisma.corporateQuest.upsert({
    where: { id: 'ops-workers-comp' },
    update: {},
    create: {
      id: 'ops-workers-comp',
      entityId: opsLlc.id,
      title: 'Workforce Shield',
      description: 'Obtain workers compensation insurance if required by Florida law.',
      category: 'PROTECTION',
      order: 9,
      status: 'LOCKED',
      prerequisiteIds: ['ops-operating-agreement'],
      xpReward: 150,
    },
  });

  await prisma.corporateQuestStep.createMany({
    skipDuplicates: true,
    data: [
      {
        id: 'ops-wc-1',
        questId: opsWorkersComp.id,
        title: 'Determine Requirements',
        description: 'Florida requires WC for 4+ employees (most industries). Review your needs.',
        order: 1,
        actionType: 'INFO',
        actionData: {
          content: 'Florida requires workers compensation for: (1) Construction: 1+ employees, (2) Non-construction: 4+ employees. Even if not required, WC protects you from employee injury lawsuits.',
        },
      },
      {
        id: 'ops-wc-2',
        questId: opsWorkersComp.id,
        title: 'Get WC Quotes',
        description: 'Request quotes from insurance providers or through your payroll provider.',
        order: 2,
        actionType: 'VERIFY',
      },
      {
        id: 'ops-wc-3',
        questId: opsWorkersComp.id,
        title: 'Bind Coverage or Document Exemption',
        description: 'Either purchase WC policy or document why you\'re exempt.',
        order: 3,
        actionType: 'VERIFY',
      },
      {
        id: 'ops-wc-4',
        questId: opsWorkersComp.id,
        title: 'Upload Certificate or Exemption',
        description: 'Upload Certificate of Insurance or exemption documentation.',
        order: 4,
        actionType: 'UPLOAD',
        requiresUpload: true,
      },
    ],
  });

  // Quest 10: Contractor Agreements
  const opsContractorAgreements = await prisma.corporateQuest.upsert({
    where: { id: 'ops-contractor-agreements' },
    update: {},
    create: {
      id: 'ops-contractor-agreements',
      entityId: opsLlc.id,
      title: 'Contractor Protocol',
      description: 'Create standard independent contractor agreement for freelancers.',
      category: 'GOVERNANCE',
      order: 10,
      status: 'LOCKED',
      prerequisiteIds: ['ops-operating-agreement'],
      xpReward: 150,
    },
  });

  await prisma.corporateQuestStep.createMany({
    skipDuplicates: true,
    data: [
      {
        id: 'ops-contractor-1',
        questId: opsContractorAgreements.id,
        title: 'Understand W-2 vs 1099',
        description: 'Learn the legal distinction between employees and contractors.',
        order: 1,
        actionType: 'INFO',
        actionData: {
          content: 'IRS scrutinizes worker classification. Key factors: (1) Control over how/when work is done, (2) Who provides tools/equipment, (3) Opportunity for profit/loss, (4) Permanency of relationship. Misclassification can result in back taxes, penalties, and lawsuits.',
        },
      },
      {
        id: 'ops-contractor-2',
        questId: opsContractorAgreements.id,
        title: 'Review Contractor Agreement Template',
        description: 'Review the standard independent contractor agreement.',
        order: 2,
        actionType: 'TEMPLATE',
        actionData: { templateName: 'Independent Contractor Agreement' },
      },
      {
        id: 'ops-contractor-3',
        questId: opsContractorAgreements.id,
        title: 'Add Music Industry Provisions',
        description: 'Add IP assignment, confidentiality, and work-for-hire provisions.',
        order: 3,
        actionType: 'INFO',
        actionData: {
          content: 'Music industry contractors (producers, writers, engineers) need: (1) Clear work-for-hire language, (2) IP assignment for any created works, (3) Confidentiality re: clients and projects, (4) Payment terms tied to project milestones.',
        },
      },
      {
        id: 'ops-contractor-4',
        questId: opsContractorAgreements.id,
        title: 'Upload Final Template',
        description: 'Upload the approved contractor agreement template.',
        order: 4,
        actionType: 'UPLOAD',
        requiresUpload: true,
      },
    ],
  });

  console.log('✅ Created Ops LLC complete quest chain (10 quests)');

  // ============================================================================
  // FINANCE LLC - COMPLETE QUEST CHAIN
  // Florida LLC for treasury management, intercompany finance, investments
  // ============================================================================

  // Quest 1: Foundation Stone
  const financeFoundation = await prisma.corporateQuest.upsert({
    where: { id: 'finance-foundation' },
    update: {},
    create: {
      id: 'finance-foundation',
      entityId: financeLlc.id,
      title: 'Foundation Stone',
      description: 'Understand Finance LLC role: central treasury, intercompany loans, and cash management.',
      category: 'FORMATION',
      order: 1,
      status: 'AVAILABLE',
      xpReward: 100,
    },
  });

  await prisma.corporateQuestStep.createMany({
    skipDuplicates: true,
    data: [
      {
        id: 'finance-foundation-1',
        questId: financeFoundation.id,
        title: 'Understand Finance LLC Purpose',
        description: 'Learn how centralized treasury management benefits the group.',
        order: 1,
        actionType: 'INFO',
        actionData: {
          content: 'Finance LLC serves as the group\'s "internal bank": (1) Holds excess cash from operating entities, (2) Makes intercompany loans at arm\'s-length rates, (3) Can invest surplus funds, (4) Provides liability separation for financial assets, (5) Simplifies tax planning for distributions.',
        },
      },
      {
        id: 'finance-foundation-2',
        questId: financeFoundation.id,
        title: 'Review Financial Structure',
        description: 'Understand how money flows between entities.',
        order: 2,
        actionType: 'INFO',
        actionData: {
          content: 'Flow: Revenue → PT LLC (client work) → Pays operating expenses via Ops LLC → Surplus flows to Finance LLC → Finance LLC makes distributions to Holdings → Holdings makes shareholder distributions. Each step is documented with proper intercompany agreements.',
        },
      },
      {
        id: 'finance-foundation-3',
        questId: financeFoundation.id,
        title: 'Confirm Florida LLC',
        description: 'Confirm Florida jurisdiction for treasury entity.',
        order: 3,
        actionType: 'VERIFY',
      },
    ],
  });

  // Quest 2: Name Reservation
  const financeNameReservation = await prisma.corporateQuest.upsert({
    where: { id: 'finance-name-reservation' },
    update: {},
    create: {
      id: 'finance-name-reservation',
      entityId: financeLlc.id,
      title: 'Claim the Treasury',
      description: 'Reserve "Producer Tour Finance LLC" with Florida.',
      category: 'FORMATION',
      order: 2,
      status: 'LOCKED',
      prerequisiteIds: ['finance-foundation'],
      xpReward: 150,
    },
  });

  await prisma.corporateQuestStep.createMany({
    skipDuplicates: true,
    data: [
      {
        id: 'finance-name-1',
        questId: financeNameReservation.id,
        title: 'Search Name Availability',
        description: 'Confirm name availability on Sunbiz.',
        order: 1,
        actionType: 'EXTERNAL_LINK',
        actionData: { url: 'https://dos.myflorida.com/sunbiz/search/' },
      },
      {
        id: 'finance-name-2',
        questId: financeNameReservation.id,
        title: 'Confirm Name Decision',
        description: 'Confirm the exact LLC name to use.',
        order: 2,
        actionType: 'VERIFY',
      },
    ],
  });

  // Quest 3: Articles of Organization
  const financeFormation = await prisma.corporateQuest.upsert({
    where: { id: 'finance-articles-organization' },
    update: {},
    create: {
      id: 'finance-articles-organization',
      entityId: financeLlc.id,
      title: 'Treasury Birth Certificate',
      description: 'File Articles of Organization with Florida Division of Corporations.',
      category: 'FORMATION',
      order: 3,
      status: 'LOCKED',
      prerequisiteIds: ['finance-name-reservation'],
      xpReward: 200,
    },
  });

  await prisma.corporateQuestStep.createMany({
    skipDuplicates: true,
    data: [
      {
        id: 'finance-formation-1',
        questId: financeFormation.id,
        title: 'Prepare Filing Information',
        description: 'Gather required information for filing.',
        order: 1,
        actionType: 'INFO',
        actionData: {
          checklist: [
            'LLC name: Producer Tour Finance LLC',
            'Principal address in Florida',
            'Registered agent',
            'Holdings, Inc. as sole member',
            'Member-managed structure',
          ],
        },
      },
      {
        id: 'finance-formation-2',
        questId: financeFormation.id,
        title: 'File via Sunbiz',
        description: 'File Articles of Organization online. Fee: $125.',
        order: 2,
        actionType: 'EXTERNAL_LINK',
        actionData: { url: 'https://dos.myflorida.com/sunbiz/manage-business/efile/fl-llc/' },
      },
      {
        id: 'finance-formation-3',
        questId: financeFormation.id,
        title: 'Upload Filed Articles',
        description: 'Upload the stamped Articles of Organization.',
        order: 3,
        actionType: 'UPLOAD',
        requiresUpload: true,
      },
    ],
  });

  // Quest 4: EIN Application
  const financeEin = await prisma.corporateQuest.upsert({
    where: { id: 'finance-ein' },
    update: {},
    create: {
      id: 'finance-ein',
      entityId: financeLlc.id,
      title: 'Treasury Identity',
      description: 'Apply for EIN from the IRS.',
      category: 'FORMATION',
      order: 4,
      status: 'LOCKED',
      prerequisiteIds: ['finance-articles-organization'],
      xpReward: 150,
    },
  });

  await prisma.corporateQuestStep.createMany({
    skipDuplicates: true,
    data: [
      {
        id: 'finance-ein-1',
        questId: financeEin.id,
        title: 'Gather Required Information',
        description: 'Prepare information for IRS SS-4 form.',
        order: 1,
        actionType: 'INFO',
      },
      {
        id: 'finance-ein-2',
        questId: financeEin.id,
        title: 'Apply for EIN Online',
        description: 'Complete IRS Form SS-4 online.',
        order: 2,
        actionType: 'EXTERNAL_LINK',
        actionData: { url: 'https://www.irs.gov/businesses/small-businesses-self-employed/apply-for-an-employer-identification-number-ein-online' },
      },
      {
        id: 'finance-ein-3',
        questId: financeEin.id,
        title: 'Upload EIN Confirmation',
        description: 'Upload the EIN confirmation letter.',
        order: 3,
        actionType: 'UPLOAD',
        requiresUpload: true,
      },
    ],
  });

  // Quest 5: Operating Agreement
  const financeOperating = await prisma.corporateQuest.upsert({
    where: { id: 'finance-operating-agreement' },
    update: {},
    create: {
      id: 'finance-operating-agreement',
      entityId: financeLlc.id,
      title: 'Treasury Bylaws',
      description: 'Create Operating Agreement with intercompany lending and investment provisions.',
      category: 'GOVERNANCE',
      order: 5,
      status: 'LOCKED',
      prerequisiteIds: ['finance-ein'],
      xpReward: 200,
    },
  });

  await prisma.corporateQuestStep.createMany({
    skipDuplicates: true,
    data: [
      {
        id: 'finance-operating-1',
        questId: financeOperating.id,
        title: 'Review Operating Agreement Template',
        description: 'Review single-member LLC operating agreement template.',
        order: 1,
        actionType: 'TEMPLATE',
        actionData: { templateName: 'Finance LLC Operating Agreement' },
      },
      {
        id: 'finance-operating-2',
        questId: financeOperating.id,
        title: 'Add Treasury Provisions',
        description: 'Include provisions for: intercompany loans, investment authority, distribution policies.',
        order: 2,
        actionType: 'INFO',
        actionData: {
          content: 'Key provisions: (1) Authority to make intercompany loans, (2) Investment policy and limitations, (3) Interest rate policy (must be arm\'s-length), (4) Distribution waterfall, (5) Reserve requirements, (6) Audit and reporting obligations.',
        },
      },
      {
        id: 'finance-operating-3',
        questId: financeOperating.id,
        title: 'Upload Signed Agreement',
        description: 'Upload the executed operating agreement.',
        order: 3,
        actionType: 'UPLOAD',
        requiresUpload: true,
      },
    ],
  });

  // Quest 6: Bank Account Setup
  const financeBank = await prisma.corporateQuest.upsert({
    where: { id: 'finance-bank-account' },
    update: {},
    create: {
      id: 'finance-bank-account',
      entityId: financeLlc.id,
      title: 'Central Treasury',
      description: 'Open primary treasury account for surplus funds.',
      category: 'FINANCIAL',
      order: 6,
      status: 'LOCKED',
      prerequisiteIds: ['finance-operating-agreement'],
      xpReward: 150,
    },
  });

  await prisma.corporateQuestStep.createMany({
    skipDuplicates: true,
    data: [
      {
        id: 'finance-bank-1',
        questId: financeBank.id,
        title: 'Gather Banking Documents',
        description: 'Collect required documents for business account.',
        order: 1,
        actionType: 'INFO',
        actionData: {
          checklist: [
            'Articles of Organization',
            'EIN Confirmation Letter',
            'Operating Agreement',
            'Manager Resolution',
            'Photo ID',
          ],
        },
      },
      {
        id: 'finance-bank-2',
        questId: financeBank.id,
        title: 'Open Treasury Account',
        description: 'Open business checking account for treasury management.',
        order: 2,
        actionType: 'VERIFY',
      },
      {
        id: 'finance-bank-3',
        questId: financeBank.id,
        title: 'Set Up Online Banking',
        description: 'Enable online banking with proper access controls.',
        order: 3,
        actionType: 'VERIFY',
      },
      {
        id: 'finance-bank-4',
        questId: financeBank.id,
        title: 'Record Account Information',
        description: 'Securely document account details.',
        order: 4,
        actionType: 'VERIFY',
      },
    ],
  });

  // Quest 7: High-Yield Savings Account
  const financeSavings = await prisma.corporateQuest.upsert({
    where: { id: 'finance-savings-account' },
    update: {},
    create: {
      id: 'finance-savings-account',
      entityId: financeLlc.id,
      title: 'Reserve Vault',
      description: 'Open high-yield savings account for surplus cash reserves.',
      category: 'FINANCIAL',
      order: 7,
      status: 'LOCKED',
      prerequisiteIds: ['finance-bank-account'],
      xpReward: 100,
    },
  });

  await prisma.corporateQuestStep.createMany({
    skipDuplicates: true,
    data: [
      {
        id: 'finance-savings-1',
        questId: financeSavings.id,
        title: 'Research High-Yield Options',
        description: 'Compare business savings account rates.',
        order: 1,
        actionType: 'INFO',
        actionData: {
          content: 'Look for: FDIC-insured business savings accounts, competitive APY (4%+ as of 2024), easy transfers to/from checking. Options include online banks (higher rates) or keeping at same bank (convenience).',
        },
      },
      {
        id: 'finance-savings-2',
        questId: financeSavings.id,
        title: 'Open Savings Account',
        description: 'Open high-yield business savings account.',
        order: 2,
        actionType: 'VERIFY',
      },
      {
        id: 'finance-savings-3',
        questId: financeSavings.id,
        title: 'Link to Checking Account',
        description: 'Set up easy transfers between checking and savings.',
        order: 3,
        actionType: 'VERIFY',
      },
    ],
  });

  // Quest 8: Intercompany Loan Agreement Template
  const financeIntercompanyLoan = await prisma.corporateQuest.upsert({
    where: { id: 'finance-intercompany-loan' },
    update: {},
    create: {
      id: 'finance-intercompany-loan',
      entityId: financeLlc.id,
      title: 'Lending Protocol',
      description: 'Create standard intercompany loan agreement template.',
      category: 'GOVERNANCE',
      order: 8,
      status: 'LOCKED',
      prerequisiteIds: ['finance-operating-agreement'],
      xpReward: 200,
    },
  });

  await prisma.corporateQuestStep.createMany({
    skipDuplicates: true,
    data: [
      {
        id: 'finance-loan-1',
        questId: financeIntercompanyLoan.id,
        title: 'Understand Arm\'s-Length Requirements',
        description: 'Learn IRS requirements for related-party transactions.',
        order: 1,
        actionType: 'INFO',
        actionData: {
          content: 'Intercompany loans MUST be at arm\'s-length terms to avoid IRS recharacterization. Requirements: (1) Written loan agreement, (2) Market-rate interest (check IRS AFR), (3) Fixed repayment schedule, (4) Actual payments made, (5) Proper documentation of funds transfer.',
        },
      },
      {
        id: 'finance-loan-2',
        questId: financeIntercompanyLoan.id,
        title: 'Check Current AFR Rates',
        description: 'Look up current Applicable Federal Rates from IRS.',
        order: 2,
        actionType: 'EXTERNAL_LINK',
        actionData: { url: 'https://www.irs.gov/applicable-federal-rates' },
      },
      {
        id: 'finance-loan-3',
        questId: financeIntercompanyLoan.id,
        title: 'Review Loan Agreement Template',
        description: 'Review the intercompany promissory note template.',
        order: 3,
        actionType: 'TEMPLATE',
        actionData: { templateName: 'Intercompany Loan Agreement' },
      },
      {
        id: 'finance-loan-4',
        questId: financeIntercompanyLoan.id,
        title: 'Upload Approved Template',
        description: 'Upload the final loan agreement template.',
        order: 4,
        actionType: 'UPLOAD',
        requiresUpload: true,
      },
    ],
  });

  // Quest 9: Management Fee Agreement
  const financeManagementFee = await prisma.corporateQuest.upsert({
    where: { id: 'finance-management-fee' },
    update: {},
    create: {
      id: 'finance-management-fee',
      entityId: financeLlc.id,
      title: 'Service Fee Protocol',
      description: 'Create management fee agreement for services provided to subsidiaries.',
      category: 'GOVERNANCE',
      order: 9,
      status: 'LOCKED',
      prerequisiteIds: ['finance-operating-agreement'],
      xpReward: 150,
    },
  });

  await prisma.corporateQuestStep.createMany({
    skipDuplicates: true,
    data: [
      {
        id: 'finance-mgmt-1',
        questId: financeManagementFee.id,
        title: 'Understand Management Fee Structure',
        description: 'Learn how management fees flow between entities.',
        order: 1,
        actionType: 'INFO',
        actionData: {
          content: 'Holdings can charge management fees to subsidiaries for: (1) Strategic oversight, (2) Administrative services, (3) Access to brand/IP (separate from licensing). Fees must be reasonable and documented to withstand IRS scrutiny.',
        },
      },
      {
        id: 'finance-mgmt-2',
        questId: financeManagementFee.id,
        title: 'Review Management Agreement Template',
        description: 'Review the intercompany management services agreement.',
        order: 2,
        actionType: 'TEMPLATE',
        actionData: { templateName: 'Management Services Agreement' },
      },
      {
        id: 'finance-mgmt-3',
        questId: financeManagementFee.id,
        title: 'Upload Approved Template',
        description: 'Upload the final management fee agreement.',
        order: 3,
        actionType: 'UPLOAD',
        requiresUpload: true,
      },
    ],
  });

  // Quest 10: Investment Policy
  const financeInvestmentPolicy = await prisma.corporateQuest.upsert({
    where: { id: 'finance-investment-policy' },
    update: {},
    create: {
      id: 'finance-investment-policy',
      entityId: financeLlc.id,
      title: 'Investment Charter',
      description: 'Create investment policy for managing surplus funds.',
      category: 'GOVERNANCE',
      order: 10,
      status: 'LOCKED',
      prerequisiteIds: ['finance-savings-account'],
      xpReward: 150,
    },
  });

  await prisma.corporateQuestStep.createMany({
    skipDuplicates: true,
    data: [
      {
        id: 'finance-invest-1',
        questId: financeInvestmentPolicy.id,
        title: 'Define Investment Objectives',
        description: 'Establish goals: capital preservation, liquidity, and yield.',
        order: 1,
        actionType: 'INFO',
        actionData: {
          content: 'For most operating companies, priorities should be: (1) Capital preservation - don\'t lose money, (2) Liquidity - access to cash when needed, (3) Yield - reasonable return on excess cash. Typically limited to: money markets, CDs, Treasury bills, investment-grade bonds.',
        },
      },
      {
        id: 'finance-invest-2',
        questId: financeInvestmentPolicy.id,
        title: 'Set Investment Parameters',
        description: 'Define allowable investments, concentration limits, and approval thresholds.',
        order: 2,
        actionType: 'VERIFY',
      },
      {
        id: 'finance-invest-3',
        questId: financeInvestmentPolicy.id,
        title: 'Document Investment Policy',
        description: 'Write formal investment policy statement.',
        order: 3,
        actionType: 'TEMPLATE',
        actionData: { templateName: 'Investment Policy Statement' },
      },
      {
        id: 'finance-invest-4',
        questId: financeInvestmentPolicy.id,
        title: 'Upload Adopted Policy',
        description: 'Upload the approved investment policy.',
        order: 4,
        actionType: 'UPLOAD',
        requiresUpload: true,
      },
    ],
  });

  console.log('✅ Created Finance LLC complete quest chain (10 quests)');

  // ============================================================================
  // COMPLIANCE ITEMS FOR ALL LLCs
  // ============================================================================

  // IP LLC Compliance
  await prisma.complianceItem.createMany({
    skipDuplicates: true,
    data: [
      {
        id: 'ip-delaware-tax',
        entityId: ipLlc.id,
        title: 'Delaware Annual Tax',
        description: 'Pay Delaware LLC annual tax ($300 flat fee).',
        frequency: 'ANNUAL',
        dueDate: new Date('2025-06-01'),
        reminderDays: 60,
        status: 'UPCOMING',
      },
      {
        id: 'ip-trademark-renewal',
        entityId: ipLlc.id,
        title: 'Trademark Maintenance',
        description: 'File Section 8 declaration between 5th and 6th year after registration.',
        frequency: 'ONE_TIME',
        reminderDays: 365,
        status: 'UPCOMING',
      },
    ],
  });

  // PT LLC Compliance
  await prisma.complianceItem.createMany({
    skipDuplicates: true,
    data: [
      {
        id: 'pt-florida-annual',
        entityId: ptLlc.id,
        title: 'Florida Annual Report',
        description: 'File annual report with Florida Division of Corporations. Fee: $138.75.',
        frequency: 'ANNUAL',
        dueDate: new Date('2025-05-01'),
        reminderDays: 60,
        status: 'UPCOMING',
      },
      {
        id: 'pt-pro-quarterly',
        entityId: ptLlc.id,
        title: 'PRO Statement Review',
        description: 'Review and reconcile BMI/ASCAP quarterly statements.',
        frequency: 'QUARTERLY',
        dueDate: new Date('2025-03-31'),
        reminderDays: 14,
        status: 'UPCOMING',
      },
      {
        id: 'pt-client-statements',
        entityId: ptLlc.id,
        title: 'Client Royalty Statements',
        description: 'Send quarterly royalty statements to all clients.',
        frequency: 'QUARTERLY',
        dueDate: new Date('2025-03-31'),
        reminderDays: 14,
        status: 'UPCOMING',
      },
      {
        id: 'pt-trust-reconciliation',
        entityId: ptLlc.id,
        title: 'Trust Account Reconciliation',
        description: 'Monthly reconciliation of client trust account.',
        frequency: 'MONTHLY',
        dueDate: new Date('2025-01-31'),
        reminderDays: 7,
        status: 'UPCOMING',
      },
    ],
  });

  // Ops LLC Compliance
  await prisma.complianceItem.createMany({
    skipDuplicates: true,
    data: [
      {
        id: 'ops-florida-annual',
        entityId: opsLlc.id,
        title: 'Florida Annual Report',
        description: 'File annual report with Florida Division of Corporations.',
        frequency: 'ANNUAL',
        dueDate: new Date('2025-05-01'),
        reminderDays: 60,
        status: 'UPCOMING',
      },
      {
        id: 'ops-reemployment-quarterly',
        entityId: opsLlc.id,
        title: 'Reemployment Tax Filing',
        description: 'File quarterly Florida Reemployment Tax return.',
        frequency: 'QUARTERLY',
        dueDate: new Date('2025-01-31'),
        reminderDays: 14,
        status: 'UPCOMING',
      },
      {
        id: 'ops-payroll-tax',
        entityId: opsLlc.id,
        title: 'Federal Payroll Tax Deposits',
        description: 'Deposit federal payroll taxes per IRS schedule.',
        frequency: 'MONTHLY',
        dueDate: new Date('2025-01-15'),
        reminderDays: 7,
        status: 'UPCOMING',
      },
      {
        id: 'ops-1099-filing',
        entityId: opsLlc.id,
        title: '1099-NEC Filings',
        description: 'File 1099-NEC forms for contractors paid $600+.',
        frequency: 'ANNUAL',
        dueDate: new Date('2025-01-31'),
        reminderDays: 45,
        status: 'UPCOMING',
      },
      {
        id: 'ops-w2-filing',
        entityId: opsLlc.id,
        title: 'W-2 Filings',
        description: 'File W-2 forms for all employees.',
        frequency: 'ANNUAL',
        dueDate: new Date('2025-01-31'),
        reminderDays: 45,
        status: 'UPCOMING',
      },
    ],
  });

  // Finance LLC Compliance
  await prisma.complianceItem.createMany({
    skipDuplicates: true,
    data: [
      {
        id: 'finance-florida-annual',
        entityId: financeLlc.id,
        title: 'Florida Annual Report',
        description: 'File annual report with Florida Division of Corporations.',
        frequency: 'ANNUAL',
        dueDate: new Date('2025-05-01'),
        reminderDays: 60,
        status: 'UPCOMING',
      },
      {
        id: 'finance-intercompany-review',
        entityId: financeLlc.id,
        title: 'Intercompany Balance Review',
        description: 'Quarterly review and documentation of all intercompany balances.',
        frequency: 'QUARTERLY',
        dueDate: new Date('2025-03-31'),
        reminderDays: 14,
        status: 'UPCOMING',
      },
      {
        id: 'finance-interest-payments',
        entityId: financeLlc.id,
        title: 'Intercompany Interest Payments',
        description: 'Record and pay accrued interest on intercompany loans.',
        frequency: 'QUARTERLY',
        dueDate: new Date('2025-03-31'),
        reminderDays: 14,
        status: 'UPCOMING',
      },
    ],
  });

  console.log('✅ Created compliance items for all LLCs');

  console.log('\n🎉 Corporate Structure seeding complete!');
  console.log(`
Summary:
- 5 Corporate Entities created
- Holdings: 5 quests (governance/financial - post-formation)
- IP LLC: 9 quests (formation + governance + protection)
- PT LLC: 10 quests (formation + publishing administration)
- Ops LLC: 10 quests (formation + employment + payroll)
- Finance LLC: 10 quests (formation + treasury management)
- Total: 44 quests with 160+ steps
- Compliance items: Holdings (4), IP LLC (2), PT LLC (4), Ops LLC (5), Finance LLC (3)
  `);
}

seedCorporateStructure()
  .catch((e) => {
    console.error('Error seeding corporate structure:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
