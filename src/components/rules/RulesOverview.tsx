import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { colors, typography, spacing, statusColors } from '../../designTokens';
import { programs, getStatusCount } from '../../data/programs';
import type { CoverageStatus, Program } from '../../types/Program';

const ALL_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','DC','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM',
  'NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA',
  'WV','WI','WY',
];

const STATE_NAMES: Record<string, string> = {
  AL:'Alabama',AK:'Alaska',AZ:'Arizona',AR:'Arkansas',CA:'California',CO:'Colorado',
  CT:'Connecticut',DE:'Delaware',DC:'District of Columbia',FL:'Florida',GA:'Georgia',
  HI:'Hawaii',ID:'Idaho',IL:'Illinois',IN:'Indiana',IA:'Iowa',KS:'Kansas',KY:'Kentucky',
  LA:'Louisiana',ME:'Maine',MD:'Maryland',MA:'Massachusetts',MI:'Michigan',MN:'Minnesota',
  MS:'Mississippi',MO:'Missouri',MT:'Montana',NE:'Nebraska',NV:'Nevada',NH:'New Hampshire',
  NJ:'New Jersey',NM:'New Mexico',NY:'New York',NC:'North Carolina',ND:'North Dakota',
  OH:'Ohio',OK:'Oklahoma',OR:'Oregon',PA:'Pennsylvania',RI:'Rhode Island',SC:'South Carolina',
  SD:'South Dakota',TN:'Tennessee',TX:'Texas',UT:'Utah',VT:'Vermont',VA:'Virginia',
  WA:'Washington',WV:'West Virginia',WI:'Wisconsin',WY:'Wyoming',
};

const UNIVERSAL_STATE_PROGRAMS = new Set([
  'snap','tanf','medicaid','wic','state_income_tax','medicare',
  'aca_subsidies','payroll_taxes','school_meals','csfp','chip',
]);

const statusLabels: Record<CoverageStatus, string> = {
  complete: 'Complete',
  partial: 'Partial',
  inProgress: 'In progress',
  notStarted: 'Not started',
};

const statusIcons: Record<CoverageStatus, string> = {
  complete: '\u2713',
  partial: '\u25D1',
  inProgress: '\u21BB',
  notStarted: '\u25CB',
};

function StatusDot({ status, size = 10 }: { status: CoverageStatus; size?: number }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size,
        height: size,
        borderRadius: '50%',
        backgroundColor: statusColors[status],
        color: status === 'complete' || status === 'partial' ? colors.white : colors.gray[600],
        fontSize: size * 0.7,
        lineHeight: 1,
      }}
    >
      {size >= 14 ? statusIcons[status] : ''}
    </span>
  );
}

function StatCard({ label, count, color, delay }: { label: string; count: number; color: string; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, delay }}
      style={{
        flex: 1,
        minWidth: '120px',
        padding: spacing.xl,
        borderRadius: spacing.radius.xl,
        border: `1px solid ${colors.border.light}`,
        backgroundColor: colors.white,
        textAlign: 'center',
      }}
    >
      <div style={{ fontSize: typography.fontSize['3xl'], fontWeight: typography.fontWeight.bold, color, marginBottom: spacing.xs }}>{count}</div>
      <div style={{ fontSize: typography.fontSize.xs, color: colors.text.secondary, fontWeight: typography.fontWeight.medium }}>{label}</div>
    </motion.div>
  );
}

function getStateStatusForProgram(program: Program, stateCode: string): CoverageStatus | null {
  if (program.agency === 'State') {
    return program.coverage === stateCode ? program.status : null;
  }
  if (program.agency === 'Local') {
    const localToState: Record<string, string> = {
      'Chicago': 'IL', 'Dallas County': 'TX', 'Dallas County, TX': 'TX',
      'Harris County': 'TX', 'Harris County, TX': 'TX',
      'Los Angeles County': 'CA', 'Riverside County': 'CA',
      'Alameda County': 'CA', 'San Francisco': 'CA',
      'New York City': 'NY', 'Montgomery County': 'MD', 'Montgomery County, MD': 'MD',
    };
    return localToState[program.coverage || ''] === stateCode ? program.status : null;
  }
  if (program.stateImplementations) {
    const impl = program.stateImplementations.find(s => s.state === stateCode);
    if (impl) return impl.status;
    if (UNIVERSAL_STATE_PROGRAMS.has(program.id)) return program.status;
    return null;
  }
  if (program.hasStateVariation || UNIVERSAL_STATE_PROGRAMS.has(program.id)) {
    return program.status;
  }
  return null;
}

type ViewMode = 'programs' | 'states';

function ProgramDetailPanel({ program, onClose }: { program: Program; onClose: () => void }) {
  const stateStatuses = useMemo(() => {
    const result: { state: string; status: CoverageStatus; name?: string }[] = [];
    for (const st of ALL_STATES) {
      const status = getStateStatusForProgram(program, st);
      if (status !== null) {
        const impl = program.stateImplementations?.find(s => s.state === st);
        result.push({ state: st, status, name: impl?.name });
      }
    }
    return result;
  }, [program]);

  const statePrograms = programs.filter(
    p => (p.agency === 'State' || p.agency === 'Local') && p.id !== program.id
  );
  const relatedStatePrograms = statePrograms.filter(p => {
    for (const st of ALL_STATES) {
      if (getStateStatusForProgram(p, st) !== null && stateStatuses.some(s => s.state === st)) return true;
    }
    return false;
  });
  void relatedStatePrograms;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      style={{
        padding: spacing['2xl'],
        borderRadius: spacing.radius.xl,
        border: `1px solid ${colors.border.light}`,
        backgroundColor: colors.white,
        boxShadow: spacing.shadow.md,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.xl }}>
        <div>
          <h3 style={{ fontSize: typography.fontSize['2xl'], fontWeight: typography.fontWeight.bold, color: colors.primary[900], margin: 0 }}>
            {program.name}
          </h3>
          {program.fullName && program.fullName !== program.name && (
            <div style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary, marginTop: spacing.xs }}>{program.fullName}</div>
          )}
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', color: colors.text.tertiary, padding: spacing.sm }}>
          ✕
        </button>
      </div>

      <div style={{ display: 'flex', gap: spacing.lg, flexWrap: 'wrap', marginBottom: spacing.xl }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
          <StatusDot status={program.status} size={14} />
          <span style={{ fontSize: typography.fontSize.sm, color: statusColors[program.status], fontWeight: typography.fontWeight.semibold }}>
            {statusLabels[program.status]}
          </span>
        </div>
        {program.agency && (
          <span style={{ fontSize: typography.fontSize.xs, color: colors.text.tertiary, backgroundColor: colors.gray[100], padding: `2px ${spacing.sm}`, borderRadius: spacing.radius.sm }}>
            {program.agency}
          </span>
        )}
        {program.variable && (
          <a
            href={`https://policyengine.github.io/flowchart/?variable=${program.variable}&country=US`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize: typography.fontSize.xs, color: colors.primary[600], textDecoration: 'none' }}
          >
            View computation tree →
          </a>
        )}
      </div>

      {program.notes && (
        <div style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary, marginBottom: spacing.xl, borderLeft: `3px solid ${colors.primary[200]}`, paddingLeft: spacing.md, fontStyle: 'italic' }}>
          {program.notes}
        </div>
      )}

      {/* GitHub links */}
      {(program.githubLinks.parameters || program.githubLinks.variables || program.githubLinks.tests) && (
        <div style={{ display: 'flex', gap: spacing.md, marginBottom: spacing.xl, flexWrap: 'wrap' }}>
          {program.githubLinks.parameters && (
            <a href={program.githubLinks.parameters} target="_blank" rel="noopener noreferrer" style={{ fontSize: typography.fontSize.xs, color: colors.primary[600], textDecoration: 'none', padding: `${spacing.xs} ${spacing.md}`, border: `1px solid ${colors.primary[200]}`, borderRadius: spacing.radius.md }}>
              Parameters
            </a>
          )}
          {program.githubLinks.variables && (
            <a href={program.githubLinks.variables} target="_blank" rel="noopener noreferrer" style={{ fontSize: typography.fontSize.xs, color: colors.primary[600], textDecoration: 'none', padding: `${spacing.xs} ${spacing.md}`, border: `1px solid ${colors.primary[200]}`, borderRadius: spacing.radius.md }}>
              Variables
            </a>
          )}
          {program.githubLinks.tests && (
            <a href={program.githubLinks.tests} target="_blank" rel="noopener noreferrer" style={{ fontSize: typography.fontSize.xs, color: colors.primary[600], textDecoration: 'none', padding: `${spacing.xs} ${spacing.md}`, border: `1px solid ${colors.primary[200]}`, borderRadius: spacing.radius.md }}>
              Tests
            </a>
          )}
        </div>
      )}

      {/* State coverage grid */}
      {stateStatuses.length > 0 && (
        <div>
          <h4 style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold, color: colors.text.primary, marginBottom: spacing.md }}>
            State coverage ({stateStatuses.filter(s => s.status === 'complete').length} / {stateStatuses.length} complete)
          </h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
            {stateStatuses.map(({ state, status, name }) => (
              <div
                key={state}
                title={name ? `${STATE_NAMES[state]}: ${name} (${statusLabels[status]})` : `${STATE_NAMES[state]}: ${statusLabels[status]}`}
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: spacing.radius.sm,
                  backgroundColor: statusColors[status],
                  color: status === 'notStarted' ? colors.gray[600] : colors.white,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '10px',
                  fontWeight: typography.fontWeight.bold,
                  fontFamily: typography.fontFamily.primary,
                  cursor: 'default',
                  opacity: status === 'notStarted' ? 0.5 : 1,
                }}
              >
                {state}
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}

function StateDetailPanel({ stateCode, onClose }: { stateCode: string; onClose: () => void }) {
  const statePrograms = useMemo(() => {
    const result: { program: Program; status: CoverageStatus; localName?: string }[] = [];
    for (const p of programs) {
      const status = getStateStatusForProgram(p, stateCode);
      if (status !== null) {
        const impl = p.stateImplementations?.find(s => s.state === stateCode);
        result.push({ program: p, status, localName: impl?.name });
      }
    }
    return result;
  }, [stateCode]);

  const complete = statePrograms.filter(p => p.status === 'complete').length;
  const total = statePrograms.length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      style={{
        padding: spacing['2xl'],
        borderRadius: spacing.radius.xl,
        border: `1px solid ${colors.border.light}`,
        backgroundColor: colors.white,
        boxShadow: spacing.shadow.md,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.xl }}>
        <div>
          <h3 style={{ fontSize: typography.fontSize['2xl'], fontWeight: typography.fontWeight.bold, color: colors.primary[900], margin: 0 }}>
            {STATE_NAMES[stateCode]} ({stateCode})
          </h3>
          <div style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary, marginTop: spacing.xs }}>
            {complete} of {total} programs complete
          </div>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', color: colors.text.tertiary, padding: spacing.sm }}>
          ✕
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
        {statePrograms.map(({ program, status, localName }) => (
          <div
            key={program.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: spacing.md,
              padding: `${spacing.sm} ${spacing.md}`,
              borderRadius: spacing.radius.md,
              backgroundColor: colors.gray[50],
            }}
          >
            <StatusDot status={status} size={12} />
            <div style={{ flex: 1 }}>
              <span style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.medium, color: colors.text.primary }}>
                {program.name}
              </span>
              {localName && localName !== program.name && (
                <span style={{ fontSize: typography.fontSize.xs, color: colors.text.tertiary, marginLeft: spacing.sm }}>
                  ({localName})
                </span>
              )}
            </div>
            <span style={{ fontSize: typography.fontSize.xs, color: statusColors[status], fontWeight: typography.fontWeight.medium }}>
              {statusLabels[status]}
            </span>
            {program.variable && (
              <a
                href={`https://policyengine.github.io/flowchart/?variable=${program.variable}&country=US`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: typography.fontSize.xs, color: colors.primary[500], textDecoration: 'none' }}
              >
                ↗
              </a>
            )}
          </div>
        ))}
      </div>
    </motion.div>
  );
}

export default function RulesOverview() {
  const [viewMode, setViewMode] = useState<ViewMode>('programs');
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const counts = getStatusCount();
  const total = programs.length;

  const federalPrograms = useMemo(() =>
    programs.filter(p => p.agency !== 'State' && p.agency !== 'Local'),
  []);
  const stateOnlyPrograms = useMemo(() =>
    programs.filter(p => p.agency === 'State'),
  []);
  const localPrograms = useMemo(() =>
    programs.filter(p => p.agency === 'Local'),
  []);

  const filteredFederal = useMemo(() => {
    if (!search) return federalPrograms;
    const q = search.toLowerCase();
    return federalPrograms.filter(p =>
      p.name.toLowerCase().includes(q) || p.fullName.toLowerCase().includes(q) || (p.notes || '').toLowerCase().includes(q)
    );
  }, [federalPrograms, search]);

  const filteredState = useMemo(() => {
    if (!search) return stateOnlyPrograms;
    const q = search.toLowerCase();
    return stateOnlyPrograms.filter(p =>
      p.name.toLowerCase().includes(q) || p.fullName.toLowerCase().includes(q) || (p.coverage || '').toLowerCase().includes(q)
    );
  }, [stateOnlyPrograms, search]);

  const filteredLocal = useMemo(() => {
    if (!search) return localPrograms;
    const q = search.toLowerCase();
    return localPrograms.filter(p =>
      p.name.toLowerCase().includes(q) || p.fullName.toLowerCase().includes(q) || (p.coverage || '').toLowerCase().includes(q)
    );
  }, [localPrograms, search]);

  const stateCompleteness = useMemo(() => {
    return ALL_STATES.map(st => {
      let complete = 0;
      let total = 0;
      for (const p of programs) {
        const status = getStateStatusForProgram(p, st);
        if (status !== null) {
          total++;
          if (status === 'complete') complete++;
        }
      }
      return { state: st, complete, total, pct: total > 0 ? complete / total : 0 };
    }).sort((a, b) => b.pct - a.pct);
  }, []);

  return (
    <div>
      {/* Summary stats */}
      <div style={{ display: 'flex', gap: spacing.md, flexWrap: 'wrap', marginBottom: spacing['3xl'] }}>
        <StatCard label="Total programs" count={total} color={colors.primary[900]} delay={0} />
        <StatCard label="Complete" count={counts.complete} color={statusColors.complete} delay={0.1} />
        <StatCard label="Partial" count={counts.partial} color={statusColors.partial} delay={0.15} />
        <StatCard label="In progress" count={counts.inProgress} color={statusColors.inProgress} delay={0.2} />
      </div>

      {/* View mode toggle + search */}
      <div style={{ display: 'flex', gap: spacing.lg, alignItems: 'center', marginBottom: spacing['2xl'], flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', borderRadius: spacing.radius.lg, overflow: 'hidden', border: `1px solid ${colors.border.light}` }}>
          {(['programs', 'states'] as ViewMode[]).map(mode => (
            <button
              key={mode}
              onClick={() => { setViewMode(mode); setSelectedProgram(null); setSelectedState(null); }}
              style={{
                padding: `${spacing.sm} ${spacing.xl}`,
                border: 'none',
                backgroundColor: viewMode === mode ? colors.primary[500] : colors.white,
                color: viewMode === mode ? colors.white : colors.text.secondary,
                fontSize: typography.fontSize.sm,
                fontWeight: typography.fontWeight.semibold,
                fontFamily: typography.fontFamily.primary,
                cursor: 'pointer',
              }}
            >
              {mode === 'programs' ? 'By program' : 'By state'}
            </button>
          ))}
        </div>
        <input
          type="text"
          placeholder="Search programs..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            padding: `${spacing.sm} ${spacing.lg}`,
            borderRadius: spacing.radius.lg,
            border: `1px solid ${colors.border.light}`,
            fontSize: typography.fontSize.sm,
            fontFamily: typography.fontFamily.primary,
            outline: 'none',
            flex: 1,
            minWidth: '200px',
            maxWidth: '400px',
          }}
        />
        {/* Legend */}
        <div style={{ display: 'flex', gap: spacing.lg, flexWrap: 'wrap' }}>
          {(Object.keys(statusLabels) as CoverageStatus[]).map(status => (
            <div key={status} style={{ display: 'flex', alignItems: 'center', gap: spacing.xs }}>
              <StatusDot status={status} size={10} />
              <span style={{ fontSize: typography.fontSize.xs, color: colors.text.tertiary }}>{statusLabels[status]}</span>
            </div>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {viewMode === 'programs' ? (
          <motion.div key="programs" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {/* Selected program detail */}
            {selectedProgram && (
              <div style={{ marginBottom: spacing['2xl'] }}>
                <ProgramDetailPanel program={selectedProgram} onClose={() => setSelectedProgram(null)} />
              </div>
            )}

            {/* Federal programs */}
            {filteredFederal.length > 0 && (
              <div style={{ marginBottom: spacing['3xl'] }}>
                <h3 style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.semibold, color: colors.primary[800], marginBottom: spacing.lg, paddingBottom: spacing.sm, borderBottom: `2px solid ${colors.primary[100]}` }}>
                  Federal programs ({filteredFederal.length})
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: spacing.md }}>
                  {filteredFederal.map(program => (
                    <button
                      key={program.id}
                      onClick={() => setSelectedProgram(selectedProgram?.id === program.id ? null : program)}
                      style={{
                        padding: spacing.lg,
                        borderRadius: spacing.radius.lg,
                        border: `1px solid ${selectedProgram?.id === program.id ? colors.primary[400] : colors.border.light}`,
                        backgroundColor: selectedProgram?.id === program.id ? colors.primary[50] : colors.white,
                        cursor: 'pointer',
                        textAlign: 'left',
                        fontFamily: typography.fontFamily.primary,
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: spacing.md }}>
                        <div style={{ paddingTop: '3px' }}><StatusDot status={program.status} /></div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold, color: colors.text.primary }}>
                            {program.name}
                          </div>
                          {program.fullName && program.fullName !== program.name && (
                            <div style={{ fontSize: typography.fontSize.xs, color: colors.text.tertiary, marginTop: '2px' }}>{program.fullName}</div>
                          )}
                          {program.stateImplementations && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px', marginTop: spacing.sm }}>
                              {program.stateImplementations.slice(0, 12).map(impl => (
                                <span
                                  key={impl.state}
                                  style={{
                                    fontSize: '9px',
                                    fontWeight: typography.fontWeight.bold,
                                    padding: '1px 3px',
                                    borderRadius: '2px',
                                    backgroundColor: statusColors[impl.status],
                                    color: impl.status === 'notStarted' ? colors.gray[600] : colors.white,
                                    opacity: impl.status === 'notStarted' ? 0.5 : 1,
                                  }}
                                >
                                  {impl.state}
                                </span>
                              ))}
                              {(program.stateImplementations.length > 12) && (
                                <span style={{ fontSize: '9px', color: colors.text.tertiary }}>+{program.stateImplementations.length - 12}</span>
                              )}
                            </div>
                          )}
                          {program.hasStateVariation && !program.stateImplementations && (
                            <div style={{ fontSize: typography.fontSize.xs, color: colors.primary[500], marginTop: spacing.xs }}>All states</div>
                          )}
                        </div>
                        <div style={{ fontSize: typography.fontSize.xs, color: statusColors[program.status], fontWeight: typography.fontWeight.medium, whiteSpace: 'nowrap' }}>
                          {statusLabels[program.status]}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* State-only programs */}
            {filteredState.length > 0 && (
              <div style={{ marginBottom: spacing['3xl'] }}>
                <h3 style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.semibold, color: colors.primary[800], marginBottom: spacing.lg, paddingBottom: spacing.sm, borderBottom: `2px solid ${colors.primary[100]}` }}>
                  State programs ({filteredState.length})
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: spacing.md }}>
                  {filteredState.map(program => (
                    <button
                      key={program.id}
                      onClick={() => setSelectedProgram(selectedProgram?.id === program.id ? null : program)}
                      style={{
                        padding: spacing.lg,
                        borderRadius: spacing.radius.lg,
                        border: `1px solid ${selectedProgram?.id === program.id ? colors.primary[400] : colors.border.light}`,
                        backgroundColor: selectedProgram?.id === program.id ? colors.primary[50] : colors.white,
                        cursor: 'pointer',
                        textAlign: 'left',
                        fontFamily: typography.fontFamily.primary,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: spacing.md }}>
                        <div style={{ paddingTop: '3px' }}><StatusDot status={program.status} /></div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold, color: colors.text.primary }}>{program.name}</div>
                          {program.coverage && <div style={{ fontSize: typography.fontSize.xs, color: colors.text.tertiary, marginTop: '2px' }}>{program.coverage}</div>}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Local programs */}
            {filteredLocal.length > 0 && (
              <div>
                <h3 style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.semibold, color: colors.primary[800], marginBottom: spacing.lg, paddingBottom: spacing.sm, borderBottom: `2px solid ${colors.primary[100]}` }}>
                  Local programs ({filteredLocal.length})
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: spacing.md }}>
                  {filteredLocal.map(program => (
                    <button
                      key={program.id}
                      onClick={() => setSelectedProgram(selectedProgram?.id === program.id ? null : program)}
                      style={{
                        padding: spacing.lg,
                        borderRadius: spacing.radius.lg,
                        border: `1px solid ${selectedProgram?.id === program.id ? colors.primary[400] : colors.border.light}`,
                        backgroundColor: selectedProgram?.id === program.id ? colors.primary[50] : colors.white,
                        cursor: 'pointer',
                        textAlign: 'left',
                        fontFamily: typography.fontFamily.primary,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: spacing.md }}>
                        <div style={{ paddingTop: '3px' }}><StatusDot status={program.status} /></div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold, color: colors.text.primary }}>{program.name}</div>
                          {program.coverage && <div style={{ fontSize: typography.fontSize.xs, color: colors.text.tertiary, marginTop: '2px' }}>{program.coverage}</div>}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div key="states" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {/* Selected state detail */}
            {selectedState && (
              <div style={{ marginBottom: spacing['2xl'] }}>
                <StateDetailPanel stateCode={selectedState} onClose={() => setSelectedState(null)} />
              </div>
            )}

            {/* State grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: spacing.sm }}>
              {stateCompleteness.map(({ state, complete, total, pct }) => (
                <button
                  key={state}
                  onClick={() => setSelectedState(selectedState === state ? null : state)}
                  style={{
                    padding: spacing.md,
                    borderRadius: spacing.radius.lg,
                    border: `2px solid ${selectedState === state ? colors.primary[500] : colors.border.light}`,
                    backgroundColor: selectedState === state ? colors.primary[50] : colors.white,
                    cursor: 'pointer',
                    textAlign: 'center',
                    fontFamily: typography.fontFamily.primary,
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.bold, color: colors.primary[800] }}>{state}</div>
                  <div style={{
                    width: '100%',
                    height: '4px',
                    borderRadius: '2px',
                    backgroundColor: colors.gray[200],
                    margin: `${spacing.sm} 0`,
                    overflow: 'hidden',
                  }}>
                    <div style={{
                      width: `${pct * 100}%`,
                      height: '100%',
                      borderRadius: '2px',
                      backgroundColor: pct === 1 ? statusColors.complete : pct > 0.5 ? colors.primary[400] : colors.primary[300],
                    }} />
                  </div>
                  <div style={{ fontSize: typography.fontSize.xs, color: colors.text.tertiary }}>{complete}/{total}</div>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
