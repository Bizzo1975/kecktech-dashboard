// No layout needed - root layout handles Header/Footer via ConditionalLayout
export default function CircuitImprovedDemoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

