import React from 'react';
import { Bot, Mail, Shield, Sparkles } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'framer-motion';

export default function LoginPage() {
  const { loginWithGoogle, devLogin } = useAuth();

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left side: Animated abstract illustration */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-primary/5">
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <div className="relative w-96 h-96">
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 rounded-full border border-primary/20"
            />
            <motion.div 
              animate={{ rotate: -360 }}
              transition={{ duration: 50, repeat: Infinity, ease: "linear" }}
              className="absolute inset-8 rounded-full border border-secondary/20"
            />
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 1 }}
              className="absolute inset-0 flex flex-col items-center justify-center text-center p-8"
            >
              <div className="w-20 h-20 bg-gradient-to-tr from-primary to-accent rounded-3xl flex items-center justify-center shadow-2xl shadow-primary/30 mb-8">
                <Bot className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary mb-4">
                The Future of Email
              </h2>
              <p className="text-foreground/60 text-lg">
                AI-powered categorization, smart replies, and intelligent insights.
              </p>
            </motion.div>
            
            {/* Floating cards */}
            <motion.div 
              animate={{ y: [-10, 10, -10] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -right-12 top-12 p-4 glass rounded-2xl shadow-xl flex items-center gap-4"
            >
              <div className="w-10 h-10 rounded-full bg-success/20 flex items-center justify-center text-success"><Sparkles className="w-5 h-5"/></div>
              <div className="text-sm font-medium">Smart Reply Ready</div>
            </motion.div>
          </div>
        </div>
        
        {/* Ambient background glows */}
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-primary/20 via-background to-background"></div>
      </div>

      {/* Right side: Login form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 relative z-20">
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-full max-w-md p-8 sm:p-12 glass rounded-[2.5rem] shadow-2xl border border-white/10 dark:border-white/5 relative overflow-hidden"
        >
          {/* Subtle glow inside card */}
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/20 blur-[100px] rounded-full pointer-events-none"></div>

          <div className="mb-10 relative z-10">
            <h1 className="text-3xl font-bold text-foreground mb-3 tracking-tight">Welcome Back</h1>
            <p className="text-foreground/60">Connect your mailbox to get started.</p>
          </div>

          <div className="space-y-4 relative z-10">
            <button 
              onClick={loginWithGoogle}
              className="w-full flex items-center justify-center gap-3 px-6 py-3.5 bg-foreground/5 hover:bg-foreground/10 text-foreground rounded-2xl font-medium transition-all duration-300 border border-border group"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Continue with Google
            </button>

            <button 
              onClick={devLogin}
              className="w-full flex items-center justify-center gap-3 px-6 py-3.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-2xl font-medium transition-all duration-300 border border-primary/20 group"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"></path></svg>
              Developer Login (Bypass)
            </button>

            <button 
              className="w-full flex items-center justify-center gap-3 px-6 py-3.5 bg-foreground/5 hover:bg-foreground/10 text-foreground rounded-2xl font-medium transition-all duration-300 border border-border group"
            >
              <svg className="w-5 h-5" viewBox="0 0 21 21">
                <path fill="#f25022" d="M1 1h9v9H1z"/>
                <path fill="#00a4ef" d="M1 11h9v9H1z"/>
                <path fill="#7fba00" d="M11 1h9v9h-9z"/>
                <path fill="#ffb900" d="M11 11h9v9h-9z"/>
              </svg>
              Continue with Microsoft
            </button>
          </div>

          <div className="mt-10 flex items-start gap-3 p-4 rounded-xl bg-foreground/5 text-foreground/70 text-sm">
            <Shield className="w-5 h-5 shrink-0 text-primary mt-0.5" />
            <p>Your privacy is our priority. We only request permissions necessary to sync and organize your inbox.</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
