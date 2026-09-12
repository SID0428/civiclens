import React from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Clock, MapPin, Building2, Shield, ArrowLeft, AlertCircle, Sparkles, Navigation } from 'lucide-react';

export const GrievancePolicy: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Ambient background glows */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute bottom-10 right-1/4 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none -z-10" />

      <div className="max-w-4xl mx-auto space-y-8 relative">
        {/* Navigation Breadcrumb */}
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-sky-600 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </Link>

        {/* Hero Header */}
        <div className="bg-white rounded-3xl p-8 sm:p-10 border border-slate-200/90 shadow-sm space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Citizen Charter &amp; Grievance Redressal Policy
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Service Standards &bull; Municipal Resolution SLAs &bull; Anti-Fraud Geofencing Protocols
            </p>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed">
            The CivicLens Citizen Charter outlines our commitment to timely, transparent, and accountable municipal grievance resolution. This policy defines the standard workflow, expected resolution timelines (SLAs), and technological verification requirements governing all reported grievances.
          </p>
        </div>

        {/* Policy Sections */}
        <div className="bg-white rounded-3xl p-8 sm:p-10 border border-slate-200/90 shadow-sm space-y-8 text-sm text-slate-700 leading-relaxed">
          {/* Section 1: Standard Grievance Lifecycle */}
          <section className="space-y-4">
            <div className="flex items-center gap-2.5 text-slate-900 font-bold text-base">
              <Sparkles className="w-5 h-5 text-sky-600 shrink-0" />
              <h2>1. Five-Stage Grievance Resolution Lifecycle</h2>
            </div>
            <p>
              Every grievance submitted via CivicLens undergoes a rigorous five-stage accountability process:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-bold text-sky-700 uppercase">
                  <span className="w-5 h-5 rounded-full bg-sky-600 text-white font-black flex items-center justify-center text-[10px]">1</span>
                  <span>On-Site AI Validation</span>
                </div>
                <p className="text-xs text-slate-600">
                  Citizen captures photo with live camera. Vision AI validates municipal authenticity, assigns category, and sets severity priority in under 2 seconds.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-bold text-blue-700 uppercase">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-black flex items-center justify-center text-[10px]">2</span>
                  <span>Jurisdiction Dispatch</span>
                </div>
                <p className="text-xs text-slate-600">
                  Complaint is automatically routed to the designated District Sub-Admin officer matching the location's postal PIN code and municipal ward.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-700 uppercase">
                  <span className="w-5 h-5 rounded-full bg-amber-500 text-white font-black flex items-center justify-center text-[10px]">3</span>
                  <span>Field Team Action</span>
                </div>
                <p className="text-xs text-slate-600">
                  District officer reviews report, marks ticket as "In Progress", and dispatches municipal field teams, contractors, or emergency repair squads.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 uppercase">
                  <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-black flex items-center justify-center text-[10px]">4</span>
                  <span>100m Geofenced Proof</span>
                </div>
                <p className="text-xs text-slate-600">
                  Officer must be physically present within allowable 100m geofence of the issue GPS location to take a live resolution photo before marking "Resolved".
                </p>
              </div>
            </div>
          </section>

          <hr className="border-slate-100" />

          {/* Section 2: Service Level Agreements (SLAs) */}
          <section className="space-y-4">
            <div className="flex items-center gap-2.5 text-slate-900 font-bold text-base">
              <Clock className="w-5 h-5 text-sky-600 shrink-0" />
              <h2>2. Service Level Agreements (SLAs) by Priority</h2>
            </div>
            <p>
              Resolution target timelines are strictly governed by AI-assigned priority ratings:
            </p>

            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 uppercase tracking-wider font-bold">
                    <th className="py-3 px-3.5">Priority Level</th>
                    <th className="py-3 px-3.5">Examples of Hazard</th>
                    <th className="py-3 px-3.5">Target Response Time</th>
                    <th className="py-3 px-3.5">Target Resolution SLA</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  <tr className="bg-rose-50/50">
                    <td className="py-3.5 px-3.5 font-bold text-rose-700">Critical</td>
                    <td className="py-3.5 px-3.5 text-slate-700">Dangling live electrical wires, major roadway sinkhole, gas/chemical hazard</td>
                    <td className="py-3.5 px-3.5 font-semibold text-rose-800">&lt; 4 Hours</td>
                    <td className="py-3.5 px-3.5 font-black text-rose-700 font-mono">24 – 48 Hours</td>
                  </tr>
                  <tr className="bg-amber-50/50">
                    <td className="py-3.5 px-3.5 font-bold text-amber-800">High</td>
                    <td className="py-3.5 px-3.5 text-slate-700">Large water-filled potholes, open sewage manhole, major street water pipeline burst</td>
                    <td className="py-3.5 px-3.5 font-semibold text-amber-900">&lt; 12 Hours</td>
                    <td className="py-3.5 px-3.5 font-black text-amber-800 font-mono">48 – 72 Hours</td>
                  </tr>
                  <tr className="bg-blue-50/50">
                    <td className="py-3.5 px-3.5 font-bold text-blue-700">Medium</td>
                    <td className="py-3.5 px-3.5 text-slate-700">Broken streetlight pole, overflowing public community dustbin, sidewalk damage</td>
                    <td className="py-3.5 px-3.5 font-semibold text-blue-800">&lt; 24 Hours</td>
                    <td className="py-3.5 px-3.5 font-black text-blue-700 font-mono">3 – 5 Working Days</td>
                  </tr>
                  <tr className="bg-slate-50/30">
                    <td className="py-3.5 px-3.5 font-bold text-slate-600">Low</td>
                    <td className="py-3.5 px-3.5 text-slate-600">Faded pedestrian crosswalk paint, minor park bench damage, non-blocking debris</td>
                    <td className="py-3.5 px-3.5 font-semibold text-slate-700">&lt; 48 Hours</td>
                    <td className="py-3.5 px-3.5 font-black text-slate-700 font-mono">7 Working Days</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <hr className="border-slate-100" />

          {/* Section 3: Anti-Fraud Geofencing Protocol */}
          <section className="space-y-3">
            <div className="flex items-center gap-2.5 text-slate-900 font-bold text-base">
              <Navigation className="w-5 h-5 text-emerald-600 shrink-0" />
              <h2>3. Strict Geofencing Redressal Protocol</h2>
            </div>
            <p>
              To eliminate false resolutions, "desk-closing" of tickets, or contractor fraud, CivicLens enforces our <strong className="text-emerald-700 font-semibold">Haversine Geofenced Verification Protocol</strong>:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-slate-600 text-xs sm:text-sm">
              <li>
                <strong className="text-slate-900">Hardware Sensor Locking:</strong> When an officer attempts to mark a ticket as Resolved, their device sensor GPS coordinates are measured against the original citizen geotag using the Haversine spherical distance formula.
              </li>
              <li>
                <strong className="text-slate-900">Geofence Perimeter Enforcement:</strong> If the officer is farther than the allowable boundary from the site, resolution photo submission and resolution saving are locked by the platform.
              </li>
              <li>
                <strong className="text-slate-900">Mandatory "After" Photo &amp; AI Audit:</strong> A live, unalterable camera snapshot of the completed work must be submitted and validated by AI Vision, which is permanently displayed alongside the original "Before" photo on the public transparency feed.
              </li>
            </ul>
          </section>

          <hr className="border-slate-100" />

          {/* Section 4: Citizen Rights & Escalation */}
          <section className="space-y-3">
            <div className="flex items-center gap-2.5 text-slate-900 font-bold text-base">
              <Building2 className="w-5 h-5 text-sky-600 shrink-0" />
              <h2>4. Escalation &amp; Appeal to State Super-Admin</h2>
            </div>
            <p>
              If a municipal grievance is not redressed within the specified SLA timeline or if a citizen disputes the quality of work demonstrated in the resolution photo:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-slate-600 text-xs sm:text-sm">
              <li>The ticket is automatically flagged on the <strong className="text-slate-900">State Governance Super-Admin Dashboard</strong> as an SLA Breach.</li>
              <li>Super-Admins hold jurisdictional authority to re-open closed complaints, reassign district field officers, and penalize contractor negligence.</li>
              <li>Citizens may contact the state grievance escalation desk directly at <strong className="text-sky-600">escalations@civiclens.gov.in</strong> quoting their ticket ID.</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
};
