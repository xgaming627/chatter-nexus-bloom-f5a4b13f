import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Auto-delete disabled to preserve all conversations
// import { initializeChatCleanup } from './utils/chatCleanup'
// initializeChatCleanup();

createRoot(document.getElementById("root")!).render(<App />);
