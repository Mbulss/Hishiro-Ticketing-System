// src/components/Slider.jsx
import React, { useState } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { EffectCoverflow, Autoplay, Navigation } from 'swiper/modules';

import 'swiper/css';
import 'swiper/css/effect-coverflow';
import 'swiper/css/navigation';

import bg from '../assets/background-scaled.png';

const slides = [
  { title: 'Shop Now',      img: '/slide1.png' },
  { title: 'New Arrivals',  img: '/slide2.png' },
  { title: 'Limited Edition', img: '/slide3.png' },
  { title: 'Shop Now',  img: '/slide1.png' },
  { title: 'New Arrivals',  img: '/slide2.png' },
  { title: 'Limited Edition',  img: '/slide3.png' },
];

export default function Slider() {
  const [activeIdx, setActiveIdx] = useState(0);

  return (
    <section
      className="w-full slider-section bg-white"
      style={{
        backgroundImage: `url(${bg})`,
        backgroundSize: '900px 600px',
      }}
    >
      <h3 className="text-center uppercase text-2xl font-light mb-8">
        TRUE BANKAI JACKET
      </h3>

      <Swiper
        modules={[EffectCoverflow, Autoplay, Navigation]}
        effect="coverflow"
        grabCursor
        centeredSlides
        slidesPerView="auto"               
        spaceBetween={30}
        loop={true}                         
        autoplay={{ delay: 3000, disableOnInteraction: false }}
        navigation
        speed={900}
        coverflowEffect={{
          rotate: 0,
          stretch: 0,
          depth: 200,
          modifier: 1,
          slideShadows: false,
        }}

        // track the real slide index for overlay
        onRealIndexChange={({ realIndex }) => setActiveIdx(realIndex)}
        className="py-8"
      >
        {slides.map((slide, idx) => (
          <SwiperSlide
            key={idx}
            style={{ width: '900px', height: '400px' }}  
            className="relative overflow-hidden"
          >
            <img
              src={slide.img}
              alt={slide.title}
              className="w-full h-full object-cover"
            />
            <div
              className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300
                ${idx === activeIdx ? 'bg-black bg-opacity-50' : 'bg-transparent'}
              `}
            >
              {idx === activeIdx && (
                <h2 className="text-white text-4xl font-bold">
                  {slide.title}
                </h2>
              )}
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
    </section>
  );
}
