import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import ClientList from './pages/ClientList';
import ClientForm from './pages/ClientForm';
import POList from './pages/POList';
import PODetail from './pages/PODetail';
import POForm from './pages/POForm';
import SJList from './pages/SJList';
import SJForm from './pages/SJForm';
import SJDetail from './pages/SJDetail';
import InvoiceList from './pages/InvoiceList';
import InvoiceForm from './pages/InvoiceForm';
import TandaTerimaList from './pages/TandaTerimaList';
import TandaTerimaForm from './pages/TandaTerimaForm';
import Laporan from './pages/Laporan';
import RiwayatPO from './pages/RiwayatPO';

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/client" element={<ClientList />} />
        <Route path="/client/baru" element={<ClientForm />} />
        <Route path="/client/:id/edit" element={<ClientForm />} />
        <Route path="/po" element={<POList />} />
        <Route path="/po/baru" element={<POForm />} />
        <Route path="/po/:id" element={<PODetail />} />
        <Route path="/po/:id/edit" element={<POForm />} />
        <Route path="/surat-jalan" element={<SJList />} />
        <Route path="/surat-jalan/baru" element={<SJForm />} />
        <Route path="/surat-jalan/:id/edit" element={<SJForm />} />
        <Route path="/surat-jalan/:id" element={<SJDetail />} />
        <Route path="/invoice" element={<InvoiceList />} />
        <Route path="/invoice/baru" element={<InvoiceForm />} />
        <Route path="/invoice/:id/edit" element={<InvoiceForm />} />
        <Route path="/tanda-terima" element={<TandaTerimaList />} />
        <Route path="/tanda-terima/baru" element={<TandaTerimaForm />} />
        <Route path="/tanda-terima/:id/edit" element={<TandaTerimaForm />} />
        <Route path="/laporan" element={<Laporan />} />
        <Route path="/riwayat" element={<RiwayatPO />} />
      </Routes>
    </Layout>
  );
}
