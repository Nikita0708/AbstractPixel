import { Route, Routes } from "react-router-dom";

import IndexPage from "@/pages/index";
import Docs from "./pages/docs";

function App() {
  return (
    <Routes>
      <Route element={<IndexPage />} path="/" />
      <Route element={<Docs />} path="/docs" />
    </Routes>
  );
}

export default App;
