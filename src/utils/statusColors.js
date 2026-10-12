// src/utils/statusColors.js

export const getStatusColor = (status) => {
  switch (status?.toLowerCase()) {
    case 'active':
      return {
        bg: 'bg-blue-100',
        text: 'text-blue-800',
        border: 'border-blue-200'
      };
    case 'converted':
      return {
        bg: 'bg-green-100',
        text: 'text-green-800',
        border: 'border-green-200'
      };
    case 'lost':
      return {
        bg: 'bg-red-100',
        text: 'text-red-800',
        border: 'border-red-200'
      };
    default:
      return {
        bg: 'bg-gray-100',
        text: 'text-gray-800',
        border: 'border-gray-200'
      };
  }
};

export const getSubStatusColor = (substatus) => {
  switch (substatus?.toLowerCase()) {
    case 'new':
      return {
        bg: 'bg-purple-100',
        text: 'text-purple-800',
        border: 'border-purple-200'
      };
    case 'open':
      return {
        bg: 'bg-blue-100',
        text: 'text-blue-800',
        border: 'border-blue-200'
      };
    case 'followup':
      return {
        bg: 'bg-yellow-100',
        text: 'text-yellow-800',
        border: 'border-yellow-200'
      };
    case 'inprogress':
      return {
        bg: 'bg-[#EDF2FC]',
        text: 'text-[#294998]',
        border: 'border-[#CDDBF6]'
      };
    case 'average':
      return {
        bg: 'bg-orange-100',
        text: 'text-orange-800',
        border: 'border-orange-200'
      };
    case 'interested':
      return {
        bg: 'bg-green-100',
        text: 'text-green-800',
        border: 'border-green-200'
      };
    case 'junk':
      return {
        bg: 'bg-red-100',
        text: 'text-red-800',
        border: 'border-red-200'
      };
    default:
      return {
        bg: 'bg-gray-100',
        text: 'text-gray-800',
        border: 'border-gray-200'
      };
  }
};