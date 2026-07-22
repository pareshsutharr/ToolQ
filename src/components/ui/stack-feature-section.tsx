import type { ComponentType, CSSProperties } from "react";
import Link from "next/link";
import SearchBar from "@/components/SearchBar";
import {
  Braces,
  Calculator,
  FileSpreadsheet,
  FileText,
  Image as ImageIcon,
  KeyRound,
  QrCode,
  ScanText,
  Search,
} from "lucide-react";
import {
  FaFacebookF,
  FaGithub,
  FaGoogle,
  FaInstagram,
  FaLinkedinIn,
  FaYoutube,
} from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";

interface OrbitItem {
  label: string;
  Icon: ComponentType<{ className?: string }>;
  color: string;
}

const ORBIT_ITEMS: OrbitItem[] = [
  { label: "PDF tools", Icon: FileText, color: "#4F46E5" },
  { label: "GitHub", Icon: FaGithub, color: "#181717" },
  { label: "Image tools", Icon: ImageIcon, color: "#0891B2" },
  { label: "Instagram", Icon: FaInstagram, color: "#E1306C" },
  { label: "QR generator", Icon: QrCode, color: "#059669" },
  { label: "OCR", Icon: ScanText, color: "#D97706" },
  { label: "LinkedIn", Icon: FaLinkedinIn, color: "#0A66C2" },
  { label: "Spreadsheets", Icon: FileSpreadsheet, color: "#16A34A" },
  { label: "YouTube", Icon: FaYoutube, color: "#FF0000" },
  { label: "Developer tools", Icon: Braces, color: "#7C3AED" },
  { label: "Calculators", Icon: Calculator, color: "#E11D48" },
  { label: "Facebook", Icon: FaFacebookF, color: "#1877F2" },
  { label: "Passwords", Icon: KeyRound, color: "#EA580C" },
  { label: "X", Icon: FaXTwitter, color: "#111111" },
  { label: "Google", Icon: FaGoogle, color: "#4285F4" },
];

const ORBITS = [
  { size: 42, duration: 24, items: ORBIT_ITEMS.slice(0, 5) },
  { size: 70, duration: 36, items: ORBIT_ITEMS.slice(5, 10) },
  { size: 100, duration: 50, items: ORBIT_ITEMS.slice(10, 15) },
];

export default function FeatureSection() {
  return (
    <section className="relative isolate w-full overflow-hidden bg-white px-4 py-12 sm:px-6 sm:py-20 lg:py-28">
      <div className="mx-auto min-h-[100%] w-full max-w-6xl">
        <div className="relative z-20 flex min-h-[70rem] w-full flex-col justify-center px-6 py-10 sm:min-h-[30rem] sm:max-w-[68%] sm:px-10 md:max-w-[62%] lg:max-w-[60%] lg:px-16">
          <h1 className="max-w-lg font-display text-3xl font-bold leading-[1.08] tracking-[-0.04em] text-deep-ink sm:text-4xl lg:text-5xl">
            Build with the right tool
          </h1>

          <p className="mt-4 max-w-md text-sm leading-6 text-ink/55 sm:text-base">
            Edit PDFs, transform images, format code, and handle everyday tasks with fast,
            focused tools that work right in your browser.
          </p>

          <SearchBar className="mt-6 block w-full max-w-md" size="lg" />

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link href="/tools/pdf" className="btn-primary rounded-md px-4 py-2 text-xs">
              Get started
            </Link>
            <Link href="#pdf-tools" className="btn-secondary rounded-md px-4 py-2 text-xs">
              Browse tools
            </Link>
          </div>
        </div>
      </div>

      <div
        className="pointer-events-none absolute bottom-[5%] right-0 top-[5%] z-10 hidden aspect-square translate-x-1/2 sm:block"
        aria-hidden="true"
      >
          <div className="absolute left-[47%] top-1/2 z-10 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center text-node-blue">
            <Search className="h-8 w-8" strokeWidth={2.2} />
          </div>

          {ORBITS.map((orbit, orbitIndex) => (
            <div
              key={orbit.size}
              className="toolq-clean-orbit absolute rounded-full border border-ink/[0.17]"
              style={
                {
                  width: orbit.size + "%",
                  height: orbit.size + "%",
                  left: (100 - orbit.size) / 2 + "%",
                  top: (100 - orbit.size) / 2 + "%",
                  "--orbit-duration": orbit.duration + "s",
                  "--orbit-direction": orbitIndex === 1 ? "reverse" : "normal",
                } as CSSProperties
              }
            >
              {orbit.items.map((item, itemIndex) => {
                const angle =
                  (itemIndex / orbit.items.length) * Math.PI * 2 -
                  Math.PI / 2 +
                  orbitIndex * 0.45;
                return (
                  <span
                    key={item.label}
                    className="toolq-clean-icon absolute flex h-8 w-8 items-center justify-center"
                    style={
                      {
                        left: 50 + 50 * Math.cos(angle) + "%",
                        top: 50 + 50 * Math.sin(angle) + "%",
                        color: item.color,
                        "--orbit-duration": orbit.duration + "s",
                        "--orbit-direction": orbitIndex === 1 ? "reverse" : "normal",
                      } as CSSProperties
                    }
                  >
                    <item.Icon className="h-6 w-6" />
                  </span>
                );
              })}
            </div>
          ))}
      </div>
    </section>
  );
}
