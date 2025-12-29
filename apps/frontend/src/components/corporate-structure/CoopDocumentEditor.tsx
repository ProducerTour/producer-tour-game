import { useState, useEffect, Suspense, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Edit3,
  Eye,
  Check,
  AlertCircle,
  Loader2,
  FileText,
  Scale,
  DollarSign,
  ChevronDown,
  ChevronRight,
  Pencil,
} from 'lucide-react';
import {
  RoomProvider,
  useUpdateMyPresence,
  useOthers,
  useSelf,
  useStatus,
  getDocumentRoomId,
  getUserColor,
  type Presence,
  type Storage,
} from '../../lib/liveblocks';
import { useAuthStore } from '../../store/auth.store';
import type { CorporateQuestStep, CorporateQuest } from './types';

// ============================================================================
// Bylaws Template Content - Delaware C-Corp for Music Publishing
// Written from perspective of tax/legal attorney for music business
// ============================================================================

const BYLAWS_SECTIONS = [
  {
    id: 'article-1',
    title: 'ARTICLE I - OFFICES',
    subsections: [
      {
        id: 'article-1-1',
        title: 'Section 1.1 - Registered Office',
        content: `The registered office of the Corporation shall be located in the State of Delaware at the address designated in the Certificate of Incorporation or at such other address as may be designated from time to time by the Board of Directors.

ATTORNEY NOTE: Delaware requires a registered agent and office in-state. For Producer Tour Holdings, Inc., this provides the jurisdiction benefits of Delaware corporate law while operating primarily in other states. The registered agent will receive official correspondence and legal process.`,
        editable: true,
        taxNote: 'Delaware registered agent fees are typically $50-300/year. This cost is deductible as a business expense.',
        legalNote: 'Delaware General Corporation Law (DGCL) Section 131 requires a Delaware registered office.',
      },
      {
        id: 'article-1-2',
        title: 'Section 1.2 - Other Offices',
        content: `The Corporation may also have offices at such other places, both within and without the State of Delaware, as the Board of Directors may from time to time determine or the business of the Corporation may require.

MUSIC BUSINESS NOTE: As a holding company for music publishing and production entities, Producer Tour Holdings may maintain offices in entertainment industry hubs (Los Angeles, Nashville, New York, Atlanta) without affecting Delaware incorporation benefits.`,
        editable: true,
        taxNote: 'Physical presence in other states may create nexus for state income tax. Consult with tax advisor before establishing offices.',
        legalNote: 'Operating in multiple states requires foreign qualification and registered agents in each state.',
      },
    ],
  },
  {
    id: 'article-2',
    title: 'ARTICLE II - STOCKHOLDERS',
    subsections: [
      {
        id: 'article-2-1',
        title: 'Section 2.1 - Place of Meetings',
        content: `Meetings of stockholders shall be held at such place, if any, within or without the State of Delaware, as may be designated by the Board of Directors. The Board of Directors may, in its sole discretion, determine that a meeting shall not be held at any place, but may instead be held solely by means of remote communication.

MODERN PROVISION: Given the distributed nature of music industry professionals, remote meetings are essential. This provision allows for Zoom/video conferencing for official stockholder meetings.`,
        editable: true,
        taxNote: 'No direct tax implications for meeting location, but travel expenses for in-person meetings may be deductible.',
        legalNote: 'DGCL Section 211(a)(2) permits virtual-only stockholder meetings if authorized in bylaws.',
      },
      {
        id: 'article-2-2',
        title: 'Section 2.2 - Annual Meetings',
        content: `The annual meeting of stockholders shall be held on such date, at such time, and at such place (if any) as may be fixed by the Board of Directors. At each annual meeting, stockholders shall elect directors and transact such other business as may properly be brought before the meeting.

COMPLIANCE NOTE: Annual meetings are a key compliance requirement. For a music publishing holding company, this is when major decisions about catalog acquisitions, subsidiary management, and distribution agreements should be ratified.`,
        editable: true,
        taxNote: 'Annual meeting documentation supports legitimate business purpose and helps defend corporate structure in audits.',
        legalNote: 'Delaware requires annual stockholder meetings. Failure to hold meetings can result in stockholder petitions to the Court of Chancery.',
      },
      {
        id: 'article-2-3',
        title: 'Section 2.3 - Special Meetings',
        content: `Special meetings of stockholders may be called only by (i) the Board of Directors, (ii) the Chairman of the Board, (iii) the Chief Executive Officer, or (iv) stockholders holding together at least 25% of the Corporation's outstanding voting shares.

PROTECTIVE PROVISION: The 25% threshold protects against disruptive minority stockholders while still providing meaningful stockholder rights. In the music industry where partnerships and investor relationships are crucial, this balance is essential.`,
        editable: true,
        taxNote: 'Special meeting provisions do not have direct tax implications but affect governance and control.',
        legalNote: 'Delaware permits but does not require stockholder-called special meetings. The 25% threshold is stockholder-friendly compared to many public companies.',
      },
      {
        id: 'article-2-4',
        title: 'Section 2.4 - Notice of Meetings',
        content: `Written notice of each stockholder meeting stating the date, time, place (if any), means of remote communication (if any), and purposes of the meeting shall be given not less than ten (10) nor more than sixty (60) days before the meeting to each stockholder entitled to vote at the meeting.

PRACTICAL NOTE: Notice can be given by electronic transmission if the stockholder has consented. For modern music business operations, email notice is standard practice.`,
        editable: true,
        taxNote: 'Proper notice documentation supports corporate formalities necessary to maintain liability protection.',
        legalNote: 'DGCL Section 222 sets notice requirements. 10-day minimum ensures stockholders have adequate time to participate.',
      },
      {
        id: 'article-2-5',
        title: 'Section 2.5 - Quorum',
        content: `The holders of a majority of the shares entitled to vote, present in person or by proxy, shall constitute a quorum for the transaction of business at all meetings of stockholders. If a quorum is not present, the meeting may be adjourned from time to time without notice other than announcement at the meeting.

IMPORTANT: As Producer Tour Holdings grows and brings in investors or music industry partners as stockholders, maintaining quorum becomes operationally critical. This standard majority requirement ensures decisions have broad support.`,
        editable: true,
        taxNote: 'Quorum requirements do not directly affect taxes but ensure proper governance for entity classification.',
        legalNote: 'DGCL Section 216 allows bylaws to set quorum but requires at least 1/3 of shares for valid quorum.',
      },
      {
        id: 'article-2-6',
        title: 'Section 2.6 - Voting Rights',
        content: `Each stockholder shall be entitled to one vote for each share of stock held of record on the record date, unless otherwise provided in the Certificate of Incorporation. Voting may be by voice vote or by ballot as directed by the presiding officer.

MUSIC PUBLISHING CONSIDERATION: If Producer Tour Holdings issues different classes of stock (e.g., Class A for founders with 10 votes per share, Class B for investors with 1 vote per share), this section should be updated to reference the Certificate of Incorporation's specific provisions.`,
        editable: true,
        taxNote: 'Different voting classes do not affect tax treatment but may affect control for tax planning purposes.',
        legalNote: 'Delaware allows broad flexibility in structuring voting rights through the Certificate of Incorporation.',
      },
      {
        id: 'article-2-7',
        title: 'Section 2.7 - Proxies',
        content: `Each stockholder may authorize another person or persons to act for such stockholder by proxy. A proxy shall be filed with the Secretary of the Corporation before or at the meeting. No proxy shall be valid after three (3) years from its date, unless the proxy provides for a longer period.

PRACTICAL APPLICATION: In the music industry, artists, producers, and managers often have demanding schedules. Proxy voting allows stockholder participation without physical presence, essential for an entertainment industry holding company.`,
        editable: true,
        taxNote: 'Proxy voting has no direct tax consequences.',
        legalNote: 'DGCL Section 212 governs proxies. Electronic proxies are permitted with proper verification.',
      },
      {
        id: 'article-2-8',
        title: 'Section 2.8 - Action Without Meeting',
        content: `Any action required or permitted to be taken at a stockholders meeting may be taken without a meeting if a consent in writing is signed by stockholders having not less than the minimum number of votes necessary to authorize such action. Written consent may be delivered by electronic transmission.

EFFICIENCY PROVISION: This is crucial for a dynamic music business holding company where quick decisions on catalog acquisitions, partnership opportunities, or subsidiary formations may be needed. Unanimous written consent avoids the delay of formal meetings.`,
        editable: true,
        taxNote: 'Written consent actions have same tax treatment as meeting-approved actions.',
        legalNote: 'DGCL Section 228 requires unanimous consent for public companies but permits non-unanimous consent for private companies if authorized.',
      },
    ],
  },
  {
    id: 'article-3',
    title: 'ARTICLE III - BOARD OF DIRECTORS',
    subsections: [
      {
        id: 'article-3-1',
        title: 'Section 3.1 - General Powers',
        content: `The business and affairs of the Corporation shall be managed by or under the direction of the Board of Directors. The Board may exercise all powers of the Corporation except those conferred on stockholders by law, the Certificate of Incorporation, or these Bylaws.

HOLDING COMPANY STRUCTURE: For Producer Tour Holdings, the Board's key responsibilities include overseeing subsidiary operations (IP LLC for publishing, Operations LLC for production services, Finance LLC for treasury management) and ensuring proper intercompany agreements and transfer pricing.`,
        editable: true,
        taxNote: 'Proper board oversight of intercompany transactions is essential for defending transfer pricing positions with the IRS.',
        legalNote: 'DGCL Section 141(a) vests management authority in the board of directors.',
      },
      {
        id: 'article-3-2',
        title: 'Section 3.2 - Number and Term',
        content: `The Board of Directors shall consist of not less than one (1) nor more than nine (9) directors. The exact number shall be fixed from time to time by resolution of the Board. Directors shall be elected at each annual meeting of stockholders and shall hold office until the next annual meeting and until their successors are elected and qualified.

PRACTICAL NOTE: Starting with 1-3 directors is common for early-stage holding companies. As Producer Tour Holdings grows and takes on investors or strategic partners in the music industry, board expansion allows for independent directors and governance expertise.`,
        editable: true,
        taxNote: 'Board composition does not directly affect taxes but demonstrates legitimate business structure.',
        legalNote: 'Delaware requires minimum of one director. Best practices suggest odd number to avoid tie votes.',
      },
      {
        id: 'article-3-3',
        title: 'Section 3.3 - Director Qualifications',
        content: `Directors need not be stockholders of the Corporation or residents of the State of Delaware. Directors shall be natural persons who are at least eighteen (18) years of age.

MUSIC INDUSTRY GOVERNANCE: Consider adding qualifications such as music industry experience, financial literacy, or legal expertise as the board expands. Independent directors with entertainment industry backgrounds add valuable oversight for a publishing/production holding company.`,
        editable: true,
        taxNote: 'No tax implications for director qualifications.',
        legalNote: 'Delaware imposes minimal statutory requirements on director qualifications.',
      },
      {
        id: 'article-3-4',
        title: 'Section 3.4 - Regular Meetings',
        content: `Regular meetings of the Board of Directors shall be held at such times and places as the Board may determine. The Board shall hold at least one meeting per fiscal quarter. No notice shall be required for regular meetings if the date, time, and place have been fixed by Board resolution.

COMPLIANCE BEST PRACTICE: Quarterly board meetings are the industry standard and demonstrate active oversight. For Producer Tour Holdings, quarterly meetings should include review of: (1) subsidiary performance, (2) music catalog status, (3) pending acquisitions, (4) compliance calendar, (5) intercompany transactions.`,
        editable: true,
        taxNote: 'Regular board meetings with documented minutes support legitimate business purpose and help defend corporate structure.',
        legalNote: 'While Delaware does not mandate meeting frequency, regular meetings are essential governance practice.',
      },
      {
        id: 'article-3-5',
        title: 'Section 3.5 - Special Meetings',
        content: `Special meetings of the Board of Directors may be called by the Chairman of the Board, the Chief Executive Officer, or any two directors. Notice of special meetings shall be given at least forty-eight (48) hours before the meeting by telephone, electronic transmission, or personal delivery.

URGENCY PROVISION: In the music industry, time-sensitive opportunities (catalog acquisitions, exclusive licensing deals, talent signings) may require rapid board action. This 48-hour notice period balances speed with proper governance.`,
        editable: true,
        taxNote: 'Special meeting procedures do not affect tax treatment.',
        legalNote: 'DGCL Section 141(g) permits flexible meeting notice procedures as set forth in bylaws.',
      },
      {
        id: 'article-3-6',
        title: 'Section 3.6 - Quorum and Voting',
        content: `A majority of the total number of directors then in office shall constitute a quorum for the transaction of business. The vote of a majority of directors present at a meeting at which a quorum is present shall be the act of the Board.

DEADLOCK PREVENTION: For a music business holding company with potentially diverse ownership (artists, producers, investors), clear quorum and voting rules prevent governance gridlock.`,
        editable: true,
        taxNote: 'Voting thresholds do not directly affect taxes.',
        legalNote: 'DGCL Section 141(b) permits bylaws to set quorum at less than majority but not less than 1/3.',
      },
      {
        id: 'article-3-7',
        title: 'Section 3.7 - Action Without Meeting',
        content: `Any action required or permitted to be taken at a Board meeting may be taken without a meeting if all members of the Board consent thereto in writing or by electronic transmission. Such consent shall be filed with the minutes of the Board.

EFFICIENCY PROVISION: Unanimous written consent is particularly valuable for a holding company where board members may be located across multiple time zones and have demanding entertainment industry schedules.`,
        editable: true,
        taxNote: 'Written consent actions have same documentation requirements as meeting actions for tax purposes.',
        legalNote: 'DGCL Section 141(f) permits action by unanimous written consent.',
      },
      {
        id: 'article-3-8',
        title: 'Section 3.8 - Remote Participation',
        content: `Members of the Board or any committee may participate in a meeting by means of conference telephone or other communications equipment by which all persons participating can hear each other. Participation by such means constitutes presence in person at the meeting.

MODERN GOVERNANCE: Essential for a music industry holding company with directors who may be traveling for business, at recording sessions, or managing artists. Video conferencing (Zoom, Teams) is specifically permitted under "other communications equipment."`,
        editable: true,
        taxNote: 'Remote participation does not affect tax treatment of board actions.',
        legalNote: 'DGCL Section 141(i) specifically authorizes remote participation.',
      },
      {
        id: 'article-3-9',
        title: 'Section 3.9 - Committees',
        content: `The Board of Directors may designate one or more committees, each consisting of one or more directors. The Board may designate directors as alternate members of any committee. Each committee shall have and may exercise such powers as the Board provides in the resolution establishing the committee.

RECOMMENDED COMMITTEES: As Producer Tour Holdings scales, consider establishing: (1) Audit Committee for financial oversight, (2) Compensation Committee for officer/employee pay, (3) IP Committee for catalog acquisitions and licensing strategy.`,
        editable: true,
        taxNote: 'Committee compensation is deductible as ordinary business expense.',
        legalNote: 'DGCL Section 141(c) governs committee formation and limitations.',
      },
      {
        id: 'article-3-10',
        title: 'Section 3.10 - Compensation of Directors',
        content: `Directors may receive such compensation for their services and reimbursement for their expenses as may be fixed by resolution of the Board. Director compensation shall be disclosed in the Corporation's annual meeting materials provided to stockholders.

MUSIC INDUSTRY CONTEXT: Independent directors with entertainment industry expertise may command annual retainers of $15,000-$50,000 plus meeting fees. This is a reasonable cost for governance quality and independent oversight of music business operations.`,
        editable: true,
        taxNote: 'Director fees are W-2 income to directors and deductible by the corporation. May be subject to self-employment tax.',
        legalNote: 'Delaware permits director compensation. Excessive compensation may be challenged as waste.',
      },
    ],
  },
  {
    id: 'article-4',
    title: 'ARTICLE IV - OFFICERS',
    subsections: [
      {
        id: 'article-4-1',
        title: 'Section 4.1 - Officers Designated',
        content: `The officers of the Corporation shall be a Chief Executive Officer, a President, a Secretary, and a Treasurer. The Board may also appoint a Chief Financial Officer, one or more Vice Presidents, and such other officers as the Board deems necessary. Any two or more offices may be held by the same person.

HOLDING COMPANY STRUCTURE: For Producer Tour Holdings, consider the CEO managing overall strategy, the CFO/Treasurer handling intercompany finance and subsidiary treasury, and the Secretary maintaining corporate records and compliance calendar. Officers may also serve as managers of subsidiary LLCs.`,
        editable: true,
        taxNote: 'Officer compensation is deductible but subject to reasonable compensation rules, especially for C-Corps.',
        legalNote: 'Delaware does not require specific officers. Common law and practical needs dictate officer structure.',
      },
      {
        id: 'article-4-2',
        title: 'Section 4.2 - Chief Executive Officer',
        content: `The Chief Executive Officer shall be the principal executive officer of the Corporation. Subject to the direction of the Board, the CEO shall (i) have general charge of the business, affairs, and property of the Corporation, (ii) supervise officers and employees, (iii) have authority to sign contracts and other documents on behalf of the Corporation, and (iv) perform such other duties as the Board may assign.

MUSIC BUSINESS CEO ROLE: For a publishing/production holding company, the CEO typically drives: artist and catalog acquisitions, label and publisher partnerships, strategic investments, and overall corporate direction. The CEO should have strong relationships in the music industry.`,
        editable: true,
        taxNote: 'CEO compensation must be reasonable for C-Corp deductibility. Document compensation decisions with board minutes.',
        legalNote: 'CEO authority is defined by bylaws and board resolutions. Third parties may rely on apparent authority.',
      },
      {
        id: 'article-4-3',
        title: 'Section 4.3 - Secretary',
        content: `The Secretary shall (i) keep minutes of all meetings of stockholders, the Board, and committees, (ii) maintain the corporate record book and stock ledger, (iii) give notice of meetings as required by these Bylaws, (iv) be custodian of the corporate seal, and (v) authenticate records of the Corporation.

COMPLIANCE CRITICAL: The Secretary role is essential for maintaining the corporate formalities that protect the liability shield. For Producer Tour Holdings, meticulous record-keeping supports the legitimacy of the holding company structure and intercompany transactions.`,
        editable: true,
        taxNote: 'Proper corporate records are essential evidence in IRS audits of corporate structure and intercompany pricing.',
        legalNote: 'While not legally required, a dedicated Secretary function ensures compliance with corporate formality requirements.',
      },
      {
        id: 'article-4-4',
        title: 'Section 4.4 - Treasurer',
        content: `The Treasurer shall (i) have charge and custody of all funds of the Corporation, (ii) receive and deposit monies in designated depositories, (iii) disburse funds as directed by the Board or CEO, (iv) render financial statements as required, and (v) perform other duties as assigned by the CEO or Board.

HOLDING COMPANY TREASURY: For Producer Tour Holdings, the Treasurer manages cash flows between the holding company and subsidiaries, ensures proper capitalization of each entity, and maintains appropriate intercompany loan documentation. This is critical for the music publishing and production structure.`,
        editable: true,
        taxNote: 'Treasury function is critical for transfer pricing compliance. Document all intercompany loans with proper terms.',
        legalNote: 'Treasurer has fiduciary duty to safeguard corporate assets.',
      },
      {
        id: 'article-4-5',
        title: 'Section 4.5 - Officer Removal',
        content: `Any officer may be removed by the Board of Directors at any time, with or without cause. Such removal shall be without prejudice to the contract rights, if any, of the person so removed.

PRACTICAL APPLICATION: At-will removal allows the Board to quickly address performance issues or change leadership direction. For entertainment industry operations where relationships and reputation are paramount, this flexibility is important.`,
        editable: true,
        taxNote: 'Officer severance payments may be deductible but golden parachute limitations may apply in acquisition contexts.',
        legalNote: 'Delaware permits at-will removal. Employment agreements may provide for severance or notice.',
      },
    ],
  },
  {
    id: 'article-5',
    title: 'ARTICLE V - STOCK',
    subsections: [
      {
        id: 'article-5-1',
        title: 'Section 5.1 - Stock Certificates',
        content: `The Corporation may issue certificated or uncertificated shares of stock. If certificated, certificates shall be signed by any two officers and may bear the corporate seal. The Board may authorize facsimile signatures.

MODERN PRACTICE: Uncertificated (book-entry) shares are increasingly common and reduce administrative burden. For Producer Tour Holdings, uncertificated shares simplify equity grants to employees and allow for efficient cap table management.`,
        editable: true,
        taxNote: 'Certificated vs. uncertificated shares have no tax difference.',
        legalNote: 'DGCL Section 158 permits uncertificated shares.',
      },
      {
        id: 'article-5-2',
        title: 'Section 5.2 - Transfer of Stock',
        content: `Transfers of stock shall be made only upon the books of the Corporation by the holder of record or by a duly authorized attorney. Before a new certificate is issued, the old certificate shall be surrendered for cancellation.

SHAREHOLDER AGREEMENT REFERENCE: These Bylaws should be read together with any Shareholder Agreement which may contain transfer restrictions, rights of first refusal, co-sale rights, and drag-along provisions. Such restrictions are common in music industry holding companies with multiple stakeholders.`,
        editable: true,
        taxNote: 'Stock transfer may trigger capital gains. Section 1202 QSBS exclusion may be available for qualifying C-Corp stock.',
        legalNote: 'Shareholder Agreement restrictions must be noted on certificates or in uncertificated share records to be enforceable.',
      },
      {
        id: 'article-5-3',
        title: 'Section 5.3 - Lost Certificates',
        content: `The Corporation may issue a new certificate in place of any certificate alleged to have been lost, stolen, or destroyed, upon such terms as the Board may prescribe, including a requirement for an indemnity bond.

PRACTICAL NOTE: Lost certificate procedures should balance security against administrative burden. For early-stage holding companies, an affidavit of loss with indemnification is typically sufficient.`,
        editable: true,
        taxNote: 'Lost certificate replacement has no tax implications.',
        legalNote: 'Corporation is protected from claims by good faith reliance on lost certificate procedures.',
      },
      {
        id: 'article-5-4',
        title: 'Section 5.4 - Record Date',
        content: `The Board of Directors may fix a record date for determination of stockholders entitled to notice of or to vote at any meeting, to receive dividends, or for any other purpose. Such record date shall not precede the date on which the resolution fixing the record date is adopted and shall not be more than sixty (60) days before the action to which it relates.

DIVIDEND PLANNING: For C-Corp holding companies, record date procedures affect dividend eligibility. As Producer Tour Holdings distributes income from publishing royalties and production fees, proper record date procedures ensure correct tax reporting to stockholders.`,
        editable: true,
        taxNote: 'Record date determines who reports dividend income. C-Corp dividends are taxed at qualified dividend rates if holding period met.',
        legalNote: 'DGCL Section 213 governs record date procedures.',
      },
    ],
  },
  {
    id: 'article-6',
    title: 'ARTICLE VI - INDEMNIFICATION',
    subsections: [
      {
        id: 'article-6-1',
        title: 'Section 6.1 - Right to Indemnification',
        content: `The Corporation shall indemnify and hold harmless, to the fullest extent permitted by law, any person who was or is made or is threatened to be made a party to or is otherwise involved in any action, suit, or proceeding by reason of the fact that such person is or was a director or officer of the Corporation, against all liability and loss suffered and expenses reasonably incurred.

PROTECTION FOR SERVICE: Broad indemnification rights encourage qualified individuals to serve as directors and officers. In the music industry where litigation over contracts, royalties, and intellectual property is common, robust indemnification is essential for attracting talent to governance roles.`,
        editable: true,
        taxNote: 'Indemnification payments are generally not taxable to the indemnified person if they represent reimbursement for losses.',
        legalNote: 'DGCL Section 145 permits broad indemnification. Delaware law provides maximum protection for directors.',
      },
      {
        id: 'article-6-2',
        title: 'Section 6.2 - Advancement of Expenses',
        content: `The Corporation shall pay the expenses incurred by a director or officer in defending any proceeding in advance of its final disposition, provided such person provides an undertaking to repay such amounts if ultimately determined not to be entitled to indemnification.

IMMEDIATE PROTECTION: Advancement ensures that directors and officers can mount an effective defense without bearing the upfront cost of litigation. This is particularly important in entertainment industry disputes which can involve substantial legal fees.`,
        editable: true,
        taxNote: 'Advanced expenses may be taxable income if not repaid. Undertaking creates potential liability that affects tax treatment.',
        legalNote: 'Advancement is separate from and in addition to indemnification rights.',
      },
      {
        id: 'article-6-3',
        title: 'Section 6.3 - D&O Insurance',
        content: `The Corporation may purchase and maintain insurance on behalf of any person who is or was a director, officer, employee, or agent against any liability asserted against such person in any such capacity, whether or not the Corporation would have the power to indemnify such person against such liability.

RECOMMENDED COVERAGE: Producer Tour Holdings should maintain Directors & Officers (D&O) insurance with appropriate limits. For a music publishing/production holding company, consider $1-5 million in coverage depending on operations scale and number of subsidiaries.`,
        editable: true,
        taxNote: 'D&O insurance premiums are deductible business expenses.',
        legalNote: 'D&O insurance provides protection even when corporate indemnification is not available.',
      },
    ],
  },
  {
    id: 'article-7',
    title: 'ARTICLE VII - GENERAL PROVISIONS',
    subsections: [
      {
        id: 'article-7-1',
        title: 'Section 7.1 - Fiscal Year',
        content: `The fiscal year of the Corporation shall be the calendar year, unless otherwise determined by the Board of Directors.

MUSIC INDUSTRY ALIGNMENT: Calendar year fiscal year aligns with most music industry royalty reporting periods and simplifies accounting for publishing income, mechanical royalties, and performance rights payments.`,
        editable: true,
        taxNote: 'C-Corps may use any fiscal year. Calendar year simplifies alignment with subsidiary LLCs and personal tax planning.',
        legalNote: 'Fiscal year affects timing of annual meeting and financial reporting obligations.',
      },
      {
        id: 'article-7-2',
        title: 'Section 7.2 - Corporate Seal',
        content: `The Corporation may have a corporate seal in such form as the Board of Directors may approve. The seal may be used by causing it or a facsimile thereof to be impressed, affixed, or reproduced.

MODERN PRACTICE: Corporate seals are largely ceremonial in Delaware. Most documents do not require a seal for validity. However, maintaining a seal may be useful for international transactions in jurisdictions that expect formal corporate documentation.`,
        editable: true,
        taxNote: 'Corporate seal has no tax implications.',
        legalNote: 'Delaware does not require a corporate seal. Documents are valid without seal unless specifically required.',
      },
      {
        id: 'article-7-3',
        title: 'Section 7.3 - Checks and Drafts',
        content: `All checks, drafts, or other orders for the payment of money shall be signed by such officer or officers or agent or agents as the Board of Directors may from time to time designate.

INTERNAL CONTROLS: For a holding company managing intercompany transactions, clear signature authority is essential. Consider requiring dual signatures for transactions above a threshold (e.g., $25,000) and board approval for major expenditures.`,
        editable: true,
        taxNote: 'Proper authorization of payments supports business purpose and deductibility.',
        legalNote: 'Signature authority should be documented in board resolutions and communicated to banking institutions.',
      },
      {
        id: 'article-7-4',
        title: 'Section 7.4 - Electronic Transmission',
        content: `Any communication required or permitted by these Bylaws may be given by electronic transmission, including email, if the recipient has consented to receive communications by such means. Electronic signatures shall have the same effect as original signatures.

MODERN BUSINESS: Essential provision for a music industry holding company where rapid communication with artists, producers, label partners, and investors is critical. All notices, consents, and approvals can be given electronically.`,
        editable: true,
        taxNote: 'Electronic records satisfy IRS documentation requirements if properly maintained.',
        legalNote: 'DGCL Section 232 authorizes electronic communications. E-SIGN and UETA provide legal backing for electronic signatures.',
      },
    ],
  },
  {
    id: 'article-8',
    title: 'ARTICLE VIII - AMENDMENTS',
    subsections: [
      {
        id: 'article-8-1',
        title: 'Section 8.1 - Amendment by Board',
        content: `These Bylaws may be amended, altered, or repealed by the Board of Directors. Any bylaw made by the Board may be amended or repealed by the stockholders.

FLEXIBILITY: Board amendment power allows for governance updates without the formality of stockholder meetings. However, stockholders retain ultimate authority over bylaws, providing a check on board power.`,
        editable: true,
        taxNote: 'Bylaw amendments have no direct tax consequences but should be documented in corporate records.',
        legalNote: 'DGCL Section 109 governs bylaw amendments. Certificate of Incorporation may limit board amendment authority.',
      },
      {
        id: 'article-8-2',
        title: 'Section 8.2 - Amendment by Stockholders',
        content: `These Bylaws may be amended at any annual or special meeting of stockholders by the affirmative vote of a majority of the shares present and entitled to vote, provided that notice of the proposed amendment has been given in the notice of the meeting.

STOCKHOLDER RIGHTS: This ensures stockholders can modify governance rules even over board objection. For Producer Tour Holdings, this provides important protection for minority stockholders and investors.`,
        editable: true,
        taxNote: 'Stockholder-approved bylaw amendments should be documented in meeting minutes.',
        legalNote: 'Stockholder right to amend bylaws is protected by Delaware law and cannot be eliminated by the board.',
      },
    ],
  },
];

// ============================================================================
// Cursor Component - Shows other users' cursors
// ============================================================================

function Cursor({ x, y, color, name }: { x: number; y: number; color: string; name: string }) {
  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      className="absolute pointer-events-none z-50"
      style={{
        left: x,
        top: y,
        transform: 'translate(-2px, -2px)',
      }}
    >
      {/* Cursor arrow */}
      <svg
        width="24"
        height="36"
        viewBox="0 0 24 36"
        fill="none"
        style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}
      >
        <path
          d="M5.65376 12.4563L0.169922 0.957031L18.1908 14.5853L8.97668 16.0053L5.65376 12.4563Z"
          fill={color}
        />
      </svg>
      {/* Name label */}
      <div
        className="absolute left-4 top-4 px-2 py-1 rounded-md text-xs font-medium text-white whitespace-nowrap"
        style={{ backgroundColor: color }}
      >
        {name}
      </div>
    </motion.div>
  );
}

// ============================================================================
// Presence Avatars - Shows who's in the document
// ============================================================================

function PresenceAvatars() {
  const others = useOthers();
  const self = useSelf();

  return (
    <div className="flex items-center gap-2">
      <div className="flex -space-x-2">
        {/* Self */}
        {self && (
          <div
            className="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-xs font-bold text-white"
            style={{ backgroundColor: self.presence.color }}
            title={`${self.presence.name} (You)`}
          >
            {self.presence.name?.charAt(0).toUpperCase() || 'Y'}
          </div>
        )}
        {/* Others */}
        {others.map(({ connectionId, presence }) => (
          <div
            key={connectionId}
            className="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-xs font-bold text-white"
            style={{ backgroundColor: presence.color }}
            title={presence.name}
          >
            {presence.name?.charAt(0).toUpperCase() || '?'}
          </div>
        ))}
      </div>
      <span className="text-xs text-slate-400">
        {others.length + 1} viewing
      </span>
    </div>
  );
}

// ============================================================================
// Document Section Component
// ============================================================================

interface SectionProps {
  section: typeof BYLAWS_SECTIONS[0];
  isExpanded: boolean;
  onToggle: () => void;
  onEdit: (subsectionId: string) => void;
  editingSection: string | null;
  onSectionHover: (sectionId: string | null) => void;
}

function DocumentSection({ section, isExpanded, onToggle, onEdit, editingSection, onSectionHover }: SectionProps) {
  const others = useOthers();
  const updatePresence = useUpdateMyPresence();

  // Check if others are viewing this section
  const othersInSection = others.filter(
    (other) => other.presence.focusedSection?.startsWith(section.id)
  );

  return (
    <div className="border border-slate-700/50 rounded-lg overflow-hidden">
      {/* Section Header */}
      <button
        onClick={onToggle}
        onMouseEnter={() => {
          updatePresence({ focusedSection: section.id });
          onSectionHover(section.id);
        }}
        onMouseLeave={() => {
          updatePresence({ focusedSection: undefined });
          onSectionHover(null);
        }}
        className="w-full p-4 bg-slate-800/50 hover:bg-slate-800/70 transition-colors flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          {isExpanded ? (
            <ChevronDown className="w-5 h-5 text-blue-400" />
          ) : (
            <ChevronRight className="w-5 h-5 text-slate-400" />
          )}
          <h3 className="text-lg font-bold text-white">{section.title}</h3>
        </div>
        {/* Others viewing indicator */}
        {othersInSection.length > 0 && (
          <div className="flex -space-x-1">
            {othersInSection.map(({ connectionId, presence }) => (
              <div
                key={connectionId}
                className="w-6 h-6 rounded-full border border-white flex items-center justify-center text-[10px] font-bold text-white"
                style={{ backgroundColor: presence.color }}
                title={`${presence.name} is viewing`}
              >
                {presence.name?.charAt(0).toUpperCase()}
              </div>
            ))}
          </div>
        )}
      </button>

      {/* Subsections */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            {section.subsections.map((subsection) => (
              <SubsectionContent
                key={subsection.id}
                subsection={subsection}
                isEditing={editingSection === subsection.id}
                onEdit={() => onEdit(subsection.id)}
                onSectionHover={onSectionHover}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================================================
// Subsection Content Component
// ============================================================================

interface SubsectionContentProps {
  subsection: typeof BYLAWS_SECTIONS[0]['subsections'][0];
  isEditing: boolean;
  onEdit: () => void;
  onSectionHover: (sectionId: string | null) => void;
}

function SubsectionContent({ subsection, isEditing, onEdit, onSectionHover }: SubsectionContentProps) {
  const [editedContent, setEditedContent] = useState(subsection.content);
  const others = useOthers();
  const updatePresence = useUpdateMyPresence();

  // Check if others are editing this subsection
  const othersEditing = others.filter(
    (other) => other.presence.focusedSection === subsection.id && other.presence.isEditing
  );

  return (
    <div
      className={`p-4 border-t border-slate-700/30 ${isEditing ? 'bg-blue-500/10' : 'hover:bg-slate-800/30'}`}
      onMouseEnter={() => {
        updatePresence({ focusedSection: subsection.id });
        onSectionHover(subsection.id);
      }}
      onMouseLeave={() => {
        updatePresence({ focusedSection: undefined });
        onSectionHover(null);
      }}
    >
      <div className="flex items-start justify-between mb-3">
        <h4 className="text-sm font-semibold text-blue-300">{subsection.title}</h4>
        <div className="flex items-center gap-2">
          {/* Others editing indicator */}
          {othersEditing.length > 0 && (
            <div className="flex items-center gap-1 px-2 py-0.5 bg-yellow-500/20 rounded text-xs text-yellow-300">
              <Pencil className="w-3 h-3" />
              {othersEditing[0].presence.name} editing
            </div>
          )}
          {/* Edit button */}
          {subsection.editable && !isEditing && (
            <button
              onClick={onEdit}
              className="p-1 text-slate-400 hover:text-blue-400 transition-colors"
              title="Edit this section"
            >
              <Edit3 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      {isEditing ? (
        <textarea
          value={editedContent}
          onChange={(e) => setEditedContent(e.target.value)}
          className="w-full h-64 p-3 bg-slate-900/50 border border-blue-500/30 rounded-lg text-sm text-slate-200 font-mono resize-none focus:outline-none focus:border-blue-500"
          onFocus={() => updatePresence({ isEditing: true })}
          onBlur={() => updatePresence({ isEditing: false })}
        />
      ) : (
        <div className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">
          {subsection.content}
        </div>
      )}

      {/* Tax & Legal Notes */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        {subsection.taxNote && (
          <div className="p-3 bg-green-500/10 rounded-lg border border-green-500/20">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="w-3.5 h-3.5 text-green-400" />
              <span className="text-xs font-medium text-green-300">Tax Note</span>
            </div>
            <p className="text-xs text-slate-400">{subsection.taxNote}</p>
          </div>
        )}
        {subsection.legalNote && (
          <div className="p-3 bg-purple-500/10 rounded-lg border border-purple-500/20">
            <div className="flex items-center gap-2 mb-1">
              <Scale className="w-3.5 h-3.5 text-purple-400" />
              <span className="text-xs font-medium text-purple-300">Legal Note</span>
            </div>
            <p className="text-xs text-slate-400">{subsection.legalNote}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Main Document Editor (Inside Room)
// ============================================================================

interface DocumentEditorContentProps {
  step: CorporateQuestStep;
  quest: CorporateQuest;
  onClose: () => void;
  onComplete: () => void;
}

function DocumentEditorContent({ step, quest, onClose, onComplete }: DocumentEditorContentProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['article-1']));
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'edit' | 'review'>('review');
  const containerRef = useRef<HTMLDivElement>(null);

  const status = useStatus();
  const others = useOthers();
  const updatePresence = useUpdateMyPresence();

  // Track cursor position
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        updatePresence({
          cursor: {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
          },
        });
      }
    };

    const handleMouseLeave = () => {
      updatePresence({ cursor: null });
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('mousemove', handleMouseMove);
      container.addEventListener('mouseleave', handleMouseLeave);
    }

    return () => {
      if (container) {
        container.removeEventListener('mousemove', handleMouseMove);
        container.removeEventListener('mouseleave', handleMouseLeave);
      }
    };
  }, [updatePresence]);

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  const handleSectionHover = (sectionId: string | null) => {
    updatePresence({ focusedSection: sectionId || undefined });
  };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-md"
        onClick={onClose}
      />

      {/* Editor Panel */}
      <motion.div
        ref={containerRef}
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative bg-gradient-to-b from-slate-900 to-slate-950 border border-blue-500/40 rounded-2xl w-full max-w-5xl h-[90vh] overflow-hidden shadow-[0_0_60px_rgba(59,130,246,0.3)] flex flex-col"
      >
        {/* Header */}
        <div className="p-4 border-b border-blue-500/20 bg-gradient-to-r from-blue-600/20 via-purple-600/20 to-blue-600/20 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <FileText className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Corporate Bylaws</h3>
                <p className="text-xs text-blue-300/70">Producer Tour Holdings, Inc. - Delaware C-Corp</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {/* Connection status */}
              <div className="flex items-center gap-2">
                <div
                  className={`w-2 h-2 rounded-full ${
                    status === 'connected' ? 'bg-green-400' : 'bg-yellow-400 animate-pulse'
                  }`}
                />
                <span className="text-xs text-slate-400">
                  {status === 'connected' ? 'Live' : 'Connecting...'}
                </span>
              </div>
              {/* Presence avatars */}
              <PresenceAvatars />
              {/* View mode toggle */}
              <div className="flex bg-slate-800 rounded-lg p-0.5">
                <button
                  onClick={() => setViewMode('review')}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    viewMode === 'review'
                      ? 'bg-blue-500 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5 inline mr-1" />
                  Review
                </button>
                <button
                  onClick={() => setViewMode('edit')}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    viewMode === 'edit'
                      ? 'bg-blue-500 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Edit3 className="w-3.5 h-3.5 inline mr-1" />
                  Edit
                </button>
              </div>
              {/* Close button */}
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-slate-800/80 transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
          </div>

          {/* Quest Step Info */}
          <div className="mt-3 p-3 bg-slate-800/50 rounded-lg border border-slate-700/50 flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-yellow-300">{quest.title}</div>
              <div className="text-xs text-slate-400">{step.title}</div>
            </div>
            <button
              onClick={onComplete}
              className="px-4 py-2 bg-green-500 hover:bg-green-600 rounded-lg text-sm font-medium text-white flex items-center gap-2 transition-colors"
            >
              <Check className="w-4 h-4" />
              Mark Complete
            </button>
          </div>
        </div>

        {/* Document Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Document Header */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-white mb-2">BYLAWS</h1>
            <h2 className="text-xl text-blue-300 mb-1">OF</h2>
            <h2 className="text-xl font-bold text-white">PRODUCER TOUR HOLDINGS, INC.</h2>
            <p className="text-sm text-slate-400 mt-4">
              A Delaware Corporation
            </p>
            <p className="text-xs text-slate-500 mt-2">
              Effective as of [Date of Incorporation]
            </p>
          </div>

          {/* Sections */}
          {BYLAWS_SECTIONS.map((section) => (
            <DocumentSection
              key={section.id}
              section={section}
              isExpanded={expandedSections.has(section.id)}
              onToggle={() => toggleSection(section.id)}
              onEdit={(subsectionId) => {
                if (viewMode === 'edit') {
                  setEditingSection(editingSection === subsectionId ? null : subsectionId);
                }
              }}
              editingSection={viewMode === 'edit' ? editingSection : null}
              onSectionHover={handleSectionHover}
            />
          ))}

          {/* Signature Block */}
          <div className="mt-8 p-6 border border-slate-700/50 rounded-lg">
            <h3 className="text-lg font-bold text-white mb-4">CERTIFICATE OF ADOPTION</h3>
            <p className="text-sm text-slate-300 mb-6">
              The undersigned Secretary of Producer Tour Holdings, Inc. hereby certifies that the
              foregoing Bylaws were duly adopted by the Board of Directors of the Corporation on
              _________________, 20___.
            </p>
            <div className="grid grid-cols-2 gap-8 mt-8">
              <div>
                <div className="border-b border-slate-600 mb-2" />
                <p className="text-sm text-slate-400">Secretary</p>
              </div>
              <div>
                <div className="border-b border-slate-600 mb-2" />
                <p className="text-sm text-slate-400">Date</p>
              </div>
            </div>
          </div>
        </div>

        {/* Other users' cursors */}
        {others.map(({ connectionId, presence }) => {
          if (!presence.cursor) return null;
          return (
            <Cursor
              key={connectionId}
              x={presence.cursor.x}
              y={presence.cursor.y}
              color={presence.color}
              name={presence.name}
            />
          );
        })}
      </motion.div>
    </div>
  );
}

// ============================================================================
// Main Exported Component
// ============================================================================

interface CoopDocumentEditorProps {
  isOpen: boolean;
  onClose: () => void;
  step: CorporateQuestStep;
  quest: CorporateQuest;
  entityId: string;
  onComplete: (stepId: string) => void;
}

export function CoopDocumentEditor({
  isOpen,
  onClose,
  step,
  quest,
  entityId,
  onComplete,
}: CoopDocumentEditorProps) {
  const { user } = useAuthStore();
  const roomId = getDocumentRoomId(entityId, quest.id, step.id);

  // Initial presence for this user
  // Use firstName/lastName if available, otherwise use email prefix
  const displayName = user?.firstName && user?.lastName
    ? `${user.firstName} ${user.lastName}`
    : user?.firstName || user?.email?.split('@')[0] || 'Anonymous';

  const initialPresence: Presence = {
    cursor: null,
    selection: null,
    name: displayName,
    color: getUserColor(user?.id || 'anonymous'),
    avatar: undefined, // User model doesn't have avatarUrl
    isEditing: false,
    focusedSection: undefined,
  };

  // Initial storage state
  const initialStorage: Storage = {
    document: {
      content: '',
      lastModified: new Date().toISOString(),
      modifiedBy: user?.id || 'anonymous',
      version: 1,
    },
    annotations: [],
  };

  if (!isOpen) return null;

  // Check if Liveblocks key is configured
  const hasLiveblocksKey = !!import.meta.env.VITE_LIVEBLOCKS_PUBLIC_KEY;

  if (!hasLiveblocksKey) {
    // Fallback to non-collaborative mode
    return (
      <div className="absolute inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="absolute inset-0 bg-black/80 backdrop-blur-md"
          onClick={onClose}
        />
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="relative bg-slate-900 border border-yellow-500/40 rounded-2xl p-6 max-w-md"
        >
          <AlertCircle className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-white text-center mb-2">
            Co-op Mode Not Configured
          </h3>
          <p className="text-sm text-slate-400 text-center mb-4">
            To enable real-time collaboration, add your Liveblocks public key to the environment variables.
          </p>
          <pre className="bg-slate-800 p-3 rounded-lg text-xs text-slate-300 mb-4">
            VITE_LIVEBLOCKS_PUBLIC_KEY=pk_...
          </pre>
          <button
            onClick={onClose}
            className="w-full py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white text-sm"
          >
            Close
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <RoomProvider
      id={roomId}
      initialPresence={initialPresence}
      initialStorage={initialStorage}
    >
      <Suspense
        fallback={
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="w-12 h-12 animate-spin text-blue-400" />
              <div className="text-white">Joining co-op session...</div>
            </div>
          </div>
        }
      >
        <DocumentEditorContent
          step={step}
          quest={quest}
          onClose={onClose}
          onComplete={() => onComplete(step.id)}
        />
      </Suspense>
    </RoomProvider>
  );
}

export default CoopDocumentEditor;
