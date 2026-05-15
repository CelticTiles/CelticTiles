

export default async function TermsPage() {

    return (
        <>
            <main className="bg-[#E5E9F0] min-h-screen">
                <div className="container mx-auto max-w-[1000px] px-4 py-12">
                     <div className="bg-[#E5E9F0] neu-raised rounded-[2.5rem] p-8 md:p-16 border border-white/40">
                        <h1 className="font-serif text-4xl md:text-5xl font-bold uppercase tracking-wider text-slate-800 mb-8 text-center">
                            Terms & Conditions
                        </h1>
                        <p className="text-center text-slate-500 mb-12 font-medium bg-[#E5E9F0] neu-inset py-2 px-6 rounded-full inline-block mx-auto">Last updated: December 2025</p>

                        <div className="space-y-10 text-slate-600 leading-relaxed">

                            <section>
                                <h2 className="text-2xl font-bold text-slate-800 mb-4 flex items-center gap-3">
                                    <span className="text-primary/40 text-3xl font-serif">1.</span> Introduction
                                </h2>
                                <p className="bg-[#E5E9F0] neu-inset p-6 rounded-2xl">
                                    These Terms and Conditions govern your use of the Celtic Tiles website and the purchase of products
                                    from Celtic Tiles. By using our website and placing orders, you agree to these terms.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-bold text-slate-800 mb-4 flex items-center gap-3">
                                    <span className="text-primary/40 text-3xl font-serif">2.</span> Orders and Payment
                                </h2>
                                <p className="mb-4 pl-4">
                                    All orders are subject to acceptance and availability. We reserve the right to refuse any order.
                                </p>
                                <div className="ml-8 space-y-3">
                                    <div className="flex items-start gap-3">
                                        <div className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-2"></div>
                                        <p>Prices are in Euros (€) and include VAT where applicable</p>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <div className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-2"></div>
                                        <p>Payment must be made in full before delivery unless credit terms agreed</p>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <div className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-2"></div>
                                        <p>We accept all major credit/debit cards and PayPal</p>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <div className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-2"></div>
                                        <p>Prices may change without notice but confirmed orders remain at quoted price</p>
                                    </div>
                                </div>
                            </section>

                            <div className="h-px bg-slate-200/50 my-8"></div>

                            <section className="grid md:grid-cols-2 gap-8">
                                <div>
                                    <h2 className="text-2xl font-bold text-slate-800 mb-4 flex items-center gap-3">
                                        <span className="text-primary/40 text-3xl font-serif">3.</span> Delivery
                                    </h2>
                                    <p className="bg-white/50 p-6 rounded-2xl border border-white">
                                        Delivery times are estimates and not guaranteed. We are not liable for delays outside our control.
                                        See our Delivery Information page for full details.
                                    </p>
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold text-slate-800 mb-4 flex items-center gap-3">
                                        <span className="text-primary/40 text-3xl font-serif">4.</span> Returns
                                    </h2>
                                    <p className="bg-white/50 p-6 rounded-2xl border border-white">
                                        Returns are accepted within 30 days subject to our Returns Policy. Custom-made and cut-to-size
                                        items cannot be returned unless faulty.
                                    </p>
                                </div>
                            </section>

                            <div className="h-px bg-slate-200/50 my-8"></div>

                            <section>
                                <h2 className="text-2xl font-bold text-slate-800 mb-4 flex items-center gap-3">
                                    <span className="text-primary/40 text-3xl font-serif">5.</span> Product Information
                                </h2>
                                <p className="leading-relaxed pl-4">
                                    We strive to ensure product information is accurate. However, manufacturers may change specifications
                                    without notice. Colors may appear differently on screen. <strong className="text-primary">We recommend ordering samples before large purchases.</strong>
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-bold text-slate-800 mb-4 flex items-center gap-3">
                                    <span className="text-primary/40 text-3xl font-serif">6.</span> Limitation of Liability
                                </h2>
                                <p className="leading-relaxed pl-4">
                                    Our liability to you is limited to the purchase price of the products. We are not liable for any
                                    indirect or consequential losses, including installation costs or loss of business.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-bold text-slate-800 mb-4 flex items-center gap-3">
                                    <span className="text-primary/40 text-3xl font-serif">7.</span> Intellectual Property
                                </h2>
                                <p className="leading-relaxed pl-4">
                                    All content on this website, including images, text, and logos, is the property of Celtic Tiles
                                    and protected by copyright laws.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-bold text-slate-800 mb-4 flex items-center gap-3">
                                    <span className="text-primary/40 text-3xl font-serif">8.</span> Governing Law
                                </h2>
                                <p className="leading-relaxed pl-4">
                                    These terms are governed by Irish law. Any disputes will be subject to the exclusive jurisdiction
                                    of the Irish courts.
                                </p>
                            </section>

                            <section className="bg-slate-100 p-8 rounded-[2rem] text-center mt-12">
                                <h2 className="text-2xl font-bold text-slate-800 mb-4">Questions about our Terms?</h2>
                                <p className="text-slate-600 mb-6">
                                    For questions about these terms, please contact our legal team.
                                </p>
                                <a href="mailto:admin@celtictiles.ie" className="inline-block px-8 py-3 bg-white border border-slate-200 rounded-full font-bold text-primary hover:bg-primary hover:text-white transition-colors">
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
