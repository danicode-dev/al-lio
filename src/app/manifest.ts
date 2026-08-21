import { MetadataRoute } from 'next'
 
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'AL-LIO',
    short_name: 'AL-LIO',
    description: 'Panel privado para tareas, calendario y oportunidades.',
    start_url: '/dashboard',
    display: 'standalone',
    background_color: '#f8f6f1',
    theme_color: '#ffffff',
    orientation: 'portrait',
    icons: [
      {
        src: '/assets/al_lio_favicon_dark_circle_512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  }
}
