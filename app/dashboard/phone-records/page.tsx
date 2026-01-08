"use client"

import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Phone, Upload, Trash2, X, Filter, Download, FileSpreadsheet, MapPin, Clock, PhoneCall, MessageSquare, BarChart3, Search, ChevronDown, ChevronUp, Radio } from 'lucide-react'
import * as XLSX from 'xlsx'

interface PhoneRecord {
  id: string
  investigation_id: string
  alvo_id: string | null
  numero_origem: string
  numero_destino: string
  data_hora: string
  duracao: number | null
  tipo: string
  erb_latitude: number | null
  erb_longitude: number | null
  erb_endereco: string | null
  erb_id: string | null
  imei: string | null
  created_at: string
  alvos?: { nome: string }
  investigations?: { titulo: string }
}

interface Investigation { id: string; titulo: string }
interface Alvo { id: string; nome: string }
interface Statistics { totalRecords: number; totalCalls: number; totalSMS: number; totalDuration: number; topNumbers: { numero: string; count: number }[]; recordsByDate: { date: string; count: number }[] }

export default function PhoneRecordsPage() {
  const [records, setRecords] = useState<PhoneRecord[]>([])
  const [investigations, setInvestigations] = useState<Investigation[]>([])
  const [alvos, setAlvos] = useState<Alvo[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [showManualModal, setShowManualModal] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [showStats, setShowStats] = useState(true)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [filters, setFilters] = useState({ dataInicio: '', dataFim: '', numero: '', tipo: '', investigationId: '' })
  const [uploadData, setUploadData] = useState({ investigation_id: '', alvo_id: '' })
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [previewData, setPreviewData] = useState<any[]>([])
  const [formData, setFormData] = useState({ investigation_id: '', alvo_id: '', numero_origem: '', numero_destino: '', data_hora: '', duracao: '', tipo: 'Chamada', erb_latitude: '', erb_longitude: '', erb_endereco: '', erb_id: '', imei: '' })
  const [sortField, setSortField] = useState<string>('data_hora')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    try {
      const { data: recordsData, error: recordsError } = await supabase.from('phone_records').select('*, alvos (nome), investigations (titulo)').order('data_hora', { ascending: false })
      if (recordsError) throw recordsError
      setRecords(recordsData || [])
      const { data: investigationsData } = await supabase.from('investigations').select('id, titulo').order('titulo')
      setInvestigations(investigationsData || [])
      const { data: alvosData } = await supabase.from('alvos').select('id, nome').order('nome')
      setAlvos(alvosData || [])
    } catch (error: any) { setError(error.message) } finally { setLoading(false) }
  }

  const filteredRecords = useMemo(() => {
    let result = [...records]
    if (filters.dataInicio) result = result.filter(r => new Date(r.data_hora) >= new Date(filters.dataInicio))
    if (filters.dataFim) result = result.filter(r => new Date(r.data_hora) <= new Date(filters.dataFim + 'T23:59:59'))
    if (filters.numero) { const s = filters.numero.toLowerCase(); result = result.filter(r => r.numero_origem.toLowerCase().includes(s) || r.numero_destino.toLowerCase().includes(s)) }
    if (filters.tipo) result = result.filter(r => r.tipo === filters.tipo)
    if (filters.investigationId) result = result.filter(r => r.investigation_id === filters.investigationId)
    result.sort((a, b) => { let aV: any = a[sortField as keyof PhoneRecord]; let bV: any = b[sortField as keyof PhoneRecord]; if (sortField === 'data_hora') { aV = new Date(aV).getTime(); bV = new Date(bV).getTime() } return sortDirection === 'asc' ? (aV > bV ? 1 : -1) : (aV < bV ? 1 : -1) })
    return result
  }, [records, filters, sortField, sortDirection])

  const statistics: Statistics = useMemo(() => {
    const stats: Statistics = { totalRecords: filteredRecords.length, totalCalls: filteredRecords.filter(r => r.tipo === 'Chamada').length, totalSMS: filteredRecords.filter(r => r.tipo === 'SMS').length, totalDuration: filteredRecords.reduce((acc, r) => acc + (r.duracao || 0), 0), topNumbers: [], recordsByDate: [] }
    const nc: Record<string, number> = {}
    filteredRecords.forEach(r => { nc[r.numero_origem] = (nc[r.numero_origem] || 0) + 1; nc[r.numero_destino] = (nc[r.numero_destino] || 0) + 1 })
    stats.topNumbers = Object.entries(nc).map(([numero, count]) => ({ numero, count })).sort((a, b) => b.count - a.count).slice(0, 5)
    return stats
  }, [filteredRecords])

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return; setUploadFile(file); setError('')
    try { const data = await readFile(file); setPreviewData(data.slice(0, 10)) } catch (err: any) { setError('Erro ao ler arquivo: ' + err.message) }
  }

  const readFile = (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const data = e.target?.result; let parsed: any[] = []
          if (file.name.endsWith('.csv')) { const text = data as string; const lines = text.split('\n'); const headers = lines[0].split(';').map(h => h.trim().toLowerCase()); parsed = lines.slice(1).filter(l => l.trim()).map(line => { const values = line.split(';'); const obj: any = {}; headers.forEach((h, i) => { obj[h] = values[i]?.trim() || '' }); return obj }) }
          else { const wb = XLSX.read(data, { type: 'binary' }); const ws = wb.Sheets[wb.SheetNames[0]]; parsed = XLSX.utils.sheet_to_json(ws) }
          resolve(parsed)
        } catch (err) { reject(err) }
      }
      reader.onerror = () => reject(new Error('Erro ao ler arquivo'))
      if (file.name.endsWith('.csv')) reader.readAsText(file); else reader.readAsBinaryString(file)
    })
  }

  const handleUpload = async () => {
    if (!uploadFile || !uploadData.investigation_id) { setError('Selecione um arquivo e uma investigacao'); return }
    setUploading(true); setError('')
    try {
      const { data: { session } } = await supabase.auth.getSession(); if (!session) throw new Error('Nao autenticado')
      const data = await readFile(uploadFile)
      const recs = data.map(row => {
        const origem = row.numero_origem || row.origem || row.caller || row['numero origem'] || row.a || ''
        const destino = row.numero_destino || row.destino || row.called || row['numero destino'] || row.b || ''
        const dataHora = row.data_hora || row.datetime || row.data || row.date || ''
        const duracao = row.duracao || row.duration || row.segundos || 0
        const tipo = row.tipo || row.type || 'Chamada'
        const lat = row.erb_latitude || row.latitude || row.lat || null
        const lng = row.erb_longitude || row.longitude || row.lng || row.lon || null
        return { investigation_id: uploadData.investigation_id, alvo_id: uploadData.alvo_id || null, numero_origem: String(origem).trim(), numero_destino: String(destino).trim(), data_hora: parseDate(dataHora), duracao: parseInt(duracao) || null, tipo: tipo === 'SMS' || tipo === 'sms' ? 'SMS' : tipo === 'WhatsApp' || tipo === 'whatsapp' ? 'WhatsApp' : 'Chamada', erb_latitude: lat ? parseFloat(lat) : null, erb_longitude: lng ? parseFloat(lng) : null, erb_endereco: row.erb_endereco || row.endereco || null, erb_id: row.erb_id || row.erb || row.cell_id || null, imei: row.imei || null, owner_id: session.user.id }
      }).filter(r => r.numero_origem && r.numero_destino)
      if (recs.length === 0) throw new Error('Nenhum registro valido encontrado')
      for (let i = 0; i < recs.length; i += 100) { const batch = recs.slice(i, i + 100); const { error } = await supabase.from('phone_records').insert(batch); if (error) throw error }
      setSuccessMessage(`${recs.length} registros importados!`); setShowUploadModal(false); setUploadFile(null); setPreviewData([]); setUploadData({ investigation_id: '', alvo_id: '' }); fetchData(); setTimeout(() => setSuccessMessage(''), 5000)
    } catch (error: any) { setError(error.message) } finally { setUploading(false) }
  }

  const parseDate = (d: string): string => { if (!d) return new Date().toISOString(); const m = d.match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2}):?(\d{2})?$/); if (m) { const [, day, month, year, hour, min, sec] = m; return new Date(+year, +month - 1, +day, +hour, +min, +(sec || 0)).toISOString() } const p = new Date(d); return isNaN(p.getTime()) ? new Date().toISOString() : p.toISOString() }

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError('')
    try {
      const { data: { session } } = await supabase.auth.getSession(); if (!session) throw new Error('Nao autenticado')
      const { error } = await supabase.from('phone_records').insert({ investigation_id: formData.investigation_id, alvo_id: formData.alvo_id || null, numero_origem: formData.numero_origem, numero_destino: formData.numero_destino, data_hora: formData.data_hora, duracao: formData.duracao ? parseInt(formData.duracao) : null, tipo: formData.tipo, erb_latitude: formData.erb_latitude ? parseFloat(formData.erb_latitude) : null, erb_longitude: formData.erb_longitude ? parseFloat(formData.erb_longitude) : null, erb_endereco: formData.erb_endereco || null, erb_id: formData.erb_id || null, imei: formData.imei || null, owner_id: session.user.id })
      if (error) throw error
      setShowManualModal(false); setFormData({ investigation_id: '', alvo_id: '', numero_origem: '', numero_destino: '', data_hora: '', duracao: '', tipo: 'Chamada', erb_latitude: '', erb_longitude: '', erb_endereco: '', erb_id: '', imei: '' }); fetchData(); setSuccessMessage('Registro adicionado!'); setTimeout(() => setSuccessMessage(''), 3000)
    } catch (error: any) { setError(error.message) }
  }

  const handleDelete = async (id: string) => { if (!confirm('Excluir este registro?')) return; try { const { error } = await supabase.from('phone_records').delete().eq('id', id); if (error) throw error; fetchData() } catch (error: any) { setError(error.message) } }
  const handleSort = (f: string) => { if (sortField === f) setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc'); else { setSortField(f); setSortDirection('desc') } }
  const formatDuration = (s: number | null) => { if (!s) return '-'; const m = Math.floor(s / 60); return `${m}:${(s % 60).toString().padStart(2, '0')}` }
  const formatTotalDuration = (s: number) => `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`
  const clearFilters = () => setFilters({ dataInicio: '', dataFim: '', numero: '', tipo: '', investigationId: '' })
  const exportToExcel = () => { const d = filteredRecords.map(r => ({ 'Origem': r.numero_origem, 'Destino': r.numero_destino, 'Data/Hora': new Date(r.data_hora).toLocaleString('pt-BR'), 'Duracao': r.duracao || '', 'Tipo': r.tipo, 'ERB ID': r.erb_id || '', 'Lat': r.erb_latitude || '', 'Lng': r.erb_longitude || '', 'Endereco': r.erb_endereco || '', 'IMEI': r.imei || '', 'Alvo': r.alvos?.nome || '' })); const ws = XLSX.utils.json_to_sheet(d); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Registros'); XLSX.writeFile(wb, `registros_${new Date().toISOString().split('T')[0]}.xlsx`) }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div><span className="ml-3">Carregando...</span></div>

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div><h1 className="text-3xl font-bold flex items-center gap-3"><Phone className="h-8 w-8 text-primary" />Registros Telefonicos (ERB)</h1><p className="text-muted-foreground mt-1">Gestao de registros de chamadas, SMS e dados de ERB</p></div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setShowUploadModal(true)} className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90"><Upload className="h-5 w-5" />Importar CSV/Excel</button>
          <button onClick={() => setShowManualModal(true)} className="flex items-center gap-2 bg-secondary text-secondary-foreground px-4 py-2 rounded-lg hover:bg-secondary/90"><Phone className="h-5 w-5" />Novo Registro</button>
        </div>
      </div>

      {error && <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded-md flex items-center justify-between"><span>{error}</span><button onClick={() => setError('')}><X className="h-4 w-4" /></button></div>}
      {successMessage && <div className="bg-green-500/10 border border-green-500 text-green-500 px-4 py-3 rounded-md">{successMessage}</div>}

      <div className="bg-card border border-border rounded-lg p-4">
        <button onClick={() => setShowStats(!showStats)} className="flex items-center justify-between w-full"><h2 className="text-lg font-semibold flex items-center gap-2"><BarChart3 className="h-5 w-5 text-primary" />Estatisticas</h2>{showStats ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}</button>
        {showStats && <div className="mt-4 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <div className="bg-background rounded-lg p-4 border border-border"><div className="flex items-center gap-2 text-muted-foreground mb-1"><FileSpreadsheet className="h-4 w-4" /><span className="text-xs">Total</span></div><p className="text-2xl font-bold">{statistics.totalRecords}</p></div>
          <div className="bg-background rounded-lg p-4 border border-border"><div className="flex items-center gap-2 text-blue-500 mb-1"><PhoneCall className="h-4 w-4" /><span className="text-xs">Chamadas</span></div><p className="text-2xl font-bold">{statistics.totalCalls}</p></div>
          <div className="bg-background rounded-lg p-4 border border-border"><div className="flex items-center gap-2 text-green-500 mb-1"><MessageSquare className="h-4 w-4" /><span className="text-xs">SMS</span></div><p className="text-2xl font-bold">{statistics.totalSMS}</p></div>
          <div className="bg-background rounded-lg p-4 border border-border"><div className="flex items-center gap-2 text-orange-500 mb-1"><Clock className="h-4 w-4" /><span className="text-xs">Duracao Total</span></div><p className="text-2xl font-bold">{formatTotalDuration(statistics.totalDuration)}</p></div>
          <div className="bg-background rounded-lg p-4 border border-border col-span-2"><div className="flex items-center gap-2 text-purple-500 mb-2"><Phone className="h-4 w-4" /><span className="text-xs">Numeros Frequentes</span></div><div className="space-y-1">{statistics.topNumbers.slice(0, 3).map((item, i) => <div key={i} className="flex justify-between text-sm"><span className="font-mono truncate">{item.numero}</span><span className="text-muted-foreground">{item.count}x</span></div>)}</div></div>
        </div>}
      </div>

      <div className="bg-card border border-border rounded-lg p-4">
        <button onClick={() => setShowFilters(!showFilters)} className="flex items-center justify-between w-full"><h2 className="text-lg font-semibold flex items-center gap-2"><Filter className="h-5 w-5 text-primary" />Filtros{(filters.dataInicio || filters.dataFim || filters.numero || filters.tipo || filters.investigationId) && <span className="bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full ml-2">Ativos</span>}</h2>{showFilters ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}</button>
        {showFilters && <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div><label className="block text-sm font-medium mb-1">Data Inicio</label><input type="date" value={filters.dataInicio} onChange={e => setFilters({ ...filters, dataInicio: e.target.value })} className="w-full px-3 py-2 bg-background border border-border rounded-md" /></div>
          <div><label className="block text-sm font-medium mb-1">Data Fim</label><input type="date" value={filters.dataFim} onChange={e => setFilters({ ...filters, dataFim: e.target.value })} className="w-full px-3 py-2 bg-background border border-border rounded-md" /></div>
          <div><label className="block text-sm font-medium mb-1">Numero</label><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><input type="text" value={filters.numero} onChange={e => setFilters({ ...filters, numero: e.target.value })} placeholder="Buscar..." className="w-full pl-9 pr-3 py-2 bg-background border border-border rounded-md" /></div></div>
          <div><label className="block text-sm font-medium mb-1">Tipo</label><select value={filters.tipo} onChange={e => setFilters({ ...filters, tipo: e.target.value })} className="w-full px-3 py-2 bg-background border border-border rounded-md"><option value="">Todos</option><option value="Chamada">Chamada</option><option value="SMS">SMS</option><option value="WhatsApp">WhatsApp</option></select></div>
          <div><label className="block text-sm font-medium mb-1">Investigacao</label><select value={filters.investigationId} onChange={e => setFilters({ ...filters, investigationId: e.target.value })} className="w-full px-3 py-2 bg-background border border-border rounded-md"><option value="">Todas</option>{investigations.map(inv => <option key={inv.id} value={inv.id}>{inv.titulo}</option>)}</select></div>
          <div className="lg:col-span-5 flex gap-2"><button onClick={clearFilters} className="px-4 py-2 border border-border rounded-md hover:bg-accent">Limpar</button><button onClick={exportToExcel} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"><Download className="h-4 w-4" />Exportar Excel</button></div>
        </div>}
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden"><div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted border-b border-border"><tr>
            <th className="px-4 py-3 text-left text-sm font-medium cursor-pointer hover:bg-accent/50" onClick={() => handleSort('numero_origem')}><div className="flex items-center gap-1">Origem{sortField === 'numero_origem' && (sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />)}</div></th>
            <th className="px-4 py-3 text-left text-sm font-medium cursor-pointer hover:bg-accent/50" onClick={() => handleSort('numero_destino')}><div className="flex items-center gap-1">Destino{sortField === 'numero_destino' && (sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />)}</div></th>
            <th className="px-4 py-3 text-left text-sm font-medium cursor-pointer hover:bg-accent/50" onClick={() => handleSort('data_hora')}><div className="flex items-center gap-1">Data/Hora{sortField === 'data_hora' && (sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />)}</div></th>
            <th className="px-4 py-3 text-left text-sm font-medium">Duracao</th>
            <th className="px-4 py-3 text-left text-sm font-medium">Tipo</th>
            <th className="px-4 py-3 text-left text-sm font-medium"><div className="flex items-center gap-1"><Radio className="h-4 w-4" />ERB</div></th>
            <th className="px-4 py-3 text-left text-sm font-medium">Alvo</th>
            <th className="px-4 py-3 text-right text-sm font-medium">Acoes</th>
          </tr></thead>
          <tbody className="divide-y divide-border">{filteredRecords.map(record => (
            <tr key={record.id} className="hover:bg-accent/50">
              <td className="px-4 py-3 text-sm font-mono">{record.numero_origem}</td>
              <td className="px-4 py-3 text-sm font-mono">{record.numero_destino}</td>
              <td className="px-4 py-3 text-sm">{new Date(record.data_hora).toLocaleString('pt-BR')}</td>
              <td className="px-4 py-3 text-sm">{formatDuration(record.duracao)}</td>
              <td className="px-4 py-3"><span className={`px-3 py-1 rounded-full text-xs font-medium ${record.tipo === 'Chamada' ? 'bg-blue-500/10 text-blue-500' : record.tipo === 'SMS' ? 'bg-green-500/10 text-green-500' : 'bg-purple-500/10 text-purple-500'}`}>{record.tipo}</span></td>
              <td className="px-4 py-3 text-sm">{record.erb_latitude && record.erb_longitude ? <div className="flex items-center gap-1"><MapPin className="h-4 w-4 text-red-500" /><span className="text-xs">{record.erb_id || `${record.erb_latitude.toFixed(4)}, ${record.erb_longitude.toFixed(4)}`}</span></div> : '-'}</td>
              <td className="px-4 py-3 text-sm">{record.alvos?.nome || '-'}</td>
              <td className="px-4 py-3 text-right"><button onClick={() => handleDelete(record.id)} className="text-destructive hover:text-destructive/80 p-1"><Trash2 className="h-4 w-4" /></button></td>
            </tr>
          ))}</tbody>
        </table>
      </div></div>

      {filteredRecords.length === 0 && <div className="text-center py-12"><Phone className="h-12 w-12 mx-auto mb-4 text-muted-foreground" /><p className="text-muted-foreground">{records.length === 0 ? 'Nenhum registro. Importe um arquivo ou adicione manualmente!' : 'Nenhum registro com os filtros aplicados.'}</p></div>}

      {showUploadModal && <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto"><div className="bg-card border border-border rounded-lg max-w-4xl w-full p-6 my-8">
        <div className="flex items-center justify-between mb-6"><h2 className="text-2xl font-bold flex items-center gap-2"><Upload className="h-6 w-6 text-primary" />Importar Registros</h2><button onClick={() => { setShowUploadModal(false); setPreviewData([]); setUploadFile(null) }}><X className="h-6 w-6" /></button></div>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium mb-2">Investigacao *</label><select value={uploadData.investigation_id} onChange={e => setUploadData({ ...uploadData, investigation_id: e.target.value })} className="w-full px-3 py-2 bg-background border border-border rounded-md"><option value="">Selecione</option>{investigations.map(inv => <option key={inv.id} value={inv.id}>{inv.titulo}</option>)}</select></div>
            <div><label className="block text-sm font-medium mb-2">Alvo (opcional)</label><select value={uploadData.alvo_id} onChange={e => setUploadData({ ...uploadData, alvo_id: e.target.value })} className="w-full px-3 py-2 bg-background border border-border rounded-md"><option value="">Nenhum</option>{alvos.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}</select></div>
          </div>
          <div><label className="block text-sm font-medium mb-2">Arquivo CSV ou Excel *</label><div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50"><input type="file" accept=".csv,.xlsx,.xls" onChange={handleFileChange} className="hidden" id="file-upload" /><label htmlFor="file-upload" className="cursor-pointer">{uploadFile ? <div><FileSpreadsheet className="h-12 w-12 mx-auto mb-2 text-primary" /><p className="text-sm font-medium">{uploadFile.name}</p><p className="text-xs text-muted-foreground">{(uploadFile.size / 1024).toFixed(2)} KB</p></div> : <div><Upload className="h-12 w-12 mx-auto mb-2 text-muted-foreground" /><p className="text-sm text-muted-foreground">Clique para selecionar</p><p className="text-xs text-muted-foreground">CSV, XLSX, XLS</p></div>}</label></div></div>
          {previewData.length > 0 && <div><h3 className="text-sm font-medium mb-2">Preview:</h3><div className="bg-background border border-border rounded-md overflow-x-auto max-h-48"><table className="w-full text-xs"><thead className="bg-muted"><tr>{Object.keys(previewData[0]).map(k => <th key={k} className="px-2 py-1 text-left">{k}</th>)}</tr></thead><tbody>{previewData.map((row, i) => <tr key={i} className="border-t border-border">{Object.values(row).map((v: any, j) => <td key={j} className="px-2 py-1 truncate max-w-[150px]">{String(v)}</td>)}</tr>)}</tbody></table></div></div>}
          <div className="flex gap-3 pt-4"><button onClick={() => { setShowUploadModal(false); setPreviewData([]); setUploadFile(null) }} className="flex-1 px-4 py-2 border border-border rounded-md hover:bg-accent" disabled={uploading}>Cancelar</button><button onClick={handleUpload} disabled={uploading || !uploadFile || !uploadData.investigation_id} className="flex-1 bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 disabled:opacity-50">{uploading ? 'Importando...' : 'Importar'}</button></div>
        </div>
      </div></div>}

      {showManualModal && <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto"><div className="bg-card border border-border rounded-lg max-w-3xl w-full p-6 my-8">
        <div className="flex items-center justify-between mb-6"><h2 className="text-2xl font-bold">Novo Registro</h2><button onClick={() => setShowManualModal(false)}><X className="h-6 w-6" /></button></div>
        <form onSubmit={handleManualSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium mb-2">Investigacao *</label><select value={formData.investigation_id} onChange={e => setFormData({ ...formData, investigation_id: e.target.value })} required className="w-full px-3 py-2 bg-background border border-border rounded-md"><option value="">Selecione</option>{investigations.map(inv => <option key={inv.id} value={inv.id}>{inv.titulo}</option>)}</select></div>
            <div><label className="block text-sm font-medium mb-2">Alvo</label><select value={formData.alvo_id} onChange={e => setFormData({ ...formData, alvo_id: e.target.value })} className="w-full px-3 py-2 bg-background border border-border rounded-md"><option value="">Nenhum</option>{alvos.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}</select></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium mb-2">Numero Origem *</label><input type="text" value={formData.numero_origem} onChange={e => setFormData({ ...formData, numero_origem: e.target.value })} required className="w-full px-3 py-2 bg-background border border-border rounded-md" placeholder="(62) 99999-9999" /></div>
            <div><label className="block text-sm font-medium mb-2">Numero Destino *</label><input type="text" value={formData.numero_destino} onChange={e => setFormData({ ...formData, numero_destino: e.target.value })} required className="w-full px-3 py-2 bg-background border border-border rounded-md" placeholder="(62) 98888-8888" /></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div><label className="block text-sm font-medium mb-2">Data/Hora *</label><input type="datetime-local" value={formData.data_hora} onChange={e => setFormData({ ...formData, data_hora: e.target.value })} required className="w-full px-3 py-2 bg-background border border-border rounded-md" /></div>
            <div><label className="block text-sm font-medium mb-2">Duracao (seg)</label><input type="number" value={formData.duracao} onChange={e => setFormData({ ...formData, duracao: e.target.value })} className="w-full px-3 py-2 bg-background border border-border rounded-md" placeholder="120" /></div>
            <div><label className="block text-sm font-medium mb-2">Tipo *</label><select value={formData.tipo} onChange={e => setFormData({ ...formData, tipo: e.target.value })} className="w-full px-3 py-2 bg-background border border-border rounded-md"><option value="Chamada">Chamada</option><option value="SMS">SMS</option><option value="WhatsApp">WhatsApp</option></select></div>
          </div>
          <div className="border-t border-border pt-4"><h3 className="text-sm font-medium mb-3 flex items-center gap-2"><Radio className="h-4 w-4 text-primary" />Dados ERB</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div><label className="block text-sm font-medium mb-2">ERB ID</label><input type="text" value={formData.erb_id} onChange={e => setFormData({ ...formData, erb_id: e.target.value })} className="w-full px-3 py-2 bg-background border border-border rounded-md" placeholder="LAC-CID" /></div>
              <div><label className="block text-sm font-medium mb-2">Latitude</label><input type="text" value={formData.erb_latitude} onChange={e => setFormData({ ...formData, erb_latitude: e.target.value })} className="w-full px-3 py-2 bg-background border border-border rounded-md" placeholder="-16.6869" /></div>
              <div><label className="block text-sm font-medium mb-2">Longitude</label><input type="text" value={formData.erb_longitude} onChange={e => setFormData({ ...formData, erb_longitude: e.target.value })} className="w-full px-3 py-2 bg-background border border-border rounded-md" placeholder="-49.2648" /></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div><label className="block text-sm font-medium mb-2">Endereco ERB</label><input type="text" value={formData.erb_endereco} onChange={e => setFormData({ ...formData, erb_endereco: e.target.value })} className="w-full px-3 py-2 bg-background border border-border rounded-md" placeholder="Av. Goias, 1234" /></div>
              <div><label className="block text-sm font-medium mb-2">IMEI</label><input type="text" value={formData.imei} onChange={e => setFormData({ ...formData, imei: e.target.value })} className="w-full px-3 py-2 bg-background border border-border rounded-md" placeholder="123456789012345" /></div>
            </div>
          </div>
          <div className="flex gap-3 pt-4"><button type="button" onClick={() => setShowManualModal(false)} className="flex-1 px-4 py-2 border border-border rounded-md hover:bg-accent">Cancelar</button><button type="submit" className="flex-1 bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90">Salvar</button></div>
        </form>
      </div></div>}
    </div>
  )
}
