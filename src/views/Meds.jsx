import Card from '../components/Card.jsx';
import Tick from '../components/Tick.jsx';
import { MEDICATION_OPTIONS, formatDoseMg } from '../lib/calculations.js';

const SITE_OPTIONS = {
  mounjaro: ['', 'Stomach / abdomen', 'Thigh', 'Back of upper arm with help'],
  wegovy: ['', 'Stomach / abdomen', 'Upper leg / thigh', 'Upper arm'],
  ozempic: ['', 'Stomach / abdomen', 'Thigh', 'Upper arm'],
  saxenda: ['', 'Stomach / abdomen', 'Front of thigh', 'Upper arm'],
  other: ['', 'Stomach / abdomen', 'Thigh', 'Upper arm', 'Other'],
};
const LEVELS = ['', 'Low', 'Medium', 'High'];

export default function Meds({ state, medicationLog, onSaveMedicationLog }) {
  const profile = state.onboardingProfile;
  const medLabel = medicationLabel(profile);
  const siteOptions = SITE_OPTIONS[profile.medicationName] || SITE_OPTIONS.other;
  const history = Object.values(state.medicationLogs || {})
    .filter((log) => log.taken || log.dose || log.sideEffects || log.injectionSite || log.appetiteLevel || log.nauseaLevel)
    .sort((a, b) => String(b.takenAt).localeCompare(String(a.takenAt)))
    .slice(0, 12);

  if (!profile.usesWeightLossMedication || profile.medicationName === 'none') {
    return (
      <Card className="heroCard">
        <div className="label">Medication</div>
        <div className="big">Off</div>
        <p className="note">No weight-loss medication was set up during onboarding. You can update this once profile editing is available.</p>
      </Card>
    );
  }

  return (
    <div className="staggerStack">
      <Card className="heroCard">
        <div className="label">Medication</div>
        <div className="big">{profile.injectionDay.slice(0, 3)}</div>
        <p className="note">
          {medLabel}{profile.medicationDose ? ` · ${formatDoseMg(profile.medicationDose)}` : ''}
          {' '}— injection day is {profile.injectionDay}. Log weight the same morning if you can.
        </p>
        <div className="rows medRows">
          <div className="row">
            <span className="rowText">Taken today</span>
            <Tick checked={medicationLog.taken} label="Toggle medication taken today" onToggle={() => onSaveMedicationLog({ taken: !medicationLog.taken })} />
          </div>
        </div>
      </Card>

      <Card>
        <div className="label">Dose details</div>
        <div className="formGrid">
          <label>
            Dose in mg
            <input
              value={medicationLog.dose}
              onChange={(e) => onSaveMedicationLog({ dose: e.target.value })}
              placeholder={formatDoseMg(profile.medicationDose) || 'e.g. 2.5 mg'}
            />
          </label>
          <label>
            Injection site
            <select value={medicationLog.injectionSite} onChange={(e) => onSaveMedicationLog({ injectionSite: e.target.value })}>
              {siteOptions.map((site) => <option key={site} value={site}>{site || 'Choose a site'}</option>)}
            </select>
          </label>
          <label>
            Appetite today
            <select value={medicationLog.appetiteLevel} onChange={(e) => onSaveMedicationLog({ appetiteLevel: e.target.value })}>
              {LEVELS.map((level) => <option key={level} value={level}>{level || 'Choose'}</option>)}
            </select>
          </label>
          <label>
            Nausea today
            <select value={medicationLog.nauseaLevel} onChange={(e) => onSaveMedicationLog({ nauseaLevel: e.target.value })}>
              {LEVELS.map((level) => <option key={level} value={level}>{level || 'Choose'}</option>)}
            </select>
          </label>
        </div>
        <p className="note">Rotate sites within the allowed areas and follow your prescriber's instructions. The options here adjust to your medication.</p>
      </Card>

      <Card>
        <div className="label">How you're feeling</div>
        <textarea
          value={medicationLog.sideEffects}
          onChange={(e) => onSaveMedicationLog({ sideEffects: e.target.value })}
          placeholder="Nausea, energy, appetite changes, anything worth tracking. If something feels off or severe, call your prescriber — not just a note here."
        />
      </Card>

      <Card>
        <div className="label">Dose history</div>
        <div className="history doseHistory">
          {history.length ? history.map((log) => (
            <div className="historyRow tall" key={log.takenAt}>
              <span><b>{formatDate(log.takenAt)}</b>{log.injectionSite ? ` · ${log.injectionSite}` : ''}</span>
              <span>{formatDoseMg(log.dose || profile.medicationDose) || 'Dose'}</span>
              {log.sideEffects ? <em>{log.sideEffects}</em> : null}
            </div>
          )) : <p className="note">Your previous doses will show up here once you start logging.</p>}
        </div>
      </Card>
    </div>
  );
}

function medicationLabel(profile) {
  if (profile.medicationName === 'other') return profile.medicationOther || 'Other medication';
  return MEDICATION_OPTIONS.find((item) => item.value === profile.medicationName)?.label || 'Medication';
}

function formatDate(value) {
  const [year, month, day] = String(value || '').split('-').map(Number);
  if (!year || !month || !day) return value || 'Date';
  return new Date(year, month - 1, day).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}
