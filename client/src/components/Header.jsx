// src/components/Header.jsx
import React, { useState, useEffect } from 'react'
import {
  Bars3Icon,
  XMarkIcon,
  MagnifyingGlassIcon,
  ShoppingBagIcon,
  UserIcon,
} from '@heroicons/react/24/outline'
import { Link, useLocation } from 'react-router-dom'

import logo from '../assets/logo.png'
import logoWhite from '../assets/logo-white.png'
import CategoryNav from './CategoryNav'
import { useAuthState } from 'react-firebase-hooks/auth'
import { auth } from '../firebase'

export default function Header({ onSearchClick }) {
  const [user] = useAuthState(auth);
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const location = useLocation();

  // Define routes for white logo/transparent effect
  const showHeroHeader = location.pathname === '/';

  // Add scroll event listener
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 50) {
        setScrolled(true)
      } else {
        setScrolled(false)
      }
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled || !showHeroHeader ? 'bg-white shadow-md' : 'bg-transparent'}`}>
      {/* Top bar with logo and icons */}
      <div className={`relative max-w-screen-xl mx-auto flex items-center h-20 px-4 ${scrolled || !showHeroHeader ? 'border-b' : ''}`}>
        {/* Hamburger button: show on all screens before scroll, only mobile after scroll */}
        <button
          onClick={() => setOpen(o => !o)}
          className={`p-2 transition-opacity duration-300 opacity-100 ${scrolled || !showHeroHeader ? 'show-below-1120' : ''}`}
          aria-label="Toggle menu"
        >
          <Bars3Icon className={`h-6 w-6 ${scrolled || !showHeroHeader ? 'text-black' : 'text-white'}`} />
        </button>

        {/* Centered logo */}
        <div className={`absolute transition-all duration-300 ${
          scrolled || !showHeroHeader
            ? 'left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2' 
            : 'left-1/2 top-[2vh] transform -translate-x-1/2'
        }`}>
          <Link to="/">
            <img
              src={scrolled || !showHeroHeader ? logo : logoWhite}
              alt="Logo"
              className={`transition-all duration-300 ${
                scrolled || !showHeroHeader
                  ? 'h-12 md:h-16' 
                  : 'h-32 md:h-44 lg:h-56 p-2 md:p-4 drop-shadow-2xl filter brightness-110'
              } object-contain`}
            />
          </Link>
        </div>

        {/* Always-visible icons */}
        <div className="absolute right-4 top-1/2 transform -translate-y-1/2 flex items-center space-x-4 md:space-x-6 transition-opacity duration-300 opacity-100">
          <div className="relative">
            <button onClick={onSearchClick} className="p-1">
              <MagnifyingGlassIcon className={`h-5 w-5 md:h-6 md:w-6 ${scrolled || !showHeroHeader ? 'text-black' : 'text-white'}`} />
            </button>
          </div>
          <div className="relative">
            <ShoppingBagIcon className={`h-5 w-5 md:h-6 md:w-6 ${scrolled || !showHeroHeader ? 'text-black' : 'text-white'}`} />
            <span className="absolute -top-1 -right-2 h-4 w-4 text-xs flex items-center justify-center bg-black text-white rounded-full">
              0
            </span>
          </div>
          <Link to={user ? "/dashboard" : "/login"}>
            <UserIcon className={`h-5 w-5 md:h-6 md:w-6 ${scrolled || !showHeroHeader ? 'text-black' : 'text-white'}`} />
          </Link>
        </div>
      </div>

      {/* Desktop category bar - only visible when scrolled */}
      {(scrolled || !showHeroHeader) && (
        <div className={`bg-white border-b show-above-1119 ${showHeroHeader ? 'sticky top-[5rem]' : ''} z-30 transition-all duration-300 ${scrolled || !showHeroHeader ? 'opacity-100 max-h-20' : 'opacity-0 max-h-0 overflow-hidden'}`}>
          <CategoryNav />
        </div>
      )}

      {/* Mobile overlay (fades) */}
      <div
        className={`
          fixed inset-0 bg-black bg-opacity-30 z-40
          transition-opacity duration-300
          ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}
        `}
        onClick={() => setOpen(false)}
      />

      {/* Mobile drawer (slides) */}
      <aside
        className={`
          fixed inset-x-0 top-[calc(5rem+1px)] bottom-0 bg-white z-50 overflow-auto
          transform transition-transform duration-300 ease-in-out
          ${open ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Drawer header with close button */}
        <div className="flex items-center h-16 border-b px-4">
          <button
            onClick={() => setOpen(false)}
            className="flex items-center space-x-2 p-2"
            aria-label="Close menu"
          >
            <XMarkIcon className="h-6 w-6 text-black" />
            <span className="text-base font-medium text-black">Close</span>
          </button>
        </div>

        {/* Vertical nav */}
        <CategoryNav orientation="vertical" />
      </aside>
    </header>
  )
}
