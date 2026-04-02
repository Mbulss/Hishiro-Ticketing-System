// src/components/Footer.jsx
import React from "react";
import { PhoneIcon, EnvelopeIcon } from "@heroicons/react/24/outline";
import { FaInstagram, FaTiktok } from "react-icons/fa";
import logo from "../assets/logo-white.png";

export default function Footer() {
  return (
    <footer className="bg-black text-white">
      <div className="max-w-screen-xl mx-auto px-6 py-12 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-7 gap-8">
        {/* Logo & Contact (2/7) */}
        <div className="md:col-span-2">
          <img src={logo} alt="Hishiro Logo" className="h-20 mb-4" />
          <ul className="space-y-3">
            <li className="flex items-center">
              <PhoneIcon className="w-5 h-5 mr-2" />
              +62 878-4684-8368
            </li>
            <li className="flex items-center">
              <EnvelopeIcon className="w-5 h-5 mr-2" />
              hishiro.id@gmail.com
            </li>
            <li className="flex items-center">
              <FaInstagram className="w-5 h-5 mr-2" />
              @hishiro.id
            </li>
            <li className="flex items-center">
              <FaTiktok className="w-5 h-5 mr-2" />
              hishiro_id
            </li>
          </ul>
        </div>

        {/* Newsletter (3/7) */}
        <div className="md:col-span-3">
          <h3 className="text-xl font-semibold mb-2">Sign Up Our Newsletter</h3>
          <p className="mb-4">Get updated our newest launches.</p>
          <form className="flex flex-col">
            <input
              type="email"
              placeholder="Enter your email"
              className="
                bg-transparent border-b border-white 
                py-2 mb-4 focus:outline-none 
                placeholder-gray-400
              "
            />
            <button
              type="submit"
              className="
                border border-white py-3 uppercase tracking-wider 
                hover:bg-white hover:text-gray-900 transition
              "
            >
              Subscribe
            </button>
          </form>
        </div>

        {/* Support (2/7) */}
        <div className="md:col-span-2">
          <h3 className="text-xl font-semibold mb-2">Support</h3>
          <ul className="space-y-3">
            <li>
              <a href="#" className="hover:underline">
                FAQ
              </a>
            </li>
            <li>
              <a href="#" className="hover:underline">
                Return &amp; Exchange Policy
              </a>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
