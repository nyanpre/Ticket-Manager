import { HashRouter, Routes, Route } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { JoinPage } from './pages/JoinPage';
import { GroupDashboard } from './pages/GroupDashboard';

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/join" element={<JoinPage />} />
        <Route path="/group/:groupId" element={<GroupDashboard />} />
      </Routes>
    </HashRouter>
  );
}