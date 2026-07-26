"use client"

import { useState } from "react"
import { MoreHorizontal, Trash2, Edit } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { DataTable } from "./data-table"
import { getColumns, AnswerSheet } from "./columns"
import { DetailsDialog } from "./details-dialog"

export default function DataPage() {
  const [data, setData] = useState<AnswerSheet[]>([])
  const [pageCount, setPageCount] = useState(0)
  const [totalRecords, setTotalRecords] = useState(0)
  const [loading, setLoading] = useState(false)

  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [rowToEdit, setRowToEdit] = useState<AnswerSheet | null>(null)
  const [rowToDelete, setRowToDelete] = useState<AnswerSheet | null>(null)

  // Details Modal State
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false)
  const [selectedDetailsId, setSelectedDetailsId] = useState<number | null>(null)

  const [currentParams, setCurrentParams] = useState<any>({})
  const [editFormData, setEditFormData] = useState({ candidate_name: "", registration_number: "", branch: "", booklet_version: "", booklet_serial_no: "" })

  const fetchData = async (params: any) => {
    setLoading(true)

    // Always append the status filter so the API only returns active records
    const fetchParams = {
      ...params,
      filters: {
        ...(params.filters || {}),
        status: 1, // Only fetch ACTIVE answer sheets
      }
    }

    setCurrentParams(fetchParams)
    try {
      const res = await fetch(`/api/v1/answer-sheet/list`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fetchParams)
      })
      const result = await res.json()
      if (result.status === 1) {
        // The API now filters status=1, so total and records are accurate
        setData(result.data.records)
        setPageCount(Math.ceil(result.data.total_records / (fetchParams.size || 10)))
        setTotalRecords(result.data.total_records)
      }
    } catch (e) {
      console.error("Failed to fetch data")
    } finally {
      setLoading(false)
    }
  }

  const refetch = () => {
    fetchData(currentParams)
  }

  const columns = getColumns(
    (row) => {
      setRowToEdit(row)
      setEditFormData({
        candidate_name: row.candidate_name,
        registration_number: row.registration_number,
        branch: row.branch,
        booklet_version: row.booklet_version,
        booklet_serial_no: row.booklet_serial_no,
      })
      setIsEditModalOpen(true)
    },
    (row) => {
      setRowToDelete(row)
      setIsDeleteModalOpen(true)
    }
  )

  const handleDelete = async () => {
    if (!rowToDelete) return
    try {
      await fetch(`/api/v1/answer-sheet/${rowToDelete.answer_sheet_id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 0 })
      })
      refetch()
    } catch (e) {
      console.error(e)
    } finally {
      setIsDeleteModalOpen(false)
      setRowToDelete(null)
    }
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!rowToEdit) return

    try {
      await fetch(`/api/v1/answer-sheet/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidate_name: editFormData.candidate_name,
          registration_number: editFormData.registration_number,
          branch: editFormData.branch,
          booklet_version: editFormData.booklet_version,
          booklet_serial_no: editFormData.booklet_serial_no,
        })
      })
      refetch()
    } catch (e) {
      console.error(e)
    } finally {
      setIsEditModalOpen(false)
      setRowToEdit(null)
    }
  }

  return (
    <div className="w-full px-4 sm:px-8 py-10">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Answer Sheets Data</h1>
          <p className="text-muted-foreground mt-1">Manage and verify all uploaded OMR scanner data.</p>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={data}
        pageCount={pageCount}
        totalRecords={totalRecords}
        loading={loading}
        onFetchData={fetchData}
        onRowClick={(row) => {
          setSelectedDetailsId(row.answer_sheet_id)
          setIsDetailsModalOpen(true)
        }}
      />

      <DetailsDialog
        open={isDetailsModalOpen}
        onOpenChange={setIsDetailsModalOpen}
        answerSheetId={selectedDetailsId}
      />

      {/* Edit Dialog */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Answer Sheet</DialogTitle>
            <DialogDescription>Make changes to the student's answer sheet metadata.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Candidate Name</Label>
              <Input
                value={editFormData.candidate_name}
                onChange={e => setEditFormData({ ...editFormData, candidate_name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Registration Number (Immutable Key)</Label>
              <Input value={editFormData.registration_number} disabled />
            </div>
            <div className="space-y-2">
              <Label>Branch</Label>
              <Input
                value={editFormData.branch}
                onChange={e => setEditFormData({ ...editFormData, branch: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Booklet Version</Label>
              <Input
                value={editFormData.booklet_version}
                onChange={e => setEditFormData({ ...editFormData, booklet_version: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Booklet Serial No</Label>
              <Input
                value={editFormData.booklet_serial_no}
                onChange={e => setEditFormData({ ...editFormData, booklet_serial_no: e.target.value })}
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)}>Cancel</Button>
              <Button type="submit">Save changes</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the answer sheet for Registration: {rowToDelete?.registration_number}? This will soft-delete the record.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsDeleteModalOpen(false)}>Cancel</Button>
            <Button type="button" variant="destructive" onClick={handleDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}
