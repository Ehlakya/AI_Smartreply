import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsService } from '../services/settings.service';
import { Save, Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ConfigurationPage() {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    companyDomain: '',
    teamMembers: [],
    departmentKeywords: []
  });

  const [newTeamMember, setNewTeamMember] = useState('');
  const [newDepartment, setNewDepartment] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: () => settingsService.getSettings()
  });

  useEffect(() => {
    if (data?.data) {
      setFormData({
        companyDomain: data.data.companyDomain || '',
        teamMembers: data.data.teamMembers || [],
        departmentKeywords: data.data.departmentKeywords || []
      });
    }
  }, [data]);

  const updateMutation = useMutation({
    mutationFn: (newSettings) => settingsService.updateSettings(newSettings),
    onSuccess: () => {
      toast.success('Settings saved successfully!');
      queryClient.invalidateQueries(['settings']);
    },
    onError: () => {
      toast.error('Failed to save settings.');
    }
  });

  const handleSave = () => {
    updateMutation.mutate(formData);
  };

  const addTeamMember = () => {
    if (newTeamMember.trim() && !formData.teamMembers.includes(newTeamMember.trim())) {
      setFormData(prev => ({
        ...prev,
        teamMembers: [...prev.teamMembers, newTeamMember.trim()]
      }));
      setNewTeamMember('');
    }
  };

  const removeTeamMember = (member) => {
    setFormData(prev => ({
      ...prev,
      teamMembers: prev.teamMembers.filter(m => m !== member)
    }));
  };

  const addDepartment = () => {
    if (newDepartment.trim() && !formData.departmentKeywords.includes(newDepartment.trim())) {
      setFormData(prev => ({
        ...prev,
        departmentKeywords: [...prev.departmentKeywords, newDepartment.trim()]
      }));
      setNewDepartment('');
    }
  };

  const removeDepartment = (dept) => {
    setFormData(prev => ({
      ...prev,
      departmentKeywords: prev.departmentKeywords.filter(d => d !== dept)
    }));
  };

  if (isLoading) return <div className="p-8">Loading settings...</div>;

  return (
    <div className="p-8 glass rounded-3xl h-full overflow-y-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-primary">Configuration</h1>
        <button
          onClick={handleSave}
          disabled={updateMutation.isLoading}
          className="btn btn-primary flex items-center gap-2"
        >
          <Save size={18} />
          {updateMutation.isLoading ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      <div className="space-y-8 max-w-2xl">
        <div className="bg-background/50 p-6 rounded-2xl border border-white/5">
          <h2 className="text-xl font-semibold mb-4">Company Domain</h2>
          <input
            type="text"
            className="w-full bg-background border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50"
            placeholder="e.g., tcs.com"
            value={formData.companyDomain}
            onChange={(e) => setFormData(prev => ({ ...prev, companyDomain: e.target.value }))}
          />
          <p className="text-sm opacity-60 mt-2">Emails from this domain are candidates for Team Mail.</p>
        </div>

        <div className="bg-background/50 p-6 rounded-2xl border border-white/5">
          <h2 className="text-xl font-semibold mb-4">Team Members</h2>
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              className="flex-1 bg-background border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="e.g., Sri"
              value={newTeamMember}
              onChange={(e) => setNewTeamMember(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addTeamMember()}
            />
            <button onClick={addTeamMember} className="btn bg-primary/20 hover:bg-primary/30 text-primary px-4 rounded-xl">
              <Plus size={20} />
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {formData.teamMembers.map(member => (
              <span key={member} className="px-3 py-1.5 bg-background border border-white/10 rounded-lg flex items-center gap-2">
                {member}
                <button onClick={() => removeTeamMember(member)} className="text-red-400 hover:text-red-300">
                  <Trash2 size={14} />
                </button>
              </span>
            ))}
          </div>
        </div>

        <div className="bg-background/50 p-6 rounded-2xl border border-white/5">
          <h2 className="text-xl font-semibold mb-4">Department Keywords</h2>
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              className="flex-1 bg-background border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="e.g., HR, CEO, Payroll"
              value={newDepartment}
              onChange={(e) => setNewDepartment(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addDepartment()}
            />
            <button onClick={addDepartment} className="btn bg-primary/20 hover:bg-primary/30 text-primary px-4 rounded-xl">
              <Plus size={20} />
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {formData.departmentKeywords.map(dept => (
              <span key={dept} className="px-3 py-1.5 bg-background border border-white/10 rounded-lg flex items-center gap-2">
                {dept}
                <button onClick={() => removeDepartment(dept)} className="text-red-400 hover:text-red-300">
                  <Trash2 size={14} />
                </button>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
