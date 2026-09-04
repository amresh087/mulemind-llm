import React from "react";
import Navbar from "./Navbar";
import Footer from "./Footer";

const MainLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="main-layout-shell d-flex flex-column bg-light">
      <Navbar />
      <main className="main-layout-content flex-grow-1">{children}</main>
      <Footer />
    </div>
  );
};

export default MainLayout;
