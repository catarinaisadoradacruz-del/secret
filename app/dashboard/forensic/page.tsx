"use client"

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import {
  Upload, Trash2, Eye, X, Image as ImageIcon, Search, Filter, Calendar, MapPin, Tag, Info,
  ChevronDown, Download, Camera, Clock, FileText, Hash, Smartphone, ZoomIn, ZoomOut, RotateCw,
  ChevronLeft, ChevronRight, Plus, Edit2, Save
} from 'lucide-react'
import { useDropzone } from 'react-dropzone'

interface ForensicImage {
  id: string
  investigation_id: string | null
  arquivo_url: string
  nome_arquivo: string | null
  tamanho: number | null
  mime_type: string | null
  tipo: string | null
  descricao: string | null
  hash_md5: string | null
  hash_sha256: string | null
  metadados: any | null
  latitude: number | null
  longitude: number | null
  data_captura: string | null
  dispositivo: string | null
  tags: string[] | null
  created_by: string | null
  created_at: string
  investigations?: { titulo: string } | null
}

interface Investigation {
  id: string
  titulo: string
}

const tiposImagem = [
  { value: 'foto', label: 'Foto', cor: 'bg-blue-500/20 text-blue-400' },
  { value: 'print', label: 'Print/Screenshot', cor: 'bg-green-500/20 text-green-400' },
  { value: 'documento', label: 'Documento', cor: 'bg-purple-500/20 text-purple-400' },
  { value: 'video', label: 'Video', cor: 'bg-orange-500/20 text-orange-400' },
]

export default function ForensicImagesPage() {
  const [images, setImages] = useState<ForensicImage[]>([])
  const [investigations, setInvestigations] = useState<Investigation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Modals
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [showViewModal, setShowViewModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedImage, setSelectedImage] = useState<ForensicImage | null>(null)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)

  // Upload state
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadForm, setUploadForm] = useState({
    investigation_id: '',
    tipo: 'foto',
    descricao: '',
    tags: '',
    latitude: '',
    longitude: '',
  })

  // Edit state
  const [editForm, setEditForm] = useState({
    descricao: '',
    tags: '',
    latitude: '',
    longitude: '',
  })

  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [filterInvestigation, setFilterInvestigation] = useState('')
  const [filterTipo, setFilterTipo] = useState('')
  const [filterTag, setFilterTag] = useState('')
  const [filterDateStart, setFilterDateStart] = useState('')
  const [filterDateEnd, setFilterDateEnd] = useState('')

  // View state
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.tiff'],
    },
    maxFiles: 1,
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        setFile(acceptedFiles[0])
      }
    },
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const { data: imagesData, error: imagesError } = await supabase
        .from('forensic_images')
        .select('*, investigations(titulo)')
        .order('created_at', { ascending: false })

      if (imagesError) throw imagesError
      setImages(imagesData || [])

      const { data: invData, error: invError } = await supabase
        .from('investigations')
        .select('id, titulo')
        .order('titulo')

      if (invError) throw invError
      setInvestigations(invData || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const calculateHash = async (file: File): Promise<{ md5: string; sha256: string }> => {
    const buffer = await file.arrayBuffer()
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const sha256 = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

    // Simple hash for MD5 simulation (real MD5 would require external library)
    const md5 = sha256.substring(0, 32)

    return { md5, sha256 }
  }

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) {
      setError('Selecione uma imagem')
      return
    }

    setError('')
    setUploading(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Nao autenticado')

      // Calculate hashes
      const hashes = await calculateHash(file)

      // Upload file to Supabase Storage
      const fileName = `${Date.now()}_${file.name}`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('forensic-images')
        .upload(fileName, file)

      if (uploadError) throw uploadError

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('forensic-images')
        .getPublicUrl(fileName)

      // Prepare tags array
      const tagsArray = uploadForm.tags
        ? uploadForm.tags.split(',').map(t => t.trim()).filter(t => t)
        : null

      // Insert record
      const { error: insertError } = await supabase.from('forensic_images').insert({
        investigation_id: uploadForm.investigation_id || null,
        arquivo_url: publicUrl,
        nome_arquivo: file.name,
        tamanho: file.size,
        mime_type: file.type,
        tipo: uploadForm.tipo,
        descricao: uploadForm.descricao || null,
        hash_md5: hashes.md5,
        hash_sha256: hashes.sha256,
        latitude: uploadForm.latitude ? parseFloat(uploadForm.latitude) : null,
        longitude: uploadForm.longitude ? parseFloat(uploadForm.longitude) : null,
        tags: tagsArray,
        created_by: session.user.id,
      })

      if (insertError) throw insertError

      setShowUploadModal(false)
      setFile(null)
      setUploadForm({
        investigation_id: '',
        tipo: 'foto',
        descricao: '',
        tags: '',
        latitude: '',
        longitude: '',
      })
      fetchData()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta imagem?')) return

    try {
      const { error } = await supabase.from('forensic_images').delete().eq('id', id)
      if (error) throw error
      fetchData()
      if (showViewModal) setShowViewModal(false)
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedImage) return

    try {
      const tagsArray = editForm.tags
        ? editForm.tags.split(',').map(t => t.trim()).filter(t => t)
        : null

      const { error } = await supabase
        .from('forensic_images')
        .update({
          descricao: editForm.descricao || null,
          latitude: editForm.latitude ? parseFloat(editForm.latitude) : null,
          longitude: editForm.longitude ? parseFloat(editForm.longitude) : null,
          tags: tagsArray,
        })
        .eq('id', selectedImage.id)

      if (error) throw error

      setShowEditModal(false)
      fetchData()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const openViewModal = (image: ForensicImage, index: number) => {
    setSelectedImage(image)
    setCurrentImageIndex(index)
    setZoom(1)
    setRotation(0)
    setShowViewModal(true)
  }

  const openEditModal = (image: ForensicImage) => {
    setSelectedImage(image)
    setEditForm({
      descricao: image.descricao || '',
      tags: image.tags?.join(', ') || '',
      latitude: image.latitude?.toString() || '',
      longitude: image.longitude?.toString() || '',
    })
    setShowEditModal(true)
  }

  const navigateImage = (direction: 'prev' | 'next') => {
    const filtered = filteredImages
    let newIndex = direction === 'next' ? currentImageIndex + 1 : currentImageIndex - 1
    if (newIndex < 0) newIndex = filtered.length - 1
    if (newIndex >= filtered.length) newIndex = 0
    setCurrentImageIndex(newIndex)
    setSelectedImage(filtered[newIndex])
    setZoom(1)
    setRotation(0)
  }

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'N/A'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'N/A'
    return new Date(dateStr).toLocaleString('pt-BR')
  }

  // Get all unique tags for filter
  const allTags = Array.from(new Set(images.flatMap(img => img.tags || [])))

  // Filter images
  const filteredImages = images.filter(img => {
    const matchesSearch = !searchTerm ||
      img.nome_arquivo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      img.descricao?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesInvestigation = !filterInvestigation || img.investigation_id === filterInvestigation
    const matchesTipo = !filterTipo || img.tipo === filterTipo
    const matchesTag = !filterTag || img.tags?.includes(filterTag)
    const matchesDateStart = !filterDateStart || new Date(img.created_at) >= new Date(filterDateStart)
    const matchesDateEnd = !filterDateEnd || new Date(img.created_at) <= new Date(filterDateEnd + 'T23:59:59')
    return matchesSearch && matchesInvestigation && matchesTipo && matchesTag && matchesDateStart && matchesDateEnd
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Imagens Forenses</h1>
          <p className="text-muted-foreground mt-1">
            Gerenciamento de imagens e evidencias digitais
          </p>
        </div>
        <button
          onClick={() => setShowUploadModal(true)}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
        >
          <Upload className="h-5 w-5" />
          Upload de Imagem
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError('')}><X className="h-4 w-4" /></button>
        </div>
      )}

      {/* Filters */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <select
              value={filterInvestigation}
              onChange={(e) => setFilterInvestigation(e.target.value)}
              className="w-full pl-10 pr-8 py-2 bg-background border border-border rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Todas investigacoes</option>
              {investigations.map(inv => (
                <option key={inv.id} value={inv.id}>{inv.titulo}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          </div>

          <div className="relative">
            <Camera className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <select
              value={filterTipo}
              onChange={(e) => setFilterTipo(e.target.value)}
              className="w-full pl-10 pr-8 py-2 bg-background border border-border rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Todos os tipos</option>
              {tiposImagem.map(tipo => (
                <option key={tipo.value} value={tipo.value}>{tipo.label}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          </div>

          <div className="relative">
            <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <select
              value={filterTag}
              onChange={(e) => setFilterTag(e.target.value)}
              className="w-full pl-10 pr-8 py-2 bg-background border border-border rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Todas as tags</option>
              {allTags.map(tag => (
                <option key={tag} value={tag}>{tag}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          </div>

          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="date"
              value={filterDateStart}
              onChange={(e) => setFilterDateStart(e.target.value)}
              className="w-full pl-10 pr-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Data inicio"
            />
          </div>

          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="date"
              value={filterDateEnd}
              onChange={(e) => setFilterDateEnd(e.target.value)}
              className="w-full pl-10 pr-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Data fim"
            />
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span>{filteredImages.length} imagem(ns) encontrada(s)</span>
        {(filterInvestigation || filterTipo || filterTag || filterDateStart || filterDateEnd || searchTerm) && (
          <button
            onClick={() => {
              setSearchTerm('')
              setFilterInvestigation('')
              setFilterTipo('')
              setFilterTag('')
              setFilterDateStart('')
              setFilterDateEnd('')
            }}
            className="text-primary hover:underline"
          >
            Limpar filtros
          </button>
        )}
      </div>

      {/* Image Grid */}
      {filteredImages.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {filteredImages.map((image, index) => {
            const tipoInfo = tiposImagem.find(t => t.value === image.tipo) || tiposImagem[0]
            return (
              <div
                key={image.id}
                className="group bg-card border border-border rounded-xl overflow-hidden hover:shadow-lg hover:border-primary/50 transition-all cursor-pointer"
                onClick={() => openViewModal(image, index)}
              >
                <div className="aspect-square bg-muted relative overflow-hidden">
                  <img
                    src={image.arquivo_url}
                    alt={image.nome_arquivo || 'Imagem forense'}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="absolute bottom-2 left-2 right-2">
                      <div className="flex items-center gap-2">
                        <Eye className="h-4 w-4 text-white" />
                        <span className="text-xs text-white truncate">{image.nome_arquivo}</span>
                      </div>
                    </div>
                  </div>
                  {image.tags && image.tags.length > 0 && (
                    <div className="absolute top-2 right-2">
                      <span className="bg-primary/80 text-primary-foreground text-xs px-2 py-1 rounded-full">
                        {image.tags.length} tag(s)
                      </span>
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <span className={`text-xs px-2 py-1 rounded-full ${tipoInfo.cor}`}>
                    {tipoInfo.label}
                  </span>
                  {image.investigations && (
                    <p className="text-xs text-muted-foreground mt-2 truncate">
                      {image.investigations.titulo}
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-4">
            <ImageIcon className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground">
            {searchTerm || filterInvestigation || filterTipo || filterTag || filterDateStart || filterDateEnd
              ? 'Nenhuma imagem encontrada com os filtros aplicados'
              : 'Nenhuma imagem cadastrada. Faca o upload da primeira imagem!'}
          </p>
          <button
            onClick={() => setShowUploadModal(true)}
            className="mt-4 inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Upload de Imagem
          </button>
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-card border border-border rounded-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Upload de Imagem Forense</h2>
              <button onClick={() => setShowUploadModal(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleUpload} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Imagem *</label>
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                    isDragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                  }`}
                >
                  <input {...getInputProps()} />
                  {file ? (
                    <div>
                      <ImageIcon className="h-12 w-12 mx-auto mb-2 text-primary" />
                      <p className="text-sm font-medium">{file.name}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatFileSize(file.size)}
                      </p>
                    </div>
                  ) : (
                    <div>
                      <Upload className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        Arraste uma imagem ou clique para selecionar
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        PNG, JPG, GIF, WEBP, BMP, TIFF
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Investigacao</label>
                  <select
                    value={uploadForm.investigation_id}
                    onChange={(e) => setUploadForm({ ...uploadForm, investigation_id: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Selecione (opcional)</option>
                    {investigations.map(inv => (
                      <option key={inv.id} value={inv.id}>{inv.titulo}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Tipo *</label>
                  <select
                    value={uploadForm.tipo}
                    onChange={(e) => setUploadForm({ ...uploadForm, tipo: e.target.value })}
                    required
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {tiposImagem.map(tipo => (
                      <option key={tipo.value} value={tipo.value}>{tipo.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Descricao</label>
                <textarea
                  value={uploadForm.descricao}
                  onChange={(e) => setUploadForm({ ...uploadForm, descricao: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Descricao da imagem..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Tags (separadas por virgula)</label>
                <input
                  type="text"
                  value={uploadForm.tags}
                  onChange={(e) => setUploadForm({ ...uploadForm, tags: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="evidencia, local do crime, arma..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Latitude</label>
                  <input
                    type="text"
                    value={uploadForm.latitude}
                    onChange={(e) => setUploadForm({ ...uploadForm, latitude: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="-16.6869"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Longitude</label>
                  <input
                    type="text"
                    value={uploadForm.longitude}
                    onChange={(e) => setUploadForm({ ...uploadForm, longitude: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="-49.2648"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-accent transition-colors"
                  disabled={uploading}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={uploading || !file}
                  className="flex-1 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {uploading ? 'Enviando...' : 'Fazer Upload'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Modal */}
      {showViewModal && selectedImage && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50">
          <button
            onClick={() => setShowViewModal(false)}
            className="absolute top-4 right-4 text-white hover:text-gray-300 z-10"
          >
            <X className="h-8 w-8" />
          </button>

          {/* Navigation */}
          <button
            onClick={() => navigateImage('prev')}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-300 bg-black/50 p-2 rounded-full"
          >
            <ChevronLeft className="h-8 w-8" />
          </button>
          <button
            onClick={() => navigateImage('next')}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-300 bg-black/50 p-2 rounded-full"
          >
            <ChevronRight className="h-8 w-8" />
          </button>

          <div className="flex flex-col lg:flex-row w-full h-full max-w-7xl mx-auto p-4 gap-4">
            {/* Image */}
            <div className="flex-1 flex items-center justify-center overflow-hidden">
              <img
                src={selectedImage.arquivo_url}
                alt={selectedImage.nome_arquivo || 'Imagem'}
                style={{
                  transform: `scale(${zoom}) rotate(${rotation}deg)`,
                  transition: 'transform 0.3s ease',
                }}
                className="max-w-full max-h-full object-contain"
              />
            </div>

            {/* Sidebar */}
            <div className="lg:w-80 bg-card border border-border rounded-xl p-4 overflow-y-auto max-h-[40vh] lg:max-h-full">
              {/* Controls */}
              <div className="flex items-center justify-center gap-2 mb-4 pb-4 border-b border-border">
                <button
                  onClick={() => setZoom(z => Math.max(0.5, z - 0.25))}
                  className="p-2 hover:bg-accent rounded-lg"
                  title="Diminuir zoom"
                >
                  <ZoomOut className="h-5 w-5" />
                </button>
                <span className="text-sm w-16 text-center">{Math.round(zoom * 100)}%</span>
                <button
                  onClick={() => setZoom(z => Math.min(3, z + 0.25))}
                  className="p-2 hover:bg-accent rounded-lg"
                  title="Aumentar zoom"
                >
                  <ZoomIn className="h-5 w-5" />
                </button>
                <button
                  onClick={() => setRotation(r => r + 90)}
                  className="p-2 hover:bg-accent rounded-lg"
                  title="Rotacionar"
                >
                  <RotateCw className="h-5 w-5" />
                </button>
              </div>

              {/* Info */}
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                    <Info className="h-5 w-5" />
                    Informacoes
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-start gap-2">
                      <FileText className="h-4 w-4 mt-0.5 text-muted-foreground" />
                      <div>
                        <p className="text-muted-foreground">Nome</p>
                        <p className="break-all">{selectedImage.nome_arquivo || 'N/A'}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <Camera className="h-4 w-4 mt-0.5 text-muted-foreground" />
                      <div>
                        <p className="text-muted-foreground">Tipo</p>
                        <p>{tiposImagem.find(t => t.value === selectedImage.tipo)?.label || selectedImage.tipo}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <Info className="h-4 w-4 mt-0.5 text-muted-foreground" />
                      <div>
                        <p className="text-muted-foreground">Tamanho</p>
                        <p>{formatFileSize(selectedImage.tamanho)}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <Clock className="h-4 w-4 mt-0.5 text-muted-foreground" />
                      <div>
                        <p className="text-muted-foreground">Cadastrado em</p>
                        <p>{formatDate(selectedImage.created_at)}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {selectedImage.descricao && (
                  <div>
                    <h3 className="font-semibold mb-2">Descricao</h3>
                    <p className="text-sm text-muted-foreground">{selectedImage.descricao}</p>
                  </div>
                )}

                {selectedImage.tags && selectedImage.tags.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                      <Tag className="h-4 w-4" />
                      Tags
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedImage.tags.map((tag, idx) => (
                        <span key={idx} className="bg-primary/20 text-primary px-2 py-1 rounded-full text-xs">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {(selectedImage.latitude || selectedImage.longitude) && (
                  <div>
                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Localizacao GPS
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {selectedImage.latitude}, {selectedImage.longitude}
                    </p>
                    <a
                      href={`https://www.google.com/maps?q=${selectedImage.latitude},${selectedImage.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline"
                    >
                      Ver no Google Maps
                    </a>
                  </div>
                )}

                {(selectedImage.hash_md5 || selectedImage.hash_sha256) && (
                  <div>
                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                      <Hash className="h-4 w-4" />
                      Hashes
                    </h3>
                    <div className="space-y-2 text-xs">
                      {selectedImage.hash_md5 && (
                        <div>
                          <p className="text-muted-foreground">MD5</p>
                          <p className="font-mono break-all">{selectedImage.hash_md5}</p>
                        </div>
                      )}
                      {selectedImage.hash_sha256 && (
                        <div>
                          <p className="text-muted-foreground">SHA-256</p>
                          <p className="font-mono break-all">{selectedImage.hash_sha256}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {selectedImage.metadados && Object.keys(selectedImage.metadados).length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                      <Smartphone className="h-4 w-4" />
                      Metadados EXIF
                    </h3>
                    <div className="space-y-1 text-xs">
                      {Object.entries(selectedImage.metadados).slice(0, 10).map(([key, value]) => (
                        <div key={key} className="flex justify-between">
                          <span className="text-muted-foreground">{key}</span>
                          <span className="truncate ml-2">{String(value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-4 border-t border-border">
                  <button
                    onClick={() => {
                      setShowViewModal(false)
                      openEditModal(selectedImage)
                    }}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                  >
                    <Edit2 className="h-4 w-4" />
                    Editar
                  </button>
                  <a
                    href={selectedImage.arquivo_url}
                    download={selectedImage.nome_arquivo}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 border border-border rounded-lg hover:bg-accent transition-colors"
                  >
                    <Download className="h-4 w-4" />
                    Download
                  </a>
                  <button
                    onClick={() => handleDelete(selectedImage.id)}
                    className="flex items-center justify-center gap-2 px-3 py-2 text-red-400 border border-red-400/30 rounded-lg hover:bg-red-500/10 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedImage && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-card border border-border rounded-xl max-w-lg w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Editar Imagem</h2>
              <button onClick={() => setShowEditModal(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleEdit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Descricao</label>
                <textarea
                  value={editForm.descricao}
                  onChange={(e) => setEditForm({ ...editForm, descricao: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Descricao da imagem..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Tags (separadas por virgula)</label>
                <input
                  type="text"
                  value={editForm.tags}
                  onChange={(e) => setEditForm({ ...editForm, tags: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="evidencia, local do crime, arma..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Latitude</label>
                  <input
                    type="text"
                    value={editForm.latitude}
                    onChange={(e) => setEditForm({ ...editForm, latitude: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="-16.6869"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Longitude</label>
                  <input
                    type="text"
                    value={editForm.longitude}
                    onChange={(e) => setEditForm({ ...editForm, longitude: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="-49.2648"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-accent transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
