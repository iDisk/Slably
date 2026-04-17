import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { 
  Plus, Phone, Mail, MessageCircle,
  DollarSign, ChevronRight,
  Users, X, Check
} from "lucide-react";
import { Card, CardContent } from 
  "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { BuilderLayout } from "@/components/layout/BuilderLayout";

type LeadStatus = 
  'new' | 'contacted' | 'quote_sent' | 
  'negotiating' | 'won' | 'lost';

type LeadSource = 
  'manual' | 'meta_ads' | 'referral' | 
  'cpa' | 'rfq' | 'youtube' | 'other';

interface Lead {
  id: number;
  name: string;
  company?: string;
  phone?: string;
  email?: string;
  status: LeadStatus;
  source: LeadSource;
  estimatedValue?: string;
  notes?: string;
  createdAt: string;
  convertedAt?: string;
  projectId?: number;
}

const STATUS_COLUMNS: { 
  key: LeadStatus; 
  label: string; 
  color: string;
  bg: string;
}[] = [
  { key: 'new', label: 'New', 
    color: 'text-slate-600', 
    bg: 'bg-slate-100' },
  { key: 'contacted', label: 'Contacted', 
    color: 'text-blue-600', 
    bg: 'bg-blue-50' },
  { key: 'quote_sent', label: 'Quote Sent', 
    color: 'text-orange-600', 
    bg: 'bg-orange-50' },
  { key: 'negotiating', label: 'Negotiating', 
    color: 'text-purple-600', 
    bg: 'bg-purple-50' },
  { key: 'won', label: 'Won ✓', 
    color: 'text-green-600', 
    bg: 'bg-green-50' },
  { key: 'lost', label: 'Lost', 
    color: 'text-red-600', 
    bg: 'bg-red-50' },
];

const SOURCE_LABELS: Record<LeadSource, string> = {
  manual: 'Manual',
  meta_ads: 'Meta Ads',
  referral: 'Referral',
  cpa: 'CPA / Accountant',
  rfq: 'Network RFQ',
  youtube: 'YouTube',
  other: 'Other',
};

export default function CRMPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedLead, setSelectedLead] = 
    useState<Lead | null>(null);
  const [, navigate] = useLocation();

  const [form, setForm] = useState({
    name: '', company: '', phone: '',
    email: '', source: 'manual' as LeadSource,
    estimatedValue: '', notes: '',
  });

  useEffect(() => {
    fetchLeads();
  }, []);

  async function fetchLeads() {
    try {
      const token = localStorage.getItem('slably_token');
      const res = await fetch('/api/crm/leads', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) setLeads(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function createLead() {
    if (!form.name.trim()) {
      toast.error("Name is required");
      return;
    }
    try {
      const token = localStorage.getItem('slably_token');
      const res = await fetch('/api/crm/leads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          ...form,
          estimatedValue: form.estimatedValue 
            ? parseFloat(form.estimatedValue) 
            : undefined,
        })
      });
      if (res.ok) {
        const lead = await res.json();
        setLeads(prev => [lead, ...prev]);
        setShowAddModal(false);
        setForm({ name: '', company: '', 
          phone: '', email: '', 
          source: 'manual', 
          estimatedValue: '', notes: '' });
        toast.success("Lead added!");
      }
    } catch (e) {
      toast.error("Error creating lead");
    }
  }

  async function updateStatus(
    leadId: number, 
    newStatus: LeadStatus
  ) {
    try {
      const token = localStorage.getItem('slably_token');
      const res = await fetch(
        `/api/crm/leads/${leadId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        setLeads(prev => prev.map(l => 
          l.id === leadId 
            ? { ...l, status: newStatus } 
            : l
        ));
        toast.success("Status updated");
      }
    } catch (e) {
      toast.error("Error updating status");
    }
  }

  const leadsByStatus = STATUS_COLUMNS.reduce(
    (acc, col) => {
      acc[col.key] = leads.filter(
        l => l.status === col.key
      );
      return acc;
    }, 
    {} as Record<LeadStatus, Lead[]>
  );

  if (loading) return (
    <BuilderLayout>
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    </BuilderLayout>
  );

  return (
    <BuilderLayout>
    <div className="p-6 max-w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">CRM</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Track your leads and close more projects
          </p>
        </div>
        <Button
          onClick={() => setShowAddModal(true)}
          className="bg-[#F97316] hover:bg-orange-600 text-white rounded-full"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Lead
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card className="border-none shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {leads.filter(l => l.status !== 'won' && l.status !== 'lost').length}
              </p>
              <p className="text-xs text-muted-foreground">Active Leads</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center">
              <Check className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {leads.filter(l => l.status === 'won').length}
              </p>
              <p className="text-xs text-muted-foreground">Won</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                ${leads
                  .filter(l => l.status === 'won')
                  .reduce((sum, l) => sum + parseFloat(l.estimatedValue || '0'), 0)
                  .toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">Won Value</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Kanban Board */}
      <div className="overflow-x-auto">
        <div className="flex gap-4 min-w-max pb-4">
          {STATUS_COLUMNS.map(col => (
            <div key={col.key} className="w-64 flex-shrink-0">
              <div className={`flex items-center justify-between px-3 py-2 rounded-lg mb-3 ${col.bg}`}>
                <span className={`text-sm font-semibold ${col.color}`}>{col.label}</span>
                <span className={`text-xs font-bold ${col.color}`}>
                  {leadsByStatus[col.key]?.length || 0}
                </span>
              </div>
              <div className="space-y-2">
                {leadsByStatus[col.key]?.map(lead => (
                  <Card key={lead.id}
                    className="border border-border shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => setSelectedLead(lead)}
                  >
                    <CardContent className="p-3">
                      <p className="font-semibold text-sm text-foreground truncate">
                        {lead.name}
                      </p>
                      {lead.company && (
                        <p className="text-xs text-muted-foreground truncate">
                          {lead.company}
                        </p>
                      )}
                      {lead.estimatedValue && (
                        <p className="text-xs text-green-600 font-medium mt-1">
                          ${parseFloat(lead.estimatedValue).toLocaleString()}
                        </p>
                      )}
                      <div className="flex items-center justify-between mt-2">
                        <Badge variant="outline" className="text-xs px-1.5">
                          {SOURCE_LABELS[lead.source]}
                        </Badge>
                        {lead.phone && (
                          <a 
                            href={`tel:${lead.phone}`}
                            onClick={e => e.stopPropagation()}
                            className="text-muted-foreground hover:text-primary"
                          >
                            <Phone className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {leadsByStatus[col.key]?.length === 0 && (
                  <div className="text-center py-6 text-muted-foreground text-xs border-2 border-dashed border-border rounded-lg">
                    No leads
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add Lead Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Add New Lead</h2>
              <button 
                onClick={() => setShowAddModal(false)}
                className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium">Name *</label>
                <input
                  className="w-full mt-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="John Smith"
                  value={form.name}
                  onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Company</label>
                <input
                  className="w-full mt-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Smith Construction"
                  value={form.company}
                  onChange={e => setForm(p => ({ ...p, company: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium">Phone</label>
                  <input
                    className="w-full mt-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="(555) 123-4567"
                    value={form.phone}
                    onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Est. Value</label>
                  <input
                    type="number"
                    className="w-full mt-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="50000"
                    value={form.estimatedValue}
                    onChange={e => setForm(p => ({ ...p, estimatedValue: e.target.value }))}
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Source</label>
                <select
                  className="w-full mt-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  value={form.source}
                  onChange={e => setForm(p => ({ ...p, source: e.target.value as LeadSource }))}
                >
                  {Object.entries(SOURCE_LABELS).map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Notes</label>
                <textarea
                  className="w-full mt-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  rows={2}
                  placeholder="Initial notes..."
                  value={form.notes}
                  onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowAddModal(false)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-[#F97316] hover:bg-orange-600 text-white"
                onClick={createLead}
              >
                Add Lead
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Lead Detail Panel */}
      {selectedLead && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-bold">{selectedLead.name}</h2>
                  {selectedLead.company && (
                    <p className="text-sm text-muted-foreground">{selectedLead.company}</p>
                  )}
                </div>
                <button
                  onClick={() => setSelectedLead(null)}
                  className="text-muted-foreground hover:text-foreground">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Contact buttons */}
              <div className="flex gap-2 mb-4">
                {selectedLead.phone && (
                  <a href={`tel:${selectedLead.phone}`}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-full text-xs font-medium">
                    <Phone className="w-3.5 h-3.5" />
                    Call
                  </a>
                )}
                {selectedLead.phone && (
                  <a href={`https://wa.me/${selectedLead.phone.replace(/\D/g,'')}`}
                    target="_blank"
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-600 rounded-full text-xs font-medium">
                    <MessageCircle className="w-3.5 h-3.5" />
                    WhatsApp
                  </a>
                )}
                {selectedLead.email && (
                  <a href={`mailto:${selectedLead.email}`}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 text-orange-600 rounded-full text-xs font-medium">
                    <Mail className="w-3.5 h-3.5" />
                    Email
                  </a>
                )}
              </div>

              {/* Move status */}
              <div className="mb-4">
                <p className="text-xs font-medium text-muted-foreground mb-2">MOVE TO</p>
                <div className="flex flex-wrap gap-2">
                  {STATUS_COLUMNS
                    .filter(c => c.key !== selectedLead.status)
                    .map(col => (
                      <button
                        key={col.key}
                        onClick={() => {
                          updateStatus(selectedLead.id, col.key);
                          setSelectedLead(prev => prev ? {...prev, status: col.key} : null);
                        }}
                        className={`px-3 py-1 rounded-full text-xs font-medium ${col.bg} ${col.color}`}
                      >
                        {col.label}
                      </button>
                    ))
                  }
                </div>
              </div>

              {/* Value and source */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                {selectedLead.estimatedValue && (
                  <div className="bg-green-50 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">Est. Value</p>
                    <p className="font-bold text-green-600">
                      ${parseFloat(selectedLead.estimatedValue).toLocaleString()}
                    </p>
                  </div>
                )}
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">Source</p>
                  <p className="font-medium text-sm">{SOURCE_LABELS[selectedLead.source]}</p>
                </div>
              </div>

              {/* Notes */}
              {selectedLead.notes && (
                <div className="bg-slate-50 rounded-lg p-3 mb-4">
                  <p className="text-xs text-muted-foreground mb-1">Notes</p>
                  <p className="text-sm">{selectedLead.notes}</p>
                </div>
              )}

              {/* Convert to project if won */}
              {selectedLead.status === 'won' && !selectedLead.projectId && (
                <Button
                  className="w-full bg-[#1B3A5C] hover:bg-navy text-white mb-3"
                  onClick={() => {
                    navigate('/projects/new');
                    setSelectedLead(null);
                  }}
                >
                  <ChevronRight className="w-4 h-4 mr-2" />
                  Convert to Project
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
    </BuilderLayout>
  );
}
