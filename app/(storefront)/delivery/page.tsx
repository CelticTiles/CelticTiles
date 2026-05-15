

export default async function DeliveryPage() {

    return (
        <>
             
            <main className="bg-[#E5E9F0] min-h-screen">
                <div className="container mx-auto max-w-[1000px] px-4 py-12">
                   
                   {/* Main Content Card */}
                   <div className="bg-[#E5E9F0] neu-raised rounded-[2.5rem] p-8 md:p-16 border border-white/40">
                        <h1 className="font-serif text-4xl md:text-5xl font-bold uppercase tracking-wider text-primary mb-12 text-center border-b border-white/50 pb-8">
                            Delivery Information
                        </h1>

                        <div className="space-y-12">
                            <section>
                                <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-3">
                                  <span className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm">01</span>
                                  Delivery Charges
                                </h2>
                                <div className="bg-[#E5E9F0] neu-inset rounded-2xl p-6 md:p-8 space-y-4">
                                    <ul className="space-y-4 text-slate-600">
                                        <li className="flex items-center gap-3">
                                            <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                            <span><strong>FREE delivery</strong> on all orders over €1000</span>
                                        </li>
                                        <li className="flex items-center gap-3">
                                            <span className="w-2 h-2 rounded-full bg-primary/60"></span>
                                            <span><strong>€60.00 delivery</strong> for orders under €1000</span>
                                        </li>
                                        <li className="flex items-center gap-3">
                                            <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                                            <span>Delivery charges calculated at checkout</span>
                                        </li>
                                    </ul>
                                </div>
                            </section>

                            <section>
                                <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-3">
                                  <span className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm">02</span>
                                  Delivery Times
                                </h2>
                                <div className="bg-[#E5E9F0] neu-inset rounded-2xl p-6 md:p-8">
                                    <p className="text-slate-700 font-medium mb-4">
                                        Standard delivery times across Ireland:
                                    </p>
                                    <ul className="space-y-3 text-slate-600">
                                        <li className="flex items-center gap-2">► Dublin area: 2-3 business days</li>
                                        <li className="flex items-center gap-2">► Rest of Ireland: 3-5 business days</li>
                                        <li className="flex items-center gap-2">► Express delivery available (additional charges apply)</li>
                                    </ul>
                                    <div className="mt-6 p-4 bg-yellow-50 rounded-xl border border-yellow-100/50 text-sm text-yellow-800 flex gap-3 items-start">
                                       <span className="text-lg">⚠️</span>
                                       Please note that delivery times may be slightly longer for large or bulky orders.
                                    </div>
                                </div>
                            </section>

                            <section>
                                <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-3">
                                  <span className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm">03</span>
                                  Order Tracking
                                </h2>
                                <p className="text-slate-600 leading-relaxed bg-[#E5E9F0] neu-inset rounded-2xl p-6">
                                    Once your order is dispatched, you&apos;ll receive a confirmation email with a tracking number.
                                    You can use this to track your delivery in real-time through our courier&apos;s website.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-3">
                                  <span className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm">04</span>
                                  Delivery Process
                                </h2>
                                <div className="bg-[#E5E9F0] neu-inset rounded-2xl p-8">
                                    <ol className="relative border-l-2 border-slate-200 ml-3 space-y-8">
                                        <li className="ml-6">
                                            <span className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-slate-300 ring-4 ring-[#E5E9F0]"></span>
                                            <h4 className="font-bold text-slate-800">Order confirmed</h4>
                                            <p className="text-sm text-slate-500 mt-1">Processed immediately</p>
                                        </li>
                                        <li className="ml-6">
                                            <span className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-slate-300 ring-4 ring-[#E5E9F0]"></span>
                                            <h4 className="font-bold text-slate-800">Picked & Packed</h4>
                                            <p className="text-sm text-slate-500 mt-1">Quality checked at warehouse</p>
                                        </li>
                                        <li className="ml-6">
                                            <span className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-slate-300 ring-4 ring-[#E5E9F0]"></span>
                                            <h4 className="font-bold text-slate-800">Dispatched</h4>
                                            <p className="text-sm text-slate-500 mt-1">Notification sent with tracking</p>
                                        </li>
                                        <li className="ml-6">
                                             <span className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-primary ring-4 ring-[#E5E9F0]"></span>
                                            <h4 className="font-bold text-slate-800">Delivered</h4>
                                            <p className="text-sm text-slate-500 mt-1">Signature required</p>
                                        </li>
                                    </ol>
                                </div>
                            </section>

                            <section>
                                <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-3">
                                  <span className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm">05</span>
                                  Important Notes
                                </h2>
                                <ul className="space-y-3 text-slate-600 bg-red-50/50 rounded-2xl p-6 border border-red-100/50">
                                    <li className="flex items-start gap-2 text-sm">
                                        <span className="text-red-500 font-bold mt-0.5">•</span>
                                        Please inspect all items upon delivery
                                    </li>
                                    <li className="flex items-start gap-2 text-sm">
                                        <span className="text-red-500 font-bold mt-0.5">•</span>
                                        Report any damage to the courier immediately
                                    </li>
                                    <li className="flex items-start gap-2 text-sm">
                                        <span className="text-red-500 font-bold mt-0.5">•</span>
                                        Keep original packaging for potential returns
                                    </li>
                                    <li className="flex items-start gap-2 text-sm">
                                        <span className="text-red-500 font-bold mt-0.5">•</span>
                                        Someone must be present to sign for delivery
                                    </li>
                                </ul>
                            </section>

                            <section className="mt-12 p-8 bg-[#E5E9F0] neu-inset rounded-3xl text-center">
                                <h2 className="text-2xl font-bold text-slate-800 mb-4">Need Help?</h2>
                                <p className="text-slate-600 mb-6">
                                    If you have any questions about delivery, please contact our customer service team.
                                </p>
                                <div className="flex flex-col md:flex-row justify-center gap-4">
                                     <a href="tel:+35314090558" className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-white neu-raised text-primary font-bold hover:text-primary-dark transition-colors">
                                        📞 +353 14090558
                                     </a>
                                     <a href="mailto:admin@celtictiles.ie" className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-white neu-raised text-primary font-bold hover:text-primary-dark transition-colors">
                                        ✉️ admin@celtictiles.ie
                                     </a>
                                </div>
                            </section>
                        </div>
                   </div>
                </div>
            </main>
        </>
    )
}
