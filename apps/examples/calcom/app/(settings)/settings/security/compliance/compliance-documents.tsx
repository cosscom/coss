"use client";

import { Button } from "@coss/ui/components/button";
import { Card, CardPanel } from "@coss/ui/components/card";
import { EmptyMedia } from "@coss/ui/components/empty";
import { DownloadIcon, FileTextIcon, LockIcon } from "lucide-react";

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

export function ComplianceDocuments() {
  const hasRestrictedAccess = false;

  return (
    <div className="flex flex-col gap-6">
      {DOCUMENT_SECTIONS.map((section) => (
        <section className="flex flex-col gap-2" key={section.title}>
          <h2 className="font-medium text-sm">{section.title}</h2>
          <div className="flex flex-col gap-2">
            {section.documents.map((doc) => {
              const hasAccess = !doc.restricted || hasRestrictedAccess;
              return (
                <Card data-restricted={!hasAccess} key={doc.id}>
                  <CardPanel className="p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <EmptyMedia
                          className="m-0 ms-0.5 max-sm:hidden"
                          variant="icon"
                        >
                          <FileTextIcon />
                        </EmptyMedia>
                        <div>
                          <p className="font-medium text-sm">{doc.name}</p>
                          <p className="text-muted-foreground text-sm">
                            {doc.description}
                          </p>
                        </div>
                      </div>
                      <Button disabled={!hasAccess} variant="outline">
                        {hasAccess ? <DownloadIcon /> : <LockIcon />}
                        {hasAccess ? "Download" : "Upgrade to access"}
                      </Button>
                    </div>
                  </CardPanel>
                </Card>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
