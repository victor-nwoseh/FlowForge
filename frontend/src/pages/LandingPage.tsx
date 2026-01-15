import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, GitBranch, Link2, Clock, Activity, Plug, MousePointerClick, Rocket } from 'lucide-react';
import { useScrollAnimation } from '../hooks/useScrollAnimation';
import TextType from '../components/TextType';
import Silk from '../components/Silk';
import TrueFocus from '../components/TrueFocus';
import GlareHover from '../components/GlareHover';
import StarBorder from '../components/StarBorder';
import LiquidMetalButton from '../components/LiquidMetalButton';

// Feature data
const features = [
  {
    icon: GitBranch,
    title: 'Visual Flow Builder',
    description: 'Design workflows with an intuitive drag-and-drop canvas. No coding required—just connect nodes and watch your automation come to life.',
  },
  {
    icon: Link2,
    title: 'Integrations Ecosystem',
    description: 'Connect to your favorite apps and services. From databases to APIs, FlowForge speaks the language of your entire tech stack.',
  },
  {
    icon: Clock,
    title: 'Scheduled Automation',
    description: 'Set it and forget it. Schedule workflows to run at specific times, intervals, or in response to events—automatically.',
  },
  {
    icon: Activity,
    title: 'Real-time Monitoring',
    description: 'Track every execution in real-time. Get instant visibility into workflow performance, errors, and success rates.',
  },
];

const LandingPage: React.FC = () => {
  // Scroll animation hooks for each section
  const [featuresRef, featuresVisible] = useScrollAnimation<HTMLDivElement>({ threshold: 0.1 });
  const [howItWorksRef, howItWorksVisible] = useScrollAnimation<HTMLDivElement>({ threshold: 0.1 });
  const [ctaRef, ctaVisible] = useScrollAnimation<HTMLDivElement>({ threshold: 0.2 });

  return (
    <div className="bg-forge-950">
      {/* ===== HERO SECTION ===== */}
      <section className="min-h-screen relative overflow-hidden">
        {/* Silk Background - React Bits */}
        <div className="absolute inset-0">
          <Silk
            speed={3}
            scale={1}
            color="#2d1810"
            noiseIntensity={0}
            rotation={0}
          />
        </div>
        
        {/* Overlay gradient for depth */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-forge-950/30 to-forge-950/80" />
        
        {/* Subtle radial spotlight */}
        <div className="absolute inset-0 radial-spotlight opacity-60" />

        {/* Content wrapper */}
        <div className="relative z-10 min-h-screen flex flex-col">
          
          {/* Navigation */}
          <nav className="w-full px-6 py-5">
            <div className="max-w-6xl mx-auto flex items-center justify-between">
              {/* Logo */}
              <Link to="/" className="flex items-center text-xl font-semibold text-forge-50 tracking-tight">
                <TrueFocus
                  sentence="Flow Forge"
                  manualMode={false}
                  blurAmount={4}
                  borderColor="#e97f38"
                  glowColor="rgba(233, 127, 56, 0.6)"
                  animationDuration={0.5}
                  pauseBetweenAnimations={0.5}
                />
              </Link>

              {/* Auth links */}
              <div className="flex items-center gap-4">
                <LiquidMetalButton to="/login" size="sm" variant="outline">
                  Log in
                </LiquidMetalButton>
                <LiquidMetalButton to="/register" size="sm">
                  Get Started
                </LiquidMetalButton>
              </div>
            </div>
          </nav>

          {/* Hero content */}
          <div className="flex-1 flex items-center justify-center px-6">
            <div className="max-w-4xl mx-auto text-center">
              {/* Badge */}
              <div className="animate-hero-entrance hero-delay-1 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-forge-800/50 border border-forge-700/50 mb-8 backdrop-blur-sm">
                <span className="w-2 h-2 rounded-full bg-ember-400 animate-pulse" />
                <span className="text-sm text-forge-300">Workflow automation, reimagined</span>
              </div>

              {/* Headline */}
              <h1 className="animate-hero-entrance hero-delay-2 text-5xl sm:text-6xl lg:text-7xl font-bold text-forge-50 leading-tight mb-6">
                <TextType
                  text="Build workflows that work for you"
                  as="span"
                  typingSpeed={75}
                  initialDelay={500}
                  loop={false}
                  showCursor={false}
                  className="hero-headline-type"
                />
              </h1>

              {/* Subheadline */}
              <p className="animate-hero-entrance hero-delay-3 text-lg sm:text-xl text-forge-300 max-w-2xl mx-auto mb-10 leading-relaxed">
                Connect your apps, automate repetitive tasks, and focus on what matters. 
                FlowForge makes workflow automation simple, visual, and powerful.
              </p>

              {/* CTA */}
              <div className="animate-hero-entrance hero-delay-4 flex items-center justify-center gap-4">
                <LiquidMetalButton to="/register" size="lg">
                  Start Building Free
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-200" />
                </LiquidMetalButton>
                <LiquidMetalButton
                  href="https://drive.google.com/file/d/1p-NlPutYT7if5ugHHAU6WNTY3nLL8x6x/view?usp=sharing"
                  size="lg"
                  variant="outline"
                >
                  View Demo
                </LiquidMetalButton>
              </div>

              {/* Trust signal */}
              <p className="animate-hero-entrance hero-delay-5 mt-8 text-sm text-forge-400">
                From idea to automation in minutes
              </p>
            </div>
          </div>

          {/* Bottom gradient fade */}
          <div className="h-32 bg-gradient-to-t from-forge-950 to-transparent" />
        </div>
      </section>

      {/* ===== FEATURES SECTION ===== */}
      <section className="relative py-24 px-6" style={{ backgroundColor: '#0a0908' }}>
        {/* Subtle background glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full" style={{ backgroundColor: 'rgba(230, 92, 0, 0.05)', filter: 'blur(48px)' }} />
        
        <div ref={featuresRef} className="relative z-10 max-w-6xl mx-auto">
          {/* Section header */}
          <div className={`text-center mb-16 animate-on-scroll ${featuresVisible ? 'is-visible' : ''}`}>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4" style={{ color: '#f5f2ef' }}>
              Everything you need to
              <br />
              <span className="text-ember-gradient">automate smarter</span>
            </h2>
            <p className="text-lg max-w-2xl mx-auto" style={{ color: '#8a7f75' }}>
              Powerful features that make workflow automation accessible to everyone—from solo developers to enterprise teams.
            </p>
          </div>

          {/* Features grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
            {features.map((feature, index) => (
              <StarBorder
                key={index}
                as="div"
                color="#ff6b1a"
                speed="3s"
                thickness={2}
                className={`animate-scale-on-scroll stagger-${index + 1} ${featuresVisible ? 'is-visible' : ''}`}
              >
                <GlareHover
                  width="100%"
                  height="100%"
                  background="linear-gradient(135deg, rgba(18, 17, 16, 0.95) 0%, rgba(26, 24, 22, 0.9) 100%)"
                  borderRadius="20px"
                  borderColor="rgba(46, 41, 36, 0.5)"
                  glareColor="#e65c00"
                  glareOpacity={0.15}
                  glareAngle={-30}
                  glareSize={300}
                  transitionDuration={2000}
                  playOnce={true}
                  className="p-6 lg:p-8"
                  style={{ minHeight: '200px' }}
                >
                  <div className="text-left w-full">
                    {/* Icon */}
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-5" style={{ background: 'linear-gradient(135deg, rgba(230, 92, 0, 0.15) 0%, rgba(128, 51, 0, 0.1) 100%)', border: '1px solid rgba(230, 92, 0, 0.2)' }}>
                      <feature.icon className="w-6 h-6" style={{ color: '#cc5200' }} />
                    </div>

                    {/* Title */}
                    <h3 className="text-xl font-semibold mb-3" style={{ color: '#f5f2ef' }}>
                      {feature.title}
                    </h3>

                    {/* Description */}
                    <p className="leading-relaxed" style={{ color: '#8a7f75' }}>
                      {feature.description}
                    </p>
                  </div>
                </GlareHover>
              </StarBorder>
            ))}
          </div>
        </div>
      </section>

      {/* ===== HOW IT WORKS SECTION ===== */}
      <section className="relative py-24 px-6" style={{ backgroundColor: '#0d0b0a' }}>
        {/* Subtle background glow */}
        <div className="absolute bottom-0 left-1/4 w-[600px] h-[300px] rounded-full" style={{ backgroundColor: 'rgba(179, 143, 0, 0.04)', filter: 'blur(60px)' }} />
        <div className="absolute top-1/2 right-1/4 w-[400px] h-[400px] rounded-full" style={{ backgroundColor: 'rgba(230, 92, 0, 0.03)', filter: 'blur(60px)' }} />
        
        <div ref={howItWorksRef} className="relative z-10 max-w-6xl mx-auto">
          {/* Section header */}
          <div className={`text-center mb-20 animate-on-scroll ${howItWorksVisible ? 'is-visible' : ''}`}>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4" style={{ color: '#f5f2ef' }}>
              How it works
            </h2>
            <p className="text-lg max-w-2xl mx-auto" style={{ color: '#8a7f75' }}>
              Get started in minutes. Three simple steps to automate your workflows.
            </p>
          </div>

          {/* Steps */}
          <div className="relative">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 lg:gap-8">
              {/* Step 1 */}
              <div className={`text-center animate-on-scroll stagger-1 ${howItWorksVisible ? 'is-visible' : ''}`}>
                {/* Step number */}
                <div className="relative inline-flex items-center justify-center w-16 h-16 rounded-full mb-6" style={{ background: 'linear-gradient(135deg, rgba(230, 92, 0, 0.2) 0%, rgba(128, 51, 0, 0.1) 100%)', border: '1px solid rgba(230, 92, 0, 0.3)' }}>
                  <span className="text-2xl font-bold" style={{ color: '#e65c00' }}>1</span>
                </div>

                {/* Icon */}
                <div className="w-14 h-14 rounded-xl mx-auto mb-5 flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(18, 17, 16, 0.8) 0%, rgba(26, 24, 22, 0.6) 100%)', border: '1px solid rgba(46, 41, 36, 0.5)' }}>
                  <Plug className="w-7 h-7" style={{ color: '#cc5200' }} />
                </div>

                {/* Title */}
                <h3 className="text-xl font-semibold mb-3" style={{ color: '#f5f2ef' }}>
                  Connect your apps
                </h3>

                {/* Description */}
                <p className="leading-relaxed max-w-xs mx-auto" style={{ color: '#8a7f75' }}>
                  Link your favorite tools and services with secure OAuth connections. No API keys to manage.
                </p>
              </div>

              {/* Step 2 */}
              <div className={`text-center animate-on-scroll stagger-2 ${howItWorksVisible ? 'is-visible' : ''}`}>
                {/* Step number */}
                <div className="relative inline-flex items-center justify-center w-16 h-16 rounded-full mb-6" style={{ background: 'linear-gradient(135deg, rgba(230, 92, 0, 0.2) 0%, rgba(128, 51, 0, 0.1) 100%)', border: '1px solid rgba(230, 92, 0, 0.3)' }}>
                  <span className="text-2xl font-bold" style={{ color: '#e65c00' }}>2</span>
                </div>

                {/* Icon */}
                <div className="w-14 h-14 rounded-xl mx-auto mb-5 flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(18, 17, 16, 0.8) 0%, rgba(26, 24, 22, 0.6) 100%)', border: '1px solid rgba(46, 41, 36, 0.5)' }}>
                  <MousePointerClick className="w-7 h-7" style={{ color: '#cc5200' }} />
                </div>

                {/* Title */}
                <h3 className="text-xl font-semibold mb-3" style={{ color: '#f5f2ef' }}>
                  Build your workflow
                </h3>

                {/* Description */}
                <p className="leading-relaxed max-w-xs mx-auto" style={{ color: '#8a7f75' }}>
                  Drag and drop nodes onto the canvas. Connect triggers, actions, and logic visually.
                </p>
              </div>

              {/* Step 3 */}
              <div className={`text-center animate-on-scroll stagger-3 ${howItWorksVisible ? 'is-visible' : ''}`}>
                {/* Step number */}
                <div className="relative inline-flex items-center justify-center w-16 h-16 rounded-full mb-6" style={{ background: 'linear-gradient(135deg, rgba(230, 92, 0, 0.2) 0%, rgba(128, 51, 0, 0.1) 100%)', border: '1px solid rgba(230, 92, 0, 0.3)' }}>
                  <span className="text-2xl font-bold" style={{ color: '#e65c00' }}>3</span>
                </div>

                {/* Icon */}
                <div className="w-14 h-14 rounded-xl mx-auto mb-5 flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(18, 17, 16, 0.8) 0%, rgba(26, 24, 22, 0.6) 100%)', border: '1px solid rgba(46, 41, 36, 0.5)' }}>
                  <Rocket className="w-7 h-7" style={{ color: '#cc5200' }} />
                </div>

                {/* Title */}
                <h3 className="text-xl font-semibold mb-3" style={{ color: '#f5f2ef' }}>
                  Automate & monitor
                </h3>

                {/* Description */}
                <p className="leading-relaxed max-w-xs mx-auto" style={{ color: '#8a7f75' }}>
                  Deploy with one click. Watch your workflows run and track every execution in real-time.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== FINAL CTA SECTION ===== */}
      <section className="relative py-24 px-6 overflow-hidden" style={{ backgroundColor: '#0a0908' }}>
        {/* Background glow effects */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] rounded-full" style={{ backgroundColor: 'rgba(230, 92, 0, 0.08)', filter: 'blur(80px)' }} />
        <div className="absolute bottom-0 left-0 w-[400px] h-[300px] rounded-full" style={{ backgroundColor: 'rgba(179, 143, 0, 0.05)', filter: 'blur(60px)' }} />
        <div className="absolute top-0 right-0 w-[300px] h-[300px] rounded-full" style={{ backgroundColor: 'rgba(230, 92, 0, 0.04)', filter: 'blur(60px)' }} />

        <div ref={ctaRef} className="relative z-10 max-w-4xl mx-auto text-center">
          {/* Headline */}
          <h2 className={`text-3xl sm:text-4xl lg:text-5xl font-bold mb-6 animate-on-scroll ${ctaVisible ? 'is-visible' : ''}`} style={{ color: '#f5f2ef' }}>
            Ready to forge your
            <br />
            <span className="text-molten-gradient">first workflow?</span>
          </h2>

          {/* Subheadline */}
          <p className={`text-lg mb-10 max-w-2xl mx-auto animate-on-scroll stagger-1 ${ctaVisible ? 'is-visible' : ''}`} style={{ color: '#8a7f75' }}>
            From simple tasks to complex pipelines—bring your automation ideas to life.
          </p>

          {/* CTA Button */}
          <div className={`animate-on-scroll stagger-2 ${ctaVisible ? 'is-visible' : ''}`}>
            <LiquidMetalButton to="/register" size="lg">
              Get Started Free
              <ArrowRight className="w-5 h-5" />
            </LiquidMetalButton>
          </div>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="relative py-12 px-6" style={{ backgroundColor: '#080706', borderTop: '1px solid rgba(46, 41, 36, 0.3)' }}>
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            {/* Logo */}
            <Link to="/" className="flex items-center text-lg font-semibold" style={{ color: '#f5f2ef' }}>
              <TrueFocus
                sentence="Flow Forge"
                manualMode={false}
                blurAmount={4}
                borderColor="#e97f38"
                glowColor="rgba(233, 127, 56, 0.6)"
                animationDuration={0.5}
                pauseBetweenAnimations={0.5}
              />
            </Link>

            {/* Copyright */}
            <p className="text-sm" style={{ color: '#524a44' }}>
              © {new Date().getFullYear()} FlowForge. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;

