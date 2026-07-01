"use client";

import { useState } from "react";
import ToolShell from "@/components/ToolShell";

const FIRST_NAMES = ["Aiden", "Priya", "Wei", "Fatima", "Liam", "Sofia", "Kenji", "Amara", "Noah", "Elena", "Raj", "Zoe"];
const LAST_NAMES = ["Sharma", "Chen", "Garcia", "Müller", "Smith", "Kim", "Okafor", "Rossi", "Silva", "Nguyen"];
const STREETS = ["Maple St", "Oak Ave", "Cedar Rd", "Elm Blvd", "Pine Ln", "Main St", "Park Dr"];
const CITIES = ["Springfield", "Riverton", "Fairview", "Greenville", "Georgetown", "Salem", "Madison"];
const DOMAINS = ["example.com", "mailbox.test", "sample.org"];

interface FakePerson {
  name: string;
  email: string;
  phone: string;
  address: string;
}

function randomOf<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generatePerson(): FakePerson {
  const first = randomOf(FIRST_NAMES);
  const last = randomOf(LAST_NAMES);
  const phone = `+1-${100 + Math.floor(Math.random() * 900)}-${100 + Math.floor(Math.random() * 900)}-${1000 + Math.floor(Math.random() * 9000)}`;
  return {
    name: `${first} ${last}`,
    email: `${first.toLowerCase()}.${last.toLowerCase()}${Math.floor(Math.random() * 100)}@${randomOf(DOMAINS)}`,
    phone,
    address: `${1 + Math.floor(Math.random() * 9998)} ${randomOf(STREETS)}, ${randomOf(CITIES)}`,
  };
}

export default function FakeDataPage() {
  const [count, setCount] = useState(10);
  const [rows, setRows] = useState<FakePerson[]>([]);
  const [copied, setCopied] = useState(false);

  function generate() {
    setRows(Array.from({ length: count }, generatePerson));
  }

  async function copyCsv() {
    if (rows.length === 0) return;
    const header = "name,email,phone,address";
    const csv = [header, ...rows.map((r) => `${r.name},${r.email},${r.phone},"${r.address}"`)].join("\n");
    await navigator.clipboard.writeText(csv);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <ToolShell title="Fake Data Generator" description="Generate sample names, emails and addresses for testing.">
      <div className="flex flex-col gap-4">
        <p className="text-xs text-ink/40">
          Entirely made up, generated in your browser — not real people&apos;s data.
        </p>
        <div className="flex items-end gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-ink/70">How many</label>
            <input
              type="number"
              min={1}
              max={200}
              value={count}
              onChange={(e) => setCount(Math.max(1, Math.min(200, Number(e.target.value) || 1)))}
              className="w-24 rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-node-blue"
            />
          </div>
          <button onClick={generate} className="btn-primary">
            Generate
          </button>
          {rows.length > 0 && (
            <button onClick={copyCsv} className="btn-secondary">
              {copied ? "Copied!" : "Copy as CSV"}
            </button>
          )}
        </div>
        {rows.length > 0 && (
          <div className="card max-h-96 overflow-auto p-0">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-surface">
                <tr>
                  <th className="p-2 font-semibold text-ink/60">Name</th>
                  <th className="p-2 font-semibold text-ink/60">Email</th>
                  <th className="p-2 font-semibold text-ink/60">Phone</th>
                  <th className="p-2 font-semibold text-ink/60">Address</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className="border-t border-ink/10">
                    <td className="p-2">{r.name}</td>
                    <td className="p-2">{r.email}</td>
                    <td className="p-2">{r.phone}</td>
                    <td className="p-2">{r.address}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </ToolShell>
  );
}
