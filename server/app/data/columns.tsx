"use client"

import { ColumnDef } from "@tanstack/react-table"
import { ArrowUpDown, MoreHorizontal, Edit, Trash2, GripVertical } from "lucide-react"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

export type AnswerSheet = {
  answer_sheet_id: number
  registration_number: string
  candidate_name: string
  branch: string
  booklet_version: string
  booklet_serial_no: string
}

// Drag handle component for columns
export const SortableHeader = ({ id, text, column }: { id: string, text: string, column: any }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: transform ? 1 : 0,
    position: transform ? "relative" : "static",
  } as React.CSSProperties

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-1 group">
      <div {...attributes} {...listeners} className="cursor-grab text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
        <GripVertical className="h-4 w-4" />
      </div>
      <Button
        variant="ghost"
        className="-ml-4"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        {text}
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    </div>
  )
}

export const getColumns = (
  openEditModal: (row: AnswerSheet) => void,
  openDeleteModal: (row: AnswerSheet) => void
): ColumnDef<AnswerSheet>[] => [
  {
    accessorKey: "answer_sheet_id",
    header: ({ column }) => <SortableHeader id="answer_sheet_id" text="ID" column={column} />,
  },
  {
    accessorKey: "registration_number",
    header: ({ column }) => <SortableHeader id="registration_number" text="Registration No." column={column} />,
  },
  {
    accessorKey: "candidate_name",
    header: ({ column }) => <SortableHeader id="candidate_name" text="Candidate Name" column={column} />,
  },
  {
    accessorKey: "branch",
    header: ({ column }) => <SortableHeader id="branch" text="Branch" column={column} />,
  },
  {
    accessorKey: "booklet_version",
    header: ({ column }) => <SortableHeader id="booklet_version" text="Booklet Version" column={column} />,
  },
  {
    accessorKey: "booklet_serial_no",
    header: ({ column }) => <SortableHeader id="booklet_serial_no" text="Serial No." column={column} />,
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const record = row.original

      return (
        <DropdownMenu>
          <DropdownMenuTrigger className={buttonVariants({ variant: "ghost", className: "h-8 w-8 p-0" })}>
            <span className="sr-only">Open menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuGroup>
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem 
                onClick={(e) => {
                  e.stopPropagation();
                  openEditModal(record);
                }}
              >
                <Edit className="mr-2 h-4 w-4" /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem 
                className="text-destructive" 
                onClick={(e) => {
                  e.stopPropagation();
                  openDeleteModal(record);
                }}
              >
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]
