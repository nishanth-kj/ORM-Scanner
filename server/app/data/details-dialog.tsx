"use client"

import React, { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Check, X, Loader2 } from "lucide-react"

interface DetailsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  answerSheetId: number | null
}

export function DetailsDialog({ open, onOpenChange, answerSheetId }: DetailsDialogProps) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (open && answerSheetId) {
      setLoading(true)
      setError("")
      // Fetch details from the API
      fetch(`/api/v1/answer-sheet/${answerSheetId}`, {
        method: "POST",
      })
        .then((res) => res.json())
        .then((result) => {
          if (result.status === 1) {
            setData(result.data)
          } else {
            setError(result.error?.message || "Failed to fetch details")
          }
        })
        .catch((err) => {
          console.error(err)
          setError("An error occurred while fetching details")
        })
        .finally(() => {
          setLoading(false)
        })
    } else {
      setData(null)
    }
  }, [open, answerSheetId])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-w-[95vw] w-full max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl">Answer Sheet Details</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Loading answers...</p>
          </div>
        ) : error ? (
          <div className="text-center text-destructive py-10">{error}</div>
        ) : data ? (
          <div className="flex flex-col flex-1 overflow-hidden">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 p-4 bg-muted/30 rounded-lg mb-4 border">
              <div>
                <p className="text-sm text-muted-foreground">Candidate Name</p>
                <p className="font-semibold">{data.candidateName}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Registration No.</p>
                <p className="font-semibold">{data.registrationNumber}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Branch</p>
                <p className="font-semibold">{data.branch}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Booklet</p>
                <p className="font-semibold">{data.booklet_version}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Serial No.</p>
                <p className="font-semibold">{data.bookletSerialNo}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div className="p-4 bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-900 rounded-lg flex items-center justify-between shadow-sm">
                 <div>
                   <p className="text-sm text-green-700 dark:text-green-400 font-medium">Total Correct</p>
                   <p className="text-2xl font-bold text-green-800 dark:text-green-300">{data.responses?.filter((r: any) => r.status === 1).length || 0}</p>
                 </div>
                 <Check className="h-8 w-8 text-green-500 opacity-80" />
              </div>
              <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center justify-between shadow-sm">
                 <div>
                   <p className="text-sm text-destructive font-medium">Total Incorrect</p>
                   <p className="text-2xl font-bold text-destructive">{data.responses?.filter((r: any) => r.status === 0).length || 0}</p>
                 </div>
                 <X className="h-8 w-8 text-destructive opacity-80" />
              </div>
              <div className="p-4 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-900 rounded-lg flex items-center justify-between shadow-sm">
                 <div>
                   <p className="text-sm text-blue-700 dark:text-blue-400 font-medium">Final Score</p>
                   <p className="text-2xl font-bold text-blue-800 dark:text-blue-300">
                     {data.responses?.filter((r: any) => r.status === 1).length || 0} <span className="text-base font-normal text-blue-600 dark:text-blue-400">/ {data.responses?.length || 0}</span>
                   </p>
                 </div>
                 <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-xs shadow-inner">
                   %
                 </div>
              </div>
            </div>

            <h3 className="font-medium text-lg mb-2">Question Responses</h3>
            <div className="flex-1 overflow-y-auto border rounded-md">
              <Table>
                <TableHeader className="bg-muted/50 sticky top-0 z-10">
                  <TableRow>
                    <TableHead className="w-[100px] text-center">Q. No</TableHead>
                    <TableHead className="text-center">User Answer</TableHead>
                    <TableHead className="text-center">Correct Answer</TableHead>
                    <TableHead className="text-center">Result</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.responses && data.responses.length > 0 ? (
                    data.responses.map((r: any) => (
                      <React.Fragment key={r.question_number}>
                        <TableRow>
                          <TableCell className="text-center font-medium">
                            {r.question_number}
                          </TableCell>
                          <TableCell className="text-center font-mono font-bold">
                            {r.user_answer || "-"}
                          </TableCell>
                          <TableCell className="text-center font-mono text-muted-foreground">
                            {r.correct_answer || "-"}
                          </TableCell>
                          <TableCell className="text-center flex justify-center">
                            {r.status === 1 ? (
                              <div className="flex items-center gap-2 text-green-600 bg-green-500/10 px-2 py-1 rounded-md">
                                <Check className="h-4 w-4" />
                                <span className="text-xs font-semibold">Correct</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 text-destructive bg-destructive/10 px-2 py-1 rounded-md">
                                <X className="h-4 w-4" />
                                <span className="text-xs font-semibold">Incorrect</span>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                        <TableRow className={r.status === 1 ? "bg-green-500/5" : "bg-destructive/5"}>
                          <TableCell colSpan={4} className="p-4 border-b">
                            <div className="flex flex-col space-y-3 bg-card p-4 rounded-md border shadow-sm">
                              <h4 className="font-semibold text-sm">Question {r.question_number}:</h4>
                              {r.question_text && <p className="text-sm text-foreground">{r.question_text}</p>}
                              {r.question_image && (
                                <img src={r.question_image} alt={`Question ${r.question_number}`} className="max-w-full rounded-md border max-h-[300px] object-contain" />
                              )}
                              {!r.question_text && !r.question_image && <p className="text-sm italic text-muted-foreground">No question details available.</p>}
                              
                              {(r.option_a || r.option_a_image || r.option_b || r.option_b_image || r.option_c || r.option_c_image || r.option_d || r.option_d_image) && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                                  <div className={`p-2 rounded-md text-sm border flex flex-col justify-center ${
                                    (r.correct_answer === 'A' || r.correct_answer === '1') ? 'bg-green-100 dark:bg-green-900/30 border-green-500' :
                                    (r.user_answer === 'A' || r.user_answer === '1') ? 'bg-destructive/10 dark:bg-destructive/30 border-destructive' : 'bg-muted/50'
                                  }`}>
                                    <div className="flex items-center">
                                      <span className="font-bold mr-2">A:</span> {r.option_a || (r.option_a_image ? "" : "-")}
                                      {(r.user_answer === 'A' || r.user_answer === '1') && <span className="ml-2 text-xs text-destructive font-semibold">(Your Answer)</span>}
                                    </div>
                                    {r.option_a_image && <img src={r.option_a_image} alt="Option A" className="mt-2 max-w-full rounded border max-h-[150px] object-contain" />}
                                  </div>
                                  <div className={`p-2 rounded-md text-sm border flex flex-col justify-center ${
                                    (r.correct_answer === 'B' || r.correct_answer === '2') ? 'bg-green-100 dark:bg-green-900/30 border-green-500' :
                                    (r.user_answer === 'B' || r.user_answer === '2') ? 'bg-destructive/10 dark:bg-destructive/30 border-destructive' : 'bg-muted/50'
                                  }`}>
                                    <div className="flex items-center">
                                      <span className="font-bold mr-2">B:</span> {r.option_b || (r.option_b_image ? "" : "-")}
                                      {(r.user_answer === 'B' || r.user_answer === '2') && <span className="ml-2 text-xs text-destructive font-semibold">(Your Answer)</span>}
                                    </div>
                                    {r.option_b_image && <img src={r.option_b_image} alt="Option B" className="mt-2 max-w-full rounded border max-h-[150px] object-contain" />}
                                  </div>
                                  <div className={`p-2 rounded-md text-sm border flex flex-col justify-center ${
                                    (r.correct_answer === 'C' || r.correct_answer === '3') ? 'bg-green-100 dark:bg-green-900/30 border-green-500' :
                                    (r.user_answer === 'C' || r.user_answer === '3') ? 'bg-destructive/10 dark:bg-destructive/30 border-destructive' : 'bg-muted/50'
                                  }`}>
                                    <div className="flex items-center">
                                      <span className="font-bold mr-2">C:</span> {r.option_c || (r.option_c_image ? "" : "-")}
                                      {(r.user_answer === 'C' || r.user_answer === '3') && <span className="ml-2 text-xs text-destructive font-semibold">(Your Answer)</span>}
                                    </div>
                                    {r.option_c_image && <img src={r.option_c_image} alt="Option C" className="mt-2 max-w-full rounded border max-h-[150px] object-contain" />}
                                  </div>
                                  <div className={`p-2 rounded-md text-sm border flex flex-col justify-center ${
                                    (r.correct_answer === 'D' || r.correct_answer === '4') ? 'bg-green-100 dark:bg-green-900/30 border-green-500' :
                                    (r.user_answer === 'D' || r.user_answer === '4') ? 'bg-destructive/10 dark:bg-destructive/30 border-destructive' : 'bg-muted/50'
                                  }`}>
                                    <div className="flex items-center">
                                      <span className="font-bold mr-2">D:</span> {r.option_d || (r.option_d_image ? "" : "-")}
                                      {(r.user_answer === 'D' || r.user_answer === '4') && <span className="ml-2 text-xs text-destructive font-semibold">(Your Answer)</span>}
                                    </div>
                                    {r.option_d_image && <img src={r.option_d_image} alt="Option D" className="mt-2 max-w-full rounded border max-h-[150px] object-contain" />}
                                  </div>
                                </div>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      </React.Fragment>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">
                        No responses recorded for this sheet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
