import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import App, { Protected } from "./App";
import { AuthProvider } from "./auth";
import { Assess } from "./pages/Assess";
import { Dashboard } from "./pages/Dashboard";
import { Landing } from "./pages/Landing";
import { Login } from "./pages/Login";
import { NewSession } from "./pages/NewSession";
import { NotFound } from "./pages/NotFound";
import { Profile } from "./pages/Profile";
import { Progress } from "./pages/Progress";
import { SessionDetail } from "./pages/SessionDetail";
import { Sessions } from "./pages/Sessions";
import { Signup } from "./pages/Signup";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route element={<App />}>
            <Route index element={<Landing />} />
            <Route path="login" element={<Login />} />
            <Route path="signup" element={<Signup />} />
            <Route path="assess/:token" element={<Assess />} />
            <Route path="app" element={<Protected />}>
              <Route index element={<Dashboard />} />
              <Route path="sessions" element={<Sessions />} />
              <Route path="sessions/new" element={<NewSession />} />
              <Route path="sessions/:id" element={<SessionDetail />} />
              <Route path="progress" element={<Progress />} />
              <Route path="profile" element={<Profile />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
