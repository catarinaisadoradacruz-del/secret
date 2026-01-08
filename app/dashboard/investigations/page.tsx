"use client";

import { useState, useEffect } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import {
  Search,
  Plus,
  Filter,
  FileText,
  Calendar,
  MapPin,
  Users,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  X,
  AlertCircle,
  CheckCircle,
  Clock,
  Archive,
  FolderOpen,
  RefreshCw,
  ChevronDown,
} from "lucide-react";

interface Investigation {
  id: string;
  titulo: string;
  descricao: string;
  numero_procedimento: string;
  tipo: "inquerito" | "flagrante" | "rai";
  status: "em_andamento" | "concluido" | "arquivado";
  data_fato: string;
  local_fato: string;
  created_at: string;
  updated_at: string;
  alvos_count?: number;
}

interface InvestigationForm {
  titulo: string;
  descricao: string;
  numero_procedimento: string;
  tipo: "inquerito" | "flagrante" | "rai";
  status: "em_andamento" | "concluido" | "arquivado";
  data_fato: string;
  local_fato: string;
}

const initialFormState: InvestigationForm = {
  titulo: "",
  descricao: "",
  numero_procedimento: "",
  tipo: "inquerito",
  status: "em_andamento",
  data_fato: "",
  local_fato: "",
};

const tipoLabels: Record<string, string> = {
  inquerito: "Inquerito Policial",
  flagrante: "Auto de Prisao em Flagrante",
  rai: "RAI",
};

const statusLabels: Record<string, string> = {
  em_andamento: "Em Andamento",
  concluido: "Concluido",
  arquivado: "Arquivado",
};

const statusColors: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
  em_andamento: {
    bg: "bg-yellow-500/20",
    text: "text-yellow-400",
    icon: <Clock className="w-4 h-4" />,
  },
  concluido: {
    bg: "bg-green-500/20",
    text: "text-green-400",
    icon: <CheckCircle className="w-4 h-4" />,
  },
  arquivado: {
    bg: "bg-gray-500/20",
    text: "text-gray-400",
    icon: <Archive className="w-4 h-4" />,
  },
};

const tipoColors: Record<string, { bg: string; text: string }> = {
  inquerito: { bg: "bg-blue-500/20", text: "text-blue-400" },
  flagrante: { bg: "bg-red-500/20", text: "text-red-400" },
  rai: { bg: "bg-purple-500/20", text: "text-purple-400" },
};

export default function InvestigationsPage() {
  const supabase = createClientComponentClient();

  const [investigations, setInvestigations] = useState<Investigation[]>([]);
  const [filteredInvestigations, setFilteredInvestigations] = useState<Investigation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tableNotFound, setTableNotFound] = useState(false);

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [viewingInvestigation, setViewingInvestigation] = useState<Investigation | null>(null);
  const [formData, setFormData] = useState<InvestigationForm>(initialFormState);
  const [saving, setSaving] = useState(false);

  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("todos");
  const [filterTipo, setFilterTipo] = useState<string>("todos");
  const [showFilters, setShowFilters] = useState(false);

  // Dropdown menu state
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  useEffect(() => {
    fetchInvestigations();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [investigations, searchTerm, filterStatus, filterTipo]);

  useEffect(() => {
    const handleClickOutside = () => setOpenMenuId(null);
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  const fetchInvestigations = async () => {
    setLoading(true);
    setError(null);
    setTableNotFound(false);

    try {
      // Fetch investigations
      const { data: investigationsData, error: investigationsError } = await supabase
        .from("investigations")
        .select("*")
        .order("created_at", { ascending: false });

      if (investigationsError) {
        if (investigationsError.code === "42P01" || investigationsError.message.includes("does not exist")) {
          setTableNotFound(true);
          return;
        }
        throw investigationsError;
      }

      // Fetch alvos count for each investigation
      const investigationsWithCount = await Promise.all(
        (investigationsData || []).map(async (inv) => {
          const { count } = await supabase
            .from("alvos")
            .select("*", { count: "exact", head: true })
            .eq("investigation_id", inv.id);

          return {
            ...inv,
            alvos_count: count || 0,
          };
        })
      );

      setInvestigations(investigationsWithCount);
    } catch (err: any) {
      console.error("Erro ao carregar investigacoes:", err);
      setError(err.message || "Erro ao carregar investigacoes");
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...investigations];

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (inv) =>
          inv.titulo.toLowerCase().includes(term) ||
          inv.numero_procedimento.toLowerCase().includes(term)
      );
    }

    // Status filter
    if (filterStatus !== "todos") {
      filtered = filtered.filter((inv) => inv.status === filterStatus);
    }

    // Tipo filter
    if (filterTipo !== "todos") {
      filtered = filtered.filter((inv) => inv.tipo === filterTipo);
    }

    setFilteredInvestigations(filtered);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (editingId) {
        // Update
        const { error } = await supabase
          .from("investigations")
          .update({
            ...formData,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingId);

        if (error) throw error;
      } else {
        // Create
        const { error } = await supabase.from("investigations").insert([formData]);

        if (error) throw error;
      }

      setShowModal(false);
      setFormData(initialFormState);
      setEditingId(null);
      fetchInvestigations();
    } catch (err: any) {
      console.error("Erro ao salvar:", err);
      setError(err.message || "Erro ao salvar investigacao");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (investigation: Investigation) => {
    setFormData({
      titulo: investigation.titulo,
      descricao: investigation.descricao || "",
      numero_procedimento: investigation.numero_procedimento,
      tipo: investigation.tipo,
      status: investigation.status,
      data_fato: investigation.data_fato || "",
      local_fato: investigation.local_fato || "",
    });
    setEditingId(investigation.id);
    setShowModal(true);
    setOpenMenuId(null);
  };

  const handleDelete = async () => {
    if (!deletingId) return;

    try {
      const { error } = await supabase.from("investigations").delete().eq("id", deletingId);

      if (error) throw error;

      setShowDeleteModal(false);
      setDeletingId(null);
      fetchInvestigations();
    } catch (err: any) {
      console.error("Erro ao excluir:", err);
      setError(err.message || "Erro ao excluir investigacao");
    }
  };

  const handleView = (investigation: Investigation) => {
    setViewingInvestigation(investigation);
    setShowViewModal(true);
    setOpenMenuId(null);
  };

  const openDeleteModal = (id: string) => {
    setDeletingId(id);
    setShowDeleteModal(true);
    setOpenMenuId(null);
  };

  const openNewModal = () => {
    setFormData(initialFormState);
    setEditingId(null);
    setShowModal(true);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("pt-BR");
  };

  const clearFilters = () => {
    setSearchTerm("");
    setFilterStatus("todos");
    setFilterTipo("todos");
  };

  // SQL para criar a tabela
  const createTableSQL = `
-- Criar tabela de investigacoes
CREATE TABLE IF NOT EXISTS investigations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo VARCHAR(255) NOT NULL,
  descricao TEXT,
  numero_procedimento VARCHAR(100) NOT NULL,
  tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('inquerito', 'flagrante', 'rai')),
  status VARCHAR(50) NOT NULL DEFAULT 'em_andamento' CHECK (status IN ('em_andamento', 'concluido', 'arquivado')),
  data_fato DATE,
  local_fato TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar indices para melhor performance
CREATE INDEX IF NOT EXISTS idx_investigations_status ON investigations(status);
CREATE INDEX IF NOT EXISTS idx_investigations_tipo ON investigations(tipo);
CREATE INDEX IF NOT EXISTS idx_investigations_numero ON investigations(numero_procedimento);

-- Habilitar RLS
ALTER TABLE investigations ENABLE ROW LEVEL SECURITY;

-- Politica de acesso (ajuste conforme necessario)
CREATE POLICY "Permitir acesso total aos usuarios autenticados" ON investigations
  FOR ALL USING (auth.role() = 'authenticated');
`;

  if (tableNotFound) {
    return (
      <div className="min-h-screen bg-gray-950 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gray-900 border border-yellow-500/50 rounded-xl p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-yellow-500/20 rounded-lg">
                <AlertCircle className="w-8 h-8 text-yellow-400" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-yellow-400 mb-2">
                  Tabela nao encontrada
                </h2>
                <p className="text-gray-300 mb-4">
                  A tabela <code className="bg-gray-800 px-2 py-1 rounded text-blue-400">investigations</code> nao existe no banco de dados.
                  Execute o SQL abaixo no Supabase para criar a tabela:
                </p>
                <div className="bg-gray-950 border border-gray-700 rounded-lg p-4 overflow-x-auto">
                  <pre className="text-sm text-gray-300 whitespace-pre-wrap font-mono">
                    {createTableSQL}
                  </pre>
                </div>
                <button
                  onClick={() => navigator.clipboard.writeText(createTableSQL)}
                  className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  Copiar SQL
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <FolderOpen className="w-8 h-8 text-blue-500" />
              Gestao de Investigacoes
            </h1>
            <p className="text-gray-400 mt-1">
              Gerencie inqueritos, flagrantes e RAIs
            </p>
          </div>
          <button
            onClick={openNewModal}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <Plus className="w-5 h-5" />
            Nova Investigacao
          </button>
        </div>

        {/* Search and Filters */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por titulo ou numero do procedimento..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                showFilters || filterStatus !== "todos" || filterTipo !== "todos"
                  ? "bg-blue-600/20 border-blue-500 text-blue-400"
                  : "bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-600"
              }`}
            >
              <Filter className="w-5 h-5" />
              Filtros
              <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? "rotate-180" : ""}`} />
            </button>

            {/* Refresh */}
            <button
              onClick={fetchInvestigations}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-300 hover:border-gray-600 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>

          {/* Filter Options */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-gray-800 flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-sm text-gray-400 mb-1">Status</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="todos">Todos os status</option>
                  <option value="em_andamento">Em Andamento</option>
                  <option value="concluido">Concluido</option>
                  <option value="arquivado">Arquivado</option>
                </select>
              </div>

              <div className="flex-1 min-w-[200px]">
                <label className="block text-sm text-gray-400 mb-1">Tipo</label>
                <select
                  value={filterTipo}
                  onChange={(e) => setFilterTipo(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="todos">Todos os tipos</option>
                  <option value="inquerito">Inquerito Policial</option>
                  <option value="flagrante">Auto de Prisao em Flagrante</option>
                  <option value="rai">RAI</option>
                </select>
              </div>

              <div className="flex items-end">
                <button
                  onClick={clearFilters}
                  className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                >
                  Limpar filtros
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="text-2xl font-bold text-white">{investigations.length}</div>
            <div className="text-sm text-gray-400">Total</div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="text-2xl font-bold text-yellow-400">
              {investigations.filter((i) => i.status === "em_andamento").length}
            </div>
            <div className="text-sm text-gray-400">Em Andamento</div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="text-2xl font-bold text-green-400">
              {investigations.filter((i) => i.status === "concluido").length}
            </div>
            <div className="text-sm text-gray-400">Concluidos</div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="text-2xl font-bold text-gray-400">
              {investigations.filter((i) => i.status === "arquivado").length}
            </div>
            <div className="text-sm text-gray-400">Arquivados</div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/50 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-400" />
              <span className="text-red-400">{error}</span>
              <button
                onClick={() => setError(null)}
                className="ml-auto text-red-400 hover:text-red-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredInvestigations.length === 0 && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
            <FolderOpen className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">
              {searchTerm || filterStatus !== "todos" || filterTipo !== "todos"
                ? "Nenhuma investigacao encontrada"
                : "Nenhuma investigacao cadastrada"}
            </h3>
            <p className="text-gray-400 mb-4">
              {searchTerm || filterStatus !== "todos" || filterTipo !== "todos"
                ? "Tente ajustar os filtros de busca"
                : "Comece criando uma nova investigacao"}
            </p>
            {!(searchTerm || filterStatus !== "todos" || filterTipo !== "todos") && (
              <button
                onClick={openNewModal}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                <Plus className="w-5 h-5" />
                Nova Investigacao
              </button>
            )}
          </div>
        )}

        {/* Investigations Grid */}
        {!loading && filteredInvestigations.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredInvestigations.map((investigation) => (
              <div
                key={investigation.id}
                className="bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-gray-700 transition-colors group"
              >
                {/* Card Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-white truncate">
                      {investigation.titulo}
                    </h3>
                    <p className="text-sm text-gray-400 flex items-center gap-1 mt-1">
                      <FileText className="w-4 h-4" />
                      {investigation.numero_procedimento}
                    </p>
                  </div>
                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenMenuId(openMenuId === investigation.id ? null : investigation.id);
                      }}
                      className="p-1 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition-colors"
                    >
                      <MoreVertical className="w-5 h-5" />
                    </button>
                    {openMenuId === investigation.id && (
                      <div className="absolute right-0 top-8 w-40 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-10 overflow-hidden">
                        <button
                          onClick={() => handleView(investigation)}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                          Visualizar
                        </button>
                        <button
                          onClick={() => handleEdit(investigation)}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                          Editar
                        </button>
                        <button
                          onClick={() => openDeleteModal(investigation.id)}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-gray-700 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                          Excluir
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-2 mb-3">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusColors[investigation.status].bg} ${statusColors[investigation.status].text}`}
                  >
                    {statusColors[investigation.status].icon}
                    {statusLabels[investigation.status]}
                  </span>
                  <span
                    className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${tipoColors[investigation.tipo].bg} ${tipoColors[investigation.tipo].text}`}
                  >
                    {tipoLabels[investigation.tipo]}
                  </span>
                </div>

                {/* Description */}
                {investigation.descricao && (
                  <p className="text-sm text-gray-400 line-clamp-2 mb-3">
                    {investigation.descricao}
                  </p>
                )}

                {/* Meta Info */}
                <div className="space-y-2 text-sm text-gray-500">
                  {investigation.data_fato && (
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span>Data do fato: {formatDate(investigation.data_fato)}</span>
                    </div>
                  )}
                  {investigation.local_fato && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      <span className="truncate">{investigation.local_fato}</span>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="mt-4 pt-3 border-t border-gray-800 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <Users className="w-4 h-4" />
                    <span>{investigation.alvos_count || 0} alvo(s)</span>
                  </div>
                  <span className="text-xs text-gray-600">
                    {formatDate(investigation.created_at)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create/Edit Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-gray-900 px-6 py-4 border-b border-gray-800 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-white">
                  {editingId ? "Editar Investigacao" : "Nova Investigacao"}
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-1 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Titulo *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.titulo}
                    onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ex: Homicidio - Setor Bueno"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Numero do Procedimento *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.numero_procedimento}
                    onChange={(e) =>
                      setFormData({ ...formData, numero_procedimento: e.target.value })
                    }
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ex: 2024.0001.0001"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Tipo *
                    </label>
                    <select
                      required
                      value={formData.tipo}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          tipo: e.target.value as InvestigationForm["tipo"],
                        })
                      }
                      className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="inquerito">Inquerito Policial</option>
                      <option value="flagrante">Auto de Prisao em Flagrante</option>
                      <option value="rai">RAI</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Status *
                    </label>
                    <select
                      required
                      value={formData.status}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          status: e.target.value as InvestigationForm["status"],
                        })
                      }
                      className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="em_andamento">Em Andamento</option>
                      <option value="concluido">Concluido</option>
                      <option value="arquivado">Arquivado</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Data do Fato
                  </label>
                  <input
                    type="date"
                    value={formData.data_fato}
                    onChange={(e) => setFormData({ ...formData, data_fato: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Local do Fato
                  </label>
                  <input
                    type="text"
                    value={formData.local_fato}
                    onChange={(e) => setFormData({ ...formData, local_fato: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ex: Av. 85, Setor Bueno, Goiania-GO"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Descricao
                  </label>
                  <textarea
                    value={formData.descricao}
                    onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                    rows={4}
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    placeholder="Descreva brevemente os fatos..."
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {saving && <RefreshCw className="w-4 h-4 animate-spin" />}
                    {editingId ? "Salvar Alteracoes" : "Criar Investigacao"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-md p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-red-500/20 rounded-full">
                  <Trash2 className="w-6 h-6 text-red-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Excluir Investigacao</h3>
                  <p className="text-sm text-gray-400">Esta acao nao pode ser desfeita.</p>
                </div>
              </div>
              <p className="text-gray-300 mb-6">
                Tem certeza que deseja excluir esta investigacao? Todos os dados relacionados
                serao perdidos permanentemente.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDelete}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                >
                  Excluir
                </button>
              </div>
            </div>
          </div>
        )}

        {/* View Modal */}
        {showViewModal && viewingInvestigation && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-gray-900 px-6 py-4 border-b border-gray-800 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-white">Detalhes da Investigacao</h2>
                <button
                  onClick={() => setShowViewModal(false)}
                  className="p-1 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Header */}
                <div>
                  <h3 className="text-2xl font-bold text-white mb-2">
                    {viewingInvestigation.titulo}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    <span
                      className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${statusColors[viewingInvestigation.status].bg} ${statusColors[viewingInvestigation.status].text}`}
                    >
                      {statusColors[viewingInvestigation.status].icon}
                      {statusLabels[viewingInvestigation.status]}
                    </span>
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${tipoColors[viewingInvestigation.tipo].bg} ${tipoColors[viewingInvestigation.tipo].text}`}
                    >
                      {tipoLabels[viewingInvestigation.tipo]}
                    </span>
                  </div>
                </div>

                {/* Info Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-800/50 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-gray-400 mb-1">
                      <FileText className="w-4 h-4" />
                      <span className="text-sm">Numero do Procedimento</span>
                    </div>
                    <p className="text-white font-medium">
                      {viewingInvestigation.numero_procedimento}
                    </p>
                  </div>

                  <div className="bg-gray-800/50 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-gray-400 mb-1">
                      <Users className="w-4 h-4" />
                      <span className="text-sm">Alvos Vinculados</span>
                    </div>
                    <p className="text-white font-medium">
                      {viewingInvestigation.alvos_count || 0} alvo(s)
                    </p>
                  </div>

                  <div className="bg-gray-800/50 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-gray-400 mb-1">
                      <Calendar className="w-4 h-4" />
                      <span className="text-sm">Data do Fato</span>
                    </div>
                    <p className="text-white font-medium">
                      {formatDate(viewingInvestigation.data_fato) || "-"}
                    </p>
                  </div>

                  <div className="bg-gray-800/50 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-gray-400 mb-1">
                      <MapPin className="w-4 h-4" />
                      <span className="text-sm">Local do Fato</span>
                    </div>
                    <p className="text-white font-medium">
                      {viewingInvestigation.local_fato || "-"}
                    </p>
                  </div>
                </div>

                {/* Description */}
                {viewingInvestigation.descricao && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-400 mb-2">Descricao</h4>
                    <p className="text-gray-300 bg-gray-800/50 rounded-lg p-4 whitespace-pre-wrap">
                      {viewingInvestigation.descricao}
                    </p>
                  </div>
                )}

                {/* Timestamps */}
                <div className="text-sm text-gray-500 border-t border-gray-800 pt-4">
                  <p>Criado em: {formatDate(viewingInvestigation.created_at)}</p>
                  {viewingInvestigation.updated_at && (
                    <p>Atualizado em: {formatDate(viewingInvestigation.updated_at)}</p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowViewModal(false);
                      handleEdit(viewingInvestigation);
                    }}
                    className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <Edit className="w-4 h-4" />
                    Editar
                  </button>
                  <button
                    onClick={() => setShowViewModal(false)}
                    className="flex-1 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
