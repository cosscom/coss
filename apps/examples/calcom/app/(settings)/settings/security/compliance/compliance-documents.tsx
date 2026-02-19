"use client";

import { Button } from "@coss/ui/components/button";
import {
  Tooltip,
  TooltipPopup,
  TooltipTrigger,
} from "@coss/ui/components/tooltip";
import { DownloadIcon, FileTextIcon, LockIcon } from "lucide-react";
import Link from "next/link";

interface ComplianceDocument {
  id: string;
  name: string;
  description: string;
  url: string;
  restricted: boolean;
}

const DOCUMENT_SECTIONS = [
  {
    documents: [
      {
        description: "View and download the DPA for Cal.com",
        id: "dpa",
        name: "Data protection agreement",
        restricted: false,
        url: "https://go.cal.com/dpa",
      },
    ],
    title: "Data privacy",
  },
  {
    documents: [
      {
        description: "SOC 2 Type II audit report",
        id: "soc2-report",
        name: "SOC 2 report",
        restricted: true,
        url: "#",
      },
      {
        description: "ISO/IEC 27001:2022 certificate",
        id: "iso27001-cert",
        name: "ISO 27001 certification",
        restricted: true,
        url: "#",
      },
    ],
    title: "Compliance reports",
  },
  {
    documents: [
      {
        description: "Latest third-party penetration test results",
        id: "pentest-report",
        name: "Penetration test report",
        restricted: true,
        url: "#",
      },
    ],
    title: "Other documents",
  },
] as const satisfies readonly {
  title: string;
  documents: readonly ComplianceDocument[];
}[];

function DocumentCard({
  document,
  hasAccess,
}: {
  document: ComplianceDocument;
  hasAccess: boolean;
}) {
  return (
    <div
      className="flex items-center justify-between gap-4 rounded-lg border border-default p-4 data-[restricted=true]:opacity-60"
      data-restricted={!hasAccess}
    >
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-lg bg-subtle">
          <FileTextIcon className="size-5 text-muted-foreground" />
        </div>
        <div>
          <p className="font-medium text-sm">{document.name}</p>
          <p className="text-muted-foreground text-sm">
            {document.description}
          </p>
        </div>
      </div>

      <div className="shrink-0">
        {hasAccess ? (
          <Button
            onClick={() =>
              window.open(document.url, "_blank", "noopener,noreferrer")
            }
            variant="outline"
          >
            <DownloadIcon />
            Download
          </Button>
        ) : (
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  render={<Link href="/settings/billing" />}
                  variant="outline"
                />
              }
            >
              <LockIcon />
              Upgrade to access
            </TooltipTrigger>
            <TooltipPopup>
              Upgrade to an organization plan to access this document
            </TooltipPopup>
          </Tooltip>
        )}
      </div>
    </div>
  );
}

export function ComplianceDocuments() {
  const hasRestrictedAccess = false;

  return (
    <div className="space-y-8">
      {DOCUMENT_SECTIONS.map((section) => (
        <section key={section.title}>
          <h2 className="mb-4 font-semibold text-base">{section.title}</h2>
          <div className="space-y-3">
            {section.documents.map((doc) => (
              <DocumentCard
                document={doc}
                hasAccess={!doc.restricted || hasRestrictedAccess}
                key={doc.id}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
