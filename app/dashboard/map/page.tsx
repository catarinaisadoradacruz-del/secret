"use client"

import { useEffect, useState } from 'react'
import { Map as MapIcon } from 'lucide-react'

export default function MapPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Mapa Interativo</h1>
        <p className="text-muted-foreground mt-1">
          Visualização geográfica de investigações, alvos e ERBs
        </p>
      </div>

      <div className="bg-card border border-border rounded-lg p-12 text-center">
        <MapIcon className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
        <h2 className="text-xl font-semibold mb-2">Google Maps API Necessária</h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          Para ativar o mapa interativo, configure a Google Maps API Key nas variáveis de ambiente.
          O mapa irá exibir marcadores de investigações, alvos, ERBs e registros telefônicos com geolocalização.
        </p>
        <div className="mt-6 bg-blue-500/10 border border-blue-500 text-blue-500 px-4 py-3 rounded-md text-sm max-w-lg mx-auto">
          <p className="font-medium mb-1">Funcionalidades planejadas:</p>
          <ul className="list-disc list-inside text-left text-xs space-y-1">
            <li>Marcadores de alvos e endereços</li>
            <li>Posições de ERBs</li>
            <li>Timeline de deslocamentos</li>
            <li>Heatmap de atividades</li>
            <li>Filtros por investigação</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
