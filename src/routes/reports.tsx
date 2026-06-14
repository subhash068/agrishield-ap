import { createFileRoute } from "@tanstack/react-router";
import { FileBarChart2, Download, Calendar, FileText } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/reports")({
  head: () => ({ meta: [{ title: "Reports & Analytics · AgriShield AP" }, { name: "description", content: "Downloadable government reports, district analytics and outbreak summaries." }] }),
  component: () => {
    const reports = [
      { title: "Statewide Crop Health Summary", period: "Nov 2026", size: "4.2 MB", type: "PDF" },
      { title: "District Outbreak Analysis", period: "Q3 2026", size: "8.1 MB", type: "PDF" },
      { title: "Farmer Advisory Effectiveness", period: "Oct 2026", size: "2.4 MB", type: "XLSX" },
      { title: "Satellite Coverage Report", period: "Nov 2026", size: "11 MB", type: "PDF" },
      { title: "Pest Outbreak Bulletin", period: "Weekly", size: "1.1 MB", type: "PDF" },
      { title: "Scheme Disbursement Tracker", period: "FY 2026-27", size: "6.7 MB", type: "XLSX" },
      { title: "APRTGS Mandal Surveillance Export", period: "Live - Krishna District", size: "JSON", type: "JSON" },
    ];

    const handleDownload = async (title: string, type: string) => {
      if (title === "APRTGS Mandal Surveillance Export") {
        try {
          const { exportAprtgsMandalReport } = await import("@/lib/api");
          const data = await exportAprtgsMandalReport("Krishna", "Vijayawada");
          const content = JSON.stringify(data, null, 2);
          const blob = new Blob([content], { type: "application/json" });
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `aprtgs_mandal_surveillance_${data.district}_${data.mandal}.json`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
        } catch (e) {
          alert("Failed to export APRTGS report. Ensure the backend server is running.");
        }
        return;
      }
      const content = `Report Data for ${title}`;
      const blob = new Blob([content], { type: type === "PDF" ? "application/pdf" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${title.replace(/\s+/g, "_")}.${type.toLowerCase()}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    };

    return (
      <div>
        <PageHeader icon={<FileBarChart2 className="h-6 w-6 text-accent" />} eyebrow="Analytics" title="Reports & Analytics"
          description="Auto-generated government reports with scheduling and export."
          actions={<Button size="sm" className="gap-1.5"><Calendar className="h-3.5 w-3.5" /> Schedule report</Button>} />
        <div className="px-6 lg:px-10 py-6 grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reports.map(r => (
            <div key={r.title} className="glass rounded-xl p-5 hover:border-primary/40 transition">
              <div className="flex items-start justify-between">
                <div className="h-10 w-10 rounded-lg bg-accent/15 grid place-items-center"><FileText className="h-5 w-5 text-accent" /></div>
                <Badge variant="outline">{r.type}</Badge>
              </div>
              <h3 className="mt-3 font-semibold">{r.title}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{r.period} · {r.size}</p>
              <div className="mt-4 flex gap-2">
                <Button size="sm" className="gap-1.5 flex-1" onClick={() => handleDownload(r.title, r.type)}>
                  <Download className="h-3.5 w-3.5" /> Download
                </Button>
                <Button size="sm" variant="outline">Preview</Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  },
});
