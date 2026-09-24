/** Auth sits on the drafting sheet: the plan grid over the ground, nothing else. */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="sheet-grid flex min-h-screen items-center justify-center px-4 py-8 sm:py-12">
      <div className="flex w-full items-center justify-center">{children}</div>
    </div>
  );
}
