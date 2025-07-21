import { useState } from "react";
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
