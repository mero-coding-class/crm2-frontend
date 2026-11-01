// src/utils/searchUtils.js

export const searchLeads = (leads, searchTerm, filters = {}) => {
  if (!leads || !Array.isArray(leads)) return [];
  if (!searchTerm && Object.keys(filters).length === 0) return leads;

  return leads.filter(lead => {
    // First check if the lead matches all active filters
    const matchesFilters = Object.entries(filters).every(([key, value]) => {
      if (!value || value === 'All' || value.includes('Select') || value.includes('Status')) return true;
      return String(lead[key]) === String(value);
    });

    if (!matchesFilters) return false;

    // If no search term, return filter results
    if (!searchTerm) return true;

    // Search across all lead fields
    const searchableFields = [
      'school_name',
      'contact_person',
      'email',
      'contact_number',
      'alt_number',
      'landline',
      'class_name',
      'course_interest',
      'source',
      'class_type',
      'shift',
      'status',
      'remarks',
      'address',
      'municipality',
      'district',
    ];

    const termLower = searchTerm.toLowerCase();
    return searchableFields.some(field => {
      const value = lead[field];
      if (!value) return false;
      return String(value).toLowerCase().includes(termLower);
    });
  });
};

export const sortLeads = (leads, sortBy = 'created_at', sortDirection = 'desc') => {
  if (!leads || !Array.isArray(leads)) return [];
  
  return [...leads].sort((a, b) => {
    let aVal = a[sortBy];
    let bVal = b[sortBy];
    
    // Handle dates
    if (sortBy.includes('date') || sortBy.includes('call') || sortBy.includes('created') || sortBy.includes('updated')) {
      aVal = new Date(aVal || 0).getTime();
      bVal = new Date(bVal || 0).getTime();
    }
    
    // Handle numbers
    if (sortBy === 'age' || sortBy === 'value') {
      aVal = parseFloat(aVal) || 0;
      bVal = parseFloat(bVal) || 0;
    }
    
    if (sortDirection === 'asc') {
      return aVal > bVal ? 1 : -1;
    }
    return aVal < bVal ? 1 : -1;
  });
};

export const paginateLeads = (leads, page, perPage) => {
  if (!leads || !Array.isArray(leads)) return [];
  
  const start = (page - 1) * perPage;
  return leads.slice(start, start + perPage);
};
