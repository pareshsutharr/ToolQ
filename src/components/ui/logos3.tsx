"use client";

// Adapted from the shadcn "Logos3" block. Instead of company logo images this
// auto-scrolls the file formats ToolQ works with, as icon chips (no external
// images, no shadcn tokens — uses this project's design tokens + lucide icons).
//
// Requires: npm install embla-carousel-react embla-carousel-auto-scroll

import type { ComponentType } from "react";
import AutoScroll from "embla-carousel-auto-scroll";
import {
  Braces,
  FileCode,
  FileSpreadsheet,
  FileText,
  FileType,
  Image as ImageIcon,
  Presentation,
  Type,
} from "lucide-react";

import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";

interface FormatItem {
  id: string;
  label: string;
  Icon: ComponentType<{ className?: string }>;
}

interface Logos3Props {
  heading?: string;
  formats?: FormatItem[];
  className?: string;
}

const DEFAULT_FORMATS: FormatItem[] = [
  { id: "pdf", label: "PDF", Icon: FileText },
  { id: "word", label: "Word", Icon: FileType },
  { id: "excel", label: "Excel", Icon: FileSpreadsheet },
  { id: "ppt", label: "PowerPoint", Icon: Presentation },
  { id: "images", label: "Images", Icon: ImageIcon },
  { id: "text", label: "Text", Icon: Type },
  { id: "html", label: "HTML", Icon: FileCode },
  { id: "json", label: "JSON", Icon: Braces },
];

const Logos3 = ({
  heading = "Works with all your file formats",
  formats = DEFAULT_FORMATS,
}: Logos3Props) => {
  return (
    <section className="bg-surface py-12 sm:py-16">
      <div className="mx-auto flex max-w-6xl flex-col items-center px-6 text-center">
        <p className="text-sm font-medium uppercase tracking-wide text-ink/50">{heading}</p>
      </div>
      <div className="pt-8 md:pt-10">
        <div className="relative mx-auto flex items-center justify-center lg:max-w-5xl">
          <Carousel opts={{ loop: true }} plugins={[AutoScroll({ playOnInit: true })]}>
            <CarouselContent className="ml-0">
              {formats.map((format) => (
                <CarouselItem
                  key={format.id}
                  className="flex basis-1/2 justify-center pl-0 sm:basis-1/3 md:basis-1/4 lg:basis-1/5"
                >
                  <div className="mx-3 flex shrink-0 items-center justify-center">
                    <div className="flex items-center gap-2 rounded-full border border-ink/10 bg-white px-5 py-2.5 shadow-sm">
                      <format.Icon className="h-5 w-5 text-node-blue" />
                      <span className="whitespace-nowrap text-base font-semibold text-deep-ink">
                        {format.label}
                      </span>
                    </div>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
          </Carousel>
          {/* Edge fades (Tailwind v3 gradient syntax; fades to the section bg). */}
          <div className="pointer-events-none absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-surface to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-surface to-transparent" />
        </div>
      </div>
    </section>
  );
};

export { Logos3 };
