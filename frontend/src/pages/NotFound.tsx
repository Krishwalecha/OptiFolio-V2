import React from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { buttonClass } from "@/ui";

const NotFound: React.FC = () => {
  const { pathname } = useLocation();
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Navbar />
      <main className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col justify-center px-5 py-24 sm:px-8">
        <div className="num select-none text-[clamp(6rem,22vw,14rem)] font-medium leading-none tracking-[-0.06em] text-foreground/[0.08]">404</div>
        <h1 className="mt-4 text-[clamp(1.8rem,4vw,2.6rem)] font-medium tracking-[-0.04em]">This page does not exist.</h1>
        <p className="mb-0 mt-3 max-w-md text-[15px] leading-relaxed text-muted-foreground">
          Nothing lives at <span className="num text-foreground">{pathname}</span>. It may have moved, or the link was mistyped.
        </p>
        <div className="mt-8 flex flex-wrap gap-2">
          <Link to="/" className={buttonClass("primary", "md")}>
            <ArrowLeft size={14} /> Home
          </Link>
          <Link to="/Optimizer" className={buttonClass("ghost", "md")}>
            Open the optimizer
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default NotFound;
