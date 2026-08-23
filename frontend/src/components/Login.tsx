import React from "react";
import AuthModal from "./AuthModal";

const Login: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#09090b] relative">
      <AuthModal isOpen={true} onClose={() => {}} />
    </div>
  );
};

export default Login;
