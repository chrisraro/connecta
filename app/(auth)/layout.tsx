export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex items-center justify-center selection:bg-yellow-500/30 px-4 py-8 sm:py-12">
      {/* 2026 Background Aesthetics: Responsive, blurred orbs */}
      <div className="absolute top-[-10%] sm:top-[-20%] left-[-10%] w-[100%] sm:w-[50%] h-[40%] sm:h-[50%] bg-yellow-500/10 blur-[80px] sm:blur-[120px] rounded-full animate-pulse duration-[10s]" />
      <div className="absolute bottom-[-10%] sm:bottom-[-20%] right-[-10%] w-[100%] sm:w-[50%] h-[40%] sm:h-[50%] bg-yellow-500/5 blur-[80px] sm:blur-[120px] rounded-full animate-pulse duration-[15s]" />

      {/* Mesh Pattern Overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,var(--background)_80%)] pointer-events-none" />

      <div className="relative z-10 w-full flex items-center justify-center overflow-x-hidden">
        {children}
      </div>
    </div>
  );
}
