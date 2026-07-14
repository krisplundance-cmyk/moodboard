export interface ColourPalette {
  name: string;
  hex: string;
  usage: string;
}

export interface MoodBoard {
  style: string;
  mood: string;
  keywords: string[];
  recommended_materials: string[];
  recommended_textures: string[];
  recommended_finishes: string[];
}

export interface InteriorDesignResponse {
  project_summary: string;
  design_concept: string;
  colour_palette: ColourPalette[];
  mood_board: MoodBoard;
  materials: string[];
  lighting: string[];
  furniture: string[];
  decor: string[];
  space_planning: string[];
  designer_notes: string;
}

export interface VisualContext {
  style: string;
  room: string;
  colour_palette: string[];
  materials: string[];
  lighting: string;
  mood: string;
  furniture?: string[];
  textures?: string[];
  architectural_features?: string[];
}
