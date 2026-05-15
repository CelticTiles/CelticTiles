

export default async function ReturnsPage() {

    return (
        <>
            <main className="bg-[#E5E9F0] min-h-screen">
                <div className="container mx-auto max-w-[1000px] px-4 py-12">
                   
                    <div className="bg-[#E5E9F0] neu-raised rounded-[2.5rem] p-8 md:p-16 border border-white/40">
                        <h1 className="font-serif text-4xl md:text-5xl font-bold uppercase tracking-wider text-slate-800 mb-12 text-center border-b border-white/50 pb-8">
                            Returns Policy
                        </h1>

                        <div className="prose prose-lg max-w-none space-y-12 text-slate-600">
                            <section>
                                <h2 className="text-2xl font-bold text-slate-800 mb-4 bg-[#E5E9F0] neu-raised px-6 py-3 rounded-xl inline-block">30-Day Returns</h2>
                                <p className="leading-relaxed pl-2">
                                    We want you to be completely satisfied with your purchase. If you&apos;re not happy with your order,
                                    you can return it within 30 days of delivery for a full refund or exchange.
                                </p>
                            </section>

                            <section className="grid md:grid-cols-2 gap-8">
                                <div className="bg-[#E5E9F0] neu-inset rounded-2xl p-6">
                                    <h2 className="text-xl font-bold text-slate-800 mb-4">Return Conditions</h2>
                                    <p className="text-sm font-semibold mb-3">To be eligible for a return, items must:</p>
                                    <ul className="space-y-3 text-sm">
                                        <li className="flex items-start gap-2">✅ Be in their original, unopened packaging</li>
                                        <li className="flex items-start gap-2">✅ Be unused and in the same condition as received</li>
                                        <li className="flex items-start gap-2">✅ Include the original receipt or proof of purchase</li>
                                        <li className="flex items-start gap-2">✅ Not be custom-ordered or cut-to-size items</li>
                                    </ul>
                                </div>

                                <div className="bg-red-50/50 border border-red-100/50 rounded-2xl p-6">
                                    <h2 className="text-xl font-bold text-red-800 mb-4">Non-Returnable Items</h2>
                                    <p className="text-sm font-semibold mb-3 text-red-800/80">The following items cannot be returned:</p>
                                    <ul className="space-y-3 text-sm text-red-700">
                                        <li className="flex items-start gap-2">❌ Custom-ordered or special order products</li>
                                        <li className="flex items-start gap-2">❌ Cut tiles or made-to-measure items</li>
                                        <li className="flex items-start gap-2">❌ Opened packages are not allowed</li>
                                        <li className="flex items-start gap-2">❌ Sale or clearance items (unless faulty)</li>
                                    </ul>
                                </div>
                            </section>

                            <section>
                                <h2 className="text-2xl font-bold text-slate-800 mb-6 inline-block border-b-2 border-primary/20 pb-1">How to Return</h2>
                                <ol className="list-none space-y-4">
                                    {[
                                        "Contact our customer service team", 
                                        "Receive your return authorization number", 
                                        "Package items securely in original packaging", 
                                        "Arrange collection or return to showroom", 
                                        "Refund processed within 5-10 business days"
                                    ].map((step, i) => (
                                        <li key={i} className="flex items-center gap-4 bg-[#E5E9F0] neu-raised p-4 rounded-xl">
                                            <span className="w-8 h-8 rounded-full bg-primary text-white font-bold flex items-center justify-center text-sm flex-shrink-0">
                                                {i + 1}
                                            </span>
                                            <span className="font-medium text-slate-700">{step}</span>
                                        </li>
                                    ))}
                                </ol>
                            </section>

                            <section>
                                <h2 className="text-2xl font-bold text-slate-800 mb-4">Damaged or Faulty Items</h2>
                                <p className="bg-[#E5E9F0] neu-inset p-6 rounded-2xl">
                                    If you receive damaged or faulty items, please contact us immediately with photos of the damage.
                                    We&apos;ll arrange a replacement or refund at no cost to you, including return shipping.
                                </p>
                            </section>

                            <div className="grid md:grid-cols-2 gap-8 items-start">
                                <section>
                                    <h2 className="text-2xl font-bold text-slate-800 mb-4">Refunds</h2>
                                    <p className="mb-4">
                                        Once we receive and inspect your return, we&apos;ll notify you via email. If approved, your refund
                                        will be processed to your original payment method within 5-10 business days.
                                    </p>
                                    <p className="text-sm font-bold text-slate-500">
                                        Delivery charges are non-refundable except in cases of damaged or faulty items.
                                    </p>
                                </section>

                                <section className="bg-[#E5E9F0] neu-raised p-8 rounded-[2rem] text-center border border-white/40">
                                    <h2 className="text-2xl font-bold text-slate-800 mb-4">Questions?</h2>
                                    <p className="text-slate-600 mb-6">
                                        For any questions about returns, please contact us directly.
                                    </p>
                                    <div className="flex flex-col gap-3">
                                        <a href="tel:+35312345678" className="text-primary font-bold hover:underline">📞 +353 14090558</a>
                                        <a href="mailto:admin@celtictiles.ie" className="text-primary font-bold hover:underline">✉️ admin@celtictiles.ie</a>
                                    </div>
                                </section>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </>
    )
}
