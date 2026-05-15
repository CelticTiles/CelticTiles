import { CheckCircle } from "lucide-react";


export default async function AboutPage() {

  const features = [
    "Wide range of premium products",
    "Competitive pricing with price match guarantee",
    "Expert advice from knowledgeable staff",
    "Fast delivery across Ireland",
    "Showroom with thousands of samples",
    "Trade accounts available",
  ];

  const values = [
    {
      title: "Quality",
      description: "We source only the finest products from trusted manufacturers to ensure durability and style.",
    },
    {
      title: "Service",
      description: "Our knowledgeable team is here to guide you through every step of your project.",
    },
    {
      title: "Value",
      description: "Competitive prices and special offers ensure you get the best value for your money.",
    },
  ];

  return (
    <>
      <div className="bg-[#E5E9F0] min-h-screen">
        {/* Hero Section Container */}
        <div className="container mx-auto max-w-[1400px] px-4 py-12">
           <div className="bg-[#E5E9F0] neu-raised rounded-[2.5rem] p-8 md:p-16 border border-white/40 mb-12">
              <div className="text-center">
                <h1 className="font-serif text-5xl md:text-6xl font-bold text-slate-800 mb-6">
                  ABOUT CELTIC TILES
                </h1>
                <p className="text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
                  Ireland&apos;s leading supplier of quality tiles, flooring, and bathroom products
                </p>
              </div>
           </div>
           
           {/* Our Story */}
           <div className="bg-[#E5E9F0] neu-inset rounded-[2.5rem] p-8 md:p-16 mb-12 border border-white/20">
             <h2 className="text-4xl font-bold text-slate-800 mb-8 font-serif">Our Story</h2>
             <div className="space-y-6 text-lg text-slate-600 max-w-4xl leading-relaxed">
               <p>
                 Celtic Tiles is a traditional irish company driven by creativity and an endless passion for helping you find the perfect tile for your project. Each person on our team is eager to develop a long lasting relationship with you. We are a strong, personality-driven brand that's carved a unique niche in the renovation and interior design landscape, with a customer experience that remains unmatched in style, service, and selection.
               </p>
               <p>
                 Our goal is to deliver you endless inspiration and the perfect tile pairing for your design project. We can't wait to work together and make you a part of our family today.
               </p>
             </div>
           </div>
           
           {/* Why Choose Us */}
            <div className="bg-[#E5E9F0] neu-raised rounded-[2.5rem] p-8 md:p-16 mb-12 border border-white/40">
              <h2 className="text-4xl font-bold text-slate-800 text-center mb-16 font-serif">
                Why Choose Celtic Tiles?
              </h2>
              <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                {features.map((feature, index) => (
                  <div key={index} className="flex items-start gap-4 p-4 rounded-2xl hover:bg-white/30 transition-colors">
                    <CheckCircle className="w-6 h-6 text-tm-red flex-shrink-0 mt-1" />
                    <p className="text-lg text-slate-700 font-medium">{feature}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Our Values */}
            <div className="grid md:grid-cols-3 gap-8">
              {values.map((value, index) => (
                <div key={index} className="bg-[#E5E9F0] neu-raised rounded-[2rem] p-8 border border-white/40 hover:scale-[1.02] transition-transform duration-300">
                  <h3 className="text-2xl font-bold text-tm-red mb-4">{value.title}</h3>
                  <p className="text-slate-600 leading-relaxed">
                    {value.description}
                  </p>
                </div>
              ))}
            </div>
        </div>
      </div>
    </>
  );
}
