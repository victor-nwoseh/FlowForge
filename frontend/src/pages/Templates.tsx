import { useState, useMemo } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { FileText, Download, Search, Star, Filter, LayoutTemplate, X, ArrowRight } from 'lucide-react';

import api from '../services/api';

type Template = {
  _id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  usageCount: number;
  workflow: {
    nodes: any[];
    edges: any[];
  };
};

// Dark theme category colors
const CATEGORY_COLORS: Record<string, string> = {
  Sales: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
  Marketing: 'bg-violet-500/15 text-violet-400 border border-violet-500/30',
  Operations: 'bg-blue-500/15 text-blue-400 border border-blue-500/30',
  Finance: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
  Support: 'bg-orange-500/15 text-orange-400 border border-orange-500/30',
  General: 'bg-forge-700/50 text-forge-400 border border-forge-600/30',
};

// Dark theme difficulty colors
const DIFFICULTY_COLORS: Record<string, string> = {
  Beginner: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
  Intermediate: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
  Advanced: 'bg-red-500/15 text-red-400 border border-red-500/30',
};

const categories = ['All', 'Sales', 'Marketing', 'Operations', 'Finance', 'Support', 'General'];

const Templates = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);
  const navigate = useNavigate();

  const { data: templates = [], isLoading } = useQuery<Template[]>({
    queryKey: ['templates', selectedCategory],
    queryFn: () => {
      if (selectedCategory === 'All') return api.get('/templates');
      return api.get(`/templates?category=${selectedCategory}`);
    },
  });

  const importMutation = useMutation({
    mutationFn: async (templateId: string) => {
      const template: Template = await api.get(`/templates/${templateId}`);
      await api.post(`/templates/${templateId}/increment-usage`);
      return api.post('/workflows', {
        name: `${template.name} (Copy)`,
        description: template.description,
        nodes: template.workflow.nodes,
        edges: template.workflow.edges,
      });
    },
    onSuccess: (newWorkflow: any) => {
      toast.success('Template imported!');
      navigate(`/workflows/${newWorkflow._id}`);
    },
    onError: () => toast.error('Failed to import template'),
  });

  const filteredTemplates = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return templates.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        (t.tags ?? []).some((tag) => tag.toLowerCase().includes(q)),
    );
  }, [templates, searchQuery]);

  return (
    <div className="p-6 pb-32">
      {/* Page Header */}
      <header className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-ember-500/15 border border-ember-500/30">
            <LayoutTemplate className="h-5 w-5 text-ember-300" />
          </div>
          <h1 className="text-2xl font-semibold text-forge-50">Workflow Templates</h1>
        </div>
        <p className="text-forge-400 ml-12">
          Start with a pre-built workflow and customize to your needs.
        </p>
      </header>

      {/* Search and Filters */}
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        {/* Search Input */}
        <div className="flex items-center gap-2 rounded-lg border border-forge-700/50 bg-forge-800/60 px-3 py-2.5 focus-within:border-ember-500/50 focus-within:ring-1 focus-within:ring-ember-500/20 transition-all">
          <Search size={16} className="text-forge-500" />
          <input
            type="text"
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-64 bg-transparent text-sm text-forge-50 placeholder:text-forge-500 outline-none"
          />
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase text-forge-500 mr-1">
            <Filter size={14} />
            Categories
          </span>
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
                selectedCategory === cat
                  ? 'bg-ember-500/20 text-ember-300 border border-ember-500/40'
                  : 'bg-forge-800/60 text-forge-400 border border-forge-700/50 hover:border-forge-600/50 hover:text-forge-300'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Loading State */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="bg-forge-900/80 border border-forge-700/50 rounded-xl p-6 animate-pulse"
            >
              <div className="flex items-start gap-3 mb-4">
                <div className="h-10 w-10 rounded-xl bg-forge-800/60" />
                <div className="flex-1 space-y-2">
                  <div className="h-5 w-3/4 bg-forge-800/60 rounded" />
                  <div className="h-4 w-full bg-forge-800/40 rounded" />
                  <div className="h-4 w-2/3 bg-forge-800/40 rounded" />
                </div>
              </div>
              <div className="flex gap-2 mb-4">
                <div className="h-5 w-16 bg-forge-800/60 rounded-full" />
                <div className="h-5 w-16 bg-forge-800/60 rounded-full" />
              </div>
              <div className="flex gap-2">
                <div className="h-10 flex-1 bg-forge-800/60 rounded-lg" />
                <div className="h-10 w-20 bg-forge-800/60 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredTemplates.length === 0 ? (
        /* Empty State */
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-forge-700/50 bg-forge-900/60 backdrop-blur-sm p-12 text-center">
          <div className="p-4 rounded-full bg-forge-800/60 border border-forge-700/50 mb-4">
            <FileText className="h-10 w-10 text-forge-500" />
          </div>
          <p className="text-lg font-medium text-forge-300 mb-1">No templates found</p>
          <p className="text-sm text-forge-500">Try a different search or category filter.</p>
        </div>
      ) : (
        /* Template Cards Grid */
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredTemplates.map((template) => {
            const categoryColor =
              CATEGORY_COLORS[template.category] ?? 'bg-forge-700/50 text-forge-400 border border-forge-600/30';
            const difficultyColor =
              DIFFICULTY_COLORS[template.difficulty] ?? 'bg-forge-700/50 text-forge-400 border border-forge-600/30';
            const usageCount = template.usageCount ?? 0;
            return (
              <div
                key={template._id}
                className="
                  group flex flex-col rounded-xl p-6
                  bg-forge-900/80 backdrop-blur-xl
                  border border-forge-700/50
                  transition-all duration-300
                  hover:border-ember-500/40 hover:shadow-lg hover:shadow-ember-500/5
                "
              >
                {/* Row 1: Icon + Name + Badges */}
                <div className="flex items-start gap-3 mb-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-ember-500/15 border border-ember-500/30 transition-all group-hover:border-ember-500/50 flex-shrink-0">
                    <FileText size={20} className="text-ember-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-semibold text-forge-50 mb-1 truncate">
                      {template.name}
                    </h3>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${categoryColor}`}>
                        {template.category}
                      </span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${difficultyColor}`}>
                        {template.difficulty}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Row 2: Description (fixed height) */}
                <div className="h-12 mb-4">
                  <p className="line-clamp-2 text-sm text-forge-400 leading-relaxed">
                    {template.description}
                  </p>
                </div>

                {/* Row 3: Tags (fixed height) */}
                <div className="h-7 mb-4">
                  <div className="flex flex-wrap gap-1.5">
                    {(template.tags ?? []).map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-forge-800/60 border border-forge-700/40 px-2 py-0.5 text-xs font-medium text-forge-500"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Row 4: Usage Count */}
                <div className="flex items-center text-xs text-forge-500 mb-4">
                  <Star size={14} className="text-amber-500 mr-1" />
                  Used {usageCount} times
                </div>

                {/* Row 5: Actions */}
                <div className="flex gap-2 mt-auto">
                  <button
                    type="button"
                    className="
                      inline-flex flex-1 items-center justify-center gap-2
                      rounded-lg px-3 py-2.5 text-sm font-medium
                      bg-gradient-to-r from-ember-500 to-ember-400
                      text-white shadow-lg shadow-ember-500/20
                      transition-all duration-200
                      hover:from-ember-400 hover:to-ember-300
                      hover:shadow-ember-500/30
                      disabled:opacity-50 disabled:cursor-not-allowed
                    "
                    onClick={() => importMutation.mutate(template._id)}
                    disabled={importMutation.isPending}
                  >
                    <Download size={16} />
                    {importMutation.isPending ? 'Importing...' : 'Use Template'}
                  </button>
                  <button
                    type="button"
                    className="
                      inline-flex items-center justify-center
                      rounded-lg px-4 py-2.5 text-sm font-medium
                      bg-forge-800/60 text-forge-300 border border-forge-700/50
                      transition-all duration-200
                      hover:border-forge-600/50 hover:text-forge-200 hover:bg-forge-800/80
                    "
                    onClick={() => setPreviewTemplate(template)}
                  >
                    Preview
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Preview Modal */}
      {previewTemplate ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-forge-950/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-3xl rounded-xl bg-forge-900/95 backdrop-blur-xl border border-forge-700/50 p-6 shadow-2xl">
            {/* Modal Header */}
            <div className="mb-6 flex items-start justify-between">
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-forge-50 mb-1">{previewTemplate.name}</h3>
                <p className="text-sm text-forge-400">{previewTemplate.description}</p>
                <div className="flex flex-wrap items-center gap-2 mt-3">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${CATEGORY_COLORS[previewTemplate.category] ?? 'bg-forge-700/50 text-forge-400 border border-forge-600/30'}`}>
                    {previewTemplate.category}
                  </span>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${DIFFICULTY_COLORS[previewTemplate.difficulty] ?? 'bg-forge-700/50 text-forge-400 border border-forge-600/30'}`}>
                    {previewTemplate.difficulty}
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="p-2 rounded-lg text-forge-500 hover:text-forge-300 hover:bg-forge-800/60 transition-colors"
                onClick={() => setPreviewTemplate(null)}
              >
                <X size={20} />
              </button>
            </div>

            {/* Nodes Section */}
            <div className="mb-6">
              <p className="text-xs font-semibold uppercase text-forge-500 mb-3">Workflow Nodes</p>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2 max-h-64 overflow-y-auto pr-2">
                {(previewTemplate.workflow?.nodes ?? []).map((node) => (
                  <div
                    key={node.id}
                    className="rounded-lg border border-forge-700/40 bg-forge-800/60 p-3"
                  >
                    <div className="text-sm font-medium text-forge-50">{node.data?.label ?? node.id}</div>
                    <div className="text-xs uppercase text-forge-500 mt-0.5">{node.data?.type}</div>
                    {node.data?.description ? (
                      <p className="mt-1.5 text-xs text-forge-400 line-clamp-2">{node.data.description}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>

            {/* Edges/Flow Section */}
            <div className="mb-6">
              <p className="mb-3 text-xs font-semibold uppercase text-forge-500">Workflow Flow</p>
              <div className="flex flex-wrap gap-2">
                {(previewTemplate.workflow?.edges ?? []).map((edge) => (
                  <span
                    key={edge.id}
                    className="inline-flex items-center gap-1.5 rounded-full bg-ember-500/15 border border-ember-500/30 px-3 py-1 text-xs font-medium text-ember-300"
                  >
                    {edge.source}
                    <ArrowRight size={12} />
                    {edge.target}
                  </span>
                ))}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-forge-700/50">
              <button
                type="button"
                className="
                  rounded-lg px-4 py-2.5 text-sm font-medium
                  bg-forge-800/60 text-forge-300 border border-forge-700/50
                  transition-all duration-200
                  hover:border-forge-600/50 hover:text-forge-200
                "
                onClick={() => setPreviewTemplate(null)}
              >
                Close
              </button>
              <button
                type="button"
                className="
                  inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium
                  bg-gradient-to-r from-ember-500 to-ember-400
                  text-white shadow-lg shadow-ember-500/20
                  transition-all duration-200
                  hover:from-ember-400 hover:to-ember-300
                  disabled:opacity-50 disabled:cursor-not-allowed
                "
                onClick={() => {
                  importMutation.mutate(previewTemplate._id);
                  setPreviewTemplate(null);
                }}
                disabled={importMutation.isPending}
              >
                <Download size={16} />
                {importMutation.isPending ? 'Importing...' : 'Use Template'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default Templates;

