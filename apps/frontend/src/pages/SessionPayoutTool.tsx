import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { DollarSign, Clock, Music, Users, FileText, CreditCard, CheckCircle2, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { sessionPayoutApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';

interface SessionData {
  date: string;
  workOrder: string;
  artistName: string;
  producerName: string;
  songTitles: string;
  startTime: string;
  finishTime: string;
  totalHours: number;
  studioName: string;
  trackingEngineer: string;
  assistantEngineer: string;
  mixEngineer: string;
  masteringEngineer: string;
  sessionNotes: string;
  masterLink: string;
  sessionFilesLink: string;
  beatStemsLink: string;
  beatLink: string;
  sampleInfo: string;
  midiPresetsLink: string;
  studioRateType: 'hourly' | 'flat';
  studioRate: number;
  engineerRateType: 'hourly' | 'flat';
  engineerRate: number;
  paymentSplit: 'split' | 'combined';
  depositPaid: number;
}

export default function SessionPayoutTool() {
  const [formData, setFormData] = useState<SessionData>({
    date: new Date().toISOString().split('T')[0],
    workOrder: '',
    artistName: '',
    producerName: '',
    songTitles: '',
    startTime: '',
    finishTime: '',
    totalHours: 0,
    studioName: '',
    trackingEngineer: '',
    assistantEngineer: '',
    mixEngineer: '',
    masteringEngineer: '',
    sessionNotes: '',
    masterLink: '',
    sessionFilesLink: '',
    beatStemsLink: '',
    beatLink: '',
    sampleInfo: '',
    midiPresetsLink: '',
    studioRateType: 'hourly',
    studioRate: 100,
    engineerRateType: 'hourly',
    engineerRate: 50,
    paymentSplit: 'split',
    depositPaid: 0,
  });

  const [calculations, setCalculations] = useState({
    studioCost: 0,
    engineerFee: 0,
    totalSessionCost: 0,
    paymentDueToEngineer: 0,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Calculate hours when start/finish time changes
  useEffect(() => {
    if (formData.startTime && formData.finishTime) {
      const start = new Date(`2000/01/01 ${formData.startTime}`);
      let finish = new Date(`2000/01/01 ${formData.finishTime}`);

      if (finish.getTime() < start.getTime()) {
        finish.setDate(finish.getDate() + 1);
      }

      const diffMs = finish.getTime() - start.getTime();
      const hours = diffMs / (1000 * 60 * 60);

      setFormData(prev => ({ ...prev, totalHours: hours }));
    }
  }, [formData.startTime, formData.finishTime]);

  // Recalculate payment whenever relevant fields change
  useEffect(() => {
    const { totalHours, studioRateType, studioRate, engineerRateType, engineerRate, paymentSplit, depositPaid } = formData;

    let studioCost = 0;
    if (totalHours > 0 || studioRateType === 'flat') {
      studioCost = studioRateType === 'hourly' ? studioRate * totalHours : studioRate;
    }

    let engineerFee = 0;
    if (totalHours > 0 || engineerRateType === 'flat') {
      engineerFee = engineerRateType === 'hourly' ? engineerRate * totalHours : engineerRate;
    }

    const totalSessionCost = studioCost + engineerFee;

    let paymentDueToEngineer = 0;
    if (paymentSplit === 'combined') {
      paymentDueToEngineer = totalSessionCost - depositPaid;
    } else {
      const remainingDeposit = Math.max(0, depositPaid - studioCost);
      paymentDueToEngineer = engineerFee - remainingDeposit;
    }

    paymentDueToEngineer = Math.max(0, paymentDueToEngineer);

    setCalculations({
      studioCost,
      engineerFee,
      totalSessionCost,
      paymentDueToEngineer,
    });
  }, [formData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const { user } = useAuthStore.getState();

    try {
      await sessionPayoutApi.submit({
        sessionDate: formData.date,
        workOrderNumber: formData.workOrder || undefined,
        artistName: formData.artistName,
        songTitles: formData.songTitles,
        startTime: formData.startTime,
        finishTime: formData.finishTime,
        totalHours: formData.totalHours,
        studioName: formData.studioName,
        trackingEngineer: formData.trackingEngineer,
        assistantEngineer: formData.assistantEngineer || undefined,
        mixEngineer: formData.mixEngineer || undefined,
        masteringEngineer: formData.masteringEngineer || undefined,
        sessionNotes: formData.sessionNotes || undefined,
        masterLink: formData.masterLink,
        sessionFilesLink: formData.sessionFilesLink,
        beatStemsLink: formData.beatStemsLink,
        beatLink: formData.beatLink,
        sampleInfo: formData.sampleInfo || undefined,
        midiPresetsLink: formData.midiPresetsLink || undefined,
        studioRateType: formData.studioRateType,
        studioRate: formData.studioRate,
        engineerRateType: formData.engineerRateType,
        engineerRate: formData.engineerRate,
        paymentSplit: formData.paymentSplit,
        depositPaid: formData.depositPaid,
        studioCost: calculations.studioCost,
        engineerFee: calculations.engineerFee,
        totalSessionCost: calculations.totalSessionCost,
        payoutAmount: calculations.paymentDueToEngineer,
        submittedByName: formData.producerName,
        submittedByEmail: user?.email,
      });

      toast.success(`Payment request submitted! Engineer payout: $${calculations.paymentDueToEngineer.toFixed(2)}`);

      // Reset form after successful submission
      setFormData({
        date: new Date().toISOString().split('T')[0],
        workOrder: '',
        artistName: '',
        producerName: '',
        songTitles: '',
        startTime: '',
        finishTime: '',
        totalHours: 0,
        studioName: '',
        trackingEngineer: '',
        assistantEngineer: '',
        mixEngineer: '',
        masteringEngineer: '',
        sessionNotes: '',
        masterLink: '',
        sessionFilesLink: '',
        beatStemsLink: '',
        beatLink: '',
        sampleInfo: '',
        midiPresetsLink: '',
        studioRateType: 'hourly',
        studioRate: 100,
        engineerRateType: 'hourly',
        engineerRate: 50,
        paymentSplit: 'split',
        depositPaid: 0,
      });
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Failed to submit session. Please try again.';
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-400 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-display-lg text-text-primary mb-3 font-display">
            Session Payout & Delivery
          </h1>
          <p className="text-body-lg text-text-secondary">
            Comprehensive submission for session metadata, asset delivery, and engineer payment.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section 1: Core Session Information */}
          <Card className="bg-surface-100 border-panel-border shadow-card">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary-500/10">
                  <Music className="w-5 h-5 text-primary-500" />
                </div>
                <div>
                  <CardTitle className="text-text-primary">Session & Project Details</CardTitle>
                  <CardDescription className="text-text-muted">Basic session information</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date" className="text-text-secondary">Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="bg-surface-200 border-panel-border text-text-primary"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="workOrder" className="text-text-secondary">Work Order / Project #</Label>
                  <Input
                    id="workOrder"
                    placeholder="PT-WO-XXXX (Optional)"
                    value={formData.workOrder}
                    onChange={(e) => setFormData({ ...formData, workOrder: e.target.value })}
                    className="bg-surface-200 border-panel-border text-text-primary"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="artistName" className="text-text-secondary">Artist Name</Label>
                  <Input
                    id="artistName"
                    placeholder="Artist Name"
                    value={formData.artistName}
                    onChange={(e) => setFormData({ ...formData, artistName: e.target.value })}
                    className="bg-surface-200 border-panel-border text-text-primary"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="producerName" className="text-text-secondary">Submitting Engineer / Producer Name</Label>
                  <Input
                    id="producerName"
                    placeholder="Full Name"
                    value={formData.producerName}
                    onChange={(e) => setFormData({ ...formData, producerName: e.target.value })}
                    className="bg-surface-200 border-panel-border text-text-primary"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="songTitles" className="text-text-secondary">Song Title(s) / Working Title</Label>
                  <Input
                    id="songTitles"
                    placeholder="Song Title"
                    value={formData.songTitles}
                    onChange={(e) => setFormData({ ...formData, songTitles: e.target.value })}
                    className="bg-surface-200 border-panel-border text-text-primary"
                    required
                  />
                </div>
              </div>

              {/* Time and Duration */}
              <Card className="bg-surface-200 border-panel-border">
                <CardContent className="pt-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="startTime" className="text-text-secondary flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        Start Time
                      </Label>
                      <Input
                        id="startTime"
                        type="time"
                        value={formData.startTime}
                        onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                        className="bg-surface-300 border-panel-border text-text-primary"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="finishTime" className="text-text-secondary flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        Finish Time
                      </Label>
                      <Input
                        id="finishTime"
                        type="time"
                        value={formData.finishTime}
                        onChange={(e) => setFormData({ ...formData, finishTime: e.target.value })}
                        className="bg-surface-300 border-panel-border text-text-primary"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-text-secondary">Total Session Hours</Label>
                      <Input
                        value={formData.totalHours.toFixed(1)}
                        readOnly
                        className="bg-surface-300 border-panel-border text-text-primary font-semibold"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </CardContent>
          </Card>

          {/* Section 2: Technical Personnel Details */}
          <Card className="bg-surface-100 border-panel-border shadow-card">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary-500/10">
                  <Users className="w-5 h-5 text-primary-500" />
                </div>
                <div>
                  <CardTitle className="text-text-primary">Studio & Technical Personnel</CardTitle>
                  <CardDescription className="text-text-muted">Team and equipment details</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="studioName" className="text-text-secondary">Studio Name</Label>
                  <Input
                    id="studioName"
                    placeholder="e.g., audiOVISION STUDIOS / SSL BLESSED"
                    value={formData.studioName}
                    onChange={(e) => setFormData({ ...formData, studioName: e.target.value })}
                    className="bg-surface-200 border-panel-border text-text-primary"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="trackingEngineer" className="text-text-secondary">Tracking Engineer (Primary)</Label>
                  <Input
                    id="trackingEngineer"
                    placeholder="Name of primary tracking personnel"
                    value={formData.trackingEngineer}
                    onChange={(e) => setFormData({ ...formData, trackingEngineer: e.target.value })}
                    className="bg-surface-200 border-panel-border text-text-primary"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="assistantEngineer" className="text-text-secondary">Assistant Engineer</Label>
                  <Input
                    id="assistantEngineer"
                    placeholder="Optional"
                    value={formData.assistantEngineer}
                    onChange={(e) => setFormData({ ...formData, assistantEngineer: e.target.value })}
                    className="bg-surface-200 border-panel-border text-text-primary"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mixEngineer" className="text-text-secondary">Mix Engineer</Label>
                  <Input
                    id="mixEngineer"
                    placeholder="Optional"
                    value={formData.mixEngineer}
                    onChange={(e) => setFormData({ ...formData, mixEngineer: e.target.value })}
                    className="bg-surface-200 border-panel-border text-text-primary"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="masteringEngineer" className="text-text-secondary">Mastering Engineer</Label>
                  <Input
                    id="masteringEngineer"
                    placeholder="Optional"
                    value={formData.masteringEngineer}
                    onChange={(e) => setFormData({ ...formData, masteringEngineer: e.target.value })}
                    className="bg-surface-200 border-panel-border text-text-primary"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="sessionNotes" className="text-text-secondary">Session Notes / Equipment Used</Label>
                <Textarea
                  id="sessionNotes"
                  placeholder="e.g., Mic Used (U87), Preamp (Neve 1073), Specific outboard gear..."
                  value={formData.sessionNotes}
                  onChange={(e) => setFormData({ ...formData, sessionNotes: e.target.value })}
                  className="bg-surface-200 border-panel-border text-text-primary min-h-[100px]"
                />
              </div>
            </CardContent>
          </Card>

          {/* Section 3: Asset Delivery */}
          <Card className="bg-surface-100 border-panel-border shadow-card">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary-500/10">
                  <FileText className="w-5 h-5 text-primary-500" />
                </div>
                <div>
                  <CardTitle className="text-text-primary">Asset Delivery & File Links</CardTitle>
                  <CardDescription className="text-text-muted">
                    All primary asset links are required for payment processing
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="masterLink" className="text-text-secondary">
                    Master Recording (Vocal/Final Mix) *
                  </Label>
                  <Input
                    id="masterLink"
                    type="url"
                    placeholder="Link to High-Res Master (.wav)"
                    value={formData.masterLink}
                    onChange={(e) => setFormData({ ...formData, masterLink: e.target.value })}
                    className="bg-surface-200 border-panel-border text-text-primary"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sessionFilesLink" className="text-text-secondary">
                    Session Files (Pro Tools, Logic, FLP) *
                  </Label>
                  <Input
                    id="sessionFilesLink"
                    type="url"
                    placeholder="Link to Session File Folder"
                    value={formData.sessionFilesLink}
                    onChange={(e) => setFormData({ ...formData, sessionFilesLink: e.target.value })}
                    className="bg-surface-200 border-panel-border text-text-primary"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="beatStemsLink" className="text-text-secondary">
                    Beat Stems (All Individual Tracks) *
                  </Label>
                  <Input
                    id="beatStemsLink"
                    type="url"
                    placeholder="Link to Beat Stems folder"
                    value={formData.beatStemsLink}
                    onChange={(e) => setFormData({ ...formData, beatStemsLink: e.target.value })}
                    className="bg-surface-200 border-panel-border text-text-primary"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="beatLink" className="text-text-secondary">
                    Beat / Instrumental Track *
                  </Label>
                  <Input
                    id="beatLink"
                    type="url"
                    placeholder="Link to Stereo Beat (.wav)"
                    value={formData.beatLink}
                    onChange={(e) => setFormData({ ...formData, beatLink: e.target.value })}
                    className="bg-surface-200 border-panel-border text-text-primary"
                    required
                  />
                </div>
              </div>

              <Separator className="bg-panel-border" />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sampleInfo" className="text-text-secondary">
                    Sample / Interpolation Details
                  </Label>
                  <Input
                    id="sampleInfo"
                    placeholder="Song Title, Artist, Timing (or N/A)"
                    value={formData.sampleInfo}
                    onChange={(e) => setFormData({ ...formData, sampleInfo: e.target.value })}
                    className="bg-surface-200 border-panel-border text-text-primary"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="midiPresetsLink" className="text-text-secondary">
                    MIDI Files / Preset Information
                  </Label>
                  <Input
                    id="midiPresetsLink"
                    type="url"
                    placeholder="Link to MIDI data or VST preset list (Optional)"
                    value={formData.midiPresetsLink}
                    onChange={(e) => setFormData({ ...formData, midiPresetsLink: e.target.value })}
                    className="bg-surface-200 border-panel-border text-text-primary"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section 4: Financial Structure */}
          <Card className="bg-surface-100 border-panel-border shadow-card">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary-500/10">
                  <DollarSign className="w-5 h-5 text-primary-500" />
                </div>
                <div>
                  <CardTitle className="text-text-primary">Financial Structure</CardTitle>
                  <CardDescription className="text-text-muted">Studio and engineer rates</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Studio Fee */}
                <Card className="bg-surface-200 border-panel-border">
                  <CardHeader>
                    <CardTitle className="text-lg text-text-primary">Studio Charge Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <Label className="text-text-secondary">Studio Fee Type</Label>
                      <RadioGroup
                        value={formData.studioRateType}
                        onValueChange={(value: 'hourly' | 'flat') => setFormData({ ...formData, studioRateType: value })}
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="hourly" id="studio-hourly" />
                          <Label htmlFor="studio-hourly" className="text-text-primary cursor-pointer">Hourly Rate</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="flat" id="studio-flat" />
                          <Label htmlFor="studio-flat" className="text-text-primary cursor-pointer">Flat Session Fee</Label>
                        </div>
                      </RadioGroup>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="studioRate" className="text-text-secondary">Studio Rate ($)</Label>
                      <Input
                        id="studioRate"
                        type="number"
                        placeholder="e.g., 100"
                        value={formData.studioRate}
                        onChange={(e) => setFormData({ ...formData, studioRate: parseFloat(e.target.value) || 0 })}
                        className="bg-surface-300 border-panel-border text-text-primary"
                        required
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Engineer Fee */}
                <Card className="bg-surface-200 border-panel-border">
                  <CardHeader>
                    <CardTitle className="text-lg text-text-primary">Engineer / Producer Charge Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <Label className="text-text-secondary">Engineer Fee Type</Label>
                      <RadioGroup
                        value={formData.engineerRateType}
                        onValueChange={(value: 'hourly' | 'flat') => setFormData({ ...formData, engineerRateType: value })}
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="hourly" id="engineer-hourly" />
                          <Label htmlFor="engineer-hourly" className="text-text-primary cursor-pointer">Hourly Rate</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="flat" id="engineer-flat" />
                          <Label htmlFor="engineer-flat" className="text-text-primary cursor-pointer">Flat Session Fee</Label>
                        </div>
                      </RadioGroup>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="engineerRate" className="text-text-secondary">Engineer Rate ($)</Label>
                      <Input
                        id="engineerRate"
                        type="number"
                        placeholder="e.g., 50"
                        value={formData.engineerRate}
                        onChange={(e) => setFormData({ ...formData, engineerRate: parseFloat(e.target.value) || 0 })}
                        className="bg-surface-300 border-panel-border text-text-primary"
                        required
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>

          {/* Section 5: Payment Logic */}
          <Card className="bg-surface-100 border-panel-border shadow-card">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary-500/10">
                  <CreditCard className="w-5 h-5 text-primary-500" />
                </div>
                <div>
                  <CardTitle className="text-text-primary">Payment & Reimbursement Logic</CardTitle>
                  <CardDescription className="text-text-muted">How Producer Tour handles payment</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <Label className="text-text-secondary">Producer Tour Payment Method</Label>
                <RadioGroup
                  value={formData.paymentSplit}
                  onValueChange={(value: 'split' | 'combined') => setFormData({ ...formData, paymentSplit: value })}
                >
                  <div className="p-4 rounded-lg border border-panel-border bg-surface-200 space-y-2">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="split" id="split" />
                      <Label htmlFor="split" className="text-text-primary font-semibold cursor-pointer">
                        Split/Service Fee Only (PT handles Studio)
                      </Label>
                    </div>
                    <p className="text-sm text-text-muted ml-6">
                      PT pays the <strong>Studio directly</strong> and pays the <strong>Engineer's service fee</strong> separately.
                    </p>
                  </div>

                  <div className="p-4 rounded-lg border border-panel-border bg-surface-200 space-y-2">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="combined" id="combined" />
                      <Label htmlFor="combined" className="text-text-primary font-semibold cursor-pointer">
                        Combined/Full Service (Engineer handles Studio)
                      </Label>
                    </div>
                    <p className="text-sm text-text-muted ml-6">
                      PT pays the <strong>Engineer the TOTAL SESSION COST</strong>. The Engineer handles Studio payment.
                    </p>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label htmlFor="depositPaid" className="text-text-secondary">Deposit Paid by Client ($)</Label>
                <Input
                  id="depositPaid"
                  type="number"
                  value={formData.depositPaid}
                  onChange={(e) => setFormData({ ...formData, depositPaid: parseFloat(e.target.value) || 0 })}
                  className="bg-surface-200 border-panel-border text-text-primary"
                  required
                />
              </div>
            </CardContent>
          </Card>

          {/* Section 6: Live Payment Summary */}
          <Card className="bg-gradient-to-br from-primary-500/10 to-primary-600/5 border-primary-500/20 shadow-glow-sm">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary-500/20">
                  <CheckCircle2 className="w-5 h-5 text-primary-400" />
                </div>
                <div>
                  <CardTitle className="text-text-primary">Live Payment Summary</CardTitle>
                  <CardDescription className="text-text-secondary">Real-time calculation</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between py-2 border-b border-panel-border">
                <span className="text-text-secondary">Studio Cost:</span>
                <span className="text-text-primary font-semibold">${calculations.studioCost.toFixed(2)}</span>
              </div>

              <div className="flex justify-between py-2 border-b border-panel-border">
                <span className="text-text-secondary">Engineer Service Fee:</span>
                <span className="text-text-primary font-semibold">${calculations.engineerFee.toFixed(2)}</span>
              </div>

              <div className="flex justify-between py-3 border-b-2 border-panel-border">
                <span className="text-text-primary font-bold">TOTAL SESSION COST:</span>
                <span className="text-text-primary font-bold text-lg">${calculations.totalSessionCost.toFixed(2)}</span>
              </div>

              <div className="flex justify-between py-2 border-b border-panel-border">
                <span className="text-text-secondary">Client Deposit Applied:</span>
                <span className="text-text-primary font-semibold">-${formData.depositPaid.toFixed(2)}</span>
              </div>

              <div className="flex justify-between py-4 mt-4 bg-primary-500/10 rounded-lg px-4 border border-primary-500/30">
                <span className="text-primary-400 font-bold text-lg">
                  {formData.paymentSplit === 'combined' ? 'PT PAYOUT DUE TO ENGINEER (FULL):' : 'PT PAYOUT DUE TO ENGINEER:'}
                </span>
                <span className="text-primary-400 font-bold text-2xl">${calculations.paymentDueToEngineer.toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className="space-y-4">
            <Button
              type="submit"
              className="w-full bg-primary-500 hover:bg-primary-600 text-white font-semibold py-6 text-lg shadow-glow-sm"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                'PROCESSING...'
              ) : (
                <>
                  SUBMIT SESSION & TRIGGER PAYMENT
                  <ArrowRight className="ml-2 w-5 h-5" />
                </>
              )}
            </Button>

            {/* Split Sheet CTA */}
            <Card className="bg-gradient-to-r from-brand-yellow/10 to-brand-yellow/5 border-brand-yellow/30">
              <CardContent className="pt-6">
                <div className="text-center space-y-3">
                  <p className="text-brand-yellow font-bold text-lg">⭐ SECURE YOUR CREDITS & ROYALTIES</p>
                  <p className="text-text-secondary">
                    You must submit a Split Sheet to formalize your creative ownership and receive publishing royalties.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    className="border-brand-yellow/50 text-brand-yellow hover:bg-brand-yellow/10"
                    onClick={() => toast.success('Redirecting to Premium Split Sheet Tool...')}
                  >
                    START PREMIUM SPLIT SHEET NOW
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </form>
      </div>
    </div>
  );
}
