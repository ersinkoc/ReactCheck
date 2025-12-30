import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from '@/components/layout';
import {
  HomePage,
  DocsPage,
  CLIPage,
  APIPage,
  FixesPage,
  ExamplesPage,
} from '@/pages';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="docs" element={<DocsPage />} />
          <Route path="cli" element={<CLIPage />} />
          <Route path="api" element={<APIPage />} />
          <Route path="fixes" element={<FixesPage />} />
          <Route path="examples" element={<ExamplesPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
