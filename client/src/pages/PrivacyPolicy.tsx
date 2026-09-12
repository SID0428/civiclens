import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Lock, MapPin, Camera, Eye, FileText, ArrowLeft, CheckCircle2 } from 'lucide-react';

export const PrivacyPolicy: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Ambient background glows */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute bottom-10 right-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none -z-10" />

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
          <div className="w-12 h-12 rounded-2xl bg-sky-50 border border-sky-200 text-sky-600 flex items-center justify-center">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Privacy Policy
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Effective Date: September 2026 &bull; CivicLens Municipal Grievance Redressal Platform
            </p>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed">
            CivicLens is committed to protecting citizen privacy while delivering transparent, verified, and tamper-proof municipal infrastructure grievance redressal. This Privacy Policy details how we collect, verify, use, and safeguard your geospatial telemetry, photographic evidence, and account information.
          </p>
        </div>

        {/* Policy Sections */}
        <div className="bg-white rounded-3xl p-8 sm:p-10 border border-slate-200/90 shadow-sm space-y-8 text-sm text-slate-700 leading-relaxed">
          {/* Section 1 */}
          <section className="space-y-3">
            <div className="flex items-center gap-2.5 text-slate-900 font-bold text-base">
              <MapPin className="w-5 h-5 text-sky-600 shrink-0" />
              <h2>1. Real-Time Geolocation &amp; Telemetry Data</h2>
            </div>
            <p>
              To eliminate fraudulent, misplaced, or non-authentic grievance reports, CivicLens requires real-time device GPS sensor telemetry (latitude, longitude, accuracy radius, and postal PIN code) at the time of issue reporting:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-slate-600 text-xs sm:text-sm">
              <li>
                <strong className="text-slate-900">Purpose of Collection:</strong> GPS data is utilized solely to route complaints to the designated jurisdictional District Sub-Admin (Municipal Ward Officer) and to enable distance-based ranking on the public feed.
              </li>
              <li>
                <strong className="text-slate-900">No Background Tracking:</strong> Location coordinates are captured only upon user initiation when opening the live reporting module or viewing nearby grievances. CivicLens never tracks your location in the background when the application is closed.
              </li>
              <li>
                <strong className="text-slate-900">Anti-Tamper Geofencing:</strong> Location coordinates are cryptographically hashed and watermarked onto grievance records to enforce our 100-meter officer resolution verification rule.
              </li>
            </ul>
          </section>

          <hr className="border-slate-100" />

          {/* Section 2 */}
          <section className="space-y-3">
            <div className="flex items-center gap-2.5 text-slate-900 font-bold text-base">
              <Camera className="w-5 h-5 text-sky-600 shrink-0" />
              <h2>2. Camera Capture &amp; Watermarked Visual Evidence</h2>
            </div>
            <p>
              CivicLens uses hardware camera sensor capture rather than unverified file uploads to guarantee evidence authenticity:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-slate-600 text-xs sm:text-sm">
              <li>
                <strong className="text-slate-900">Canvas Watermarking:</strong> Real-time latitude, longitude, and timestamps are rendered permanently onto image bytes using HTML5 Canvas before upload.
              </li>
              <li>
                <strong className="text-slate-900">AI Vision Verification:</strong> Images are processed through AI Vision to validate authentic municipal infrastructure damage (potholes, garbage, sewage, streetlights). Personal portraits, selfies, personal electronic screens, and indoor furniture are automatically rejected to preserve personal privacy.
              </li>
              <li>
                <strong className="text-slate-900">Public Display:</strong> Verified infrastructure photos are published on the open community grievance feed to ensure civic accountability. Citizens should not photograph private domestic spaces or non-consenting individuals.
              </li>
            </ul>
          </section>

          <hr className="border-slate-100" />

          {/* Section 3 */}
          <section className="space-y-3">
            <div className="flex items-center gap-2.5 text-slate-900 font-bold text-base">
              <Lock className="w-5 h-5 text-sky-600 shrink-0" />
              <h2>3. Citizen Account &amp; Identity Information</h2>
            </div>
            <p>
              When reporting grievances or creating an account, we collect minimal personal identifiers:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-slate-600 text-xs sm:text-sm">
              <li><strong className="text-slate-900">Name and Email Address:</strong> Used for grievance authentication, OTP verification, and status notifications.</li>
              <li><strong className="text-slate-900">Phone Number (Optional):</strong> Used by municipal dispatch teams to contact citizens if additional on-site navigation guidance is required.</li>
              <li><strong className="text-slate-900">No Data Monetization:</strong> We do not sell, rent, or monetize citizen contact information to commercial advertising third parties under any circumstances.</li>
            </ul>
          </section>

          <hr className="border-slate-100" />

          {/* Section 4 */}
          <section className="space-y-3">
            <div className="flex items-center gap-2.5 text-slate-900 font-bold text-base">
              <Eye className="w-5 h-5 text-sky-600 shrink-0" />
              <h2>4. Information Sharing &amp; Municipal Access</h2>
            </div>
            <p>
              Grievance records, photographic proof, and geotags are shared with:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-slate-600 text-xs sm:text-sm">
              <li>
                <strong className="text-slate-900">Authorized Municipal Officers:</strong> Assigned District Sub-Admins, Public Works Department (PWD), Electricity Boards, and Municipal Corporations responsible for field maintenance.
              </li>
              <li>
                <strong className="text-slate-900">State Governance Super-Admins:</strong> State-level oversight officials monitoring resolution SLAs, department performance, and escalation disputes.
              </li>
              <li>
                <strong className="text-slate-900">Public Community Feed:</strong> Aggregated, geotagged infrastructure reports (with citizen personal emails concealed) to maintain public civic transparency.
              </li>
            </ul>
          </section>

          <hr className="border-slate-100" />

          {/* Section 5 */}
          <section className="space-y-3">
            <div className="flex items-center gap-2.5 text-slate-900 font-bold text-base">
              <FileText className="w-5 h-5 text-sky-600 shrink-0" />
              <h2>5. Data Security &amp; Retention</h2>
            </div>
            <p>
              CivicLens implements industry-standard data protection measures:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-slate-600 text-xs sm:text-sm">
              <li>All API communication is secured via end-to-end 256-bit SSL/TLS transport encryption.</li>
              <li>Passwords are hashed using bcrypt with salt rounds before database persistence.</li>
              <li>Photographic assets are secured on high-availability cloud storage with tamper-evident URLs.</li>
              <li>Grievance history is archived for municipal auditing and public record accountability. Citizens can request account data export or identity redaction by contacting support.</li>
            </ul>
          </section>

          <hr className="border-slate-100" />

          {/* Section 6 */}
          <section className="space-y-3">
            <div className="flex items-center gap-2.5 text-slate-900 font-bold text-base">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <h2>6. Contact &amp; Grievance Officer</h2>
            </div>
            <p>
              If you have any questions regarding this Privacy Policy or wish to exercise your data rights, please contact our administrative data desk:
            </p>
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs space-y-1 font-mono text-slate-700">
              <div>Email: <strong className="text-sky-600">privacy@civiclens.gov.in</strong></div>
              <div>Platform: CivicLens Municipal Redressal Governance Desk</div>
              <div>Jurisdiction: State Municipal Administration Authority</div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
