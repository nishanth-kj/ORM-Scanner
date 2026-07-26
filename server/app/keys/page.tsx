"use client"

import { useEffect, useState } from "react"
import { DataTable } from "@/components/ui/data-table"
import { columns, AnswerKey } from "@/app/keys/columns"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export default function AnswerKeysPage() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [pageCount, setPageCount] = useState(0)
  const [totalRecords, setTotalRecords] = useState(0)
  const [selectedRow, setSelectedRow] = useState<AnswerKey | null>(null)

  const [currentParams, setCurrentParams] = useState({
    page: 1,
    size: 20,
    search: "",
    filters: {} as Record<string, any>
  })

  const [filterOptions, setFilterOptions] = useState<{
    years: number[], branches: string[], booklets: string[]
  }>({ years: [], branches: [], booklets: [] })

  useEffect(() => {
    fetchData(currentParams)
  }, [currentParams])

  const fetchData = async (fetchParams: any) => {
    setLoading(true)
    try {
      const res = await fetch("/api/v1/answer-key/list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fetchParams),
      })
      const result = await res.json()

      if (result.status === 1) {
        setData(result.data.records)
        setPageCount(Math.ceil(result.data.total_records / (fetchParams.size || 20)))
        setTotalRecords(result.data.total_records)
        if (result.data.filters) {
          setFilterOptions(result.data.filters)
        }
      }
    } catch (e) {
      console.error("Failed to fetch answer keys")
    } finally {
      setLoading(false)
    }
  }

  const handlePaginationChange = (page: number, size: number) => {
    setCurrentParams(prev => ({ ...prev, page, size }))
  }

  const handleSearch = (search: string, filters: any = {}) => {
    setCurrentParams(prev => ({ ...prev, page: 1, search, filters }))
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-2 sm:space-y-0">
        <h2 className="text-3xl font-bold tracking-tight font-heading">Answer Keys</h2>
      </div>

      {/* Filters Section */}
      <div className="flex flex-wrap items-center gap-4 bg-card p-4 rounded-lg border shadow-sm">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Year:</label>
          <Select
            value={currentParams.filters.year ? `${currentParams.filters.year}` : "All"}
            onValueChange={(val) => {
              setCurrentParams(prev => ({
                ...prev, page: 1, filters: { ...prev.filters, year: val === "All" ? undefined : Number(val) }
              }))
            }}
          >
            <SelectTrigger className="h-9 w-[120px]">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All</SelectItem>
              {filterOptions.years.map(y => <SelectItem key={y} value={`${y}`}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Branch:</label>
          <Select
            value={currentParams.filters.branch || "All"}
            onValueChange={(val) => {
              setCurrentParams(prev => ({
                ...prev, page: 1, filters: { ...prev.filters, branch: val === "All" ? undefined : val }
              }))
            }}
          >
            <SelectTrigger className="h-9 w-[250px]">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All</SelectItem>
              {filterOptions.branches.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Booklet:</label>
          <Select
            value={currentParams.filters.booklet_version || "All"}
            onValueChange={(val) => {
              setCurrentParams(prev => ({
                ...prev, page: 1, filters: { ...prev.filters, booklet_version: val === "All" ? undefined : val }
              }))
            }}
          >
            <SelectTrigger className="h-9 w-[120px]">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All</SelectItem>
              {filterOptions.booklets.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div className="bg-card border rounded-lg shadow-sm">
        <DataTable 
          columns={columns} 
          data={data} 
          pageCount={pageCount}
          totalRecords={totalRecords}
          loading={loading}
          onPaginationChange={handlePaginationChange}
          onSearch={handleSearch}
          searchPlaceholder="Search Branch or Booklet..."
          onRowClick={(row: any) => setSelectedRow(row)}
        />
      </div>

      <Dialog open={!!selectedRow} onOpenChange={(open) => !open && setSelectedRow(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Answer Key Details</DialogTitle>
            <DialogDescription>
              Detailed view of the question and its options.
            </DialogDescription>
          </DialogHeader>
          {selectedRow && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Branch</p>
                  <p className="font-medium">{selectedRow.branch}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Booklet</p>
                  <p className="font-medium">{selectedRow.booklet_version}</p>
                </div>
              </div>
              <div className="border-t pt-4">
                <h3 className="font-bold text-lg mb-2">Question {selectedRow.question_number}</h3>
                <p className="mb-4">{selectedRow.question_text || <span className="italic text-muted-foreground">No question text available</span>}</p>
                
                <div className="space-y-2">
                  <div className={`p-2 rounded-md border ${selectedRow.correct_answer === 'A' || selectedRow.correct_answer === '1' ? 'bg-green-100 dark:bg-green-900/30 border-green-500' : 'bg-muted'}`}>
                    <span className="font-bold mr-2">A:</span> {selectedRow.option_a || "-"}
                  </div>
                  <div className={`p-2 rounded-md border ${selectedRow.correct_answer === 'B' || selectedRow.correct_answer === '2' ? 'bg-green-100 dark:bg-green-900/30 border-green-500' : 'bg-muted'}`}>
                    <span className="font-bold mr-2">B:</span> {selectedRow.option_b || "-"}
                  </div>
                  <div className={`p-2 rounded-md border ${selectedRow.correct_answer === 'C' || selectedRow.correct_answer === '3' ? 'bg-green-100 dark:bg-green-900/30 border-green-500' : 'bg-muted'}`}>
                    <span className="font-bold mr-2">C:</span> {selectedRow.option_c || "-"}
                  </div>
                  <div className={`p-2 rounded-md border ${selectedRow.correct_answer === 'D' || selectedRow.correct_answer === '4' ? 'bg-green-100 dark:bg-green-900/30 border-green-500' : 'bg-muted'}`}>
                    <span className="font-bold mr-2">D:</span> {selectedRow.option_d || "-"}
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
