"use client"

import * as React from "react"
import {
  ColumnDef,
  ColumnOrderState,
  flexRender,
  getCoreRowModel,
  useReactTable,
  VisibilityState,
  SortingState,
  RowSelectionState,
} from "@tanstack/react-table"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ChevronDown, RefreshCw, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  pageCount: number
  totalRecords: number
  loading: boolean
  onFetchData?: (params: any) => void
  onRowClick?: (row: TData) => void
  onPaginationChange?: (page: number, size: number) => void
  onSearch?: (search: string, filters?: any) => void
  searchPlaceholder?: string
  onSelectionChange?: (rows: TData[]) => void
}

export function DataTable<TData, TValue>({
  columns,
  data,
  pageCount,
  totalRecords,
  loading,
  onFetchData,
  onRowClick,
  onPaginationChange,
  onSearch,
  searchPlaceholder = "Search...",
  onSelectionChange,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({})
  const [columnOrder, setColumnOrder] = React.useState<ColumnOrderState>(() =>
    ["select", ...columns.map((c) => c.id as string ?? (c as any).accessorKey as string)]
  )
  
  const [inputValue, setInputValue] = React.useState("")
  const [searchQuery, setSearchQuery] = React.useState("")
  const [pageIndex, setPageIndex] = React.useState(0)
  const [pageSize, setPageSize] = React.useState(20)

  // Debounce search input
  React.useEffect(() => {
    const timeout = setTimeout(() => {
      setSearchQuery(inputValue)
      setPageIndex(0)
      if (onSearch) {
        onSearch(inputValue)
      }
    }, 400)
    return () => clearTimeout(timeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputValue])

  // Fetch data whenever sorting, pagination, or search changes
  React.useEffect(() => {
    if (onPaginationChange) {
       onPaginationChange(pageIndex + 1, pageSize)
    }

    if (onFetchData) {
      const sortField = sorting.length > 0 ? sorting[0].id : undefined
      const sortOrder = sorting.length > 0 ? (sorting[0].desc ? "desc" : "asc") : undefined

      onFetchData({
        page: pageIndex + 1,
        size: pageSize,
        search: searchQuery || undefined,
        sort_by: sortField,
        sort_order: sortOrder,
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageIndex, pageSize, searchQuery, sorting])

  const handleRefresh = () => {
    if (onFetchData) {
      const sortField = sorting.length > 0 ? sorting[0].id : undefined
      const sortOrder = sorting.length > 0 ? (sorting[0].desc ? "desc" : "asc") : undefined

      onFetchData({
        page: pageIndex + 1,
        size: pageSize,
        search: searchQuery || undefined,
        sort_by: sortField,
        sort_order: sortOrder,
      })
    } else if (onPaginationChange) {
      onPaginationChange(pageIndex + 1, pageSize)
    }
  }

  // Selection checkbox column
  const selectColumn: ColumnDef<TData, TValue> = {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value: boolean | 'indeterminate') => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value: boolean | 'indeterminate') => row.toggleSelected(!!value)}
        onClick={(e) => e.stopPropagation()}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  }

  const allColumns = [selectColumn, ...columns]

  const table = useReactTable({
    data,
    columns: allColumns,
    pageCount,
    state: {
      sorting,
      columnVisibility,
      columnOrder,
      rowSelection,
      pagination: {
        pageIndex,
        pageSize,
      },
    },
    enableRowSelection: true,
    onRowSelectionChange: (updater) => {
      setRowSelection(updater)
      // Notify parent of selected rows after state update
      const next = typeof updater === "function" ? updater(rowSelection) : updater
      const selectedRows = data.filter((_, i) => next[i])
      onSelectionChange?.(selectedRows)
    },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnOrderChange: setColumnOrder,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
  })

  // Drag and drop setup for columns
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      }
    }),
    useSensor(KeyboardSensor)
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (active && over && active.id !== over.id) {
      setColumnOrder((columnOrder) => {
        const oldIndex = columnOrder.indexOf(active.id as string)
        const newIndex = columnOrder.indexOf(over.id as string)
        return arrayMove(columnOrder, oldIndex, newIndex)
      })
    }
  }

  return (
    <div className="space-y-4">
      {/* Top Section: Search, Column Visibility, Sort By */}
      <div className="flex flex-col sm:flex-row items-center gap-4 justify-between bg-card p-4 rounded-lg border shadow-sm">
        <Input
          placeholder={searchPlaceholder}
          value={inputValue}
          onChange={(event) => {
            setInputValue(event.target.value)
          }}
          className="max-w-sm"
        />

        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            size="icon" 
            onClick={handleRefresh} 
            disabled={loading} 
            title="Refresh Data"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            <span className="sr-only">Refresh Data</span>
          </Button>

          {/* Sort By Option explicitly as requested */}
          <DropdownMenu>
            <DropdownMenuTrigger className={buttonVariants({ variant: "outline" }) + " ml-auto"}>
              Sort By <ChevronDown className="ml-2 h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {table.getAllLeafColumns().map((column) => (
                <DropdownMenuCheckboxItem
                  key={column.id}
                  className="capitalize"
                  checked={sorting.length > 0 && sorting[0].id === column.id}
                  onCheckedChange={() => {
                    const isDesc = sorting.length > 0 && sorting[0].id === column.id ? !sorting[0].desc : true
                    setSorting([{ id: column.id, desc: isDesc }])
                  }}
                >
                  {column.id.replace(/_/g, " ")}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Column Visibility */}
          <DropdownMenu>
            <DropdownMenuTrigger className={buttonVariants({ variant: "outline" }) + " ml-auto"}>
              Columns <ChevronDown className="ml-2 h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {table
                .getAllColumns()
                .filter((column) => column.getCanHide())
                .map((column) => {
                  return (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="capitalize"
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) =>
                        column.toggleVisibility(!!value)
                      }
                    >
                      {column.id.replace(/_/g, " ")}
                    </DropdownMenuCheckboxItem>
                  )
                })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Table Section with Drag and Drop headers */}
      <div className="rounded-md border bg-card shadow-sm overflow-hidden relative">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <Table>
            <TableHeader className="bg-muted/50">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  <SortableContext
                    items={columnOrder}
                    strategy={horizontalListSortingStrategy}
                  >
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id} colSpan={header.colSpan}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </TableHead>
                    ))}
                  </SortableContext>
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell
                    colSpan={allColumns.length}
                    className="h-24 text-center"
                  >
                    Loading...
                  </TableCell>
                </TableRow>
              ) : table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                    onClick={() => onRowClick && onRowClick(row.original)}
                    className={onRowClick ? "cursor-pointer hover:bg-muted/50" : ""}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={allColumns.length}
                    className="h-24 text-center"
                  >
                    No results found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </DndContext>
      </div>

      {/* Bottom Section: Pagination and Row Size */}
      <div className="flex items-center justify-between px-2 py-4">
        {/* Left: Detail */}
        <div className="flex-1 text-sm text-muted-foreground font-medium flex flex-col gap-0.5">
          <span>Showing {totalRecords === 0 ? 0 : pageIndex * pageSize + 1} to {Math.min((pageIndex + 1) * pageSize, totalRecords)} of {totalRecords} records</span>
          {table.getFilteredSelectedRowModel().rows.length > 0 && (
            <span className="text-primary font-semibold">
              {table.getFilteredSelectedRowModel().rows.length} row{table.getFilteredSelectedRowModel().rows.length > 1 ? "s" : ""} selected
            </span>
          )}
        </div>

        {/* Center: Pagination */}
        <div className="flex items-center space-x-2 justify-center flex-1">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setPageIndex(0)}
            disabled={pageIndex === 0 || loading}
            title="First Page"
          >
            <ChevronsLeft className="h-4 w-4" />
            <span className="sr-only">First</span>
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setPageIndex((prev) => Math.max(0, prev - 1))}
            disabled={pageIndex === 0 || loading}
            title="Previous Page"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="sr-only">Previous</span>
          </Button>
          <div className="text-sm font-medium px-2">
            Page {pageIndex + 1} of {pageCount || 1}
          </div>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setPageIndex((prev) => prev + 1)}
            disabled={pageIndex >= pageCount - 1 || loading}
            title="Next Page"
          >
            <ChevronRight className="h-4 w-4" />
            <span className="sr-only">Next</span>
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setPageIndex(pageCount - 1)}
            disabled={pageIndex >= pageCount - 1 || loading}
            title="Last Page"
          >
            <ChevronsRight className="h-4 w-4" />
            <span className="sr-only">Last</span>
          </Button>
        </div>

        {/* Right: Rows per page */}
        <div className="flex items-center space-x-2 justify-end flex-1">
          <p className="text-sm font-medium">Rows per page</p>
          <Select
            value={`${pageSize}`}
            onValueChange={(value) => {
              setPageSize(Number(value))
              setPageIndex(0)
            }}
          >
            <SelectTrigger className="h-8 w-[70px]">
              <SelectValue placeholder={pageSize} />
            </SelectTrigger>
            <SelectContent side="top">
              {[10, 20, 30, 40, 50].map((pageSize) => (
                <SelectItem key={pageSize} value={`${pageSize}`}>
                  {pageSize}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  )
}
