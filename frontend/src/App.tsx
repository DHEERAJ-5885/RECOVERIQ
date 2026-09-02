import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { DashboardLayout } from './layouts/DashboardLayout'
import { Overview } from './pages/Overview'
import { Risk } from './pages/Risk'
import { Queue } from './pages/Queue'
import { CaseDetail } from './pages/CaseDetail'
import { Policies } from './pages/Policies'
import { Escalations } from './pages/Escalations'
import { Audit } from './pages/Audit'
import { Analytics } from './pages/Analytics'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<DashboardLayout />}>
          <Route path="/" element={<Overview />} />
          <Route path="/risk" element={<Risk />} />
          <Route path="/queue" element={<Queue />} />
          <Route path="/queue/:id" element={<CaseDetail />} />
          <Route path="/policies" element={<Policies />} />
          <Route path="/escalations" element={<Escalations />} />
          <Route path="/audit" element={<Audit />} />
          <Route path="/analytics" element={<Analytics />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
