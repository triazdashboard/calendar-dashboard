// icons.jsx — minimal lucide-style stroke icons used by the dashboard.
// Exported globally so the babel app script can pick them up.

const Icon = ({ children, className = 'h-4 w-4', strokeWidth = 1.75, ...rest }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
       strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
       className={className} {...rest}>{children}</svg>
)

const Calendar = (p) => (<Icon {...p}><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></Icon>)
const CalendarDays = (p) => (<Icon {...p}><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01"/></Icon>)
const CalendarRange = (p) => (<Icon {...p}><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18M17 14h-5M9 18h-3"/></Icon>)
const Clock = (p) => (<Icon {...p}><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></Icon>)
const ChevronLeft = (p) => (<Icon {...p}><path d="M15 18l-6-6 6-6"/></Icon>)
const ChevronRight = (p) => (<Icon {...p}><path d="M9 6l6 6-6 6"/></Icon>)
const LogOut = (p) => (<Icon {...p}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></Icon>)
const Building2 = (p) => (<Icon {...p}><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2M10 6h4M10 10h4M10 14h4M10 18h4"/></Icon>)
const RefreshCw = (p) => (<Icon {...p}><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M3 21v-5h5"/></Icon>)
const X = (p) => (<Icon {...p}><path d="M18 6L6 18M6 6l12 12"/></Icon>)
const AlertCircle = (p) => (<Icon {...p}><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></Icon>)
const Loader2 = (p) => (<Icon {...p}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></Icon>)
const Moon = (p) => (<Icon {...p}><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></Icon>)
const Filter = (p) => (<Icon {...p}><path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"/></Icon>)

Object.assign(window, {
  Calendar, CalendarDays, CalendarRange, Clock,
  ChevronLeft, ChevronRight, LogOut, Building2,
  RefreshCw, X, AlertCircle, Loader2, Moon, Filter,
})
