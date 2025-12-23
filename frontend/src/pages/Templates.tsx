import { useState, useMemo } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { FileText, Download, Search, Star, Filter } from 'lucide-react';

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

const CATEGORY_COLORS: Record<string, string> = {
  Sales: 'bg-green-100 text-green-700',
  Marketing: 'bg-purple-100 text-purple-700',
  Operations: 'bg-blue-100 text-blue-700',
  Finance: 'bg-yellow-100 text-yellow-700',
  Support: 'bg-orange-100 text-orange-700',
  General: 'bg-slate-100 text-slate-700',
};

const DIFFICULTY_COLORS: Record<string, string> = {
  Beginner: 'bg-emerald-100 text-emerald-700',
  Intermediate: 'bg-indigo-100 text-indigo-700',
  Advanced: 'bg-rose-100 text-rose-700',
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
    <div className="p-6">
      <header className="mb-6 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Workflow Templates</h1>
          <p className="text-sm text-gray-600">
            Start with a pre-built workflow and customize to your needs.
          </p>
        </div>
      </header>

      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-sm">
          <Search size={16} className="text-gray-400" />
          <input
            type="text"
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-64 bg-transparent text-sm text-gray-800 outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 text-xs font-semibold uppercase text-gray-500">
            <Filter size={14} />
            Categories
          </span>
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                selectedCategory === cat
                  ? 'bg-indigo-600 text-white shadow'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex h-40 items-center justify-center text-sm text-gray-500">
          Loading templates...
        </div>
      ) : filteredTemplates.length === 0 ? (
        <div className="flex h-40 items-center justify-center text-sm text-gray-500">
          No templates found. Try a different search.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredTemplates.map((template) => {
            const categoryColor =
              CATEGORY_COLORS[template.category] ?? 'bg-slate-100 text-slate-700';
            const difficultyColor =
              DIFFICULTY_COLORS[template.difficulty] ?? 'bg-slate-100 text-slate-700';
            const usageCount = template.usageCount ?? 0;
            return (
              <div
                key={template._id}
                className="flex flex-col gap-4 rounded-lg bg-white p-6 shadow-md transition hover:-translate-y-0.5 hover:shadow-lg"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
                    <FileText size={18} />
                  </div>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-semibold text-gray-900">{template.name}</h3>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${categoryColor}`}>
                        {template.category}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${difficultyColor}`}
                      >
                        {template.difficulty}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-3 text-sm text-gray-600">
                      {template.description}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {(template.tags ?? []).map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>

                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span className="inline-flex items-center gap-1">
                    <Star size={14} className="text-amber-500" />
                    Used {usageCount} times
                  </span>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-60"
                    onClick={() => importMutation.mutate(template._id)}
                    disabled={importMutation.isPending}
                  >
                    <Download size={16} />
                    {importMutation.isPending ? 'Importing...' : 'Use Template'}
                  </button>
                  <button
                    type="button"
                    className="inline-flex items-center justify-center rounded-md border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
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

      {previewTemplate ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-3xl rounded-xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">{previewTemplate.name}</h3>
                <p className="text-sm text-gray-600">{previewTemplate.description}</p>
              </div>
              <button
                type="button"
                className="text-sm font-semibold text-gray-500 hover:text-gray-700"
                onClick={() => setPreviewTemplate(null)}
              >
                Close
              </button>
            </div>

            <div className="mb-6 grid gap-2">
              <p className="text-xs font-semibold uppercase text-gray-500">Nodes</p>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                {(previewTemplate.workflow?.nodes ?? []).map((node) => (
                  <div
                    key={node.id}
                    className="rounded-lg border border-gray-100 bg-slate-50 p-3 text-sm text-gray-800"
                  >
                    <div className="font-semibold">{node.data?.label ?? node.id}</div>
                    <div className="text-xs uppercase text-gray-500">{node.data?.type}</div>
                    {node.data?.description ? (
                      <p className="mt-1 text-xs text-gray-600">{node.data.description}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <p className="mb-2 text-xs font-semibold uppercase text-gray-500">Workflow</p>
              <div className="flex flex-wrap gap-2">
                {(previewTemplate.workflow?.edges ?? []).map((edge) => (
                  <span
                    key={edge.id}
                    className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700"
                  >
                    {edge.source} → {edge.target}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="rounded-md border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                onClick={() => setPreviewTemplate(null)}
              >
                Close
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-60"
                onClick={() => {
                  importMutation.mutate(previewTemplate._id);
                  setPreviewTemplate(null);
                }}
                disabled={importMutation.isPending}
              >
                <Download size={16} />
                {importMutation.isPending ? 'Importing...' : 'Import'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default Templates;

