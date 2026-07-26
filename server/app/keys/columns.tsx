"use client"

import { ColumnDef } from "@tanstack/react-table"

export type AnswerKey = {
  question_and_answer_id: number
  year: number
  branch: string
  paper: number
  booklet_version: string
  question_number: number
  question_text?: string
  option_a?: string
  option_b?: string
  option_c?: string
  option_d?: string
  correct_answer: string
}

export const columns: ColumnDef<AnswerKey>[] = [
  {
    accessorKey: "year",
    header: "Year",
  },
  {
    accessorKey: "branch",
    header: "Branch",
    cell: ({ row }) => <div className="font-medium">{row.getValue("branch")}</div>,
  },
  {
    accessorKey: "paper",
    header: "Paper",
  },
  {
    accessorKey: "booklet_version",
    header: "Booklet",
    cell: ({ row }) => <div className="font-bold">{row.getValue("booklet_version")}</div>,
  },
  {
    accessorKey: "question_number",
    header: "Question No.",
    cell: ({ row }) => <div className="text-center font-bold">Q{row.getValue("question_number")}</div>,
  },
  {
    accessorKey: "question_text",
    header: "Question",
    cell: ({ row }) => <div className="truncate max-w-[200px]" title={row.getValue("question_text")}>{row.getValue("question_text") || "-"}</div>,
  },
  {
    accessorKey: "option_a",
    header: "Option A",
    cell: ({ row }) => <div className="truncate max-w-[100px]">{row.getValue("option_a") || "-"}</div>,
  },
  {
    accessorKey: "option_b",
    header: "Option B",
    cell: ({ row }) => <div className="truncate max-w-[100px]">{row.getValue("option_b") || "-"}</div>,
  },
  {
    accessorKey: "option_c",
    header: "Option C",
    cell: ({ row }) => <div className="truncate max-w-[100px]">{row.getValue("option_c") || "-"}</div>,
  },
  {
    accessorKey: "option_d",
    header: "Option D",
    cell: ({ row }) => <div className="truncate max-w-[100px]">{row.getValue("option_d") || "-"}</div>,
  },
  {
    accessorKey: "correct_answer",
    header: "Correct Answer",
    cell: ({ row }) => (
      <div className="text-center font-mono text-lg font-bold text-primary">
        {row.getValue("correct_answer")}
      </div>
    ),
  },
]
