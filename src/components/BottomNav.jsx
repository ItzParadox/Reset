const TABS = [
  { id: 'home', label: 'Home', icon: HomeIcon },
  { id: 'today', label: 'Today', icon: CheckIcon },
  { id: 'water', label: 'Water', icon: WaterIcon },
  { id: 'weight', label: 'Weight', icon: WeightIcon },
  { id: 'food', label: 'Plan', icon: PlanIcon },
  { id: 'meds', label: 'Meds', icon: MedsIcon },
  { id: 'settings', label: 'User', icon: UserIcon },
];

export default function BottomNav({ activeTab, onChange, showMeds = true }) {
  const tabs = showMeds ? TABS : TABS.filter((tab) => tab.id !== 'meds');

  return (
    <nav className="nav" aria-label="Main navigation">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            className={activeTab === tab.id ? 'active' : ''}
            onClick={() => onChange(tab.id)}
            type="button"
          >
            <span className="icon" aria-hidden="true"><Icon /></span>
            {tab.label}
          </button>
        );
      })}
    </nav>
  );
}

function HomeIcon() {
  return <svg className="navSvgIcon" viewBox="0 0 24 24"><path d="M4 11.4 12 5l8 6.4" /><path d="M6.5 10.8v8h11v-8" /></svg>;
}

function CheckIcon() {
  return <svg className="navSvgIcon" viewBox="0 0 24 24"><path d="m5 12.5 4.2 4.2L19 7" /></svg>;
}

function WeightIcon() {
  return <svg className="navSvgIcon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="7" /><path d="M9 9.3c1.8-1 4.2-1 6 0" /></svg>;
}

function WaterIcon() {
  return <svg className="navSvgIcon" viewBox="0 0 24 24"><path d="M9 3h6" /><path d="M10 6h4l1.4 3.2v9.3c0 1.1-.9 2-2 2h-2.8c-1.1 0-2-.9-2-2V9.2L10 6z" /><path d="M9 14.2c1.8-1 4.2 1 6 0" /></svg>;
}

function PlanIcon() {
  return <svg className="navSvgIcon" viewBox="0 0 24 24"><path d="M7 5h10" /><path d="M7 12h10" /><path d="M7 19h10" /></svg>;
}

function MedsIcon() {
  return <svg className="navSvgIcon" viewBox="0 0 24 24"><path d="M10 5h4v14h-4z" /><path d="M5 10h14v4H5z" /></svg>;
}

function UserIcon() {
  return <svg className="navSvgIcon" viewBox="0 0 24 24"><circle cx="12" cy="8" r="3.4" /><path d="M5.8 19.2c.8-3.2 3-5 6.2-5s5.4 1.8 6.2 5" /></svg>;
}
