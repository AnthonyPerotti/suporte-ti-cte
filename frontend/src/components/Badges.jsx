const STATUS_LABELS = {
  open:         'Aberto',
  in_progress:  'Em Atendimento',
  waiting_user: 'Aguardando',
  resolved:     'Resolvido',
  closed:       'Encerrado',
};

const PRIORITY_LABELS = {
  urgent: 'Urgente',
  high:   'Alta',
  normal: 'Normal',
  low:    'Baixa',
};

const SLA_LABELS = {
  ok: 'No Prazo',
  warning: 'Atenção (24h+)',
  critical: 'Crítico (48h+)',
};

export const StatusBadge = ({ status }) => (
  <span className={`badge badge-${status}`}>{STATUS_LABELS[status] || status}</span>
);

export const PriorityBadge = ({ priority }) => (
  <span className={`badge badge-${priority}`}>{PRIORITY_LABELS[priority] || priority}</span>
);

export const SlaBadge = ({ sla_status }) => {
  if (!sla_status || sla_status === 'ok') return null;
  return (
    <span className={`badge badge-sla-${sla_status}`}>
      {sla_status === 'critical' ? '⚠ ' : '◉ '}{SLA_LABELS[sla_status]}
    </span>
  );
};

export const RoleBadge = ({ role }) => {
  const labels = { admin: 'Admin', technician: 'Técnico', user: 'Usuário' };
  return <span className={`badge badge-${role}`}>{labels[role] || role}</span>;
};
