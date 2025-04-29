export function getRelativeTime(dueDate: string | null): { text: string; color: string } | null {
  if (!dueDate) return null;

  // Create a date object from the due date string
  const due = new Date(dueDate);
  
  // Manually add one hour to the due date
  due.setTime(due.getTime() + 3600000); // Add 1 hour (3600000 milliseconds)

  const now = new Date(); // This will be in the user's local timezone
  const diff = due.getTime() - now.getTime();
  
  // Convert to appropriate units
  const minutes = Math.floor(diff / 1000 / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  // Determine display text
  let text: string;
  if (diff < 0) {
    text = 'Overdue!';
  } else if (minutes < 60) {
    text = `${minutes}m`;
  } else if (hours < 24) {
    const decimal = (minutes % 60) / 60;
    text = `${hours + (decimal >= 0.5 ? 0.5 : 0)}h`;
  } else {
    const decimal = (hours % 24) / 24;
    text = `${days + (decimal >= 0.5 ? 0.5 : 0)}d`;
  }

  // Determine color based on urgency
  let color: string;
  if (diff < 0) {
    color = 'text-overdue'; // Overdue
  } else if (hours < 1) {
    color = 'text-less-than-1h'; // Less than 1 hour
  } else if (hours < 24) {
    color = 'text-less-than-24h'; // Less than 24 hours
  } else if (days <= 2) {
    color = 'text-due-in-1-2d'; // Due in 1-2 days
  } else {
    color = 'text-more-than-2d'; // More than 2 days
  }

  return { text, color };
}