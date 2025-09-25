import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { initializeChatCleanup } from './utils/chatCleanup'

// Initialize chat cleanup on app start
initializeChatCleanup();

createRoot(document.getElementById("root")!).render(<App />);
