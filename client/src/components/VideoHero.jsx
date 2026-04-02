import React from 'react';

export default function VideoHero() {
  return (
    <>
      <section className="w-full h-screen relative overflow-hidden">
        {/* Full-screen video background */}
        <video
          className="absolute inset-0 w-full h-full object-cover"
          autoPlay
          muted
          loop
          playsInline
        >
          <source src="/Video (1).mp4" type="video/mp4" />
          Your browser does not support the video tag.
        </video>
      </section>
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-10 flex flex-col items-center">
        <svg className="w-10 h-10 text-white animate-bounce" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </>
  );
} 