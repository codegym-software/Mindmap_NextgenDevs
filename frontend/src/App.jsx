import { useState, useEffect } from 'react';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import './App.css';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);

  // Kiểm tra token khi component mount
  useEffect(() => {
    const token = localStorage.getItem('cognito_token');
    if (token) {
      // Nếu có token, coi như đã login (có thể thêm kiểm tra token hợp lệ nếu cần)
      setIsLoggedIn(true);
      // Lấy thông tin user từ token (tùy chọn, nếu cần)
      const storedUser = localStorage.getItem('user_data');
      if (storedUser) setUser(JSON.parse(storedUser));
    }
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
    localStorage.setItem('user_data', JSON.stringify(userData)); // Lưu thông tin user
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    setUser(null);
    setIsLoggedIn(false);
    localStorage.removeItem('cognito_token'); // Xóa token khi logout
    localStorage.removeItem('user_data'); // Xóa dữ liệu user
  };

  return (
      <div className="App" style={{ height: '100vh', width: '100vw', margin: 0, padding: 0, overflow: 'hidden' }}>
        {isLoggedIn ? (
            <Dashboard user={user} onLogout={handleLogout} />
        ) : (
            <Login onLogin={handleLogin} />
        )}
      </div>
  );
}

export default App;