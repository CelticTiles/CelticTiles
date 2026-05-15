

export default async function PrivacyPage() {

    return (
        <>
            <main className="bg-[#E5E9F0] min-h-screen">
                <div className="container mx-auto max-w-[1000px] px-4 py-12">
                     <div className="bg-[#E5E9F0] neu-raised rounded-[2.5rem] p-8 md:p-16 border border-white/40">
                        <h1 className="font-serif text-4xl md:text-5xl font-bold uppercase tracking-wider text-slate-800 mb-8 text-center">
                            Privacy Policy
                        </h1>
                        <p className="text-center text-slate-500 mb-12 font-medium bg-[#E5E9F0] neu-inset py-2 px-6 rounded-full inline-block mx-auto">Last updated: December 2025</p>

                        <div className="space-y-12 text-slate-600">

                            <section>
                                <h2 className="text-2xl font-bold text-slate-800 mb-4">1. Introduction</h2>
                                <p className="bg-[#E5E9F0] neu-inset p-6 rounded-2xl">
                                    Celtic Tiles (&quot;we&quot;, &quot;our&quot;, &quot;us&quot;) is committed to protecting your privacy. This Privacy Policy explains
                                    how we collect, use, and protect your personal information when you use our website and services.
                                </p>
                            </section>

                            <div className="grid md:grid-cols-2 gap-8">
                                <section>
                                    <h2 className="text-xl font-bold text-slate-800 mb-4 bg-white/50 px-4 py-2 rounded-lg inline-block">2. Information We Collect</h2>
                                    <ul className="space-y-3 pl-2">
                                        <li className="flex items-center gap-3"><span className="w-1.5 h-1.5 rounded-full bg-primary"></span>Personal details</li>
                                        <li className="flex items-center gap-3"><span className="w-1.5 h-1.5 rounded-full bg-primary"></span>Payment information</li>
                                        <li className="flex items-center gap-3"><span className="w-1.5 h-1.5 rounded-full bg-primary"></span>Order history</li>
                                        <li className="flex items-center gap-3"><span className="w-1.5 h-1.5 rounded-full bg-primary"></span>Website usage data</li>
                                        <li className="flex items-center gap-3"><span className="w-1.5 h-1.5 rounded-full bg-primary"></span>Customer communications</li>
                                    </ul>
                                </section>

                                <section>
                                    <h2 className="text-xl font-bold text-slate-800 mb-4 bg-white/50 px-4 py-2 rounded-lg inline-block">3. Usage of Information</h2>
                                    <ul className="space-y-3 pl-2">
                                        <li className="flex items-center gap-3"><span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>Fulfill your orders</li>
                                        <li className="flex items-center gap-3"><span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>Order updates</li>
                                        <li className="flex items-center gap-3"><span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>Improve services</li>
                                        <li className="flex items-center gap-3"><span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>Marketing (opt-in only)</li>
                                        <li className="flex items-center gap-3"><span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>Legal compliance</li>
                                    </ul>
                                </section>
                            </div>

                            <section>
                                <h2 className="text-2xl font-bold text-slate-800 mb-4">4. Cookies</h2>
                                <p className="leading-relaxed">
                                    We use cookies to enhance your browsing experience, analyze website traffic, and personalize content.
                                    You can control cookie settings through your browser, but some features may not work properly if cookies
                                    are disabled.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-bold text-slate-800 mb-4">5. Data Security</h2>
                                <p className="bg-blue-50/50 border border-blue-100/50 p-6 rounded-2xl text-slate-700">
                                    We implement appropriate security measures to protect your personal information. Payment details are
                                    encrypted and processed by secure third-party payment providers.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-bold text-slate-800 mb-4">6. Sharing Your Information</h2>
                                <p className="mb-4">We may share your information with trusted partners:</p>
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                                    <div className="bg-white/40 p-3 rounded-xl text-center text-sm font-bold text-slate-700">Delivery Partners</div>
                                    <div className="bg-white/40 p-3 rounded-xl text-center text-sm font-bold text-slate-700">Payment Processors</div>
                                    <div className="bg-white/40 p-3 rounded-xl text-center text-sm font-bold text-slate-700">Marketing Tools</div>
                                    <div className="bg-white/40 p-3 rounded-xl text-center text-sm font-bold text-slate-700">Law Enforcement</div>
                                </div>
                                <p className="text-sm font-bold text-primary mt-2 flex items-center gap-2">
                                    <span className="text-lg">🔒</span> We never sell your personal information to third parties.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-bold text-slate-800 mb-4">7. Your Rights (GDPR)</h2>
                                <div className="bg-[#E5E9F0] neu-inset rounded-2xl p-6 grid md:grid-cols-2 gap-4">
                                     <div className="flex items-center gap-3">
                                        <span className="w-2 h-2 rounded-full bg-slate-400"></span> Access your data
                                     </div>
                                     <div className="flex items-center gap-3">
                                        <span className="w-2 h-2 rounded-full bg-slate-400"></span> Correct inaccuracies
                                     </div>
                                     <div className="flex items-center gap-3">
                                        <span className="w-2 h-2 rounded-full bg-slate-400"></span> Request deletion
                                     </div>
                                     <div className="flex items-center gap-3">
                                        <span className="w-2 h-2 rounded-full bg-slate-400"></span> Opt-out of marketing
                                     </div>
                                </div>
                            </section>

                            <section className="bg-[#E5E9F0] neu-raised p-8 rounded-[2rem] text-center border border-white/40 mt-12">
                                <h2 className="text-2xl font-bold text-slate-800 mb-4">Privacy Concerns?</h2>
                                <p className="text-slate-600 mb-6">
                                    For privacy-related questions or to exercise your rights, contact our Data Protection Officer.
                                </p>
                                <a href="mailto:admin@celtictiles.ie" className="inline-block px-8 py-3 bg-white neu-raised text-primary font-bold rounded-full hover:scale-105 transition-transform">
                                    admin@celtictiles.ie
                                </a>
                            </section>
                        </div>
                    </div>
                </div>
            </main>
        </>
    )
}
