import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { ArrowRight, FileScan, CheckCircle2, FileText, Activity } from "lucide-react";
import { db } from "@/lib/db";
import { answerSheet, responses } from "@/lib/schema";
import { eq, sql } from "drizzle-orm";

export const revalidate = 0; // Ensure fresh data on every load

export default async function Home() {
  // Fetch real-time analytics
  let totalSheets = 0;
  let totalResponses = 0;
  let correctResponses = 0;

  try {
    const [{ count: sheetCount }] = await db
      .select({ count: sql<number>`cast(count(*) as integer)` })
      .from(answerSheet)
      .where(eq(answerSheet.status, 1));
    totalSheets = sheetCount || 0;

    const [{ count: respCount }] = await db
      .select({ count: sql<number>`cast(count(*) as integer)` })
      .from(responses)
      .where(eq(responses.status, 1));
    totalResponses = respCount || 0;
    
    // Optional: Calculate accuracy if there are responses
    const [{ count: correctCount }] = await db
      .select({ count: sql<number>`cast(count(*) as integer)` })
      .from(responses)
      .where(sql`${responses.status} = 1 AND ${responses.userAnswer} = ${responses.correctAnswer}`);
    correctResponses = correctCount || 0;
  } catch (error) {
    console.error("Failed to fetch analytics", error);
  }

  const accuracy = totalResponses > 0 ? Math.round((correctResponses / totalResponses) * 100) : 0;

  return (
    <div className="flex flex-col items-center min-h-screen pt-12 md:pt-20 pb-12">
      {/* Dynamic Background Gradient */}
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background" />

      {/* Hero Section */}
      <div className="flex flex-col items-center text-center space-y-8 py-12 md:py-20 px-4 w-full max-w-5xl">
        
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-br from-foreground to-foreground/70 animate-in fade-in slide-in-from-bottom-6 duration-1000 delay-150">
          Intelligent OMR Processing
        </h1>
        
        <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300">
          Automated scanning, real-time analytics, and instant validation of student answer sheets with absolute precision.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 mt-8 animate-in fade-in slide-in-from-bottom-10 duration-1000 delay-500">
          <Link href="/data" className={buttonVariants({ size: "lg", className: "h-14 px-8 text-lg rounded-full shadow-lg hover:shadow-primary/25 transition-all duration-300 hover:scale-105" })}>
            View Data Explorer <ArrowRight className="ml-2 h-5 w-5" />
          </Link>
          <Link href="/docs" className={buttonVariants({ variant: "outline", size: "lg", className: "h-14 px-8 text-lg rounded-full bg-background/50 backdrop-blur-sm border-muted-foreground/20 hover:bg-muted/50 transition-all duration-300" })}>
            API Reference
          </Link>
        </div>
      </div>

      {/* Analytics Dashboard Cards */}
      <div className="w-full max-w-6xl px-4 grid grid-cols-1 md:grid-cols-3 gap-6 mb-24 animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-700">
        <div className="group relative overflow-hidden rounded-2xl border bg-background/50 p-8 shadow-sm backdrop-blur-xl transition-all hover:shadow-md hover:border-primary/50">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="relative z-10 flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-muted-foreground">Total Sheets Processed</h3>
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <FileText className="h-5 w-5 text-primary" />
            </div>
          </div>
          <p className="relative z-10 text-4xl font-bold tracking-tight">{totalSheets.toLocaleString()}</p>
        </div>

        <div className="group relative overflow-hidden rounded-2xl border bg-background/50 p-8 shadow-sm backdrop-blur-xl transition-all hover:shadow-md hover:border-blue-500/50">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="relative z-10 flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-muted-foreground">Questions Evaluated</h3>
            <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center">
              <FileScan className="h-5 w-5 text-blue-500" />
            </div>
          </div>
          <p className="relative z-10 text-4xl font-bold tracking-tight">{totalResponses.toLocaleString()}</p>
        </div>

        <div className="group relative overflow-hidden rounded-2xl border bg-background/50 p-8 shadow-sm backdrop-blur-xl transition-all hover:shadow-md hover:border-green-500/50">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="relative z-10 flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-muted-foreground">Average Accuracy</h3>
            <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center">
              <Activity className="h-5 w-5 text-green-500" />
            </div>
          </div>
          <p className="relative z-10 text-4xl font-bold tracking-tight">{accuracy}%</p>
        </div>
      </div>
    </div>
  );
}
