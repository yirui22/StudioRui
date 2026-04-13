import React from 'react';
import { motion } from 'motion/react';
import { Check, Mail, Instagram } from 'lucide-react';

export default function Pricing() {
  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const pricingPlans = [
    {
      title: "Group Classes",
      price: "$20",
      description: "The group classes are designed to build strength, improve flexibility, and enhance overall movement in a supportive, small-group environment. Suitable for all levels, with progressions and modifications provided.",
      features: ["Small group environment", "All levels welcome", "Equipment provided", "Expert guidance"]
    },
    {
      title: "Private Sessions",
      price: "$60",
      description: "Private 1:1 sessions are tailored specifically to you. Ideal for beginners, injury rehabilitation, or those looking to refine technique and accelerate progress with personalised guidance.",
      features: ["Tailored specifically to you", "Injury rehabilitation focus", "Refine technique", "Accelerated progress"],
      highlight: true
    },
    {
      title: "Private Group/Event Bookings",
      price: "Email for a quote",
      description: "Perfect for special occasions, team events, or small group training. These sessions can be customised to suit your group’s goals and experience level, offering a fun and personalised Pilates experience.",
      features: ["Special occasions", "Team events", "Customised goals", "Fun & personalised"]
    }
  ];

  return (
    <main className="pt-32 pb-32">
      <div className="max-w-6xl mx-auto px-6">
        {/* Header Section */}
        <section className="text-center mb-20">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <span className="text-lavender-dark font-bold tracking-[0.2em] uppercase text-base block">Investment</span>
            <h1 className="text-6xl md:text-8xl font-serif text-midnight leading-tight">
              Pricing
            </h1>
            <p className="text-xl text-midnight/60 font-serif max-w-2xl mx-auto">
              Choose the experience that best aligns with your journey.
            </p>
          </motion.div>
        </section>

        {/* Pricing Grid */}
        <section className="grid md:grid-cols-3 gap-8 mb-32">
          {pricingPlans.map((plan, index) => (
            <motion.div
              key={plan.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`relative p-8 md:p-10 rounded-[3rem] border flex flex-col h-full ${
                plan.highlight 
                  ? 'bg-midnight text-white border-midnight shadow-2xl shadow-lavender/20 scale-105 z-10' 
                  : 'bg-white text-midnight border-[#e1e1e7] shadow-sm'
              }`}
            >
              <div className="mb-8">
                <h3 className={`text-2xl font-serif mb-2 ${plan.highlight ? 'text-lavender' : 'text-midnight'}`}>
                  {plan.title}
                </h3>
                <div className="flex items-baseline gap-1">
                  <span className={`${plan.price.startsWith('$') ? 'text-4xl' : 'text-2xl'} font-serif`}>
                    {plan.price}
                  </span>
                  {plan.price.startsWith('$') && <span className={`text-sm ${plan.highlight ? 'text-white/60' : 'text-midnight/60'}`}>/session</span>}
                </div>
              </div>

              <p className={`text-base leading-relaxed mb-8 flex-grow ${plan.highlight ? 'text-white/70' : 'text-midnight/60'}`}>
                {plan.description}
              </p>

              <ul className="space-y-4 mb-10">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-3 text-sm">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                      plan.highlight ? 'bg-lavender text-midnight' : 'bg-lavender-soft text-lavender-dark'
                    }`}>
                      <Check size={12} />
                    </div>
                    <span className={plan.highlight ? 'text-white/80' : 'text-midnight/80'}>{feature}</span>
                  </li>
                ))}
              </ul>

              {plan.title === "Group Classes" ? (
                <a 
                  href="/#classes" 
                  className="w-full py-4 px-2 bg-lavender-dark text-white rounded-full font-bold tracking-widest uppercase hover:bg-midnight transition-all text-center whitespace-nowrap"
                >
                  Book Now
                </a>
              ) : (
                <div className="flex flex-col gap-3">
                  <a 
                    href="mailto:rui.yi2902@gmail.com" 
                    className={`w-full py-4 px-6 rounded-full font-bold tracking-widest uppercase transition-all text-center flex items-center justify-center gap-2 whitespace-nowrap ${
                      plan.highlight 
                        ? 'bg-lavender text-midnight hover:bg-white' 
                        : 'bg-lavender-dark text-white hover:bg-midnight'
                    }`}
                  >
                    <Mail size={18} />
                    Email
                  </a>
                </div>
              )}
            </motion.div>
          ))}
        </section>

        {/* Contact Section */}
        <section className="bg-ivory p-12 md:p-24 rounded-[4rem] border border-[#e1e1e7] relative overflow-hidden text-center">
          <div className="absolute top-0 right-0 w-96 h-96 bg-lavender/10 rounded-full blur-[120px]" />
          <div className="relative z-10 max-w-3xl mx-auto space-y-8">
            <h2 className="text-4xl md:text-6xl font-serif text-midnight leading-tight">
              Ready to start your journey?
            </h2>
            <p className="text-xl text-midnight/60 leading-relaxed">
              Whether you're looking for a group class or a personalised private session, I'm here to help you move better.
            </p>
            <div className="flex flex-wrap justify-center gap-6">
              <a 
                href="mailto:rui.yi2902@gmail.com" 
                className="flex items-center gap-3 px-8 py-4 bg-midnight text-white rounded-full font-bold tracking-widest uppercase hover:bg-lavender-dark transition-all shadow-lg whitespace-nowrap"
              >
                <Mail size={20} />
                Email
              </a>
              <a 
                href="https://instagram.com/studiorui" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-3 px-8 py-4 bg-white text-midnight border border-[#e1e1e7] rounded-full font-bold tracking-widest uppercase hover:text-lavender-dark hover:border-lavender transition-all shadow-sm whitespace-nowrap"
              >
                <Instagram size={20} />
                Instagram
              </a>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
