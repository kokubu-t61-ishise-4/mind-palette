import { Chat } from './components/Chat';
import './App.css';

function App() {
  return (
    <div className="app">
      <header className="app-header">
        <h1>MindPalette</h1>
      </header>
      <main className="app-main">
        <Chat />
      </main>
    </div>
  );
}

export default App;
