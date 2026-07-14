import { MetadataRoute } from 'next'
 
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Interior AI',
    short_name: 'Interior AI',
    description: 'AI-powered interior design assistant.',
    start_url: '/',
    display: 'standalone',
    background_color: '#000000',
    theme_color: '#000000',
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      },
      {
        src: '/apple-icon?',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  }
}
