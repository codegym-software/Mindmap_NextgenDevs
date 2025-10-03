import { useState, useEffect } from 'react';
import Login from './components/Login.jsx';
import Dashboard from './components/Dashboard';
import MindmapEditorWrapper from './components/MindmapEditor/MindmapEditorWrapper';
import './App.css';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [showLogin, setShowLogin] = useState(false);
  const [showEditor, setShowEditor] = useState(true);

  // Kiểm tra token khi component mount
  useEffect(() => {
    const token = localStorage.getItem('cognito_token');
    if (token) {
      setIsLoggedIn(true);
      const storedUser = localStorage.getItem('user_data');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
        setShowLogin(false);
        setShowEditor(false); // Nếu đã đăng nhập, ưu tiên hiển thị Dashboard
      }
    }
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
    localStorage.setItem('user_data', JSON.stringify(userData)); // Lưu thông tin user
    setIsLoggedIn(true);
    setShowLogin(false);
    setShowEditor(false);
  };

  const handleLogout = () => {
    setUser(null);
    setIsLoggedIn(false);
    localStorage.removeItem('cognito_token');
    localStorage.removeItem('user_data');
    setShowLogin(true);
    setShowEditor(false);
  };

  const handleRequireLogin = () => {
    setShowLogin(true);
    setShowEditor(false);
  };

  const handleBackToEditor = () => {
    setShowLogin(false);
    setShowEditor(true);
  };

  return (
      <div className="App" style={{ height: '100vh', width: '100vw', margin: 0, padding: 0, overflow: 'hidden' }}>
        {isLoggedIn ? (
            <Dashboard user={user} onLogout={handleLogout} />
        ) : showLogin ? (
            <Login onLogin={handleLogin} onBack={handleBackToEditor} />
        ) : showEditor ? (
            <MindmapEditorWrapper onRequireLogin={handleRequireLogin} isLoggedIn={isLoggedIn} />
        ) : (
            <Login onLogin={handleLogin} onBack={handleBackToEditor} />
        )}
      </div>
  );
}

export default App;