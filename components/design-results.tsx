"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { 
  Palette, 
  Lightbulb, 
  Sofa, 
  LayoutTemplate, 
  MessageSquare,
  Sparkles,
  Layers,
  Flower2,
  Lamp,
  Download
} from "lucide-react"
import { InteriorDesignResponse } from "@/types"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
}

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
}

export function DesignResults({ data }: { data: InteriorDesignResponse }) {
  if (!data) return null;

  const handleDownloadPDF = () => {
    window.print();
  };

  return (
    <motion.div 
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-8 w-full max-w-4xl mx-auto pb-20 print:pb-0 print:text-black print:bg-white"
    >
      {/* Header Actions */}
      <div className="flex justify-end print:hidden">
        <Button onClick={handleDownloadPDF} variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Download PDF
        </Button>
      </div>

      {/* Section 1: Project Summary */}
      <motion.div variants={item}>
        <Card className="bg-primary text-primary-foreground border-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Sparkles className="h-6 w-6" />
              Project Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg leading-relaxed opacity-90">{data.project_summary}</p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Section 2: Design Concept */}
      <motion.div variants={item}>
        <Card className="glass-dark dark:bg-card/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-accent-foreground/70" />
              Design Concept
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground leading-relaxed">{data.design_concept}</p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Section 3: Colour Board */}
      <motion.div variants={item} className="space-y-4">
        <h3 className="text-xl font-semibold flex items-center gap-2 px-1">
          <Palette className="h-5 w-5" />
          Colour Board
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.colour_palette?.map((colour, idx) => (
            <Card key={idx} className="overflow-hidden transition-all hover:scale-[1.02] hover:shadow-md cursor-default">
              <div 
                className="h-32 w-full" 
                style={{ 
                  backgroundColor: colour.hex,
                  WebkitPrintColorAdjust: "exact",
                  printColorAdjust: "exact"
                }} 
              />
              <CardHeader className="p-4">
                <CardTitle className="text-lg">{colour.name}</CardTitle>
                <CardDescription className="font-mono">{colour.hex}</CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <p className="text-sm text-muted-foreground">Recommended for: {colour.usage}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </motion.div>

      {/* Section 4: Mood Board (Text-based) */}
      <motion.div variants={item}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5" />
              Mood Board
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground font-medium mb-1">Style</p>
                <p className="font-semibold">{data.mood_board?.style}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground font-medium mb-1">Mood</p>
                <p className="font-semibold">{data.mood_board?.mood}</p>
              </div>
            </div>
            
            <div>
              <p className="text-sm text-muted-foreground font-medium mb-3">Keywords</p>
              <div className="flex flex-wrap gap-2">
                {data.mood_board?.keywords?.map((kw, i) => (
                  <span key={i} className="px-3 py-1 bg-secondary text-secondary-foreground rounded-full text-sm">
                    {kw}
                  </span>
                ))}
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-border/50">
              <div>
                <p className="text-sm text-muted-foreground font-medium mb-2">Materials</p>
                <ul className="space-y-1">
                  {data.mood_board?.recommended_materials?.map((m, i) => (
                    <li key={i} className="text-sm flex items-center gap-2 before:content-[''] before:w-1 before:h-1 before:bg-primary before:rounded-full">{m}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-sm text-muted-foreground font-medium mb-2">Textures</p>
                <ul className="space-y-1">
                  {data.mood_board?.recommended_textures?.map((t, i) => (
                    <li key={i} className="text-sm flex items-center gap-2 before:content-[''] before:w-1 before:h-1 before:bg-primary before:rounded-full">{t}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-sm text-muted-foreground font-medium mb-2">Finishes</p>
                <ul className="space-y-1">
                  {data.mood_board?.recommended_finishes?.map((f, i) => (
                    <li key={i} className="text-sm flex items-center gap-2 before:content-[''] before:w-1 before:h-1 before:bg-primary before:rounded-full">{f}</li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Sections 5, 6, 7, 8: Materials, Lighting, Furniture, Decor */}
      <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Layers className="h-4 w-4" /> Materials
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {data.materials?.map((m, i) => (
                <li key={i} className="text-muted-foreground text-sm border-b border-border/40 pb-2 last:border-0">{m}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Lamp className="h-4 w-4" /> Lighting
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {data.lighting?.map((l, i) => (
                <li key={i} className="text-muted-foreground text-sm border-b border-border/40 pb-2 last:border-0">{l}</li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Sofa className="h-4 w-4" /> Furniture
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {data.furniture?.map((f, i) => (
                <li key={i} className="text-muted-foreground text-sm border-b border-border/40 pb-2 last:border-0">{f}</li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Flower2 className="h-4 w-4" /> Decor
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {data.decor?.map((d, i) => (
                <li key={i} className="text-muted-foreground text-sm border-b border-border/40 pb-2 last:border-0">{d}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </motion.div>

      {/* Section 9: Space Planning */}
      <motion.div variants={item}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LayoutTemplate className="h-5 w-5" />
              Space Planning
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {data.space_planning?.map((sp, i) => (
                <li key={i} className="flex gap-3 text-muted-foreground items-start">
                  <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-secondary text-secondary-foreground text-xs font-medium">
                    {i + 1}
                  </span>
                  <span className="pt-0.5 leading-relaxed">{sp}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </motion.div>

      {/* Section 10: Designer Notes */}
      <motion.div variants={item}>
        <Card className="bg-secondary/50 border-dashed">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Designer Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground italic leading-relaxed whitespace-pre-wrap">
              "{data.designer_notes}"
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}
