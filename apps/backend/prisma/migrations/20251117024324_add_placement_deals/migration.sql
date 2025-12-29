-- CreateTable
CREATE TABLE "placement_deals" (
    "id" TEXT NOT NULL,
    "clientFullName" TEXT NOT NULL,
    "clientPKA" TEXT NOT NULL,
    "songTitle" TEXT NOT NULL,
    "artistName" TEXT NOT NULL,
    "streams" TEXT,
    "label" TEXT,
    "coProducers" TEXT,
    "status" TEXT,
    "action" TEXT,
    "legalFeeAmount" TEXT,
    "legalFeeType" TEXT NOT NULL DEFAULT 'Flat Fee',
    "legalFeePaymentSource" TEXT NOT NULL DEFAULT 'Out of Advance',
    "hasLegalFeeBeenPaid" TEXT NOT NULL DEFAULT 'No',
    "advance" TEXT,
    "masterRoyalty" TEXT,
    "pubPercent" TEXT,
    "sxLOD" TEXT,
    "contractContactName" TEXT,
    "contractCompany" TEXT,
    "contractContactEmail" TEXT,
    "contractMailingAddress" TEXT,
    "contractSoundExchangePayee" TEXT,
    "contractCreditLine" TEXT,
    "contractLink" TEXT,
    "released" BOOLEAN NOT NULL DEFAULT false,
    "advReceived" TEXT NOT NULL DEFAULT 'Not Received',
    "masterCol" TEXT NOT NULL DEFAULT 'Not Collecting',
    "soundEx" TEXT NOT NULL DEFAULT 'Not Collecting',
    "publicPerf" TEXT NOT NULL DEFAULT 'Not Collecting',
    "mech" TEXT NOT NULL DEFAULT 'Not Collecting',
    "agreement" TEXT NOT NULL DEFAULT 'Draft has not been received',
    "notes" TEXT,
    "billingClientName" TEXT,
    "billingClientPKA" TEXT,
    "billingClientAddress" TEXT,
    "billingClientCity" TEXT,
    "billingProjectTitle" TEXT,
    "billingInvoiceNumber" TEXT,
    "billingArtistLegal" TEXT,
    "billingArtistStage" TEXT,
    "billingLabelName" TEXT,
    "billingBillToEmail" TEXT,
    "billingBillToContact" TEXT,
    "billingIssueDate" TEXT,
    "billingDueDate" TEXT,
    "billingAmount" TEXT,
    "billingCostsExpenses" TEXT,
    "billingSalesTax" TEXT,
    "billingAmountPaid" TEXT,
    "billingServices" TEXT,
    "billingPaymentTerms" TEXT,
    "billingPaymentChannel" TEXT,
    "billingBookkeepingNotes" TEXT,
    "billingBankAccountName" TEXT,
    "billingBankName" TEXT,
    "billingBankAddress" TEXT,
    "billingRoutingNumber" TEXT,
    "billingAccountNumber" TEXT,
    "billingSwiftCode" TEXT,
    "invoiceDraftHtml" TEXT,
    "createdById" TEXT,
    "lastModifiedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "placement_deals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "placement_deals_clientFullName_idx" ON "placement_deals"("clientFullName");

-- CreateIndex
CREATE INDEX "placement_deals_songTitle_idx" ON "placement_deals"("songTitle");

-- CreateIndex
CREATE INDEX "placement_deals_status_idx" ON "placement_deals"("status");

-- CreateIndex
CREATE INDEX "placement_deals_billingInvoiceNumber_idx" ON "placement_deals"("billingInvoiceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "placement_deals_billingInvoiceNumber_key" ON "placement_deals"("billingInvoiceNumber");
