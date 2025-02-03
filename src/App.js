import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Route, Routes, Navigate, useLocation } from "react-router-dom";
import Preloader from "../src/components/Pre";
import Camera from "./components/Camera/Camera";
import ScrollToTop from "./components/ScrollToTop";
import "./style.css";
import "./App.css";
import "bootstrap/dist/css/bootstrap.min.css";

const AppContent = () => {
  const location = useLocation();
  const isCamera = location.pathname === '/camera';

  return (
    <>
     <ScrollToTop />
      <Routes>
        <Route path="/" element={<Camera />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </>
  );
};

function App() {
  const [load, updateLoad] = useState(true);
  useEffect(() => {
    const timer = setTimeout(() => {
      updateLoad(false);
    }, 1200);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Router>
      <Preloader load={load} />
      <div className="App" id={load ? "no-scroll" : "scroll"}>
        <AppContent />
      </div>
    </Router>
  );
}

export default App;