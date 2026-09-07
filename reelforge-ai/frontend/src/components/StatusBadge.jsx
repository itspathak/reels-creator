const STATUS_LABELS = {
  draft: 'Draft',
  generating: 'Generating',
  voice_generating: 'Voice',
  rendering: 'Rendering',
  completed: 'Completed',
  failed: 'Failed',
};

export default function StatusBadge({ status }) {
  return <span className={`badge badge-${status}`}>{STATUS_LABELS[status] || status}</span>;
}