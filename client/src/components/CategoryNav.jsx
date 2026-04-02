import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Swiper, SwiperSlide } from 'swiper/react'
import 'swiper/css'

const categories = [
  { name: 'All', slug: 'all' },
  { name: 'Cardigans and Jackets', slug: 'cardigans-and-jackets' },
  { name: 'Bottom-Wear', slug: 'bottom-wear' },
  { name: 'T-shirts and Button-ups', slug: 't-shirts-and-button-ups' },
  { name: 'Sweaters and Hoodies', slug: 'sweaters-and-hoodies' },
  { name: 'Bags', slug: 'bags' },
  { name: 'Archives', slug: 'archives' },
]

/**
 * @param {'horizontal'|'vertical'} [orientation='horizontal']
 * @param {string} [className='']
 */
export default function CategoryNav({
  orientation = 'horizontal',
  className = '',
}) {
  const isVertical = orientation === 'vertical'
  const location = useLocation()

  return (
    <nav className={className + " py-3 px-4"}>
      <ul
        className={
          isVertical
            ? 'flex flex-col divide-y divide-gray-200'
            : 'flex justify-center space-x-8'
        }
      >
        {categories.map(cat => {
          const path = cat.slug === 'all' ? '/all' : `/category/${cat.slug}`;
          const isActive = location.pathname === path;
          return (
            <li
              key={cat.name}
              className={
                isVertical
                  ? 'w-full py-4 text-center text-lg'
                  : 'text-lg'
              }
            >
              <Link 
                to={path}
                className={`hover:underline ${isActive ? 'font-bold' : ''}`}
              >
                {cat.name}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
