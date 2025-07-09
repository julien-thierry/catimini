import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import "./App.css";
import ImageViewer from "./ImageViewer";

function App() {
  return (
    <main className="container">
      <h1>Welcome to Catimini</h1>
      <div className="imgviewercontainer">
        <ImageViewer/>
      </div>
    </main>
  );
}

export default App;
