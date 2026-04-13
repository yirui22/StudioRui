import React from 'react';
import { motion } from 'motion/react';

export default function About() {
  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <main className="pt-32 pb-32">
      <div className="max-w-6xl mx-auto px-6">
        {/* Hero Section */}
        <section className="grid lg:grid-cols-2 gap-16 items-center mb-32">
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-8"
          >
            <div className="inline-block px-4 py-1.5 bg-lavender-soft/30 rounded-full text-lavender-dark font-bold text-base uppercase tracking-[0.2em]">
              Meet your instructor
            </div>
            <h1 className="text-6xl md:text-8xl font-serif italic tracking-tighter text-midnight leading-[0.9]">
              Hi, I'm <span className="text-lavender">Rui</span>
            </h1>
            <p className="text-2xl md:text-3xl font-serif italic text-midnight/60 leading-tight">
              Personalised pilates for every body.
            </p>
            <div className="space-y-6 text-midnight/70 text-lg leading-relaxed max-w-lg">
              <p>
                I'm a small group pilates instructor with a passion for movement that feels as good as it looks. I love combining pilates with gym for a dynamic blend to work on strength and mobility.
              </p>
              <p>
                I completed my Reformer and Small Apparatus training with Pilates ITC, a Pilates Association Australia Recognised Training Provider.
              </p>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative"
          >
            <div className="aspect-[4/5] rounded-[3rem] overflow-hidden shadow-2xl shadow-lavender/20">
              <img 
                src="/ruiprofilephoto.jpg" 
                alt="Rui's Pilates Studio" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="absolute -bottom-8 -left-8 w-48 h-48 bg-seafoam/20 rounded-full blur-3xl -z-10" />
            <div className="absolute -top-8 -right-8 w-64 h-64 bg-lavender/10 rounded-full blur-3xl -z-10" />
          </motion.div>
        </section>

        {/* Philosophy Section */}
        <section className="bg-midnight text-white p-12 md:p-24 relative overflow-hidden mb-32">
          <div className="absolute top-0 right-0 w-96 h-96 bg-lavender/10 rounded-full blur-[120px]" />
          <div className="relative z-10 max-w-3xl">
            <h2 className="text-4xl md:text-6xl font-serif italic mb-12 leading-tight">
              If you've been curious about Pilates but weren't sure where to start...
            </h2>
            <p className="text-xl md:text-2xl font-light text-white/80 leading-relaxed mb-12">
              ...or you're already active and want to move better, I look forward to working with you. My approach is about meeting you where you are and helping you reach where you want to be.
            </p>
            <div className="flex flex-wrap gap-6">
              <div className="px-6 py-3 border border-[#e1e1e7] rounded-full text-base font-bold uppercase tracking-widest">
                Pilates ITC Certified
              </div>
              <div className="px-6 py-3 border border-[#e1e1e7] rounded-full text-base font-bold uppercase tracking-widest">
                AusActive Registered
              </div>
            </div>
          </div>
        </section>

        {/* Cancellation Policy Section */}
        <section className="mb-32">
          <div className="grid lg:grid-cols-12 gap-16">
            <div className="lg:col-span-4">
              <div className="inline-block px-4 py-1.5 bg-lavender-soft/30 rounded-full text-lavender-dark font-bold text-base uppercase tracking-[0.2em] mb-6">
                Policy
              </div>
              <h2 className="text-5xl font-serif italic text-midnight leading-tight">
                Cancellation & Rescheduling
              </h2>
            </div>
            <div className="lg:col-span-8 grid sm:grid-cols-2 gap-12">
              <div className="space-y-4">
                <h3 className="text-2xl font-serif italic text-lavender-dark">Full Cancellation & Refund</h3>
                <p className="text-midnight/60 leading-relaxed">
                  Cancellations made more than 24 hours before the scheduled class start time are eligible for a full refund to the original payment method.
                </p>
              </div>
              <div className="space-y-4">
                <h3 className="text-2xl font-serif italic text-lavender-dark">Reschedule Only (under 24 hours)</h3>
                <p className="text-midnight/60 leading-relaxed">
                  If you need to cancel within 24 hours of your class, full refunds are not available. However, you may reschedule your booking to another available class at no extra charge, provided the request is made more than 12 hours before the class start time.
                </p>
              </div>
              <div className="space-y-4">
                <h3 className="text-2xl font-serif italic text-lavender-dark">No Changes Within 12 Hours</h3>
                <p className="text-midnight/60 leading-relaxed">
                  Cancellations and reschedules are not accepted within 12 hours of the class start time. The full class cost will be forfeited.
                </p>
              </div>
              <div className="space-y-4">
                <h3 className="text-2xl font-serif italic text-lavender-dark">No-Shows</h3>
                <p className="text-midnight/60 leading-relaxed">
                  Failure to attend a booked class without prior cancellation or reschedule will result in the full class cost being forfeited.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
