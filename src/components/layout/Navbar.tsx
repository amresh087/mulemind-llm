import React from "react";
import { Navbar, Container, Button } from "react-bootstrap";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import LanguageSwitcher from "../LanguageSwitcher";

const AppNavbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <>
      <Navbar bg="dark" variant="dark" expand={false} style={{ flexShrink: 0 }}>
        <Container fluid className="d-flex justify-content-between align-items-center px-3">
          <div className="d-flex align-items-center gap-2 me-auto">
            <div
              style={{
                width: '2.2rem',
                height: '2.2rem',
                borderRadius: '0.8rem',
                background: 'linear-gradient(135deg, #4f46e5 0%, #10b981 100%)',
                color: '#fff',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                letterSpacing: '0.05em',
              }}
            >
              A
            </div>
            <div className="d-flex flex-column" style={{ lineHeight: 1.1 }}>
              <span style={{ fontSize: '1rem', fontWeight: 800, color: '#fff' }}>MuleMind AI</span>
              <small style={{ color: '#cbd5e1', fontSize: '0.68rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                
              </small>
            </div>
          </div>

          <div className="d-flex align-items-center gap-2 ms-auto">
            <LanguageSwitcher />
            {user ? (
              <div className="d-flex align-items-center">
                <span className="text-light me-3">Welcome, {user.username}</span>
                <Button variant="outline-light" size="sm" onClick={handleLogout}>Logout</Button>
              </div>
            ) : (
              <Link to="/login" className="btn btn-outline-light btn-sm">Login</Link>
            )}
          </div>
        </Container>
      </Navbar>
    </>
  );
};

export default AppNavbar;


