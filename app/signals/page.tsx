import { LiveScanTable } from "@/components/LiveScanTable";

export default function SignalsPage() {
  return (
    <div className="space-y-6">
      <section>
        <h1 className="section-title">Live Signals</h1>
        <p className="section-copy">
          Run a fresh scan and show only current confirmed signals where monthly
          RSI is in the signal zone and the completed weekly close broke above
          the previous red weekly high.
        </p>
      </section>
      <LiveScanTable
        status="SIGNAL"
        title="Live Confirmed Signals"
        description="Runs the selected live universe and shows only confirmed signals."
        emptyText="No confirmed live signals in this scan."
      />
    </div>
  );
}
