import React from "react";
import Navbar from "./Navbar";
import Footer from "./Footer";

const MainLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div
      className="d-flex flex-column bg-light"
      style={{
        gap: 0,
        height: '100vh',
        overflow: 'hidden',
      }}
    >
      <Navbar />
      <main className="flex-grow-1" style={{ padding: 0, minHeight: 0, overflow: 'hidden' }}>{children}</main>
      <Footer />
    </div>
  );
};

export default MainLayout;
