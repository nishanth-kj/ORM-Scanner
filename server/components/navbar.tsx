"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useState } from "react"
import { ModeToggle } from "./mode-toggle"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

export function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/data?search=${searchQuery.trim()}`)
    }
  }

  const links = [
    { href: "/", label: "Home" },
    { href: "/data", label: "Data View" },
    { href: "/keys", label: "Question and Answer" },
    { href: "/docs", label: "API Docs" },
  ]

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container grid grid-cols-3 h-14 max-w-screen-2xl items-center px-4 md:px-8 mx-auto">
        {/* Left: Logo */}
        <div className="flex justify-start">
          <Link href="/" className="flex items-center space-x-2">
            <span className="font-extrabold tracking-tight text-lg">
              OMR Scanner
            </span>
          </Link>
        </div>

        {/* Mid: Navigation Links */}
        <nav className="hidden md:flex items-center justify-center space-x-8 text-sm font-medium">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`transition-colors hover:text-foreground/80 ${pathname === link.href ? "text-foreground font-semibold" : "text-foreground/60"
                }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Right: Actions */}
        <div className="flex justify-end items-center space-x-2 md:space-x-4">
          <form onSubmit={handleSearch} className="relative hidden sm:block w-40 md:w-56">
            <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Record Lookup..."
              className="pl-8 h-8 text-xs bg-muted/50 border-muted-foreground/20 focus-visible:ring-1 focus-visible:ring-primary rounded-full shadow-inner"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </form>
          <Link href="https://github.com/nishanth-kj/ORM-Scanner" target="_blank" rel="noreferrer">
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4"
              >
                <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.02c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A4.8 4.8 0 0 0 9 18v4"></path>
              </svg>
            </Button>
          </Link>
          <ModeToggle />
        </div>
      </div>
    </header>
  )
}
