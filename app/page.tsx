"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { Wand2, Trash2, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { DesignResults } from "@/components/design-results"
import { DesignResultsSkeleton } from "@/components/design-results-skeleton"
import { InteriorDesignResponse } from "@/types"

export default function Home() {
  const [prompt, setPrompt] = React.useState("")
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [results, setResults] = React.useState<InteriorDesignResponse | null>(null)
  const [progressMsg, setProgressMsg] = React.useState("")

  const loadingMessages = [
    "Understanding your project...",
    "Generating professional recommendations...",
    "Creating colour palette...",
    "Preparing mood board...",
    "Finalizing design..."
  ]

  const handleGenerate = async () => {
    if (!prompt.trim()) return

    setLoading(true)
    setError(null)
    setResults(null)
    
    let msgIndex = 0;
    setProgressMsg(loadingMessages[0]);
    const interval = setInterval(() => {
      msgIndex = (msgIndex + 1) % loadingMessages.length;
      setProgressMsg(loadingMessages[msgIndex]);
    }, 2500);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ prompt })
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || "Failed to generate design suggestions.")
      }

      const data = await res.json()
      setResults(data)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred. Please try again.")
    } finally {
      clearInterval(interval)
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center justify-start min-h-[calc(100vh-4rem)] pt-12 px-4 sm:px-6">
      
      {/* Hero Section */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-3xl text-center mb-12 space-y-4 print:hidden"
      >
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-foreground">
          AI Interior Design Assistant
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Describe your project and receive professional interior design recommendations, colour palettes, and material suggestions powered by AI.
        </p>
      </motion.div>

      {/* Input Section */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        className="w-full max-w-3xl mb-16 print:hidden"
      >
        <Card className="shadow-lg border-primary/10 overflow-hidden bg-card/50 backdrop-blur-sm">
          <CardContent className="p-0">
            <textarea
              className="w-full h-48 sm:h-64 p-6 bg-transparent resize-none outline-none text-base placeholder:text-muted-foreground/60 leading-relaxed"
              placeholder="Example: Design a modern luxury master bedroom. Earthy colours. Warm lighting. Walnut wood. Minimal furniture. Premium budget."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={loading}
            />
            
            <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-muted/30 border-t">

              
              <div className="flex gap-3 ml-auto">
                {prompt && !loading && (
                  <Button variant="ghost" className="text-muted-foreground" onClick={() => { setPrompt(""); setResults(null); setError(null); }}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Clear
                  </Button>
                )}
                <Button 
                  onClick={handleGenerate} 
                  disabled={!prompt.trim() || loading}
                  className="rounded-full px-6"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <div className="h-4 w-4 rounded-full border-2 border-primary-foreground border-r-transparent animate-spin" />
                      Generating...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Wand2 className="h-4 w-4" />
                      Generate Ideas
                    </span>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Loading State */}
      {loading && (
        <div className="w-full text-center space-y-6 mb-12 animate-in fade-in zoom-in duration-500">
          <p className="text-lg font-medium text-primary animate-pulse">{progressMsg}</p>
          <DesignResultsSkeleton />
        </div>
      )}

      {/* Error State */}
      {error && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-2xl mb-12"
        >
          <Card className="border-destructive/50 bg-destructive/5">
            <CardContent className="flex flex-col items-center text-center p-8 space-y-4">
              <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center text-destructive">
                <RotateCcw className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-semibold text-destructive">Unable to generate suggestions</h3>
              <p className="text-muted-foreground">{error}</p>
              <Button variant="outline" onClick={handleGenerate} className="mt-4">
                Try Again
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Results Section */}
      {!loading && results && (
        <DesignResults data={results} />
      )}
    </div>
  )
}
