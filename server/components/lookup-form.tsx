"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Search, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function LookupForm() {
  const [registration, setRegistration] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!registration.trim()) return

    setLoading(true)
    setError("")

    try {
      const res = await fetch(`/api/v1/answer-sheet/list`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ search: registration })
      })
      const data = await res.json()
      
      if (data.status === 1 && data.data && data.data.records.length > 0) {
        const exactMatch = data.data.records.find((r: any) => r.registration_number === registration)
        
        if (exactMatch) {
           router.push(`/data?search=${registration}`)
        } else {
           setError("No exact match found.")
        }
      } else {
        setError("Answer sheet not found.")
      }
    } catch (err) {
      setError("Error occurred while searching.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md mx-auto flex flex-col items-center">
      <form onSubmit={handleSearch} className="flex w-full items-center space-x-2 relative shadow-lg rounded-full overflow-hidden border bg-background/80 backdrop-blur focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2 transition-all">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            id="registration"
            placeholder="Quick Record Lookup (e.g. 100000000)"
            className="pl-12 h-10 border-0 focus-visible:ring-0 bg-transparent text-sm"
            value={registration}
            onChange={(e) => setRegistration(e.target.value)}
            disabled={loading}
          />
        </div>
        <Button type="submit" size="default" className="h-10 px-6 rounded-none border-l hover:bg-primary/90 font-semibold" disabled={loading || !registration}>
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Search"}
        </Button>
      </form>
      {error && <p className="mt-2 text-sm text-destructive font-medium bg-destructive/10 px-3 py-1 rounded-full">{error}</p>}
    </div>
  )
}
