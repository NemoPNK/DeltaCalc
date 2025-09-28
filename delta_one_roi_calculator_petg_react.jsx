'use client';

import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, RefreshCcw, FileDown } from "lucide-react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";

/**
 * DeltaOne ROI Calculator
 * Style: veoria.fr minimal (white, black, subtle greys). Simplified labels.
 * Changes in this revision:
 *  - Web width uses a slider (simple cursor) with live value.
 *  - Jobs/year is a large key figure.
 *  - Stops/job is integer-only; makeready result highlighted.
 *  - Removed Hours/shift input (fixed to 8h).
 */

// ===== Types =====
interface ROIParams {
  webWidth: number; // m
  jobsPerShift: number;
  shiftsPerDay: number;
  daysPerYear: number;
  stopsPerJobBaseline: number;
  reductionPercent: number; // %
  wastePerStopM: number; // m
  speedMPerMin: number; // m/min
  uptimePercent: number; // %
  hoursPerShift: number; // h
  substratePrice: number; // €/m²
  haasPrice: number; // €/year
}

interface ROIResult {
  jobsPerDay: number;
  jobsPerYear: number;
  m2PerStop: number;
  m2CalagePerYear: number;
  printedLengthPerYear: number; // m
  m2ThreeMmPerYear: number;
  euroCalage: number;
  euroThreeMm: number;
  euroTotal: number;
  euroNet: number;
}

// ===== Pure calculation =====
function computeROI(p: ROIParams): ROIResult {
  const jobsPerDay = p.jobsPerShift * p.shiftsPerDay;
  const jobsPerYear = jobsPerDay * p.daysPerYear;

  const stopsAvoidedPerJob = (p.stopsPerJobBaseline * p.reductionPercent) / 100;
  const m2PerStop = p.webWidth * p.wastePerStopM; // m * m = m²
  const m2CalagePerYear = m2PerStop * stopsAvoidedPerJob * jobsPerYear;

  const minutesPerDay = p.hoursPerShift * 60 * p.shiftsPerDay;
  const printedLengthPerDay = p.speedMPerMin * (p.uptimePercent / 100) * minutesPerDay; // m/day
  const printedLengthPerYear = printedLengthPerDay * p.daysPerYear; // m/year
  const m2ThreeMmPerYear = 0.003 * printedLengthPerYear; // 3 mm = 0.003 m

  const euroCalage = m2CalagePerYear * p.substratePrice;
  const euroThreeMm = m2ThreeMmPerYear * p.substratePrice;
  const euroTotal = euroCalage + euroThreeMm;
  const euroNet = euroTotal - p.haasPrice;

  return {
    jobsPerDay,
    jobsPerYear,
    m2PerStop,
    m2CalagePerYear,
    printedLengthPerYear,
    m2ThreeMmPerYear,
    euroCalage,
    euroThreeMm,
    euroTotal,
    euroNet,
  };
}

export default function DeltaOneROICalculator() {
  // ===== Defaults =====
  const [webWidth, setWebWidth] = useState(0.33);
  const [jobsPerShift, setJobsPerShift] = useState(6);
  const [shiftsPerDay, setShiftsPerDay] = useState(2);
  const [daysPerYear, setDaysPerYear] = useState(250);
  const [stopsPerJobBaseline, setStopsPerJobBaseline] = useState(6); // integer only
  const [reductionPercent, setReductionPercent] = useState(50);
  const [wastePerStopM, setWastePerStopM] = useState(100);
  const [speedMPerMin, setSpeedMPerMin] = useState(165);
  const [uptimePercent, setUptimePercent] = useState(60);
  const hoursPerShift = 8; // fixed as requested
  const [substratePrice, setSubstratePrice] = useState(0.6);
  const [substrate, setSubstrate] = useState<'PETG' | 'PVC' | 'OPS' | 'BOPP'>('PETG');
  const [haasPrice, setHaasPrice] = useState(20000);

  const number0 = useMemo(() => new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }), []);
  const money0 = useMemo(() => new Intl.NumberFormat("en-US", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }), []);

  const params: ROIParams = {
    webWidth,
    jobsPerShift,
    shiftsPerDay,
    daysPerYear,
    stopsPerJobBaseline,
    reductionPercent,
    wastePerStopM,
    speedMPerMin,
    uptimePercent,
    hoursPerShift,
    substratePrice,
    haasPrice,
  };
  const r = computeROI(params);

  const stopsAvoidedPerJob = (stopsPerJobBaseline * reductionPercent) / 100;
  const stopsAvoidedPerYear = stopsAvoidedPerJob * r.jobsPerYear;

  const resetToDefaults = () => {
    setWebWidth(0.33);
    setJobsPerShift(6);
    setShiftsPerDay(2);
    setDaysPerYear(250);
    setStopsPerJobBaseline(6);
    setReductionPercent(50);
    setWastePerStopM(100);
    setSpeedMPerMin(165);
    setUptimePercent(60);
    setSubstratePrice(0.6);
    setHaasPrice(20000);
  };

  const handleExportPDF = async () => {
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF({ unit: 'pt', format: 'a4' });
      const marginX = 56;
      let y = 64;

      const title = 'Veoria — DeltaOne ROI';
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.text(title, marginX, y);
      y += 26;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      const subtitle = 'Narrow‑web flexo • Savings from makeready and −3 mm web width';
      doc.text(subtitle, marginX, y);
      y += 24;

      doc.setFont('helvetica', 'bold');
      doc.text('Results (€/year)', marginX, y);
      y += 16;
      doc.setFont('helvetica', 'normal');
      row(doc, marginX, y, 'Makeready', money0.format(Math.round(r.euroCalage))); y += 16;
      row(doc, marginX, y, '−3 mm', money0.format(Math.round(r.euroThreeMm))); y += 16;
      doc.setDrawColor(220);
      doc.line(marginX, y + 4, 556, y + 4);
      y += 18;
      row(doc, marginX, y, 'Total', money0.format(Math.round(r.euroTotal))); y += 18;
      row(doc, marginX, y, 'Net vs HaaS', money0.format(Math.round(r.euroNet)));
      y += 28;

      doc.setFont('helvetica', 'bold');
      doc.text('Inputs', marginX, y);
      y += 16;
      doc.setFont('helvetica', 'normal');
      const inputs: Array<[string, string]> = [
        ['Web width', `${webWidth.toFixed(2)} m`],
        ['Jobs/shift', `${jobsPerShift}`],
        ['Shifts/day', `${shiftsPerDay}`],
        ['Days/year', `${daysPerYear}`],
        ['Stops/job', `${stopsPerJobBaseline}`],
        ['Stop reduction', `${reductionPercent}%`],
        ['Waste/stop', `${wastePerStopM} m`],
        ['Speed', `${speedMPerMin} m/min`],
        ['Uptime', `${uptimePercent}%`],
        ['Hours/shift', `${hoursPerShift}`],
        ['Substrate', `${substrate}`],
        ['Substrate price', `${substratePrice} €/m²`],
        ['HaaS', money0.format(haasPrice)],
      ];
      inputs.forEach(([k, v]) => { row(doc, marginX, y, k, v); y += 16; });

      y += 10;
      doc.setDrawColor(220);
      doc.line(marginX, y, 556, y);
      y += 18;

      doc.setFontSize(10);
      const note = 'Method: m² = width × length. Makeready m² = web × waste/stop × stops avoided × jobs/year. −3 mm m² = 0.003 × printed length.';
      doc.text(splitText(doc, note, 500), marginX, y);

      doc.save('veoria_deltaone_roi.pdf');
    } catch (e) {
      console.error(e);
      if (typeof window !== 'undefined') alert("PDF export failed. Install 'jspdf'.");
    }
  };

  return (
    <div className="min-h-dvh bg-white text-zinc-900 antialiased">
      {/* Top bar */}
      <div className="sticky top-0 z-30 backdrop-blur supports-[backdrop-filter]:bg-white/70 bg-white/90 border-b border-zinc-200">
        <div className="mx-auto max-w-6xl px-5 py-3 flex items-center justify-between">
          <div className="font-medium tracking-tight">Veoria — DeltaOne ROI</div>
          <div className="text-xs text-zinc-500">Minimal • Precise</div>
        </div>
      </div>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-5 pt-10 pb-6 text-center">
        <motion.h1 initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="text-[34px] md:text-[44px] font-semibold tracking-tight">
          Calculate savings with clarity.
        </motion.h1>
        <p className="mt-2 text-sm text-zinc-600">Makeready cuts and −3 mm web gains.</p>
        <div className="mt-5 flex justify-center gap-2">
          <Button onClick={() => document.getElementById("calculator")?.scrollIntoView({ behavior: "smooth" })} className="rounded-full px-4">
            Start <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          <Button variant="secondary" onClick={handleExportPDF} className="rounded-full"><FileDown className="mr-2 h-4 w-4"/>Export PDF</Button>
        </div>
      </section>

      {/* Main */}
      <main id="calculator" className="mx-auto max-w-6xl px-5 pb-14 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Panel title="Production">
            <div className="grid grid-cols-1 gap-4">
              {/* Web width slider */}
              <label className="block">
                <div className="text-[10px] uppercase tracking-wide text-zinc-500 mb-1">Web width (m)</div>
                <Slider value={[webWidth]} min={0.20} max={1.00} step={0.01} onValueChange={(v) => setWebWidth(Number(v[0].toFixed(2)))} />
                <div className="mt-1 text-sm text-zinc-700">Current: <span className="font-medium">{webWidth.toFixed(2)} m</span></div>
              </label>

              <Field label="Jobs/shift"><Input type="number" step={1} value={jobsPerShift} onChange={(e) => setJobsPerShift(parseInt(e.target.value || '0', 10))} /></Field>

              <div>
                <div className="text-[10px] uppercase tracking-wide text-zinc-500 mb-1">Shifts/day</div>
                <Segmented value={shiftsPerDay} onChange={setShiftsPerDay} options={[1,2,3]} />
              </div>

              <Field label="Days/year"><Input type="number" step={10} value={daysPerYear} onChange={(e) => setDaysPerYear(parseInt(e.target.value || '0', 10))} /></Field>
            </div>

            {/* Key figure: Jobs/year */}
            <div className="mt-4">
              <BigStat label="Jobs/year" value={number0.format(r.jobsPerYear)} />
            </div>
          </Panel>

          <Panel title="Makeready">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Field label="Stops/job"><Input type="number" step={1} value={stopsPerJobBaseline} onChange={(e) => setStopsPerJobBaseline(parseInt(e.target.value || '0', 10))} /></Field>
              <Field label="Reduction (%)">
                <Slider value={[reductionPercent]} min={0} max={100} step={1} onValueChange={(v) => setReductionPercent(v[0])} />
                <div className="text-xs text-zinc-500 mt-1">{reductionPercent}%</div>
              </Field>
              <Field label="Waste/stop (m)"><Input type="number" step={5} value={wastePerStopM} onChange={(e) => setWastePerStopM(parseInt(e.target.value || '0', 10))} /></Field>
            </div>

            {/* Highlight stops avoided */}
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <BigStat label="Stops avoided/job" value={stopsAvoidedPerJob.toFixed(2)} smallNote={`from ${stopsPerJobBaseline} at ${reductionPercent}%`} />
              <BigStat label="Makeready saved m²/year" value={number0.format(Math.round(r.m2CalagePerYear)) + " m²"} />
            </div>

            <div className="mt-3 text-xs text-zinc-500">m²/stop <span className="text-zinc-800 font-medium ml-1">{number0.format(Math.round(r.m2PerStop))}</span></div>
          </Panel>

          <Panel title="Web −3 mm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Speed (m/min)">
                <Slider value={[speedMPerMin]} min={0} max={300} step={5} onValueChange={(v) => setSpeedMPerMin(v[0])} />
                <div className="text-xs text-zinc-500 mt-1">{number0.format(speedMPerMin)} m/min</div>
              </Field>
              <Field label="Uptime (%)">
                <Slider value={[uptimePercent]} min={0} max={100} step={1} onValueChange={(v) => setUptimePercent(v[0])} />
                <div className="text-xs text-zinc-500 mt-1">{uptimePercent}%</div>
              </Field>
            </div>
            <div className="mt-3 text-xs text-zinc-500">Printed/year <span className="text-zinc-800 font-medium ml-1">{number0.format(Math.round(r.printedLengthPerYear))}</span> m</div>
            <div className="mt-4">
              <BigStat label="−3 mm saved m²/year" value={number0.format(Math.round(r.m2ThreeMmPerYear)) + " m²"} />
            </div>
          </Panel>

          <Panel title="Economics">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div className="text-[10px] uppercase tracking-wide text-zinc-500 mb-1">Substrate</div>
                <div className="flex flex-wrap gap-2">
                  {(['PETG','PVC','OPS','BOPP'] as const).map((s) => (
                    <button key={s} type="button" onClick={() => { setSubstrate(s); const def:{[k in 'PETG'|'PVC'|'OPS'|'BOPP']:number} = { PETG:0.6, PVC:0.45, OPS:0.52, BOPP:0.30 }; setSubstratePrice(def[s]); }}
                      className={`text-xs px-2 py-1 rounded-full border ${substrate===s? 'border-zinc-900 bg-zinc-900 text-white':'border-zinc-300 hover:bg-zinc-50 text-zinc-700'}`}>
                      {s}
                    </button>
                  ))}
                </div>
                <div className="mt-1 text-xs text-zinc-500">Typical €/m² set on click. You can override.</div>
              </div>
              <Field label="Substrate price (€/m²)"><Input type="number" step={0.01} value={substratePrice} onChange={(e) => setSubstratePrice(parseFloat(e.target.value || '0'))} /></Field>
              <div>
                <div className="text-[10px] uppercase tracking-wide text-zinc-500 mb-1">DeltaOne HaaS</div>
                <div className="rounded-xl border border-zinc-200 bg-white p-3 text-center">
                  <div className="text-2xl font-semibold">{money0.format(haasPrice)}<span className="text-sm font-normal text-zinc-500">/year</span></div>
                  <div className="mt-1 text-[11px] text-zinc-500">Fixed offer. Use as ROI benchmark.</div>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              <button type="button" onClick={()=>setSubstratePrice(0.5)} className="text-xs px-2 py-1 rounded-full border border-zinc-300">€0.50</button>
              <button type="button" onClick={()=>setSubstratePrice(0.6)} className="text-xs px-2 py-1 rounded-full border border-zinc-300">€0.60</button>
              <button type="button" onClick={()=>setSubstratePrice(0.7)} className="text-xs px-2 py-1 rounded-full border border-zinc-300">€0.70</button>
            </div>
            <div className="flex gap-3 mt-4">
              <Button variant="secondary" onClick={resetToDefaults} className="rounded-full"><RefreshCcw className="mr-2 h-4 w-4" />Reset</Button>
              <Button onClick={handleExportPDF} className="rounded-full"><FileDown className="mr-2 h-4 w-4"/>Export PDF</Button>
            </div>
          </Panel>
        </div>

        {/* Results */}
        <div className="lg:sticky lg:top-24 h-max space-y-6">
          <Panel title="Results — m²/year">
            <KPI label="Makeready" value={number0.format(Math.round(r.m2CalagePerYear)) + " m²"} />
            <KPI label="−3 mm" value={number0.format(Math.round(r.m2ThreeMmPerYear)) + " m²"} />
            <Separator className="my-2" />
            <KPI label="Total" value={<span className="font-semibold">{number0.format(Math.round(r.m2CalagePerYear + r.m2ThreeMmPerYear))} m²</span>} />
          </Panel>
          <Panel title="Results — €/year">
            <KPI label="Makeready" value={money0.format(Math.round(r.euroCalage))} />
            <KPI label="−3 mm" value={money0.format(Math.round(r.euroThreeMm))} />
            <Separator className="my-2" />
            <KPI label="Total" value={<span className="font-semibold">{money0.format(Math.round(r.euroTotal))}</span>} />
            <KPI label="Net vs HaaS" value={<span className={r.euroNet >= 0 ? "text-emerald-700 font-semibold" : "text-red-700 font-semibold"}>{money0.format(Math.round(r.euroNet))}</span>} />
          </Panel>

          {/* Tests */}
          <TestPanel />
        </div>
      </main>

      <footer className="border-t border-zinc-200">
        <div className="mx-auto max-w-6xl px-5 py-6 text-[11px] text-zinc-500">
          Method: m² = width × length. Makeready m² = web × waste/stop × stops avoided × jobs/year. −3 mm m² = 0.003 × printed length. € = m² × substrate price. Net = Total − HaaS.
        </div>
      </footer>
    </div>
  );
}

// ===== Helpers for PDF =====
function row(doc: any, x: number, y: number, key: string, value: string) {
  doc.text(key, x, y);
  const valX = 420; // right column start
  doc.text(value, valX, y);
}

function splitText(doc: any, text: string, maxWidth: number) {
  return doc.splitTextToSize(text, maxWidth);
}

// ===== UI atoms =====
function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="border-zinc-200 bg-white">
      <CardHeader className="pb-2">
        <div className="text-sm font-medium tracking-tight text-zinc-800">{title}</div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-[10px] uppercase tracking-wide text-zinc-500 mb-1">{label}</div>
      {children}
    </label>
  );
}

function KPI({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-1.5 text-sm">
      <div className="text-zinc-600">{label}</div>
      <div>{value}</div>
    </div>
  );
}

function Segmented({ value, onChange, options }: { value: number; onChange: (v: number) => void; options: number[] }) {
  return (
    <div className="inline-flex rounded-full border border-zinc-300 p-0.5 bg-white">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={`px-3 py-1.5 text-sm rounded-full ${value === opt ? 'bg-zinc-900 text-white' : 'text-zinc-700 hover:bg-zinc-50'}`}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

function BigStat({ label, value, smallNote }: { label: string; value: React.ReactNode; smallNote?: string }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 text-center">
      <div className="text-[11px] uppercase tracking-wide text-zinc-500">{label}</div>
      <div className="mt-1 text-3xl md:text-4xl font-semibold tracking-tight">{value}</div>
      {smallNote && <div className="mt-1 text-[11px] text-zinc-500">{smallNote}</div>}
    </div>
  );
}

// ===== Test panel =====
function approxEqual(actual: number, expected: number, tolerancePct = 0.001) {
  const tol = Math.abs(expected) * tolerancePct;
  return Math.abs(actual - expected) <= tol;
}

function TestPanel() {
  const baselineParams: ROIParams = {
    webWidth: 0.33,
    jobsPerShift: 6,
    shiftsPerDay: 2,
    daysPerYear: 250,
    stopsPerJobBaseline: 6,
    reductionPercent: 50,
    wastePerStopM: 100,
    speedMPerMin: 165,
    uptimePercent: 60,
    hoursPerShift: 8,
    substratePrice: 0.6,
    haasPrice: 20000,
  };
  const b = computeROI(baselineParams);

  const expected = {
    m2CalagePerYear: 0.33 * 100 * (6*0.5) * (6*2*250), // 33 * 3 * 3000 = 297,000 m² after integer stops change
    m2ThreeMmPerYear: 0.003 * (165 * 0.6 * (8*60*2) * 250), // unchanged
  };

  const tests = [
    { name: "Calage m²/year", pass: approxEqual(b.m2CalagePerYear, expected.m2CalagePerYear) },
    { name: "−3 mm m²/year", pass: approxEqual(b.m2ThreeMmPerYear, expected.m2ThreeMmPerYear) },
  ];

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4">
      <div className="text-xs uppercase tracking-wide text-zinc-500 mb-2">Self‑tests</div>
      <div className="grid grid-cols-2 gap-y-1 text-sm">
        {tests.map((t) => (
          <div key={t.name} className="flex items-center justify-between">
            <span className="text-zinc-700">{t.name}</span>
            <span className={t.pass ? "text-emerald-700" : "text-red-700"}>{t.pass ? "PASS" : "FAIL"}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
