"use client"

import { useEffect, useState } from "react"
import { ImagePlus, X } from "lucide-react"
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

  const [editMode, setEditMode] = useState(false)
  const [editingData, setEditingData] = useState<Partial<AnswerKey>>({})
  const [savingKey, setSavingKey] = useState(false)

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

  const handleSaveEdit = async () => {
    if (!selectedRow) return;
    setSavingKey(true);
    try {
      const res = await fetch(`/api/v1/answer-key/${selectedRow.question_and_answer_id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingData)
      });
      const result = await res.json();
      if (result.status === 1) {
        setEditMode(false);
        fetchData(currentParams); // Refresh data
        // Update selectedRow with new data to reflect changes immediately in view mode
        setSelectedRow(prev => prev ? { ...prev, ...editingData } : null);
      } else {
        alert("Failed to save answer key: " + (result.error?.message || "Unknown error"));
      }
    } catch (e) {
      alert("Error saving answer key");
    } finally {
      setSavingKey(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const MAX_DIMENSION = 800;
        
        if (width > height && width > MAX_DIMENSION) {
          height *= MAX_DIMENSION / width;
          width = MAX_DIMENSION;
        } else if (height > MAX_DIMENSION) {
          width *= MAX_DIMENSION / height;
          height = MAX_DIMENSION;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          let quality = 0.8;
          let dataUrl = canvas.toDataURL('image/jpeg', quality);
          const maxBase64Length = 100 * 1024 * 1.37; // ~100kb
          
          while (dataUrl.length > maxBase64Length && quality > 0.1) {
            quality -= 0.1;
            dataUrl = canvas.toDataURL('image/jpeg', quality);
          }
          setEditingData(prev => ({ ...prev, [field]: dataUrl }));
        }
      };
      if (ev.target?.result) {
        img.src = ev.target.result as string;
      }
    };
    reader.readAsDataURL(file);
    // Reset the input so the same file can be uploaded again if needed
    e.target.value = "";
  };

  const openDialog = (row: any) => {
    setSelectedRow(row);
    setEditMode(false);
    setEditingData({
      question_text: row.question_text || "",
      question_image: row.question_image || "",
      option_a: row.option_a || "",
      option_a_image: row.option_a_image || "",
      option_b: row.option_b || "",
      option_b_image: row.option_b_image || "",
      option_c: row.option_c || "",
      option_c_image: row.option_c_image || "",
      option_d: row.option_d || "",
      option_d_image: row.option_d_image || "",
      correct_answer: row.correct_answer || "",
    });
  };

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
          onRowClick={openDialog}
        />
      </div>

      <Dialog open={!!selectedRow} onOpenChange={(open) => !open && setSelectedRow(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <div className="flex items-center justify-between pr-8">
              <DialogTitle>Answer Key Details</DialogTitle>
              {!editMode && (
                <button 
                  onClick={() => setEditMode(true)}
                  className="text-xs bg-primary text-primary-foreground px-3 py-1 rounded-md"
                >
                  Edit
                </button>
              )}
            </div>
            <DialogDescription>
              Detailed view of the question and its options.
            </DialogDescription>
          </DialogHeader>
          
          {selectedRow && !editMode && (
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

          {selectedRow && editMode && (
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
              <div className="border-t pt-4 space-y-4">
                <h3 className="font-bold text-lg mb-2">Editing Question {selectedRow.question_number}</h3>
                
                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Question Text</label>
                    <label className="cursor-pointer text-muted-foreground hover:text-primary transition-colors">
                      <input 
                        type="file" 
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleImageUpload(e, 'question_image')}
                      />
                      <ImagePlus size={18} />
                    </label>
                  </div>
                  <textarea 
                    className="w-full border rounded-md p-2 mt-1 min-h-[80px]"
                    value={editingData.question_text}
                    onChange={e => setEditingData({...editingData, question_text: e.target.value})}
                  />
                  {editingData.question_image && (
                    <div className="relative mt-2 inline-block">
                      <img src={editingData.question_image} className="max-h-20 object-contain rounded border" />
                      <button onClick={() => setEditingData({...editingData, question_image: ""})} className="absolute -top-2 -right-2 bg-destructive text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
                        <X size={12} />
                      </button>
                    </div>
                  )}
                </div>
                
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">Option A</label>
                      <label className="cursor-pointer text-muted-foreground hover:text-primary transition-colors">
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'option_a_image')} />
                        <ImagePlus size={16} />
                      </label>
                    </div>
                    <input 
                      type="text"
                      className="w-full border rounded-md p-2 mt-1 mb-1"
                      value={editingData.option_a}
                      onChange={e => setEditingData({...editingData, option_a: e.target.value})}
                    />
                    {editingData.option_a_image && (
                      <div className="relative mt-2 inline-block">
                        <img src={editingData.option_a_image} className="max-h-16 object-contain rounded border" />
                        <button onClick={() => setEditingData({...editingData, option_a_image: ""})} className="absolute -top-2 -right-2 bg-destructive text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
                          <X size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">Option B</label>
                      <label className="cursor-pointer text-muted-foreground hover:text-primary transition-colors">
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'option_b_image')} />
                        <ImagePlus size={16} />
                      </label>
                    </div>
                    <input 
                      type="text"
                      className="w-full border rounded-md p-2 mt-1 mb-1"
                      value={editingData.option_b}
                      onChange={e => setEditingData({...editingData, option_b: e.target.value})}
                    />
                    {editingData.option_b_image && (
                      <div className="relative mt-2 inline-block">
                        <img src={editingData.option_b_image} className="max-h-16 object-contain rounded border" />
                        <button onClick={() => setEditingData({...editingData, option_b_image: ""})} className="absolute -top-2 -right-2 bg-destructive text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
                          <X size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">Option C</label>
                      <label className="cursor-pointer text-muted-foreground hover:text-primary transition-colors">
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'option_c_image')} />
                        <ImagePlus size={16} />
                      </label>
                    </div>
                    <input 
                      type="text"
                      className="w-full border rounded-md p-2 mt-1 mb-1"
                      value={editingData.option_c}
                      onChange={e => setEditingData({...editingData, option_c: e.target.value})}
                    />
                    {editingData.option_c_image && (
                      <div className="relative mt-2 inline-block">
                        <img src={editingData.option_c_image} className="max-h-16 object-contain rounded border" />
                        <button onClick={() => setEditingData({...editingData, option_c_image: ""})} className="absolute -top-2 -right-2 bg-destructive text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
                          <X size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">Option D</label>
                      <label className="cursor-pointer text-muted-foreground hover:text-primary transition-colors">
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'option_d_image')} />
                        <ImagePlus size={16} />
                      </label>
                    </div>
                    <input 
                      type="text"
                      className="w-full border rounded-md p-2 mt-1 mb-1"
                      value={editingData.option_d}
                      onChange={e => setEditingData({...editingData, option_d: e.target.value})}
                    />
                    {editingData.option_d_image && (
                      <div className="relative mt-2 inline-block">
                        <img src={editingData.option_d_image} className="max-h-16 object-contain rounded border" />
                        <button onClick={() => setEditingData({...editingData, option_d_image: ""})} className="absolute -top-2 -right-2 bg-destructive text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
                          <X size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="text-sm font-medium">Correct Answer</label>
                    <select 
                      className="w-full border rounded-md p-2 mt-1 bg-background"
                      value={editingData.correct_answer}
                      onChange={e => setEditingData({...editingData, correct_answer: e.target.value})}
                    >
                      <option value="A">A</option>
                      <option value="B">B</option>
                      <option value="C">C</option>
                      <option value="D">D</option>
                      <option value="1">1</option>
                      <option value="2">2</option>
                      <option value="3">3</option>
                      <option value="4">4</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t mt-4">
                  <button 
                    disabled={savingKey}
                    onClick={() => setEditMode(false)}
                    className="px-4 py-2 border rounded-md text-sm font-medium hover:bg-muted"
                  >
                    Cancel
                  </button>
                  <button 
                    disabled={savingKey}
                    onClick={handleSaveEdit}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium"
                  >
                    {savingKey ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
