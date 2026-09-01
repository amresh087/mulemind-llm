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
      <Navbar bg="dark" variant="dark" expand={false}>
        <Container className="d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center">
            <Navbar.Brand as={Link} to="/">AI EDI Platform</Navbar.Brand>
          </div>

          <div className="d-flex align-items-center gap-2">
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


