import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth, AuthUser } from "../contexts/AuthContext";

const Login: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleAppleLogin = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/v1/auth/apple", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identityToken: "demo-token",
          name: "Demo User",
        }),
      });

      const data = (await response.json()) as { token: string; sessionId?: string; user: AuthUser; error?: string };

      if (response.ok) {
        login(data.token, data.sessionId || `session-${Date.now()}`, data.user);
        navigate("/arena");
      } else {
        setError(data.error ?? "Đăng nhập thất bại");
      }
    } catch {
      setError("Lỗi kết nối. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = () => {
    // Demo mode: just navigate, AuthContext already has demo user
    navigate("/arena");
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <div className="login-logo">🎯</div>
        <h1>AI Debate Master</h1>
        <p>Luyện tập kỹ năng tranh luận với AI</p>

        <button
          onClick={handleAppleLogin}
          className="apple-login-btn"
          disabled={loading}
          type="button"
        >
          {loading ? "⏳ Đang đăng nhập..." : "🍎 Đăng nhập với Apple"}
        </button>

        <div className="divider">
          <span>hoặc</span>
        </div>

        <button
          onClick={handleDemoLogin}
          className="demo-login-btn"
          type="button"
        >
          🚀 Dùng thử ngay (miễn phí)
        </button>

        {error && <div className="error-message">{error}</div>}

        <div className="login-footer">
          <small>Demo: Không cần đăng nhập thực tế — dữ liệu được lưu tự động</small>
        </div>
      </div>
    </div>
  );
};

export default Login;
