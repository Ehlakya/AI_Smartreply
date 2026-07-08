import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'framer-motion';
import { Loader2, CheckCircle2 } from 'lucide-react';

import { emailService } from '../services/email.service';

export default function SyncScreen() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  
  const token = searchParams.get('token');

  useEffect(() => {
    let isMounted = true;

    // Fix: Immediately save URL token to localStorage so emailService can use it
    if (token) {
      localStorage.setItem('accessToken', token);
    }

    const syncSequence = async () => {
      try {
        // Wait briefly to ensure React Context has time to mount if needed
        await new Promise(r => setTimeout(r, 500));
        
        setStep(0); 
        const result = await emailService.syncEmails();
        
        if (!isMounted) return;

        if (result.isLocked) {
          // Sync already in progress, fast-forward to dashboard
          setStep(3); // Complete
          setTimeout(() => {
            if (isMounted) navigate('/dashboard');
          }, 1000);
          return;
        }

        setStep(1); // Connected
        await new Promise(r => setTimeout(r, 500));
        
        setStep(2); // Categorizing (AI processing could happen here)
        await new Promise(r => setTimeout(r, 500));
        
        setStep(3); // Complete
        
        setTimeout(() => {
          if (isMounted) navigate('/dashboard');
        }, 1000);
      } catch (error) {
        if (error.response?.status === 429) {
          // Sync already in progress, just fast-forward to dashboard seamlessly
          setStep(3); // Complete
          setTimeout(() => {
            if (isMounted) navigate('/dashboard');
          }, 1000);
          return;
        }
        
        console.error("Sync failed", error);
        // Fallback to dashboard even if sync fails
        setTimeout(() => {
          if (isMounted) navigate('/dashboard');
        }, 2000);
      }
    };

    syncSequence();

    return () => { isMounted = false; };
  }, [navigate, token]);

  const steps = [
    "Connecting to Gmail...",
    "Importing latest emails...",
    "AI is categorizing...",
    "Inbox Ready!"
  ];

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-8">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md p-10 glass rounded-[2.5rem] text-center shadow-2xl relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-secondary/10 pointer-events-none" />
        
        <h2 className="text-2xl font-bold mb-8 relative z-10">
          Welcome{user?.name ? `, ${user.name.split(' ')[0]}` : ''}!
        </h2>

        <div className="relative z-10 flex flex-col items-center">
          {step < 3 ? (
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="mb-8 text-primary"
            >
              <Loader2 className="w-16 h-16" />
            </motion.div>
          ) : (
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="mb-8 text-success"
            >
              <CheckCircle2 className="w-16 h-16" />
            </motion.div>
          )}

          <div className="space-y-4 w-full">
            {steps.map((text, index) => (
              <motion.div 
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ 
                  opacity: step >= index ? 1 : 0.3, 
                  x: 0,
                  color: step === index ? 'var(--color-primary)' : 'inherit'
                }}
                className={`flex items-center gap-3 text-sm font-medium ${step === index ? 'text-primary text-base scale-105' : 'text-foreground/60'} transition-all duration-300`}
              >
                {step > index ? (
                  <CheckCircle2 className="w-5 h-5 text-success" />
                ) : (
                  <div className={`w-5 h-5 rounded-full border-2 ${step === index ? 'border-primary animate-pulse' : 'border-foreground/20'}`} />
                )}
                {text}
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
