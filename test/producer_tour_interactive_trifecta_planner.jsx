import React, { useMemo, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Download, Upload, Plus, Trash2, Info } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as ReTooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";

/**
 * PRODUCER TOUR · INTERACTIVE TRIFECTA PLANNER
 * -------------------------------------------------------
 * One-file React component that models the Trifecta flow for each producer:
 * 1) Operating LLC (U.S.) -> 2) IP/Holdings LLC (tax-friendly state) -> 3) Family Trust/Foundation.
 *
 * You can:
 *  - Add producers and their revenue mix (publishing, sync, software/services)
 *  - Set licensing (IP royalty) rate from Operating -> Holdings per producer
 *  - Enter salary (reasonable comp for S-Corp) and other deductible expenses
 *  - Toggle Augusta Rule days & rate (280A)
 *  - Adjust effective tax assumptions (owner income, LLC profit, Holdings state)
 *  - See accurate per-producer breakdown + totals
 *  - Download/Upload the entire scenario as JSON
 *
 * NOTE: Tax math here uses adjustable EFFECTIVE rates, not your actual bracketed tax.
 * This keeps the model simple and transparent. Work with your CPA to confirm.
 */

const currency = (n: number) =>
  n.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });

const pct = (n: number) => `${(n * 100).toFixed(1)}%`;

// Default palette for charts
const palette = ["#60a5fa", "#34d399", "#f472b6", "#fbbf24", "#a78bfa", "#f87171"];

export default function TrifectaPlanner() {
  // --- Assumptions (global knobs) ---
  const [assumptions, setAssumptions] = useState({
    corpType: "S-Corp" as "S-Corp" | "C-Corp", // affects labels only in this simple model
    payrollTaxRate: 0.0765 + 0.0765, // employer + employee ~15.3% (simplified)
    ownerEffectiveIncomeTaxRate: 0.24, // effective blended rate on W-2 salary + S-corp distributions
    llcProfitEffectiveTaxRate: 0.0, // if you want to apply an extra layer on entity (usually 0 for S-Corp)
    holdingsStateTaxRate: 0.0, // NV/WY/FL = 0
    trustDistributionTaxRate: 0.05, // effective rate on trust distributions/retained income (scenario knob)
  });

  type Producer = {
    id: string;
    name: string;
    // Revenue mix collected at Operating LLC
    publishing: number;
    sync: number;
    software: number; // dashboards, subscriptions, services

    otherIncome: number; // misc income captured at LLC

    // Deductions at Operating LLC
    salary: number; // reasonable comp for S-Corp to this producer
    operatingExpenses: number; // general deductible expenses (marketing, travel, etc.)

    // Augusta Rule (280A) — LLC rents producer's home up to 14 days
    augustaDays: number; // 0..14
    augustaDailyRate: number; // fair market daily rate (meeting rental)

    // Royalty/License to Holdings
    ipRoyaltyRate: number; // % of gross routed to Holdings as royalty/license

    // Trust policy (portion of Holdings net sent up)
    trustSweepRate: number; // % of Holdings net swept to Trust
  };

  const [producers, setProducers] = useState<Producer[]>([
    {
      id: crypto.randomUUID(),
      name: "Nully",
      publishing: 250000,
      sync: 150000,
      software: 200000,
      otherIncome: 40000,
      salary: 120000,
      operatingExpenses: 140000,
      augustaDays: 10,
      augustaDailyRate: 1200,
      ipRoyaltyRate: 0.30,
      trustSweepRate: 0.60,
    },
    {
      id: crypto.randomUUID(),
      name: "Partner A",
      publishing: 180000,
      sync: 60000,
      software: 90000,
      otherIncome: 20000,
      salary: 85000,
      operatingExpenses: 90000,
      augustaDays: 8,
      augustaDailyRate: 950,
      ipRoyaltyRate: 0.25,
      trustSweepRate: 0.50,
    },
  ]);

  // --- Computation helpers ---
  type ProducerResult = ReturnType<typeof computeProducer>;

  function computeProducer(p: Producer) {
    const gross = p.publishing + p.sync + p.software + p.otherIncome;

    const royaltyToHoldings = gross * p.ipRoyaltyRate;

    const augustaExpense = Math.min(p.augustaDays, 14) * Math.max(0, p.augustaDailyRate);

    const payrollTaxes = p.salary * assumptions.payrollTaxRate; // simplified full FICA burden

    const llcDeductions = p.operatingExpenses + p.salary + payrollTaxes + augustaExpense + royaltyToHoldings;

    const llcTaxable = Math.max(0, gross - llcDeductions);

    // Entity-level tax if any (usually 0 for S-Corp; C-Corp could be modeled differently)
    const llcEntityTax = llcTaxable * assumptions.llcProfitEffectiveTaxRate;
    const llcAfterTaxProfit = llcTaxable - llcEntityTax;

    // Owner effective income tax on salary + distributions (simplified):
    const ownerTaxableIncome = p.salary + llcAfterTaxProfit; // S-corp: distributions not subject to SE tax here
    const ownerIncomeTax = ownerTaxableIncome * assumptions.ownerEffectiveIncomeTaxRate;

    // Holdings side:
    const holdingsGross = royaltyToHoldings; // assume Holdings has minimal extra expenses in this model
    const holdingsStateTax = holdingsGross * assumptions.holdingsStateTaxRate;
    const holdingsNet = holdingsGross - holdingsStateTax;

    // Trust sweep from Holdings
    const sweepToTrust = holdingsNet * p.trustSweepRate;
    const retainedInHoldings = holdingsNet - sweepToTrust;

    const trustTax = sweepToTrust * assumptions.trustDistributionTaxRate;
    const trustAfterTax = sweepToTrust - trustTax;

    return {
      name: p.name,
      gross,
      royaltyToHoldings,
      augustaExpense,
      payrollTaxes,
      operatingExpenses: p.operatingExpenses,
      salary: p.salary,
      llcDeductions,
      llcTaxable,
      llcEntityTax,
      llcAfterTaxProfit,
      ownerIncomeTax,
      holdingsGross,
      holdingsStateTax,
      holdingsNet,
      sweepToTrust,
      retainedInHoldings,
      trustTax,
      trustAfterTax,
      // Convenience totals
      totalTaxes: payrollTaxes + llcEntityTax + ownerIncomeTax + holdingsStateTax + trustTax,
      netBenefitToOwner: llcAfterTaxProfit - ownerIncomeTax + (retainedInHoldings + trustAfterTax),
    };
  }

  const results = useMemo(() => producers.map(computeProducer), [producers, assumptions]);

  const totals = useMemo(() => {
    return results.reduce(
      (acc, r) => {
        acc.gross += r.gross;
        acc.royaltyToHoldings += r.royaltyToHoldings;
        acc.augustaExpense += r.augustaExpense;
        acc.payrollTaxes += r.payrollTaxes;
        acc.operatingExpenses += r.operatingExpenses;
        acc.salary += r.salary;
        acc.llcDeductions += r.llcDeductions;
        acc.llcTaxable += r.llcTaxable;
        acc.llcEntityTax += r.llcEntityTax;
        acc.llcAfterTaxProfit += r.llcAfterTaxProfit;
        acc.ownerIncomeTax += r.ownerIncomeTax;
        acc.holdingsGross += r.holdingsGross;
        acc.holdingsStateTax += r.holdingsStateTax;
        acc.holdingsNet += r.holdingsNet;
        acc.sweepToTrust += r.sweepToTrust;
        acc.retainedInHoldings += r.retainedInHoldings;
        acc.trustTax += r.trustTax;
        acc.trustAfterTax += r.trustAfterTax;
        acc.totalTaxes += r.totalTaxes;
        acc.netBenefitToOwner += r.netBenefitToOwner;
        return acc;
      },
      {
        gross: 0,
        royaltyToHoldings: 0,
        augustaExpense: 0,
        payrollTaxes: 0,
        operatingExpenses: 0,
        salary: 0,
        llcDeductions: 0,
        llcTaxable: 0,
        llcEntityTax: 0,
        llcAfterTaxProfit: 0,
        ownerIncomeTax: 0,
        holdingsGross: 0,
        holdingsStateTax: 0,
        holdingsNet: 0,
        sweepToTrust: 0,
        retainedInHoldings: 0,
        trustTax: 0,
        trustAfterTax: 0,
        totalTaxes: 0,
        netBenefitToOwner: 0,
      }
    );
  }, [results]);

  // --- Persistence (local only) ---
  useEffect(() => {
    const saved = localStorage.getItem("pt_trifecta_state_v1");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed?.producers && parsed?.assumptions) {
          setProducers(parsed.producers);
          setAssumptions(parsed.assumptions);
        }
      } catch {}
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(
      "pt_trifecta_state_v1",
      JSON.stringify({ producers, assumptions })
    );
  }, [producers, assumptions]);

  // --- UI helpers ---
  const onChangeAssumption = (k: keyof typeof assumptions, v: number | string) => {
    setAssumptions((a) => ({ ...a, [k]: v } as any));
  };

  const updateProducer = (id: string, patch: Partial<Producer>) => {
    setProducers((list) => list.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  };

  const addProducer = () => {
    setProducers((list) => [
      ...list,
      {
        id: crypto.randomUUID(),
        name: `Producer ${list.length + 1}`,
        publishing: 0,
        sync: 0,
        software: 0,
        otherIncome: 0,
        salary: 0,
        operatingExpenses: 0,
        augustaDays: 0,
        augustaDailyRate: 800,
        ipRoyaltyRate: 0.2,
        trustSweepRate: 0.5,
      },
    ]);
  };

  const removeProducer = (id: string) => {
    setProducers((list) => list.filter((p) => p.id !== id));
  };

  const downloadJSON = () => {
    const blob = new Blob([JSON.stringify({ producers, assumptions }, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "producer-tour-trifecta.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const uploadJSON = (file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        if (parsed?.producers && parsed?.assumptions) {
          setProducers(parsed.producers);
          setAssumptions(parsed.assumptions);
        } else alert("Invalid file format.");
      } catch {
        alert("Failed to parse JSON file.");
      }
    };
    reader.readAsText(file);
  };

  // Chart data
  const barData = results.map((r) => ({
    name: r.name,
    Gross: r.gross,
    "LLC Deductions": r.llcDeductions,
    "LLC After-Tax Profit": r.llcAfterTaxProfit,
    "Royalty to Holdings": r.royaltyToHoldings,
    "Trust After-Tax": r.trustAfterTax,
    Taxes: r.totalTaxes,
  }));

  const pieData = [
    { name: "Payroll Taxes", value: totals.payrollTaxes },
    { name: "Owner Income Tax", value: totals.ownerIncomeTax },
    { name: "LLC Entity Tax", value: totals.llcEntityTax },
    { name: "Holdings State Tax", value: totals.holdingsStateTax },
    { name: "Trust Tax", value: totals.trustTax },
  ].filter((d) => d.value > 0);

  return (
    <div className="p-6 max-w-7xl mx-auto text-slate-100">
      <motion.h1 initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="text-3xl font-semibold mb-2 text-sky-400">
        Producer Tour · Interactive Trifecta Planner
      </motion.h1>
      <p className="text-slate-300 mb-6">Model the flow from <b>Operating LLC</b> → <b>Holdings (IP)</b> → <b>Family Trust/Foundation</b> per producer. Adjust the knobs and watch the math update. All rates are editable to match your CPA guidance.</p>

      <Tabs defaultValue="producers" className="space-y-6">
        <TabsList className="bg-slate-900">
          <TabsTrigger value="producers">Producers</TabsTrigger>
          <TabsTrigger value="assumptions">Assumptions</TabsTrigger>
          <TabsTrigger value="charts">Charts</TabsTrigger>
          <TabsTrigger value="summary">Summary</TabsTrigger>
        </TabsList>

        <TabsContent value="producers" className="space-y-6">
          <div className="flex items-center gap-3">
            <Button onClick={addProducer} className="gap-2"><Plus size={16}/> Add Producer</Button>
            <Button variant="secondary" onClick={downloadJSON} className="gap-2"><Download size={16}/> Download JSON</Button>
            <label className="inline-flex items-center gap-2 px-3 py-2 bg-slate-800 rounded-xl cursor-pointer">
              <Upload size={16}/> Upload JSON
              <input type="file" accept="application/json" className="hidden" onChange={(e)=>uploadJSON(e.target.files?.[0] || null)} />
            </label>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {producers.map((p) => {
              const r = computeProducer(p);
              return (
                <Card key={p.id} className="bg-slate-900/60 border border-slate-800">
                  <CardContent className="p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <Input
                        value={p.name}
                        onChange={(e) => updateProducer(p.id, { name: e.target.value })}
                        className="text-xl font-semibold max-w-[60%]"
                      />
                      <Button variant="destructive" onClick={() => removeProducer(p.id)} className="gap-2"><Trash2 size={16}/> Remove</Button>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {/* Revenue */}
                      <FormNumber label="Publishing" value={p.publishing} onChange={(v)=>updateProducer(p.id,{publishing:v})}/>
                      <FormNumber label="Sync" value={p.sync} onChange={(v)=>updateProducer(p.id,{sync:v})}/>
                      <FormNumber label="Software/Services" value={p.software} onChange={(v)=>updateProducer(p.id,{software:v})}/>
                      <FormNumber label="Other Income" value={p.otherIncome} onChange={(v)=>updateProducer(p.id,{otherIncome:v})}/>

                      {/* Deductions */}
                      <FormNumber label="Salary (W-2)" value={p.salary} onChange={(v)=>updateProducer(p.id,{salary:v})}/>
                      <FormNumber label="Operating Expenses" value={p.operatingExpenses} onChange={(v)=>updateProducer(p.id,{operatingExpenses:v})}/>

                      <FormNumber label="Augusta Days (0-14)" value={p.augustaDays} min={0} max={14} step={1} onChange={(v)=>updateProducer(p.id,{augustaDays:Math.max(0,Math.min(14,Math.round(v)))})}/>
                      <FormNumber label="Augusta Daily Rate" value={p.augustaDailyRate} onChange={(v)=>updateProducer(p.id,{augustaDailyRate:v})}/>

                      <FormPercent label="IP Royalty Rate → Holdings" value={p.ipRoyaltyRate} onChange={(v)=>updateProducer(p.id,{ipRoyaltyRate:v})}/>
                      <FormPercent label="Trust Sweep Rate" value={p.trustSweepRate} onChange={(v)=>updateProducer(p.id,{trustSweepRate:v})}/>
                    </div>

                    {/* Live Results */}
                    <div className="grid md:grid-cols-2 gap-4 text-slate-200">
                      <QuickStat title="Gross at LLC" value={currency(r.gross)} />
                      <QuickStat title="Royalty → Holdings" value={`${currency(r.royaltyToHoldings)} (${pct(p.ipRoyaltyRate)})`} />
                      <QuickStat title="Salary + Payroll Taxes" value={`${currency(p.salary)} + ${currency(r.payrollTaxes)}`} />
                      <QuickStat title="Augusta Expense" value={currency(r.augustaExpense)} />
                      <QuickStat title="LLC Deductible Total" value={currency(r.llcDeductions)} />
                      <QuickStat title="LLC Taxable Profit" value={currency(r.llcTaxable)} />
                      <QuickStat title="Owner Income Tax (eff)" value={currency(r.ownerIncomeTax)} />
                      <QuickStat title="Holdings Net" value={currency(r.holdingsNet)} />
                      <QuickStat title="Sweep to Trust" value={`${currency(r.sweepToTrust)} (${pct(p.trustSweepRate)})`} />
                      <QuickStat title="Trust After-Tax" value={currency(r.trustAfterTax)} />
                      <QuickStat title="Total Taxes (all layers)" value={currency(r.totalTaxes)} />
                      <QuickStat title="Net Benefit to Owner*" value={currency(r.netBenefitToOwner)} hint="LLC after-tax profit - owner tax + (Holdings retained + Trust after-tax)" />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="assumptions" className="space-y-6">
          <Card className="bg-slate-900/60 border border-slate-800">
            <CardContent className="p-5 space-y-4">
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <Label>Corp Type</Label>
                  <select
                    value={assumptions.corpType}
                    onChange={(e) => onChangeAssumption("corpType", e.target.value)}
                    className="w-full mt-2 bg-slate-800 rounded-xl px-3 py-2"
                  >
                    <option value="S-Corp">S-Corp</option>
                    <option value="C-Corp">C-Corp</option>
                  </select>
                </div>
                <FormPercent label="Payroll Tax Rate (salary)" value={assumptions.payrollTaxRate} onChange={(v)=>onChangeAssumption("payrollTaxRate",v)} />
                <FormPercent label="Owner Effective Income Tax Rate" value={assumptions.ownerEffectiveIncomeTaxRate} onChange={(v)=>onChangeAssumption("ownerEffectiveIncomeTaxRate",v)} />
                <FormPercent label="LLC Profit Effective Entity Tax" value={assumptions.llcProfitEffectiveTaxRate} onChange={(v)=>onChangeAssumption("llcProfitEffectiveTaxRate",v)} />
                <FormPercent label="Holdings State Tax Rate" value={assumptions.holdingsStateTaxRate} onChange={(v)=>onChangeAssumption("holdingsStateTaxRate",v)} />
                <FormPercent label="Trust Distribution Effective Tax" value={assumptions.trustDistributionTaxRate} onChange={(v)=>onChangeAssumption("trustDistributionTaxRate",v)} />
              </div>
              <p className="text-sm text-slate-400">All rates are effective scenario dials. For bracket-accurate projections, export and share with your CPA.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="charts" className="space-y-6">
          <div className="grid lg:grid-cols-3 gap-6">
            <Card className="bg-slate-900/60 border border-slate-800 lg:col-span-2">
              <CardContent className="p-5">
                <h3 className="mb-3 font-semibold">Per-Producer Flow</h3>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barData}>
                      <XAxis dataKey="name" tick={{ fill: "#94a3b8" }} />
                      <YAxis tick={{ fill: "#94a3b8" }} />
                      <ReTooltip contentStyle={{ background: "#0f172a", border: "1px solid #334155", color: "#e2e8f0" }} />
                      <Legend />
                      <Bar dataKey="Gross" stackId="a" fill="#60a5fa" />
                      <Bar dataKey="LLC Deductions" stackId="a" fill="#34d399" />
                      <Bar dataKey="LLC After-Tax Profit" fill="#a78bfa" />
                      <Bar dataKey="Royalty to Holdings" fill="#fbbf24" />
                      <Bar dataKey="Trust After-Tax" fill="#f472b6" />
                      <Bar dataKey="Taxes" fill="#f87171" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-900/60 border border-slate-800">
              <CardContent className="p-5">
                <h3 className="mb-3 font-semibold">Tax Mix (All Producers)</h3>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie dataKey="value" data={pieData} outerRadius={90} label>
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={palette[index % palette.length]} />
                        ))}
                      </Pie>
                      <ReTooltip contentStyle={{ background: "#0f172a", border: "1px solid #334155", color: "#e2e8f0" }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="summary" className="space-y-6">
          <Card className="bg-slate-900/60 border border-slate-800">
            <CardContent className="p-5 space-y-3">
              <h3 className="font-semibold">Totals</h3>
              <div className="grid md:grid-cols-3 gap-4 text-slate-100">
                <QuickStat title="Gross at LLC" value={currency(totals.gross)} />
                <QuickStat title="LLC Deductions" value={currency(totals.llcDeductions)} />
                <QuickStat title="LLC Taxable Profit" value={currency(totals.llcTaxable)} />
                <QuickStat title="Owner Income Tax (eff)" value={currency(totals.ownerIncomeTax)} />
                <QuickStat title="Royalty → Holdings" value={currency(totals.royaltyToHoldings)} />
                <QuickStat title="Holdings Net" value={currency(totals.holdingsNet)} />
                <QuickStat title="Sweep to Trust" value={currency(totals.sweepToTrust)} />
                <QuickStat title="Trust After-Tax" value={currency(totals.trustAfterTax)} />
                <QuickStat title="Total Taxes (all layers)" value={currency(totals.totalTaxes)} />
                <QuickStat title="Net Benefit to Owner*" value={currency(totals.netBenefitToOwner)} />
              </div>
              <p className="text-sm text-slate-400">* Net Benefit to Owner = LLC after-tax profit − owner income tax + (Holdings retained + Trust after-tax). Adjust assumptions to reflect your CPA's plan.</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/60 border border-slate-800">
            <CardContent className="p-5 space-y-3">
              <h3 className="font-semibold">Compliance Checklist (Kohler-style)</h3>
              <ul className="list-disc ml-6 space-y-1 text-slate-300">
                <li>Document IP license agreement between Operating LLC and Holdings (fair market royalty rate).</li>
                <li>Run <b>reasonable salary</b> through payroll (S-Corp) and keep comps on file.</li>
                <li>Board minutes approving Augusta Rule rentals (max 14 days) with rate support (comps).</li>
                <li>Separate books/bank accounts: Operating vs. Holdings vs. Trust.</li>
                <li>Annual state filings, registered agent, and IP registrations (trademarks, copyrights).</li>
                <li>If using foundation, maintain charitable purpose, minutes, and arm's-length grants.</li>
              </ul>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function QuickStat({ title, value, hint }: { title: string; value: string; hint?: string }) {
  return (
    <div className="bg-slate-800/60 rounded-2xl p-4 border border-slate-700">
      <div className="flex items-center justify-between">
        <span className="text-sm text-slate-400">{title}</span>
        {hint && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Info size={16} className="text-slate-400" />
              </TooltipTrigger>
              <TooltipContent>{hint}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
      <div className="text-lg font-semibold mt-1">{value}</div>
    </div>
  );
}

function FormNumber({ label, value, onChange, step = 1000, min = 0, max, }: { label: string; value: number; onChange: (v: number) => void; step?: number; min?: number; max?: number; }) {
  return (
    <div>
      <Label>{label}</Label>
      <Input
        type="number"
        className="mt-2 bg-slate-800"
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => {
          const v = parseFloat(e.target.value || "0");
          let nv = isNaN(v) ? 0 : v;
          if (typeof min === "number") nv = Math.max(min, nv);
          if (typeof max === "number") nv = Math.min(max, nv);
          onChange(nv);
        }}
        step={step}
      />
    </div>
  );
}

function FormPercent({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void; }) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="flex items-center gap-2 mt-2">
        <Input
          type="number"
          className="bg-slate-800"
          value={Math.round(value * 1000) / 10}
          onChange={(e) => {
            const v = parseFloat(e.target.value || "0");
            const clamped = Math.max(0, Math.min(100, v));
            onChange(clamped / 100);
          }}
          step={0.5}
        />
        <span className="text-slate-400">%</span>
      </div>
    </div>
  );
}
