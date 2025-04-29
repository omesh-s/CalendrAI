export const priorityLevels = ['critical', 'high', 'medium', 'low', 'optional'] as const;
export type Priority = typeof priorityLevels[number];

export const priorityColors = {
  // For badges and backgrounds
  badge: {
    critical: 'bg-rose-400 hover:bg-red-300 text-red-900',
    high: 'bg-red-300 hover:bg-orange-300 text-orange-900',
    medium: 'bg-yellow-200 hover:bg-yellow-300 text-yellow-900',
    low: 'bg-blue-300 hover:bg-blue-300 text-blue-900',
    optional: 'bg-stone-300 hover:bg-gray-700 text-gray-800',
  },
  // For icons and text
  icon: {
    critical: 'text-red-500',
    high: 'text-orange-500',
    medium: 'text-yellow-500',
    low: 'text-blue-500',
    optional: 'text-gray-500',
  }
}; 