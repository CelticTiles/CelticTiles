"use client";

import { useRef } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Autoplay } from "swiper/modules";
import { ChevronLeft, ChevronRight, Quote } from "lucide-react";
import { StarRating } from "@/components/ui/star-rating";
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card";
import "swiper/css";

interface Review {
  id: string;
  rating: number;
  title: string;
  content: string;
  author: string;
  date: string;
  location?: string;
}

const reviews: Review[] = [
  {
    id: "1",
    rating: 5,
    title: "Outstanding Service",
    content: "So happy I chose this family business. They really look after you from start to finish.",
    author: "Magda Maj",
    date: "Jan 30, 2025"
  },
  {
    id: "2",
    rating: 5,
    title: "Highly Professional",
    content: "Great selection of tiles and very convenient same-day delivery. Very professional.",
    author: "Deirdre Hogan",
    date: "Jan 3, 2025"
  },
  {
    id: "3",
    rating: 5,
    title: "Bathroom Renovation",
    content: "More than happy with two renovated bathrooms. Kerusha gave great guidance on tiles.",
    author: "Gurunath Kale",
    date: "Dec 3, 2024"
  },
  {
    id: "4",
    rating: 5,
    title: "Gorgeous Tiles",
    content: "Excellent service from Pavan. Gorgeous and unusual tiles that you don't see elsewhere.",
    author: "Grace H.",
    date: "Dec 3, 2024"
  },
  {
    id: "5",
    rating: 5,
    title: "Fantastic Experience",
    content: "Fantastic experience. Friendly team helped us pick the perfect flooring and tiles.",
    author: "Nandini Vihaan",
    date: "Dec 3, 2024"
  },
  {
    id: "6",
    rating: 5,
    title: "Highly Recommended",
    content: "Beyond thrilled with the tiling and laminate flooring in my new home. Highly recommend.",
    author: "Aditi Upadhyay",
    date: "Dec 3, 2024"
  },
  {
    id: "7",
    rating: 5,
    title: "Excellent Job",
    content: "The team did an excellent job. Tilers and staff were very helpful and professional.",
    author: "Ganapathy Manian",
    date: "Nov 3, 2024"
  },
  {
    id: "8",
    rating: 5,
    title: "Three Bathrooms Done",
    content: "Three bathrooms done with porcelain tiles. Thanks to Chaitanya and Praveen for the help.",
    author: "Avishek Singh",
    date: "Nov 3, 2024"
  },
  {
    id: "9",
    rating: 5,
    title: "Great After-Sales Support",
    content: "Srini was always available to resolve issues even after the job was finished. Great service.",
    author: "Sourabh Chauhan",
    date: "Nov 3, 2024"
  },
  {
    id: "10",
    rating: 5,
    title: "Perfect Flooring Choice",
    content: "Fantastic experience. Friendly team helped us pick the perfect flooring and tiles.",
    author: "Nandini Vihaan",
    date: "Dec 3, 2024"
  },
  {
    id: "11",
    rating: 5,
    title: "New Home Transformation",
    content: "Beyond thrilled with the tiling and laminate flooring in my new home. Highly recommend.",
    author: "Aditi Upadhyay",
    date: "Dec 3, 2024"
  },
  {
    id: "12",
    rating: 5,
    title: "Expert Guidance",
    content: "More than happy with two renovated bathrooms. Kerusha gave great guidance on tiles.",
    author: "Gurunath Kale",
    date: "Dec 3, 2024"
  },
  {
    id: "13",
    rating: 5,
    title: "Unique Selection",
    content: "Excellent service from Pavan. Gorgeous and unusual tiles that you don't see elsewhere.",
    author: "Grace H.",
    date: "Dec 3, 2024"
  },
  {
    id: "14",
    rating: 5,
    title: "Same-Day Delivery",
    content: "Great selection of tiles and very convenient same-day delivery. Very professional.",
    author: "Deirdre Hogan",
    date: "Jan 3, 2025"
  },
  {
    id: "15",
    rating: 5,
    title: "Family Business Excellence",
    content: "So happy I chose this family business. They really look after you from start to finish.",
    author: "Magda Maj",
    date: "Jan 30, 2025"
  }
];

export function ReviewCarousel() {
  const prevRef = useRef<HTMLButtonElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);

  return (
    <section className="py-16 md:py-20 bg-[#E5E9F0] overflow-hidden">
      <div className="container mx-auto max-w-[1400px] px-4">
        <h2 className="font-serif text-3xl md:text-4xl font-bold uppercase tracking-wider text-center mb-12 text-tm-text">
          Customer Reviews
        </h2>

        <div className="relative">
          <button
            ref={prevRef}
            className="absolute -left-2 md:-left-4 top-1/2 -translate-y-1/2 z-10 h-10 w-10 flex items-center justify-center rounded-full neu-raised bg-[#E5E9F0] text-tm-text-muted hover:text-tm-red transition-colors disabled:opacity-0"
            aria-label="Previous review"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>

          <button
            ref={nextRef}
            className="absolute -right-2 md:-right-4 top-1/2 -translate-y-1/2 z-10 h-10 w-10 flex items-center justify-center rounded-full neu-raised bg-[#E5E9F0] text-tm-text-muted hover:text-tm-red transition-colors disabled:opacity-0"
            aria-label="Next review"
          >
            <ChevronRight className="h-6 w-6" />
          </button>

          <Swiper
            modules={[Navigation, Autoplay]}
            spaceBetween={20}
            slidesPerView={1}
            autoplay={{ delay: 5000, disableOnInteraction: false }}
            navigation={{
              prevEl: prevRef.current,
              nextEl: nextRef.current,
            }}
            onBeforeInit={(swiper) => {
              if (typeof swiper.params.navigation !== "boolean") {
                const navigation = swiper.params.navigation;
                if (navigation) {
                  navigation.prevEl = prevRef.current;
                  navigation.nextEl = nextRef.current;
                }
              }
            }}
            breakpoints={{
              640: { slidesPerView: 2, spaceBetween: 30 },
              1024: { slidesPerView: 3, spaceBetween: 40 },
            }}
            className="px-4 py-8"
          >
            {reviews.map((review) => (
              <SwiperSlide key={review.id} className="h-auto">
                <Card className="h-full border-none neu-raised bg-[#E5E9F0] rounded-[2rem]">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <StarRating rating={review.rating} size="sm" showNumber={false} />
                    <span className="text-xs text-tm-text-muted">{review.date}</span>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <h3 className="font-bold text-tm-text mb-2">{review.title}</h3>
                    <p className="text-tm-text-muted text-sm italic">&quot;{review.content}&quot;</p>
                  </CardContent>
                  <CardFooter className="flex flex-col items-start pt-4">
                    <p className="font-bold text-tm-text">{review.author}</p>
                    {review.location && <p className="text-xs text-tm-text-muted">{review.location}</p>}
                  </CardFooter>
                </Card>
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
      </div>
    </section>
  );
}
