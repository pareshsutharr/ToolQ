"use client";

import { useEffect, useState } from "react";
import ToolShell from "@/components/ToolShell";

function diffYMD(from: Date, to: Date) {
  let years = to.getFullYear() - from.getFullYear();
  let months = to.getMonth() - from.getMonth();
  let days = to.getDate() - from.getDate();
  if (days < 0) {
    months -= 1;
    const daysInPrevMonth = new Date(to.getFullYear(), to.getMonth(), 0).getDate();
    days += daysInPrevMonth;
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  return { years, months, days };
}

export default function AgeCalculatorPage() {
  const [birthDate, setBirthDate] = useState("2000-01-01");
  // Defaulting to "today" would render a different date on the server (at
  // build time) than on the client (whenever the page loads), causing a
  // hydration mismatch — so start empty and fill in client-side only.
  const [asOf, setAsOf] = useState("");

  useEffect(() => {
    setAsOf(new Date().toISOString().slice(0, 10));
  }, []);

  const from = new Date(birthDate);
  const to = new Date(asOf);
  const valid = Boolean(asOf) && !isNaN(from.getTime()) && !isNaN(to.getTime()) && to >= from;
  const { years, months, days } = valid ? diffYMD(from, to) : { years: 0, months: 0, days: 0 };
  const totalDays = valid ? Math.round((to.getTime() - from.getTime()) / 86400000) : 0;

  return (
    <ToolShell title="Age Calculator" description="Find the exact age or duration between two dates.">
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-ink/70">Birth date</label>
            <input
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              className="w-full rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-node-blue"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-ink/70">As of</label>
            <input
              type="date"
              value={asOf}
              onChange={(e) => setAsOf(e.target.value)}
              className="w-full rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-node-blue"
            />
          </div>
        </div>
        {!valid ? (
          <p className="text-sm text-flag-red">The &quot;as of&quot; date must be on or after the birth date.</p>
        ) : (
          <div className="card flex flex-col gap-2 p-4">
            <p className="text-2xl font-bold text-deep-ink">
              {years} years, {months} months, {days} days
            </p>
            <p className="text-sm text-ink/50">{totalDays.toLocaleString()} total days</p>
          </div>
        )}
      </div>
    </ToolShell>
  );
}
